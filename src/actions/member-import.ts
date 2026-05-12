"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const importRowSchema = z.object({
  fullName: z.string().trim().min(1),
  preferredName: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  dob: z.string().trim().optional().nullable(),
  gender: z.string().trim().optional().nullable(),
  maritalStatus: z.string().trim().optional().nullable(),
  addressLine: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  occupation: z.string().trim().optional().nullable(),
  joinDate: z.string().trim().optional().nullable(),
  status: z.string().trim().optional().nullable(),
  unitName: z.string().trim().optional().nullable(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

const importRowsSchema = z.array(importRowSchema).min(1).max(10_000);

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeGender(v: string | null | undefined): "MALE" | "FEMALE" | null {
  if (!v) return null;
  const t = v.trim().toLowerCase();
  if (t.startsWith("m")) return "MALE";
  if (t.startsWith("f")) return "FEMALE";
  return null;
}

const MARITAL = new Set(["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"]);
const STATUSES = new Set([
  "VISITOR",
  "PENDING_APPROVAL",
  "REGULAR",
  "MEMBER",
  "INACTIVE",
  "TRANSFERRED",
  "DECEASED",
]);

/**
 * Run a dry-run pass: return counts and a small sample of duplicates so the
 * client can show a preview before committing.
 */
export async function previewMemberImport(rows: ImportRow[]) {
  await requirePermission("import", "Member");
  const parsed = importRowsSchema.parse(rows);

  // Existing members keyed by lowercased email and digits-only phone.
  const emails = new Set(
    parsed
      .map((r) => r.email?.toLowerCase())
      .filter((v): v is string => !!v),
  );
  const phones = new Set(
    parsed
      .map((r) => digitsOnly(r.phone))
      .filter((v): v is string => !!v),
  );

  const [existingByEmail, existingByPhone] = await Promise.all([
    emails.size
      ? prisma.member.findMany({
          where: { email: { in: Array.from(emails) } },
          select: { email: true },
        })
      : [],
    phones.size
      ? prisma.member.findMany({
          where: { phone: { in: Array.from(phones) } },
          select: { phone: true },
        })
      : [],
  ]);

  const existingEmailSet = new Set(
    existingByEmail.map((m) => m.email?.toLowerCase()).filter(Boolean),
  );
  const existingPhoneSet = new Set(
    existingByPhone.map((m) => digitsOnly(m.phone)).filter(Boolean),
  );

  // Detect intra-batch duplicates too.
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  let duplicates = 0;
  let importable = 0;
  const sampleDuplicates: { row: number; reason: string; row_data: ImportRow }[] =
    [];

  parsed.forEach((row, i) => {
    const e = row.email?.toLowerCase();
    const p = digitsOnly(row.phone);
    let reason: string | null = null;
    if (e && existingEmailSet.has(e)) reason = "email already in directory";
    else if (p && existingPhoneSet.has(p)) reason = "phone already in directory";
    else if (e && seenEmails.has(e)) reason = "duplicate email within CSV";
    else if (p && seenPhones.has(p)) reason = "duplicate phone within CSV";

    if (reason) {
      duplicates += 1;
      if (sampleDuplicates.length < 10)
        sampleDuplicates.push({ row: i + 2, reason, row_data: row });
    } else {
      importable += 1;
      if (e) seenEmails.add(e);
      if (p) seenPhones.add(p);
    }
  });

  return {
    total: parsed.length,
    importable,
    duplicates,
    sampleDuplicates,
  };
}

function digitsOnly(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  return d.length >= 7 ? d : null;
}

/**
 * Commit the import. Skips rows that duplicate existing members (by email or
 * phone). Returns the ImportJob row.
 */
export async function runMemberImport(rows: ImportRow[]) {
  const session = await requirePermission("import", "Member");
  const parsed = importRowsSchema.parse(rows);

  const job = await prisma.importJob.create({
    data: {
      type: "member",
      status: "RUNNING",
      total: parsed.length,
      createdById: session.user.id,
      startedAt: new Date(),
    },
  });

  // Pre-fetch existing keys once.
  const emails = parsed
    .map((r) => r.email?.toLowerCase())
    .filter((v): v is string => !!v);
  const phones = parsed
    .map((r) => digitsOnly(r.phone))
    .filter((v): v is string => !!v);

  const [existingByEmail, existingByPhone, units] = await Promise.all([
    emails.length
      ? prisma.member.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
      : [],
    phones.length
      ? prisma.member.findMany({
          where: { phone: { in: phones } },
          select: { phone: true },
        })
      : [],
    prisma.churchUnitOption.findMany({
      select: { id: true, name: true },
    }),
  ]);
  const existingEmailSet = new Set(
    existingByEmail.map((m) => m.email?.toLowerCase()).filter(Boolean),
  );
  const existingPhoneSet = new Set(
    existingByPhone.map((m) => digitsOnly(m.phone)).filter(Boolean),
  );
  const unitsByLowerName = new Map(
    units.map((u) => [u.name.toLowerCase(), u.id]),
  );

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  type Prepared = {
    data: {
      fullName: string;
      preferredName: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      dob: Date | null;
      gender: "MALE" | "FEMALE" | null;
      maritalStatus: "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED" | null;
      addressLine: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      occupation: string | null;
      joinDate: Date | null;
      status:
        | "VISITOR"
        | "PENDING_APPROVAL"
        | "REGULAR"
        | "MEMBER"
        | "INACTIVE"
        | "TRANSFERRED"
        | "DECEASED";
    };
    unitId: string | null;
  };

  const toInsert: Prepared[] = [];
  const errors: { row: number; reason: string }[] = [];
  let skipped = 0;

  parsed.forEach((r, i) => {
    const e = r.email?.toLowerCase() ?? null;
    const p = digitsOnly(r.phone);
    if (
      (e && (existingEmailSet.has(e) || seenEmails.has(e))) ||
      (p && (existingPhoneSet.has(p) || seenPhones.has(p)))
    ) {
      skipped += 1;
      return;
    }
    if (e) seenEmails.add(e);
    if (p) seenPhones.add(p);

    const marital = r.maritalStatus?.toUpperCase() ?? null;
    const status = r.status?.toUpperCase() ?? null;

    toInsert.push({
      data: {
        fullName: r.fullName,
        preferredName: r.preferredName || null,
        email: r.email || null,
        phone: r.phone || null,
        whatsapp: r.whatsapp || null,
        dob: toDate(r.dob),
        gender: normalizeGender(r.gender),
        maritalStatus:
          marital && MARITAL.has(marital)
            ? (marital as Prepared["data"]["maritalStatus"])
            : null,
        addressLine: r.addressLine || null,
        city: r.city || null,
        region: r.region || null,
        country: r.country || "Ghana",
        occupation: r.occupation || null,
        joinDate: toDate(r.joinDate),
        status:
          status && STATUSES.has(status)
            ? (status as Prepared["data"]["status"])
            : "VISITOR",
      },
      unitId: r.unitName ? unitsByLowerName.get(r.unitName.toLowerCase()) ?? null : null,
    });
    if (r.unitName && !unitsByLowerName.get(r.unitName.toLowerCase())) {
      errors.push({ row: i + 2, reason: `unknown unit "${r.unitName}" — ignored` });
    }
  });

  // Batched insert. Use createMany then loop to attach units (createMany
  // doesn't return ids in postgres for cuid defaults). For batches with units
  // we fall back to individual creates so we can link MemberUnit too.
  const BATCH = 200;
  let created = 0;

  // Split into two groups: those with a unitId and those without.
  const withUnit = toInsert.filter((p) => p.unitId);
  const withoutUnit = toInsert.filter((p) => !p.unitId);

  // Bulk path
  for (let i = 0; i < withoutUnit.length; i += BATCH) {
    const slice = withoutUnit.slice(i, i + BATCH).map((p) => p.data);
    const res = await prisma.member.createMany({
      data: slice,
      skipDuplicates: true,
    });
    created += res.count;
  }

  // Per-row path for those needing unit linking
  for (let i = 0; i < withUnit.length; i += BATCH) {
    const slice = withUnit.slice(i, i + BATCH);
    await prisma.$transaction(
      slice.map((p) =>
        prisma.member.create({
          data: {
            ...p.data,
            units: p.unitId ? { create: [{ unitId: p.unitId }] } : undefined,
          },
        }),
      ),
    );
    created += slice.length;
  }

  const finished = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: errors.length && created === 0 ? "FAILED" : "COMPLETED",
      processed: parsed.length,
      created,
      skipped,
      failed: parsed.length - created - skipped,
      errors: errors.length ? errors : undefined,
      finishedAt: new Date(),
    },
  });

  await logAudit({
    action: "member.import",
    subject: "Member",
    subjectId: job.id,
    meta: { total: parsed.length, created, skipped, errors: errors.length },
    actorId: session.user.id,
  });

  revalidatePath("/admin/members");
  return finished;
}
