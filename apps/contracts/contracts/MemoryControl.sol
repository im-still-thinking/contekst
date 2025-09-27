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
        string sourceDomainName; // The source domain name (e.g., "chatgpt.com")
    }
    
    // Mapping from a unique memory ID (the metadataHash) to the Memory struct
    mapping(bytes32 => Memory) public memories;
    
    // The unified Access Control List: owner => grantee => hasAccess
    // The grantee can be another user's wallet OR a domain's official wallet
    mapping(address => mapping(address => bool)) public accessList;
    
    // Time-based access control: owner => grantee => expiration timestamp
    mapping(address => mapping(address => uint256)) public accessExpiration;
    
    // Granular access control: owner => grantee => memoryId => hasAccess
    mapping(address => mapping(address => mapping(bytes32 => bool))) public memoryAccessList;
    
    // Time-based granular access: owner => grantee => memoryId => expiration timestamp
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public memoryAccessExpiration;
    
    // Domain-based access control: owner => grantee => sourceDomain => hasAccess
    mapping(address => mapping(address => mapping(string => bool))) public domainAccessList;
    
    // Time-based domain access: owner => grantee => sourceDomain => expiration timestamp
    mapping(address => mapping(address => mapping(string => uint256))) public domainAccessExpiration;
    
    // Events for the immutable audit trail
    event MemoryAdded(address indexed owner, bytes32 indexed memoryId, string sourceDomainName);
    event MemoryDeleted(address indexed owner, bytes32 indexed memoryId);
    event AccessGranted(address indexed owner, address indexed grantee, string granteeDomain);
    event AccessRevoked(address indexed owner, address indexed grantee, string granteeDomain);
    
    // New events for enhanced access control
    event TimeBasedAccessGranted(address indexed owner, address indexed grantee, string granteeDomain, uint256 expirationTime);
    event TimeBasedAccessRevoked(address indexed owner, address indexed grantee, string granteeDomain);
    event MemoryAccessGranted(address indexed owner, address indexed grantee, bytes32 indexed memoryId, string granteeDomain);
    event MemoryAccessRevoked(address indexed owner, address indexed grantee, bytes32 indexed memoryId, string granteeDomain);
    event TimeBasedMemoryAccessGranted(address indexed owner, address indexed grantee, bytes32 indexed memoryId, string granteeDomain, uint256 expirationTime);
    event DomainAccessGranted(address indexed owner, address indexed grantee, string sourceDomain, string granteeDomain);
    event DomainAccessRevoked(address indexed owner, address indexed grantee, string sourceDomain, string granteeDomain);
    event TimeBasedDomainAccessGranted(address indexed owner, address indexed grantee, string sourceDomain, string granteeDomain, uint256 expirationTime);
    
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
            sourceDomain: sourceDomainAddress,
            sourceDomainName: sourceDomainName
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
    
    // ========== ENHANCED ACCESS CONTROL FUNCTIONS ==========
    
    /**
     * @dev Grant time-based access to another user's wallet
     * @param grantee The wallet address to grant access to
     * @param durationInSeconds Duration of access in seconds
     */
    function grantTimeBasedAccessToUser(address grantee, uint256 durationInSeconds) external {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        require(grantee != msg.sender, "MemoryControl: Cannot grant access to yourself");
        require(durationInSeconds > 0, "MemoryControl: Duration must be greater than 0");
        
        uint256 expirationTime = block.timestamp + durationInSeconds;
        accessExpiration[msg.sender][grantee] = expirationTime;
        accessList[msg.sender][grantee] = true;
        
        emit TimeBasedAccessGranted(msg.sender, grantee, "", expirationTime);
    }
    
    /**
     * @dev Grant time-based access to an application domain
     * @param domainName The domain name to grant access to
     * @param durationInSeconds Duration of access in seconds
     */
    function grantTimeBasedAccessToDomain(string memory domainName, uint256 durationInSeconds) external validDomainName(domainName) {
        require(durationInSeconds > 0, "MemoryControl: Duration must be greater than 0");
        
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        uint256 expirationTime = block.timestamp + durationInSeconds;
        
        accessExpiration[msg.sender][domainAddress] = expirationTime;
        accessList[msg.sender][domainAddress] = true;
        
        emit TimeBasedAccessGranted(msg.sender, domainAddress, domainName, expirationTime);
    }
    
    /**
     * @dev Grant access to a specific memory
     * @param grantee The wallet address to grant access to
     * @param memoryId The specific memory ID to grant access to
     */
    function grantAccessToMemory(address grantee, bytes32 memoryId) external memoryExists(memoryId) onlyMemoryOwner(memoryId) {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        require(grantee != msg.sender, "MemoryControl: Cannot grant access to yourself");
        
        memoryAccessList[msg.sender][grantee][memoryId] = true;
        emit MemoryAccessGranted(msg.sender, grantee, memoryId, "");
    }
    
    /**
     * @dev Grant access to a specific memory for a domain
     * @param domainName The domain name to grant access to
     * @param memoryId The specific memory ID to grant access to
     */
    function grantDomainAccessToMemory(string memory domainName, bytes32 memoryId) external memoryExists(memoryId) onlyMemoryOwner(memoryId) validDomainName(domainName) {
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        memoryAccessList[msg.sender][domainAddress][memoryId] = true;
        emit MemoryAccessGranted(msg.sender, domainAddress, memoryId, domainName);
    }
    
    /**
     * @dev Grant time-based access to a specific memory
     * @param grantee The wallet address to grant access to
     * @param memoryId The specific memory ID to grant access to
     * @param durationInSeconds Duration of access in seconds
     */
    function grantTimeBasedAccessToMemory(address grantee, bytes32 memoryId, uint256 durationInSeconds) external memoryExists(memoryId) onlyMemoryOwner(memoryId) {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        require(grantee != msg.sender, "MemoryControl: Cannot grant access to yourself");
        require(durationInSeconds > 0, "MemoryControl: Duration must be greater than 0");
        
        uint256 expirationTime = block.timestamp + durationInSeconds;
        memoryAccessExpiration[msg.sender][grantee][memoryId] = expirationTime;
        memoryAccessList[msg.sender][grantee][memoryId] = true;
        
        emit TimeBasedMemoryAccessGranted(msg.sender, grantee, memoryId, "", expirationTime);
    }
    
    /**
     * @dev Grant time-based access to a specific memory for a domain
     * @param domainName The domain name to grant access to
     * @param memoryId The specific memory ID to grant access to
     * @param durationInSeconds Duration of access in seconds
     */
    function grantTimeBasedDomainAccessToMemory(string memory domainName, bytes32 memoryId, uint256 durationInSeconds) external memoryExists(memoryId) onlyMemoryOwner(memoryId) validDomainName(domainName) {
        require(durationInSeconds > 0, "MemoryControl: Duration must be greater than 0");
        
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        uint256 expirationTime = block.timestamp + durationInSeconds;
        
        memoryAccessExpiration[msg.sender][domainAddress][memoryId] = expirationTime;
        memoryAccessList[msg.sender][domainAddress][memoryId] = true;
        
        emit TimeBasedMemoryAccessGranted(msg.sender, domainAddress, memoryId, domainName, expirationTime);
    }
    
    /**
     * @dev Grant access to all memories from a specific source domain
     * @param grantee The wallet address to grant access to
     * @param sourceDomain The source domain to grant access to (e.g., "claude.ai")
     */
    function grantAccessToDomainMemories(address grantee, string memory sourceDomain) external validDomainName(sourceDomain) {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        require(grantee != msg.sender, "MemoryControl: Cannot grant access to yourself");
        
        domainAccessList[msg.sender][grantee][sourceDomain] = true;
        emit DomainAccessGranted(msg.sender, grantee, sourceDomain, "");
    }
    
    /**
     * @dev Grant access to all memories from a specific source domain for a domain
     * @param granteeDomain The domain name to grant access to
     * @param sourceDomain The source domain to grant access to (e.g., "claude.ai")
     */
    function grantDomainAccessToDomainMemories(string memory granteeDomain, string memory sourceDomain) external validDomainName(granteeDomain) validDomainName(sourceDomain) {
        address domainAddress = domainRegistry.getDomainAddress(granteeDomain);
        domainAccessList[msg.sender][domainAddress][sourceDomain] = true;
        emit DomainAccessGranted(msg.sender, domainAddress, sourceDomain, granteeDomain);
    }
    
    /**
     * @dev Grant time-based access to all memories from a specific source domain
     * @param grantee The wallet address to grant access to
     * @param sourceDomain The source domain to grant access to
     * @param durationInSeconds Duration of access in seconds
     */
    function grantTimeBasedAccessToDomainMemories(address grantee, string memory sourceDomain, uint256 durationInSeconds) external validDomainName(sourceDomain) {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        require(grantee != msg.sender, "MemoryControl: Cannot grant access to yourself");
        require(durationInSeconds > 0, "MemoryControl: Duration must be greater than 0");
        
        uint256 expirationTime = block.timestamp + durationInSeconds;
        domainAccessExpiration[msg.sender][grantee][sourceDomain] = expirationTime;
        domainAccessList[msg.sender][grantee][sourceDomain] = true;
        
        emit TimeBasedDomainAccessGranted(msg.sender, grantee, sourceDomain, "", expirationTime);
    }
    
    /**
     * @dev Grant time-based access to all memories from a specific source domain for a domain
     * @param granteeDomain The domain name to grant access to
     * @param sourceDomain The source domain to grant access to
     * @param durationInSeconds Duration of access in seconds
     */
    function grantTimeBasedDomainAccessToDomainMemories(string memory granteeDomain, string memory sourceDomain, uint256 durationInSeconds) external validDomainName(granteeDomain) validDomainName(sourceDomain) {
        require(durationInSeconds > 0, "MemoryControl: Duration must be greater than 0");
        
        address domainAddress = domainRegistry.getDomainAddress(granteeDomain);
        uint256 expirationTime = block.timestamp + durationInSeconds;
        
        domainAccessExpiration[msg.sender][domainAddress][sourceDomain] = expirationTime;
        domainAccessList[msg.sender][domainAddress][sourceDomain] = true;
        
        emit TimeBasedDomainAccessGranted(msg.sender, domainAddress, sourceDomain, granteeDomain, expirationTime);
    }
    
    // ========== REVOKE FUNCTIONS ==========
    
    /**
     * @dev Revoke time-based access from a user
     * @param grantee The wallet address to revoke access from
     */
    function revokeTimeBasedAccessFromUser(address grantee) external {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        
        accessExpiration[msg.sender][grantee] = 0;
        accessList[msg.sender][grantee] = false;
        emit TimeBasedAccessRevoked(msg.sender, grantee, "");
    }
    
    /**
     * @dev Revoke time-based access from a domain
     * @param domainName The domain name to revoke access from
     */
    function revokeTimeBasedAccessFromDomain(string memory domainName) external validDomainName(domainName) {
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        
        accessExpiration[msg.sender][domainAddress] = 0;
        accessList[msg.sender][domainAddress] = false;
        emit TimeBasedAccessRevoked(msg.sender, domainAddress, domainName);
    }
    
    /**
     * @dev Revoke access to a specific memory
     * @param grantee The wallet address to revoke access from
     * @param memoryId The specific memory ID to revoke access to
     */
    function revokeAccessFromMemory(address grantee, bytes32 memoryId) external {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        
        memoryAccessList[msg.sender][grantee][memoryId] = false;
        memoryAccessExpiration[msg.sender][grantee][memoryId] = 0;
        emit MemoryAccessRevoked(msg.sender, grantee, memoryId, "");
    }
    
    /**
     * @dev Revoke access to a specific memory for a domain
     * @param domainName The domain name to revoke access from
     * @param memoryId The specific memory ID to revoke access to
     */
    function revokeDomainAccessFromMemory(string memory domainName, bytes32 memoryId) external validDomainName(domainName) {
        address domainAddress = domainRegistry.getDomainAddress(domainName);
        
        memoryAccessList[msg.sender][domainAddress][memoryId] = false;
        memoryAccessExpiration[msg.sender][domainAddress][memoryId] = 0;
        emit MemoryAccessRevoked(msg.sender, domainAddress, memoryId, domainName);
    }
    
    /**
     * @dev Revoke access to all memories from a specific source domain
     * @param grantee The wallet address to revoke access from
     * @param sourceDomain The source domain to revoke access to
     */
    function revokeAccessFromDomainMemories(address grantee, string memory sourceDomain) external {
        require(grantee != address(0), "MemoryControl: Grantee address cannot be zero address");
        
        domainAccessList[msg.sender][grantee][sourceDomain] = false;
        domainAccessExpiration[msg.sender][grantee][sourceDomain] = 0;
        emit DomainAccessRevoked(msg.sender, grantee, sourceDomain, "");
    }
    
    /**
     * @dev Revoke access to all memories from a specific source domain for a domain
     * @param granteeDomain The domain name to revoke access from
     * @param sourceDomain The source domain to revoke access to
     */
    function revokeDomainAccessFromDomainMemories(string memory granteeDomain, string memory sourceDomain) external validDomainName(granteeDomain) {
        address domainAddress = domainRegistry.getDomainAddress(granteeDomain);
        
        domainAccessList[msg.sender][domainAddress][sourceDomain] = false;
        domainAccessExpiration[msg.sender][domainAddress][sourceDomain] = 0;
        emit DomainAccessRevoked(msg.sender, domainAddress, sourceDomain, granteeDomain);
    }
    
    // ========== ENHANCED ACCESS CHECKING ==========
    
    /**
     * @dev Check if a grantee has access to a memory with enhanced granular control
     * @param memoryId The unique memory ID to check access for
     * @param grantee The wallet address to check access for
     * @return True if the grantee has access, false otherwise
     */
    function hasEnhancedAccess(bytes32 memoryId, address grantee) external view memoryExists(memoryId) returns (bool) {
        Memory memory memoryData = memories[memoryId];
        
        // Owner always has access
        if (grantee == memoryData.owner) {
            return true;
        }
        
        // Check if access has expired for general access
        if (accessList[memoryData.owner][grantee]) {
            if (accessExpiration[memoryData.owner][grantee] > 0 && block.timestamp > accessExpiration[memoryData.owner][grantee]) {
                return false; // Access has expired
            }
            return true; // General access still valid
        }
        
        // Check specific memory access
        if (memoryAccessList[memoryData.owner][grantee][memoryId]) {
            if (memoryAccessExpiration[memoryData.owner][grantee][memoryId] > 0 && block.timestamp > memoryAccessExpiration[memoryData.owner][grantee][memoryId]) {
                return false; // Memory-specific access has expired
            }
            return true; // Memory-specific access still valid
        }
        
        // Check domain-based access (access to all memories from a specific source domain)
        if (domainAccessList[memoryData.owner][grantee][memoryData.sourceDomainName]) {
            if (domainAccessExpiration[memoryData.owner][grantee][memoryData.sourceDomainName] > 0 && block.timestamp > domainAccessExpiration[memoryData.owner][grantee][memoryData.sourceDomainName]) {
                return false; // Domain-based access has expired
            }
            return true; // Domain-based access still valid
        }
        
        return false; // No access found
    }
    
    /**
     * @dev Get the source domain name for a memory (helper function)
     * @param memoryId The memory ID to check
     * @return The source domain name
     */
    function getMemorySourceDomain(bytes32 memoryId) external view memoryExists(memoryId) returns (string memory) {
        return memories[memoryId].sourceDomainName;
    }
    
    /**
     * @dev Check if access has expired for a grantee
     * @param grantee The wallet address to check
     * @return True if access has expired, false otherwise
     */
    function hasAccessExpired(address grantee) external view returns (bool) {
        if (accessExpiration[msg.sender][grantee] == 0) {
            return false; // No time-based access set
        }
        return block.timestamp > accessExpiration[msg.sender][grantee];
    }
    
    /**
     * @dev Check if memory-specific access has expired for a grantee
     * @param grantee The wallet address to check
     * @param memoryId The memory ID to check
     * @return True if access has expired, false otherwise
     */
    function hasMemoryAccessExpired(address grantee, bytes32 memoryId) external view returns (bool) {
        if (memoryAccessExpiration[msg.sender][grantee][memoryId] == 0) {
            return false; // No time-based access set
        }
        return block.timestamp > memoryAccessExpiration[msg.sender][grantee][memoryId];
    }
}
