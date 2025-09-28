import { nanoid } from 'nanoid'
import { keccak256 } from 'js-sha3'
import { eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { memories, memoryEmbeddings, memoryImages } from '../models/memory'
import { extractMemoryWithImages, generateMemoryTags, generateEmbedding, generateEmbeddings, processTextWithIntent } from '../lib/ai'
import { storeEmbedding, search, type MemoryMetadata } from '../lib/qdrant'
import { setJobStatus } from '../lib/redis'
import { recordAuditTrail } from './audit'
import { findValidLeaseForAccess } from './lease'
import { uploadImageToWalrus } from './walrus'
import { addMemoryToBlockchain, isMemoryOnBlockchain } from './blockchain'
import { config } from './config'

interface ImageData {
  base64: string
  filename?: string // Optional filename for Walrus upload
}

interface ProcessMemoryRequest {
  userId: string
  prompt: string
  source: string
  conversationThread?: string
  images?: ImageData[]
}

function createBlockchainFingerprint(data: {
  prompt: string
  source: string
  extractedMemory: string
  tags: string[]
  conversationThread?: string
  imageIdentifiers?: string[]
}): string {
  const dataString = JSON.stringify({
    prompt: data.prompt,
    source: data.source,
    extractedMemory: data.extractedMemory,
    tags: data.tags.sort(), // Sort tags for consistent hashing
    conversationThread: data.conversationThread || null,
    imageIdentifiers: data.imageIdentifiers?.sort() || null
  })

  return '0x' + keccak256(dataString)
}

interface ProcessMemoryResponse {
  success: boolean
  jobId?: string
  error?: string
}

async function processMemoryBackground(request: ProcessMemoryRequest, jobId: string) {
  try {
    const { userId, prompt, source, conversationThread, images } = request

    console.log(`🚀 Background job ${jobId} started`)
    
    // Upload images to Walrus first if provided
    let uploadedImages: { identifier: string; base64: string }[] = []
    if (images && images.length > 0) {
      await setJobStatus(jobId, 'processing', { step: 'uploading_images_to_walrus' })
      
      uploadedImages = await Promise.all(
        images.map(async (image) => {
          const blobId = await uploadImageToWalrus(image.base64, image.filename)
          return {
            identifier: blobId,
            base64: image.base64 // Keep for AI processing
          }
        })
      )
    }

    await setJobStatus(jobId, 'processing', { step: 'extracting_memory_with_context' })

    const extractedMemory = await extractMemoryWithImages(prompt, uploadedImages)
    if (!extractedMemory.trim()) {
      console.error(`❌ Job ${jobId}: No memory extracted`)
      await setJobStatus(jobId, 'failed', { error: 'No memory extracted from prompt and images' })
      return
    }

    await setJobStatus(jobId, 'processing', { step: 'processing_with_intent_and_chunking' })
    
    // Process text with intent-based approach (includes chunking)
    const processed = await processTextWithIntent(extractedMemory, source)
    
    await setJobStatus(jobId, 'processing', { step: 'generating_embeddings_for_chunks' })
    
    // Generate embeddings for all chunks efficiently
    const embeddings = await generateEmbeddings(processed.chunks)

    const memoryId = Date.now().toString() // Use timestamp as integer ID

    // Create blockchain fingerprint from all the data
    const blockchainFingerprint = createBlockchainFingerprint({
      prompt,
      source,
      extractedMemory,
      tags: processed.tags,
      conversationThread,
      imageIdentifiers: uploadedImages.map(img => img.identifier)
    })

    await setJobStatus(jobId, 'processing', { step: 'recording_on_blockchain' })
    
    let blockchainTxHash: string | null = null
    
    // Check if we're in smart contract mode
    const isSmartContractMode = process.env.SMART_CONTRACT_ENABLED === 'true'
    
    if (isSmartContractMode) {
      // Production mode: Use actual blockchain
      blockchainTxHash = await addMemoryToBlockchain({
        metadataHash: blockchainFingerprint,
        sourceDomainName: source
      })
      
      if (!blockchainTxHash) {
        console.error(`❌ Failed to record memory on blockchain for ${memoryId}`)
        throw new Error('Blockchain storage failed - memory not saved')
      }
      
      console.log(`✅ Memory recorded on blockchain: ${blockchainTxHash}`)
      
      // Verify memory exists on blockchain using the fingerprint
      await setJobStatus(jobId, 'processing', { step: 'verifying_blockchain_storage' })
      
      const isOnBlockchain = await isMemoryOnBlockchain(blockchainFingerprint)
      if (!isOnBlockchain) {
        console.error(`❌ Memory verification failed on blockchain for fingerprint: ${blockchainFingerprint}`)
        throw new Error('Blockchain verification failed - memory not found on chain')
      }
      
      console.log(`✅ Memory verified on blockchain: ${blockchainFingerprint}`)
    } else {
      // Testing mode: Simulate blockchain interaction
      blockchainTxHash = 'test-memory-tx-' + Date.now()
      console.log(`🧪 TESTING MODE: Simulated memory blockchain storage`)
      console.log(`🔗 Simulated txHash: ${blockchainTxHash}`)
      console.log(`🔍 Simulated fingerprint: ${blockchainFingerprint}`)
      console.log(`ℹ️  In production, memory will be stored on blockchain`)
    }

    // STEP 3: Store memory in database after blockchain success (or simulation)
    await setJobStatus(jobId, 'processing', { step: 'storing_in_database' })
    
    await db.insert(memories).values({
      id: memoryId,
      userId,
      prompt,
      source,
      conversationThread,
      extractedMemory,
      tags: processed.tags,
      blockchainFingerprint // Blockchain fingerprint (on-chain or simulated)
    })

    // Store image references if provided
    if (uploadedImages.length > 0) {
      const imageRecords = uploadedImages.map((image) => ({
        id: nanoid(),
        memoryId,
        userId,
        identifier: image.identifier,
      }))

      await db.insert(memoryImages).values(imageRecords)
    }

    // Store embeddings for all chunks in Qdrant with user and source info
    await setJobStatus(jobId, 'processing', { step: 'storing_embeddings_in_qdrant' })
    
    let storedChunks = 0
    const embeddingMappings = []
    
    for (let i = 0; i < processed.chunks.length; i++) {
      const chunk = processed.chunks[i]
      const embedding = embeddings[i]
      
      if (!chunk || !embedding) {
        console.warn(`⚠️  Skipping chunk ${i} due to missing data`)
        continue
      }
      
      const chunkId = `${memoryId}_chunk_${i}`
      const success = await storeEmbedding(
        chunkId, 
        chunk, 
        processed.tags, 
        embedding, 
        userId, 
        source
      )
      
      if (success) {
        storedChunks++
        embeddingMappings.push({
          id: nanoid(),
          memoryId,
          userId,
          qdrantId: chunkId
        })
      } else {
        console.warn(`⚠️  Failed to store chunk ${i} for memory ${memoryId}`)
      }
    }
    
    if (storedChunks === 0) {
      console.error(`❌ Job ${jobId}: Failed to store any embeddings`)
      await setJobStatus(jobId, 'failed', { error: 'Failed to store any embeddings in Qdrant' })
      return
    }
    
    console.log(`✅ Successfully stored ${storedChunks}/${processed.chunks.length} chunks in Qdrant`)

    // Store embedding mappings for all successfully stored chunks
    if (embeddingMappings.length > 0) {
      await db.insert(memoryEmbeddings).values(embeddingMappings)
    }

    await setJobStatus(jobId, 'completed', { 
      memoryId,
      blockchainTxHash: blockchainTxHash || null
    })
    console.log(`✅ Job ${jobId} completed: ${memoryId}`)
  } catch (error) {
    await setJobStatus(jobId, 'failed', { error: error instanceof Error ? error.message : String(error) })
    console.error(`❌ Job ${jobId} failed:`, error)
  }
}

export async function processMemory(request: ProcessMemoryRequest): Promise<ProcessMemoryResponse> {
  const jobId = nanoid()

  processMemoryBackground(request, jobId).catch(console.error)

  return { success: true, jobId }
}

export async function retrieveRelevantMemories(
  userPrompt: string,
  userId: string,
  entity: string, // The system making the request (claude, chatgpt, etc.)
  source?: string,
  conversationThread?: string,
  limit: number = 5
) {
  let lease: any = null
  let effectiveSource = source
  const startTime = Date.now()

  try {
    // STEP 1: Find appropriate lease for this access request
    console.log(`🔍 [MemoryService] Starting vector search for: "${userPrompt}"`)
    
    const leaseResult = await findValidLeaseForAccess(userId, entity, source)

    if (!leaseResult.lease) {
      await recordAuditTrail({
        walletId: userId,
        entity,
        action: 'access_denied',
        reason: leaseResult.error || 'No valid lease found',
        userPrompt,
        source
      })
      throw new Error(leaseResult.error || 'No valid lease found for access')
    }

    lease = leaseResult.lease
    console.log(`✅ Found valid lease: ${lease.id} for ${entity} (access: ${lease.accessSpecifier})`)

    // STEP 2: Apply source filter based on lease access specifier
    if (lease.accessSpecifier !== 'global') {
      effectiveSource = lease.accessSpecifier
    }

    console.log(`🔍 Memory access authorized: ${entity} → ${effectiveSource || 'all sources'}`)

    // STEP 3: Efficient vector search with proper threshold filtering
    const threshold = config.MEMORY_SIMILARITY_THRESHOLD
    console.log(`🎯 Using similarity threshold: ${threshold}`)
    
    console.log(`🧠 [MemoryService] Generating embedding for search query...`)
    const promptEmbedding = await generateEmbedding(userPrompt)
    
    console.log(`🔍 [MemoryService] Searching vector database...`)
    console.log(`📋 [MemoryService] Search parameters: userId="${userId}", effectiveSource="${effectiveSource}", limit=${limit * 2}, threshold=${threshold}`)
    
    const searchResults = await search(
      promptEmbedding,
      limit * 2, // Get more results to ensure we have enough after filtering
      threshold,
      userId,
      effectiveSource
    )

    if (searchResults.length === 0) {
      console.log(`🔍 [MemoryService] No results found above threshold ${threshold}`)
      await recordAuditTrail({
        walletId: userId,
        leaseId: lease.id,
        entity,
        action: 'access_granted',
        reason: `No memories found above similarity threshold (${threshold})`,
        userPrompt,
        source: effectiveSource,
        accessedMemories: []
      })
      return []
    }

    // STEP 4: Extract unique memory IDs from chunk results
    const chunkResults = searchResults.filter((result: any) => {
      console.log(`📊 Memory chunk ${result.id} similarity score: ${result.score.toFixed(5)}`)
      return result.score >= threshold
    })
    
    console.log(`🔍 Similarity filtering: ${searchResults.length} found → ${chunkResults.length} above threshold (${threshold})`)

    if (chunkResults.length === 0) {
      await recordAuditTrail({
        walletId: userId,
        leaseId: lease.id,
        entity,
        action: 'access_granted',
        reason: `No memories found above similarity threshold (${threshold})`,
        userPrompt,
        source: effectiveSource,
        accessedMemories: []
      })
      return []
    }

    // STEP 5: Get unique memory IDs and map similarity scores
    const memoryScores = new Map<string, number>()
    const memoryChunks = new Map<string, string[]>()
    
    for (const result of chunkResults) {
      console.log(`🔍 Processing Qdrant result:`, {
        id: result.id,
        score: result.score,
        payloadMemoryId: result.payload?.memoryId,
        payloadOriginalId: result.payload?.originalId,
        payloadWalletId: result.payload?.walletId,
        payloadSource: result.payload?.source
      })
      
      // Use memoryId from payload instead of extracting from integer ID
      const memoryId = String(result.payload?.memoryId || '')
      if (!memoryId) {
        console.warn(`⚠️ Missing memoryId in payload for result ${result.id}`)
        continue
      }
      
      console.log(`📋 Extracted memoryId: "${memoryId}" from result ${result.id}`)
      
      // Track the best similarity score for each memory
      const currentScore = memoryScores.get(memoryId) || 0
      if (result.score > currentScore) {
        memoryScores.set(memoryId, result.score)
      }
      
      // Collect chunks for each memory
      if (!memoryChunks.has(memoryId)) {
        memoryChunks.set(memoryId, [])
      }
      const content = result.payload?.content
      if (typeof content === 'string') {
        memoryChunks.get(memoryId)!.push(content)
      }
    }

    const memoryIds = Array.from(memoryScores.keys())
    console.log(`🔍 [MemoryService] Found ${memoryIds.length} matching memories`)
    console.log(`📋 [MemoryService] Memory IDs extracted:`, memoryIds)
    console.log(`📋 [MemoryService] Memory scores:`, Array.from(memoryScores.entries()))

    if (memoryIds.length === 0) {
      await recordAuditTrail({
        walletId: userId,
        leaseId: lease.id,
        entity,
        action: 'access_granted',
        reason: 'No memory mappings found',
        userPrompt,
        source: effectiveSource,
        accessedMemories: []
      })
      return []
    }

    // STEP 6: Retrieve the actual memories with their images
    console.log(`📋 [MemoryService] Querying database for memoryIds:`, JSON.stringify(memoryIds))
    console.log(`📋 [MemoryService] Sample memoryId type and value:`, typeof memoryIds[0], `"${memoryIds[0]}"`)
    
    const retrievedMemories = await db.select({
      id: memories.id,
      prompt: memories.prompt,
      source: memories.source,
      conversationThread: memories.conversationThread,
      extractedMemory: memories.extractedMemory,
      tags: memories.tags,
      createdAt: memories.createdAt,
      // Join with images
      imageId: memoryImages.id,
      imageIdentifier: memoryImages.identifier,
    })
      .from(memories)
      .leftJoin(memoryImages, eq(memories.id, memoryImages.memoryId))
      .where(inArray(memories.id, memoryIds))

    console.log(`📋 [MemoryService] Database query returned ${retrievedMemories.length} rows`)
    if (retrievedMemories.length > 0 && retrievedMemories[0]) {
      console.log(`📋 [MemoryService] First retrieved memory ID:`, retrievedMemories[0].id)
    }

    // STEP 7: Group memories with their images and add similarity scores
    const memoryMap = new Map()
    const accessedMemoryIds: string[] = [] // Track for background access updates

    console.log(`📋 [MemoryService] Processing ${retrievedMemories.length} database rows...`)

    for (const row of retrievedMemories) {
      if (!memoryMap.has(row.id)) {
        accessedMemoryIds.push(row.id) // Track for access count update
        
        memoryMap.set(row.id, {
          id: row.id,
          prompt: row.prompt,
          source: row.source,
          conversationThread: row.conversationThread,
          extractedMemory: row.extractedMemory,
          tags: row.tags,
          createdAt: row.createdAt,
          similarity: memoryScores.get(row.id) || 0,
          matchedChunks: memoryChunks.get(row.id) || [],
          images: []
        })
      }

      if (row.imageId) {
        memoryMap.get(row.id).images.push({
          id: row.imageId,
          identifier: row.imageIdentifier
        })
      }
    }

    // STEP 8: Sort by similarity and limit results
    console.log(`📋 [MemoryService] Memory map has ${memoryMap.size} entries`)
    
    const result = Array.from(memoryMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
    
    console.log(`📋 [MemoryService] Final result array length: ${result.length}`)

    // STEP 9: Access counts are tracked via audit trail (no need for separate tracking)

    const endTime = Date.now()
    console.log(`🔍 [MemoryService] Vector search completed in ${endTime - startTime}ms`)
    console.log(`🔍 [MemoryService] Results:`, result.map(r => ({ 
      score: r.similarity.toFixed(3), 
      summary: r.extractedMemory.substring(0, 60) + '...' 
    })))

    // STEP 10: Record successful access audit
    await recordAuditTrail({
      walletId: userId,
      leaseId: lease.id,
      entity,
      action: 'access_granted',
      reason: `Successfully accessed ${result.length} memories`,
      userPrompt,
      source: effectiveSource,
      accessedMemories: result.map(m => m.id)
    })

    console.log(`📋 Memory access granted: ${entity} accessed ${result.length} memories`)
    return result

  } catch (error) {
    // Record failed access if we haven't already
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (!errorMessage.includes('recorded')) {
      await recordAuditTrail({
        walletId: userId,
        leaseId: lease?.id,
        entity,
        action: 'access_denied',
        reason: errorMessage,
        userPrompt,
        source
      })
    }

    console.error('Memory retrieval failed:', error)
    throw error
  }
}

