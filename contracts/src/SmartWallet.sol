//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmartWallet {
    address public owner;
    address public agent;
    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public lastReset;

    mapping(address => bool) public allowedTokens;
    mapping(address => bool) public allowedRecipients;

    function _reset() internal {
        if (block.timestamp >= lastReset + 1 days) {
            spentToday = 0;
            lastReset = block.timestamp;
        }
    }
}
