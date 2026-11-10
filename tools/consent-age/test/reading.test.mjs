// The reading of section 5 and the category of section 6, on tables written here.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileSchemas, readSchema } from "../../format-check/schemas.mjs";
import { CONSENT_AGE_PART } from "../main.mjs";
import { RULES, ageOn, asksAgain, caseOf, categoryOf, isDay, readingOf } from "../reading.mjs";

const spec = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const validate = compileSchemas([readSchema(spec, "consent-age.schema.json", CONSENT_AGE_PART)]).validators.get("consent-age");

const entry = (age, from) => ({ age, from, law: "Synthetic Act", provision: "Article 1", quote: "The words.", source: "https://example.org/act", read: "2026-11-10" });
const tableOf = (countries) => ({ format: 1, outside_table: 18, countries });

test("the rules are read in the order of the text", () => {
  assert.deepEqual(RULES, ["consent-age.days", "consent-age.entries-ordered", "consent-age.ages-kept"]);
  const readme = fs.readFileSync(path.join(spec, "consent-age/README.md"), "utf8");
  const listed = [...readme.matchAll(/^\| `(consent-age\.[a-z-]+)` \|/gm)].map((match) => match[1]);
  assert.deepEqual(listed, RULES);
});

test("a day is one the calendar has", () => {
  for (const day of ["2024-02-29", "2026-12-31", "2018-05-25", "0050-01-01", "0000-02-29"]) assert.ok(isDay(day), day);
  for (const day of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "0100-02-29"]) assert.ok(!isDay(day), day);
});

test("the reading stops at the first step that refuses, and names each place once", () => {
  assert.deepEqual(readingOf(validate, tableOf({ BE: [entry(13, "2018-05-25")] })), { accepted: true });
  // The schema comes first: a bad day by shape is the schema's, not consent-age.days'.
  assert.deepEqual(readingOf(validate, tableOf({ BE: [entry(13, "2018-5-25")] })), { refused_by: "schema", names: ["countries.BE.0.from"] });
  // An entry whose from and read are both no days is named once.
  assert.deepEqual(readingOf(validate, tableOf({ BE: [{ ...entry(13, "2018-02-30"), read: "2026-02-30" }] })), { refused_by: "consent-age.days", names: ["countries.BE.0"] });
  // An entry out of order and a day that is none: the days come first.
  assert.deepEqual(readingOf(validate, tableOf({ AT: [entry(14, "2019-01-01"), entry(16, "2018-02-30")] })), { refused_by: "consent-age.days", names: ["countries.AT.1"] });
  assert.deepEqual(readingOf(validate, tableOf({ AT: [entry(14, "2019-01-01"), entry(16, "2018-05-25")] })), { refused_by: "consent-age.entries-ordered", names: ["countries.AT"] });
});

test("consent-age.ages-kept holds the age and the day of every entry before, and lets the words change", () => {
  const before = tableOf({ AT: [entry(14, "2018-05-25")], BE: [entry(13, "2018-05-25")] });
  const reworded = tableOf({ AT: [{ ...entry(14, "2018-05-25"), quote: "The words, corrected.", read: "2027-01-01" }, entry(16, "2030-01-01")], BE: [entry(13, "2018-05-25")], DE: [entry(16, "2018-05-25")] });
  assert.deepEqual(readingOf(validate, reworded, before), { accepted: true });
  assert.deepEqual(readingOf(validate, tableOf({ AT: [entry(15, "2018-05-25")] }), before), { refused_by: "consent-age.ages-kept", names: ["countries.AT", "countries.BE"] });
  // With no release before, nothing is kept.
  assert.deepEqual(readingOf(validate, tableOf({ AT: [entry(15, "2018-05-25")] }), null), { accepted: true });
});

test("the age of a country on a day is its latest entry applying then, or the age outside the table", () => {
  const table = tableOf({ ES: [entry(14, "2018-12-07"), entry(16, "2030-01-01")], PT: [entry(13, "2030-01-01")] });
  assert.equal(ageOn(table, "ES", "2018-12-06"), 18);
  assert.equal(ageOn(table, "ES", "2018-12-07"), 14);
  assert.equal(ageOn(table, "ES", "2029-12-31"), 14);
  assert.equal(ageOn(table, "ES", "2030-01-01"), 16);
  assert.equal(ageOn(table, "PT", "2026-11-10"), 18);
  assert.equal(ageOn(table, "IN", "2026-11-10"), 18);
  // A key of Object.prototype is no country of the table.
  assert.equal(ageOn(table, "constructor", "2026-11-10"), 18);
});

test("the category has its four bounds: 13, the country's age, 18", () => {
  const table = tableOf({ BE: [entry(13, "2018-05-25")], DE: [entry(16, "2018-05-25")] });
  assert.equal(categoryOf(table, "DE", 12, "2026-11-10"), "under_13");
  assert.equal(categoryOf(table, "DE", 15, "2026-11-10"), "from_13_to_consent");
  assert.equal(categoryOf(table, "DE", 16, "2026-11-10"), "from_consent_to_18");
  assert.equal(categoryOf(table, "DE", 18, "2026-11-10"), "adult");
  assert.equal(categoryOf(table, "BE", 13, "2026-11-10"), "from_consent_to_18");
  // Outside the table, from_consent_to_18 is empty.
  for (let age = 13; age < 18; age++) assert.equal(categoryOf(table, "US", age, "2026-11-10"), "from_13_to_consent");
});

test("the age is asked again only of a learner who consented themselves, and only when the age is above the one the category was given by", () => {
  const table = tableOf({ ES: [entry(14, "2018-12-07"), entry(16, "2030-01-01")], SE: [entry(16, "2018-05-25"), entry(13, "2027-07-01")] });
  assert.equal(asksAgain(table, "ES", "from_consent_to_18", 14, "2030-01-01"), true);
  assert.equal(asksAgain(table, "ES", "from_consent_to_18", 14, "2029-12-31"), false);
  assert.equal(asksAgain(table, "ES", "from_consent_to_18", 16, "2031-01-01"), false);
  assert.equal(asksAgain(table, "ES", "from_13_to_consent", 14, "2030-01-01"), false);
  assert.equal(asksAgain(table, "SE", "from_consent_to_18", 16, "2027-08-01"), false);
  // A law found late: an entry written after its day still asks the age again of a category given
  // by the age before it, whatever day it was given.
  const late = tableOf({ DK: [entry(13, "2018-05-25"), entry(15, "2024-01-01")] });
  assert.equal(asksAgain(late, "DK", "from_consent_to_18", 13, "2026-11-10"), true);
  // A case of a vector is either kind.
  assert.deepEqual(caseOf(table, { country: "ES", age_years: 15, day: "2030-01-01", category: "adult", applied: 13 }), { category: "from_13_to_consent", applied: 16 });
  assert.deepEqual(caseOf(table, { country: "ES", category: "from_consent_to_18", applied: 14, today: "2030-01-01", ask_again: false }), { ask_again: true });
});
