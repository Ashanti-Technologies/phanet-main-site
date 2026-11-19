import { randomBytes } from "node:crypto";
import type { PaymentService, PaymentProvider } from "./types";
import { StripePaymentService } from "./stripe";
import { PaystackPaymentService } from "./paystack";

export * from "./types";
export { StripePaymentService } from "./stripe";
export { PaystackPaymentService, verifyPaystackSignature } from "./paystack";

/**
 * Get a payment service instance by provider
 */
export function getPaymentService(provider: PaymentProvider): PaymentService {
  switch (provider) {
    case "STRIPE":
      return new StripePaymentService();
    case "PAYSTACK":
      return new PaystackPaymentService();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(prefix = "PHANET"): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(5).toString("hex");
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}
