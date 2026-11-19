export type PaymentProvider = "STRIPE" | "PAYSTACK";

export interface PaymentConfig {
  provider: PaymentProvider;
  currency: string;
  /** Integer minor units (pesewas / cents) — never a float. */
  amountMinor: number;
  reference: string;
  email: string;
  /** Where the provider sends the giver back after checkout. */
  callbackUrl: string;
  /** Restrict checkout channels, e.g. ["card"] when the card must be reusable. */
  channels?: string[];
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  reference: string;
  provider: PaymentProvider;
  error?: string;
  redirectUrl?: string;
}

export interface PaymentVerification {
  success: boolean;
  reference: string;
  /** Integer minor units actually charged. */
  amountMinor: number;
  currency: string;
  status: "completed" | "pending" | "failed";
  /** Provider channel, e.g. "card", "mobile_money", "bank_transfer". */
  channel?: string | null;
  paidAt?: Date | null;
  /** Saved-card token, present when the provider can charge it again. */
  authorization?: { code: string; reusable: boolean; label: string } | null;
}

export interface SavedCardCharge {
  authorizationCode: string;
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
}

export interface PaymentService {
  initialize(config: PaymentConfig): Promise<PaymentResult>;
  verify(reference: string): Promise<PaymentVerification>;
  /** Charge a saved card (recurring gifts). Result is confirmed via verify(). */
  chargeSavedCard?(charge: SavedCardCharge): Promise<{ ok: boolean; message: string }>;
}
