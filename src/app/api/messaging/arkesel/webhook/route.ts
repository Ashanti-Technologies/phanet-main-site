import type { NextRequest } from "next/server";
import { prisma } from "@/lib/database";
import { log } from "@/lib/logger";
import { mapArkeselStatus, verifyArkeselSignature } from "@/lib/messaging/providers/arkesel";

/**
 * Arkesel delivery reports: GET ?sms_id=…&status=…, signed with
 * ARKESEL_WEBHOOK_SECRET. The URL is sent as `callback_url` on every send.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.ARKESEL_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const ok = verifyArkeselSignature(
    params,
    req.headers.get("x-arkesel-webhook-timestamp"),
    req.headers.get("x-arkesel-webhook-signature"),
    secret,
  );
  if (!ok) {
    log.warn("sms", "arkesel webhook rejected", { smsId: params.sms_id });
    return new Response("Invalid signature", { status: 401 });
  }

  const status = mapArkeselStatus(params.status);
  if (params.sms_id && status) {
    // Only move forward (QUEUED → SENT → DELIVERED/FAILED), so late or
    // repeated callbacks are harmless.
    await prisma.messageLog.updateMany({
      where: {
        provider: "arkesel",
        providerRef: params.sms_id,
        status: { in: status === "SENT" ? ["QUEUED"] : ["QUEUED", "SENT"] },
      },
      data: { status, ...(status === "FAILED" && { error: `Arkesel: ${params.status}` }) },
    });
  }
  return new Response("ok");
}
