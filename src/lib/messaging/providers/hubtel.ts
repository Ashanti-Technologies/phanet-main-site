import type {
  BatchResult,
  MessagingService,
  SendMessageInput,
  SendResult,
} from "../types";
import { chunk, normalizeGhanaPhone } from "../utils";

const HUBTEL_SMS_URL = "https://sms.hubtel.com/v1/messages/send";
const BATCH_SIZE = 100;

/**
 * Hubtel SMS adapter. Uses HTTP Basic auth with client id / secret.
 * Docs: https://developers.hubtel.com/reference/send-quick-message
 */
export class HubtelSmsAdapter implements MessagingService {
  readonly channel = "SMS" as const;
  readonly provider = "hubtel";

  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private senderId: string;

  constructor() {
    this.clientId = process.env.HUBTEL_CLIENT_ID;
    this.clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    this.senderId = process.env.HUBTEL_SENDER_ID || "PHANET";
  }

  async send(input: SendMessageInput): Promise<SendResult> {
    if (!this.clientId || !this.clientSecret) {
      return {
        ok: false,
        recipient: input.to,
        error: "HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET not configured",
      };
    }
    const to = normalizeGhanaPhone(input.to) ?? input.to;
    const params = new URLSearchParams({
      clientid: this.clientId,
      clientsecret: this.clientSecret,
      from: input.from ?? this.senderId,
      to,
      content: input.body,
    });
    try {
      const res = await fetch(`${HUBTEL_SMS_URL}?${params.toString()}`, {
        method: "GET",
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          ok: false,
          recipient: to,
          error: `Hubtel ${res.status}: ${JSON.stringify(json)}`,
        };
      }
      const data = (json ?? {}) as {
        MessageId?: string;
        Status?: number;
      };
      const ok = data.Status === 0;
      return {
        ok,
        recipient: to,
        providerRef: data.MessageId,
        error: ok ? undefined : `Hubtel status ${data.Status}`,
      };
    } catch (err) {
      return {
        ok: false,
        recipient: to,
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
