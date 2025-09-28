# Simple Contracts Integration

This document describes the integration of the new Simple Memory Audit and Simple Domain Registry contracts with the backend.

## Changes Made

### 1. Updated `blockchain.ts`

**New ABIs:**
- `SIMPLE_MEMORY_AUDIT_ABI`: Simplified memory audit contract with domain-based access control
- `SIMPLE_DOMAIN_REGISTRY_ABI`: Simple domain registry for storing domain-to-address mappings

**New Contract Instances:**
- `memoryContract`: SimpleMemoryAudit contract instance
- `domainRegistryContract`: SimpleDomainRegistry contract instance

**New Functions:**
- `addMemoryToBlockchain()`: Creates memory with `createMemory(metadataHash, sourceDomain)`
- `deleteMemoryFromBlockchain()`: Deletes memory with `deleteMemory(memoryId)`
- `isMemoryOnBlockchain()`: Checks memory existence with `isMemoryExists(memoryId)`
- `grantDomainAccess()`: Grants domain access with `grantDomainAccess(domain)`
- `revokeDomainAccess()`: Revokes domain access with `revokeDomainAccess(domain)`
- `accessMemory()`: Records memory access with `accessMemory(memoryId, accessingDomain)`
- `hasDomainAccess()`: Checks domain access with `hasDomainAccess(memoryId, domain)`
- `registerDomain()`: Registers domain with `registerDomain(domainName, officialAddress)`
- `isDomainRegistered()`: Checks domain registration with `isDomainRegistered(domainName)`
- `getDomainAddress()`: Gets domain address with `getDomainAddress(domainName)`

**Commented Out:**
- All old complex contract functions (lease management, time-based access, etc.)

### 2. Updated `config.ts`

**New Environment Variable:**
- `DOMAIN_REGISTRY_CONTRACT_ADDRESS`: Address of the SimpleDomainRegistry contract

### 3. Updated `env.example`

**New Configuration:**
```env
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://your-rpc-url-here
MEMORY_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
DOMAIN_REGISTRY_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
```

### 4. Updated `memory.ts`

**Function Call Update:**
- Changed `addMemoryToBlockchain()` parameter from `sourceDomainName` to `sourceDomain`

## Contract Addresses Required

You need to provide the deployed contract addresses for:

1. **SimpleMemoryAudit Contract**: Set `MEMORY_CONTRACT_ADDRESS` environment variable
2. **SimpleDomainRegistry Contract**: Set `DOMAIN_REGISTRY_CONTRACT_ADDRESS` environment variable

## Testing

A test script `test-simple-contracts.ts` has been created to verify the integration:

```bash
cd apps/backend
bun test-simple-contracts.ts
```

The test script will:
1. Check domain registration
2. Register a test domain (if needed)
3. Create a test memory
4. Verify memory exists
5. Grant domain access
6. Check domain access
7. Record memory access

## Key Differences from Old System

### Simplified Access Control
- **Old**: Complex time-based leases, user-based access, domain-specific access
- **New**: Simple domain-based access control only

### Memory Management
- **Old**: `addMemory(metadataHash, sourceDomainName)`
- **New**: `createMemory(metadataHash, sourceDomain)`

### No Time Limits
- **Old**: Time-based access with expiration
- **New**: Permanent access grants (no time limits)

### No Wallet Access
- **Old**: Individual wallet address access control
- **New**: Domain-only access control

## Usage

1. Deploy the Simple Memory Audit and Simple Domain Registry contracts
2. Set the contract addresses in your environment variables
3. Start the backend server
4. The system will automatically use the new simple contracts

## Benefits

- **Simpler**: Much cleaner and easier to understand
- **Hedera Compatible**: Designed specifically for Hedera network
- **Domain Focused**: Aligns with the domain-based access model
- **No Over-Engineering**: Removed complex features not needed for the core use case
