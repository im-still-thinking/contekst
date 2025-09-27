import { Elysia } from 'elysia'
import { verifySignature } from '../lib/auth'
import { generateNonce, validateAndClearNonce } from '../lib/redis'

export const authRoutes = new Elysia({ prefix: '/auth' })
  // Get nonce for wallet address
  .get('/nonce/:address', async ({ params: { address } }) => {
    try {
      const nonce = await generateNonce(address)
      return { nonce }
    } catch (error) {
      return { error: 'Failed to generate nonce' }
    }
  })
  
  // Verify wallet signature
  .post('/verify', async ({ body }: { body: any }) => {
    const { address, signature, message, nonce } = body
    
    if (!address || !signature || !message || !nonce) {
      return { error: 'Missing required fields' }
    }
    
    // Validate nonce first
    const isValidNonce = await validateAndClearNonce(address, nonce)
    if (!isValidNonce) {
      return { error: 'Invalid or expired nonce' }
    }
    
    const result = await verifySignature(address, signature, message)
    return result
  })