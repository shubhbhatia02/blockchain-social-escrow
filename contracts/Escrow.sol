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
    uint64 public constant VERIFICATION_DELAY = 2 hours;

    // --- State Variables ---
    address public immutable founder;
    address public immutable kol;
    uint256 public immutable amount;
    string public xHandle;
    bytes32 public immutable nonce;
    address public immutable verifier;
    uint64 public immutable createdAt;

    enum Status {
        Active,
        Released,
        Refunded,
        Completed
    }
    Status public status;

    // --- Events ---
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
            uint64 // verificationDeadline
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
            createdAt + VERIFICATION_DELAY
        );
    }

    // --- State-Changing Functions ---

    function release() external onlyVerifier {
        require(status == Status.Active, "Escrow: Not active");
        require(
            block.timestamp >= createdAt + VERIFICATION_DELAY,
            "Escrow: Verification delay not over"
        );

        status = Status.Released;
        emit Released(kol, amount);
    }

    function refund(string calldata reason) external onlyVerifier {
        require(status == Status.Active, "Escrow: Not active");
        require(
            block.timestamp >= createdAt + VERIFICATION_DELAY,
            "Escrow: Verification delay not over"
        );

        status = Status.Refunded;
        emit Refunded(founder, amount, reason);
    }

    function withdraw() external nonReentrant {
        if (status == Status.Released) {
            require(msg.sender == kol, "Escrow: Only KOL can withdraw after release");
            status = Status.Completed; // Prevent re-withdrawal
            payable(kol).transfer(amount);
        } else if (status == Status.Refunded) {
            require(msg.sender == founder, "Escrow: Only founder can withdraw after refund");
            status = Status.Completed; // Prevent re-withdrawal
            payable(founder).transfer(amount);
        } else {
            revert("Escrow: Not in a withdrawable state");
        }
    }
}