// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DomainRegistry
 * @dev A foundational contract that acts as a secure, on-chain directory for application domains.
 * This contract solves the challenge of securely identifying application domains like "chatgpt.com" on-chain.
 * A smart contract cannot trust a simple string name; it needs a cryptographic identity.
 * This registry provides that by linking the human-readable domain name to a secure, official Hedera wallet address.
 */
contract DomainRegistry {
    // The protocol administrator who can register new domains
    address public immutable admin;
    
    // A mapping from the domain name string to its official Hedera wallet address.
    // e.g., "chatgpt.com" => 0x123...abc
    mapping(string => address) public domains;
    
    // Events for tracking domain registrations
    event DomainRegistered(string indexed domainName, address indexed officialAddress);
    
    // Modifier to ensure only the admin can call certain functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "DomainRegistry: Only admin can call this function");
        _;
    }
    
    // Modifier to ensure domain name is not empty
    modifier validDomainName(string memory domainName) {
        require(bytes(domainName).length > 0, "DomainRegistry: Domain name cannot be empty");
        _;
    }
    
    /**
     * @dev Constructor sets the admin to the deployer
     */
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Register a new application domain to the registry
     * @param domainName The human-readable domain name (e.g., "chatgpt.com")
     * @param officialAddress The official Hedera wallet address controlled by the application's owner
     * 
     * This is a one-time setup for each participating application (e.g., ChatGPT, Claude) 
     * to establish their official on-chain identity.
     */
    function registerDomain(
        string memory domainName, 
        address officialAddress
    ) external onlyAdmin validDomainName(domainName) {
        require(officialAddress != address(0), "DomainRegistry: Official address cannot be zero address");
        require(domains[domainName] == address(0), "DomainRegistry: Domain already registered");
        
        domains[domainName] = officialAddress;
        emit DomainRegistered(domainName, officialAddress);
    }
    
    /**
     * @dev Get the official wallet address for a given domain name
     * @param domainName The domain name to look up
     * @return The official wallet address associated with the domain
     * 
     * This function allows the MemoryControl contract and any external party 
     * to look up the official wallet address for a given domain name.
     */
    function getDomainAddress(string memory domainName) external view returns (address) {
        address domainAddress = domains[domainName];
        require(domainAddress != address(0), "DomainRegistry: Domain not registered");
        return domainAddress;
    }
    
    /**
     * @dev Check if a domain is registered
     * @param domainName The domain name to check
     * @return True if the domain is registered, false otherwise
     */
    function isDomainRegistered(string memory domainName) external view returns (bool) {
        return domains[domainName] != address(0);
    }
}
