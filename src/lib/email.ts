import { getMessagingService } from "./messaging";

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
  const result = await email.send({
    to: ADMIN_EMAIL,
    subject: `New Commitment: ${commitment.project.title}`,
    body: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #073b4c; border-bottom: 2px solid #fec51f; padding-bottom: 10px;">
          New Commitment Received
        </h1>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #073b4c; margin-top: 0;">${commitment.project.title}</h2>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Donor Name:</td>
              <td style="padding: 8px 0; font-weight: 600;">${commitment.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0;">${commitment.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Amount:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #0678a6;">
                GH₵ ${Number(commitment.amountCommitted).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Country:</td>
              <td style="padding: 8px 0;">${commitment.country}</td>
            </tr>
            ${
              commitment.churchUnit
                ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Church Unit:</td>
              <td style="padding: 8px 0;">${commitment.churchUnit}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>

        <p style="color: #666;">
          <a href="${process.env.BETTER_AUTH_URL}/admin/projects/${commitment.project.id}/commitments"
             style="color: #0678a6; text-decoration: underline;">
            View all commitments for this project →
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from Phanerosis Prayer Network.
        </p>
      </div>
    `,
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
  const result = await email.send({
    to: commitment.email,
    subject: `Thank you for your commitment - ${commitment.project.title}`,
    body: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #073b4c; border-bottom: 2px solid #fec51f; padding-bottom: 10px;">
          Thank You, ${commitment.fullName}!
        </h1>

        <p style="font-size: 18px; color: #333;">
          Your commitment to support <strong>${commitment.project.title}</strong> has been received.
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #073b4c; margin-top: 0;">Commitment Details</h3>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Project:</td>
              <td style="padding: 8px 0; font-weight: 600;">${commitment.project.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Amount Committed:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #0678a6;">
                GH₵ ${Number(commitment.amountCommitted).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background: #fec51f; color: #073b4c; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                  Pending Confirmation
                </span>
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #333;">
          Our team will reach out to you shortly with payment instructions and further details.
        </p>

        <p style="color: #333;">
          May God bless you abundantly for your generosity and heart for the kingdom!
        </p>

        <p style="color: #333;">
          With gratitude,<br />
          <strong>Phanerosis Prayer Network Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          If you have any questions, please contact us at
          <a href="mailto:contact@phanerosisnetwork.com" style="color: #0678a6;">
            contact@phanerosisnetwork.com
          </a>
        </p>
      </div>
    `,
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

  const result = await email.send({
    to: commitment.email,
    subject,
    body: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #073b4c; border-bottom: 2px solid ${
          isConfirmed ? "#34a853" : "#ef476f"
        }; padding-bottom: 10px;">
          ${isConfirmed ? "Commitment Confirmed!" : "Commitment Update"}
        </h1>

        <p style="font-size: 18px; color: #333;">
          Dear ${commitment.fullName},
        </p>

        <p style="color: #333;">
          ${
            isConfirmed
              ? `Your commitment of <strong>GH₵ ${Number(
                  commitment.amountCommitted,
                ).toLocaleString()}</strong> to <strong>${
                  commitment.project.title
                }</strong> has been confirmed. Thank you for your faithful support!`
              : `We're reaching out regarding your commitment to <strong>${commitment.project.title}</strong>. Unfortunately, this commitment has been cancelled.`
          }
        </p>

        ${
          isConfirmed
            ? `
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34a853;">
          <p style="margin: 0; color: #2e7d32;">
            🙏 Your generosity is making a real difference in advancing the kingdom of God.
          </p>
        </div>
        `
            : ""
        }

        <p style="color: #333;">
          If you have any questions, please don't hesitate to reach out.
        </p>

        <p style="color: #333;">
          Blessings,<br />
          <strong>Phanerosis Prayer Network Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          <a href="mailto:contact@phanerosisnetwork.com" style="color: #0678a6;">
            contact@phanerosisnetwork.com
          </a>
        </p>
      </div>
    `,
  });

  if (!result.ok) {
    console.error("Failed to send status update:", result.error);
  }
  return result;
}
