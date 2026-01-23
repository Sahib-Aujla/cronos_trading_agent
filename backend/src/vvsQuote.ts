import { publicClient } from "./viemClient.js";

const vvsRouterAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
] as const;

export async function getMinAmountOut(
  router: `0x${string}`,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  slippageBps: number
): Promise<bigint> {
  const [, amountOut] = (await publicClient.readContract({
    address: router,
    abi: vvsRouterAbi,
    functionName: "getAmountsOut",
    args: [amountIn, [tokenIn, tokenOut]],
  })) as bigint[];

  return (amountOut * BigInt(10_000 - slippageBps)) / 10_000n;
}
