# Simple Memory System

This directory contains simplified smart contracts focused on audit trails and domain-based memory access control.

## Overview

The simple system consists of two main contracts:

1. **SimpleDomainRegistry** - Minimal domain registration
2. **SimpleMemoryAudit** - Domain-based memory access and audit trail

## Key Features

### SimpleDomainRegistry
- Register domains with their official wallet addresses
- Look up domain addresses
- Admin-only domain registration
- Minimal gas costs

### SimpleMemoryAudit
- Store memory metadata hashes on-chain
- Domain-based access control only (no wallet access)
- Complete audit trail of all access events
- No time limits or complex features
- Auto-grant access to source domain

## Contract Functions

### SimpleDomainRegistry
```solidity
// Admin functions
function registerDomain(string memory domainName, address officialAddress) external onlyAdmin

// View functions
function getDomainAddress(string memory domainName) external view returns (address)
function isDomainRegistered(string memory domainName) external view returns (bool)
```

### SimpleMemoryAudit
```solidity
// Memory management
function createMemory(bytes32 metadataHash, string memory sourceDomain) external
function deleteMemory(bytes32 memoryId) external onlyMemoryOwner

// Access control
function grantDomainAccess(string memory domain) external
function revokeDomainAccess(string memory domain) external
function accessMemory(bytes32 memoryId, string memory accessingDomain) external

// View functions
function hasDomainAccess(bytes32 memoryId, string memory domain) external view returns (bool)
function getMemory(bytes32 memoryId) external view returns (Memory memory)
function memoryExists(bytes32 memoryId) external view returns (bool)
```

## Events (Audit Trail)

All important actions emit events for complete audit trail:

- `MemoryCreated` - When a memory is created
- `MemoryDeleted` - When a memory is deleted
- `DomainAccessGranted` - When domain access is granted
- `DomainAccessRevoked` - When domain access is revoked
- `MemoryAccessed` - When a domain accesses a memory

## Deployment

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test test/SimpleSystem.ts

# Deploy to local network
npx hardhat run scripts/deploy-simple-system.ts --network localhost
```

## Usage Example

```typescript
// 1. Deploy contracts
const domainRegistry = await SimpleDomainRegistry.deploy();
const memoryAudit = await SimpleMemoryAudit.deploy(domainRegistry.address);

// 2. Register domains
await domainRegistry.registerDomain("chatgpt.com", chatgptAddress);
await domainRegistry.registerDomain("claude.ai", claudeAddress);

// 3. Create memory
const memoryHash = ethers.keccak256(ethers.toUtf8Bytes("memory content"));
await memoryAudit.createMemory(memoryHash, "chatgpt.com");

// 4. Grant access to another domain
await memoryAudit.grantDomainAccess("claude.ai");

// 5. Access memory from authorized domain
await memoryAudit.connect(claudeWallet).accessMemory(memoryHash, "claude.ai");
```

## Gas Optimization

- Minimal on-chain storage (only metadata hash, not full content)
- Simple access control mappings
- No complex time-based features
- Optimized for low transaction costs

## Security

- Only registered domains can access memories
- Memory owners control all access
- Complete audit trail of all actions
- No external wallet access (domain-only)
