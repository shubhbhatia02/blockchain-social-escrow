const hre = require("hardhat");

async function main() {
  const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
  const escrowFactory = await EscrowFactory.deploy();

  await escrowFactory.waitForDeployment();

  console.log(`EscrowFactory deployed to: ${escrowFactory.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});