import { DetailList, EmailHeading, EmailLayout, EmailParagraph } from "./_layout/EmailLayout";

export interface MonthlyGiftPausedEmailProps {
  fullName: string;
  amount: string;
  fund: string;
  giveUrl: string;
}

export function MonthlyGiftPausedEmail({ fullName, amount, fund, giveUrl }: MonthlyGiftPausedEmailProps) {
  const firstName = fullName.split(" ")[0] || "Friend";
  return (
    <EmailLayout preview="We couldn't charge your card for your monthly gift.">
      <EmailHeading>Your monthly gift is paused</EmailHeading>
      <EmailParagraph>
        Hi {firstName}, we tried a few times but couldn&apos;t charge your card for your monthly gift, so
        we&apos;ve paused it. No money was taken for this month.
      </EmailParagraph>
      <DetailList
        items={[
          { label: "Monthly gift", value: amount },
          { label: "Given to", value: fund },
        ]}
      />
      <EmailParagraph>
        If your card has changed or expired, you can set up a new monthly gift at <a href={giveUrl}>{giveUrl}</a>.
        <br />
        Thank you for your faithful support.
        <br />
        <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default MonthlyGiftPausedEmail;
