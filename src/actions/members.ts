"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
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

export async function listMembers(input: Record<string, unknown> = {}) {
  await requirePermission("read", "Member");
  const filter = memberListFilterSchema.parse(input);

  const and: Prisma.MemberWhereInput[] = [];
  if (filter.q) {
    const q = filter.q;
    and.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { preferredName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { whatsapp: { contains: q } },
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
    and.push({ OR: filter.age.map((b) => ({ dob: ageBucketCondition(b) })) });
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

  return { items, total, page: filter.page, pageSize: filter.pageSize };
}

export async function getMemberById(id: string) {
  await requirePermission("read", "Member");
  const member = await prisma.member.findUnique({
    where: { id },
    include: memberInclude,
  });
  return member;
}

function memberWriteData(input: ReturnType<typeof memberCreateSchema.parse>) {
  const { unitIds: _u, tagIds: _t, country, ...rest } = input;
  return {
    ...rest,
    country: country ?? "Ghana",
  };
}

export async function createMember(input: MemberCreateInput) {
  const session = await requirePermission("create", "Member");
  const data = memberCreateSchema.parse(input);
  const writeData = memberWriteData(data);

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
  const session = await requirePermission("update", "Member");
  const data = memberUpdateSchema.parse(input);
  const writeData = memberWriteData(data);

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
  const session = await requirePermission("delete", "Member");
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

export async function getBirthdays(days = 7) {
  await requirePermission("read", "Member");
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
