"use server";

import { prisma } from "@/lib/database";
import { requireAdmin } from "@/lib/auth-guard";
import {
  churchUnitCreateSchema,
  churchUnitUpdateSchema,
  type ChurchUnitCreateInput,
  type ChurchUnitUpdateInput,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";

/**
 * Get all church unit options (Public)
 */
export async function getChurchUnits(activeOnly = true) {
  return prisma.churchUnitOption.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { order: "asc" },
  });
}

/**
 * Create a new church unit option (Admin only)
 */
export async function createChurchUnit(data: ChurchUnitCreateInput) {
  await requireAdmin();

  const validated = churchUnitCreateSchema.parse(data);

  // Get max order
  const maxOrder = await prisma.churchUnitOption.aggregate({
    _max: { order: true },
  });

  const churchUnit = await prisma.churchUnitOption.create({
    data: {
      name: validated.name,
      isActive: validated.isActive,
      order: validated.order ?? (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath("/admin/settings/church-units");

  return { success: true, churchUnit };
}

/**
 * Update a church unit option (Admin only)
 */
export async function updateChurchUnit(data: ChurchUnitUpdateInput) {
  await requireAdmin();

  const validated = churchUnitUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  const churchUnit = await prisma.churchUnitOption.update({
    where: { id },
    data: {
      ...(updateData.name && { name: updateData.name }),
      ...(typeof updateData.isActive === "boolean" && {
        isActive: updateData.isActive,
      }),
      ...(typeof updateData.order === "number" && { order: updateData.order }),
    },
  });

  revalidatePath("/admin/settings/church-units");

  return { success: true, churchUnit };
}

/**
 * Delete a church unit option (Admin only)
 */
export async function deleteChurchUnit(id: string) {
  await requireAdmin();

  await prisma.churchUnitOption.delete({
    where: { id },
  });

  revalidatePath("/admin/settings/church-units");

  return { success: true };
}

/**
 * Reorder church unit options (Admin only)
 */
export async function reorderChurchUnits(orderedIds: string[]) {
  await requireAdmin();

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.churchUnitOption.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath("/admin/settings/church-units");

  return { success: true };
}
