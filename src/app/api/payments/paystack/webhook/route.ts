import { verifyPaystackSignature } from "@/lib/payments";
import { settlePaymentIntent } from "@/lib/payments/settle";

/**
 * Paystack webhook. Set the URL in the Paystack dashboard to
 * https://<site>/api/payments/paystack/webhook. We never trust the payload's
 * amount — settlePaymentIntent re-verifies with the Paystack API.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
  if (event.event === "charge.success" && event.data?.reference) {
    // Throwing returns 500 so Paystack retries later.
    await settlePaymentIntent(event.data.reference);
  }
  return new Response("ok");
}
