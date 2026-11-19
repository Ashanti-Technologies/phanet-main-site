// Towns people typed that aren't in our City list yet (members + event
// attendees), most common first. Read-only. Run: pnpm report:unmatched-towns
//
// Sweep: for each real place, add it to `city` (with coordinates), then link
// the rows whose typed town matches.
import "dotenv/config";
import { prisma } from "../src/lib/database";

async function main() {
  const where = { cityId: null, city: { not: null, notIn: [""] } };
  const [members, attendees] = await Promise.all([
    prisma.member.findMany({
      where,
      select: { city: true, countryRef: { select: { name: true } }, regionRef: { select: { name: true } }, country: true, region: true },
    }),
    prisma.eventAttendee.findMany({
      where,
      select: { city: true, country: { select: { name: true } }, region: { select: { name: true } } },
    }),
  ]);

  const counts = new Map<string, { members: number; attendees: number }>();
  const bump = (country: string, region: string, city: string, kind: "members" | "attendees") => {
    const key = [country || "?", region || "?", city.trim()].join(" | ");
    const c = counts.get(key) ?? { members: 0, attendees: 0 };
    c[kind]++;
    counts.set(key, c);
  };
  for (const m of members) bump(m.countryRef?.name ?? m.country ?? "", m.regionRef?.name ?? m.region ?? "", m.city!, "members");
  for (const a of attendees) bump(a.country?.name ?? "", a.region?.name ?? "", a.city!, "attendees");

  const rows = [...counts.entries()].sort(
    (a, b) => b[1].members + b[1].attendees - (a[1].members + a[1].attendees),
  );
  console.log(`${rows.length} typed towns not in the City list\n`);
  console.log("members  attendees  country | region | town");
  for (const [key, c] of rows) {
    console.log(`${String(c.members).padStart(7)}  ${String(c.attendees).padStart(9)}  ${key}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
