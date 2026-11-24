import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { APP_CONFIG } from "@/constants";

export const BRAND = {
  midnightGreen: "#073b4c",
  mikadoYellow: "#fec51f",
  crayola: "#ef476f",
  antiflashWhite: "#eff0f3",
  ink: "#1c2a30",
  body: "#3d4b50",
  muted: "#74807f",
  border: "#e6e3dc",
  surface: "#ffffff",
  pageBg: "#f6f3ec",
  tint: "#faf8f3",
} as const;

const PUBLIC_LOGO_URL = "https://phanerosisnetwork.com/images/logo.png";
const MINISTRY_NAME = "Phanerosis Prayer Network International";

// Web fonts load in Apple Mail / iOS / some others; everyone else gets the fallbacks.
const sansStack = '"Instrument Sans","Helvetica Neue",Helvetica,Arial,sans-serif';
const serifStack = 'Fraunces,Georgia,"Times New Roman",serif';
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Instrument+Sans:wght@400;600;700&display=swap";

// Only clients that honour <style> (Apple Mail, Gmail apps) get the mobile tweaks.
const responsiveCss = `
@media only screen and (max-width: 600px) {
  .ph-card-body { padding: 28px 22px 8px !important; }
  .ph-heading { font-size: 23px !important; line-height: 30px !important; }
  .ph-button { display: block !important; text-align: center !important; }
}`;

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: BRAND.pageBg,
  fontFamily: sansStack,
  color: BRAND.body,
  WebkitFontSmoothing: "antialiased" as const,
};

const outer = { width: "100%", backgroundColor: BRAND.pageBg, padding: "36px 12px 28px" };

const brandHeader = { textAlign: "center" as const, paddingBottom: "22px" };

const wordmark = {
  margin: "10px 0 0",
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: 700,
  letterSpacing: "0.28em",
  color: BRAND.midnightGreen,
};

const card = {
  margin: "0 auto",
  maxWidth: "560px",
  backgroundColor: BRAND.surface,
  borderRadius: "16px",
  overflow: "hidden",
  border: `1px solid ${BRAND.border}`,
};

const edgeCell = { height: "5px", fontSize: "0", lineHeight: "0" };

const bodyWrap = { padding: "40px 40px 16px" };

const footerWrap = { maxWidth: "560px", margin: "0 auto", padding: "24px 24px 0", textAlign: "center" as const };

const footerHeading = {
  margin: "0 0 6px",
  fontFamily: serifStack,
  fontSize: "14px",
  fontWeight: 600,
  color: BRAND.midnightGreen,
};

const footerText = { margin: "2px 0", fontSize: "12px", lineHeight: "19px", color: BRAND.muted };

const footerLink = { color: BRAND.midnightGreen, textDecoration: "underline" };

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link rel="stylesheet" href={FONTS_HREF} />
        <style>{responsiveCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Section style={outer}>
          <Section style={brandHeader}>
            <Img
              src={PUBLIC_LOGO_URL}
              alt="PHANET"
              width="52"
              height="52"
              style={{ display: "block", margin: "0 auto" }}
            />
            <Text style={wordmark}>PHANET</Text>
          </Section>

          <Container style={card}>
            <Section>
              <Row>
                <Column style={{ ...edgeCell, backgroundColor: BRAND.midnightGreen, width: "72%" }}>&nbsp;</Column>
                <Column style={{ ...edgeCell, backgroundColor: BRAND.mikadoYellow }}>&nbsp;</Column>
              </Row>
            </Section>
            <Section style={bodyWrap} className="ph-card-body">
              {children}
            </Section>
          </Container>

          <Section style={footerWrap}>
            <Text style={footerHeading}>{MINISTRY_NAME}</Text>
            <Text style={footerText}>
              Questions? Write to{" "}
              <Link href={`mailto:${APP_CONFIG.contactEmail}`} style={footerLink}>
                {APP_CONFIG.contactEmail}
              </Link>{" "}
              ·{" "}
              <Link href={APP_CONFIG.siteUrl} style={footerLink}>
                phanerosisnetwork.com
              </Link>
            </Text>
            <Text style={{ ...footerText, marginTop: "12px" }}>
              You&apos;re receiving this because it was sent to your address through PHANET. If this
              wasn&apos;t you, you can safely ignore it.
            </Text>
            <Text style={{ ...footerText, marginTop: "8px" }}>
              © {year} {MINISTRY_NAME}
            </Text>
          </Section>
        </Section>
      </Body>
    </Html>
  );
}

// ---------- Reusable building blocks ----------

const headingStyle = {
  margin: "0 0 14px",
  fontFamily: serifStack,
  color: BRAND.midnightGreen,
  fontSize: "27px",
  lineHeight: "34px",
  fontWeight: 600,
  letterSpacing: "-0.015em",
};

const paragraphStyle = { margin: "0 0 16px", fontSize: "16px", lineHeight: "26px", color: BRAND.body };

const smallStyle = { margin: "0 0 10px", fontSize: "13px", lineHeight: "20px", color: BRAND.muted };

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Text style={headingStyle} className="ph-heading">
      {children}
    </Text>
  );
}

export function EmailParagraph({ children }: { children: ReactNode }) {
  return <Text style={paragraphStyle}>{children}</Text>;
}

export function EmailSmall({ children }: { children: ReactNode }) {
  return <Text style={smallStyle}>{children}</Text>;
}

const buttonStyle = {
  display: "inline-block" as const,
  backgroundColor: BRAND.midnightGreen,
  color: "#ffffff",
  padding: "15px 30px",
  borderRadius: "999px",
  fontSize: "15px",
  fontWeight: 700,
  textDecoration: "none",
  letterSpacing: "0.01em",
};

export function BrandButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div style={{ margin: "10px 0 22px" }}>
      <Link href={href} style={buttonStyle} className="ph-button">
        {children}&nbsp;&nbsp;<span style={{ color: BRAND.mikadoYellow }}>→</span>
      </Link>
    </div>
  );
}

const codeBoxStyle = {
  display: "inline-block" as const,
  padding: "16px 28px",
  backgroundColor: BRAND.tint,
  border: `1.5px dashed ${BRAND.midnightGreen}`,
  borderRadius: "12px",
  fontFamily:
    'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
  fontSize: "26px",
  fontWeight: 700,
  letterSpacing: "0.24em",
  color: BRAND.midnightGreen,
};

export function CodeBox({ code }: { code: string }) {
  return (
    <div style={{ margin: "10px 0 22px", textAlign: "center" }}>
      <span style={codeBoxStyle}>{code}</span>
    </div>
  );
}

const calloutBase = {
  padding: "14px 18px",
  borderRadius: "12px",
  margin: "10px 0 20px",
  fontSize: "14px",
  lineHeight: "22px",
  color: BRAND.ink,
};

const calloutVariants = {
  info: { ...calloutBase, backgroundColor: "#fff6d6", border: "1px solid #f8e3a0" },
  danger: { ...calloutBase, backgroundColor: "#fdeef1", border: "1px solid #f6c9d3" },
  success: { ...calloutBase, backgroundColor: "#e9f4ee", border: "1px solid #c6e2d1" },
};

export function Callout({
  variant = "info",
  children,
}: {
  variant?: "info" | "danger" | "success";
  children: ReactNode;
}) {
  return <div style={calloutVariants[variant]}>{children}</div>;
}

const detailTableWrap = {
  margin: "10px 0 22px",
  padding: "6px 18px",
  borderRadius: "12px",
  backgroundColor: BRAND.tint,
  border: `1px solid ${BRAND.border}`,
};

const detailLabelStyle = {
  padding: "12px 12px 12px 0",
  fontSize: "13px",
  color: BRAND.muted,
  verticalAlign: "top" as const,
  whiteSpace: "nowrap" as const,
};

const detailValueStyle = {
  padding: "12px 0",
  fontSize: "14px",
  color: BRAND.ink,
  fontWeight: 600,
  textAlign: "right" as const,
  verticalAlign: "top" as const,
  wordBreak: "break-word" as const,
};

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div style={detailTableWrap}>
      <table cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {items.map((item, idx) => {
            const rule = idx === 0 ? {} : { borderTop: `1px dotted ${BRAND.border}` };
            return (
              <tr key={item.label}>
                <td style={{ ...detailLabelStyle, ...rule }}>{item.label}</td>
                <td style={{ ...detailValueStyle, ...rule }}>{item.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Divider() {
  return <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />;
}
