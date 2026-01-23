import { CronosNetwork, Facilitator } from "@crypto.com/facilitator-client";

export const facilitator = new Facilitator({
    network: "testnet" as CronosNetwork, // cronos testnet
});

export async function verifyX402Payment(paymentPayload: any) {
    const result = await facilitator.verifyPayment(paymentPayload);

    if (!result.valid) {
        throw new Error("x402 payment invalid");
    }

    return {
        payer: result.payer,
        amount: result.amount,
        asset: result.asset,
    };
}
