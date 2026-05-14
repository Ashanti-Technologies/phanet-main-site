import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { prisma } from "@/lib/database";

const ROOT = process.cwd();
const DEFAULT_MEMBER_CSV =
  "/Users/fred/Downloads/Phanet Membership Database 2024 - Form Responses 1.csv";
const COUNTRIES_CSV = path.join(ROOT, "countries_rows.csv");
const REGIONS_CSV = path.join(ROOT, "regions_rows.csv");
const DEFAULT_ACTOR_EMAIL = "admin@phanerosisnetwork.com";

type CsvRecord = Record<string, string>;

type LocationSeed = {
  countryCount: number;
  regionCount: number;
  ghanaRegionCount: number;
  ghanaCountryId: string;
};

type ImportIssue = {
  row: number;
  field: string;
  value: string;
  reason: string;
};

type PreparedMember = {
  rowNumber: number;
  member: {
    fullName: string;
    dob: Date | null;
    gender: "MALE" | "FEMALE" | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    maritalStatus: "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED" | null;
    addressLine: string | null;
    city: string | null;
    country: string;
    countryId: string | null;
    region: string | null;
    regionId: string | null;
    occupation: string | null;
    photoUrl: string | null;
    status: "PENDING_APPROVAL";
  };
  profile: {
    formSubmittedAt: Date | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    lifeStage: "WORKING_PROFESSIONAL" | "TERTIARY_STUDENT" | "SHS_STUDENT" | null;
    professionalTrack: "EMPLOYED" | "SELF_EMPLOYED" | "STUDYING_OVERSEAS" | null;
    organizationName: string | null;
    regionalChapter:
      | "GREATER_ACCRA"
      | "ASHANTI"
      | "DIASPORA"
      | "NORTHERN"
      | "CENTRAL_NORTH"
      | "CENTRAL_SOUTH"
      | "NORTH_EAST"
      | "BONO"
      | "EASTERN"
      | "WESTERN"
      | null;
    tertiaryInstitution: string | null;
    tertiaryProgramme: string | null;
    tertiaryYear: string | null;
    tertiaryResidence: string | null;
    tertiaryChapterRole: "EXECUTIVE_MEMBER" | "NON_EXECUTIVE_MEMBER" | null;
    tertiaryExecutiveRole: string | null;
    campusMinistryInvolvement: string | null;
    shsName: string | null;
    shsYear: string | null;
    shsProgramme: string | null;
    shsChapterRole: "EXECUTIVE_MEMBER" | "NON_EXECUTIVE_MEMBER" | null;
    shsExecutiveRole: string | null;
    departmentText: string | null;
    nationalRole: string | null;
    overseasProgramme: string | null;
  };
  unitNames: string[];
};

const NON_ANSWERS = new Set([
  "n/a",
  "na",
  "nil",
  "none",
  "no",
  "no role",
  "nothing",
  "not applicable",
  "no department",
  "not in any department yet",
]);

function argValue(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function clean(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function nullableText(value: string | undefined | null) {
  const v = clean(value);
  if (!v) return null;
  if (NON_ANSWERS.has(v.toLowerCase())) return null;
  return v;
}

function normalizeEmail(value: string | undefined | null, row: number, issues: ImportIssue[]) {
  const v = nullableText(value);
  if (!v) return null;
  const email = v.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({ row, field: "email", value: v, reason: "invalid email ignored" });
    return null;
  }
  return email;
}

function digitsOnly(value: string | null | undefined) {
  const digits = clean(value).replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function parseMdyDate(
  value: string | undefined | null,
  row: number,
  field: string,
  issues: ImportIssue[],
  options: { dob?: boolean } = {},
) {
  const v = clean(value);
  if (!v) return null;
  const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    issues.push({ row, field, value: v, reason: "unsupported date format" });
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year <= 26 ? 2000 : 1900;
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    issues.push({ row, field, value: v, reason: "invalid calendar date" });
    return null;
  }

  if (options.dob) {
    const age = 2026 - year;
    if (age < 10 || age > 100) {
      issues.push({ row, field, value: v, reason: "suspicious age; DOB left empty" });
      return null;
    }
  }

  return date;
}

function normalizeGender(value: string | undefined | null) {
  const v = clean(value).toLowerCase();
  if (v === "male") return "MALE" as const;
  if (v === "female") return "FEMALE" as const;
  return null;
}

function normalizeMaritalStatus(value: string | undefined | null) {
  const v = clean(value).toLowerCase();
  if (v === "single") return "SINGLE" as const;
  if (v === "married") return "MARRIED" as const;
  if (v === "widowed") return "WIDOWED" as const;
  if (v === "divorced") return "DIVORCED" as const;
  return null;
}

function normalizeLifeStage(value: string | undefined | null, row: number, issues: ImportIssue[]) {
  const v = clean(value).toLowerCase();
  if (!v) return null;
  if (v.includes("working professional")) return "WORKING_PROFESSIONAL" as const;
  if (v.includes("tertiary")) return "TERTIARY_STUDENT" as const;
  if (v.includes("shs")) return "SHS_STUDENT" as const;
  issues.push({ row, field: "lifeStage", value: clean(value), reason: "unknown enum value" });
  return null;
}

function normalizeProfessionalTrack(
  value: string | undefined | null,
  row: number,
  issues: ImportIssue[],
) {
  const v = clean(value).toLowerCase();
  if (!v) return null;
  if (v === "employed") return "EMPLOYED" as const;
  if (v === "self-employed" || v === "self employed") return "SELF_EMPLOYED" as const;
  if (v === "studying overseas") return "STUDYING_OVERSEAS" as const;
  issues.push({
    row,
    field: "professionalTrack",
    value: clean(value),
    reason: "unknown enum value",
  });
  return null;
}

function normalizeChapter(value: string | undefined | null, row: number, issues: ImportIssue[]) {
  const v = clean(value).toLowerCase();
  if (!v) return null;
  if (v === "greater accra") return "GREATER_ACCRA" as const;
  if (v === "ashanti") return "ASHANTI" as const;
  if (v === "diaspora") return "DIASPORA" as const;
  if (v === "northern") return "NORTHERN" as const;
  if (v.startsWith("central north")) return "CENTRAL_NORTH" as const;
  if (v.startsWith("central south")) return "CENTRAL_SOUTH" as const;
  if (v === "north east" || v === "north east" || v === "north-east") {
    return "NORTH_EAST" as const;
  }
  if (v === "bono") return "BONO" as const;
  if (v === "eastern") return "EASTERN" as const;
  if (v === "western") return "WESTERN" as const;
  issues.push({ row, field: "regionalChapter", value: clean(value), reason: "unknown enum value" });
  return null;
}

function normalizeChapterRole(value: string | undefined | null, row: number, field: string, issues: ImportIssue[]) {
  const v = clean(value).toLowerCase();
  if (!v) return null;
  if (v === "executive member") return "EXECUTIVE_MEMBER" as const;
  if (v === "non-executive member") return "NON_EXECUTIVE_MEMBER" as const;
  issues.push({ row, field, value: clean(value), reason: "unknown enum value" });
  return null;
}

function regionNameForChapter(chapter: PreparedMember["profile"]["regionalChapter"]) {
  switch (chapter) {
    case "GREATER_ACCRA":
      return "Greater Accra";
    case "ASHANTI":
      return "Ashanti";
    case "NORTHERN":
      return "Northern";
    case "NORTH_EAST":
      return "North East";
    case "BONO":
      return "Bono";
    case "EASTERN":
      return "Eastern";
    case "WESTERN":
      return "Western";
    default:
      return null;
  }
}

function unitNamesForDepartment(value: string | null) {
  if (!value) return [];
  const v = value.toLowerCase();
  const units = new Set<string>();
  if (/\b(protocol|usher)\b/.test(v)) units.add("Protocol / Ushering");
  if (/\b(media|publicity|communication|communications|data)\b/.test(v)) {
    units.add("Media Department");
  }
  if (/\b(prayer|engine room|intercessory|praying)\b/.test(v)) {
    units.add("Prayer Team");
  }
  if (/\b(music|singing|choir|hoz|heirs of zion|heir of zion)\b/.test(v)) {
    units.add("Choir / Music Ministry");
  }
  if (/\bchildren\b/.test(v)) units.add("Children's Ministry");
  if (/\byouth\b/.test(v)) units.add("Youth Ministry");
  return Array.from(units);
}

async function parseCsvFile(filePath: string) {
  const text = await fs.readFile(filePath, "utf8");
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse failed for ${filePath}: ${first.message}`);
  }
  return parsed.data;
}

async function parseRecordCsv(filePath: string) {
  const text = await fs.readFile(filePath, "utf8");
  const parsed = Papa.parse<CsvRecord>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse failed for ${filePath}: ${first.message}`);
  }
  return parsed.data;
}

async function readLocationSeed(): Promise<LocationSeed & { countries: CsvRecord[]; regions: CsvRecord[] }> {
  const [countries, regions] = await Promise.all([
    parseRecordCsv(COUNTRIES_CSV),
    parseRecordCsv(REGIONS_CSV),
  ]);
  const ghana = countries.find((country) => country.code === "GH");
  if (!ghana) throw new Error("countries_rows.csv does not contain Ghana (GH)");
  const ghanaRegions = regions.filter((region) => region.country_id === ghana.id);
  return {
    countries,
    regions,
    countryCount: countries.length,
    regionCount: regions.length,
    ghanaRegionCount: ghanaRegions.length,
    ghanaCountryId: ghana.id,
  };
}

function toDateFromCsv(value: string | undefined) {
  const v = clean(value);
  if (!v) return new Date();
  const normalized = v
    .replace(" ", "T")
    .replace(/\.(\d{3})\d+/, ".$1")
    .replace(/\+00$/, "Z");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function seedLocations() {
  const seed = await readLocationSeed();

  await prisma.country.createMany({
    data: seed.countries.map((country) => ({
      id: country.id,
      code: country.code,
      name: country.name,
      dialCode: nullableText(country.dial_code),
      currency: nullableText(country.currency),
      translations: nullableText(country.translations)
        ? JSON.parse(country.translations)
        : undefined,
      isActive: country.is_active === "true",
      createdAt: toDateFromCsv(country.created_at),
      updatedAt: toDateFromCsv(country.updated_at),
    })),
    skipDuplicates: true,
  });

  await prisma.region.createMany({
    data: seed.regions.map((region) => ({
      id: region.id,
      countryId: region.country_id,
      name: region.name,
      isActive: region.is_active === "true",
      createdAt: toDateFromCsv(region.created_at),
      updatedAt: toDateFromCsv(region.updated_at),
    })),
    skipDuplicates: true,
  });

  return seed;
}

async function buildPreparedMembers(filePath: string) {
  const rows = await parseCsvFile(filePath);
  const dataRows = rows.slice(1);
  const issues: ImportIssue[] = [];
  const seed = await readLocationSeed();
  const ghanaRegions = new Map(
    seed.regions
      .filter((region) => region.country_id === seed.ghanaCountryId)
      .map((region) => [region.name.toLowerCase(), region.id]),
  );

  const prepared: PreparedMember[] = [];
  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index];
    const rowNumber = index + 2;
    const fullName = clean(row[1]);
    if (!fullName) {
      issues.push({ row: rowNumber, field: "fullName", value: "", reason: "missing name" });
      continue;
    }

    const lifeStage = normalizeLifeStage(row[11], rowNumber, issues);
    const regionalChapter = normalizeChapter(row[14], rowNumber, issues);
    const regionName = regionNameForChapter(regionalChapter);
    const regionId = regionName ? ghanaRegions.get(regionName.toLowerCase()) ?? null : null;
    if (regionName && !regionId) {
      issues.push({
        row: rowNumber,
        field: "region",
        value: regionName,
        reason: "Ghana region not found in regions_rows.csv",
      });
    }

    const departmentText = nullableText(row[27]);
    const organizationName = nullableText(row[13]);

    prepared.push({
      rowNumber,
      member: {
        fullName,
        dob: parseMdyDate(row[3], rowNumber, "dob", issues, { dob: true }),
        gender: normalizeGender(row[2]),
        email: normalizeEmail(row[7], rowNumber, issues),
        phone: clean(row[6]) || null,
        whatsapp: clean(row[6]) || null,
        maritalStatus: normalizeMaritalStatus(row[10]),
        addressLine: nullableText(row[18]),
        city: null,
        country: "Ghana",
        countryId: seed.ghanaCountryId,
        region: regionName,
        regionId,
        occupation: organizationName,
        photoUrl: nullableText(row[29]),
        status: "PENDING_APPROVAL",
      },
      profile: {
        formSubmittedAt: parseMdyDate(row[0], rowNumber, "formSubmittedAt", issues),
        emergencyContactName: nullableText(row[8]),
        emergencyContactPhone: nullableText(row[9]),
        lifeStage,
        professionalTrack: normalizeProfessionalTrack(row[12], rowNumber, issues),
        organizationName,
        regionalChapter,
        tertiaryInstitution: nullableText(row[15]),
        tertiaryProgramme: nullableText(row[16]),
        tertiaryYear: nullableText(row[17]),
        tertiaryResidence: nullableText(row[18]),
        tertiaryChapterRole: normalizeChapterRole(
          row[19],
          rowNumber,
          "tertiaryChapterRole",
          issues,
        ),
        tertiaryExecutiveRole: nullableText(row[20]),
        campusMinistryInvolvement: nullableText(row[21]),
        shsName: nullableText(row[22]),
        shsYear: nullableText(row[23]),
        shsProgramme: nullableText(row[24]),
        shsChapterRole: normalizeChapterRole(row[25], rowNumber, "shsChapterRole", issues),
        shsExecutiveRole: nullableText(row[26]),
        departmentText,
        nationalRole: nullableText(row[28]),
        overseasProgramme: nullableText(row[30]),
      },
      unitNames: unitNamesForDepartment(departmentText),
    });
  }

  return { prepared, issues, locationSeed: seed };
}

async function duplicateReport(prepared: PreparedMember[]) {
  const existing = await prisma.member.findMany({
    where: {
      OR: [{ email: { not: null } }, { phone: { not: null } }],
    },
    select: { id: true, fullName: true, email: true, phone: true },
  });
  const existingEmails = new Map(
    existing
      .filter((member) => member.email)
      .map((member) => [member.email!.toLowerCase(), member]),
  );
  const existingPhones = new Map(
    existing
      .map((member) => [digitsOnly(member.phone), member] as const)
      .filter((entry): entry is [string, (typeof existing)[number]] => Boolean(entry[0])),
  );
  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  const duplicates: { row: number; reason: string; existing?: string }[] = [];
  const importable: PreparedMember[] = [];

  for (const item of prepared) {
    const email = item.member.email?.toLowerCase() ?? null;
    const phone = digitsOnly(item.member.phone);
    const existingEmail = email ? existingEmails.get(email) : null;
    const existingPhone = phone ? existingPhones.get(phone) : null;
    if (existingEmail) {
      duplicates.push({
        row: item.rowNumber,
        reason: "email already exists",
        existing: existingEmail.fullName,
      });
      continue;
    }
    if (existingPhone) {
      duplicates.push({
        row: item.rowNumber,
        reason: "phone already exists",
        existing: existingPhone.fullName,
      });
      continue;
    }
    if (email && seenEmails.has(email)) {
      duplicates.push({
        row: item.rowNumber,
        reason: `duplicate email within CSV; first seen on row ${seenEmails.get(email)}`,
      });
      continue;
    }
    if (phone && seenPhones.has(phone)) {
      duplicates.push({
        row: item.rowNumber,
        reason: `duplicate phone within CSV; first seen on row ${seenPhones.get(phone)}`,
      });
      continue;
    }
    if (email) seenEmails.set(email, item.rowNumber);
    if (phone) seenPhones.set(phone, item.rowNumber);
    importable.push(item);
  }

  return { importable, duplicates };
}

async function ensureUnits(unitNames: string[]) {
  const uniqueNames = Array.from(new Set(unitNames));
  if (!uniqueNames.length) return new Map<string, string>();

  const existing = await prisma.churchUnitOption.findMany({
    where: { name: { in: uniqueNames } },
    select: { id: true, name: true },
  });
  const byName = new Map(existing.map((unit) => [unit.name, unit.id]));

  const maxOrder = await prisma.churchUnitOption.aggregate({ _max: { order: true } });
  let order = (maxOrder._max.order ?? 0) + 1;
  for (const name of uniqueNames) {
    if (byName.has(name)) continue;
    const created = await prisma.churchUnitOption.create({
      data: { name, order: order++, isActive: true },
      select: { id: true, name: true },
    });
    byName.set(created.name, created.id);
  }

  return byName;
}

function summarizeIssues(issues: ImportIssue[]) {
  const grouped = new Map<string, number>();
  for (const issue of issues) {
    const key = `${issue.field}: ${issue.reason}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return Array.from(grouped.entries()).map(([issue, count]) => ({ issue, count }));
}

async function dryRun(filePath: string) {
  const { prepared, issues, locationSeed } = await buildPreparedMembers(filePath);
  const duplicates = await duplicateReport(prepared);
  const mappedRegions = prepared.filter((item) => item.member.regionId).length;
  const mappedChapters = prepared.filter((item) => item.profile.regionalChapter).length;
  const unitNames = new Set(prepared.flatMap((item) => item.unitNames));

  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        sourceRows: prepared.length,
        importable: duplicates.importable.length,
        duplicates: duplicates.duplicates.length,
        locationSeed: {
          countries: locationSeed.countryCount,
          regions: locationSeed.regionCount,
          ghanaRegions: locationSeed.ghanaRegionCount,
        },
        mappedChapters,
        mappedGeographicRegions: mappedRegions,
        mappedUnitNames: Array.from(unitNames).sort(),
        issueSummary: summarizeIssues(issues),
        sampleIssues: issues.slice(0, 20),
        sampleDuplicates: duplicates.duplicates.slice(0, 20),
        sampleImportable: duplicates.importable.slice(0, 3).map((item) => ({
          row: item.rowNumber,
          name: item.member.fullName,
          email: item.member.email,
          phone: item.member.phone,
          status: item.member.status,
          region: item.member.region,
          chapter: item.profile.regionalChapter,
          units: item.unitNames,
        })),
      },
      null,
      2,
    ),
  );
}

async function commit(filePath: string) {
  const actorEmail = argValue("--created-by-email") ?? DEFAULT_ACTOR_EMAIL;
  const actor = await prisma.user.findUnique({ where: { email: actorEmail } });
  if (!actor) {
    throw new Error(`Import actor not found: ${actorEmail}. Pass --created-by-email <email>.`);
  }

  await seedLocations();
  const { prepared, issues, locationSeed } = await buildPreparedMembers(filePath);
  const duplicates = await duplicateReport(prepared);
  const unitIds = await ensureUnits(duplicates.importable.flatMap((item) => item.unitNames));

  const job = await prisma.importJob.create({
    data: {
      type: "phanet-members-2024",
      status: "RUNNING",
      total: prepared.length,
      createdById: actor.id,
      startedAt: new Date(),
    },
  });

  let created = 0;
  const failed: { row: number; reason: string }[] = [];

  for (const item of duplicates.importable) {
    try {
      await prisma.member.create({
        data: {
          ...item.member,
          units: item.unitNames.length
            ? {
                create: item.unitNames
                  .map((name) => unitIds.get(name))
                  .filter((unitId): unitId is string => Boolean(unitId))
                  .map((unitId) => ({ unitId })),
              }
            : undefined,
          phanetProfile: {
            create: item.profile,
          },
        },
      });
      created += 1;
    } catch (error) {
      failed.push({
        row: item.rowNumber,
        reason: error instanceof Error ? error.message : "unknown create failure",
      });
    }
  }

  const skipped = duplicates.duplicates.length;
  const finished = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: failed.length && created === 0 ? "FAILED" : "COMPLETED",
      processed: prepared.length,
      created,
      skipped,
      failed: failed.length,
      errors: [...issues, ...duplicates.duplicates, ...failed],
      finishedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "member.import.phanet_2024",
      subject: "Member",
      subjectId: finished.id,
      meta: {
        total: prepared.length,
        created,
        skipped,
        failed: failed.length,
        countries: locationSeed.countryCount,
        regions: locationSeed.regionCount,
        ghanaRegions: locationSeed.ghanaRegionCount,
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        mode: "commit",
        jobId: finished.id,
        total: finished.total,
        created: finished.created,
        skipped: finished.skipped,
        failed: finished.failed,
        issueSummary: summarizeIssues(issues),
        sampleDuplicates: duplicates.duplicates.slice(0, 20),
        sampleFailures: failed.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

async function seedOnly() {
  const locationSeed = await seedLocations();
  const [countries, regions, ghana] = await Promise.all([
    prisma.country.count(),
    prisma.region.count(),
    prisma.country.findUnique({
      where: { code: "GH" },
      select: { _count: { select: { regions: true } } },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        mode: "seed-locations",
        sourceCountries: locationSeed.countryCount,
        sourceRegions: locationSeed.regionCount,
        sourceGhanaRegions: locationSeed.ghanaRegionCount,
        databaseCountries: countries,
        databaseRegions: regions,
        databaseGhanaRegions: ghana?._count.regions ?? 0,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const filePath = argValue("--file") ?? DEFAULT_MEMBER_CSV;
  const modes = ["--dry-run", "--commit", "--seed-locations"].filter(hasArg);
  if (modes.length === 0) {
    throw new Error("Pass one of --dry-run, --commit, or --seed-locations.");
  }
  if (modes.length > 1) {
    throw new Error("Pass only one of --dry-run, --commit, or --seed-locations.");
  }

  if (hasArg("--dry-run")) await dryRun(filePath);
  else if (hasArg("--seed-locations")) await seedOnly();
  else await commit(filePath);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
