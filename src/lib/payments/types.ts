export type PaymentProvider = "STRIPE" | "PAYSTACK";

export interface PaymentConfig {
  provider: PaymentProvider;
  currency: string;
  amount: number;
  reference: string;
  email: string;
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
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed";
}

export interface PaymentService {
  initialize(config: PaymentConfig): Promise<PaymentResult>;
  verify(reference: string): Promise<PaymentVerification>;
}
