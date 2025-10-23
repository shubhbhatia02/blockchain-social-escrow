const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Escrow Contract Lifecycle", function () {
    let Escrow, escrow, EscrowFactory, factory;
    let founder, kol, verifier, randomUser;
    const depositAmount = ethers.parseEther("1"); // 1 ETH

    // This block runs before each test, giving us a fresh contract state
    beforeEach(async function () {
        // Get signers (mock accounts) from Hardhat
        [founder, kol, verifier, randomUser] = await ethers.getSigners();

        // 1. Deploy the EscrowFactory
        EscrowFactory = await ethers.getContractFactory("EscrowFactory");
        factory = await EscrowFactory.deploy();

        // 2. Create a new Escrow contract instance through the factory
        const tx = await factory.connect(founder).createEscrow(
            kol.address,
            "testKOLhandle",
            verifier.address,
            { value: depositAmount }
        );

        // 3. Get the address of the new Escrow contract from the event logs
        const receipt = await tx.wait();
        const escrowAddress = receipt.logs[0].args[0];

        // 4. Attach to the newly created Escrow instance to interact with it
        Escrow = await ethers.getContractFactory("Escrow");
        escrow = Escrow.attach(escrowAddress);
    });

    describe("Release Logic", function () {
        it("should allow the verifier to release funds after the delay", async function () {
            // Fast-forward time by 2 hours (VERIFICATION_DELAY) + 1 second
            const twoHours = 2 * 60 * 60;
            await network.provider.send("evm_increaseTime", [twoHours + 1]);
            await network.provider.send("evm_mine"); // Mine a new block to apply the time change

            // Verifier calls release
            await expect(escrow.connect(verifier).release())
                .to.emit(escrow, "Released")
                .withArgs(kol.address, depositAmount);

            // Verify the status is now Released
            expect(await escrow.status()).to.equal(1); // 1 is Status.Released
        });

        it("should prevent the verifier from releasing funds before the delay", async function () {
            // Attempt to release immediately without fast-forwarding time
            await expect(
                escrow.connect(verifier).release()
            ).to.be.revertedWith("Escrow: Verification delay not over");
        });

        it("should prevent a non-verifier from releasing funds", async function () {
            // Fast-forward time
            const twoHours = 2 * 60 * 60;
            await network.provider.send("evm_increaseTime", [twoHours + 1]);
            await network.provider.send("evm_mine");

            // Attempt to release from a random account
            await expect(
                escrow.connect(randomUser).release()
            ).to.be.revertedWith("Escrow: Caller is not the verifier");
        });
    });

    describe("Withdrawal Logic", function () {
        it("should allow the KOL to withdraw after funds are released", async function () {
            // First, release the funds
            const twoHours = 2 * 60 * 60;
            await network.provider.send("evm_increaseTime", [twoHours]);
            await network.provider.send("evm_mine");
            await escrow.connect(verifier).release();

            // Check KOL's balance before withdrawal
            const initialBalance = await ethers.provider.getBalance(kol.address);

            // KOL withdraws
            const tx = await escrow.connect(kol).withdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            // Check KOL's balance after withdrawal
            const finalBalance = await ethers.provider.getBalance(kol.address);

            // The final balance should be the initial balance + deposit, minus gas fees
            expect(finalBalance).to.equal(initialBalance + depositAmount - gasUsed);

            // Verify the contract balance is now 0
            expect(await ethers.provider.getBalance(escrow.target)).to.equal(0);
        });

        it("should allow the founder to withdraw after funds are refunded", async function () {
            // First, refund the funds
            const twoHours = 2 * 60 * 60;
            await network.provider.send("evm_increaseTime", [twoHours]);
            await network.provider.send("evm_mine");
            await escrow.connect(verifier).refund("Tweet not found");

            // Check founder's balance before withdrawal
            const initialBalance = await ethers.provider.getBalance(founder.address);

            // Founder withdraws
            const tx = await escrow.connect(founder).withdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            // Check founder's balance after withdrawal
            const finalBalance = await ethers.provider.getBalance(founder.address);

            // The final balance should be the initial balance + deposit, minus gas fees
            expect(finalBalance).to.equal(initialBalance + depositAmount - gasUsed);

            // Verify the contract balance is now 0
            expect(await ethers.provider.getBalance(escrow.target)).to.equal(0);
        });

        it("should prevent withdrawal if status is still Active", async function () {
            await expect(escrow.connect(kol).withdraw()).to.be.revertedWith(
                "Escrow: Not in a withdrawable state"
            );
            await expect(escrow.connect(founder).withdraw()).to.be.revertedWith(
                "Escrow: Not in a withdrawable state"
            );
        });
    });

    describe("Refund Logic", function () {
        it("should allow the verifier to refund funds after the delay", async function () {
            // Fast-forward time
            const twoHours = 2 * 60 * 60;
            await network.provider.send("evm_increaseTime", [twoHours + 1]);
            await network.provider.send("evm_mine");

            const reason = "KOL did not post";
            await expect(escrow.connect(verifier).refund(reason))
                .to.emit(escrow, "Refunded")
                .withArgs(founder.address, depositAmount, reason);

            // Verify the status is now Refunded
            expect(await escrow.status()).to.equal(2); // 2 is Status.Refunded
        });

        it("should prevent the verifier from refunding funds before the delay", async function () {
            await expect(
                escrow.connect(verifier).refund("Too early")
            ).to.be.revertedWith("Escrow: Verification delay not over");
        });

        it("should prevent a non-verifier from refunding funds", async function () {
            const twoHours = 2 * 60 * 60;
            await network.provider.send("evm_increaseTime", [twoHours + 1]);
            await network.provider.send("evm_mine");

            await expect(escrow.connect(randomUser).refund("Wrong caller")).to.be.revertedWith(
                "Escrow: Caller is not the verifier"
            );
        });
    });
});