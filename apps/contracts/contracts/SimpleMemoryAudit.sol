// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISimpleDomainRegistry.sol";

/**
 * @title SimpleMemoryAudit
 * @dev Hedera-compatible memory audit contract focused on domain-based access control
 * Features:
 * 1. Store memory metadata hash on-chain
 * 2. Domain-based access control only
 * 3. Complete audit trail of access grants
 * 4. No time limits, no wallet access, no complex features
 */
contract SimpleMemoryAudit {
    // Reference to domain registry
    ISimpleDomainRegistry public immutable domainRegistry;
    
    // Memory structure - minimal data stored on-chain
    struct Memory {
        address owner;              // Memory owner
        bytes32 metadataHash;       // Hash of off-chain metadata
        uint256 createdAt;          // Creation timestamp
        string sourceDomain;        // Domain where memory was created
    }
    
    // Access control: owner => domain => hasAccess
    mapping(address => mapping(string => bool)) public domainAccess;
    
    // Memory storage: memoryId => Memory
    mapping(bytes32 => Memory) public memories;
    
    // Audit events
    event MemoryCreated(
        address indexed owner, 
        bytes32 indexed memoryId, 
        string sourceDomain,
        uint256 timestamp
    );
    
    event MemoryDeleted(
        address indexed owner, 
        bytes32 indexed memoryId,
        uint256 timestamp
    );
    
    event DomainAccessGranted(
        address indexed owner, 
        string indexed domain,
        uint256 timestamp
    );
    
    event DomainAccessRevoked(
        address indexed owner, 
        string indexed domain,
        uint256 timestamp
    );
    
    event MemoryAccessed(
        address indexed owner,
        bytes32 indexed memoryId,
        string indexed accessingDomain,
        uint256 timestamp
    );
    
    modifier onlyMemoryOwner(bytes32 memoryId) {
        require(memories[memoryId].owner == msg.sender, "SimpleMemoryAudit: Not owner");
        _;
    }
    
    modifier memoryExists(bytes32 memoryId) {
        require(memories[memoryId].owner != address(0), "SimpleMemoryAudit: Memory not found");
        _;
    }
    
    modifier validDomain(string memory domainName) {
        require(bytes(domainName).length > 0, "SimpleMemoryAudit: Empty domain");
        require(domainRegistry.isDomainRegistered(domainName), "SimpleMemoryAudit: Domain not registered");
        _;
    }
    
    constructor(address _domainRegistry) {
        require(_domainRegistry != address(0), "SimpleMemoryAudit: Invalid registry");
        domainRegistry = ISimpleDomainRegistry(_domainRegistry);
    }
    
    /**
     * @dev Create a new memory
     * @param metadataHash Hash of the off-chain metadata
     * @param sourceDomain Domain where memory was created
     */
    function createMemory(
        bytes32 metadataHash,
        string memory sourceDomain
    ) external validDomain(sourceDomain) {
        require(metadataHash != bytes32(0), "SimpleMemoryAudit: Invalid hash");
        require(memories[metadataHash].owner == address(0), "SimpleMemoryAudit: Memory exists");
        
        // Create memory
        memories[metadataHash] = Memory({
            owner: msg.sender,
            metadataHash: metadataHash,
            createdAt: block.timestamp,
            sourceDomain: sourceDomain
        });
        
        // Auto-grant access to source domain
        domainAccess[msg.sender][sourceDomain] = true;
        
        emit MemoryCreated(msg.sender, metadataHash, sourceDomain, block.timestamp);
        emit DomainAccessGranted(msg.sender, sourceDomain, block.timestamp);
    }
    
    /**
     * @dev Delete a memory
     * @param memoryId The memory ID to delete
     */
    function deleteMemory(bytes32 memoryId) external onlyMemoryOwner(memoryId) memoryExists(memoryId) {
        address owner = memories[memoryId].owner;
        delete memories[memoryId];
        
        emit MemoryDeleted(owner, memoryId, block.timestamp);
    }
    
    /**
     * @dev Grant access to a domain
     * @param domain Domain to grant access to
     */
    function grantDomainAccess(string memory domain) external validDomain(domain) {
        domainAccess[msg.sender][domain] = true;
        emit DomainAccessGranted(msg.sender, domain, block.timestamp);
    }
    
    /**
     * @dev Revoke access from a domain
     * @param domain Domain to revoke access from
     */
    function revokeDomainAccess(string memory domain) external validDomain(domain) {
        domainAccess[msg.sender][domain] = false;
        emit DomainAccessRevoked(msg.sender, domain, block.timestamp);
    }
    
    /**
     * @dev Access a memory (domain must have access)
     * @param memoryId The memory ID to access
     * @param accessingDomain The domain requesting access
     */
    function accessMemory(bytes32 memoryId, string memory accessingDomain) 
        external 
        memoryExists(memoryId) 
        validDomain(accessingDomain) 
    {
        Memory memory memoryData = memories[memoryId];
        
        // Check if accessing domain has permission
        require(
            domainAccess[memoryData.owner][accessingDomain], 
            "SimpleMemoryAudit: Domain access denied"
        );
        
        emit MemoryAccessed(memoryData.owner, memoryId, accessingDomain, block.timestamp);
    }
    
    /**
     * @dev Check if a domain has access to a memory
     * @param memoryId The memory ID to check
     * @param domain The domain to check access for
     * @return True if domain has access
     */
    function hasDomainAccess(bytes32 memoryId, string memory domain) 
        external 
        view 
        memoryExists(memoryId) 
        returns (bool) 
    {
        Memory memory memoryData = memories[memoryId];
        
        // Owner always has access
        if (msg.sender == memoryData.owner) {
            return true;
        }
        
        // Check domain access
        return domainAccess[memoryData.owner][domain];
    }
    
    /**
     * @dev Get memory information
     * @param memoryId The memory ID to retrieve
     * @return Memory struct with all data
     */
    function getMemory(bytes32 memoryId) external view memoryExists(memoryId) returns (Memory memory) {
        return memories[memoryId];
    }
    
    /**
     * @dev Check if memory exists
     * @param memoryId The memory ID to check
     * @return True if memory exists
     */
    function isMemoryExists(bytes32 memoryId) external view returns (bool) {
        return memories[memoryId].owner != address(0);
    }
    
    /**
     * @dev Get all domains with access to owner's memories
     * @param owner The owner to check
     * @param domain The domain to check
     * @return True if domain has access
     */
    function getDomainAccess(address owner, string memory domain) external view returns (bool) {
        return domainAccess[owner][domain];
    }
}
