import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
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
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  pageBg: "#f1f5f4",
} as const;

const PUBLIC_LOGO_URL = "https://phanerosisnetwork.com/images/logo.png";
const MINISTRY_NAME = "Phanerosis Prayer Network International";

const fontStack =
  '"DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif';

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: BRAND.pageBg,
  fontFamily: fontStack,
  color: BRAND.body,
  WebkitFontSmoothing: "antialiased" as const,
};

const outer = {
  width: "100%",
  backgroundColor: BRAND.pageBg,
  padding: "32px 0",
};

const container = {
  margin: "0 auto",
  maxWidth: "560px",
  backgroundColor: BRAND.surface,
  borderRadius: "14px",
  overflow: "hidden",
  border: `1px solid ${BRAND.border}`,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const headerBand = {
  backgroundColor: BRAND.midnightGreen,
  padding: "22px 28px",
  textAlign: "left" as const,
};

const headerRow = {
  display: "block" as const,
};

const logoStyle = {
  display: "inline-block" as const,
  verticalAlign: "middle" as const,
};

const headerTitle = {
  display: "inline-block" as const,
  verticalAlign: "middle" as const,
  marginLeft: "12px",
  color: BRAND.surface,
  fontSize: "14px",
  letterSpacing: "0.02em",
  fontWeight: 600,
};

const accentStripe = {
  height: "4px",
  backgroundColor: BRAND.mikadoYellow,
  fontSize: "0",
  lineHeight: "0",
};

const bodyWrap = {
  padding: "32px 32px 12px",
};

const footerWrap = {
  padding: "20px 32px 28px",
  backgroundColor: BRAND.antiflashWhite,
  color: BRAND.muted,
};

const footerHeading = {
  margin: "0 0 6px",
  color: BRAND.midnightGreen,
  fontSize: "13px",
  fontWeight: 600,
};

const footerText = {
  margin: "2px 0",
  fontSize: "12px",
  lineHeight: "18px",
  color: BRAND.muted,
};

const footerLink = {
  color: BRAND.midnightGreen,
  textDecoration: "underline",
};

const dividerStyle = {
  borderColor: BRAND.border,
  margin: "16px 0",
};

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  const year = new Date().getFullYear();
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Section style={outer}>
          <Container style={container}>
            <Section style={headerBand}>
              <div style={headerRow}>
                <Img
                  src={PUBLIC_LOGO_URL}
                  alt="PHANET"
                  width="40"
                  height="40"
                  style={logoStyle}
                />
                <span style={headerTitle}>PHANET</span>
              </div>
            </Section>
            <Section style={accentStripe}>&nbsp;</Section>

            <Section style={bodyWrap}>{children}</Section>

            <Section style={footerWrap}>
              <Text style={footerHeading}>{MINISTRY_NAME}</Text>
              <Text style={footerText}>
                Questions? Reach us at{" "}
                <Link href={`mailto:${APP_CONFIG.contactEmail}`} style={footerLink}>
                  {APP_CONFIG.contactEmail}
                </Link>
                .
              </Text>
              <Text style={footerText}>
                <Link href={APP_CONFIG.siteUrl} style={footerLink}>
                  phanerosisnetwork.com
                </Link>
              </Text>
              <Hr style={dividerStyle} />
              <Text style={footerText}>
                © {year} {MINISTRY_NAME}. All rights reserved.
              </Text>
              <Text style={{ ...footerText, marginTop: "6px" }}>
                You&apos;re receiving this email because it was sent to your
                address through PHANET. If this wasn&apos;t you, you can safely
                ignore the message.
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

// ---------- Reusable building blocks ----------

const headingStyle = {
  margin: "0 0 12px",
  color: BRAND.midnightGreen,
  fontSize: "22px",
  lineHeight: "28px",
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const paragraphStyle = {
  margin: "0 0 14px",
  fontSize: "15px",
  lineHeight: "24px",
  color: BRAND.body,
};

const smallStyle = {
  margin: "0 0 8px",
  fontSize: "13px",
  lineHeight: "20px",
  color: BRAND.muted,
};

export function EmailHeading({ children }: { children: ReactNode }) {
  return <Text style={headingStyle}>{children}</Text>;
}

export function EmailParagraph({ children }: { children: ReactNode }) {
  return <Text style={paragraphStyle}>{children}</Text>;
}

export function EmailSmall({ children }: { children: ReactNode }) {
  return <Text style={smallStyle}>{children}</Text>;
}

const buttonStyle = {
  display: "inline-block" as const,
  backgroundColor: BRAND.mikadoYellow,
  color: BRAND.midnightGreen,
  padding: "14px 22px",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: 700,
  textDecoration: "none",
  letterSpacing: "0.01em",
};

const buttonWrap = {
  textAlign: "left" as const,
  margin: "8px 0 18px",
};

export function BrandButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <div style={buttonWrap}>
      <Link href={href} style={buttonStyle}>
        {children}
      </Link>
    </div>
  );
}

const codeBoxStyle = {
  display: "inline-block" as const,
  padding: "14px 22px",
  backgroundColor: BRAND.antiflashWhite,
  border: `1px solid ${BRAND.border}`,
  borderRadius: "10px",
  fontFamily:
    'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
  fontSize: "22px",
  fontWeight: 600,
  letterSpacing: "0.18em",
  color: BRAND.midnightGreen,
};

export function CodeBox({ code }: { code: string }) {
  return (
    <div style={{ margin: "8px 0 18px" }}>
      <span style={codeBoxStyle}>{code}</span>
    </div>
  );
}

const calloutStyle = {
  padding: "14px 16px",
  backgroundColor: "#fff8e1",
  borderLeft: `4px solid ${BRAND.mikadoYellow}`,
  borderRadius: "6px",
  margin: "8px 0 18px",
  fontSize: "14px",
  lineHeight: "22px",
  color: BRAND.ink,
};

const calloutDangerStyle = {
  ...calloutStyle,
  backgroundColor: "#fdecef",
  borderLeftColor: BRAND.crayola,
};

const calloutSuccessStyle = {
  ...calloutStyle,
  backgroundColor: "#e8f5e9",
  borderLeftColor: "#2e7d32",
};

export function Callout({
  variant = "info",
  children,
}: {
  variant?: "info" | "danger" | "success";
  children: ReactNode;
}) {
  const style =
    variant === "danger"
      ? calloutDangerStyle
      : variant === "success"
        ? calloutSuccessStyle
        : calloutStyle;
  return <div style={style}>{children}</div>;
}

const detailTableWrap = {
  margin: "8px 0 18px",
  border: `1px solid ${BRAND.border}`,
  borderRadius: "10px",
  overflow: "hidden",
  backgroundColor: BRAND.surface,
};

const detailRowStyle = {
  borderTop: `1px solid ${BRAND.border}`,
};

const detailRowFirstStyle = {
  borderTop: "none",
};

const detailLabelStyle = {
  padding: "10px 14px",
  fontSize: "13px",
  color: BRAND.muted,
  width: "42%",
  verticalAlign: "top" as const,
};

const detailValueStyle = {
  padding: "10px 14px",
  fontSize: "14px",
  color: BRAND.ink,
  fontWeight: 600,
  verticalAlign: "top" as const,
};

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div style={detailTableWrap}>
      <table
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{ borderCollapse: "collapse" }}
      >
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.label}
              style={idx === 0 ? detailRowFirstStyle : detailRowStyle}
            >
              <td style={detailLabelStyle}>{item.label}</td>
              <td style={detailValueStyle}>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const dividerLineStyle = {
  borderColor: BRAND.border,
  margin: "20px 0",
};

export function Divider() {
  return <Hr style={dividerLineStyle} />;
}
