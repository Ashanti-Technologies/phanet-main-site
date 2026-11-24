"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { resolveMemberLocation } from "@/lib/member-location";
import { requireOrgWide, requirePermission, scopeOf } from "@/lib/auth-guard";
import { z } from "zod";
import {
  memberCreateSchema,
  memberUpdateSchema,
  memberListFilterSchema,
  type MemberCreateInput,
  type MemberUpdateInput,
} from "@/lib/schemas/member.schema";

type MemberListFilter = z.output<typeof memberListFilterSchema>;
import { logAudit } from "@/lib/audit";
import { mergeMembers } from "@/lib/member-merge";

const memberInclude = {
  units: { include: { unit: { select: { id: true, name: true } } } },
  tags: { include: { tag: { select: { id: true, label: true, color: true } } } },
  household: { select: { id: true, name: true } },
  user: { select: { id: true, email: true } },
  countryRef: { select: { id: true, name: true, code: true } },
  regionRef: { select: { id: true, name: true } },
  phanetProfile: true,
} as const;

export type MemberWithRelations = Prisma.MemberGetPayload<{
  include: typeof memberInclude;
}>;

function ageBucketCondition(bucket: MemberListFilter["age"][number]) {
  const now = new Date();
  const yearsAgo = (y: number) => new Date(now.getFullYear() - y, now.getMonth(), now.getDate());
  switch (bucket) {
    case "under18":
      return { gte: yearsAgo(18) };
    case "18-29":
      return { gte: yearsAgo(30), lt: yearsAgo(18) };
    case "30-49":
      return { gte: yearsAgo(50), lt: yearsAgo(30) };
    case "50-69":
      return { gte: yearsAgo(70), lt: yearsAgo(50) };
    case "70plus":
      return { lt: yearsAgo(70) };
  }
}

/** Unit-scoped admins only reach members of their own units. */
async function memberScope(action: "read" | "update"): Promise<Prisma.MemberWhereInput> {
  const scope = await scopeOf(action, "Member");
  return scope === "all" ? {} : { units: { some: { unitId: { in: scope } } } };
}

type ContactScope = "all" | string[];

/** Whether contact details of a member in `unitIds` are visible under `scope`. */
function contactVisible(scope: ContactScope, unitIds: string[]) {
  return scope === "all" || unitIds.some((u) => scope.includes(u));
}

/**
 * Blank contact fields the viewer may not see (members.contact). Done on the
 * server so the values never reach the browser.
 */
function redactContact<
  T extends {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    addressLine: string | null;
    units: { unitId: string }[];
    user: { id: string; email: string } | null;
  },
>(member: T, scope: ContactScope): T & { contactHidden: boolean } {
  if (contactVisible(scope, member.units.map((u) => u.unitId))) {
    return { ...member, contactHidden: false };
  }
  return {
    ...member,
    email: null,
    phone: null,
    whatsapp: null,
    addressLine: null,
    user: member.user && { ...member.user, email: "" },
    contactHidden: true,
  };
}

async function memberUnitIds(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    select: { userId: true, units: { select: { unitId: true } } },
  });
  if (!member) throw new Error("Member not found");
  return { userId: member.userId, unitIds: member.units.map((u) => u.unitId) };
}

export async function listMembers(input: Record<string, unknown> = {}) {
  await requirePermission("read", "Member");
  const filter = memberListFilterSchema.parse(input);
  const contactScope = await scopeOf("read", "MemberContact");

  const and: Prisma.MemberWhereInput[] = [await memberScope("read")];
  if (filter.q) {
    const q = filter.q;
    and.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { preferredName: { contains: q, mode: "insensitive" } },
        // Without full contact access, searching by phone/email would let
        // someone probe for numbers they can't see.
        ...(contactScope === "all"
          ? [
              { email: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
              { whatsapp: { contains: q } },
            ]
          : []),
      ],
    });
  }
  if (filter.householdId) and.push({ householdId: filter.householdId });
  if (filter.status.length) and.push({ status: { in: filter.status } });
  if (filter.units.length)
    and.push({ units: { some: { unitId: { in: filter.units } } } });
  if (filter.tags.length)
    and.push({ tags: { some: { tagId: { in: filter.tags } } } });
  if (filter.age.length)
    and.push({
      OR: filter.age.flatMap((b): Prisma.MemberWhereInput[] => [
        { dob: ageBucketCondition(b) },
        // Children added on event bookings have no dob; their age group stands in.
        ...(b === "under18"
          ? [{ dob: null, eventAttendances: { some: { ageGroup: { in: ["INFANT", "CHILD", "TEEN"] } } } } satisfies Prisma.MemberWhereInput]
          : []),
      ]),
    });
  const where: Prisma.MemberWhereInput = { AND: and };

  const dir = filter.sort?.desc ? "desc" : "asc";
  const orderBy: Prisma.MemberOrderByWithRelationInput =
    filter.sort?.id === "joinDate"
      ? { joinDate: { sort: dir, nulls: "last" } }
      : { fullName: dir };

  const [total, items] = await prisma.$transaction([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      orderBy,
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: memberInclude,
    }),
  ]);

  return {
    items: items.map((m) => redactContact(m, contactScope)),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

export async function getMemberById(id: string) {
  await requirePermission("read", "Member");
  const member = await prisma.member.findUnique({
    where: { id },
    include: memberInclude,
  });
  if (!member) return null;
  await requirePermission("read", "Member", {
    userId: member.userId,
    unitIds: member.units.map((u) => u.unitId),
  });
  return redactContact(member, await scopeOf("read", "MemberContact"));
}

async function memberWriteData(input: ReturnType<typeof memberCreateSchema.parse>) {
  const { unitIds: _u, tagIds: _t, ...rest } = input;
  return { ...rest, ...(await resolveMemberLocation(rest)) };
}

export async function createMember(input: MemberCreateInput) {
  const data = memberCreateSchema.parse(input);
  const session = await requirePermission("create", "Member", { unitIds: data.unitIds });
  const writeData = await memberWriteData(data);

  const member = await prisma.member.create({
    data: {
      ...writeData,
      units: data.unitIds.length
        ? { create: data.unitIds.map((unitId) => ({ unitId })) }
        : undefined,
      tags: data.tagIds.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: memberInclude,
  });

  await logAudit({
    action: "member.create",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/admin/members");
  return { success: true, data: member };
}

export async function updateMember(input: MemberUpdateInput) {
  const data = memberUpdateSchema.parse(input);
  // Must be allowed on the member as it is AND as it will be (a unit leader
  // can't move someone out of their own reach, or into another unit only).
  const current = await memberUnitIds(data.id);
  await requirePermission("update", "Member", { unitIds: current.unitIds });
  // The edit form submits contact fields; without seeing them it would wipe them.
  await requirePermission("read", "MemberContact", { unitIds: current.unitIds });
  const session = await requirePermission("update", "Member", { unitIds: data.unitIds });
  const writeData = await memberWriteData(data);

  const member = await prisma.$transaction(async (tx) => {
    await tx.memberUnit.deleteMany({ where: { memberId: data.id } });
    await tx.memberTag.deleteMany({ where: { memberId: data.id } });
    return tx.member.update({
      where: { id: data.id },
      data: {
        ...writeData,
        units: data.unitIds.length
          ? { create: data.unitIds.map((unitId) => ({ unitId })) }
          : undefined,
        tags: data.tagIds.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: memberInclude,
    });
  });

  await logAudit({
    action: "member.update",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${member.id}`);
  return { success: true, data: member };
}

export async function deleteMember(id: string) {
  const session = await requirePermission("delete", "Member", {
    unitIds: (await memberUnitIds(id)).unitIds,
  });
  await prisma.member.delete({ where: { id } });
  await logAudit({
    action: "member.delete",
    subject: "Member",
    subjectId: id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/members");
  return { success: true };
}

/** Merge duplicate `dropId` into `keepId` (see mergeMembers); the duplicate is deleted. */
export async function mergeMemberInto(keepId: string, dropId: string) {
  const [keep, drop] = await Promise.all([memberUnitIds(keepId), memberUnitIds(dropId)]);
  const session = await requirePermission("update", "Member", keep);
  await requirePermission("delete", "Member", drop);
  // Contact fields move between the records, so both must be fully visible.
  await requirePermission("read", "MemberContact", keep);
  await requirePermission("read", "MemberContact", drop);

  const res = await mergeMembers(keepId, dropId);
  if (!res.ok) return { success: false as const, error: res.error };
  await logAudit({
    action: "member.merge",
    subject: "Member",
    subjectId: keepId,
    actorId: session.user.id,
    meta: { mergedId: dropId, mergedName: res.droppedName },
  });
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${keepId}`);
  return { success: true as const };
}

export async function getBirthdays(days = 7) {
  await requireOrgWide("read", "Member");
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const month = start.getMonth() + 1;
  const day = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  // Postgres-native: extract month/day and compare against window. Handles
  // year-end wrap by splitting into two ranges when needed.
  type Row = {
    id: string;
    fullName: string;
    preferredName: string | null;
    dob: Date;
    photoUrl: string | null;
  };
  const sql =
    month <= endMonth
      ? Prisma.sql`
        SELECT id, "fullName", "preferredName", dob, "photoUrl"
        FROM member
        WHERE dob IS NOT NULL
          AND (
            (EXTRACT(MONTH FROM dob)::int = ${month} AND EXTRACT(DAY FROM dob)::int >= ${day})
            OR (EXTRACT(MONTH FROM dob)::int > ${month} AND EXTRACT(MONTH FROM dob)::int < ${endMonth})
            OR (EXTRACT(MONTH FROM dob)::int = ${endMonth} AND EXTRACT(DAY FROM dob)::int <= ${endDay})
          )
        ORDER BY EXTRACT(MONTH FROM dob), EXTRACT(DAY FROM dob)
        LIMIT 50;
      `
      : Prisma.sql`
        SELECT id, "fullName", "preferredName", dob, "photoUrl"
        FROM member
        WHERE dob IS NOT NULL
          AND (
            (EXTRACT(MONTH FROM dob)::int = ${month} AND EXTRACT(DAY FROM dob)::int >= ${day})
            OR EXTRACT(MONTH FROM dob)::int > ${month}
            OR EXTRACT(MONTH FROM dob)::int < ${endMonth}
            OR (EXTRACT(MONTH FROM dob)::int = ${endMonth} AND EXTRACT(DAY FROM dob)::int <= ${endDay})
          )
        ORDER BY EXTRACT(MONTH FROM dob), EXTRACT(DAY FROM dob)
        LIMIT 50;
      `;
  return prisma.$queryRaw<Row[]>(sql);
}
