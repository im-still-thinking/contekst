import { ethers } from 'ethers'
import { config } from './config'

// MemoryControl smart contract ABI with domain-based access control
const MEMORY_CONTROL_ABI = [
  // Memory Management
  "function addMemory(bytes32 metadataHash, string sourceDomainName) external",
  "function deleteMemory(bytes32 memoryId) external",
  "function getMemory(bytes32 memoryId) external view returns (address, bytes32, uint256, address, string)",
  "function isMemoryExists(bytes32 memoryId) external view returns (bool)",
  "function getMemorySourceDomain(bytes32 memoryId) external view returns (string)",
  
  // Basic Access Control
  "function grantAccessToUser(address grantee) external",
  "function grantAccessToDomain(string domainName) external",
  "function revokeAccessFromUser(address grantee) external", 
  "function revokeAccessFromDomain(string domainName) external",
  "function hasAccess(bytes32 memoryId, address grantee) external view returns (bool)",
  
  // Time-Based Access Control  
  "function grantTimeBasedAccessToUser(address grantee, uint256 durationInSeconds) external",
  "function grantTimeBasedAccessToDomain(string domainName, uint256 durationInSeconds) external",
  "function revokeTimeBasedAccessFromUser(address grantee) external",
  "function revokeTimeBasedAccessFromDomain(string domainName) external",
  "function hasAccessExpired(address grantee) external view returns (bool)",
  
  // Domain-Based Access Control (KEY FOR CONSOLIDATION!)
  "function grantAccessToDomainMemories(address grantee, string sourceDomain) external",
  "function grantDomainAccessToDomainMemories(string granteeDomain, string sourceDomain) external", 
  "function grantTimeBasedAccessToDomainMemories(address grantee, string sourceDomain, uint256 durationInSeconds) external",
  "function grantTimeBasedDomainAccessToDomainMemories(string granteeDomain, string sourceDomain, uint256 durationInSeconds) external",
  "function revokeAccessFromDomainMemories(address grantee, string sourceDomain) external",
  "function revokeDomainAccessFromDomainMemories(string granteeDomain, string sourceDomain) external",
  "function hasDomainAccessExpired(address grantee, string sourceDomain) external view returns (bool)",
  
  // Enhanced Access Checking
  "function hasEnhancedAccess(bytes32 memoryId, address grantee) external view returns (bool)",
  
  // Audit Trail Functions (for memory access events)
  "function recordMemoryAccess(address accessor, bytes32 memoryId, string entity, string action, bytes32[] memoryIds) external",
  
  // Events
  "event MemoryAdded(address indexed owner, bytes32 indexed memoryId, string sourceDomainName)",
  "event MemoryDeleted(address indexed owner, bytes32 indexed memoryId)", 
  "event AccessGranted(address indexed owner, address indexed grantee, string granteeDomain)",
  "event AccessRevoked(address indexed owner, address indexed grantee, string granteeDomain)",
  "event TimeBasedAccessGranted(address indexed owner, address indexed grantee, string granteeDomain, uint256 expirationTime)",
  "event DomainAccessGranted(address indexed owner, address indexed grantee, string sourceDomain, string granteeDomain)",
  "event DomainAccessRevoked(address indexed owner, address indexed grantee, string sourceDomain, string granteeDomain)"
]

let provider: ethers.providers.Provider | null = null
let contract: ethers.Contract | null = null
let wallet: ethers.Wallet | null = null

// Initialize blockchain connection
async function initializeBlockchain() {
  try {
    if (!config.BLOCKCHAIN_RPC_URL) {
      console.warn('⚠️  BLOCKCHAIN_RPC_URL not configured - blockchain features disabled')
      return
    }

    if (!config.MEMORY_CONTRACT_ADDRESS) {
      console.warn('⚠️  MEMORY_CONTRACT_ADDRESS not configured - blockchain features disabled')
      return
    }

    console.log('🔗 Initializing blockchain connection...')
    provider = new ethers.providers.JsonRpcProvider(config.BLOCKCHAIN_RPC_URL)
    
    // Test provider connection
    const network = await provider.getNetwork()
    console.log(`🌐 Connected to ${network.name} (Chain ID: ${network.chainId})`)
    
    // For write operations, we need a wallet
    if (config.BLOCKCHAIN_PRIVATE_KEY && config.BLOCKCHAIN_PRIVATE_KEY !== 'your_private_key_here') {
      wallet = new ethers.Wallet(config.BLOCKCHAIN_PRIVATE_KEY, provider)
      contract = new ethers.Contract(config.MEMORY_CONTRACT_ADDRESS, MEMORY_CONTROL_ABI, wallet)
      
      // Check wallet balance
      const balance = await wallet.getBalance()
      const balanceEth = ethers.utils.formatEther(balance)
      
      console.log(`💳 Server wallet: ${wallet.address}`)
      console.log(`💰 Balance: ${balanceEth} ETH`)
      
      if (parseFloat(balanceEth) === 0) {
        console.warn('⚠️  Warning: Server wallet has no ETH! Blockchain operations will fail.')
        console.warn('   Fund the wallet or disable blockchain features for testing.')
      } else {
        console.log('✅ Blockchain ready for transactions!')
      }
    } else {
      // Read-only contract instance
      contract = new ethers.Contract(config.MEMORY_CONTRACT_ADDRESS, MEMORY_CONTROL_ABI, provider)
      console.warn('⚠️  No private key configured - blockchain operations in read-only mode')
    }
    
  } catch (error: any) {
    console.error('❌ Blockchain initialization failed:', error?.message || error)
    console.error('   Blockchain features will be disabled')
    provider = null
    contract = null
    wallet = null
  }
}

// Initialize blockchain on module load
initializeBlockchain().catch(console.error)

// Memory Management Functions
export interface AddMemoryParams {
  metadataHash: string
  sourceDomainName: string
}

export async function addMemoryToBlockchain(params: AddMemoryParams): Promise<string | null> {
  if (!contract || !wallet) {
    console.warn('⚠️  MemoryControl contract or wallet not available')
    return null
  }

  const { metadataHash, sourceDomainName } = params

  try {
    // Check wallet balance before attempting transaction
    const balance = await wallet.getBalance()
    if (balance.isZero()) {
      console.error('❌ Wallet has no ETH for gas fees')
      return null
    }

    console.log(`📝 Adding memory to blockchain: hash=${metadataHash}, domain=${sourceDomainName}`)
    const tx = await contract.addMemory(metadataHash, sourceDomainName)
    console.log(`⛓️  Transaction submitted: ${tx.hash}`)
    
    const receipt = await tx.wait()
    console.log(`✅ Memory added to blockchain: ${tx.hash} (Block: ${receipt.blockNumber})`)
    
    return tx.hash
  } catch (error: any) {
    console.error('❌ Blockchain memory creation failed:', error?.message || error)
    if (error?.code === 'INSUFFICIENT_FUNDS') {
      console.error('   → Wallet needs more ETH for gas fees')
    } else if (error?.code === 'NETWORK_ERROR') {
      console.error('   → Check RPC URL and network connectivity')
    }
    return null
  }
}

export async function deleteMemoryFromBlockchain(memoryId: string): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  MemoryControl contract not available')
    return null
  }

  try {
    const tx = await contract.deleteMemory(memoryId)
    console.log(`🗑️  Deleting memory from blockchain: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain memory deletion failed:', error)
    return null
  }
}

export async function isMemoryOnBlockchain(memoryId: string): Promise<boolean> {
  if (!contract) {
    console.warn('⚠️  MemoryControl contract not available')
    return false
  }

  try {
    return await contract.isMemoryExists(memoryId)
  } catch (error) {
    console.error('Blockchain memory check failed:', error)
    return false
  }
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
  memoryId?: string
  entity: string
  action: 'access_granted' | 'access_denied'
  memoryIds: string[]
}

export async function recordAuditOnChain(params: AuditTrailParams): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  MemoryControl contract not available for audit recording')
    return null
  }

  const { walletId, memoryId, entity, action, memoryIds } = params

  try {
    // Convert memory IDs to bytes32 array
    const memoryIdsBytes32 = memoryIds.map(id => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(id)))
    
    const tx = await contract.recordMemoryAccess(
      walletId,
      memoryId ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(memoryId)) : ethers.constants.HashZero,
      entity,
      action,
      memoryIdsBytes32
    )

    console.log(`📋 Recording memory access audit on-chain: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain audit recording failed:', error)
    return null
  }
}

// === CONSOLIDATED SOURCE-SPECIFIC ACCESS FUNCTIONS ===
// These functions sync database access specifiers with smart contract source domains

export async function grantTimeBasedDomainAccessToSource(granteeDomain: string, sourceDomain: string, durationInSeconds: number): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  Smart contract not available')
    return null
  }

  try {
    // Use the domain-based access control from MemoryControl contract
    // This maps accessSpecifier (sourceDomain) to blockchain source domains
    const tx = await contract.grantTimeBasedDomainAccessToDomainMemories(granteeDomain, sourceDomain, durationInSeconds)
    console.log(`⏰🎯 Blockchain: ${granteeDomain} granted access to ${sourceDomain} memories for ${durationInSeconds}s: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain source-specific domain access grant failed:', error)
    return null
  }
}

export async function revokeDomainAccessFromSource(granteeDomain: string, sourceDomain: string): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  Smart contract not available')
    return null
  }

  try {
    const tx = await contract.revokeDomainAccessFromDomainMemories(granteeDomain, sourceDomain)
    console.log(`🚫🎯 Blockchain: ${granteeDomain} revoked from ${sourceDomain} memories: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain source-specific domain access revoke failed:', error)
    return null
  }
}

export async function grantTimeBasedDomainAccess(domainName: string, durationInSeconds: number): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  Smart contract not available') 
    return null
  }

  try {
    // Use global domain access for 'global' access specifiers
    const tx = await contract.grantTimeBasedAccessToDomain(domainName, durationInSeconds)
    console.log(`⏰ Blockchain: ${domainName} granted global access for ${durationInSeconds}s: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain global domain access grant failed:', error)
    return null
  }
}

export async function revokeDomainAccess(domainName: string): Promise<string | null> {
  if (!contract) {
    console.warn('⚠️  Smart contract not available')
    return null
  }

  try {
    const tx = await contract.revokeAccessFromDomain(domainName)
    console.log(`🚫 Blockchain: ${domainName} global access revoked: ${tx.hash}`)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error('Blockchain global domain access revoke failed:', error)
    return null
  }
}