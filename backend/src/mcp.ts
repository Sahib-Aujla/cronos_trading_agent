import {} from "@modelcontextprotocol/sdk/server";

const mcp = new Client({
    serverUrl: "https://mcp.crypto.com",
});

export async function getMarketSignal() {
    const data = await mcp.callTool({
        name: "get_market_price",
        arguments: {
            symbol: "CRO_USDC",
        },
    });

    return {
        price: Number(data.price),
        change1h: Number(data.change_1h),
    };
}
