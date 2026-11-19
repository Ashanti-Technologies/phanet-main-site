// Seed the `city` table from GeoNames (CC BY 4.0, https://www.geonames.org).
//
// Download (once, anywhere outside the repo):
//   curl -LO https://download.geonames.org/export/dump/GH.zip           && unzip GH.zip
//   curl -LO https://download.geonames.org/export/dump/cities5000.zip   && unzip cities5000.zip
//   curl -LO https://download.geonames.org/export/dump/admin1CodesASCII.txt
// Run:
//   pnpm import:cities --gh GH.txt --world cities5000.txt --admin1 admin1CodesASCII.txt [--commit]
// Without --commit it's a dry run that only prints stats.
//
// ponytail: insert-only (skipDuplicates on geonameId). Add an update pass when
// the quarterly refresh needs to pick up renamed/moved places.
import { readFileSync } from "node:fs";

/** Lowercase, strip accents and admin words: "Ashanti Region" → "ashanti". */
export function normalizePlace(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\b(region|province|state|oblast|governorate|prefecture|department|county|district|municipality|voivodeship|canton|krai|kray|of)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

const FEATURE_RANK: Record<string, number> = { PPLC: 6, PPLA: 5, PPLA2: 4, PPLA3: 3, PPLA4: 2, PPL: 1 };
const SKIP_CODES = new Set(["PPLH", "PPLQ", "PPLW", "PPLCH"]); // historical / abandoned / destroyed
const LATIN = /^[\p{Script=Latin}\p{N}\s'’.()-]+$/u;

export type GeoRow = {
  geonameId: number;
  name: string;
  searchText: string;
  lat: number;
  lng: number;
  featureCode: string;
  countryCode: string;
  admin1: string;
  population: number;
};

export function parseGeoLine(line: string): GeoRow | null {
  const c = line.split("\t");
  if (c.length < 15 || c[6] !== "P" || SKIP_CODES.has(c[7])) return null;
  const names = [c[1], c[2], ...c[3].split(",")]
    .map((n) => n.trim())
    .filter((n) => n && LATIN.test(n))
    .map((n) => n.toLowerCase());
  return {
    geonameId: Number(c[0]),
    name: c[1],
    searchText: [...new Set(names)].join("|").slice(0, 500),
    lat: Number(c[4]),
    lng: Number(c[5]),
    featureCode: c[7],
    countryCode: c[8],
    admin1: c[10],
    population: Number(c[14]) || 0,
  };
}

/** Better place first: bigger population, then higher admin rank. */
export function outranks(a: GeoRow, b: GeoRow): boolean {
  if (a.population !== b.population) return a.population > b.population;
  return (FEATURE_RANK[a.featureCode] ?? 0) > (FEATURE_RANK[b.featureCode] ?? 0);
}

/**
 * One place per (country, region, name).
 * ponytail: same-named villages in one region collapse to one point; fine for
 * a picker and region/city counts, revisit if we ever map below city level.
 */
export function dedupe(rows: GeoRow[], regionKey: (r: GeoRow) => string): GeoRow[] {
  const best = new Map<string, GeoRow>();
  for (const r of rows) {
    const k = `${r.countryCode}|${regionKey(r)}|${normalizePlace(r.name)}`;
    const cur = best.get(k);
    if (!cur || outranks(r, cur)) best.set(k, r);
  }
  return [...best.values()];
}

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing --${name} <path>`);
  return process.argv[i + 1];
}

function readRows(path: string): GeoRow[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map(parseGeoLine)
    .filter((r): r is GeoRow => r !== null);
}

async function main() {
  const { prisma } = await import("../src/lib/database");
  const commit = process.argv.includes("--commit");

  // GeoNames admin1 "GH.02" → name, then → our Region id by normalized name.
  const admin1Names = new Map<string, string>();
  for (const line of readFileSync(arg("admin1"), "utf8").split("\n")) {
    const [code, name] = line.split("\t");
    if (code && name) admin1Names.set(code, name);
  }
  const countries = await prisma.country.findMany({ select: { id: true, code: true } });
  const countryId = new Map(countries.map((c) => [c.code, c.id]));
  const regions = await prisma.region.findMany({ select: { id: true, name: true, country: { select: { code: true } } } });
  const regionByName = new Map<string, string>();
  for (const r of regions) {
    const k = `${r.country.code}|${normalizePlace(r.name)}`;
    if (!regionByName.has(k)) regionByName.set(k, r.id);
  }
  const regionId = (r: GeoRow): string | null => {
    const name = admin1Names.get(`${r.countryCode}.${r.admin1}`);
    return name ? (regionByName.get(`${r.countryCode}|${normalizePlace(name)}`) ?? null) : null;
  };

  // Ghana must map to all 16 regions or the data is wrong — stop.
  const ghMissing = [...admin1Names.entries()]
    .filter(([code]) => code.startsWith("GH."))
    .filter(([, name]) => !regionByName.has(`GH|${normalizePlace(name)}`))
    .map(([, name]) => name);
  if (ghMissing.length) throw new Error(`Ghana regions not matched: ${ghMissing.join(", ")}`);

  const gh = readRows(arg("gh"));
  const world = readRows(arg("world")).filter((r) => r.countryCode !== "GH");
  const rows = dedupe([...gh, ...world], (r) => regionId(r) ?? `a1:${r.admin1}`).filter((r) =>
    countryId.has(r.countryCode),
  );

  const data = rows.map((r) => ({
    geonameId: r.geonameId,
    countryId: countryId.get(r.countryCode)!,
    regionId: regionId(r),
    name: r.name,
    searchText: r.searchText || r.name.toLowerCase(),
    lat: r.lat,
    lng: r.lng,
    population: r.population,
  }));

  const perCountry = new Map<string, { total: number; withRegion: number }>();
  for (const [i, r] of rows.entries()) {
    const s = perCountry.get(r.countryCode) ?? { total: 0, withRegion: 0 };
    s.total++;
    if (data[i].regionId) s.withRegion++;
    perCountry.set(r.countryCode, s);
  }
  const ghStats = perCountry.get("GH")!;
  const withRegion = data.filter((d) => d.regionId).length;
  console.log(`Ghana: ${ghStats.total} places, ${ghStats.withRegion} with region`);
  console.log(`World: ${data.length} places in ${perCountry.size} countries, ${withRegion} with region`);
  console.log(
    "Largest countries:",
    [...perCountry.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12)
      .map(([c, s]) => `${c} ${s.withRegion}/${s.total}`)
      .join(", "),
  );

  if (!commit) {
    console.log("Dry run — pass --commit to insert.");
    return;
  }
  let inserted = 0;
  for (let i = 0; i < data.length; i += 1000) {
    const res = await prisma.city.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
    inserted += res.count;
  }
  console.log(`Inserted ${inserted} new cities (${data.length - inserted} already present).`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
