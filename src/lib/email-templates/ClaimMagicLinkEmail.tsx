import {
  BrandButton,
  Callout,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailSmall,
} from "./_layout/EmailLayout";

export interface ClaimMagicLinkEmailProps {
  memberName: string;
  url: string;
  expiresInMinutes: number;
}

export function ClaimMagicLinkEmail({
  memberName,
  url,
  expiresInMinutes,
}: ClaimMagicLinkEmailProps) {
  const firstName = memberName.split(" ")[0] || "Friend";
  return (
    <EmailLayout preview="Claim your PHANET member record and access your portal.">
      <EmailHeading>Welcome back, {firstName}.</EmailHeading>
      <EmailParagraph>
        We found a Phanerosis Prayer Network International (PHANET) member
        record matching your email and we&apos;d like to hand it over to you.
      </EmailParagraph>
      <EmailParagraph>
        Click the secure button below to instantly sign in to your PHANET
        member portal. Once inside, please review your details and update
        anything that&apos;s missing or out of date — this is what we use to
        keep in touch about gatherings, prayer, and pastoral care.
      </EmailParagraph>

      <BrandButton href={url}>Claim my record &amp; sign in</BrandButton>

      <EmailSmall>
        Or copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all", color: "#073b4c" }}>{url}</span>
      </EmailSmall>

      <Callout>
        This link expires in <strong>{expiresInMinutes} minutes</strong> and
        can only be used once. If it expires, you can request a fresh link
        from the claim page.
      </Callout>

      <EmailParagraph>
        Didn&apos;t request this email? You can safely ignore it — no account
        will be created and no information will change.
      </EmailParagraph>

      <EmailParagraph>
        Grateful to walk this journey with you,
        <br />
        <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default ClaimMagicLinkEmail;
