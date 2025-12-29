//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmartWallet {
    error SMARTWALLET_NOT_OWNER();
    error SMARTWALLET_NOT_AGENT();
    error SMARTWALLET_TOKEN_NOT_ALLOWED();
    error SMARTWALLET_DAILY_LIMIT_REACHED();

    event PaymentExecuted(address indexed token, address indexed to, uint256 amount);

    address public owner;
    address public agent;
    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public lastReset;

    mapping(address => bool) public allowedTokens;
    mapping(address => bool) public allowedRecipients;

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert SMARTWALLET_NOT_OWNER();
        }
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) {
            revert SMARTWALLET_NOT_AGENT();
        }
        _;
    }

    constructor(address _owner, address _agent, uint256 _dailyLimit) {
        owner = _owner;
        agent = _agent;
        dailyLimit = _dailyLimit;
        lastReset = block.timestamp;
    }

    function executePayment(address token, address to, uint256 amount) external onlyAgent {
        _reset();
        if (!allowedTokens[token]) {
            revert SMARTWALLET_TOKEN_NOT_ALLOWED();
        }
        if (!allowedRecipients[to]) {
            revert SMARTWALLET_TOKEN_NOT_ALLOWED();
        }
        if (spentToday + amount > dailyLimit) {
            revert SMARTWALLET_DAILY_LIMIT_REACHED();
        }

        spentToday += amount;
        emit PaymentExecuted(token, to, amount);

        (bool success,) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        require(success, "TRANSFER_FAILED");
    }

    function allowOrRevokeRecipient(address _recipient, bool _allowed) external onlyOwner {
        allowedRecipients[_recipient] = _allowed;
    }

    function allowOrRevokeToken(address _token, bool _allowed) external onlyOwner {
        allowedTokens[_token] = _allowed;
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
    }

    function _reset() internal {
        if (block.timestamp >= lastReset + 1 days) {
            spentToday = 0;
            lastReset = block.timestamp;
        }
    }
}
