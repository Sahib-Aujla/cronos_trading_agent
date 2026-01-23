import "dotenv/config";
function must(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env ${name}`);
    return v;
}
export const config = {
    port: Number(must("PORT")),
    rpc: must("CRONOS_RPC_URL"),
    chainId: Number(must("CHAIN_ID")),
    agentKey: must("AGENT_PRIVATE_KEY"),
};
