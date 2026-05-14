import {
  BrandButton,
  Callout,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailSmall,
} from "./_layout/EmailLayout";

export interface MagicLinkSignInEmailProps {
  url: string;
  expiresInMinutes: number;
}

export function MagicLinkSignInEmail({
  url,
  expiresInMinutes,
}: MagicLinkSignInEmailProps) {
  return (
    <EmailLayout preview="Your secure PHANET Member Portal sign-in link.">
      <EmailHeading>Sign in to PHANET Member Portal</EmailHeading>
      <EmailParagraph>
        Use the secure button below to sign in to your member portal. No
        password needed.
      </EmailParagraph>

      <BrandButton href={url}>Sign in to my portal</BrandButton>

      <EmailSmall>
        Or copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all", color: "#073b4c" }}>{url}</span>
      </EmailSmall>

      <Callout>
        This link expires in <strong>{expiresInMinutes} minutes</strong> and
        can only be used once.
      </Callout>

      <EmailParagraph>
        Didn&apos;t request this email? You can safely ignore it — your
        account stays exactly as it was.
      </EmailParagraph>

      <EmailParagraph>
        — <strong>The PHANET Team</strong>
      </EmailParagraph>
    </EmailLayout>
  );
}

export default MagicLinkSignInEmail;
