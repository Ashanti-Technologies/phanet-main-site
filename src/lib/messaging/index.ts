import type { MessageChannel, MessagingService } from "./types";
import { ResendEmailAdapter } from "./providers/resend";
import { FailoverSmsService } from "./failover";

export * from "./types";
export * from "./utils";

/**
 * Return the messaging service for a channel. SMS goes through the failover
 * chain configured at /admin/settings/integrations (see ./failover.ts).
 */
export function getMessagingService(channel: MessageChannel): MessagingService {
  switch (channel) {
    case "EMAIL":
      return new ResendEmailAdapter();
    case "SMS":
      return new FailoverSmsService();
    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unknown messaging channel: ${_exhaustive as string}`);
    }
  }
}
