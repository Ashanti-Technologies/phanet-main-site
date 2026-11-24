import { createHmac, timingSafeEqual } from "node:crypto";
import { APP_CONFIG } from "@/constants";
import type {
  BatchResult,
  MessagingService,
  ProviderBalance,
  SendMessageInput,
  SendResult,
} from "../types";
import { chunk, normalizeGhanaPhone, retryableError, retryableStatus } from "../utils";

const BASE_URL = "https://sms.arkesel.com/api/v2";
const BATCH_SIZE = 100;
const LOW_SMS_UNITS = 500;
export const ARKESEL_WEBHOOK_PATH = "/api/messaging/arkesel/webhook";

type ArkeselResponse = {
  status?: string;
  message?: string;
  data?: { recipient?: string; id?: string; "invalid numbers"?: string[] }[];
};

/**
 * Arkesel SMS v2. Docs: https://developers.arkesel.com/#/sms-v2
 * Env: ARKESEL_API_KEY, ARKESEL_SENDER_ID (≤ 11 chars), ARKESEL_SANDBOX=1
 * (free, never delivered — local dev), ARKESEL_WEBHOOK_SECRET (delivery reports).
 */
export class ArkeselSmsAdapter implements MessagingService {
  readonly channel = "SMS" as const;
  readonly provider = "arkesel";

  private apiKey = process.env.ARKESEL_API_KEY;
  private senderId = process.env.ARKESEL_SENDER_ID || "PHANET";
  private sandbox = process.env.ARKESEL_SANDBOX === "1";

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private request(path: string, init?: RequestInit) {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "api-key": this.apiKey ?? "", "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  }

  async send(input: SendMessageInput): Promise<SendResult> {
    if (!this.apiKey) {
      return { ok: false, retryable: true, recipient: input.to, error: "ARKESEL_API_KEY not configured" };
    }
    const to = normalizeGhanaPhone(input.to) ?? input.to;
    // Arkesel can't reach localhost, and only signs callbacks once a secret exists.
    const callbackUrl =
      process.env.ARKESEL_WEBHOOK_SECRET && APP_CONFIG.siteUrl.startsWith("https://")
        ? `${APP_CONFIG.siteUrl}${ARKESEL_WEBHOOK_PATH}`
        : undefined;
    try {
      const res = await this.request("/sms/send", {
        method: "POST",
        body: JSON.stringify({
          sender: input.from ?? this.senderId,
          message: input.body,
          recipients: [to.replace(/^\+/, "")],
          ...(callbackUrl && { callback_url: callbackUrl }),
          ...(this.sandbox && { sandbox: true }),
        }),
      });
      const json = (await res.json().catch(() => null)) as ArkeselResponse | null;
      if (!res.ok || json?.status !== "success") {
        return {
          ok: false,
          retryable: retryableStatus(res.status),
          recipient: to,
          error: `Arkesel ${res.status}: ${json?.message ?? JSON.stringify(json)}`,
        };
      }
      if (json.data?.some((d) => d["invalid numbers"]?.length)) {
        return { ok: false, recipient: to, error: "Arkesel: invalid phone number" };
      }
      return { ok: true, recipient: to, providerRef: json.data?.find((d) => d.id)?.id };
    } catch (err) {
      return {
        ok: false,
        retryable: retryableError(err),
        recipient: to,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async sendBatch(inputs: SendMessageInput[]): Promise<BatchResult> {
    const results: SendResult[] = [];
    for (const group of chunk(inputs, BATCH_SIZE)) {
      results.push(...(await Promise.all(group.map((i) => this.send(i)))));
    }
    const successes = results.filter((r) => r.ok).length;
    return { total: results.length, successes, failures: results.length - successes, results };
  }

  async balance(): Promise<ProviderBalance> {
    const res = await this.request("/clients/balance-details");
    const json = (await res.json().catch(() => null)) as {
      status?: string;
      data?: { sms_balance?: string | number; main_balance?: string };
    } | null;
    if (!res.ok || json?.status !== "success" || !json.data) {
      throw new Error(`Arkesel balance ${res.status}`);
    }
    const units = Number(json.data.sms_balance ?? 0);
    return {
      label: `${units.toLocaleString()} SMS units · ${json.data.main_balance ?? "—"}`,
      low: units < LOW_SMS_UNITS,
    };
  }
}

/** Arkesel delivery-report statuses mapped onto our DeliveryStatus. */
export function mapArkeselStatus(status: string | undefined) {
  switch (status) {
    case "DELIVERED":
      return "DELIVERED" as const;
    case "NOT_DELIVERED":
    case "EXPIRED":
    case "PROHIBITED":
      return "FAILED" as const;
    case "SUBMITTED":
    case "QUEUED":
      return "SENT" as const;
    default:
      return null;
  }
}

/**
 * Verify a signed Arkesel callback: HMAC-SHA256 over
 * `{timestamp}.{query params as key-sorted JSON}`, PHP json_encode style
 * (unescaped slashes, non-ASCII as \uXXXX). The header may hold two `v1=`
 * signatures during secret rotation; any match passes. Rejects > 5 min skew.
 */
export function verifyArkeselSignature(
  params: Record<string, string>,
  timestamp: string | null,
  signatureHeader: string | null,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!timestamp || !signatureHeader || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > 300) return false;

  // ponytail: flat key sort — callbacks are flat query strings (sms_id, status).
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
  const json = JSON.stringify(sorted).replace(
    /[\u0080-￿]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  const expected = createHmac("sha256", secret).update(`${timestamp}.${json}`).digest();

  return signatureHeader
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1="))
    .some((s) => {
      const got = Buffer.from(s.slice(3), "hex");
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
}
