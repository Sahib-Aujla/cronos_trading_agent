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


export const ADDRESSES = {
  SMART_WALLET: "0xb737bCE7B34024139aF0bfdDB9a0C9C740b2232C",
  VVS_ROUTER: "0x2fFAa0794bf59cA14F268A7511cB6565D55ed40b",
  WCRO: "0xa85d35eb8E439078a1810Ec3738997E61d157f0d",
  USDC: "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
};

export const TRADE_CONFIG = {
  tradeSizeUsdc: 50n * 10n ** 6n, // 50 USDC
  slippageBps: 50,               // 0.5%
  loopIntervalMs: 15_000,
};

export const FACILITATOR_URL =
  "https://x402-facilitator-testnet.crypto.com";
