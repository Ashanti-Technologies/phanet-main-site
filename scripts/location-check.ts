// Self-check for location capture. Run: pnpm tsx scripts/location-check.ts
import assert from "node:assert/strict";
import { answerText, checkAnswer, type RegistrationField } from "../src/lib/schemas/event-registration.schema";
import { dedupe, normalizePlace, parseGeoLine, type GeoRow } from "./import-geonames-cities";

const field = (required: boolean): RegistrationField => ({
  id: "from_location",
  label: "Coming from",
  type: "location",
  required,
  scope: "booking",
  summary: true,
  options: [],
});

// checkAnswer: [city, region, country]
assert.deepEqual(checkAnswer(field(true), [" Kumasi ", "Ashanti", "Ghana"]), { ok: true, value: ["Kumasi", "Ashanti", "Ghana"] });
assert.deepEqual(checkAnswer(field(false), undefined), { ok: true, value: undefined });
assert.deepEqual(checkAnswer(field(false), ["", "", "Ghana"]), { ok: true, value: undefined }); // country only = unanswered
assert.equal(checkAnswer(field(true), undefined).ok, false);
assert.equal(checkAnswer(field(true), ["", "", "Ghana"]).ok, false);
assert.equal(checkAnswer(field(true), ["Kumasi", "Ashanti", ""]).ok, false); // no country
assert.equal(checkAnswer(field(true), "Kumasi").ok, false); // wrong shape
assert.equal(checkAnswer(field(true), ["Kumasi", "Ghana"]).ok, false);
assert.equal(checkAnswer(field(true), ["x".repeat(101), "", "Ghana"]).ok, false);

// answerText skips a missing region
assert.equal(answerText(["Kumasi", "Ashanti", "Ghana"]), "Kumasi, Ashanti, Ghana");
assert.equal(answerText(["Hyattsville", "", "United States"]), "Hyattsville, United States");

// Region names from GeoNames vs ours
assert.equal(normalizePlace("Ashanti Region"), normalizePlace("Ashanti"));
assert.equal(normalizePlace("Bono East"), "bonoeast");
assert.equal(normalizePlace("Île-de-France"), "iledefrance");
assert.notEqual(normalizePlace("Western"), normalizePlace("Western North"));

// GeoNames line parsing: Obuasi is listed as "Obuase" with Obuasi as an alternate name
const line = (id: number, name: string, code: string, pop: number, alt = "") =>
  [id, name, name, alt, "6.2", "-1.6", "P", code, "GH", "", "02", "", "", "", pop].join("\t");
const obuase = parseGeoLine(line(2296606, "Obuase", "PPL", 179604, "Oboase,Obuasi,Обуаси"))!;
assert.equal(obuase.name, "Obuase");
assert.ok(obuase.searchText.includes("obuasi"));
assert.ok(!obuase.searchText.includes("Обуаси".toLowerCase())); // non-Latin dropped
assert.equal(parseGeoLine(line(1, "Old Town", "PPLH", 0)), null); // historical place skipped

// Dedupe keeps the better place per (country, region, name)
const village = parseGeoLine(line(10, "Nkwanta", "PPL", 0))!;
const town = parseGeoLine(line(11, "Nkwanta", "PPLA2", 0))!;
const big = parseGeoLine(line(12, "Nkwanta", "PPL", 5000))!;
const kept = (rows: GeoRow[]) => dedupe(rows, (r) => r.admin1).map((r) => r.geonameId);
assert.deepEqual(kept([village, town]), [11]);
assert.deepEqual(kept([town, big, village]), [12]);

console.log("location-check: all assertions passed");
