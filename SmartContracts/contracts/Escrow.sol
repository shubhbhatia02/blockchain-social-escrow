// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev Holds funds for a deal between a Founder and a KOL.
 * The deal is verified by an off-chain service.
 */
contract Escrow is ReentrancyGuard {
    // --- Constants ---
    uint64 public constant POST_BY_DEADLINE_PERIOD = 24 hours;
    uint64 public constant HOLD_FOR_PERIOD = 24 hours;

    // --- State Variables ---
    address public immutable founder;
    address public immutable kol;
    uint256 public immutable amount;
    string public immutable xHandle;
    bytes32 public immutable nonce;
    address public immutable verifier;
    uint64 public immutable createdAt;

    uint64 public startAt; // Timestamp when the verifier confirms the tweet is live.

    enum Status {
        Active,
        Released,
        Refunded
    }
    Status public status;

    // --- Events ---
    event Started(bytes32 tweetId, uint64 startAt);
    event Released(address to, uint256 amount);
    event Refunded(address to, uint256 amount, string reason);

    // --- Modifiers ---
    modifier onlyVerifier() {
        require(msg.sender == verifier, "Escrow: Caller is not the verifier");
        _;
    }

    // --- Constructor ---
    constructor(
        address _founder,
        address _kol,
        string memory _xHandle,
        bytes32 _nonce,
        address _verifier
    ) payable {
        founder = _founder;
        kol = _kol;
        amount = msg.value;
        xHandle = _xHandle;
        nonce = _nonce;
        verifier = _verifier;
        createdAt = uint64(block.timestamp);
        status = Status.Active;

        require(amount > 0, "Escrow: Amount must be greater than zero");
    }

    // --- View Functions ---
    function info()
        external
        view
        returns (
            address, // founder
            address, // kol
            uint256, // amount
            string memory, // xHandle
            bytes32, // nonce
            address, // verifier
            uint64, // createdAt
            uint64, // startAt
            uint64, // postByDeadline
            uint64 // holdFor
        )
    {
        return (
            founder,
            kol,
            amount,
            xHandle,
            nonce,
            verifier,
            createdAt,
            startAt,
            createdAt + POST_BY_DEADLINE_PERIOD,
            HOLD_FOR_PERIOD
        );
    }

    // --- State-Changing Functions ---

    function markStart(bytes32 tweetId) external onlyVerifier {
        // TODO: Implement logic
    }

    function release() external onlyVerifier {
        // TODO: Implement logic
    }

    function refund(string calldata reason) external {
        // TODO: Implement logic
    }

    function withdraw() external nonReentrant {
        // TODO: Implement pull-payment withdrawal logic for KOL or Founder
    }
}