"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletAccount = exports.publicClient = exports.cronosTestnet = void 0;
const viem_1 = require("viem");
//import { cronosTestnet } from "viem/chains";
const accounts_1 = require("viem/accounts");
const config_1 = require("./config");
exports.cronosTestnet = {
    id: config_1.config.chainId,
    name: "Cronos Testnet",
    nativeCurrency: {
        name: "TCRO",
        symbol: "TCRO",
        decimals: 18,
    },
    rpcUrls: {
        default: { http: [config_1.config.rpc] },
    },
};
exports.publicClient = (0, viem_1.createPublicClient)({
    chain: exports.cronosTestnet,
    transport: (0, viem_1.http)(),
});
const account = (0, accounts_1.privateKeyToAccount)(`0x${config_1.config.agentKey}`);
exports.walletAccount = (0, viem_1.createWalletClient)({
    chain: exports.cronosTestnet,
    transport: (0, viem_1.http)(),
    account: account,
});
