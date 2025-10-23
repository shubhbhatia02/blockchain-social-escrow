const { ethers, network } = require("hardhat");

// --- ABIs ---
// We will now read these from the frontend's directory to ensure they are in sync
const { EscrowFactory: factoryAddress } = require("../frontend/src/contracts/contract-address.json");
const { abi: factoryABI } = require("../frontend/src/contracts/EscrowFactory.json");
const escrowArtifact = require("../artifacts/contracts/Escrow.sol/Escrow.json");
const escrowABI = escrowArtifact.abi;

const VERIFICATION_DELAY_MS = 5000; // 5 seconds for local testing. In production, this would be 2 * 60 * 60 * 1000 (2 hours)

async function main() {
    console.log("Starting verifier service...");
    // In our test setup, the 3rd signer is designated as the verifier.
    // founder = signers[0], kol = signers[1], verifier = signers[2]
    const signers = await ethers.getSigners();
    const verifierSigner = signers[2]; 
    console.log(`Verifier service running with address: ${verifierSigner.address}`);

    console.log(`Connecting to EscrowFactory at: ${factoryAddress} on ${network.name}`);

    // --- Step 2: Create a Contract Instance and Listen for Events ---
    const factoryContract = new ethers.Contract(factoryAddress, factoryABI, verifierSigner);

    console.log("Listening for DealCreated events...");

    factoryContract.on("DealCreated", (escrowAddress, founder, kol, amount, xHandle, nonce) => {
        handleDeal(escrowAddress, xHandle, nonce, verifierSigner);
    });
}

/**
 * This function is triggered when a new deal is detected.
 * It waits for the verification period, checks a (mock) API, and acts on the contract.
 */
async function handleDeal(escrowAddress, xHandle, nonce, verifierSigner) {
    console.log("\n--- New Deal Detected! ---");
    console.log(`  Escrow Contract: ${escrowAddress}`);
    console.log(`  X Handle:        ${xHandle}`);
    console.log(`  Nonce:           ${nonce}`);
    console.log(`  Waiting ${VERIFICATION_DELAY_MS / 1000} seconds for verification...`);

    setTimeout(async () => {
        console.log(`\nVerifying deal for ${escrowAddress}...`);
        const escrowContract = new ethers.Contract(escrowAddress, escrowABI, verifierSigner);

        // In a real-world scenario, you would call the X API here.
        // For this MVP, we'll mock the response.
        const tweetFound = await checkTwitterAPI(xHandle, nonce);

        try {
            if (tweetFound) {
                console.log(`  ✅ Tweet found for ${xHandle}. Releasing funds...`);
                const tx = await escrowContract.release();
                await tx.wait();
                console.log(`  Funds released successfully! Tx: ${tx.hash}`);
            } else {
                console.log(`  ❌ Tweet not found for ${xHandle}. Refunding founder...`);
                const tx = await escrowContract.refund("Verifier: Tweet not found after delay.");
                await tx.wait();
                console.log(`  Founder refunded successfully! Tx: ${tx.hash}`);
            }
        } catch (error) {
            console.error(`  Error processing escrow ${escrowAddress}:`, error.message);
        }
    }, VERIFICATION_DELAY_MS);
}

/**
 * MOCK FUNCTION: Simulates checking the X (Twitter) API.
 * In a real application, this would use the X API client.
 * @returns {Promise<boolean>} - Randomly returns true or false.
 */
async function checkTwitterAPI(xHandle, nonce) {
    console.log(`  (Mock) Checking X API for a post from @${xHandle} with nonce...`);
    // Randomly return true or false to simulate finding the tweet or not.
    return Math.random() > 0.5;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// To keep the script running and listening, we can add this:
process.on('SIGINT', () => process.exit(0));