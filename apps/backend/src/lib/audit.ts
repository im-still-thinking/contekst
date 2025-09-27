import { nanoid } from 'nanoid'
import { eq, desc } from 'drizzle-orm'
import { db } from './db'
import { memoryAuditTrail } from '../models/audit'
import { recordAuditOnChain, type AuditTrailParams } from './blockchain'

export interface CreateAuditRequest {
  walletId: string
  leaseId?: string
  entity: string
  action: 'access_granted' | 'access_denied'
  reason?: string
  userPrompt: string
  source?: string
  accessedMemories?: string[]
}

export interface AuditRecord {
  id: string
  walletId: string
  leaseId?: string
  entity: string
  action: string
  reason?: string
  userPrompt: string
  source?: string
  accessedMemories: string[]
  memoryCount: number
  txHash?: string
  createdAt: Date
}

export async function recordAuditTrail(request: CreateAuditRequest): Promise<string> {
  const auditId = nanoid()
  const { 
    walletId, 
    leaseId, 
    entity, 
    action, 
    reason, 
    userPrompt, 
    source, 
    accessedMemories = [] 
  } = request

  try {
    let txHash: string | null = null

    // Record on blockchain if we have the lease ID
    if (leaseId) {
      const auditParams: AuditTrailParams = {
        walletId,
        leaseId, // This is now the blockchain lease ID
        entity,
        action,
        memoryIds: accessedMemories
      }
      
      txHash = await recordAuditOnChain(auditParams)
    }

    // Store in database
    await db.insert(memoryAuditTrail).values({
      id: auditId,
      walletId,
      leaseId,
      entity,
      action,
      reason,
      userPrompt,
      source,
      accessedMemories,
      memoryCount: String(accessedMemories.length),
      txHash: txHash || undefined
    })

    console.log(`📋 Audit trail recorded: ${auditId} (${action})`)
    return auditId

  } catch (error) {
    console.error('Failed to record audit trail:', error)
    return auditId
  }
}

export async function getAuditTrailForUser(walletId: string, limit: number = 50): Promise<AuditRecord[]> {
  try {
    const audits = await db.select()
      .from(memoryAuditTrail)
      .where(eq(memoryAuditTrail.walletId, walletId))
      .orderBy(desc(memoryAuditTrail.createdAt))
      .limit(limit)

    return audits.map(audit => ({
      id: audit.id,
      walletId: audit.walletId,
      leaseId: audit.leaseId || undefined,
      entity: audit.entity,
      action: audit.action,
      reason: audit.reason || undefined,
      userPrompt: audit.userPrompt,
      source: audit.source || undefined,
      accessedMemories: audit.accessedMemories || [],
      memoryCount: parseInt(audit.memoryCount),
      txHash: audit.txHash || undefined,
      createdAt: audit.createdAt
    }))

  } catch (error) {
    console.error('Failed to get audit trail:', error)
    return []
  }
}

export async function getAuditStats(walletId: string): Promise<{
  totalAccesses: number
  grantedAccesses: number
  deniedAccesses: number
  totalMemoriesAccessed: number
}> {
  try {
    const audits = await db.select({
      action: memoryAuditTrail.action,
      memoryCount: memoryAuditTrail.memoryCount
    })
    .from(memoryAuditTrail)
    .where(eq(memoryAuditTrail.walletId, walletId))

    const stats = {
      totalAccesses: audits.length,
      grantedAccesses: audits.filter(a => a.action === 'access_granted').length,
      deniedAccesses: audits.filter(a => a.action === 'access_denied').length,
      totalMemoriesAccessed: audits
        .filter(a => a.action === 'access_granted')
        .reduce((sum, a) => sum + parseInt(a.memoryCount), 0)
    }

    return stats

  } catch (error) {
    console.error('Failed to get audit stats:', error)
    return {
      totalAccesses: 0,
      grantedAccesses: 0,
      deniedAccesses: 0,
      totalMemoriesAccessed: 0
    }
  }
}