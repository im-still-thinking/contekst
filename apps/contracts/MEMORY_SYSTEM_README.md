# Memory System Smart Contracts

This directory contains the smart contracts for the Memory System protocol, designed to run on the Hedera Smart Contract Service (HSCS). The system consists of two main contracts that work together to provide secure, cost-effective, and scalable memory management with **advanced granular access control** and **time-based permissions**.

## Contract Architecture

### 1. DomainRegistry.sol
A foundational contract that acts as a secure, on-chain directory for application domains.

**Purpose**: Solves the challenge of securely identifying application domains like "chatgpt.com" on-chain by linking human-readable domain names to secure, official Hedera wallet addresses.

**Key Features**:
- Admin-controlled domain registration
- Secure domain-to-address mapping
- Domain existence verification

**Core Functions**:
- `registerDomain(string domainName, address officialAddress)`: Register a new application domain (admin only)
- `getDomainAddress(string domainName)`: Get the official wallet address for a domain
- `isDomainRegistered(string domainName)`: Check if a domain is registered

### 2. MemoryControl.sol
The main contract that users and applications interact with to manage memory ownership, permissions, and audit trails.

**Purpose**: Manages all user-specific logic, referencing the DomainRegistry to securely handle domain-based permissions.

**Key Features**:
- Hybrid on-chain/off-chain storage model
- **Advanced granular access control** (memory-level, domain-level, time-based)
- **Time-based access expiration** with automatic revocation
- **Memory-specific permissions** (grant access to individual memories)
- **Domain-based memory categorization** (grant access to memories from specific sources)
- Immutable audit trail through events
- Digital fingerprint approach for metadata

**Core Functions**:

**Memory Management**:
- `addMemory(bytes32 metadataHash, string sourceDomainName)`: Add a new memory
- `deleteMemory(bytes32 memoryId)`: Delete a memory (owner only)
- `getMemory(bytes32 memoryId)`: Get memory information
- `isMemoryExists(bytes32 memoryId)`: Check if a memory exists
- `getMemorySourceDomain(bytes32 memoryId)`: Get the source domain of a memory

**Basic Access Control**:
- `grantAccessToUser(address grantee)`: Grant general access to another user
- `grantAccessToDomain(string domainName)`: Grant general access to an application domain
- `revokeAccessFromUser(address grantee)`: Revoke general access from a user
- `revokeAccessFromDomain(string domainName)`: Revoke general access from a domain
- `hasAccess(bytes32 memoryId, address grantee)`: Check if a grantee has access (legacy)

**Time-Based Access Control**:
- `grantTimeBasedAccessToUser(address grantee, uint256 durationInSeconds)`: Grant time-limited access to a user
- `grantTimeBasedAccessToDomain(string domainName, uint256 durationInSeconds)`: Grant time-limited access to a domain
- `revokeTimeBasedAccessFromUser(address grantee)`: Revoke time-based access from a user
- `revokeTimeBasedAccessFromDomain(string domainName)`: Revoke time-based access from a domain
- `hasAccessExpired(address grantee)`: Check if general access has expired

**Memory-Specific Access Control**:
- `grantAccessToMemory(address grantee, bytes32 memoryId)`: Grant access to a specific memory
- `grantDomainAccessToMemory(string domainName, bytes32 memoryId)`: Grant domain access to a specific memory
- `grantTimeBasedAccessToMemory(address grantee, bytes32 memoryId, uint256 durationInSeconds)`: Grant time-limited access to a specific memory
- `grantTimeBasedDomainAccessToMemory(string domainName, bytes32 memoryId, uint256 durationInSeconds)`: Grant time-limited domain access to a specific memory
- `revokeAccessFromMemory(address grantee, bytes32 memoryId)`: Revoke access from a specific memory
- `revokeDomainAccessFromMemory(string domainName, bytes32 memoryId)`: Revoke domain access from a specific memory
- `hasMemoryAccessExpired(address grantee, bytes32 memoryId)`: Check if memory-specific access has expired

**Domain-Based Access Control**:
- `grantAccessToDomainMemories(address grantee, string sourceDomain)`: Grant access to all memories from a specific source domain
- `grantDomainAccessToDomainMemories(string granteeDomain, string sourceDomain)`: Grant domain access to domain memories
- `grantTimeBasedAccessToDomainMemories(address grantee, string sourceDomain, uint256 durationInSeconds)`: Grant time-limited access to domain memories
- `grantTimeBasedDomainAccessToDomainMemories(string granteeDomain, string sourceDomain, uint256 durationInSeconds)`: Grant time-limited domain access to domain memories
- `revokeAccessFromDomainMemories(address grantee, string sourceDomain)`: Revoke access from domain memories
- `revokeDomainAccessFromDomainMemories(string granteeDomain, string sourceDomain)`: Revoke domain access from domain memories

**Enhanced Access Checking**:
- `hasEnhancedAccess(bytes32 memoryId, address grantee)`: Check access with all permission types and expiration

## Storage Strategy

The system uses a hybrid approach for optimal security, cost, and privacy:

1. **Off-Chain Storage**: Full JSON metadata (prompt, source, conversationThread, etc.) stored in MySQL database
2. **On-Chain Verification**: Application backend computes a keccak256 hash of the metadata
3. **On-Chain Storage**: Only the 32-byte hash is stored on-chain as a "digital fingerprint"

This approach provides:
- Immutable, verifiable link to off-chain data
- Minimal gas costs
- Privacy protection (no sensitive data on-chain)
- Complete audit trail

## Events (Audit Trail)

All significant actions emit events for complete transparency:

**Basic Events**:
- `MemoryAdded`: When a new memory is created
- `MemoryDeleted`: When a memory is deleted
- `AccessGranted`: When general access is granted to a user or domain
- `AccessRevoked`: When general access is revoked from a user or domain
- `DomainRegistered`: When a new domain is registered

**Enhanced Access Control Events**:
- `TimeBasedAccessGranted`: When time-limited access is granted
- `TimeBasedAccessRevoked`: When time-based access is revoked
- `MemoryAccessGranted`: When access to a specific memory is granted
- `MemoryAccessRevoked`: When access to a specific memory is revoked
- `TimeBasedMemoryAccessGranted`: When time-limited access to a specific memory is granted
- `DomainAccessGranted`: When access to domain memories is granted
- `DomainAccessRevoked`: When access to domain memories is revoked
- `TimeBasedDomainAccessGranted`: When time-limited access to domain memories is granted

## Deployment

1. **Compile contracts**:
   ```bash
   npx hardhat compile
   ```

2. **Run tests**:
   ```bash
   npx hardhat test
   ```

3. **Deploy contracts**:
   ```bash
   npx hardhat run scripts/deploy-memory-system.ts --network <network>
   ```

## Usage Flow

1. **Setup**: Deploy both contracts, with MemoryControl referencing DomainRegistry
2. **Domain Registration**: Admin registers application domains (e.g., "chatgpt.com", "claude.ai")
3. **Memory Creation**: Users create memories through application backends
4. **Access Management**: Users grant/revoke access using various permission types:
   - **General Access**: Access to all memories
   - **Memory-Specific Access**: Access to individual memories
   - **Domain-Based Access**: Access to memories from specific source domains
   - **Time-Based Access**: Access with automatic expiration
5. **Audit**: All actions are logged as events for complete transparency

## Access Control Examples

### Example 1: Grant ChatGPT access to only your Claude memories for 1 hour
```solidity
// Grant ChatGPT access to all memories from claude.ai for 1 hour
memoryControl.grantTimeBasedDomainAccessToDomainMemories("chatgpt.com", "claude.ai", 3600);
```

### Example 2: Grant a user access to a specific memory for 30 minutes
```solidity
// Grant user access to specific memory for 30 minutes
memoryControl.grantTimeBasedAccessToMemory(userAddress, memoryId, 1800);
```

### Example 3: Grant Claude access to only your ChatGPT memories
```solidity
// Grant Claude access to all memories from chatgpt.com
memoryControl.grantDomainAccessToDomainMemories("claude.ai", "chatgpt.com");
```

### Example 4: Check if access has expired
```solidity
// Check if user's access has expired
bool expired = memoryControl.hasAccessExpired(userAddress);
```

## Access Priority System

The system uses a hierarchical access control model:

1. **Owner**: Always has full access to their memories
2. **General Access**: Access to all memories (with optional expiration)
3. **Memory-Specific Access**: Access to specific memories (with optional expiration)
4. **Domain-Based Access**: Access to all memories from a specific source domain (with optional expiration)

Access is checked in this order, and the first match determines the result.

## Security Features

- **Granular Access Control**: Memory-level, domain-level, and time-based permissions
- **Automatic Expiration**: Time-based access automatically expires without manual intervention
- **Owner Protection**: Only memory owners can delete their memories
- **Domain Verification**: All domain references are cryptographically verified
- **Input Validation**: All inputs are validated to prevent malicious data
- **Admin Controls**: Domain registration is restricted to admin accounts
- **Immutable Audit Trail**: All actions are permanently recorded as events
- **Access Hierarchy**: Clear priority system prevents permission conflicts

## Hedera Compatibility

The contracts are designed to work seamlessly with the Hedera Smart Contract Service:
- Compatible with Hedera's gas model
- Optimized for Hedera's transaction structure
- Uses standard Solidity patterns for maximum compatibility

## Testing

The comprehensive test suite covers:
- Domain registration and verification
- Memory creation and deletion
- **Time-based access control** with expiration testing
- **Memory-specific access control** for individual memories
- **Domain-based access control** for source domain categorization
- **Complex access scenarios** with multiple permission types
- Access revocation mechanisms
- Error handling and edge cases
- Event emission verification
- **100% test coverage** with 16 passing tests

Run tests with:
```bash
# Run all tests
npx hardhat test

# Run basic memory system tests
npx hardhat test test/MemorySystem.ts

# Run enhanced access control tests
npx hardhat test test/EnhancedMemorySystem.ts
```

## Contract Size Optimization

The MemoryControl contract is optimized for deployment:
- **Compiler Optimization**: Enabled with 200 runs for gas efficiency
- **Contract Size**: Optimized to fit within deployment limits
- **Gas Efficiency**: Time-based checks only when needed
- **Event-Driven**: Complete audit trail for all access changes

## 🚀 Enhanced Features Summary

The Memory System now includes **advanced access control capabilities**:

### ✅ **Time-Based Access Control**
- Grant access with automatic expiration
- No manual revocation needed
- Perfect for temporary collaborations

### ✅ **Memory-Specific Permissions**
- Grant access to individual memories
- Granular control over data sharing
- Ideal for selective memory sharing

### ✅ **Domain-Based Memory Categorization**
- Grant access to memories from specific source domains
- Example: Give ChatGPT access only to your Claude memories
- Perfect for cross-platform memory sharing

### ✅ **Combined Permission Types**
- Mix and match different access types
- Time-based + memory-specific permissions
- Domain-based + time-limited access

### ✅ **Complete Audit Trail**
- Every access change is logged as an event
- Immutable record of all permissions
- Full transparency and compliance

### ✅ **100% Test Coverage**
- 16 comprehensive tests covering all features
- Edge cases and error handling
- Time-based expiration testing

This enhanced system provides **enterprise-grade access control** for memory management on Hedera! 🎉
