import { QdrantClient } from '@qdrant/js-client-rest'
import { config } from '../lib/config'
import { nanoid } from 'nanoid'
import { createHash } from 'crypto'

let client: QdrantClient | null = null

try {
  if (config.QDRANT_URL && config.QDRANT_API_KEY) {
    client = new QdrantClient({
      url: config.QDRANT_URL,
      apiKey: config.QDRANT_API_KEY || undefined
    })
  }
} catch (error) {
  console.warn('⚠️  Qdrant client initialization failed:', error)
}

// Export client for testing
export { client }

const COLLECTION_NAME = 'memories'

// Helper function to convert string IDs to integer IDs for Qdrant
function stringToIntId(str: string): number {
  // Create a hash of the string and convert to integer
  const hash = createHash('sha256').update(str).digest('hex')
  // Take first 8 characters and convert to integer (to avoid overflow)
  const intId = parseInt(hash.substring(0, 8), 16)
  return Math.abs(intId) // Ensure positive number
}

// Test Qdrant connection
export async function testQdrantConnection(): Promise<boolean> {
  if (!client) {
    console.warn('⚠️  Qdrant client not available')
    return false
  }
  
  try {
    const collections = await client.getCollections()
    console.log(`✅ Qdrant connection successful. Collections: ${collections.collections.length}`)
    return true
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error)
    return false
  }
}

export async function initializeCollection() {
  if (!client) {
    console.warn('⚠️  Qdrant client not available - skipping collection initialization')
    return
  }
  
  try {
    // Check if collection exists
    const collections = await client.getCollections()
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME)
    
    if (!exists) {
      console.log(`📊 Creating Qdrant collection: ${COLLECTION_NAME}`)
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 3072, // Updated to 3072 dimensions
          distance: 'Cosine'
        }
      })
      console.log(`✅ Created Qdrant collection: ${COLLECTION_NAME}`)
    } else {
      console.log(`📊 Qdrant collection exists: ${COLLECTION_NAME}`)
      
      // Verify collection configuration
      const collectionInfo = await client.getCollection(COLLECTION_NAME)
      console.log(`📊 Collection config:`, {
        vectorSize: collectionInfo.config?.params?.vectors?.size,
        distance: collectionInfo.config?.params?.vectors?.distance
      })
    }
  } catch (error) {
    console.error('❌ Failed to initialize Qdrant collection:', error)
    throw error
  }
}

export interface MemoryMetadata {
  memoryId: string
  walletId: string
  source: string
  tags: string[]
  conversationThread?: string
  timestamp: number
}

// Batch upsert for better performance (from performant version)
export async function upsertPoints(points: Array<{
  id: string
  vector: number[]
  payload: {
    memoryId: string
    chunkId?: string
    content: string
    source: string
    tags: string[]
    originalPrompt?: string
  }
}>): Promise<boolean> {
  try {
    console.log(`🔍 Batch storing ${points.length} embeddings`)
    
    if (!client) {
      console.error('❌ Qdrant client not available')
      return false
    }
    
    // Convert points to Qdrant format with integer IDs
    const qdrantPoints = points.map(point => ({
      id: stringToIntId(point.id), // Convert string ID to integer
      vector: point.vector,
      payload: {
        ...point.payload,
        originalId: point.id, // Store original string ID in payload for reference
        timestamp: new Date().toISOString()
      }
    }))
    
    const result = await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: qdrantPoints
    })
    
    console.log(`✅ Batch stored ${points.length} embeddings successfully`)
    return true
    
  } catch (error: any) {
    console.error(`❌ Failed to batch store embeddings:`, error)
    return false
  }
}

export async function storeEmbedding(
  memoryId: string,
  content: string,
  tags: string[],
  embedding: number[],
  walletId?: string,
  source?: string
): Promise<boolean> {
  try {
    console.log(`🔍 Storing embedding for memory ${memoryId}`)
    console.log(`📊 Embedding dimensions: ${embedding.length}`)
    console.log(`📋 Content length: ${content.length}`)
    console.log(`🏷️  Tags: ${JSON.stringify(tags)}`)
    
    // Validate embedding dimensions
    if (!Array.isArray(embedding) || embedding.length !== 3072) {
      console.error(`❌ Invalid embedding: not array or wrong dimensions ${embedding?.length}, expected 3072`)
      return false
    }
    
    // Validate that all embedding values are numbers
    const hasNaN = embedding.some(val => typeof val !== 'number' || isNaN(val) || !isFinite(val))
    if (hasNaN) {
      console.error(`❌ Embedding contains NaN, infinite, or non-numeric values`)
      console.error(`❌ First few values: ${embedding.slice(0, 5)}`)
      return false
    }
    
    // Validate content and tags
    if (typeof content !== 'string') {
      console.error(`❌ Content must be a string, got: ${typeof content}`)
      return false
    }
    
    if (!Array.isArray(tags)) {
      console.error(`❌ Tags must be an array, got: ${typeof tags}`)
      return false
    }
    
    // Convert string ID to integer ID for Qdrant compatibility
    const originalId = String(memoryId).trim()
    if (!originalId) {
      console.error(`❌ Invalid ID format: "${originalId}"`)
      return false
    }
    
    const intId = stringToIntId(originalId)
    
    // Ensure all payload values are properly typed and not undefined
    const point = {
      id: intId, // Use integer ID
      vector: embedding,
      payload: {
        originalId: originalId, // Store original string ID for reference
        content: String(content || '').substring(0, 2000), // Ensure string type
        tags: (tags || []).slice(0, 10).map(tag => String(tag)), // Ensure array of strings
        timestamp: new Date().toISOString(),
        memoryId: String(memoryId.includes('_chunk_') ? memoryId.split('_chunk_')[0] : memoryId),
        walletId: String(walletId || 'unknown'), // Ensure string type
        source: String(source || 'unknown'), // Ensure string type
        chunkIndex: memoryId.includes('_chunk_') ? parseInt(memoryId.split('_chunk_')[1] || '0') : 0 // Add chunk index as number
      }
    }
    
    console.log(`📦 Point structure:`)
    console.log(`  - ID: ${point.id} (type: ${typeof point.id}) [converted from: "${originalId}"]`)
    console.log(`  - Vector length: ${point.vector.length}`)
    console.log(`  - Vector type: ${typeof point.vector} (is array: ${Array.isArray(point.vector)})`)
    console.log(`  - Payload keys: ${Object.keys(point.payload)}`)
    console.log(`  - Content preview: "${point.payload.content.substring(0, 50)}..."`)
    console.log(`  - Tags: ${JSON.stringify(point.payload.tags)}`)
    
    if (!client) {
      console.error('❌ Qdrant client not available')
      return false
    }
    
    // Log the exact request being sent
    const requestPayload = {
      wait: true,
      points: [point]
    }
    console.log(`📤 Request payload:`, JSON.stringify(requestPayload, null, 2))
    
    const result = await client.upsert('memories', requestPayload)
    
    console.log(`✅ Embedding stored successfully for memory ${memoryId}:`, result)
    return true
    
  } catch (error: any) {
    console.error(`❌ Failed to store embedding for memory ${memoryId}:`, error)
    
    // Enhanced error logging
    if (error?.response) {
      console.error('📊 HTTP Status:', error.response.status)
      console.error('📊 HTTP Status Text:', error.response.statusText)
      console.error('📊 Response Headers:', error.response.headers)
      console.error('📊 Response Data:', JSON.stringify(error.response.data, null, 2))
    }
    
    if (error?.request) {
      console.error('📊 Request Config:', {
        url: error.request.url,
        method: error.request.method,
        headers: error.request.headers
      })
    }
    
    console.error('📊 Error Message:', error?.message)
    console.error('📊 Error Stack:', error?.stack)
    
    return false
  }
}

// Enhanced search with better performance characteristics
export async function search(
  embedding: number[],
  limit: number,
  threshold: number,
  walletId?: string,
  source?: string
) {
  if (!client) {
    console.warn('⚠️  Qdrant client not available - returning empty results')
    return []
  }

  const filters: any[] = []
  
  // Add filters if specified
  if (walletId) {
    filters.push({
      key: 'walletId',
      match: { value: walletId }
    })
  }
  
  if (source) {
    filters.push({
      key: 'source',
      match: { value: source }
    })
  }

  try {
    const searchParams: any = {
      vector: embedding,
      limit,
      with_payload: true,
      score_threshold: threshold // Use Qdrant's native score threshold
    }
    
    if (filters.length > 0) {
      searchParams.filter = {
        must: filters
      }
    }

    const response = await client.search(COLLECTION_NAME, searchParams)
    
    console.log(`🔍 Qdrant search returned ${response.length} results above threshold ${threshold}`)
    
    return response.map(result => ({
      id: result.id,
      score: result.score || 0,
      payload: result.payload || {}
    }))
    
  } catch (error) {
    console.error('Qdrant search failed:', error)
    return []
  }
}

