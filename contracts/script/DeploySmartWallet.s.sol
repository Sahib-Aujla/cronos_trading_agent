// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SmartWallet.sol";

contract DeploySmartWallet is Script {
    function run() external {
        // Load from .env
        address agent = vm.envAddress("AGENT_ADDRESS");

        // Daily limit in smallest USDC units (6 decimals)
        uint256 dailyLimit = 500e6; // 500 USDC

        // Photonswap Router on Cronos Testnet
        address router = 0x2fFAa0794bf59cA14F268A7511cB6565D55ed40b;

        // Wrapped CRO (WCRO) on Cronos Testnet
        address wcro = 0xa85d35eb8E439078a1810Ec3738997E61d157f0d;

        vm.startBroadcast();

        SmartWallet wallet = new SmartWallet(agent, dailyLimit, router, wcro);

        wallet.allowedTokens(0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0); // devUSDC.e
        wallet.allowedTokens(wcro);
        vm.stopBroadcast();

        console.log("SmartWallet deployed at:", address(wallet));
        console.log("Router:", router);
        console.log("WCRO:", wcro);
        console.log("devUSDC.e:", 0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0);
    }
}
