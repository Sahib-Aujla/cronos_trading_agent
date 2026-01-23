// import {MCPClient} from "./mcp.js";
// export const mcpClient = new MCPClient();
// mcpClient.chatLoop();   
import { getMinAmountOut } from "./vvsQuote.js";
import { ADDRESSES } from "./viem.js";
const amountIn = 10n * 10n ** 6n; // 10 USDC
const path = [
    ADDRESSES.USDC,
    ADDRESSES.VVS,
    ADDRESSES.WCRO,
];
const minOut = await getMinAmountOut(ADDRESSES.VVS_ROUTER, path, amountIn, 50 // 0.5%
);
console.log("Min WCRO out:", minOut.toString());
