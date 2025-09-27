# Memory System Smart Contracts

This directory contains the smart contracts for the Memory System protocol, designed to run on the Hedera Smart Contract Service (HSCS). The system consists of two main contracts that work together to provide secure, cost-effective, and scalable memory management.

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
- Complete access control system
- Immutable audit trail through events
- Digital fingerprint approach for metadata

**Core Functions**:
- `addMemory(bytes32 metadataHash, string sourceDomainName)`: Add a new memory
- `deleteMemory(bytes32 memoryId)`: Delete a memory (owner only)
- `grantAccessToUser(address grantee)`: Grant access to another user
- `grantAccessToDomain(string domainName)`: Grant access to an application domain
- `revokeAccessFromUser(address grantee)`: Revoke access from a user
- `revokeAccessFromDomain(string domainName)`: Revoke access from a domain
- `hasAccess(bytes32 memoryId, address grantee)`: Check if a grantee has access
- `getMemory(bytes32 memoryId)`: Get memory information
- `isMemoryExists(bytes32 memoryId)`: Check if a memory exists

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

- `MemoryAdded`: When a new memory is created
- `MemoryDeleted`: When a memory is deleted
- `AccessGranted`: When access is granted to a user or domain
- `AccessRevoked`: When access is revoked from a user or domain
- `DomainRegistered`: When a new domain is registered

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
4. **Access Management**: Users grant/revoke access to other users or domains
5. **Audit**: All actions are logged as events for complete transparency

## Security Features

- **Access Control**: Only memory owners can delete their memories
- **Domain Verification**: All domain references are cryptographically verified
- **Input Validation**: All inputs are validated to prevent malicious data
- **Admin Controls**: Domain registration is restricted to admin accounts
- **Immutable Audit Trail**: All actions are permanently recorded as events

## Hedera Compatibility

The contracts are designed to work seamlessly with the Hedera Smart Contract Service:
- Compatible with Hedera's gas model
- Optimized for Hedera's transaction structure
- Uses standard Solidity patterns for maximum compatibility

## Testing

The test suite covers:
- Domain registration and verification
- Memory creation and deletion
- Access control mechanisms
- Error handling and edge cases
- Event emission verification

Run tests with:
```bash
npx hardhat test test/MemorySystem.ts
```
