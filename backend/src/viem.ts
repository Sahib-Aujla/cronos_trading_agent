import { createWalletClient, createPublicClient, http } from "viem";
//import { cronosTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";


export const cronosTestnet = {
    id: config.chainId,
    name: "Cronos Testnet",
    nativeCurrency: {
        name: "TCRO",
        symbol: "TCRO",
        decimals: 18,
    },
    rpcUrls: {
        default: { http: [config.rpc] },
    },
};

export const publicClient = createPublicClient({
    chain: cronosTestnet,
    transport: http(),
});


const account = privateKeyToAccount(`0x${config.agentKey}`);

export const walletAccount = createWalletClient({
    chain: cronosTestnet,
    transport: http(),
    account: account,
});