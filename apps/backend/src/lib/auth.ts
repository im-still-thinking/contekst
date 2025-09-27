import jwt from 'jsonwebtoken'
import { SiweMessage } from 'siwe'
import { db } from './db'
import { users } from '../models/user'
import { eq } from 'drizzle-orm'
import { config } from './config'

const JWT_SECRET = config.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = '365d'

export interface JwtPayload {
  walletId: string
  iat?: number
  exp?: number
}

export async function ensureUser(walletAddress: string) {
  const normalizedAddress = walletAddress.toLowerCase()
  
  let user = await db.query.users.findFirst({
    where: eq(users.walletId, normalizedAddress)
  })
  
  if (!user) {
    await db.insert(users).values({
      walletId: normalizedAddress
    })
  }
  
  return normalizedAddress
}

export function generateAccessToken(walletId: string): string {
  return jwt.sign({ walletId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded as JwtPayload
  } catch (error) {
    return null
  }
}

// Verify SIWE message and signature
export async function verifySiweMessage(message: string, signature: string) {
  try {
    console.log('🔍 Creating SIWE message from string...')
    
    // Parse the SIWE message string
    const siweMessage = new SiweMessage(message)
    console.log('✅ SIWE message created:', {
      address: siweMessage.address,
      domain: siweMessage.domain,
      nonce: siweMessage.nonce
    })
    
    // Validate nonce first
    console.log('🔑 Validating nonce...')
    const { validateAndClearNonce } = await import('./redis')
    const isValidNonce = await validateAndClearNonce(siweMessage.address.toLowerCase(), siweMessage.nonce)
    
    if (!isValidNonce) {
      console.log('❌ Invalid or expired nonce')
      return { success: false, error: 'Invalid or expired nonce' }
    }
    console.log('✅ Nonce validated and cleared')
    
    console.log('🔐 Verifying signature...')
    const fields = await siweMessage.verify({ signature })
    console.log('📊 Verification fields:', fields)
    
    if (!fields.success) {
      console.log('❌ SIWE signature verification failed')
      return { success: false, error: 'Invalid SIWE signature' }
    }
    
    const normalizedAddress = siweMessage.address.toLowerCase()
    console.log('👤 Normalized address:', normalizedAddress)
    
    await ensureUser(normalizedAddress)
    console.log('✅ User ensured in database')
    
    // Generate access token
    const accessToken = generateAccessToken(normalizedAddress)
    console.log('🎫 Access token generated')
    
    return { 
      success: true, 
      address: normalizedAddress,
      accessToken
    }
  } catch (error) {
    console.log('💥 SIWE verification error:', error)
    console.log('📄 Message that failed:', message)
    console.log('✍️ Signature that failed:', signature)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `SIWE verification failed: ${errorMessage}` }
  }
}