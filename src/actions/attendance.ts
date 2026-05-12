"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  serviceCreateSchema,
  serviceUpdateSchema,
  attendanceMarkSchema,
  attendanceRemoveSchema,
  type AttendanceMarkInput,
  type AttendanceRemoveInput,
  type ServiceCreateInput,
  type ServiceUpdateInput,
} from "@/lib/schemas/attendance.schema";

// ------------------------------ Services ------------------------------

export async function listServices(opts: { upcoming?: boolean } = {}) {
  await requirePermission("read", "Service");
  return prisma.service.findMany({
    where: opts.upcoming ? { date: { gte: new Date() } } : undefined,
    orderBy: { date: "desc" },
    include: { _count: { select: { attendance: true } } },
    take: 100,
  });
}

export async function getService(id: string) {
  await requirePermission("read", "Service");
  return prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { attendance: true } } },
  });
}

export async function createService(input: ServiceCreateInput) {
  const session = await requirePermission("create", "Service");
  const data = serviceCreateSchema.parse(input);
  const service = await prisma.service.create({ data });
  await logAudit({
    action: "service.create",
    subject: "Service",
    subjectId: service.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/services");
  return { success: true, data: service };
}

export async function updateService(input: ServiceUpdateInput) {
  const session = await requirePermission("update", "Service");
  const data = serviceUpdateSchema.parse(input);
  const service = await prisma.service.update({
    where: { id: data.id },
    data: {
      title: data.title,
      date: data.date,
      location: data.location,
      notes: data.notes,
    },
  });
  await logAudit({
    action: "service.update",
    subject: "Service",
    subjectId: service.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${service.id}`);
  return { success: true, data: service };
}

export async function deleteService(id: string) {
  const session = await requirePermission("delete", "Service");
  await prisma.service.delete({ where: { id } });
  await logAudit({
    action: "service.delete",
    subject: "Service",
    subjectId: id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/services");
  return { success: true };
}

// ---------------------------- Check-in ----------------------------

export async function searchMembersForCheckIn(serviceId: string, q: string) {
  await requirePermission("read", "Member");
  const trimmed = q.trim();
  if (trimmed.length < 2) return { items: [], checkedInIds: [] };

  const where: Prisma.MemberWhereInput = {
    OR: [
      { fullName: { contains: trimmed, mode: "insensitive" } },
      { preferredName: { contains: trimmed, mode: "insensitive" } },
      { phone: { contains: trimmed } },
      { email: { contains: trimmed, mode: "insensitive" } },
    ],
    status: { notIn: ["DECEASED", "TRANSFERRED"] },
  };

  const [members, attended] = await Promise.all([
    prisma.member.findMany({
      where,
      take: 20,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        photoUrl: true,
        phone: true,
        units: {
          take: 1,
          select: { unit: { select: { name: true } } },
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        serviceId,
        memberId: { in: [] }, // filled below
      },
      select: { memberId: true },
    }),
  ]);

  const memberIds = members.map((m) => m.id);
  const presentSet = memberIds.length
    ? new Set(
        (
          await prisma.attendance.findMany({
            where: { serviceId, memberId: { in: memberIds } },
            select: { memberId: true },
          })
        ).map((a) => a.memberId),
      )
    : new Set<string>();

  return {
    items: members,
    checkedInIds: Array.from(presentSet),
    _attended: attended, // unused, just kept for type inference
  };
}

export async function getAttendanceForService(serviceId: string) {
  await requirePermission("read", "Attendance");
  return prisma.attendance.findMany({
    where: { serviceId },
    orderBy: { checkedInAt: "desc" },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          preferredName: true,
          photoUrl: true,
        },
      },
    },
  });
}

export async function recordAttendance(input: AttendanceMarkInput) {
  const session = await requirePermission("create", "Attendance");
  const data = attendanceMarkSchema.parse(input);
  await prisma.attendance.upsert({
    where: {
      memberId_serviceId: {
        memberId: data.memberId,
        serviceId: data.serviceId,
      },
    },
    create: {
      memberId: data.memberId,
      serviceId: data.serviceId,
      method: data.method,
      checkedInById: session.user.id,
    },
    update: {
      method: data.method,
      checkedInAt: new Date(),
      checkedInById: session.user.id,
    },
  });
  revalidatePath(`/admin/services/${data.serviceId}/check-in`);
  return { success: true };
}

export async function removeAttendance(input: AttendanceRemoveInput) {
  await requirePermission("delete", "Attendance");
  const data = attendanceRemoveSchema.parse(input);
  await prisma.attendance.deleteMany({
    where: { memberId: data.memberId, serviceId: data.serviceId },
  });
  revalidatePath(`/admin/services/${data.serviceId}/check-in`);
  return { success: true };
}

// ---------------------------- Drop-off ----------------------------

export async function getDropoffMembers(weeksThreshold = 4, limit = 30) {
  await requirePermission("read", "Member");
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - weeksThreshold * 7);

  // Members whose most-recent attendance is older than the threshold, OR who
  // have attended at least once historically but not in the window. Skip
  // members who have never attended (we can't tell if they're dropping off).
  type Row = {
    id: string;
    fullName: string;
    preferredName: string | null;
    photoUrl: string | null;
    last_attended: Date | null;
  };
  return prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT m.id, m."fullName", m."preferredName", m."photoUrl",
           MAX(a."checkedInAt") AS last_attended
    FROM member m
    JOIN attendance a ON a."memberId" = m.id
    WHERE m.status NOT IN ('DECEASED','TRANSFERRED','INACTIVE')
    GROUP BY m.id
    HAVING MAX(a."checkedInAt") < ${threshold}
    ORDER BY MAX(a."checkedInAt") ASC
    LIMIT ${limit};
  `);
}
