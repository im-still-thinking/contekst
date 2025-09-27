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

const COLLECTION_NAME = 'memories'

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
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small dimension
          distance: 'Cosine'
        }
      })
    }
  } catch (error) {
    console.error('Failed to initialize Qdrant collection:', error)
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

export async function storeEmbedding(
  embedding: number[],
  metadata: MemoryMetadata
): Promise<string> {
  const qdrantId = nanoid()
  
  if (!client) {
    console.warn('⚠️  Qdrant client not available - generating mock qdrantId')
    return qdrantId
  }
  
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: qdrantId,
        vector: embedding,
        payload: metadata as unknown as Record<string, unknown>
      }
    ]
  })

  return qdrantId
}

// export async function searchSimilarMemories(
//   embedding: number[],
//   walletId: string,
//   limit: number = 5
// ) {
//   const response = await client.search(COLLECTION_NAME, {
//     vector: embedding,
//     limit,
//     filter: {
//       must: [
//         {
//           key: 'walletId',
//           match: { value: walletId }
//         }
//       ]
//     },
//     with_payload: true
//   })

//   return response
// }