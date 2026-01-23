// viemClient.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cronosTestnet } from "./viem.js";
import {config} from "./config.js";
const account = privateKeyToAccount(
  config.agentKey as `0x${string}`
);

export const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(),
});

export const walletClient = createWalletClient({
  account,
  chain: cronosTestnet,
  transport: http(),
});
