import { nanoid } from 'nanoid'
import { keccak256 } from 'js-sha3'
import { db } from './db'
import { memories, memoryEmbeddings, memoryImages } from '../models/memory'
import { extractMemoryWithImages, generateMemoryTags, generateEmbedding } from '../lib/ai'
import { storeEmbedding, type MemoryMetadata } from '../lib/qdrant'
import { setJobStatus } from '../lib/redis'

interface ImageData {
  base64: string
  identifier: string
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
    await setJobStatus(jobId, 'processing', { step: 'extracting_memory_with_context' })
  
    // Extract memory considering both text and images together for more relevant context
    const extractedMemory = await extractMemoryWithImages(prompt, images)
    if (!extractedMemory.trim()) {
      console.error(`❌ Job ${jobId}: No memory extracted`)
      await setJobStatus(jobId, 'failed', { error: 'No memory extracted from prompt and images' })
      return
    }

    await setJobStatus(jobId, 'processing', { step: 'generating_tags_and_embeddings' })
    
    // Generate tags and embeddings from the contextual memory (text + images analyzed together)
    const [tags, embedding] = await Promise.all([
      generateMemoryTags(extractedMemory),
      generateEmbedding(extractedMemory)
    ])
    
    const memoryId = nanoid()
    
    // Create blockchain fingerprint from all the data
    const blockchainFingerprint = createBlockchainFingerprint({
      prompt,
      source,
      extractedMemory,
      tags,
      conversationThread,
      imageIdentifiers: images?.map(img => img.identifier)
    })
    
    // Store memory in database
    await db.insert(memories).values({
      id: memoryId,
      userId,
      prompt,
      source,
      conversationThread,
      extractedMemory,
      tags,
      blockchainFingerprint
    })

    // Store images if provided
    if (images && images.length > 0) {
      await setJobStatus(jobId, 'processing', { step: 'storing_images' })
      
      const imageRecords = images.map((image) => ({
        id: nanoid(),
        memoryId,
        userId,
        identifier: image.identifier,
        base64: image.base64,
      }))
      
      await db.insert(memoryImages).values(imageRecords)
    }

    // Store embedding in Qdrant
    const metadata: MemoryMetadata = {
      memoryId,
      walletId: userId, // Keep walletId for Qdrant metadata
      source,
      tags,
      conversationThread,
      timestamp: Date.now()
    }
    const qdrantId = await storeEmbedding(embedding, metadata)
    
    // Store embedding mapping
    await db.insert(memoryEmbeddings).values({
      id: nanoid(),
      memoryId,
      userId,
      qdrantId
    })

    await setJobStatus(jobId, 'completed', { memoryId })
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