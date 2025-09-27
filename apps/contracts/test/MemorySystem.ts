import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Memory System", function () {
  let domainRegistry: DomainRegistry;
  let memoryControl: MemoryControl;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy DomainRegistry first
    domainRegistry = await ethers.deployContract("DomainRegistry");

    // Deploy MemoryControl with DomainRegistry address
    memoryControl = await ethers.deployContract("MemoryControl", [await domainRegistry.getAddress()]);
  });

  describe("DomainRegistry", function () {
    it("Should register a domain", async function () {
      const domainName = "chatgpt.com";
      const officialAddress = user1.address;

      await domainRegistry.registerDomain(domainName, officialAddress);
      
      const registeredAddress = await domainRegistry.getDomainAddress(domainName);
      expect(registeredAddress).to.equal(officialAddress);
    });

    it("Should not allow non-admin to register domain", async function () {
      const domainName = "claude.ai";
      const officialAddress = user2.address;

      await expect(
        domainRegistry.connect(user1).registerDomain(domainName, officialAddress)
      ).to.be.revertedWith("DomainRegistry: Only admin can call this function");
    });

    it("Should check if domain is registered", async function () {
      const domainName = "test.com";
      const officialAddress = user1.address;

      expect(await domainRegistry.isDomainRegistered(domainName)).to.be.false;
      
      await domainRegistry.registerDomain(domainName, officialAddress);
      
      expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
    });
  });

  describe("MemoryControl", function () {
    beforeEach(async function () {
      // Register a domain for testing
      await domainRegistry.registerDomain("chatgpt.com", user1.address);
    });

    it("Should add a memory", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      const sourceDomainName = "chatgpt.com";

      await expect(
        memoryControl.connect(user2).addMemory(metadataHash, sourceDomainName)
      ).to.emit(memoryControl, "MemoryAdded")
        .withArgs(user2.address, metadataHash, sourceDomainName);
    });

    it("Should not add memory with unregistered domain", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      const sourceDomainName = "unregistered.com";

      await expect(
        memoryControl.connect(user2).addMemory(metadataHash, sourceDomainName)
      ).to.be.revertedWith("DomainRegistry: Domain not registered");
    });

    it("Should delete a memory", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      const sourceDomainName = "chatgpt.com";

      await memoryControl.connect(user2).addMemory(metadataHash, sourceDomainName);
      
      await expect(
        memoryControl.connect(user2).deleteMemory(metadataHash)
      ).to.emit(memoryControl, "MemoryDeleted")
        .withArgs(user2.address, metadataHash);
    });

    it("Should not allow non-owner to delete memory", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      const sourceDomainName = "chatgpt.com";

      await memoryControl.connect(user2).addMemory(metadataHash, sourceDomainName);
      
      await expect(
        memoryControl.connect(user1).deleteMemory(metadataHash)
      ).to.be.revertedWith("MemoryControl: Only memory owner can perform this action");
    });

    it("Should grant access to user", async function () {
      await expect(
        memoryControl.connect(user2).grantAccessToUser(user1.address)
      ).to.emit(memoryControl, "AccessGranted")
        .withArgs(user2.address, user1.address, "");
    });

    it("Should grant access to domain", async function () {
      await expect(
        memoryControl.connect(user2).grantAccessToDomain("chatgpt.com")
      ).to.emit(memoryControl, "AccessGranted")
        .withArgs(user2.address, user1.address, "chatgpt.com");
    });

    it("Should check access correctly", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      const sourceDomainName = "chatgpt.com";

      // Add memory
      await memoryControl.connect(user2).addMemory(metadataHash, sourceDomainName);
      
      // Owner should have access
      expect(await memoryControl.hasAccess(metadataHash, user2.address)).to.be.true;
      
      // Source domain should have access (automatically granted)
      expect(await memoryControl.hasAccess(metadataHash, user1.address)).to.be.true;
      
      // Other user should not have access
      expect(await memoryControl.hasAccess(metadataHash, owner.address)).to.be.false;
    });
  });
});
