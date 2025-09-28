import { QdrantClient } from '@qdrant/js-client-rest'
import { config } from '../lib/config'
import { nanoid } from 'nanoid'

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
    
    // Convert points to Qdrant format
    const qdrantPoints = points.map(point => ({
      id: point.id,
      vector: point.vector,
      payload: {
        ...point.payload,
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
    if (embedding.length !== 3072) {
      console.error(`❌ Invalid embedding dimensions: ${embedding.length}, expected 3072`)
      return false
    }
    
    // Validate that all embedding values are numbers
    const hasNaN = embedding.some(val => isNaN(val) || !isFinite(val))
    if (hasNaN) {
      console.error(`❌ Embedding contains NaN or infinite values`)
      return false
    }
    
    // Use string ID directly (better for chunk IDs like "123_chunk_0")
    const point = {
      id: memoryId,
      vector: embedding,
      payload: {
        content: content.substring(0, 2000), // More content for better matching
        tags: tags.slice(0, 10), // Limit tags
        timestamp: new Date().toISOString(),
        memoryId: memoryId.includes('_chunk_') ? memoryId.split('_chunk_')[0] : memoryId,
        walletId: walletId || 'unknown', // Add walletId for filtering
        source: source || 'unknown' // Add source for filtering
      }
    }
    
    console.log(`📦 Point structure:`)
    console.log(`  - ID: ${point.id}`)
    console.log(`  - Vector length: ${point.vector.length}`)
    console.log(`  - Payload keys: ${Object.keys(point.payload)}`)
    console.log(`  - Content preview: "${point.payload.content.substring(0, 50)}..."`)
    
    if (!client) {
      console.error('❌ Qdrant client not available')
      return false
    }
    
    const result = await client.upsert('memories', {
      wait: true,
      points: [point]
    })
    
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

