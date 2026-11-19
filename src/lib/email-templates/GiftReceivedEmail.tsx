import {
  DetailList,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "./_layout/EmailLayout";

export interface GiftReceivedEmailProps {
  fullName: string | null;
  /** Fund name, or "<project> pledge". */
  givenTo: string;
  amount: string;
  reference: string;
  date: string;
}

export function GiftReceivedEmail({ fullName, givenTo, amount, reference, date }: GiftReceivedEmailProps) {
  const firstName = fullName?.split(" ")[0] || "Friend";
  return (
    <EmailLayout preview={`We received your gift of ${amount}. Thank you!`}>
      <EmailHeading>Thank you, {firstName}!</EmailHeading>
      <EmailParagraph>
        Your gift has been received. We are grateful for your generosity and
        your heart for the kingdom.
      </EmailParagraph>
      <DetailList
        items={[
          { label: "Amount", value: amount },
          { label: "Given to", value: givenTo },
          { label: "Date", value: date },
          { label: "Reference", value: reference },
        ]}
      />
      <EmailParagraph>
        Keep this email as your receipt.
        <br />
        May God bless you abundantly.
        <br />
        <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default GiftReceivedEmail;
