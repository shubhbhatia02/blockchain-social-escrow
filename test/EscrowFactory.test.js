const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployEscrowFactoryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [founder, kol, verifier, otherAccount] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
    const escrowFactory = await EscrowFactory.deploy();

    return { escrowFactory, founder, kol, verifier, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy without errors", async function () {
      const { escrowFactory } = await loadFixture(deployEscrowFactoryFixture);
      expect(escrowFactory.target).to.not.be.null;
      expect(escrowFactory.target).to.be.properAddress;
    });
  });

  describe("createEscrow", function () {
    it("Should revert if no ETH is sent", async function () {
      const { escrowFactory, kol, verifier } = await loadFixture(
        deployEscrowFactoryFixture
      );
      await expect(
        escrowFactory.createEscrow(kol.address, "testHandle", verifier.address)
      ).to.be.revertedWith("Factory: Amount must be > 0");
    });

    it("Should revert for an invalid KOL address", async function () {
      const { escrowFactory, verifier } = await loadFixture(
        deployEscrowFactoryFixture
      );
      const amount = ethers.parseEther("1.0");
      await expect(
        escrowFactory.createEscrow(
          ethers.ZeroAddress,
          "testHandle",
          verifier.address,
          { value: amount }
        )
      ).to.be.revertedWith("Factory: Invalid KOL address");
    });

    it("Should revert for an invalid verifier address", async function () {
      const { escrowFactory, kol } = await loadFixture(
        deployEscrowFactoryFixture
      );
      const amount = ethers.parseEther("1.0");
      await expect(
        escrowFactory.createEscrow(kol.address, "testHandle", ethers.ZeroAddress, {
          value: amount,
        })
      ).to.be.revertedWith("Factory: Invalid verifier address");
    });

    it("Should successfully create an Escrow contract and emit an event", async function () {
      const { escrowFactory, founder, kol, verifier } = await loadFixture(
        deployEscrowFactoryFixture
      );
      const amount = ethers.parseEther("1.0");
      const xHandle = "testKOL";

      // We can capture the transaction promise and check both the event and the resulting state
      const createTx = await escrowFactory.createEscrow(
        kol.address,
        xHandle,
        verifier.address,
        { value: amount }
      );
      const receipt = await createTx.wait();
      const newEscrowAddress = receipt.logs[0].args[0];

      // Check that the event was emitted correctly
      await expect(createTx)
        .to.emit(escrowFactory, "DealCreated")
        .withArgs(newEscrowAddress, founder.address, kol.address, amount, xHandle, (nonce) => nonce.length === 66);

      // Additionally, let's verify the created Escrow contract's balance
      expect(await ethers.provider.getBalance(newEscrowAddress)).to.equal(
        amount
      );
    });
  });
});
