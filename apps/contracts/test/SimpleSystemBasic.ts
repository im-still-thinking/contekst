import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Simple Memory System - Basic Test", function () {
  it("Should compile contracts successfully", async function () {
    // This test just verifies the contracts compile
    const SimpleDomainRegistry = await ethers.getContractFactory("SimpleDomainRegistry");
    const SimpleMemoryAudit = await ethers.getContractFactory("SimpleMemoryAudit");
    
    expect(SimpleDomainRegistry).to.not.be.undefined;
    expect(SimpleMemoryAudit).to.not.be.undefined;
  });

  it("Should deploy SimpleDomainRegistry", async function () {
    const domainRegistry = await ethers.deployContract("SimpleDomainRegistry");
    
    const address = await domainRegistry.getAddress();
    expect(address).to.not.be.undefined;
    expect(address).to.not.equal("0x0000000000000000000000000000000000000000");
  });

  it("Should deploy SimpleMemoryAudit with domain registry", async function () {
    // Deploy domain registry first
    const domainRegistry = await ethers.deployContract("SimpleDomainRegistry");
    
    // Deploy memory audit with domain registry address
    const memoryAudit = await ethers.deployContract("SimpleMemoryAudit", [await domainRegistry.getAddress()]);
    
    const address = await memoryAudit.getAddress();
    expect(address).to.not.be.undefined;
    expect(address).to.not.equal("0x0000000000000000000000000000000000000000");
  });
});
