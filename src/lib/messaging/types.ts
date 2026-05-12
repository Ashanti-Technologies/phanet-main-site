export type MessageChannel = "EMAIL" | "SMS";

export interface SendMessageInput {
  to: string;
  /** Required for EMAIL, ignored for SMS. */
  subject?: string;
  /** HTML for EMAIL, plain text for SMS. */
  body: string;
  /** Plain-text fallback for EMAIL (optional). */
  text?: string;
  /** Reply-to or sender-id override. */
  from?: string;
  /** Per-message metadata recorded with the provider. */
  meta?: Record<string, unknown>;
}

export interface SendResult {
  ok: boolean;
  /** Provider's message id (e.g. Resend id, Hubtel reference). */
  providerRef?: string;
  error?: string;
  /** The recipient that was attempted — useful when batching. */
  recipient: string;
}

export interface BatchResult {
  total: number;
  successes: number;
  failures: number;
  results: SendResult[];
}

export interface MessagingService {
  readonly channel: MessageChannel;
  /** Display name of the provider, e.g. "resend", "hubtel". */
  readonly provider: string;
  send(input: SendMessageInput): Promise<SendResult>;
  sendBatch(inputs: SendMessageInput[]): Promise<BatchResult>;
}
