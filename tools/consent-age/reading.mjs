// The reading of the table of the age of digital consent, section 5 of consent-age/README.md — the
// table's schema first, then the rules in the order of the text's table — and the category of
// section 6. A second implementation, beside api's, which computes what each vector gives, and by
// which consent-age-check reads spec's own table.

import { isDeepStrictEqual } from "node:util";
import { byCodeUnits } from "../shared.mjs";
import { namesOf } from "../parts.mjs";

export const SCHEMA = "schema";
export const DAYS = "consent-age.days";
export const ENTRIES_ORDERED = "consent-age.entries-ordered";
export const AGES_KEPT = "consent-age.ages-kept";
export const RULES = [DAYS, ENTRIES_ORDERED, AGES_KEPT];

export const UNDER_13 = "under_13";
export const FROM_13_TO_CONSENT = "from_13_to_consent";
export const FROM_CONSENT_TO_18 = "from_consent_to_18";
export const ADULT = "adult";

// What a reader gives a table, with validate the compiled schema of the table and previous the
// table of the release before, or null when that release has no consent-age/: { accepted: true }
// when it accepts the table, or { refused_by, names } with the names in the order of code units.
export function readingOf(validate, table, previous = null) {
  if (!validate(table)) return { refused_by: SCHEMA, names: namesOf(validate.errors) };
  for (const [rule, breaches] of [
    [DAYS, () => dayBreaches(table)],
    [ENTRIES_ORDERED, () => orderBreaches(table)],
    [AGES_KEPT, () => (previous ? keptBreaches(table, previous) : [])],
  ]) {
    const names = breaches();
    if (names.length) return { refused_by: rule, names: [...new Set(names)].sort(byCodeUnits) };
  }
  return { accepted: true };
}

// Whether text, YYYY-MM-DD as the schema has it, is a day of the calendar: 2026-02-29 is none.
// setUTCFullYear takes a year as it is: Date.UTC would read the years 0 to 99 as 1900 to 1999.
export function isDay(text) {
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// consent-age.days: every from and every read is a day of the calendar.
function dayBreaches(table) {
  const names = [];
  for (const [country, entries] of Object.entries(table.countries)) {
    entries.forEach((entry, index) => {
      if (!isDay(entry.from) || !isDay(entry.read)) names.push(`countries.${country}.${index}`);
    });
  }
  return names;
}

// consent-age.entries-ordered: the entries of a country stand by their from, each later than the
// one before it. Days written YYYY-MM-DD compare as text.
function orderBreaches(table) {
  return Object.entries(table.countries)
    .filter(([, entries]) => entries.some((entry, index) => index > 0 && entry.from <= entries[index - 1].from))
    .map(([country]) => `countries.${country}`);
}

// consent-age.ages-kept: every entry of the table before — its age and its from — is here, in its
// country.
function keptBreaches(table, previous) {
  const names = [];
  for (const [country, entries] of Object.entries(previous.countries)) {
    const here = Object.hasOwn(table.countries, country) ? table.countries[country] : [];
    const kept = entries.every(({ age, from }) => here.some((entry) => isDeepStrictEqual({ age: entry.age, from: entry.from }, { age, from })));
    if (!kept) names.push(`countries.${country}`);
  }
  return names;
}

// The age of digital consent of country on day, by an accepted table: the age of its latest entry
// whose from is not after day, or outside_table when it has none (section 6).
export function ageOn(table, country, day) {
  const entries = Object.hasOwn(table.countries, country) ? table.countries[country] : [];
  const applying = entries.filter((entry) => entry.from <= day);
  return applying.length ? applying[applying.length - 1].age : table.outside_table;
}

// The category of a learner of ageYears years in country on day (section 6).
export function categoryOf(table, country, ageYears, day) {
  if (ageYears < 13) return UNDER_13;
  if (ageYears < ageOn(table, country, day)) return FROM_13_TO_CONSENT;
  if (ageYears < 18) return FROM_CONSENT_TO_18;
  return ADULT;
}

// Whether a profile of country, whose category was given by the age of digital consent applied,
// needs its age given again on the day today: only from_consent_to_18, and only when the age of its
// country on today is above applied (section 6). The age it was given by is kept, not the day: an
// entry written after its day — a law found late — would otherwise change what the day gave.
export function asksAgain(table, country, category, applied, today) {
  return category === FROM_CONSENT_TO_18 && ageOn(table, country, today) > applied;
}

// What section 6 gives a case of a vector of the category: { category, applied } of a learner, or
// { ask_again } of a profile.
export function caseOf(table, { country, category, age_years: ageYears, day, applied, today }) {
  if (ageYears !== undefined) return { category: categoryOf(table, country, ageYears, day), applied: ageOn(table, country, day) };
  return { ask_again: asksAgain(table, country, category, applied, today) };
}
