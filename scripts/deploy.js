const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EscrowFactory contract...");
  const factory = await ethers.deployContract("EscrowFactory");

  await factory.waitForDeployment();

  console.log(`EscrowFactory deployed to: ${factory.target}`);

  // --- Save contract info for frontend and verifier ---
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ EscrowFactory: factory.target }, undefined, 2)
  );

  const factoryArtifact = artifacts.readArtifactSync("EscrowFactory");
  fs.writeFileSync(path.join(contractsDir, "EscrowFactory.json"), JSON.stringify(factoryArtifact, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});