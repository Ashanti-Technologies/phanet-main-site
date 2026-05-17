"use server";

import { prisma } from "@/lib/database";
import { requireAdmin, requireAuth, getSessionOrNull } from "@/lib/auth-guard";
import {
  commitmentCreateSchema,
  commitmentStatusUpdateSchema,
  commitmentFiltersSchema,
  manualFinanceUpdateSchema,
  type CommitmentCreateInput,
  type CommitmentStatusUpdateInput,
  type CommitmentFiltersInput,
  type ManualFinanceUpdateInput,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { sendAdminNotification, sendDonorConfirmation } from "@/lib/email";
import { getPostHogClient } from "@/lib/posthog-server";

export type CommitmentWithRelations = Prisma.CommitmentGetPayload<{
  include: {
    project: true;
    user: true;
  };
}>;

/**
 * Create a new commitment (Authenticated users only)
 */
export async function createCommitment(data: CommitmentCreateInput) {
  const session = await requireAuth();

  const validated = commitmentCreateSchema.parse(data);

  // Check if project exists and is active
  const project = await prisma.project.findUnique({
    where: { id: validated.projectId },
  });

  if (!project || project.status !== "ACTIVE") {
    throw new Error("Project not found or not accepting contributions");
  }

  // For single sponsor mode, check if already has a confirmed commitment
  if (project.fundingMode === "SINGLE_SPONSOR") {
    const existingCommitment = await prisma.commitment.findFirst({
      where: {
        projectId: validated.projectId,
        status: "CONFIRMED",
      },
    });

    if (existingCommitment) {
      throw new Error("This project already has a sponsor");
    }
  }

  const commitment = await prisma.commitment.create({
    data: {
      projectId: validated.projectId,
      userId: session.user.id,
      fullName: validated.fullName,
      email: validated.email,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      address: validated.address || null,
      country: validated.country,
      churchUnit: validated.churchUnit || null,
      amountCommitted: new Prisma.Decimal(validated.amountCommitted),
      isAnonymous: validated.isAnonymous,
      status: "PENDING",
    },
    include: {
      project: true,
    },
  });

  // Send notification emails
  try {
    await sendAdminNotification(commitment);
    await sendDonorConfirmation(commitment);
  } catch (error) {
    console.error("Failed to send notification emails:", error);
  }

  // Track server-side commitment creation
  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.id,
    event: "commitment_created",
    properties: {
      commitment_id: commitment.id,
      project_id: commitment.projectId,
      project_title: commitment.project.title,
      amount: Number(commitment.amountCommitted),
      country: commitment.country,
      is_anonymous: commitment.isAnonymous,
      has_church_unit: !!commitment.churchUnit,
      funding_mode: commitment.project.fundingMode,
    },
  });
  posthog.identify({
    distinctId: session.user.id,
    properties: {
      email: session.user.email,
      name: session.user.name,
    },
  });

  revalidatePath(`/projects/${validated.projectId}`);
  revalidatePath("/admin/projects");

  return { success: true, commitment };
}

/**
 * Get commitments by project (Admin only)
 */
export async function getCommitmentsByProject(
  projectId: string,
  filters?: Partial<CommitmentFiltersInput>
) {
  await requireAdmin();

  const where: Prisma.CommitmentWhereInput = { projectId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const [commitments, total] = await Promise.all([
    prisma.commitment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.commitment.count({ where }),
  ]);

  return {
    commitments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get commitments for current user
 */
export async function getMyCommitments() {
  const session = await getSessionOrNull();

  if (!session?.user) {
    return [];
  }

  return prisma.commitment.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        select: { id: true, title: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Update commitment status (Admin only)
 */
export async function updateCommitmentStatus(
  data: CommitmentStatusUpdateInput
) {
  await requireAdmin();

  const validated = commitmentStatusUpdateSchema.parse(data);

  const commitment = await prisma.commitment.update({
    where: { id: validated.id },
    data: { status: validated.status },
    include: {
      project: true,
    },
  });

  revalidatePath(`/projects/${commitment.projectId}`);
  revalidatePath(`/admin/projects/${commitment.projectId}/commitments`);

  return { success: true, commitment };
}

/**
 * Get public thank-you wall data (non-anonymous confirmed commitments)
 */
export async function getThankYouWallData(projectId?: string) {
  const where: Prisma.CommitmentWhereInput = {
    status: "CONFIRMED",
    isAnonymous: false,
  };

  if (projectId) {
    where.projectId = projectId;
  }

  return prisma.commitment.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      country: true,
      churchUnit: true,
      amountCommitted: true,
      createdAt: true,
      project: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Export commitments to Excel format data (Admin only)
 */
export async function getCommitmentsForExport(projectId: string) {
  await requireAdmin();

  const commitments = await prisma.commitment.findMany({
    where: { projectId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return commitments.map((c) => ({
    "Full Name": c.fullName,
    Email: c.email,
    Phone: c.phone || "",
    WhatsApp: c.whatsapp || "",
    Country: c.country,
    "Church Unit": c.churchUnit || "",
    Amount: Number(c.amountCommitted),
    Anonymous: c.isAnonymous ? "Yes" : "No",
    Status: c.status,
    "Confirmed Amount": c.confirmedAmount ? Number(c.confirmedAmount) : "",
    "Confirmed Date": c.confirmedAt ? c.confirmedAt.toISOString() : "",
    "Payment Note": c.paymentNote || "",
    "Internal Note": c.internalNote || "",
    Date: c.createdAt.toISOString(),
  }));
}

/**
 * Update manual finance/admin fields for a commitment (Admin only)
 */
export async function updateCommitmentFinance(data: ManualFinanceUpdateInput) {
  await requireAdmin();

  const validated = manualFinanceUpdateSchema.parse(data);

  const commitment = await prisma.commitment.update({
    where: { id: validated.id },
    data: {
      status: validated.status,
      confirmedAmount:
        validated.confirmedAmount === undefined || validated.confirmedAmount === null
          ? null
          : new Prisma.Decimal(validated.confirmedAmount),
      confirmedAt: validated.confirmedAt ?? null,
      paymentNote: validated.paymentNote || null,
      internalNote: validated.internalNote || null,
    },
    include: { project: true },
  });

  revalidatePath(`/projects/${commitment.projectId}`);
  revalidatePath(`/admin/projects/${commitment.projectId}/commitments`);
  revalidatePath("/admin");

  return { success: true, commitment };
}
