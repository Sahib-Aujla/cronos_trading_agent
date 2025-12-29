//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmartWallet {
    error SMARTWALLET_NOT_OWNER();
    error SMARTWALLET_NOT_AGENT();
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
