import { createClient } from 'redis'
import { config } from './config'

const client = createClient({
  url: config.REDIS_URL
})

client.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

client.on('connect', () => {
  console.log('📡 Connected to Redis')
})

// Connect to Redis
await client.connect()

export { client as redis }

// Nonce management functions
export async function generateNonce(walletId: string): Promise<string> {
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Store nonce with 10 minute expiry
  await client.setEx(`nonce:${walletId}`, 600, nonce)
  
  return nonce
}

export async function validateAndClearNonce(walletId: string, nonce: string): Promise<boolean> {
  const storedNonce = await client.get(`nonce:${walletId}`)
  
  if (storedNonce === nonce) {
    // Clear the nonce after successful validation
    await client.del(`nonce:${walletId}`)
    return true
  }
  
  return false
}

// Job status tracking
export async function setJobStatus(jobId: string, status: string, data?: any) {
  const jobData = {
    status,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  // Store job status with 1 hour expiry
  await client.setEx(`job:${jobId}`, 3600, JSON.stringify(jobData))
}

export async function getJobStatus(jobId: string) {
  const jobData = await client.get(`job:${jobId}`)
  return jobData ? JSON.parse(jobData) : null
}