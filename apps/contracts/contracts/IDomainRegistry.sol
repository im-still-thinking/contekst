// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IDomainRegistry
 * @dev Interface for the DomainRegistry contract to enable secure contract-to-contract communication
 */
interface IDomainRegistry {
    /**
     * @dev Returns the official wallet address for a given domain name
     * @param domainName The domain name to look up (e.g., "chatgpt.com")
     * @return The official wallet address associated with the domain
     */
    function getDomainAddress(string memory domainName) external view returns (address);
}
