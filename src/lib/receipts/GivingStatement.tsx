import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Same brand as CommitmentReceipt.tsx.
const BRAND = {
  midnightGreen: "#073b4c",
  mikadoYellow: "#fec51f",
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
};

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontSize: 10, color: BRAND.body, fontFamily: "Helvetica" },
  band: {
    backgroundColor: BRAND.midnightGreen,
    padding: 20,
    marginHorizontal: -40,
    marginTop: -40,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: { width: 40, height: 40, objectFit: "contain" },
  brand: { color: "#ffffff", fontSize: 16, fontFamily: "Helvetica-Bold" },
  brandSub: { color: "#cbd5e1", fontSize: 9, marginTop: 2 },
  stripe: { height: 4, backgroundColor: BRAND.mikadoYellow, marginHorizontal: -40, marginBottom: 24 },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 20, color: BRAND.midnightGreen, fontFamily: "Helvetica-Bold" },
  label: { color: BRAND.muted, fontSize: 8, textTransform: "uppercase", letterSpacing: 1 },
  value: { color: BRAND.ink, fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  section: {
    color: BRAND.midnightGreen,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
  },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  th: { color: BRAND.muted, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  cDate: { width: "16%" },
  cGiver: { width: "24%" },
  cFund: { width: "20%" },
  cMethod: { width: "18%" },
  cAmount: { width: "22%", textAlign: "right" },
  total: {
    backgroundColor: "#fff8e1",
    borderLeftWidth: 4,
    borderLeftColor: BRAND.mikadoYellow,
    padding: 14,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalAmount: { fontSize: 18, color: BRAND.midnightGreen, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 20, fontSize: 9, color: BRAND.muted, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: BRAND.muted,
  },
});

export type StatementGift = {
  date: Date;
  giver: string;
  fund: string;
  method: string;
  amount: number;
};

export interface GivingStatementProps {
  year: number;
  recipient: string;
  /** Names covered, for a household statement. */
  members: string[];
  gifts: StatementGift[];
  byFund: { label: string; value: number }[];
  total: number;
  statementNo: string;
  issuedAt: Date;
  logoUrl: string;
}

const money = (n: number) =>
  `GHS ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function GivingStatement(p: GivingStatementProps) {
  const household = p.members.length > 1;
  return (
    <Document title={`PHANET Giving Statement ${p.year} — ${p.recipient}`} author="Phanerosis Prayer Network International">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */}
          <Image src={p.logoUrl} style={s.logo} />
          <View>
            <Text style={s.brand}>PHANET</Text>
            <Text style={s.brandSub}>Phanerosis Prayer Network International</Text>
          </View>
        </View>
        <View style={s.stripe} fixed />

        <View style={s.head}>
          <View>
            <Text style={s.title}>Giving Statement {p.year}</Text>
            <Text style={[s.value, { marginTop: 8 }]}>{p.recipient}</Text>
            {household && <Text style={{ marginTop: 2 }}>{p.members.join(", ")}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Statement no.</Text>
            <Text style={s.value}>{p.statementNo}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Issued</Text>
            <Text style={s.value}>{day(p.issuedAt)}</Text>
          </View>
        </View>

        <Text style={s.section}>Gifts received 1 January – 31 December {p.year}</Text>
        <View style={s.row} fixed>
          <Text style={[s.th, s.cDate]}>Date</Text>
          <Text style={[s.th, s.cGiver]}>{household ? "Given by" : ""}</Text>
          <Text style={[s.th, s.cFund]}>Fund</Text>
          <Text style={[s.th, s.cMethod]}>Method</Text>
          <Text style={[s.th, s.cAmount]}>Amount</Text>
        </View>
        {p.gifts.map((g, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={s.cDate}>{day(g.date)}</Text>
            <Text style={s.cGiver}>{household ? g.giver : ""}</Text>
            <Text style={s.cFund}>{g.fund}</Text>
            <Text style={s.cMethod}>{g.method}</Text>
            <Text style={s.cAmount}>{money(g.amount)}</Text>
          </View>
        ))}
        {p.gifts.length === 0 && <Text style={{ paddingVertical: 10 }}>No gifts recorded for this year.</Text>}

        {p.byFund.length > 1 && (
          <View wrap={false}>
            <Text style={s.section}>By fund</Text>
            {p.byFund.map((f) => (
              <View key={f.label} style={s.row}>
                <Text style={{ width: "78%" }}>{f.label}</Text>
                <Text style={s.cAmount}>{money(f.value)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.total} wrap={false}>
          <Text style={s.label}>Total given in {p.year}</Text>
          <Text style={s.totalAmount}>{money(p.total)}</Text>
        </View>

        <Text style={s.note}>
          Thank you for your faithful giving. This statement lists gifts recorded by the PHANET finance team. If
          anything looks wrong, please contact us and quote the statement number.
        </Text>

        <View style={s.footer} fixed>
          <Text>Phanerosis Prayer Network International · contact@phanerosisnetwork.com</Text>
          <Text render={({ pageNumber, totalPages }) => `${p.statementNo} · page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
