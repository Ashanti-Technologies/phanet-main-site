import { Resend } from "resend";
import type {
  BatchResult,
  MessagingService,
  SendMessageInput,
  SendResult,
} from "../types";
import { chunk } from "../utils";

const DEFAULT_FROM = "Phanerosis Network <noreply@phanerosisnetwork.com>";
const BATCH_SIZE = 50;

export class ResendEmailAdapter implements MessagingService {
  readonly channel = "EMAIL" as const;
  readonly provider = "resend";
  private client: Resend | null;

  constructor() {
    this.client = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  async send(input: SendMessageInput): Promise<SendResult> {
    if (!this.client) {
      return {
        ok: false,
        recipient: input.to,
        error: "RESEND_API_KEY not configured",
      };
    }
    try {
      const { data, error } = await this.client.emails.send({
        from: input.from ?? DEFAULT_FROM,
        to: input.to,
        subject: input.subject ?? "",
        html: input.body,
        text: input.text,
      });
      if (error) {
        return {
          ok: false,
          recipient: input.to,
          error: error.message ?? String(error),
        };
      }
      return { ok: true, recipient: input.to, providerRef: data?.id };
    } catch (err) {
      return {
        ok: false,
        recipient: input.to,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async sendBatch(inputs: SendMessageInput[]): Promise<BatchResult> {
    const results: SendResult[] = [];
    for (const group of chunk(inputs, BATCH_SIZE)) {
      const settled = await Promise.all(group.map((i) => this.send(i)));
      results.push(...settled);
    }
    const successes = results.filter((r) => r.ok).length;
    return {
      total: results.length,
      successes,
      failures: results.length - successes,
      results,
    };
  }
}
