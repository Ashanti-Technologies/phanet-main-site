import { requireSuperAdmin } from "@/lib/auth-guard";
import { log } from "@/lib/logger";
import { SMS_ADAPTERS, getSmsProviderOrder } from "@/lib/messaging/failover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { SmsProviders, type SmsProviderRow } from "./_components/sms-providers";

const LABELS: Record<string, string> = { arkesel: "Arkesel", hubtel: "Hubtel" };

export default async function IntegrationsPage() {
  await requireSuperAdmin();

  const order = await getSmsProviderOrder();
  const rows: SmsProviderRow[] = await Promise.all(
    order.map(async ({ key, enabled }) => {
      const adapter = SMS_ADAPTERS[key]();
      const configured = adapter.isConfigured();
      let balance: SmsProviderRow["balance"] = null;
      if (configured && "balance" in adapter) {
        try {
          balance = await adapter.balance();
        } catch (err) {
          log.warn("sms", "balance check failed", { provider: key, err });
          balance = { label: "Couldn't load balance", low: false };
        }
      }
      return { key, label: LABELS[key] ?? key, enabled, configured, balance };
    }),
  );

  const env = (name: string) => Boolean(process.env[name]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Third-party services. API keys are set as environment variables on the server; this
          page only controls how they&apos;re used.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMS</CardTitle>
          <CardDescription>
            Messages go through the first enabled provider. If it definitely fails (bad key, no
            credit, outage) the next one is tried. Timeouts don&apos;t fail over, to avoid sending
            twice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SmsProviders initial={rows} />
          <p className="mt-4 text-xs text-muted-foreground">
            Delivery reports:{" "}
            {env("ARKESEL_WEBHOOK_SECRET") ? "on (Arkesel)" : "off — set ARKESEL_WEBHOOK_SECRET"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            Online giving runs on Paystack. A provider switch will appear here once a second
            provider is live.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="font-medium">Paystack</span>
          <Badge variant={env("PAYSTACK_SECRET_KEY") ? "secondary" : "destructive"}>
            {env("PAYSTACK_SECRET_KEY") ? "Configured" : "Missing PAYSTACK_SECRET_KEY"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
