import { nanoid } from 'nanoid'
import { keccak256 } from 'js-sha3'
import { eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { memories, memoryEmbeddings, memoryImages } from '../models/memory'
import { extractMemoryWithImages, generateMemoryTags, generateEmbedding } from '../lib/ai'
import { storeEmbedding, searchSimilarMemories, type MemoryMetadata } from '../lib/qdrant'
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

    await setJobStatus(jobId, 'processing', { step: 'generating_tags_and_embeddings' })
    
    // Generate tags and embeddings from the contextual memory
    const [tags, embedding] = await Promise.all([
      generateMemoryTags(extractedMemory),
      generateEmbedding(extractedMemory)
    ])

    const memoryId = Date.now().toString() // Use timestamp as integer ID

    // Create blockchain fingerprint from all the data
    const blockchainFingerprint = createBlockchainFingerprint({
      prompt,
      source,
      extractedMemory,
      tags,
      conversationThread,
      imageIdentifiers: uploadedImages.map(img => img.identifier)
    })

    await setJobStatus(jobId, 'processing', { step: 'recording_on_blockchain' })
    
    const blockchainTxHash = await addMemoryToBlockchain({
      metadataHash: blockchainFingerprint,
      sourceDomainName: source // Using source as domain name (e.g., "chatgpt.com", "claude.ai")
    })
    
    if (!blockchainTxHash) {
      console.error(`❌ Failed to record memory on blockchain for ${memoryId}`)
      throw new Error('Blockchain storage failed - memory not saved')
    }
    
    console.log(`✅ Memory recorded on blockchain: ${blockchainTxHash}`)
    
    // STEP 2: Verify memory exists on blockchain using the fingerprint
    await setJobStatus(jobId, 'processing', { step: 'verifying_blockchain_storage' })
    
    const isOnBlockchain = await isMemoryOnBlockchain(blockchainFingerprint)
    if (!isOnBlockchain) {
      console.error(`❌ Memory verification failed on blockchain for fingerprint: ${blockchainFingerprint}`)
      throw new Error('Blockchain verification failed - memory not found on chain')
    }
    
    console.log(`✅ Memory verified on blockchain: ${blockchainFingerprint}`)

    // STEP 3: Store memory in database ONLY after blockchain success
    await setJobStatus(jobId, 'processing', { step: 'storing_in_database' })
    
    await db.insert(memories).values({
      id: memoryId,
      userId,
      prompt,
      source,
      conversationThread,
      extractedMemory,
      tags,
      blockchainFingerprint // Now guaranteed to be on blockchain
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

    // Store embedding in Qdrant
    const success = await storeEmbedding(memoryId, extractedMemory, tags, embedding)
    if (!success) {
      console.error(`❌ Job ${jobId}: Failed to store embedding`)
      await setJobStatus(jobId, 'failed', { error: 'Failed to store embedding in Qdrant' })
      return
    }

    // Store embedding mapping 
    await db.insert(memoryEmbeddings).values({
      id: nanoid(),
      memoryId,
      userId,
      qdrantId: memoryId
    })

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

  try {
    // STEP 1: Find appropriate lease for this access request
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

    // STEP 5: Generate embedding and search
    const promptEmbedding = await generateEmbedding(userPrompt)

    const searchResults = await searchSimilarMemories(
      promptEmbedding,
      userId,
      effectiveSource,
      limit
    )

    // Filter results by similarity threshold
    const filteredResults = searchResults.filter((result: any) => result.score >= config.MEMORY_SIMILARITY_THRESHOLD)
    
    console.log(`🔍 Similarity filtering: ${searchResults.length} found → ${filteredResults.length} above threshold (${config.MEMORY_SIMILARITY_THRESHOLD})`)

    if (filteredResults.length === 0) {
      await recordAuditTrail({
        walletId: userId,
        leaseId: lease.id,
        entity,
        action: 'access_granted',
        reason: `No memories found above similarity threshold (${config.MEMORY_SIMILARITY_THRESHOLD})`,
        userPrompt,
        source: effectiveSource,
        accessedMemories: []
      })
      return []
    }

    // STEP 6: Retrieve and process memories
    const qdrantIds = filteredResults.map((result: any) => String(result.id))

    const embeddingMappings = await db.select({
      memoryId: memoryEmbeddings.memoryId,
      qdrantId: memoryEmbeddings.qdrantId
    })
      .from(memoryEmbeddings)
      .where(inArray(memoryEmbeddings.qdrantId, qdrantIds))

    const memoryIds = embeddingMappings.map(mapping => mapping.memoryId)

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

    // Retrieve the actual memories with their images
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

    // Group memories with their images and add similarity scores
    const memoryMap = new Map()

    for (const row of retrievedMemories) {
      if (!memoryMap.has(row.id)) {
        const qdrantMapping = embeddingMappings.find(m => m.memoryId === row.id)
        const searchResult = filteredResults.find((r: any) => String(r.id) === qdrantMapping?.qdrantId)

        memoryMap.set(row.id, {
          id: row.id,
          prompt: row.prompt,
          source: row.source,
          conversationThread: row.conversationThread,
          extractedMemory: row.extractedMemory,
          tags: row.tags,
          createdAt: row.createdAt,
          similarity: searchResult?.score || 0,
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

    const result = Array.from(memoryMap.values())
      .sort((a, b) => b.similarity - a.similarity)

    const accessedMemoryIds = result.map(m => m.id)

    // STEP 7: Record successful access audit
    await recordAuditTrail({
      walletId: userId,
      leaseId: lease.id,
      entity,
      action: 'access_granted',
      reason: `Successfully accessed ${accessedMemoryIds.length} memories`,
      userPrompt,
      source: effectiveSource,
      accessedMemories: accessedMemoryIds
    })

    console.log(`📋 Memory access granted: ${entity} accessed ${accessedMemoryIds.length} memories`)

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