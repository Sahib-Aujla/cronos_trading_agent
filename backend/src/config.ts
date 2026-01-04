import "dotenv/config";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  port: Number(must("PORT")),
  rpc: must("CRONOS_RPC"),
  chainId: Number(must("CHAIN_ID")),
  agentKey: must("AGENT_PRIVATE_KEY"),
  wallet: must("AGENT_WALLET") as `0x${string}`,
  usdc: must("USDC") as `0x${string}`,
  cro: must("CRO") as `0x${string}`,
  router: must("DEX_ROUTER") as `0x${string}`,
  receiver: must("PAYMENT_RECEIVER") as `0x${string}`,
};
