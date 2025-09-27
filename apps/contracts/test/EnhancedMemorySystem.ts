import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Enhanced Memory System", function () {
  let domainRegistry: any;
  let memoryControl: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let user4: any;

  beforeEach(async function () {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();

    // Deploy DomainRegistry first
    domainRegistry = await ethers.deployContract("DomainRegistry");

    // Deploy MemoryControl with DomainRegistry address
    memoryControl = await ethers.deployContract("MemoryControl", [await domainRegistry.getAddress()]);

    // Register domains for testing with different addresses
    await domainRegistry.registerDomain("chatgpt.com", user1.address);
    await domainRegistry.registerDomain("claude.ai", user2.address);
    await domainRegistry.registerDomain("perplexity.ai", user3.address);
  });

  describe("Time-based Access Control", function () {
    it("Should grant time-based access to user", async function () {
      const duration = 3600; // 1 hour
      
      const tx = await memoryControl.connect(owner).grantTimeBasedAccessToUser(user1.address, duration);
      await expect(tx).to.emit(memoryControl, "TimeBasedAccessGranted");
    });

    it("Should grant time-based access to domain", async function () {
      const duration = 7200; // 2 hours
      
      const tx = await memoryControl.connect(owner).grantTimeBasedAccessToDomain("chatgpt.com", duration);
      await expect(tx).to.emit(memoryControl, "TimeBasedAccessGranted");
    });

    it("Should check if access has expired", async function () {
      const duration = 1; // 1 second
      
      await memoryControl.connect(owner).grantTimeBasedAccessToUser(user1.address, duration);
      
      // Check immediately - should not be expired
      expect(await memoryControl.connect(owner).hasAccessExpired(user1.address)).to.be.false;
      
      // Mine a block to advance time (simulate time passing)
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      // Check after expiration - should be expired
      expect(await memoryControl.connect(owner).hasAccessExpired(user1.address)).to.be.true;
    });
  });

  describe("Memory-specific Access Control", function () {
    let memoryId: string;

    beforeEach(async function () {
      // Create a memory first
      memoryId = ethers.keccak256(ethers.toUtf8Bytes("test memory"));
      await memoryControl.connect(owner).addMemory(memoryId, "chatgpt.com");
    });

    it("Should grant access to specific memory", async function () {
      await expect(
        memoryControl.connect(owner).grantAccessToMemory(user1.address, memoryId)
      ).to.emit(memoryControl, "MemoryAccessGranted")
        .withArgs(owner.address, user1.address, memoryId, "");
    });

    it("Should grant domain access to specific memory", async function () {
      await expect(
        memoryControl.connect(owner).grantDomainAccessToMemory("claude.ai", memoryId)
      ).to.emit(memoryControl, "MemoryAccessGranted")
        .withArgs(owner.address, user2.address, memoryId, "claude.ai");
    });

    it("Should grant time-based access to specific memory", async function () {
      const duration = 1800; // 30 minutes
      
      const tx = await memoryControl.connect(owner).grantTimeBasedAccessToMemory(user1.address, memoryId, duration);
      await expect(tx).to.emit(memoryControl, "TimeBasedMemoryAccessGranted");
    });

    it("Should check enhanced access correctly", async function () {
      // Grant access to specific memory
      await memoryControl.connect(owner).grantAccessToMemory(user1.address, memoryId);
      
      // Check access - should be true
      expect(await memoryControl.hasEnhancedAccess(memoryId, user1.address)).to.be.true;
      
      // Check access for user without access - should be false
      expect(await memoryControl.hasEnhancedAccess(memoryId, user2.address)).to.be.false;
    });
  });

  describe("Domain-based Access Control", function () {
    let memoryId1: string;
    let memoryId2: string;

    beforeEach(async function () {
      // Create memories from different domains
      memoryId1 = ethers.keccak256(ethers.toUtf8Bytes("claude memory"));
      memoryId2 = ethers.keccak256(ethers.toUtf8Bytes("chatgpt memory"));
      
      await memoryControl.connect(owner).addMemory(memoryId1, "claude.ai");
      await memoryControl.connect(owner).addMemory(memoryId2, "chatgpt.com");
    });

    it("Should grant access to all memories from a specific domain", async function () {
      await expect(
        memoryControl.connect(owner).grantAccessToDomainMemories(user1.address, "claude.ai")
      ).to.emit(memoryControl, "DomainAccessGranted")
        .withArgs(owner.address, user1.address, "claude.ai", "");
    });

    it("Should grant domain access to domain memories", async function () {
      await expect(
        memoryControl.connect(owner).grantDomainAccessToDomainMemories("perplexity.ai", "claude.ai")
      ).to.emit(memoryControl, "DomainAccessGranted")
        .withArgs(owner.address, user3.address, "claude.ai", "perplexity.ai");
    });

    it("Should grant time-based access to domain memories", async function () {
      const duration = 3600; // 1 hour
      
      const tx = await memoryControl.connect(owner).grantTimeBasedAccessToDomainMemories(user1.address, "claude.ai", duration);
      await expect(tx).to.emit(memoryControl, "TimeBasedDomainAccessGranted");
    });

    it("Should check domain-based access correctly", async function () {
      // Grant access to all claude.ai memories for user4 (who has no general access)
      await memoryControl.connect(owner).grantAccessToDomainMemories(user4.address, "claude.ai");
      
      // Check access to claude memory - should be true
      expect(await memoryControl.hasEnhancedAccess(memoryId1, user4.address)).to.be.true;
      
      // Check access to chatgpt memory - should be false
      expect(await memoryControl.hasEnhancedAccess(memoryId2, user4.address)).to.be.false;
    });
  });

  describe("Access Revocation", function () {
    let memoryId: string;

    beforeEach(async function () {
      memoryId = ethers.keccak256(ethers.toUtf8Bytes("test memory"));
      await memoryControl.connect(owner).addMemory(memoryId, "chatgpt.com");
    });

    it("Should revoke time-based access", async function () {
      await memoryControl.connect(owner).grantTimeBasedAccessToUser(user1.address, 3600);
      
      await expect(
        memoryControl.connect(owner).revokeTimeBasedAccessFromUser(user1.address)
      ).to.emit(memoryControl, "TimeBasedAccessRevoked")
        .withArgs(owner.address, user1.address, "");
    });

    it("Should revoke memory-specific access", async function () {
      await memoryControl.connect(owner).grantAccessToMemory(user1.address, memoryId);
      
      await expect(
        memoryControl.connect(owner).revokeAccessFromMemory(user1.address, memoryId)
      ).to.emit(memoryControl, "MemoryAccessRevoked")
        .withArgs(owner.address, user1.address, memoryId, "");
    });

    it("Should revoke domain-based access", async function () {
      await memoryControl.connect(owner).grantAccessToDomainMemories(user1.address, "chatgpt.com");
      
      await expect(
        memoryControl.connect(owner).revokeAccessFromDomainMemories(user1.address, "chatgpt.com")
      ).to.emit(memoryControl, "DomainAccessRevoked")
        .withArgs(owner.address, user1.address, "chatgpt.com", "");
    });
  });

  describe("Complex Access Scenarios", function () {
    let claudeMemoryId: string;
    let chatgptMemoryId: string;

    beforeEach(async function () {
      claudeMemoryId = ethers.keccak256(ethers.toUtf8Bytes("claude memory"));
      chatgptMemoryId = ethers.keccak256(ethers.toUtf8Bytes("chatgpt memory"));
      
      await memoryControl.connect(owner).addMemory(claudeMemoryId, "claude.ai");
      await memoryControl.connect(owner).addMemory(chatgptMemoryId, "chatgpt.com");
    });

    it("Should handle multiple access types correctly", async function () {
      // Test different access types with users who don't have automatic access
      
      // Grant general access to user4 - should have access to all memories
      await memoryControl.connect(owner).grantAccessToUser(user4.address);
      expect(await memoryControl.hasEnhancedAccess(claudeMemoryId, user4.address)).to.be.true; // General access
      expect(await memoryControl.hasEnhancedAccess(chatgptMemoryId, user4.address)).to.be.true; // General access
      
      // Grant specific memory access to user3 for claude memory only
      await memoryControl.connect(owner).grantAccessToMemory(user3.address, claudeMemoryId);
      expect(await memoryControl.hasEnhancedAccess(claudeMemoryId, user3.address)).to.be.true; // Specific memory access
      expect(await memoryControl.hasEnhancedAccess(chatgptMemoryId, user3.address)).to.be.false; // No access
      
      // Check access for official domain addresses
      // user1 (chatgpt.com official) should have access to both memories due to general access
      // user2 (claude.ai official) should have access to both memories due to general access
      expect(await memoryControl.hasEnhancedAccess(claudeMemoryId, user1.address)).to.be.true; // General access (as official address)
      expect(await memoryControl.hasEnhancedAccess(chatgptMemoryId, user1.address)).to.be.true; // General access (as official address)
      expect(await memoryControl.hasEnhancedAccess(claudeMemoryId, user2.address)).to.be.true; // General access (as official address)
      expect(await memoryControl.hasEnhancedAccess(chatgptMemoryId, user2.address)).to.be.true; // General access (as official address)
    });

    it("Should handle time-based expiration correctly", async function () {
      // Grant time-based access (1 second) to user4 (who has no general access)
      await memoryControl.connect(owner).grantTimeBasedAccessToUser(user4.address, 1);
      
      // Should have access initially
      expect(await memoryControl.hasEnhancedAccess(claudeMemoryId, user4.address)).to.be.true;
      
      // Mine a block to advance time (simulate time passing)
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      // Should not have access after expiration
      expect(await memoryControl.hasEnhancedAccess(claudeMemoryId, user4.address)).to.be.false;
    });
  });
});
