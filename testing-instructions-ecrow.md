# Testing Guide for Social Escrow MVP

This document provides a step-by-step guide for testing the smart contracts and the overall functionality of the social escrow MVP.

## 1. Prerequisites

Before you begin, ensure you have the following:

- **Node.js & npm:** [Install Node.js](https://nodejs.org/) (which includes npm).
- **Hardhat Project:** Your current project directory, set up with Hardhat.
- **Test Wallet:** A browser wallet like MetaMask configured for a testnet (e.g., Sepolia).
- **Testnet ETH:** Get some free testnet ETH for your wallet from a public faucet (e.g., [sepoliafaucet.com](https://sepoliafaucet.com/)).
- **X (Twitter) API Keys:** You will need developer API keys to build and test the off-chain verifier.

## 2. Part 1: Smart Contract Unit Testing

Unit tests are essential for verifying that each function of your smart contracts behaves correctly in isolation. We will use Hardhat's built-in testing environment, which simulates the Ethereum blockchain.

Create a new test file: `test/Escrow.test.js`.

### Key Scenarios to Test for `EscrowFactory.sol`

- **Successful Creation:** It should deploy a new `Escrow` contract and emit a `DealCreated` event with the correct data.
- **Payment Validation:** It should revert if a founder tries to create an escrow with `0` value.
- **Address Validation:** It should revert if the `kol` or `verifier` address is the zero address.

### Key Scenarios to Test for `Escrow.sol`

- **Deployment:** The constructor should correctly set all immutable variables (`founder`, `kol`, `amount`, `verifier`, etc.).
- **`release()` function:**
  - Should succeed when called by the `verifier` *after* the `VERIFICATION_DELAY`.
  - Should revert if called *before* the `VERIFICATION_DELAY` has passed.
  - Should revert if called by any address other than the `verifier`.
  - Should revert if the escrow status is not `Active`.
- **`refund()` function:**
  - Should succeed when called by the `verifier` *after* the `VERIFICATION_DELAY`.
  - Should revert if called *before* the `VERIFICATION_DELAY` has passed.
  - Should revert if called by any address other than the `verifier`.
- **`withdraw()` function:**
  - The `kol` should be able to withdraw the full `amount` after the status is set to `Released`.
  - The `founder` should be able to withdraw the full `amount` after the status is set to `Refunded`.
  - Should revert if an unauthorized user (not the `kol` or `founder`) tries to withdraw.
  - Should prevent a second withdrawal by the same user (tests the re-entrancy protection and status change).

### Example Test Case (using Hardhat, ethers.js, and Chai)

Here is a sample test you can add to `test/Escrow.test.js` to get started.

```javascript
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Escrow Contract", function () {
    let Escrow, escrow, EscrowFactory, factory;
    let founder, kol, verifier, randomUser;
    const depositAmount = ethers.parseEther("1"); // 1 ETH

    beforeEach(async function () {
        [founder, kol, verifier, randomUser] = await ethers.getSigners();

        // Deploy the factory
        EscrowFactory = await ethers.getContractFactory("EscrowFactory");
        factory = await EscrowFactory.deploy();

        // Create a new Escrow contract through the factory
        const tx = await factory.connect(founder).createEscrow(
            kol.address,
            "testKOL",
            verifier.address,
            { value: depositAmount }
        );
        const receipt = await tx.wait();
        const escrowAddress = receipt.logs[0].args[0];

        // Attach to the newly created Escrow instance
        Escrow = await ethers.getContractFactory("Escrow");
        escrow = Escrow.attach(escrowAddress);
    });

    it("should allow the verifier to release funds after the delay", async function () {
        // Fast-forward time by 2 hours + 1 second
        const twoHours = 2 * 60 * 60;
        await network.provider.send("evm_increaseTime", [twoHours + 1]);
        await network.provider.send("evm_mine");

        // Verifier calls release
        await expect(escrow.connect(verifier).release())
            .to.emit(escrow, "Released")
            .withArgs(kol.address, depositAmount);

        // Check status
        expect(await escrow.status()).to.equal(1); // 1 is Status.Released
    });

    it("should prevent the verifier from releasing funds before the delay", async function () {
        // Attempt to release immediately
        await expect(
            escrow.connect(verifier).release()
        ).to.be.revertedWith("Escrow: Verification delay not over");
    });

    it("should allow the KOL to withdraw after funds are released", async function () {
        // Fast-forward time and release funds
        const twoHours = 2 * 60 * 60;
        await network.provider.send("evm_increaseTime", [twoHours]);
        await network.provider.send("evm_mine");
        await escrow.connect(verifier).release();

        // KOL withdraws
        const initialBalance = await ethers.provider.getBalance(kol.address);
        const tx = await escrow.connect(kol).withdraw();
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        const finalBalance = await ethers.provider.getBalance(kol.address);

        // Check that the KOL's balance increased by the deposit amount (minus gas)
        expect(finalBalance).to.equal(initialBalance + depositAmount - gasUsed);
    });
});
```

**To run the tests, execute:**
```bash
npx hardhat test
```

## 3. Part 2: Testnet Deployment and Manual E2E Testing

After unit tests pass, the next step is to deploy to a public testnet (like Sepolia) and test the full flow manually.

1.  **Configure Hardhat:** Update your `hardhat.config.js` with your testnet RPC URL and the private key of your test wallet.
2.  **Deploy:** Write a Hardhat script in the `scripts/` directory to deploy your `EscrowFactory.sol` contract.
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
3.  **Build a Basic Verifier:** Create a simple Node.js script that acts as your verifier. This script will:
   -   Listen for `DealCreated` events from your deployed factory.
   -   Wait for 2 hours.
   -   Manually check if the KOL has posted on X (Twitter).
   -   Call `release()` or `refund()` on the corresponding escrow contract using its address from the event.
4.  **Build a Basic Frontend:** Use a simple HTML/JS page with `ethers.js` to create a dApp that can:
   -   Connect to MetaMask.
   -   Call `createEscrow` on the factory contract.
   -   Call `withdraw` on an escrow contract.
5.  **Execute the Full Flow:**
   -   Use your frontend to create a new deal as a "founder".
   -   Wait for your verifier script to detect the event.
   -   Have the "KOL" make the required post.
   -   After 2 hours, confirm your verifier script calls `release()`.
   -   Use your frontend as the "KOL" to `withdraw()` the funds.

This end-to-end test is the ultimate confirmation that all components of your MVP are working together correctly.
