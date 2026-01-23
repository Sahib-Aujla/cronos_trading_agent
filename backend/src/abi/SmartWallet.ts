export const SmartWalletABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_agent", type: "address" },
      { name: "_dailyLimit", type: "uint256" },
      { name: "_router", type: "address" },
      { name: "_wcro", type: "address" },
    ],
  },
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "spentToday",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "dailyLimit",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "SwapExecuted",
    inputs: [
      { indexed: true, name: "tokenIn", type: "address" },
      { indexed: true, name: "tokenOut", type: "address" },
      { indexed: false, name: "amountIn", type: "uint256" },
      { indexed: false, name: "amountOut", type: "uint256" },
    ],
  },
];
