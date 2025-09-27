import { Elysia } from 'elysia'
import { 
  verifySiweMessage, 
  verifyAccessToken
} from '../lib/auth'
import { generateNonce } from '../lib/redis'

// RainbowKit compatible endpoints at /api/* level
export const apiRoutes = new Elysia({ prefix: '/api' })
  // RainbowKit: Get nonce for authentication
  .get('/nonce', async () => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
      const nonce = await generateNonce(sessionId)
      return nonce
    } catch (error) {
      console.error('Error generating nonce:', error)
      return { error: 'Failed to generate nonce' }
    }
  })
  
  // RainbowKit: Verify SIWE message and signature
  .post('/verify', async ({ body, set }: { body: any, set: any }) => {
    console.log('📝 Verify endpoint called')
    console.log('📦 Request body:', JSON.stringify(body, null, 2))
    
    const { message, signature } = body
    
    if (!message || !signature) {
      console.log('❌ Missing message or signature')
      set.status = 400
      return { error: 'Missing message or signature' }
    }
    
    console.log('🔍 Verifying SIWE message...')
    console.log('📄 Message:', message)
    console.log('✍️ Signature:', signature)
    
    try {
      const result = await verifySiweMessage(message, signature)
      console.log('✅ Verification result:', result)
      
      if (result.success) {
        console.log('🎉 Verification successful!')
        return {
          success: true,
          accessToken: result.accessToken,
          address: result.address
        }
      }
      
      console.log('❌ Verification failed:', result.error)
      set.status = 401
      return { success: false, error: result.error }
    } catch (error) {
      console.log('💥 Verification error:', error)
      set.status = 401
      return { success: false, error: 'Verification failed' }
    }
  })
  
  // RainbowKit: Logout (no server-side action needed with JWT-only)
  .post('/logout', async () => {
    return { success: true }
  })

  // Get authentication status (useful for RainbowKit status check)
  .get('/me', async ({ headers }) => {
    try {
      const authHeader = headers['authorization']
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false }
      }
      
      const token = authHeader.substring(7)
      const payload = verifyAccessToken(token)
      
      if (!payload) {
        return { authenticated: false }
      }
      
      return { 
        authenticated: true, 
        address: payload.walletId,
        walletId: payload.walletId
      }
    } catch (error) {
      return { authenticated: false }
    }
  })