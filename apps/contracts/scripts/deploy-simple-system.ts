import hre from "hardhat";

const { ethers } = hre;

async function main() {
  console.log("Deploying Simple Memory System...");

  // Deploy SimpleDomainRegistry
  const SimpleDomainRegistry = await ethers.getContractFactory("SimpleDomainRegistry");
  const domainRegistry = await SimpleDomainRegistry.deploy();
  await domainRegistry.waitForDeployment();
  
  const domainRegistryAddress = await domainRegistry.getAddress();
  console.log("SimpleDomainRegistry deployed to:", domainRegistryAddress);

  // Deploy SimpleMemoryAudit
  const SimpleMemoryAudit = await ethers.getContractFactory("SimpleMemoryAudit");
  const memoryAudit = await SimpleMemoryAudit.deploy(domainRegistryAddress);
  await memoryAudit.waitForDeployment();
  
  const memoryAuditAddress = await memoryAudit.getAddress();
  console.log("SimpleMemoryAudit deployed to:", memoryAuditAddress);

  // Register some example domains
  console.log("\nRegistering example domains...");
  
  // Get the deployer address for example domain registration
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  // Register example domains (using deployer address as official address for demo)
  await domainRegistry.registerDomain("chatgpt.com", deployerAddress);
  console.log("Registered: chatgpt.com ->", deployerAddress);
  
  await domainRegistry.registerDomain("claude.ai", deployerAddress);
  console.log("Registered: claude.ai ->", deployerAddress);
  
  await domainRegistry.registerDomain("example.com", deployerAddress);
  console.log("Registered: example.com ->", deployerAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("SimpleDomainRegistry:", domainRegistryAddress);
  console.log("SimpleMemoryAudit:", memoryAuditAddress);
  console.log("Deployer:", deployerAddress);
  
  console.log("\n=== Example Usage ===");
  console.log("1. Create memory: memoryAudit.createMemory(hash, 'chatgpt.com')");
  console.log("2. Grant domain access: memoryAudit.grantDomainAccess('claude.ai')");
  console.log("3. Access memory: memoryAudit.accessMemory(memoryId, 'claude.ai')");
  console.log("4. Check access: memoryAudit.hasDomainAccess(memoryId, 'claude.ai')");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
