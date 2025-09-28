/* 
 * SMART CONTRACT INTEGRATION CODE
 * This file contains the smart contract integration for lease management.
 * Currently commented out - will be activated when smart contract integration is needed.
 */

/*
import { getContract, writeContract, readContract } from '@wagmi/core';
import { parseEther, formatEther } from 'viem';
import { wagmiConfig } from '../app/providers';

// Contract addresses (update these with actual deployed contract addresses)
const MEMORY_CONTROL_ADDRESS = '0x...' as const;
const DOMAIN_REGISTRY_ADDRESS = '0x...' as const;

// ABIs (update these with actual contract ABIs)
const MEMORY_CONTROL_ABI = [
  {
    inputs: [
      { name: 'domain', type: 'string' },
      { name: 'duration', type: 'uint256' }
    ],
    name: 'grantTimeBasedDomainAccess',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'domain', type: 'string' },
      { name: 'source', type: 'string' },
      { name: 'duration', type: 'uint256' }
    ],
    name: 'grantTimeBasedDomainAccessToSource',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'domain', type: 'string' }],
    name: 'revokeDomainAccess',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'domain', type: 'string' },
      { name: 'source', type: 'string' }
    ],
    name: 'revokeDomainAccessFromSource',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'domain', type: 'string' }],
    name: 'checkDomainAccess',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'domain', type: 'string' },
      { name: 'source', type: 'string' }
    ],
    name: 'checkDomainAccessToSource',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export interface LeaseCreationParams {
  entity: string;
  accessSpecifier: string;
  durationDays: number;
}

export interface LeaseRevocationParams {
  leaseId: string;
  entity: string;
  accessSpecifier: string;
}

class ContractService {
  private mapEntityToDomain(entity: string): string {
    const domainMap: { [key: string]: string } = {
      'claude': 'claude.ai',
      'chatgpt': 'chatgpt.com',
      'openai': 'openai.com',
      'anthropic': 'anthropic.com'
    };
    
    return domainMap[entity.toLowerCase()] || entity;
  }

  private calculateDurationInSeconds(durationDays: number): bigint {
    return BigInt(durationDays * 24 * 60 * 60);
  }

  async createLease(params: LeaseCreationParams): Promise<string> {
    try {
      const { entity, accessSpecifier, durationDays } = params;
      const domain = this.mapEntityToDomain(entity);
      const durationInSeconds = this.calculateDurationInSeconds(durationDays);

      let txHash: string;

      if (accessSpecifier === 'global') {
        // Global access: grant access to all memories
        txHash = await writeContract(wagmiConfig, {
          address: MEMORY_CONTROL_ADDRESS,
          abi: MEMORY_CONTROL_ABI,
          functionName: 'grantTimeBasedDomainAccess',
          args: [domain, durationInSeconds]
        });
        console.log(`🌐 Global lease granted: ${domain} → all memories`);
      } else {
        // Source-specific access: grant access only to memories from specific source
        txHash = await writeContract(wagmiConfig, {
          address: MEMORY_CONTROL_ADDRESS,
          abi: MEMORY_CONTROL_ABI,
          functionName: 'grantTimeBasedDomainAccessToSource',
          args: [domain, accessSpecifier, durationInSeconds]
        });
        console.log(`🎯 Source-specific lease granted: ${domain} → ${accessSpecifier} memories`);
      }

      return txHash;
    } catch (error) {
      console.error('Smart contract lease creation failed:', error);
      throw error;
    }
  }

  async revokeLease(params: LeaseRevocationParams): Promise<string> {
    try {
      const { entity, accessSpecifier } = params;
      const domain = this.mapEntityToDomain(entity);

      let txHash: string;

      if (accessSpecifier === 'global') {
        // Revoke global access
        txHash = await writeContract(wagmiConfig, {
          address: MEMORY_CONTROL_ADDRESS,
          abi: MEMORY_CONTROL_ABI,
          functionName: 'revokeDomainAccess',
          args: [domain]
        });
        console.log(`🌐 Global lease revoked: ${domain}`);
      } else {
        // Revoke source-specific access
        txHash = await writeContract(wagmiConfig, {
          address: MEMORY_CONTROL_ADDRESS,
          abi: MEMORY_CONTROL_ABI,
          functionName: 'revokeDomainAccessFromSource',
          args: [domain, accessSpecifier]
        });
        console.log(`🎯 Source-specific lease revoked: ${domain} ✗ ${accessSpecifier}`);
      }

      return txHash;
    } catch (error) {
      console.error('Smart contract lease revocation failed:', error);
      throw error;
    }
  }

  async checkLeaseAccess(entity: string, accessSpecifier?: string): Promise<boolean> {
    try {
      const domain = this.mapEntityToDomain(entity);

      if (accessSpecifier && accessSpecifier !== 'global') {
        // Check source-specific access
        return await readContract(wagmiConfig, {
          address: MEMORY_CONTROL_ADDRESS,
          abi: MEMORY_CONTROL_ABI,
          functionName: 'checkDomainAccessToSource',
          args: [domain, accessSpecifier]
        }) as boolean;
      } else {
        // Check global access
        return await readContract(wagmiConfig, {
          address: MEMORY_CONTROL_ADDRESS,
          abi: MEMORY_CONTROL_ABI,
          functionName: 'checkDomainAccess',
          args: [domain]
        }) as boolean;
      }
    } catch (error) {
      console.error('Smart contract lease check failed:', error);
      return false;
    }
  }

  async getLeaseEvents(): Promise<any[]> {
    // TODO: Implement event filtering to get lease creation/revocation events
    // This would involve listening to contract events and parsing them
    return [];
  }
}

export const contractService = new ContractService();
export default contractService;
*/

// Placeholder exports for when the code is commented
export interface LeaseCreationParams {
  entity: string;
  accessSpecifier: string;
  durationDays: number;
}

export interface LeaseRevocationParams {
  leaseId: string;
  entity: string;
  accessSpecifier: string;
}

// Placeholder service
export const contractService = {
  createLease: async (params: LeaseCreationParams): Promise<string> => {
    throw new Error('Smart contract integration not yet enabled');
  },
  revokeLease: async (params: LeaseRevocationParams): Promise<string> => {
    throw new Error('Smart contract integration not yet enabled');
  },
  checkLeaseAccess: async (entity: string, accessSpecifier?: string): Promise<boolean> => {
    throw new Error('Smart contract integration not yet enabled');
  }
};

export default contractService;