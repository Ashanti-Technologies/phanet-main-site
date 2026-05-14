import { getMessagingService } from "./messaging";
import { renderEmail } from "./email-templates/render";
import { CommitmentReceivedAdminEmail } from "./email-templates/CommitmentReceivedAdminEmail";
import { CommitmentReceivedDonorEmail } from "./email-templates/CommitmentReceivedDonorEmail";
import { CommitmentStatusUpdateEmail } from "./email-templates/CommitmentStatusUpdateEmail";

const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || "admin@phanerosisnetwork.com";

interface CommitmentData {
  id: string;
  fullName: string;
  email: string;
  amountCommitted: number | string | { toString(): string };
  country: string;
  churchUnit?: string | null;
  project: {
    id: string;
    title: string;
  };
}

const email = getMessagingService("EMAIL");

/**
 * Send notification email to admin when a new commitment is made.
 */
export async function sendAdminNotification(commitment: CommitmentData) {
  const adminUrl = `${process.env.BETTER_AUTH_URL ?? ""}/admin/projects/${commitment.project.id}/commitments`;
  const { html, text } = await renderEmail(
    CommitmentReceivedAdminEmail({
      donorName: commitment.fullName,
      donorEmail: commitment.email,
      projectTitle: commitment.project.title,
      projectId: commitment.project.id,
      amount: Number(commitment.amountCommitted),
      country: commitment.country,
      churchUnit: commitment.churchUnit,
      adminUrl,
    }),
  );
  const result = await email.send({
    to: ADMIN_EMAIL,
    subject: `New Commitment: ${commitment.project.title}`,
    body: html,
    text,
  });
  if (!result.ok) {
    console.error("Failed to send admin notification:", result.error);
  }
  return result;
}

/**
 * Send confirmation email to donor after commitment.
 */
export async function sendDonorConfirmation(commitment: CommitmentData) {
  const { html, text } = await renderEmail(
    CommitmentReceivedDonorEmail({
      fullName: commitment.fullName,
      projectTitle: commitment.project.title,
      amount: Number(commitment.amountCommitted),
    }),
  );
  const result = await email.send({
    to: commitment.email,
    subject: `Thank you for your commitment - ${commitment.project.title}`,
    body: html,
    text,
  });
  if (!result.ok) {
    console.error("Failed to send donor confirmation:", result.error);
  }
  return result;
}

/**
 * Send status update email to donor.
 */
export async function sendStatusUpdate(
  commitment: CommitmentData,
  newStatus: "CONFIRMED" | "CANCELLED",
) {
  const isConfirmed = newStatus === "CONFIRMED";
  const subject = isConfirmed
    ? `Great news! Your commitment has been confirmed - ${commitment.project.title}`
    : `Update on your commitment - ${commitment.project.title}`;

  const { html, text } = await renderEmail(
    CommitmentStatusUpdateEmail({
      fullName: commitment.fullName,
      projectTitle: commitment.project.title,
      amount: Number(commitment.amountCommitted),
      status: newStatus,
    }),
  );
  const result = await email.send({
    to: commitment.email,
    subject,
    body: html,
    text,
  });
  if (!result.ok) {
    console.error("Failed to send status update:", result.error);
  }
  return result;
}
