import { ethers } from 'ethers'
import { config } from './config'

// Smart contract ABI for memory lease functions
const LEASE_CONTRACT_ABI = [
  "function createLease(address walletId, string entity, string accessSpecifier, uint256 duration) external returns (bytes32)",
  "function revokeLease(bytes32 leaseId) external returns (bool)",
  "function isLeaseActive(bytes32 leaseId) external view returns (bool)",
  "function recordAuditTrail(address walletId, bytes32 leaseId, string entity, string action, string[] memoryIds) external returns (bytes32)",
  "event LeaseCreated(bytes32 indexed leaseId, address indexed walletId, string entity, string accessSpecifier, uint256 expiresAt)",
  "event LeaseRevoked(bytes32 indexed leaseId, address indexed walletId)",
  "event AuditTrailRecorded(bytes32 indexed auditId, address indexed walletId, bytes32 leaseId, string entity, string action)"
]

let provider: ethers.providers.Provider | null = null
let contract: ethers.Contract | null = null

// Initialize blockchain connection
try {
  if (config.BLOCKCHAIN_RPC_URL && config.LEASE_CONTRACT_ADDRESS) {
    provider = new ethers.providers.JsonRpcProvider(config.BLOCKCHAIN_RPC_URL)
    
    // For write operations, we'll need a wallet
    if (config.BLOCKCHAIN_PRIVATE_KEY) {
      const wallet = new ethers.Wallet(config.BLOCKCHAIN_PRIVATE_KEY, provider)
      contract = new ethers.Contract(config.LEASE_CONTRACT_ADDRESS, LEASE_CONTRACT_ABI, wallet)
    } else {
      // Read-only contract instance
      contract = new ethers.Contract(config.LEASE_CONTRACT_ADDRESS, LEASE_CONTRACT_ABI, provider)
    }
  }
} catch (error) {
  console.warn('⚠️  Blockchain connection failed:', error)
}

export interface CreateLeaseParams {
  walletId: string
  entity: string
  accessSpecifier: string
  durationDays: number
}

export interface LeaseResult {
  leaseId: string
  txHash: string
  expiresAt: Date
}

export async function createLeaseOnChain(params: CreateLeaseParams): Promise<LeaseResult> {
  if (!contract || !provider) {
    throw new Error('Blockchain contract not available')
  }

  const { walletId, entity, accessSpecifier, durationDays } = params
  const durationSeconds = durationDays * 24 * 60 * 60

  try {
    const tx = await contract.createLease(
      walletId,
      entity,
      accessSpecifier,
      durationSeconds
    )

    console.log(`📝 Creating lease on-chain: ${tx.hash}`)
    const receipt = await tx.wait()

    // Extract lease ID from the transaction receipt logs
    const event = receipt.events?.find((e: any) => e.event === 'LeaseCreated')
    const leaseId = event?.args?.leaseId || tx.hash // Fallback to tx hash if event parsing fails

    const expiresAt = new Date(Date.now() + durationSeconds * 1000)

    return {
      leaseId: leaseId,
      txHash: tx.hash,
      expiresAt
    }
  } catch (error) {
    console.error('Blockchain lease creation failed:', error)
    throw error
  }
}

export async function revokeLeaseOnChain(leaseId: string): Promise<string> {
  if (!contract) {
    throw new Error('Blockchain contract not available')
  }

  try {
    const tx = await contract.revokeLease(leaseId)
    console.log(`🗑️  Revoking lease on-chain: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain lease revocation failed:', error)
    throw error
  }
}

export async function isLeaseActiveOnChain(leaseId: string): Promise<boolean> {
  if (!contract) {
    console.warn('⚠️  Blockchain contract not available for lease check')
    return false
  }

  try {
    return await contract.isLeaseActive(leaseId)
  } catch (error) {
    console.error('Blockchain lease check failed:', error)
    return false
  }
}

export interface AuditTrailParams {
  walletId: string
  leaseId: string
  entity: string
  action: 'access_granted' | 'access_denied'
  memoryIds: string[]
}

export async function recordAuditOnChain(params: AuditTrailParams): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  Blockchain contract not available for audit recording')
    return null
  }

  const { walletId, leaseId, entity, action, memoryIds } = params

  try {
    const tx = await contract.recordAuditTrail(
      walletId,
      leaseId,
      entity,
      action,
      memoryIds
    )

    console.log(`📋 Recording audit trail on-chain: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain audit recording failed:', error)
    return null
  }
}