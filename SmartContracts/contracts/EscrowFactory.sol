// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Escrow.sol";

/**
 * @title EscrowFactory
 * @dev A factory contract to deploy and track new Escrow contracts.
 */
contract EscrowFactory {
    /// @notice Emitted when a new escrow deal is created.
    event DealCreated(
        address indexed escrow,
        address indexed founder,
        address indexed kol,
        uint256 amount,
        string xHandle,
        bytes32 nonce
    );

    /**
     * @notice Creates and funds a new Escrow contract for a deal.
     * @param kol The wallet address of the Key Opinion Leader (KOL).
     * @param xHandle The X (Twitter) handle of the KOL, without the '@'.
     * @param verifier The address of the off-chain verifier service.
     * @return escrow The address of the newly created Escrow contract.
     */
    function createEscrow(
        address kol,
        string calldata xHandle,
        address verifier
    ) external payable returns (address escrow) {
        address founder = msg.sender;
        require(msg.value > 0, "Factory: Amount must be > 0");
        require(kol != address(0), "Factory: Invalid KOL address");
        require(verifier != address(0), "Factory: Invalid verifier address");

        // 1. Generate a unique nonce based on on-chain data.
        bytes32 nonce = keccak256(
            abi.encodePacked(founder, kol, block.chainid, block.timestamp)
        );

        // 2. Deploy a new Escrow contract, forwarding the ETH payment to its constructor.
        Escrow newEscrow = new Escrow{value: msg.value}(
            founder,
            kol,
            xHandle,
            nonce,
            verifier
        );

        escrow = address(newEscrow);

        // 3. Emit the DealCreated event.
        emit DealCreated(escrow, founder, kol, msg.value, xHandle, nonce);
    }
}