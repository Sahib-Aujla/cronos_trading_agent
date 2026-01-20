import { defineChain } from "viem";

export const cronosTestnet = defineChain({
  id: 338,
  name: "Cronos Testnet",
  nativeCurrency: {
    name: "Test CRO",
    symbol: "TCRO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evm-t3.cronos.org"],
    },
  },
});

export const FACILITATOR_URL =
  "https://x402-facilitator-testnet.crypto.com";
