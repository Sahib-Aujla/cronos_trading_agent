// viemClient.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cronosTestnet } from "./viem.js";

const account = privateKeyToAccount(
  process.env.AGENT_PK as `0x${string}`
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
