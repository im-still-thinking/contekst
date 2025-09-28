import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Simple Memory System - Functional Tests", function () {
  let domainRegistry: any;
  let memoryAudit: any;
  let owner: any;
  let domain1: any;
  let domain2: any;

  beforeEach(async function () {
    [owner, domain1, domain2] = await ethers.getSigners();

    // Deploy contracts
    domainRegistry = await ethers.deployContract("SimpleDomainRegistry");
    memoryAudit = await ethers.deployContract("SimpleMemoryAudit", [await domainRegistry.getAddress()]);

    // Register test domains
    await domainRegistry.registerDomain("chatgpt.com", await domain1.getAddress());
    await domainRegistry.registerDomain("claude.ai", await domain2.getAddress());
  });

  describe("Domain Registry", function () {
    it("Should register domains correctly", async function () {
      expect(await domainRegistry.isDomainRegistered("chatgpt.com")).to.be.true;
      expect(await domainRegistry.isDomainRegistered("claude.ai")).to.be.true;
      expect(await domainRegistry.getDomainAddress("chatgpt.com")).to.equal(await domain1.getAddress());
    });

    it("Should reject duplicate domain registration", async function () {
      await expect(
        domainRegistry.registerDomain("chatgpt.com", await domain2.getAddress())
      ).to.be.revertedWith("SimpleDomainRegistry: Domain exists");
    });

    it("Should reject empty domain names", async function () {
      await expect(
        domainRegistry.registerDomain("", await domain1.getAddress())
      ).to.be.revertedWith("SimpleDomainRegistry: Empty domain");
    });
  });

  describe("Memory Audit", function () {
    const testHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    it("Should create memory successfully", async function () {
      await expect(memoryAudit.createMemory(testHash, "chatgpt.com"))
        .to.emit(memoryAudit, "MemoryCreated");

      const memory = await memoryAudit.getMemory(testHash);
      expect(memory.owner).to.equal(await owner.getAddress());
      expect(memory.sourceDomain).to.equal("chatgpt.com");
      expect(memory.metadataHash).to.equal(testHash);
    });

    it("Should auto-grant access to source domain", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      
      // Source domain should have access
      expect(await memoryAudit.hasDomainAccess(testHash, "chatgpt.com")).to.be.true;
    });

    it("Should allow domain access control", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      
      // Grant access to another domain
      await expect(memoryAudit.grantDomainAccess("claude.ai"))
        .to.emit(memoryAudit, "DomainAccessGranted");

      expect(await memoryAudit.hasDomainAccess(testHash, "claude.ai")).to.be.true;
    });

    it("Should allow memory access by authorized domain", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      await memoryAudit.grantDomainAccess("claude.ai");
      
      // Access memory from authorized domain
      await expect(memoryAudit.connect(domain2).accessMemory(testHash, "claude.ai"))
        .to.emit(memoryAudit, "MemoryAccessed");
    });

    it("Should reject access from unauthorized domain", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      
      await expect(
        memoryAudit.connect(domain2).accessMemory(testHash, "claude.ai")
      ).to.be.revertedWith("SimpleMemoryAudit: Domain access denied");
    });

    it("Should allow memory deletion by owner", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      
      await expect(memoryAudit.deleteMemory(testHash))
        .to.emit(memoryAudit, "MemoryDeleted");

      expect(await memoryAudit.isMemoryExists(testHash)).to.be.false;
    });

    it("Should reject memory deletion by non-owner", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      
      await expect(
        memoryAudit.connect(domain1).deleteMemory(testHash)
      ).to.be.revertedWith("SimpleMemoryAudit: Not owner");
    });

    it("Should allow access revocation", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      await memoryAudit.grantDomainAccess("claude.ai");
      
      // Check access from domain2's perspective
      expect(await memoryAudit.connect(domain2).hasDomainAccess(testHash, "claude.ai")).to.be.true;
      
      await memoryAudit.revokeDomainAccess("claude.ai");
      
      // Check access from domain2's perspective after revocation
      expect(await memoryAudit.connect(domain2).hasDomainAccess(testHash, "claude.ai")).to.be.false;
    });

    it("Should reject access to non-existent memory", async function () {
      const nonExistentHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      
      await expect(
        memoryAudit.hasDomainAccess(nonExistentHash, "claude.ai")
      ).to.be.revertedWith("SimpleMemoryAudit: Memory not found");
    });

    it("Should reject access from unregistered domain", async function () {
      await memoryAudit.createMemory(testHash, "chatgpt.com");
      
      await expect(
        memoryAudit.accessMemory(testHash, "unregistered.com")
      ).to.be.revertedWith("SimpleMemoryAudit: Domain not registered");
    });
  });

  async function getCurrentTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock('latest');
    return block!.timestamp;
  }
});
