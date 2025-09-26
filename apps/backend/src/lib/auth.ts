import { ethers } from 'ethers'
import { db } from '../utils/db'
import { users } from '../models/user'
import { eq } from 'drizzle-orm'

// Generate a random nonce for wallet verification
export function generateNonce(): string {
  return Math.floor(Math.random() * 1000000).toString()
}

// Get or create user with nonce
export async function getNonce(walletAddress: string) {
  const normalizedAddress = walletAddress.toLowerCase()
  
  let user = await db.query.users.findFirst({
    where: eq(users.walletId, normalizedAddress)
  })
  
  if (!user) {
    const nonce = generateNonce()
    await db.insert(users).values({
      walletId: normalizedAddress,
      nonce
    })
    return nonce
  }
  
  return user.nonce
}

// Verify wallet signature and update nonce
export async function verifySignature(walletAddress: string, signature: string, message: string) {
  const normalizedAddress = walletAddress.toLowerCase()
  
  try {
    // Verify the signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature)
    
    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return { success: false, error: 'Invalid signature' }
    }
    
    // Update user with new nonce for next auth
    const newNonce = generateNonce()
    await db.update(users)
      .set({ nonce: newNonce })
      .where(eq(users.walletId, normalizedAddress))
    
    return { success: true, address: normalizedAddress }
  } catch (error) {
    return { success: false, error: 'Signature verification failed' }
  }
}