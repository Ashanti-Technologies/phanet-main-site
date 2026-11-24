"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { assertNotPreviewing, requireSuperAdmin } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { SMS_ADAPTERS, SMS_SETTING_KEY } from "@/lib/messaging/failover";
import { normalizeGhanaPhone } from "@/lib/messaging/utils";
import {
  smsProvidersSchema,
  testSmsSchema,
  type SmsProvidersInput,
  type TestSmsInput,
} from "@/lib/schemas/integration.schema";

/** Save the SMS failover order and which providers are switched on. */
export async function saveSmsProviders(input: SmsProvidersInput) {
  const session = await requireSuperAdmin();
  await assertNotPreviewing();
  const value = smsProvidersSchema.parse(input);
  await prisma.integrationSetting.upsert({
    where: { key: SMS_SETTING_KEY },
    create: { key: SMS_SETTING_KEY, value },
    update: { value },
  });
  await logAudit({
    action: "integration.sms_providers",
    subject: "IntegrationSetting",
    subjectId: SMS_SETTING_KEY,
    meta: value,
    actorId: session.user.id,
  });
  revalidatePath("/admin/settings/integrations");
  return { success: true };
}

/** Send a test SMS through one specific provider (no failover). */
export async function sendTestSms(input: TestSmsInput) {
  const session = await requireSuperAdmin();
  await assertNotPreviewing();
  const { provider, phone } = testSmsSchema.parse(input);
  const to = normalizeGhanaPhone(phone) ?? phone;
  const res = await SMS_ADAPTERS[provider]().send({
    to,
    body: "PHANET test message: SMS is working.",
  });
  await logAudit({
    action: "integration.test_sms",
    subject: "IntegrationSetting",
    subjectId: provider,
    meta: { to, ok: res.ok, error: res.error ?? null },
    actorId: session.user.id,
  });
  return { ok: res.ok, error: res.error ?? null, providerRef: res.providerRef ?? null };
}
