# MVP Specification: Blockchain Social Escrow

This document outlines the specific requirements for the Minimum Viable Product (MVP). The goal is a tiny, auditable, and production-ready escrow dApp on Base (EVM) with an off-chain verifier.

## 1. Core Goal

Create a simple, no-dispute escrow for Founder↔KOL promotional tweets.

- **Funding:** A Founder funds a deal with ETH.
- **Task:** A KOL must post a tweet containing a unique `nonce` and the `escrow address`.
- **Verification:** An off-chain service verifies the tweet is posted before a deadline and remains live for a holding period.
- **Payout:** If the conditions are met, the KOL is paid.
- **Refund:** If the tweet is not posted by the deadline, or is deleted during the holding period, the Founder is refunded.

## 2. Smart Contracts (Solidity)

- **Compiler:** `^0.8.25`
- **Chain:** Base (or any EVM-compatible chain).
- **Contracts:** `EscrowFactory.sol`, `Escrow.sol`.

### `EscrowFactory.sol` API

- **Event:** `DealCreated(address indexed escrow, address indexed founder, address indexed kol, uint256 amount, string xHandle, bytes32 nonce)`
- **Function:** `createEscrow(address kol, string calldata xHandle, address verifier) external payable returns (address escrow)`
  - The `nonce` will be generated on-chain (e.g., `keccak256` of factory address, founder, KOL, and block data).

### `Escrow.sol` API

- **Timing Policy (Fixed):**
  - `POST_BY_DEADLINE`: `createdAt + 24 hours`
  - `HOLD_FOR`: `24 hours`

- **Events:**
  - `Started(bytes32 tweetId, uint64 startAt)`
  - `Released(address to, uint256 amount)`
  - `Refunded(address to, uint256 amount, string reason)`

- **View Function:**
  - `info() external view returns (address founder, address kol, uint256 amount, string memory xHandle, bytes32 nonce, address verifier, uint64 createdAt, uint64 startAt, uint64 postByDeadline, uint64 holdFor)`

- **State-Changing Functions:**
  - `markStart(bytes32 tweetId) external`: `onlyVerifier`. Sets `startAt`. Must be called before `postByDeadline`.
  - `release() external`: `onlyVerifier`. Requires `startAt > 0` and `block.timestamp >= startAt + holdFor`.
  - `refund() external`: Callable by `founder` or `verifier` under specific conditions:
    - If `startAt` is not set and `block.timestamp > postByDeadline`.
    - If the `verifier` determines a failure before `release()` is called (e.g., tweet deleted).

- **Security & Rules:**
  - Implement `onlyVerifier` modifier.
  - Use a reentrancy guard and a pull-payment pattern (`withdraw` function).
  - Contracts must be finalized after `release()` or `refund()` to prevent further actions.
  - Store the normalized `xHandle` (no "@") and `nonce`.
  - Emit all specified events with amounts in wei.
  - Use `Slither` for static analysis. Ensure overflow safety with Solidity `^0.8.0`.

## 3. Off-Chain Verifier (Python)

- **Framework:** FastAPI with a background cron worker (e.g., `apscheduler`).
- **Configuration (`.env`):** `RPC_URL`, `VERIFIER_PRIVATE_KEY`, `X_API_TOKEN`.
- **Core Logic (Cron Worker):**
  - **Frequency:** Run every ~10 minutes.
  - **Task:** For each active escrow, search the X API for a tweet by `xHandle` that contains **both** the `nonce` and the `escrow address`.
  - **Actions:**
    - **Tweet Found:** If found before `postByDeadline`, call `markStart(tweetId)`.
    - **Hold Period Check:** Continue checking until `startAt + holdFor`. If the tweet is still valid, call `release()`.
    - **Tweet Missing/Deleted:** If the tweet is not found by the deadline, or is deleted during the hold period, call `refund()` with a reason (e.g., `"tweet_missing"`).
  - **Robustness:** Implement idempotent calls (check contract state before sending a transaction), handle RPC errors with retries, and use EIP-1559 transactions.
- **API:**
  - `POST /start?escrow=<addr>`: Manually trigger watching for a new escrow.
  - `GET /health`: A simple health endpoint.

## 4. Frontend (React/Next.js)

- **Framework:** Next.js or Vite (React) with `wagmi`/`viem` or `ethers.js`.
- **Create Escrow Page:**
  - **Form:** Inputs for KOL wallet address, X handle, and amount in ETH.
  - **Action:** "Connect Wallet" and "Create Escrow" buttons.
  - **Output:** On success, display the Escrow address and `nonce` with copy buttons and clear instructions for the KOL.
- **Status Page:**
  - **Logic:** Use the escrow address from a URL query parameter to call the `info()` function and read events.
  - **Display:** Show the current status: "Waiting for tweet", "Monitoring (with countdown)", "Released", or "Refunded (with reason)".

## 5. Acceptance Criteria

1.  **Happy Path:** An end-to-end test (on Base Sepolia) where an escrow is created, a valid tweet is posted, the verifier calls `markStart` and `release`, and the KOL successfully withdraws the funds.
2.  **Missed Deadline:** A test where no tweet is posted by the deadline, and the `refund()` function succeeds, allowing the founder to withdraw.
3.  **Deleted Tweet:** A test where `markStart` is called, but a simulated deletion triggers the verifier to call `refund()`, allowing the founder to withdraw.
4.  **Access Control:** Tests must confirm that only the `verifier` can call `markStart`/`release` and that `refund` is correctly restricted to the `founder` and `verifier` under the defined conditions.