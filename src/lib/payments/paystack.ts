import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentConfig,
  PaymentResult,
  PaymentVerification,
  PaymentService,
  SavedCardCharge,
} from "./types";

const API = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function paystack<T>(path: string, init?: RequestInit): Promise<{ status: boolean; message: string; data: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  return res.json();
}

/**
 * Paystack (card + Mobile Money in Ghana). Docs:
 * https://paystack.com/docs/api/transaction/
 */
export class PaystackPaymentService implements PaymentService {
  async initialize(config: PaymentConfig): Promise<PaymentResult> {
    const body = await paystack<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: config.email,
        amount: config.amountMinor,
        currency: config.currency,
        reference: config.reference,
        callback_url: config.callbackUrl,
        channels: config.channels ?? ["card", "mobile_money", "bank_transfer"],
        metadata: config.metadata,
      }),
    });
    return body.status
      ? { success: true, reference: config.reference, provider: "PAYSTACK", redirectUrl: body.data.authorization_url }
      : { success: false, reference: config.reference, provider: "PAYSTACK", error: body.message };
  }

  async verify(reference: string): Promise<PaymentVerification> {
    const body = await paystack<{
      status: string;
      amount: number;
      currency: string;
      channel: string | null;
      paid_at: string | null;
      authorization?: {
        authorization_code?: string;
        reusable?: boolean;
        brand?: string;
        card_type?: string;
        last4?: string;
      };
    }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    const d = body.data;
    const status =
      body.status && d?.status === "success"
        ? "completed"
        : d && ["failed", "abandoned", "reversed"].includes(d.status)
          ? "failed"
          : "pending";
    return {
      success: status === "completed",
      reference,
      amountMinor: d?.amount ?? 0,
      currency: d?.currency ?? "GHS",
      status,
      channel: d?.channel ?? null,
      paidAt: d?.paid_at ? new Date(d.paid_at) : null,
      authorization: d?.authorization?.authorization_code
        ? {
            code: d.authorization.authorization_code,
            reusable: d.authorization.reusable === true,
            label: [d.authorization.brand ?? d.authorization.card_type, d.authorization.last4 && `•••• ${d.authorization.last4}`]
              .filter(Boolean)
              .join(" ")
              .trim(),
          }
        : null,
    };
  }

  async chargeSavedCard(charge: SavedCardCharge) {
    const body = await paystack<{ status: string; gateway_response?: string }>("/transaction/charge_authorization", {
      method: "POST",
      body: JSON.stringify({
        authorization_code: charge.authorizationCode,
        email: charge.email,
        amount: charge.amountMinor,
        currency: charge.currency,
        reference: charge.reference,
      }),
    });
    return { ok: body.status && body.data?.status === "success", message: body.data?.gateway_response ?? body.message };
  }
}

/** Webhook authenticity: HMAC-SHA512 of the raw body with the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
