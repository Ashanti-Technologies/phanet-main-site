import {
  Callout,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "./_layout/EmailLayout";

export interface CommitmentStatusUpdateEmailProps {
  fullName: string;
  projectTitle: string;
  amount: number | string;
  status: "CONFIRMED" | "CANCELLED";
  currency?: string;
}

export function CommitmentStatusUpdateEmail({
  fullName,
  projectTitle,
  amount,
  status,
  currency = "GH₵",
}: CommitmentStatusUpdateEmailProps) {
  const isConfirmed = status === "CONFIRMED";
  const firstName = fullName.split(" ")[0] || "Friend";
  const formattedAmount = `${currency} ${Number(amount).toLocaleString()}`;
  return (
    <EmailLayout
      preview={
        isConfirmed
          ? `Your commitment to ${projectTitle} is confirmed.`
          : `Update on your commitment to ${projectTitle}.`
      }
    >
      <EmailHeading>
        {isConfirmed ? "Commitment confirmed" : "Commitment update"}
      </EmailHeading>
      <EmailParagraph>Dear {firstName},</EmailParagraph>

      {isConfirmed ? (
        <>
          <EmailParagraph>
            Your commitment of <strong>{formattedAmount}</strong> to{" "}
            <strong>{projectTitle}</strong> has been confirmed. Thank you for
            your faithful support!
          </EmailParagraph>
          <Callout variant="success">
            🙏 Your generosity is making a real difference in advancing the
            kingdom of God.
          </Callout>
        </>
      ) : (
        <EmailParagraph>
          We&apos;re reaching out regarding your commitment to{" "}
          <strong>{projectTitle}</strong>. This commitment has been cancelled.
          If you believe this is in error, please reply to this email and
          we&apos;ll take a look.
        </EmailParagraph>
      )}

      <EmailParagraph>
        Blessings,
        <br />
        <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default CommitmentStatusUpdateEmail;
