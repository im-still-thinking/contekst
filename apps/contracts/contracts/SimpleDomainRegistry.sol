// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SimpleDomainRegistry
 * @dev Hedera-compatible domain registry for storing domain-to-address mappings
 * Focus: Simple domain registration without complex features
 */
contract SimpleDomainRegistry {
    // Admin who can register domains
    address public immutable admin;
    
    // Domain name => official address mapping
    mapping(string => address) public domains;
    
    // Events for audit trail
    event DomainRegistered(string indexed domainName, address indexed officialAddress);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "SimpleDomainRegistry: Only admin");
        _;
    }
    
    modifier validDomain(string memory domainName) {
        require(bytes(domainName).length > 0, "SimpleDomainRegistry: Empty domain");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Register a domain with its official address
     * @param domainName The domain name (e.g., "chatgpt.com")
     * @param officialAddress The official wallet address for this domain
     */
    function registerDomain(
        string memory domainName, 
        address officialAddress
    ) external onlyAdmin validDomain(domainName) {
        require(officialAddress != address(0), "SimpleDomainRegistry: Zero address");
        require(domains[domainName] == address(0), "SimpleDomainRegistry: Domain exists");
        
        domains[domainName] = officialAddress;
        emit DomainRegistered(domainName, officialAddress);
    }
    
    /**
     * @dev Get the official address for a domain
     * @param domainName The domain name to look up
     * @return The official address for the domain
     */
    function getDomainAddress(string memory domainName) external view returns (address) {
        address domainAddress = domains[domainName];
        require(domainAddress != address(0), "SimpleDomainRegistry: Domain not registered");
        return domainAddress;
    }
    
    /**
     * @dev Check if a domain is registered
     * @param domainName The domain name to check
     * @return True if registered, false otherwise
     */
    function isDomainRegistered(string memory domainName) external view returns (bool) {
        return domains[domainName] != address(0);
    }
}
