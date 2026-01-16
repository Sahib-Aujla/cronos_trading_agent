import "dotenv/config";
function must(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env ${name}`);
    return v;
}
export const config = {
    port: Number(must("PORT")),
    rpc: must("CRONOS_RPC"),
    chainId: Number(must("CHAIN_ID")),
    agentKey: must("AGENT_PRIVATE_KEY"),
    wallet: must("AGENT_WALLET"),
    usdc: must("USDC"),
    cro: must("CRO"),
    router: must("DEX_ROUTER"),
    receiver: must("PAYMENT_RECEIVER"),
};
