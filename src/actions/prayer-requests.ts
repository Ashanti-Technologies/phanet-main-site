"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import {
  prayerRequestUpdateSchema,
  type PrayerRequestUpdateInput,
} from "@/lib/schemas";

export async function getAdminPrayerRequests() {
  await requirePermission("read", "PrayerRequest");
  return prisma.prayerRequest.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updatePrayerRequest(input: PrayerRequestUpdateInput) {
  await requirePermission("update", "PrayerRequest");
  const data = prayerRequestUpdateSchema.parse(input);
  const now = new Date();

  const prayer = await prisma.prayerRequest.update({
    where: { id: data.id },
    data: {
      status: data.status,
      adminNote: data.adminNote || null,
      prayedAt: data.status === "PRAYED" ? now : undefined,
      archivedAt: data.status === "ARCHIVED" ? now : undefined,
    },
  });

  revalidatePath("/admin/prayer-requests");
  return { success: true, data: prayer };
}

export async function deletePrayerRequest(id: string) {
  await requirePermission("delete", "PrayerRequest");
  const prayer = await prisma.prayerRequest.delete({ where: { id } });
  revalidatePath("/admin/prayer-requests");
  return { success: true, data: prayer };
}
