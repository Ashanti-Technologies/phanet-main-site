import {
  Callout,
  DetailList,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "./_layout/EmailLayout";

export interface CommitmentReceivedDonorEmailProps {
  fullName: string;
  projectTitle: string;
  amount: number | string;
  currency?: string;
}

export function CommitmentReceivedDonorEmail({
  fullName,
  projectTitle,
  amount,
  currency = "GH₵",
}: CommitmentReceivedDonorEmailProps) {
  const firstName = fullName.split(" ")[0] || "Friend";
  const formattedAmount = `${currency} ${Number(amount).toLocaleString()}`;
  return (
    <EmailLayout preview={`Thank you for committing to ${projectTitle}.`}>
      <EmailHeading>Thank you, {firstName}!</EmailHeading>
      <EmailParagraph>
        Your commitment to support <strong>{projectTitle}</strong> has been
        received. We are grateful for your generosity and your heart for the
        kingdom.
      </EmailParagraph>

      <DetailList
        items={[
          { label: "Project", value: projectTitle },
          { label: "Amount committed", value: formattedAmount },
          { label: "Status", value: "Pending confirmation" },
        ]}
      />

      <Callout>
        Our team will reach out shortly with payment instructions and any
        further details you need.
      </Callout>

      <EmailParagraph>
        May God bless you abundantly.
        <br />
        <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default CommitmentReceivedDonorEmail;
