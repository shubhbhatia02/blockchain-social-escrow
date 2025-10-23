require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.25",
  networks: {
    hardhat: {},
    base_sepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: process.env.VERIFIER_PRIVATE_KEY
        ? [process.env.VERIFIER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    // For Base Sepolia, you need to add the custom network to Hardhat.
    // The API key is not required for block explorers on testnets.
    apiKey: {
      baseSepolia: "PLACEHOLDER_API_KEY",
    },
  },
};