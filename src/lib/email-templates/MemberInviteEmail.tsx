import {
  BrandButton,
  Callout,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailSmall,
} from "./_layout/EmailLayout";

export interface MemberInviteEmailProps {
  memberName: string;
  url: string;
  expiresInDays: number;
  inviterName?: string;
}

export function MemberInviteEmail({
  memberName,
  url,
  expiresInDays,
  inviterName,
}: MemberInviteEmailProps) {
  const firstName = memberName.split(" ")[0] || "Friend";
  return (
    <EmailLayout preview="Set up your PHANET member portal.">
      <EmailHeading>Hello {firstName},</EmailHeading>
      <EmailParagraph>
        {inviterName ? `${inviterName} has invited you` : "You&apos;ve been invited"}{" "}
        to set up your Phanerosis Prayer Network International (PHANET)
        member portal — a secure space to keep your contact details current,
        view upcoming events, and stay connected with the family.
      </EmailParagraph>

      <BrandButton href={url}>Accept invite &amp; create account</BrandButton>

      <EmailSmall>
        Or copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all", color: "#073b4c" }}>{url}</span>
      </EmailSmall>

      <Callout>
        This invite expires in <strong>{expiresInDays} days</strong>. If it
        expires before you accept, just let your group lead know and we&apos;ll
        re-issue it.
      </Callout>

      <EmailParagraph>
        See you on the inside,
        <br />
        <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default MemberInviteEmail;
