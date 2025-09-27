import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import { db } from './db'
import { memoryLeases } from '../models/lease'
import { createLeaseOnChain, revokeLeaseOnChain, type CreateLeaseParams } from './blockchain'
import { redis } from './redis'

export interface CreateLeaseRequest {
  walletId: string
  entity: string
  accessSpecifier: string // 'global' or source name like 'vscode-extension'
  durationDays?: number // Default 7 days
}

export interface LeaseInfo {
  id: string
  walletId: string
  entity: string
  accessSpecifier: string
  expiresAt: Date
  isActive: boolean
}

const DEFAULT_LEASE_DURATION = 7 // days

// Create Redis key for lease
function getLeaseRedisKey(leaseId: string): string {
  return `lease:${leaseId}`
}

// Store lease in Redis with TTL
async function cacheLeaseInRedis(leaseId: string, leaseInfo: LeaseInfo, ttlSeconds: number) {
  const key = getLeaseRedisKey(leaseId)
  await redis.setEx(key, ttlSeconds, JSON.stringify(leaseInfo))
  console.log(`📦 Cached lease ${leaseId} in Redis with TTL ${ttlSeconds}s`)
}

// Remove lease from Redis cache
async function removeLeaseFromRedis(leaseId: string) {
  const key = getLeaseRedisKey(leaseId)
  await redis.del(key)
  console.log(`🗑️  Removed lease ${leaseId} from Redis cache`)
}

// Check if lease is valid from Redis (fast path)
export async function isLeaseValid(leaseId: string): Promise<LeaseInfo | null> {
  try {
    const key = getLeaseRedisKey(leaseId)
    const cachedLease = await redis.get(key)
    
    if (cachedLease) {
      const leaseInfo = JSON.parse(cachedLease) as LeaseInfo
      console.log(`✅ Lease ${leaseId} found in Redis cache`)
      return leaseInfo
    }
    
    console.log(`❌ Lease ${leaseId} not found in Redis cache`)
    return null
  } catch (error) {
    console.error('Redis lease check failed:', error)
    return null
  }
}

export async function createLease(request: CreateLeaseRequest): Promise<{ success: boolean, leaseId?: string, error?: string }> {
  try {
    const { walletId, entity, accessSpecifier, durationDays = DEFAULT_LEASE_DURATION } = request
    
    console.log(`🔐 Creating lease for ${entity} on ${accessSpecifier} (${durationDays} days)`)
    
    // Create lease on blockchain first
    const blockchainParams: CreateLeaseParams = {
      walletId,
      entity,
      accessSpecifier,
      durationDays
    }
    
    const { leaseId: blockchainLeaseId, txHash, expiresAt } = await createLeaseOnChain(blockchainParams)
    
    // Use the blockchain lease ID as our primary key for proper mapping
    const leaseId = blockchainLeaseId
    
    // Store lease in database with blockchain lease ID
    await db.insert(memoryLeases).values({
      id: leaseId,
      walletId,
      entity,
      accessSpecifier,
      expiresAt,
      txHash,
      isRevoked: 'false'
    })
    
    // Cache lease in Redis with TTL
    const leaseInfo: LeaseInfo = {
      id: leaseId,
      walletId,
      entity,
      accessSpecifier,
      expiresAt,
      isActive: true
    }
    
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    await cacheLeaseInRedis(leaseId, leaseInfo, ttlSeconds)
    
    console.log(`✅ Lease created successfully: ${leaseId}`)
    
    return { success: true, leaseId }
    
  } catch (error) {
    console.error('Lease creation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function revokeLease(leaseId: string, walletId: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log(`🔒 Revoking lease: ${leaseId}`)
    
    // First check if lease exists and belongs to the user
    const existingLease = await db.query.memoryLeases.findFirst({
      where: and(
        eq(memoryLeases.id, leaseId),
        eq(memoryLeases.walletId, walletId),
        eq(memoryLeases.isRevoked, 'false')
      )
    })
    
    if (!existingLease) {
      return { success: false, error: 'Lease not found or already revoked' }
    }
    
    // Revoke lease on blockchain using the same lease ID
    const revokeTxHash = await revokeLeaseOnChain(leaseId)
    
    // Update lease in database
    await db.update(memoryLeases)
      .set({
        isRevoked: 'true',
        revokedAt: new Date(),
        revokeTxHash
      })
      .where(eq(memoryLeases.id, leaseId))
    
    // Remove from Redis cache
    await removeLeaseFromRedis(leaseId)
    
    console.log(`✅ Lease revoked successfully: ${leaseId}`)
    
    return { success: true }
    
  } catch (error) {
    console.error('Lease revocation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Get all active leases for a user
export async function getUserLeases(walletId: string): Promise<LeaseInfo[]> {
  try {
    const leases = await db.select()
      .from(memoryLeases)
      .where(and(
        eq(memoryLeases.walletId, walletId),
        eq(memoryLeases.isRevoked, 'false')
      ))
    
    // Filter out expired leases and convert to LeaseInfo
    const now = new Date()
    return leases
      .filter(lease => lease.expiresAt > now)
      .map(lease => ({
        id: lease.id,
        walletId: lease.walletId,
        entity: lease.entity,
        accessSpecifier: lease.accessSpecifier,
        expiresAt: lease.expiresAt,
        isActive: true
      }))
      
  } catch (error) {
    console.error('Failed to get user leases:', error)
    return []
  }
}

// Find an appropriate lease for the given access request
export async function findValidLeaseForAccess(
  walletId: string,
  entity: string,
  requestedSource?: string
): Promise<{ lease: LeaseInfo | null, error?: string }> {
  try {
    // Get all active leases for the user
    const userLeases = await getUserLeases(walletId)
    
    if (userLeases.length === 0) {
      return { 
        lease: null, 
        error: `No active leases found for user. Please create a lease for entity '${entity}' first.` 
      }
    }
    
    // Filter leases by entity
    const entityLeases = userLeases.filter(lease => lease.entity === entity)
    
    if (entityLeases.length === 0) {
      const availableEntities = [...new Set(userLeases.map(l => l.entity))].join(', ')
      return { 
        lease: null, 
        error: `No lease found for entity '${entity}'. Available entities: ${availableEntities}` 
      }
    }
    
    if (requestedSource) {
      // Specific source requested - look for exact match first
      const exactMatch = entityLeases.find(lease => lease.accessSpecifier === requestedSource)
      if (exactMatch) {
        console.log(`✅ Found exact source lease: ${exactMatch.id} (${entity} → ${requestedSource})`)
        return { lease: exactMatch }
      }
      
      // If no exact match, try global access lease
      const globalLease = entityLeases.find(lease => lease.accessSpecifier === 'global')
      if (globalLease) {
        console.log(`✅ Found global lease for source request: ${globalLease.id} (${entity} → global covers ${requestedSource})`)
        return { lease: globalLease }
      }
      
      // No lease covers the requested source
      const availableAccess = entityLeases.map(l => l.accessSpecifier).join(', ')
      return { 
        lease: null, 
        error: `Entity '${entity}' cannot access source '${requestedSource}'. Available access: ${availableAccess}` 
      }
    } else {
      // No specific source requested - only allow global access
      const globalLease = entityLeases.find(lease => lease.accessSpecifier === 'global')
      if (globalLease) {
        console.log(`✅ Found global lease for general access: ${globalLease.id} (${entity} → global)`)
        return { lease: globalLease }
      }
      
      // No global access available
      const availableAccess = entityLeases.map(l => l.accessSpecifier).join(', ')
      return { 
        lease: null, 
        error: `Entity '${entity}' has no global access. Create a global lease or specify a source. Available access: ${availableAccess}` 
      }
    }
    
  } catch (error) {
    console.error('Failed to find valid lease:', error)
    return { 
      lease: null, 
      error: 'Failed to validate lease permissions' 
    }
  }
}