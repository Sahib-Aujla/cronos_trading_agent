import { walletClient, publicClient } from "./viemClient.js";
import { SmartWalletABI } from "./abi/SmartWallet.js";
import { ADDRESSES, TRADE_CONFIG } from "./viem.js";
import { getMinAmountOut } from "./vvsQuote.js";

export async function executeSmartWalletSwap(params: {
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: bigint;
}) {
    const { tokenIn, tokenOut, amountIn } = params;

    const minAmountOut = await getMinAmountOut(
        ADDRESSES.VVS_ROUTER as `0x${string}`,
        tokenIn,
        tokenOut,
        amountIn,
        TRADE_CONFIG.slippageBps
    );

    const txHash = await walletClient.writeContract({
        address: ADDRESSES.SMART_WALLET as `0x${string}`,
        abi: SmartWalletABI,
        functionName: "swap",
        args: [tokenIn, tokenOut, amountIn, minAmountOut],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
    });

    return {
        txHash,
        blockNumber: receipt.blockNumber,
    };
}
