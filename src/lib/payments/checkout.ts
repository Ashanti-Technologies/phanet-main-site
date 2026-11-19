import { log } from "@/lib/logger";
import { headers } from "next/headers";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { generatePaymentReference, getPaymentService } from "./index";

// Plain module, not "use server": exporting checkout() from an actions file
// would let any client start a payment for any amount.

/** An expected failure whose message is safe to show the payer. */
export class CheckoutError extends Error {}

export async function siteUrl() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Create the intent, hand off to Paystack, return the checkout URL. */
export async function checkout({
  channels,
  callbackUrl,
  ...data
}: {
  amount: Prisma.Decimal;
  fundId: string;
  email: string;
  donorName: string;
  memberId: string | null;
  commitmentId?: string;
  recurringGiftId?: string;
  eventRegistrationId?: string;
  channels?: string[];
  /** Absolute URL, or a path on this site. Paystack appends ?reference=…. Defaults to the giving thank-you page. */
  callbackUrl?: string;
}) {
  const reference = generatePaymentReference();
  const intent = await prisma.paymentIntent.create({
    data: { ...data, provider: "PAYSTACK", reference, currency: "GHS" },
  });
  const result = await getPaymentService("PAYSTACK").initialize({
    provider: "PAYSTACK",
    currency: "GHS",
    amountMinor: data.amount.mul(100).toNumber(),
    reference,
    email: data.email,
    callbackUrl: callbackUrl?.startsWith("http") ? callbackUrl : `${await siteUrl()}${callbackUrl ?? "/give/thank-you"}`,
    channels,
    metadata: {
      paymentIntentId: intent.id,
      commitmentId: data.commitmentId ?? null,
      eventRegistrationId: data.eventRegistrationId ?? null,
    },
  });
  if (!result.success || !result.redirectUrl) {
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "FAILED" } });
    log.error("payments", "initialize failed", { intentId: intent.id, err: result.error });
    throw new CheckoutError("We couldn't start the payment. Please try again in a moment.");
  }
  return { redirectUrl: result.redirectUrl };
}
