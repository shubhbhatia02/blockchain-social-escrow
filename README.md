# 🚀 Blockchain Social Escrow

A decentralized, trustless escrow dApp for collaborations between project founders and Key Opinion Leaders (KOLs). This project ensures that funds are held securely on-chain and released automatically only when the agreed-upon social media engagement is verified.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-ffdb70.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/UI-React-61DAFB.svg)](https://reactjs.org/)

## 🎯 The Problem

Collaborations between founders and KOLs often rely on manual payments and trust. This creates risk for both parties:
-   **Founders** risk paying for social media posts that are deleted or never made.
-   **KOLs** risk not being compensated for their work after a successful post.

Traditional escrow services are centralized, slow, and can be expensive.

## ✅ The Solution

This project uses a system of smart contracts to create a fair, automated, and transparent escrow process on the blockchain.

-   **Trustless Agreements:** A founder locks funds into a unique smart contract for a specific deal.
-   **Automated Verification:** An off-chain verifier service monitors the KOL's social media for the agreed-upon post.
-   **Automatic Payments:** Once the post is verified, the funds are authorized for withdrawal by the KOL. If the post is not made, the funds can be reclaimed by the founder.

## ⚙️ How It Works: High-Level Architecture

The system is composed of three main parts that work together:

1.  **On-Chain Smart Contracts (Solidity)**
    -   `EscrowFactory.sol`: A single factory contract responsible for deploying new, unique escrow deals.
    -   `Escrow.sol`: A unique contract for each deal. It holds the funds and contains the core logic for releasing or refunding them based on calls from the trusted verifier.

2.  **Off-Chain Verifier Service (Node.js)**
    -   This is a backend service that acts as the oracle for the system.
    -   It listens for `DealCreated` events from the `EscrowFactory`.
    -   When a new deal is detected, it waits for a set period and then uses the X (Twitter) API to check if the KOL has made the required post.
    -   Based on the result, it calls either the `release()` or `refund()` function on the corresponding `Escrow` contract.

3.  **Frontend dApp (React)**
    -   A simple web interface that allows users to interact with the system.
    -   Founders can connect their wallets and create new deals.
    -   KOLs and Founders can view the status of their deals and withdraw their funds once they are released or refunded.

## 🛠️ Tech Stack

-   **Blockchain:** Solidity, Hardhat, Ethers.js
-   **Backend:** Node.js
-   **Frontend:** React, Vite
-   **Utilities:** OpenZeppelin Contracts




