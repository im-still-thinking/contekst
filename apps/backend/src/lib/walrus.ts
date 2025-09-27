import { config } from './config'

// Walrus HTTP API endpoints
const WALRUS_ENDPOINTS = {
  testnet: {
    publisher: 'https://walrus-testnet-publisher.nodes.guru',
    aggregator: 'https://aggregator.walrus-testnet.walrus.space'
  },
  mainnet: {
    publisher: 'https://publisher.walrus-mainnet.walrus.space',
    aggregator: 'https://aggregator.walrus-mainnet.walrus.space'
  }
}

function getWalrusEndpoints() {
  const network = config.WALRUS_NETWORK as 'testnet' | 'mainnet'
  return WALRUS_ENDPOINTS[network] || WALRUS_ENDPOINTS.testnet
}

export async function uploadImageToWalrus(base64: string, filename?: string): Promise<string> {
  try {
    const endpoints = getWalrusEndpoints()
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64, 'base64')
    
    console.log(`🔄 Uploading image to Walrus (${imageBuffer.length} bytes)...`)

    // Upload to Walrus using HTTP API
    const response = await fetch(`${endpoints.publisher}/v1/blobs?epochs=${config.WALRUS_STORAGE_EPOCHS}&deletable=true`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json() as {
      newlyCreated?: {
        blobObject?: {
          blobId: string
        }
        blobId?: string
      }
      alreadyCertified?: {
        blobObject?: {
          blobId: string
        }
        blobId?: string
      }
    }
    
    // Extract blobId from various possible locations in the response
    let blobId: string | undefined
    
    if (result.newlyCreated?.blobObject?.blobId) {
      blobId = result.newlyCreated.blobObject.blobId
    } else if (result.newlyCreated?.blobId) {
      blobId = result.newlyCreated.blobId
    } else if (result.alreadyCertified?.blobObject?.blobId) {
      blobId = result.alreadyCertified.blobObject.blobId
    } else if (result.alreadyCertified?.blobId) {
      blobId = result.alreadyCertified.blobId
    }
    
    if (!blobId) {
      console.error('❌ Full response structure:', JSON.stringify(result, null, 2))
      throw new Error('No blobId returned from Walrus upload')
    }
    console.log(`✅ Image uploaded to Walrus: ${blobId}`)
    
    return blobId
  } catch (error) {
    console.error('❌ Failed to upload image to Walrus:', error)
    throw new Error(`Walrus upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function downloadImageFromWalrus(blobId: string): Promise<Buffer> {
  try {
    const endpoints = getWalrusEndpoints()

    console.log(`🔄 Downloading image from Walrus: ${blobId}`)

    // Download from Walrus using HTTP API
    const response = await fetch(`${endpoints.aggregator}/v1/blobs/${blobId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`✅ Image downloaded from Walrus: ${blobId}`)
    
    return buffer
  } catch (error) {
    console.error('❌ Failed to download image from Walrus:', error)
    throw new Error(`Walrus download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}