import type {
  PaymentConfig,
  PaymentResult,
  PaymentVerification,
  PaymentService,
} from "./types";

/**
 * Paystack Payment Service (Placeholder)
 *
 * To implement:
 * 1. Install paystack: pnpm add paystack-sdk
 * 2. Add PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET to .env
 * 3. Implement the methods below using Paystack SDK
 */
export class PaystackPaymentService implements PaymentService {
  async initialize(config: PaymentConfig): Promise<PaymentResult> {
    // TODO: Implement Paystack transaction initialization
    // const response = await fetch('https://api.paystack.co/transaction/initialize', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     email: config.email,
    //     amount: config.amount * 100, // Paystack uses kobo/pesewas
    //     reference: config.reference,
    //     currency: config.currency,
    //     metadata: config.metadata,
    //   }),
    // });

    console.warn("Paystack payment not yet implemented");

    return {
      success: false,
      reference: config.reference,
      provider: "PAYSTACK",
      error: "Paystack integration not yet implemented",
    };
  }

  async verify(reference: string): Promise<PaymentVerification> {
    // TODO: Implement payment verification
    // const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    //   headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    // });

    console.warn("Paystack verification not yet implemented");

    return {
      success: false,
      reference,
      amount: 0,
      currency: "GHS",
      status: "pending",
    };
  }
}
