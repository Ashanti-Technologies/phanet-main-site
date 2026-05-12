import { prisma } from "./database";
import { getSessionOrNull } from "./auth-guard";
import type { Prisma } from "@/app/generated/prisma/client";

export interface AuditLogInput {
  action: string;
  subject: string;
  subjectId?: string | null;
  meta?: Prisma.InputJsonValue;
  /** Override the actor — defaults to the current session's user id. */
  actorId?: string;
}

/**
 * Append a row to the audit log. Failures are swallowed (logged) — auditing
 * must never block the action being audited.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  let actorId = input.actorId;
  if (!actorId) {
    const session = await getSessionOrNull();
    actorId = session?.user?.id;
  }
  if (!actorId) return; // no one to attribute to — skip silently

  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: input.action,
        subject: input.subject,
        subjectId: input.subjectId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to log", input.action, err);
  }
}
