import { EmailLayout } from "./_layout/EmailLayout";

export interface BrandedTextEmailProps {
  preview: string;
  /**
   * Pre-rendered HTML body — used by the templated message engine
   * (e.g. birthday cron) so it can keep its own templating but still get
   * the branded shell.
   */
  htmlBody: string;
}

export function BrandedTextEmail({ preview, htmlBody }: BrandedTextEmailProps) {
  return (
    <EmailLayout preview={preview}>
      <div
        style={{
          fontSize: "15px",
          lineHeight: "24px",
          color: "#334155",
        }}
        dangerouslySetInnerHTML={{ __html: htmlBody }}
      />
    </EmailLayout>
  );
}

export default BrandedTextEmail;
