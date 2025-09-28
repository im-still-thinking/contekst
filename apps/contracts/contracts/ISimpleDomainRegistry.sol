// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISimpleDomainRegistry
 * @dev Interface for SimpleDomainRegistry contract
 */
interface ISimpleDomainRegistry {
    /**
     * @dev Get the official address for a domain
     * @param domainName The domain name to look up
     * @return The official address for the domain
     */
    function getDomainAddress(string memory domainName) external view returns (address);
    
    /**
     * @dev Check if a domain is registered
     * @param domainName The domain name to check
     * @return True if registered, false otherwise
     */
    function isDomainRegistered(string memory domainName) external view returns (bool);
}
