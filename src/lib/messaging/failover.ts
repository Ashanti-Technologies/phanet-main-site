import { prisma } from "@/lib/database";
import { log } from "@/lib/logger";
import type { BatchResult, MessagingService, SendMessageInput, SendResult } from "./types";
import { chunk } from "./utils";
import { ArkeselSmsAdapter } from "./providers/arkesel";
import { HubtelSmsAdapter } from "./providers/hubtel";

/**
 * Every SMS adapter we've built. Adding a provider = one adapter class + one
 * line here; ordering and on/off live in the DB (/admin/settings/integrations).
 */
export const SMS_ADAPTERS = {
  arkesel: () => new ArkeselSmsAdapter(),
  hubtel: () => new HubtelSmsAdapter(),
} satisfies Record<string, () => MessagingService>;

export type SmsProviderKey = keyof typeof SMS_ADAPTERS;
export type SmsProviderSetting = { key: SmsProviderKey; enabled: boolean };

export const SMS_SETTING_KEY = "sms.providers";

/** Saved failover order; adapters added since the last save are appended, off. */
export async function getSmsProviderOrder(): Promise<SmsProviderSetting[]> {
  const row = await prisma.integrationSetting.findUnique({ where: { key: SMS_SETTING_KEY } });
  const known = Object.keys(SMS_ADAPTERS) as SmsProviderKey[];
  if (!row) return known.map((key) => ({ key, enabled: true }));
  const saved = (row.value as SmsProviderSetting[]).filter((s) => known.includes(s.key));
  const missing = known.filter((k) => !saved.some((s) => s.key === k));
  return [...saved, ...missing.map((key) => ({ key, enabled: false }))];
}

/**
 * Tries each enabled, configured provider in order. Moves on only when a
 * provider definitely didn't send (`retryable`) — see SendResult.
 */
export class FailoverSmsService implements MessagingService {
  readonly channel = "SMS" as const;
  readonly provider = "failover";
  private chain?: Promise<MessagingService[]>;

  private adapters() {
    // Read once per instance: a 1,000-member batch shouldn't do 1,000 lookups.
    this.chain ??= getSmsProviderOrder().then((order) =>
      order
        .filter((s) => s.enabled)
        .map((s) => SMS_ADAPTERS[s.key]())
        .filter((a) => a.isConfigured()),
    );
    return this.chain;
  }

  async send(input: SendMessageInput): Promise<SendResult> {
    const adapters = await this.adapters();
    let last: SendResult = { ok: false, recipient: input.to, error: "No SMS provider is enabled and configured" };
    for (const adapter of adapters) {
      last = { ...(await adapter.send(input)), provider: adapter.provider };
      if (last.ok || !last.retryable) break;
      log.warn("sms", "provider failed, trying next", { provider: adapter.provider, err: last.error });
    }
    return last;
  }

  async sendBatch(inputs: SendMessageInput[]): Promise<BatchResult> {
    const results: SendResult[] = [];
    for (const group of chunk(inputs, 100)) {
      results.push(...(await Promise.all(group.map((i) => this.send(i)))));
    }
    const successes = results.filter((r) => r.ok).length;
    return { total: results.length, successes, failures: results.length - successes, results };
  }
}
