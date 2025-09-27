import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  console.log("Deploying Memory System contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy DomainRegistry first
  console.log("Deploying DomainRegistry...");
  const domainRegistry = await ethers.deployContract("DomainRegistry");
  await domainRegistry.waitForDeployment();
  const domainRegistryAddress = await domainRegistry.getAddress();
  console.log("DomainRegistry deployed to:", domainRegistryAddress);

  // Deploy MemoryControl with DomainRegistry address
  console.log("Deploying MemoryControl...");
  const memoryControl = await ethers.deployContract("MemoryControl", [domainRegistryAddress]);
  await memoryControl.waitForDeployment();
  const memoryControlAddress = await memoryControl.getAddress();
  console.log("MemoryControl deployed to:", memoryControlAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("DomainRegistry:", domainRegistryAddress);
  console.log("MemoryControl:", memoryControlAddress);
  console.log("Deployer:", deployer.address);
  console.log("\nNext steps:");
  console.log("1. Register domains using DomainRegistry.registerDomain()");
  console.log("2. Users can add memories using MemoryControl.addMemory()");
  console.log("3. Manage access permissions using MemoryControl grant/revoke functions");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
