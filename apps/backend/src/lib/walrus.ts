import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { WalrusClient, WalrusFile } from '@mysten/walrus'
import { config } from './config'

let walrusClient: WalrusClient | null = null
let serverKeypair: Ed25519Keypair | null = null

// Initialize Walrus client and server keypair
function initializeWalrus() {
  if (!walrusClient || !serverKeypair) {
    // Create SUI client
    const suiClient = new SuiClient({
      url: getFullnodeUrl(config.WALRUS_NETWORK as 'testnet' | 'mainnet'),
    })

    // Create server keypair from private key
    let privateKeyBytes: Uint8Array
    
    if (config.WALRUS_PRIVATE_KEY.startsWith('0x')) {
      // Hex format
      privateKeyBytes = Buffer.from(config.WALRUS_PRIVATE_KEY.slice(2), 'hex')
    } else {
      // Base64 or raw hex format
      try {
        privateKeyBytes = Buffer.from(config.WALRUS_PRIVATE_KEY, 'base64')
      } catch {
        privateKeyBytes = Buffer.from(config.WALRUS_PRIVATE_KEY, 'hex')
      }
    }
    
    serverKeypair = Ed25519Keypair.fromSecretKey(privateKeyBytes)

    // Create Walrus client
    walrusClient = new WalrusClient({
      network: config.WALRUS_NETWORK as 'testnet' | 'mainnet',
      suiClient,
    })

    console.log('🐋 Walrus client initialized')
    console.log('📍 Server wallet address:', serverKeypair.getPublicKey().toSuiAddress())
  }

  return { walrusClient: walrusClient!, serverKeypair: serverKeypair! }
}

export async function uploadImageToWalrus(base64: string, filename?: string): Promise<string> {
  try {
    const { walrusClient, serverKeypair } = initializeWalrus()

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64, 'base64')

    // Create WalrusFile
    const file = WalrusFile.from({
      contents: imageBuffer,
      identifier: filename || `image_${Date.now()}.jpg`,
    })

    console.log(`🔄 Uploading image to Walrus (${imageBuffer.length} bytes)...`)

    // Upload to Walrus
    const results = await walrusClient.writeFiles({
      files: [file],
      epochs: config.WALRUS_STORAGE_EPOCHS,
      deletable: true,
      signer: serverKeypair,
    })

    if (!results || results.length === 0) {
      throw new Error('No results returned from Walrus upload')
    }

    const result = results[0]
    if (!result) {
      throw new Error('Invalid result from Walrus upload')
    }

    const blobId = result.blobId
    console.log(`✅ Image uploaded to Walrus: ${blobId}`)
    
    return blobId
  } catch (error) {
    console.error('❌ Failed to upload image to Walrus:', error)
    throw new Error(`Walrus upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function downloadImageFromWalrus(blobId: string): Promise<Buffer> {
  try {
    const { walrusClient } = initializeWalrus()

    console.log(`🔄 Downloading image from Walrus: ${blobId}`)

    const blob = await walrusClient.readBlob({ blobId })
    
    console.log(`✅ Image downloaded from Walrus: ${blobId}`)
    
    return Buffer.from(blob)
  } catch (error) {
    console.error('❌ Failed to download image from Walrus:', error)
    throw new Error(`Walrus download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}