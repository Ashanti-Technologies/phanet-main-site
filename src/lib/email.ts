import { log } from "./logger";
import { getMessagingService } from "./messaging";
import { renderEmail } from "./email-templates/render";
import { CommitmentReceivedAdminEmail } from "./email-templates/CommitmentReceivedAdminEmail";
import { CommitmentReceivedDonorEmail } from "./email-templates/CommitmentReceivedDonorEmail";
import { CommitmentStatusUpdateEmail } from "./email-templates/CommitmentStatusUpdateEmail";
import { GiftReceivedEmail, type GiftReceivedEmailProps } from "./email-templates/GiftReceivedEmail";
import { MonthlyGiftPausedEmail, type MonthlyGiftPausedEmailProps } from "./email-templates/MonthlyGiftPausedEmail";

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
    log.error("email", "admin notification failed", { err: result.error });
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
    log.error("email", "donor confirmation failed", { err: result.error });
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
    log.error("email", "status update failed", { err: result.error });
  }
  return result;
}

/**
 * Receipt for an online gift once the payment provider has confirmed it.
 */
export async function sendGiftReceipt(gift: GiftReceivedEmailProps & { to: string }) {
  const { to, ...props } = gift;
  const { html, text } = await renderEmail(GiftReceivedEmail(props));
  const result = await email.send({
    to,
    subject: `Gift received — ${props.amount}`,
    body: html,
    text,
  });
  if (!result.ok) {
    log.error("email", "gift receipt failed", { err: result.error });
  }
  return result;
}

/**
 * Tell a giver their monthly gift stopped after repeated declined charges.
 */
export async function sendMonthlyGiftPaused(gift: MonthlyGiftPausedEmailProps & { to: string }) {
  const { to, ...props } = gift;
  const { html, text } = await renderEmail(MonthlyGiftPausedEmail(props));
  const result = await email.send({ to, subject: "Your monthly gift is paused", body: html, text });
  if (!result.ok) {
    log.error("email", "monthly gift paused email failed", { err: result.error });
  }
  return result;
}
