import {
  BrandButton,
  DetailList,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "./_layout/EmailLayout";

export interface CommitmentReceivedAdminEmailProps {
  donorName: string;
  donorEmail: string;
  projectTitle: string;
  projectId: string;
  amount: number | string;
  country: string;
  churchUnit?: string | null;
  adminUrl: string;
  currency?: string;
}

export function CommitmentReceivedAdminEmail({
  donorName,
  donorEmail,
  projectTitle,
  amount,
  country,
  churchUnit,
  adminUrl,
  currency = "GH₵",
}: CommitmentReceivedAdminEmailProps) {
  const formattedAmount = `${currency} ${Number(amount).toLocaleString()}`;
  const items = [
    { label: "Project", value: projectTitle },
    { label: "Donor", value: donorName },
    { label: "Email", value: donorEmail },
    { label: "Amount", value: formattedAmount },
    { label: "Country", value: country },
  ];
  if (churchUnit) items.push({ label: "Church unit", value: churchUnit });

  return (
    <EmailLayout preview={`New commitment received for ${projectTitle}.`}>
      <EmailHeading>New commitment received</EmailHeading>
      <EmailParagraph>
        A new commitment has been made on the PHANET fundraising portal.
      </EmailParagraph>

      <DetailList items={items} />

      <BrandButton href={adminUrl}>View commitments dashboard</BrandButton>

      <EmailParagraph>
        — <strong>PHANET Notifications</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default CommitmentReceivedAdminEmail;
