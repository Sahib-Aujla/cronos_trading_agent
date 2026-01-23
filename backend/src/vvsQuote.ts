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
  path: `0x${string}`[],
  amountIn: bigint,
  slippageBps: number
): Promise<bigint> {
  if (path.length < 2) {
    throw new Error("Swap path must have at least 2 tokens");
  }

  const amounts = await publicClient.readContract({
    address: router,
    abi: vvsRouterAbi,
    functionName: "getAmountsOut",
    args: [amountIn, path],
  }) as bigint[];

  const amountOut = amounts[amounts.length - 1];

  return (amountOut * BigInt(10_000 - slippageBps)) / 10_000n;
}
