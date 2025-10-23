const { ethers } = require("hardhat");

// We need the ABI of the EscrowFactory to interact with it
const factoryArtifact = require("../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json");
const factoryABI = factoryArtifact.abi;

async function main() {
    // --- Step 1: Get the signers ---
    // The first signer will be the "founder", the second will be the "KOL"
    const [founder, kol, verifier] = await ethers.getSigners();

    // --- Step 2: Set the Factory Address ---
    // IMPORTANT: Replace this with the address logged by your `verifier.js` script.
    const FACTORY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    if (!ethers.isAddress(FACTORY_ADDRESS) || FACTORY_ADDRESS.startsWith("PASTE_")) {
        console.error("Error: Please paste the deployed factory address into the script.");
        return;
    }

    console.log(`Attempting to create a deal on factory: ${FACTORY_ADDRESS}`);

    // --- Step 3: Create a Contract Instance and Call `createEscrow` ---
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryABI, founder);

    const xHandle = "gemini_dev";
    const amount = ethers.parseEther("0.01"); // The amount to escrow (e.g., 0.01 ETH)

    console.log(`Creating deal for ${xHandle} with ${ethers.formatEther(amount)} ETH...`);

    const tx = await factoryContract.createEscrow(
        kol.address,
        xHandle,
        verifier.address,
        { value: amount }
    );

    await tx.wait(); // Wait for the transaction to be mined

    console.log("✅ Deal created successfully! Transaction hash:", tx.hash);
    console.log("Check your verifier script's terminal to see if it detected the event.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});