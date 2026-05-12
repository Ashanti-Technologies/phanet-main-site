import type { MessageChannel, MessagingService } from "./types";
import { ResendEmailAdapter } from "./providers/resend";
import { HubtelSmsAdapter } from "./providers/hubtel";

export * from "./types";
export * from "./utils";

/**
 * Return the configured messaging service for the given channel. To swap
 * providers, change the adapter on this one line.
 */
export function getMessagingService(channel: MessageChannel): MessagingService {
  switch (channel) {
    case "EMAIL":
      return new ResendEmailAdapter();
    case "SMS":
      return new HubtelSmsAdapter();
    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unknown messaging channel: ${_exhaustive as string}`);
    }
  }
}
