import type { Context } from 'elysia'
import { verifyAccessToken } from './auth'

export interface AuthContext {
  walletId: string
}

export async function authMiddleware(context: Context) {
  const authHeader = context.headers['authorization']
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header' }
  }
  
  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const payload = verifyAccessToken(token)
  
  if (!payload) {
    return { error: 'Invalid or expired access token' }
  }
  
  // Add walletId to context for use in protected routes
  context.store = { ...context.store, walletId: payload.walletId }
  
  return { success: true, walletId: payload.walletId }
}

// Helper function to extract wallet ID from context
export function getWalletFromContext(context: any): string | null {
  return (context.store as any)?.walletId || null
}