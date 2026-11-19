"use server";

import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import {
  projectImageSchema,
  projectImageReorderSchema,
  type ProjectImageInput,
  type ProjectImageReorderInput,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";

/**
 * Add an image to a project (Admin only)
 */
export async function addProjectImage(data: ProjectImageInput) {
  await requirePermission("update", "Project");

  const validated = projectImageSchema.parse(data);

  // Get max order for this project
  const maxOrder = await prisma.projectImage.aggregate({
    where: { projectId: validated.projectId },
    _max: { order: true },
  });

  const image = await prisma.projectImage.create({
    data: {
      projectId: validated.projectId,
      url: validated.url,
      publicId: validated.publicId,
      order: validated.order ?? (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath(`/admin/projects/${validated.projectId}`);
  revalidatePath(`/projects/${validated.projectId}`);

  return { success: true, image };
}

/**
 * Delete a project image (Admin only)
 */
export async function deleteProjectImage(id: string) {
  await requirePermission("update", "Project");

  const image = await prisma.projectImage.delete({
    where: { id },
  });

  revalidatePath(`/admin/projects/${image.projectId}`);
  revalidatePath(`/projects/${image.projectId}`);

  return { success: true };
}

/**
 * Reorder project images (Admin only)
 */
export async function reorderProjectImages(data: ProjectImageReorderInput) {
  await requirePermission("update", "Project");

  const validated = projectImageReorderSchema.parse(data);

  await prisma.$transaction(
    validated.imageIds.map((id, index) =>
      prisma.projectImage.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath(`/admin/projects/${validated.projectId}`);
  revalidatePath(`/projects/${validated.projectId}`);

  return { success: true };
}
