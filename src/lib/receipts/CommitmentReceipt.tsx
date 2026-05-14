import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const BRAND = {
  midnightGreen: "#073b4c",
  mikadoYellow: "#fec51f",
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  pageBg: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    color: BRAND.body,
    fontFamily: "Helvetica",
    backgroundColor: BRAND.surface,
  },
  headerBand: {
    backgroundColor: BRAND.midnightGreen,
    padding: 20,
    marginHorizontal: -40,
    marginTop: -40,
    marginBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    objectFit: "contain",
  },
  headerTitle: {
    color: BRAND.surface,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#cbd5e1",
    fontSize: 9,
    marginTop: 2,
  },
  accentStripe: {
    height: 4,
    backgroundColor: BRAND.mikadoYellow,
    marginHorizontal: -40,
    marginBottom: 28,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  documentTitle: {
    fontSize: 22,
    color: BRAND.midnightGreen,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.3,
  },
  receiptMetaBlock: {
    alignItems: "flex-end",
  },
  receiptMetaLabel: {
    color: BRAND.muted,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  receiptMetaValue: {
    color: BRAND.ink,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  sectionHeading: {
    color: BRAND.midnightGreen,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  detailGrid: {
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  detailLabel: {
    width: "38%",
    color: BRAND.muted,
    fontSize: 10,
  },
  detailValue: {
    flex: 1,
    color: BRAND.ink,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  totalCard: {
    backgroundColor: "#fff8e1",
    borderLeftWidth: 4,
    borderLeftColor: BRAND.mikadoYellow,
    padding: 16,
    marginBottom: 28,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: BRAND.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalAmount: {
    fontSize: 22,
    color: BRAND.midnightGreen,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  thanks: {
    fontSize: 12,
    color: BRAND.ink,
    lineHeight: 1.5,
    marginBottom: 28,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: BRAND.muted,
  },
});

export interface CommitmentReceiptProps {
  receiptNumber: string;
  issuedAt: Date;
  member: {
    fullName: string;
    email: string;
  };
  project: {
    title: string;
  };
  amount: number;
  currency: string;
  confirmedAt: Date | null;
  logoUrl: string;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CommitmentReceipt({
  receiptNumber,
  issuedAt,
  member,
  project,
  amount,
  currency,
  confirmedAt,
  logoUrl,
}: CommitmentReceiptProps) {
  return (
    <Document
      title={`PHANET Receipt ${receiptNumber}`}
      author="Phanerosis Prayer Network International"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */}
          <Image src={logoUrl} style={styles.headerLogo} />
          <View>
            <Text style={styles.headerTitle}>PHANET</Text>
            <Text style={styles.headerSubtitle}>
              Phanerosis Prayer Network International
            </Text>
          </View>
        </View>
        <View style={styles.accentStripe} />

        <View style={styles.receiptHeader}>
          <Text style={styles.documentTitle}>Payment Receipt</Text>
          <View style={styles.receiptMetaBlock}>
            <Text style={styles.receiptMetaLabel}>Receipt no.</Text>
            <Text style={styles.receiptMetaValue}>{receiptNumber}</Text>
            <Text style={[styles.receiptMetaLabel, { marginTop: 8 }]}>
              Issued
            </Text>
            <Text style={styles.receiptMetaValue}>{formatDate(issuedAt)}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Received from</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{member.fullName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{member.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>For</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Project</Text>
            <Text style={styles.detailValue}>{project.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Confirmed on</Text>
            <Text style={styles.detailValue}>
              {confirmedAt ? formatDate(confirmedAt) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Amount received</Text>
          <Text style={styles.totalAmount}>
            {formatAmount(amount, currency)}
          </Text>
        </View>

        <Text style={styles.thanks}>
          Thank you for your generosity. Your gift is making a real difference
          in advancing the work of the kingdom through PHANET. May the Lord
          bless you abundantly.
        </Text>

        <View style={styles.footer}>
          <Text>
            Phanerosis Prayer Network International ·
            contact@phanerosisnetwork.com
          </Text>
          <Text>{receiptNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default CommitmentReceipt;
