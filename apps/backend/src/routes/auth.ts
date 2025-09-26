import { Elysia } from 'elysia'
import { getNonce, verifySignature } from '../lib/auth'

export const authRoutes = new Elysia({ prefix: '/auth' })
  // Get nonce for wallet address
  .get('/nonce/:address', async ({ params: { address } }) => {
    try {
      const nonce = await getNonce(address)
      return { nonce }
    } catch (error) {
      return { error: 'Failed to generate nonce' }
    }
  })
  
  // Verify wallet signature
  .post('/verify', async ({ body }: { body: any }) => {
    const { address, signature, message } = body
    
    if (!address || !signature || !message) {
      return { error: 'Missing required fields' }
    }
    
    const result = await verifySignature(address, signature, message)
    return result
  })