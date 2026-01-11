"use server";

import { prisma } from "@/lib/database";
import { requireAdmin } from "@/lib/auth-guard";
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectStatusSchema,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  type ProjectStatusInput,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    images: true;
    commitments: true;
  };
}>;

/**
 * Get all projects with optional filtering
 */
export async function getProjects(options?: {
  status?: "ACTIVE" | "DISABLED" | "FULFILLED";
  includeCommitments?: boolean;
}) {
  const where: Prisma.ProjectWhereInput = {};

  if (options?.status) {
    where.status = options.status;
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      images: {
        orderBy: { order: "asc" },
      },
      commitments: options?.includeCommitments
        ? {
            where: { status: "CONFIRMED" },
          }
        : false,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate amount raised for each project
  return projects.map((project) => ({
    ...project,
    amountRaised: project.commitments
      ? project.commitments.reduce(
          (sum, c) => sum + Number(c.amountCommitted),
          0
        )
      : 0,
  }));
}

/**
 * Get a single project by ID
 */
export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { order: "asc" },
      },
      commitments: {
        where: { status: "CONFIRMED" },
      },
      proofUploads: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) return null;

  return {
    ...project,
    amountRaised: project.commitments.reduce(
      (sum, c) => sum + Number(c.amountCommitted),
      0
    ),
  };
}

/**
 * Create a new project (Admin only)
 */
export async function createProject(data: ProjectCreateInput) {
  await requireAdmin();

  const validated = projectCreateSchema.parse(data);

  const project = await prisma.project.create({
    data: {
      title: validated.title,
      description: validated.description,
      targetAmount: new Prisma.Decimal(validated.targetAmount),
      fundingMode: validated.fundingMode,
      status: validated.status || "ACTIVE",
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath("/projects");

  return { success: true, project };
}

/**
 * Update an existing project (Admin only)
 */
export async function updateProject(data: ProjectUpdateInput) {
  await requireAdmin();

  const validated = projectUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.description && { description: updateData.description }),
      ...(updateData.targetAmount && {
        targetAmount: new Prisma.Decimal(updateData.targetAmount),
      }),
      ...(updateData.fundingMode && { fundingMode: updateData.fundingMode }),
      ...(updateData.status && { status: updateData.status }),
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);

  return { success: true, project };
}

/**
 * Delete a project (Admin only)
 */
export async function deleteProject(id: string) {
  await requireAdmin();

  await prisma.project.delete({
    where: { id },
  });

  revalidatePath("/admin/projects");
  revalidatePath("/projects");

  return { success: true };
}

/**
 * Update project status (Admin only)
 */
export async function updateProjectStatus(data: ProjectStatusInput) {
  await requireAdmin();

  const validated = projectStatusSchema.parse(data);

  const project = await prisma.project.update({
    where: { id: validated.id },
    data: { status: validated.status },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${validated.id}`);
  revalidatePath("/projects");
  revalidatePath(`/projects/${validated.id}`);

  return { success: true, project };
}

/**
 * Mark a project as fulfilled (Admin only)
 */
export async function markProjectAsFulfilled(id: string) {
  return updateProjectStatus({ id, status: "FULFILLED" });
}
