import { ethers } from 'ethers'
import { db } from './db'
import { users } from '../models/user'
import { eq } from 'drizzle-orm'

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

// Verify wallet signature
export async function verifySignature(walletAddress: string, signature: string, message: string) {
  const normalizedAddress = walletAddress.toLowerCase()
  
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature)
    
    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return { success: false, error: 'Invalid signature' }
    }
    
    await ensureUser(normalizedAddress)
    
    return { success: true, address: normalizedAddress }
  } catch (error) {
    return { success: false, error: 'Signature verification failed' }
  }
}