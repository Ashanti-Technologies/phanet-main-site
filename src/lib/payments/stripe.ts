import { log } from "@/lib/logger";
import type {
  PaymentConfig,
  PaymentResult,
  PaymentVerification,
  PaymentService,
} from "./types";

/**
 * Stripe Payment Service (Placeholder)
 *
 * To implement:
 * 1. Install stripe: pnpm add stripe @stripe/stripe-js
 * 2. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env
 * 3. Implement the methods below using Stripe SDK
 */
export class StripePaymentService implements PaymentService {
  async initialize(config: PaymentConfig): Promise<PaymentResult> {
    // TODO: Implement Stripe Checkout Session creation
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const session = await stripe.checkout.sessions.create({...});

    log.warn("payments", "Stripe payment not yet implemented");

    return {
      success: false,
      reference: config.reference,
      provider: "STRIPE",
      error: "Stripe integration not yet implemented",
    };
  }

  async verify(reference: string): Promise<PaymentVerification> {
    // TODO: Implement payment verification
    // const session = await stripe.checkout.sessions.retrieve(reference);

    log.warn("payments", "Stripe verification not yet implemented");

    return {
      success: false,
      reference,
      amountMinor: 0,
      currency: "GHS",
      status: "pending",
    };
  }
}
