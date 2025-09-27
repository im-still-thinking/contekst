// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IDomainRegistry.sol";

/**
 * @title MemoryControl
 * @dev The main contract that users and applications will interact with to manage memory ownership, 
 * permissions, and the audit trail. This contract uses a hybrid on-chain/off-chain storage model
 * where only a cryptographic hash of the metadata is stored on-chain for cost efficiency and privacy.
 */
contract MemoryControl {
    // An interface to securely interact with the DomainRegistry contract
    IDomainRegistry public immutable domainRegistry;
    
    // A struct to hold the essential, fixed-size on-chain data for each memory
    struct Memory {
        address owner;          // The wallet address of the memory's owner
        bytes32 metadataHash;   // The "digital fingerprint" of the full off-chain metadata
        uint256 createdAt;      // The on-chain timestamp of creation
        address sourceDomain;   // The official wallet address of the source domain
    }
    
    // Mapping from a unique memory ID (the metadataHash) to the Memory struct
    mapping(bytes32 => Memory) public memories;
    
    // The unified Access Control List: owner => grantee => hasAccess
    // The grantee can be another user's wallet OR a domain's official wallet
    mapping(address => mapping(address => bool)) public accessList;
    
    // Events for the immutable audit trail
    event MemoryAdded(address indexed owner, bytes32 indexed memoryId, string sourceDomainName);
    event MemoryDeleted(address indexed owner, bytes32 indexed memoryId);
    event AccessGranted(address indexed owner, address indexed grantee, string granteeDomain);
    event AccessRevoked(address indexed owner, address indexed grantee, string granteeDomain);
    
    // Modifier to ensure only the memory owner can perform certain actions
    modifier onlyMemoryOwner(bytes32 memoryId) {
        require(memories[memoryId].owner == msg.sender, "MemoryControl: Only memory owner can perform this action");
        _;
    }
    
    // Modifier to ensure memory exists
    modifier memoryExists(bytes32 memoryId) {
        require(memories[memoryId].owner != address(0), "MemoryControl: Memory does not exist");
        _;
    }
    
    // Modifier to ensure domain name is not empty
    modifier validDomainName(string memory domainName) {
        require(bytes(domainName).length > 0, "MemoryControl: Domain name cannot be empty");
        _;
    }
    
    /**
     * @dev Constructor sets the domain registry address
     * @param _domainRegistry The address of the DomainRegistry contract
     */
    constructor(address _domainRegistry) {
        require(_domainRegistry != address(0), "MemoryControl: Domain registry address cannot be zero");
        domainRegistry = IDomainRegistry(_domainRegistry);
    }
    
    /**
     * @dev Add a new memory to the system
     * @param metadataHash The keccak256 hash of the full off-chain metadata (the "digital fingerprint")
     * @param sourceDomainName The domain name where this memory was created (e.g., "chatgpt.com")
     * 
     * This function is called by the application backend when a user creates a new memory.
     * It automatically grants access to the source domain's official wallet address.
     */
    function addMemory(
        bytes32 metadataHash, 
        string memory sourceDomainName
    ) external validDomainName(sourceDomainName) {
        require(metadataHash != bytes32(0), "MemoryControl: Metadata hash cannot be zero");
        require(memories[metadataHash].owner == address(0), "MemoryControl: Memory with this hash already exists");
        
        // Get the official wallet address for the source domain
        address sourceDomainAddress = domainRegistry.getDomainAddress(sourceDomainName);
        
        // Create and store the new Memory struct
        memories[metadataHash] = Memory({
            owner: msg.sender,
            metadataHash: metadataHash,
            createdAt: block.timestamp,
            sourceDomain: sourceDomainAddress
        });
        
        // Automatically grant access to the source domain's official wallet address
        accessList[msg.sender][sourceDomainAddress] = true;
        
        // Emit events for complete audit trail
        emit MemoryAdded(msg.sender, metadataHash, sourceDomainName);
        emit AccessGranted(msg.sender, sourceDomainAddress, sourceDomainName);
    }
    
    /**
     * @dev Delete a memory from the system
     * @param memoryId The unique memory ID (metadataHash) to delete
     * 
     * This function is called by a user to delete a memory they own.
     */
    function deleteMemory(bytes32 memoryId) external onlyMemoryOwner(memoryId) memoryExists(memoryId) {
        address owner = memories[memoryId].owner;
        
        // Delete the memory record
        delete memories[memoryId];
        
        // Emit event for audit trail
        emit MemoryDeleted(owner, memoryId);
    }
    
    /**
     * @dev Grant access to another user's wallet
     * @param grantee The wallet address to grant access to
     * 
     * This function allows a user to grant access to another user's wallet.
     */
    function grantAccessToUser(address grantee) external {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        require(grantee != msg.sender, "MemoryControl: Cannot grant access to yourself");
        
        accessList[msg.sender][grantee] = true;
        emit AccessGranted(msg.sender, grantee, "");
    }
    
    /**
     * @dev Grant access to an application domain
     * @param domainName The domain name to grant access to (e.g., "claude.ai")
     * 
     * This function allows a user to grant access to an application like "claude.ai".
     */
    function grantAccessToDomain(string memory domainName) external validDomainName(domainName) {
        // Get the official wallet address for the domain
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        
        accessList[msg.sender][domainAddress] = true;
        emit AccessGranted(msg.sender, domainAddress, domainName);
    }
    
    /**
     * @dev Revoke access from another user's wallet
     * @param grantee The wallet address to revoke access from
     * 
     * This function allows users to revoke permissions at any time.
     */
    function revokeAccessFromUser(address grantee) external {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        
        accessList[msg.sender][grantee] = false;
        emit AccessRevoked(msg.sender, grantee, "");
    }
    
    /**
     * @dev Revoke access from an application domain
     * @param domainName The domain name to revoke access from
     * 
     * This function allows users to revoke permissions from applications at any time.
     */
    function revokeAccessFromDomain(string memory domainName) external validDomainName(domainName) {
        // Get the official wallet address for the domain
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        
        accessList[msg.sender][domainAddress] = false;
        emit AccessRevoked(msg.sender, domainAddress, domainName);
    }
    
    /**
     * @dev Check if a grantee has access to a memory
     * @param memoryId The unique memory ID to check access for
     * @param grantee The wallet address to check access for
     * @return True if the grantee has access, false otherwise
     */
    function hasAccess(bytes32 memoryId, address grantee) external view memoryExists(memoryId) returns (bool) {
        Memory memory memoryData = memories[memoryId];
        
        // Owner always has access
        if (grantee == memoryData.owner) {
            return true;
        }
        
        // Check if grantee has been granted access
        return accessList[memoryData.owner][grantee];
    }
    
    /**
     * @dev Get memory information
     * @param memoryId The unique memory ID to retrieve
     * @return The Memory struct containing all on-chain data
     */
    function getMemory(bytes32 memoryId) external view memoryExists(memoryId) returns (Memory memory) {
        return memories[memoryId];
    }
    
    /**
     * @dev Check if a memory exists
     * @param memoryId The unique memory ID to check
     * @return True if the memory exists, false otherwise
     */
    function isMemoryExists(bytes32 memoryId) external view returns (bool) {
        return memories[memoryId].owner != address(0);
    }
}
