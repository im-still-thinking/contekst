import { nanoid } from 'nanoid'
import { keccak256 } from 'js-sha3'
import { db } from './db'
import { memories, memoryEmbeddings } from '../models/memory'
import { extractMemoryFromPrompt, generateMemoryTags, generateEmbedding } from '../lib/ai'
import { storeEmbedding, type MemoryMetadata } from '../lib/qdrant'
import { setJobStatus } from '../lib/redis'

interface ProcessMemoryRequest {
  userId: string
  prompt: string
  source: string
  conversationThread?: string
}

function createBlockchainFingerprint(data: {
  prompt: string
  source: string
  extractedMemory: string
  tags: string[]
  conversationThread?: string
}): string {
  const dataString = JSON.stringify({
    prompt: data.prompt,
    source: data.source,
    extractedMemory: data.extractedMemory,
    tags: data.tags.sort(), // Sort tags for consistent hashing
    conversationThread: data.conversationThread || null
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
    const { userId, prompt, source, conversationThread } = request
    
    console.log(`🚀 Background job ${jobId} started`)
    await setJobStatus(jobId, 'processing', { step: 'extracting_memory' })
    
    // Extract memory from prompt
    const extractedMemory = await extractMemoryFromPrompt(prompt)
    if (!extractedMemory.trim()) {
      console.error(`❌ Job ${jobId}: No memory extracted`)
      await setJobStatus(jobId, 'failed', { error: 'No memory extracted from prompt' })
      return
    }

    await setJobStatus(jobId, 'processing', { step: 'generating_tags_and_embeddings' })
    
    // Generate tags and embedding in parallel
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
      conversationThread
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

// export async function getMemoryById(memoryId: string) {
//   const memory = await db.query.memories.findFirst({
//     where: (memories, { eq }) => eq(memories.id, memoryId),
//     with: {
//       // We'll need to add relations later
//     }
//   })
  
//   return memory
// }