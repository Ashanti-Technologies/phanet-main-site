"use server";

import { prisma } from "@/lib/database";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import {
  proofUploadCreateSchema,
  type ProofUploadCreateInput,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";

/**
 * Get proof uploads for a project (Public)
 */
export async function getProofsByProject(projectId: string) {
  return prisma.proofUpload.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Upload a proof image (Admin only)
 */
export async function createProofUpload(data: ProofUploadCreateInput) {
  await requireAdmin();
  await requirePermission("create", "ProofUpload");

  const validated = proofUploadCreateSchema.parse(data);

  const proof = await prisma.proofUpload.create({
    data: {
      projectId: validated.projectId,
      imageUrl: validated.imageUrl,
      publicId: validated.publicId,
      note: validated.note || null,
    },
  });

  revalidatePath(`/admin/projects/${validated.projectId}/proofs`);
  revalidatePath(`/projects/${validated.projectId}`);

  return { success: true, proof };
}

/**
 * Delete a proof upload (Admin only)
 */
export async function deleteProofUpload(id: string) {
  await requireAdmin();
  await requirePermission("delete", "ProofUpload");

  const proof = await prisma.proofUpload.delete({
    where: { id },
  });

  revalidatePath(`/admin/projects/${proof.projectId}/proofs`);
  revalidatePath(`/projects/${proof.projectId}`);

  return { success: true };
}
