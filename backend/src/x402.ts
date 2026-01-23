// x402.ts
import { Facilitator, CronosNetwork, VerifyRequest, X402VerifyResponse } from "@crypto.com/facilitator-client";

export interface X402VerifyResponseExtended extends X402VerifyResponse {
  amount?: bigint;
  asset?: string;
  referenceId?: string;
}

export const facilitator = new Facilitator({
  network: "testnet" as CronosNetwork,
});

export async function verifyX402Payment(payload: VerifyRequest) {
  const res = (await facilitator.verifyPayment(
    payload
  )) as X402VerifyResponseExtended;

  if (!res.isValid) {
    throw new Error(`x402 invalid: ${res.invalidReason}`);
  }

  if (res.amount == null || res.asset == null) {
    throw new Error("x402 missing amount or asset");
  }

  return {
    amount: res.amount,
    asset: res.asset,
    referenceId: res.referenceId ?? null,
  };
}