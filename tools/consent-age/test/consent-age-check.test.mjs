// Each test breaks one thing in a trial copy of spec's own consent-age/ and expects
// consent-age-check to name it; the release before is read from made-up repositories. The first test
// reads the copy untouched, and the last one runs the command.

import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONSENT_AGE_PART, checkConsentAge, consentAgeAt, consentAgeCheck, previousConsentAge } from "../main.mjs";
import { GIT } from "../../shared.mjs";
import { isolated, scratchRepository } from "../../release/test/repository.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const TABLE_SCHEMA = "consent-age/schemas/consent-age.schema.json";
const README = "consent-age/README.md";
const TABLE = "consent-age/consent-age.yaml";
const ACCEPTED = "consent-age/vectors/reading/accepted.yaml";
const CATEGORY = "consent-age/vectors/category/ages.yaml";
const none = () => null;

// A copy of spec's consent-age/ under a new folder, with each [file, from, to] edit applied: from
// null writes the file anew with to, to null deletes it.
function trialCopy(edits, root = fs.mkdtempSync(path.join(os.tmpdir(), "consent-age-check-"))) {
  fs.cpSync(path.join(spec, "consent-age"), path.join(root, "consent-age"), { recursive: true });
  for (const [file, from, to] of edits) edit(root, file, from, to);
  return root;
}

function edit(root, file, from, to) {
  const target = path.join(root, file);
  if (to === null) fs.rmSync(target, { recursive: true });
  else if (from === null) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, to);
  } else {
    const text = fs.readFileSync(target, "utf8");
    assert.ok(text.includes(from), `${file} has no "${from}"`);
    fs.writeFileSync(target, text.replace(from, () => to));
  }
}

function errorsOf(edits = [], previousOf = none) {
  const root = trialCopy(edits);
  try {
    return checkConsentAge(root, { previousOf }).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function expectOnly(edits, pattern, previousOf = none) {
  const errors = errorsOf(edits, previousOf);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

function expectSome(edits, pattern) {
  const errors = errorsOf(edits);
  assert.ok(errors.some((error) => pattern.test(error)), `no error matches ${pattern}:\n${errors.join("\n")}`);
}

// The table of spec's own consent-age/, as text, and its first entry's day.
const table = () => fs.readFileSync(path.join(spec, TABLE), "utf8");
const firstFrom = () => /from: "(\d{4}-\d{2}-\d{2})"/.exec(table())[0];

test("spec's own consent-age/ passes, and the stats count what it holds", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkConsentAge(root, { previousOf: none });
    assert.deepEqual(errors, []);
    assert.equal(stats.schemas, 3);
    assert.equal(stats.rules, 3);
    assert.ok(stats.examples >= 2 && stats.vectors >= 6 && stats.cases >= 6, JSON.stringify(stats));
    assert.ok(stats.countries >= 1 && stats.entries >= stats.countries, JSON.stringify(stats));
    assert.equal(stats.previous, null);
    assert.equal(CONSENT_AGE_PART.folder, "consent-age");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a root with no consent-age/ has that one error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "consent-age-none-"));
  try {
    assert.deepEqual(checkConsentAge(root).errors, [{ file: "consent-age", line: 0, message: "the folder of the age of digital consent is not there" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a file the layout does not know is an error", () => {
  expectOnly([["consent-age/notes.txt", null, "notes\n"]], /^consent-age\/notes\.txt:0: no file of the layout of consent-age\/ \(consent-age\/README\.md, section 3\)$/);
  expectOnly([["consent-age/vectors/other/case.yaml", null, "cases: []\n"]], /^consent-age\/vectors\/other\/case\.yaml:0: no file of the layout/);
});

test("VERSION is an integer and a newline, and the $id of each schema and the field format name it", () => {
  expectSome([["consent-age/VERSION", null, "01\n"]], /^consent-age\/VERSION:1: the part's version is an integer from 1/);
  expectSome([["consent-age/VERSION", null, null]], /^consent-age\/VERSION:0: no VERSION/);
  expectSome([[TABLE_SCHEMA, '"const": 1,', '"const": 2,']], /^consent-age\/schemas\/consent-age\.schema\.json:\d+: the field format is the const 1, the version in consent-age\/VERSION$/);
});

test("each schema the text names is there, and follows the conventions of the format's", () => {
  expectSome([["consent-age/schemas/category-vector.schema.json", null, null]], /^consent-age\/schemas:0: no category-vector\.schema\.json, which the text names$/);
  expectSome([[TABLE_SCHEMA, '"type": "object",\n  "properties"', '"type": "object",\n  "x-open": true,\n  "properties"']], /x-open/);
});

test("the rules of the text are the rules reading.mjs knows, in its order", () => {
  const row = "| `consent-age.days` | Every `from` and every `read` MUST be a day of the calendar. |\n";
  const order = "| `consent-age.entries-ordered` | The entries of a country MUST stand by their `from`, each later than the one before it. |\n";
  expectOnly([[README, row, ""]], /^consent-age\/README\.md:0: consent-age\.days: a rule consent-age-check knows, and the text lists it not$/);
  expectOnly([[README, row, `${row}| \`consent-age.other\` | Another rule. |\n`]], /^consent-age\/README\.md:\d+: consent-age\.other: no rule consent-age-check knows$/);
  expectOnly([[README, row + order, order + row]], /^consent-age\/README\.md:\d+: the rules stand in the order reading\.mjs reads them, consent-age\.days, consent-age\.entries-ordered, consent-age\.ages-kept$/);
  expectOnly([[README, null, null]], /^consent-age\/README\.md:0: no text$/);
});

test("an example passes its schema or names the error it gives, and needs its schema", () => {
  expectSome([["consent-age/examples/consent-age/invalid/uk-code.yaml", "# error: enum at #/countries", "# error: const at #/format"]], /uk-code\.yaml/);
  expectOnly([["consent-age/examples/other/valid/case.yaml", null, "a: 1\n"]], /^consent-age\/examples\/other\/valid\/case\.yaml:0: an example of other, which has no schema in consent-age\/schemas$/);
});

test("a vector of reading passes its schema, its table of the release before is a table, and each case gives what section 5 computes", () => {
  expectOnly([[ACCEPTED, "    accepted: true\n  # A new entry", "    refused_by: schema\n    names: [x]\n  # A new entry"]], /^consent-age\/vectors\/reading\/accepted\.yaml:0: cases\/0: the reading gives \{"accepted":true\}, and the vector \{"refused_by":"schema","names":\["x"\]\}$/);
  expectSome([[ACCEPTED, "cases:", "cases: 1\nother:"]], /accepted\.yaml:0: does not pass the schema of a vector of reading/);
  expectSome([[ACCEPTED, "cases:", "cases:\ncases:"]], /accepted\.yaml:\d+: yaml\.unique-keys/);
  expectOnly([[ACCEPTED, "    previous:\n      format: 1", "    previous:\n      format: 2"]], /^consent-age\/vectors\/reading\/accepted\.yaml:0: cases\/1\/previous: a table of a release is one the schema accepts: const at #\/format/);
});

test("a vector of the category passes its schema, its table is one section 5 accepts, and each case gives what section 6 computes", () => {
  expectOnly([[CATEGORY, 'age_years: 12, day: "2026-11-10", category: under_13', 'age_years: 12, day: "2026-11-10", category: adult']], /^consent-age\/vectors\/category\/ages\.yaml:0: cases\/1: section 6 gives category "under_13", and the vector "adult"$/);
  expectOnly([[CATEGORY, 'age_years: 13, day: "2026-11-10", category: from_13_to_consent, applied: 14', 'age_years: 13, day: "2026-11-10", category: from_13_to_consent, applied: 15']], /cases\/5: section 6 gives applied 14, and the vector 15$/);
  expectOnly([[CATEGORY, 'applied: 14, today: "2030-01-01", ask_again: true', 'applied: 14, today: "2030-01-01", ask_again: false']], /cases\/21: section 6 gives ask_again true, and the vector false$/);
  expectSome([[CATEGORY, '        from: "2018-06-21"', '        from: "2018-06-31"']], /^consent-age\/vectors\/category\/ages\.yaml:0: table: section 5 refuses the table of a vector of the category, by consent-age\.days: countries\.FR\.0$/);
  expectSome([[CATEGORY, "cases:", "cases: []\nother:"]], /ages\.yaml:0: does not pass the schema of a vector of the category/);
});

test("the vectors accept a table, refuse one by the schema and by each rule, and give every category and both answers", () => {
  expectOnly([["consent-age/vectors/reading/days.yaml", null, null]], /^consent-age\/vectors\/reading:0: no vector of reading refuses a table by consent-age\.days \(consent-age\/README\.md, section 8\)$/);
  expectOnly([["consent-age/vectors/reading/schema.yaml", null, null]], /^consent-age\/vectors\/reading:0: no vector of reading refuses a table by the schema/);
  expectOnly([[ACCEPTED, null, null]], /^consent-age\/vectors\/reading:0: no vector of reading accepts a table/);
  const errors = errorsOf([[CATEGORY, null, null]]);
  assert.deepEqual(errors, [
    "consent-age/vectors/category:0: no vector of the category answers false to asking the age again (consent-age/README.md, section 8)",
    "consent-age/vectors/category:0: no vector of the category answers true to asking the age again (consent-age/README.md, section 8)",
    "consent-age/vectors/category:0: no vector of the category gives the category adult (consent-age/README.md, section 8)",
    "consent-age/vectors/category:0: no vector of the category gives the category from_13_to_consent (consent-age/README.md, section 8)",
    "consent-age/vectors/category:0: no vector of the category gives the category from_consent_to_18 (consent-age/README.md, section 8)",
    "consent-age/vectors/category:0: no vector of the category gives the category under_13 (consent-age/README.md, section 8)",
  ]);
});

test("the table itself is read as section 5 reads it: the YAML rules, the schema, then the rules", () => {
  expectOnly([[TABLE, null, null]], /^consent-age\/consent-age\.yaml:0: no table$/);
  expectOnly([[TABLE, "format: 1", "format: 1\nformat: 1"]], /^consent-age\/consent-age\.yaml:\d+: yaml\.unique-keys/);
  expectOnly([[TABLE, "outside_table: 18", "outside_table: 16"]], /^consent-age\/consent-age\.yaml:0: does not pass consent-age\/schemas\/consent-age\.schema\.json: outside_table$/);
  expectOnly([[TABLE, "format: 1\noutside_table: 18\ncountries:", "format: 1\noutside_table: 18\nother: 1\ncountries:"]], /does not pass consent-age\/schemas\/consent-age\.schema\.json: other$/);
  expectOnly([[TABLE, firstFrom(), 'from: "2018-02-30"']], /^consent-age\/consent-age\.yaml:0: consent-age\.days: countries\.[A-Z]{2}\.0, consent-age\/README\.md, section 5$/);
  // A table that is a folder is named, not thrown.
  expectSome([[TABLE, null, null], [`${TABLE}/inside.txt`, null, "x\n"]], /^consent-age\/consent-age\.yaml:0: no table$/);
});

test("consent-age.ages-kept reads the table of the release before, which previousOf gives", () => {
  const root = trialCopy([]);
  try {
    const own = consentAgeOf(root);
    const country = Object.keys(own.countries)[0];
    // The table as it was holds the rule; a release before with no consent-age/ holds it too.
    assert.deepEqual(checkConsentAge(root, { previousOf: () => ({ tag: "v0.14.0", table: own }) }).errors, []);
    assert.equal(checkConsentAge(root, { previousOf: () => ({ tag: "v0.14.0", table: own }) }).stats.previous, "v0.14.0");
    const none = checkConsentAge(root, { previousOf: () => ({ tag: "v0.13.0", table: null }) });
    assert.deepEqual(none.errors, []);
    // A release with no table is no release the table was held to.
    assert.equal(none.stats.previous, null);
    // A release before whose entry had another age: refused, against that release.
    const other = structuredClone(own);
    other.countries[country][0].age = other.countries[country][0].age === 13 ? 14 : 13;
    assert.deepEqual(checkConsentAge(root, { previousOf: () => ({ tag: "v0.14.0", table: other }) }).errors, [
      { file: TABLE, line: 0, message: `consent-age.ages-kept: countries.${country}, consent-age/README.md, section 5, against v0.14.0` },
    ]);
    // A release before whose table its schema refuses is named, and the table is not read against it.
    const shapeless = { format: 1, outside_table: 18, others: {} };
    assert.deepEqual(checkConsentAge(root, { previousOf: () => ({ tag: "v0.14.0", table: shapeless }) }).errors.map(({ file, message }) => `${file}: ${message.replace(/: .*$/, "")}`), ["consent-age: the table of v0.14.0 does not pass consent-age/schemas/consent-age.schema.json, for consent-age.ages-kept"]);
    // A rule other than consent-age.ages-kept reads no release before, and names none.
    fs.writeFileSync(path.join(root, TABLE), fs.readFileSync(path.join(root, TABLE), "utf8").replace(firstFrom(), 'from: "2018-02-30"'));
    assert.match(checkConsentAge(root, { previousOf: () => ({ tag: "v0.14.0", table: own }) }).errors[0].message, /^consent-age\.days: countries\.[A-Z]{2}\.0, consent-age\/README\.md, section 5$/);
    // A release before that cannot be read is an error, and the table is not read without it.
    assert.deepEqual(
      checkConsentAge(root, {
        previousOf: () => {
          throw new Error("a shallow clone");
        },
      }).errors,
      [{ file: "consent-age", line: 0, message: "the release before cannot be read, for consent-age.ages-kept: a shallow clone" }],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// The table of a copy's consent-age/, as consentAgeAt reads one, from the folder.
function consentAgeOf(root) {
  const { dir, git } = scratchRepository("consent-age-table-");
  try {
    fs.cpSync(path.join(root, "consent-age"), path.join(dir, "consent-age"), { recursive: true });
    git("add", "--all");
    git("commit", "--quiet", "-m", "consent-age");
    return consentAgeAt(dir, "HEAD");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the release before is the newest release tag in the history of HEAD, not HEAD's own unless the working tree changes consent-age/", () => {
  const { dir, git } = scratchRepository("consent-age-previous-");
  try {
    fs.writeFileSync(path.join(dir, "README.md"), "spec\n");
    git("add", "--all");
    git("commit", "--quiet", "-m", "first");
    assert.equal(previousConsentAge(dir), null);
    // A release with no consent-age/: the rule holds.
    git("tag", "v0.13.0");
    git("commit", "--quiet", "--allow-empty", "-m", "second");
    assert.deepEqual(previousConsentAge(dir), { tag: "v0.13.0", table: null });
    // A release with consent-age/.
    trialCopy([], dir);
    git("add", "--all");
    git("commit", "--quiet", "-m", "consent-age");
    git("tag", "v0.14.0");
    assert.equal(previousConsentAge(dir).tag, "v0.13.0");
    edit(dir, TABLE, firstFrom(), 'from: "2018-05-26"');
    const changed = previousConsentAge(dir);
    assert.equal(changed.tag, "v0.14.0");
    assert.equal(changed.table.format, 1);
    // ... and consent-age-check refuses the change against it, from git.
    const errors = checkConsentAge(dir).errors;
    assert.equal(errors.length, 1, JSON.stringify(errors));
    assert.match(errors[0].message, /^consent-age\.ages-kept: countries\.[A-Z]{2}, consent-age\/README\.md, section 5, against v0\.14\.0$/);
    git("checkout", "--quiet", "--", "consent-age");
    assert.deepEqual(checkConsentAge(dir).errors, []);
    // A release whose table breaks the YAML rules, or that has none, has no table to compare with.
    fs.writeFileSync(path.join(dir, TABLE), "format: 1\nformat: 1\n");
    git("commit", "--quiet", "--all", "-m", "a table that is no YAML of the rules");
    git("tag", "v0.14.1");
    assert.throws(() => consentAgeAt(dir, "v0.14.1"), /^Error: consent-age\/consent-age\.yaml at v0\.14\.1 cannot be read: line 2: yaml\.unique-keys/);
    git("rm", "--quiet", TABLE);
    git("commit", "--quiet", "-m", "no table");
    git("tag", "v0.14.2");
    assert.throws(() => consentAgeAt(dir, "v0.14.2"), /^Error: v0\.14\.2 has consent-age\/ and no consent-age\/consent-age\.yaml$/);
    // A shallow clone has no tags to count from.
    const shallow = `${dir}-shallow`;
    const clone = spawnSync(GIT, ["clone", "--quiet", "--depth", "1", `file://${dir}`, shallow], { encoding: "utf8", env: isolated });
    assert.equal(clone.status, 0, clone.stderr);
    try {
      assert.throws(() => previousConsentAge(shallow), /a shallow clone has no tags to find the previous release by/);
    } finally {
      fs.rmSync(shallow, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the command prints ok, and the errors of a broken copy", () => {
  const main = path.join(spec, "tools/consent-age/main.mjs");
  const ok = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^consent-age-check: ok — 3 schemas, 3 rules, \d+ examples, \d+ vectors with \d+ cases; the table: \d+ countries, \d+ entries(, against v\d+\.\d+\.\d+|, with no table of a release before)\n$/);
  const usage = spawnSync(process.execPath, [main, "extra"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^usage: node tools\/consent-age\/main\.mjs/);
  const root = trialCopy([["consent-age/notes.txt", null, "notes\n"]]);
  const printed = mock.method(console, "error", () => {});
  const logged = mock.method(console, "log", () => {});
  try {
    consentAgeCheck(root, { previousOf: none });
    assert.equal(process.exitCode, 1);
    assert.deepEqual(
      printed.mock.calls.map((call) => call.arguments[0]),
      ["consent-age/notes.txt:0: no file of the layout of consent-age/ (consent-age/README.md, section 3)", "consent-age-check: 1 error"],
    );
    process.exitCode = 0;
    fs.rmSync(path.join(root, "consent-age/notes.txt"));
    consentAgeCheck(root, { previousOf: () => ({ tag: "v0.13.0", table: null }) });
    assert.match(logged.mock.calls.at(-1).arguments[0], /^consent-age-check: ok — .*, with no table of a release before$/);
  } finally {
    printed.mock.restore();
    logged.mock.restore();
    process.exitCode = 0;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
