"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { getServerAuthSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import { adminUserRoleSchema, type AdminUserRoleInput } from "@/lib/schemas";

export async function getAdminUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}

export async function updateUserRole(input: AdminUserRoleInput) {
  await requireAdmin();
  const session = await getServerAuthSession();
  const data = adminUserRoleSchema.parse(input);

  if (session?.user.id === data.userId && data.role !== "admin") {
    throw new Error("You cannot remove your own admin access.");
  }

  const user = await prisma.user.update({
    where: { id: data.userId },
    data: { role: data.role === "admin" ? "admin" : "user" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  revalidatePath("/admin/users");
  return { success: true, data: user };
}
