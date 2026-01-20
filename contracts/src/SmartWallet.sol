// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // Ensure OpenZeppelin contracts are installed
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Ensure OpenZeppelin contracts are installed

contract SmartWallet {
    using SafeERC20 for IERC20;

    error SMARTWALLET_NOT_OWNER();
    error SMARTWALLET_NOT_AGENT();
    error SMARTWALLET_TOKEN_NOT_ALLOWED();
    error SMARTWALLET_RECIPIENT_NOT_ALLOWED();
    error SMARTWALLET_DAILY_LIMIT_REACHED();

    event PaymentExecuted(address indexed token, address indexed to, uint256 amount);
    event TokenAllowed(address token, bool allowed);
    event RecipientAllowed(address recipient, bool allowed);
    event AgentUpdated(address agent);
    event OwnerUpdated(address owner);

    address public owner;
    address public agent;

    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public lastReset;

    mapping(address => bool) public allowedTokens;
    mapping(address => bool) public allowedRecipients;

    modifier onlyOwner() {
        if (msg.sender != owner) revert SMARTWALLET_NOT_OWNER();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert SMARTWALLET_NOT_AGENT();
        _;
    }

    constructor(address _agent, uint256 _dailyLimit) {
        owner = msg.sender;
        agent = _agent;
        dailyLimit = _dailyLimit;
        lastReset = block.timestamp;
    }

    // =========================
    // Agent execution
    // =========================

    function executePayment(
        address token,
        address to,
        uint256 amount
    ) external onlyAgent {
        _resetIfNeeded();

        if (!allowedTokens[token]) revert SMARTWALLET_TOKEN_NOT_ALLOWED();
        if (!allowedRecipients[to]) revert SMARTWALLET_RECIPIENT_NOT_ALLOWED();
        if (spentToday + amount > dailyLimit) {
            revert SMARTWALLET_DAILY_LIMIT_REACHED();
        }

        spentToday += amount;

        IERC20(token).safeTransfer(to, amount);

        emit PaymentExecuted(token, to, amount);
    }

    // =========================
    // Owner controls
    // =========================

    function allowOrRevokeToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function allowOrRevokeRecipient(address recipient, bool allowed) external onlyOwner {
        allowedRecipients[recipient] = allowed;
        emit RecipientAllowed(recipient, allowed);
    }

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerUpdated(_owner);
    }

    // =========================
    // Safety / recovery
    // =========================

    function rescueToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // =========================
    // Internal
    // =========================

    function _resetIfNeeded() internal {
        if (block.timestamp >= lastReset + 1 days) {
            spentToday = 0;
            lastReset = block.timestamp;
        }
    }
}
