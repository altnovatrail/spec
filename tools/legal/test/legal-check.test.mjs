// Each test breaks one thing in a trial copy of spec's own legal/ and expects legal-check to name
// it; the release before is read from made-up repositories, and a self-hosted copy's folder from
// one written here. The first test reads the copy untouched, and the last ones run the commands.

import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEGAL_PART, checkLegal, checkLegalDir, legalAt, legalCheck, legalCheckDir, previousLegal } from "../main.mjs";
import { GIT } from "../../shared.mjs";
import { isolated, scratchRepository } from "../../release/test/repository.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const JUST = process.env.JUST ?? "/usr/local/bin/just";
const PASSPORT_SCHEMA = "legal/schemas/legal.schema.json";
const VECTOR_SCHEMA = "legal/schemas/reading-vector.schema.json";
const README = "legal/README.md";
const PASSPORT = "legal/legal.yaml";
const ACCEPTED = "legal/vectors/reading/accepted.yaml";
const MARKDOWN = "legal/vectors/reading/markdown.yaml";
const POLICY = "legal/texts/privacy-policy/1.md";
const none = () => null;

// A copy of spec's legal/ under a new folder, with each [file, from, to] edit applied: from null
// writes the file anew with to, to null deletes it.
function trialCopy(edits, root = fs.mkdtempSync(path.join(os.tmpdir(), "legal-check-"))) {
  fs.cpSync(path.join(spec, "legal"), path.join(root, "legal"), { recursive: true });
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
    return checkLegal(root, { previousOf }).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
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

// The line of the text that holds the rule's row.
const ruleLine = (rule) => fs.readFileSync(path.join(spec, README), "utf8").split("\n").findIndex((line) => line.startsWith(`| \`${rule}\` |`)) + 1;
// The passport of spec's own legal/, as text.
const passport = () => fs.readFileSync(path.join(spec, PASSPORT), "utf8");

test("spec's own legal/ passes, and the stats count what it holds", () => {
  const root = trialCopy([]);
  try {
    const { errors, stats } = checkLegal(root, { previousOf: none });
    assert.deepEqual(errors, []);
    assert.equal(stats.schemas, 2);
    assert.equal(stats.rules, 5);
    assert.ok(stats.examples >= 2 && stats.vectors >= 7 && stats.cases >= 7);
    assert.ok(stats.texts >= 1 && stats.versions >= stats.texts);
    assert.equal(stats.previous, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a root with no legal/ has that one error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "legal-check-"));
  try {
    assert.deepEqual(checkLegal(root).errors, [{ file: "legal", line: 0, message: "the legal texts' folder is not there" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a file the layout does not know is an error, and a file under texts/ that is no version is legal.files'", () => {
  expectOnly([["legal/notes.txt", null, "notes\n"]], /^legal\/notes\.txt:0: no file of the layout of legal\/ \(legal\/README\.md, section 3\)$/);
  expectOnly([["legal/vectors/reading/Accepted.yaml", null, "cases: []\n"]], /^legal\/vectors\/reading\/Accepted\.yaml:0: no file of the layout/);
  expectOnly([["legal/vectors/rules/case.yaml", null, "cases: []\n"]], /^legal\/vectors\/rules\/case\.yaml:0: no file of the layout/);
  expectOnly([["legal/examples/legal/broken/case.yaml", null, "a: b\n"]], /no file of the layout/);
  expectOnly([["legal/texts/privacy-policy/9.md", null, "# Privacy policy\n"]], /^legal\/texts\/privacy-policy\/9\.md:0: legal\.files: texts\/privacy-policy\/9\.md$/);
  expectOnly([["legal/texts/notes.txt", null, "notes\n"]], /^legal\/texts\/notes\.txt:0: legal\.files: texts\/notes\.txt$/);
});

test("VERSION is an integer and a newline, and the $id of each schema and the field format name it", () => {
  const zero = errorsOf([["legal/VERSION", "1\n", "01\n"]]);
  assert.ok(zero.includes("legal/VERSION:1: the part's version is an integer from 1 and a newline, with no leading zero"), zero.join("\n"));
  const two = errorsOf([["legal/VERSION", "1\n", "2\n"]]);
  assert.ok(two.some((error) => /^legal\/schemas\/legal\.schema\.json:3: \$id is https:\/\/altnovatrail\.github\.io\/spec\/legal\/2\/legal\.schema\.json/.test(error)), two.join("\n"));
  assert.ok(two.some((error) => /^legal\/schemas\/legal\.schema\.json:\d+: the field format is the const 2, the version in legal\/VERSION$/.test(error)), two.join("\n"));
  assert.ok(two.some((error) => /^legal\/schemas\/reading-vector\.schema\.json:3: \$id is https:\/\/altnovatrail\.github\.io\/spec\/legal\/2\/reading-vector\.schema\.json/.test(error)), two.join("\n"));
  const missing = errorsOf([["legal/VERSION", "", null]]);
  assert.ok(missing.includes("legal/VERSION:0: no VERSION: the part's version, an integer and a newline"), missing.join("\n"));
});

test("a schema follows the conventions of the format's, in snake_case, and marks nothing x-open", () => {
  assert.deepEqual(LEGAL_PART, { folder: "legal", prefix: "https://altnovatrail.github.io/spec/legal/", open: false });
  expectOnly([[PASSPORT_SCHEMA, '"description": "The texts, by their IDs."', '"description": "The texts, by their IDs.", "x-open": true']], /x-open: legal\/ has no open view/);
  expectOnly([[PASSPORT_SCHEMA, '"$ref": "#/$defs/text"', '"$ref": "text.schema.json"']], /no schema text\.schema\.json in legal\/schemas\//);
  expectSome([[PASSPORT_SCHEMA, '"in_force_since": {', '"inForceSince": {']], /inForceSince: a name in snake_case/);
  expectSome([[VECTOR_SCHEMA, "", null]], /^legal\/schemas:0: no reading-vector\.schema\.json, which the text names$/);
  expectSome([[PASSPORT_SCHEMA, "", null]], /^legal\/schemas:0: no legal\.schema\.json, which the text names$/);
});

test("the rules of the text are the rules reading.mjs knows, in its order", () => {
  const markdown = "| `legal.markdown` |";
  const unchanged = "| `legal.in-force-unchanged` |";
  const errors = errorsOf([[README, unchanged, "| `legal.in-force-kept` |"]]);
  assert.deepEqual(errors, [`${README}:0: legal.in-force-unchanged: a rule legal-check knows, and the text lists it not`, `${README}:${ruleLine("legal.in-force-unchanged")}: legal.in-force-kept: no rule legal-check knows`]);
  const text = fs.readFileSync(path.join(spec, README), "utf8");
  const rows = text.split("\n").filter((line) => line.startsWith(markdown) || line.startsWith(unchanged));
  const swapped = errorsOf([[README, `${rows[0]}\n${rows[1]}`, `${rows[1]}\n${rows[0]}`]]);
  assert.deepEqual(swapped, [`${README}:${ruleLine("legal.files")}: the rules stand in the order reading.mjs reads them, legal.files, legal.versions, legal.set-texts, legal.markdown, legal.in-force-unchanged`]);
  const at = ruleLine("legal.markdown");
  assert.deepEqual(errorsOf([[README, markdown, `${markdown} A rule. |\n| \`Markdown\` | A row. |\n${markdown}`]]), [`${README}:${at + 1}: "Markdown": a rule's ID is <part>.<name>, each in kebab-case`, `${README}:${at + 2}: the rule legal.markdown again, after line ${at}`]);
  expectOnly([[README, "", null]], /^legal\/README\.md:0: no text$/);
});

test("an example passes its schema or names the error it gives", () => {
  expectOnly([["legal/examples/legal/invalid/format-two.yaml", "format: 2", "format: 1"]], /format-two\.yaml:1: passes its schema, and names const at #\/format/);
  expectOnly([["legal/examples/legal/valid/drafts.yaml", "place: app", "place: website"]], /drafts\.yaml:0: does not pass its schema: enum at #\/texts\/terms-of-use\/place/);
  expectOnly([["legal/examples/rollout/valid/case.yaml", null, "a: b\n"]], /^legal\/examples\/rollout\/valid\/case\.yaml:0: an example of rollout, which has no schema in legal\/schemas$/);
  expectOnly([["legal/examples/legal/valid/drafts.yaml", "texts:", "texts: &t"]], /drafts\.yaml:\d+: yaml\.no-anchors/);
});

test("a vector of reading passes its schema, and each case gives what section 5 computes", () => {
  expectOnly([[MARKDOWN, "    refused_by: legal.markdown", "    refused_by: legal.files"]], /^legal\/vectors\/reading\/markdown\.yaml:0: cases\/0: the reading gives \{"refused_by":"legal\.markdown","names":\["texts\/privacy-policy\/1\.md"\]\}, and the vector \{"refused_by":"legal\.files","names":\["texts\/privacy-policy\/1\.md"\]\}$/);
  const unpaired = errorsOf([[MARKDOWN, "    refused_by: legal.markdown\n    names:\n      - texts/privacy-policy/1.md\n", "    refused_by: legal.markdown\n"]]);
  assert.ok(unpaired.some((error) => /^legal\/vectors\/reading\/markdown\.yaml:0: does not pass the schema of a vector of reading: dependentRequired at #\/cases\/0: must have property names/.test(error)), unpaired.join("\n"));
  expectSome([[ACCEPTED, "cases:", "cases: !!seq"]], /accepted\.yaml:\d+: yaml\.no-tags/);
  expectSome([[ACCEPTED, "cases:", "cases: ["]], /accepted\.yaml:\d+: not YAML/);
});

test("the vectors accept a part and refuse one by the schema and by each rule", () => {
  assert.deepEqual(errorsOf([[MARKDOWN, "", null]]), ["legal/vectors/reading:0: no vector of reading refuses a part by legal.markdown (legal/README.md, section 7)"]);
  assert.deepEqual(
    errorsOf([
      [ACCEPTED, "", null],
      ["legal/vectors/reading/schema.yaml", "", null],
    ]),
    ["legal/vectors/reading:0: no vector of reading accepts a part (legal/README.md, section 7)", "legal/vectors/reading:0: no vector of reading refuses a part by the schema (legal/README.md, section 7)"],
  );
  // With no schema of a vector, the vectors are read by the YAML rules alone, and nothing is counted.
  assert.deepEqual(errorsOf([[VECTOR_SCHEMA, "", null]]), ["legal/schemas:0: no reading-vector.schema.json, which the text names"]);
});

test("the part itself is read as section 5 reads it: the schema, then the rules", () => {
  expectOnly([[PASSPORT, "format: 1", "format: 2"]], /^legal\/legal\.yaml:0: does not pass legal\/schemas\/legal\.schema\.json: format$/);
  expectOnly([[PASSPORT, "format: 1", "format: 1\nextra: true"]], /^legal\/legal\.yaml:0: does not pass legal\/schemas\/legal\.schema\.json: extra$/);
  const policy = fs.readFileSync(path.join(spec, POLICY), "utf8");
  expectOnly([[POLICY, policy, `${policy}\nSee [the ICO](https://ico.org.uk).\n`]], /^legal\/texts\/privacy-policy\/1\.md:0: legal\.markdown: it holds link at line \d+$/);
  expectOnly([[POLICY, "", null]], /^legal\/texts\/privacy-policy\/1\.md:0: legal\.files: texts\/privacy-policy\/1\.md$/);
  // A rule that names a text or a set names the passport.
  const versions = errorsOf([
    [PASSPORT, "      - version: 1\n        status: draft\n        summary:\n          en: \"Draft: Privacy policy.", "      - version: 2\n        status: draft\n        summary:\n          en: \"Draft: Privacy policy."],
    [POLICY, "", null],
    ["legal/texts/privacy-policy/2.md", null, policy],
  ]);
  assert.deepEqual(versions, ["legal/legal.yaml:0: legal.versions: texts.privacy-policy, legal/README.md, section 5"]);
  // The passport and a text are read by their rules first.
  expectOnly([[PASSPORT, "format: 1", "format: &f 1"]], /^legal\/legal\.yaml:\d+: yaml\.no-anchors/);
  expectOnly([[PASSPORT, "", null]], /^legal\/legal\.yaml:0: no passport$/);
  const root = trialCopy([]);
  try {
    fs.writeFileSync(path.join(root, POLICY), Buffer.concat([Buffer.from(policy), Buffer.from([0xff])]));
    assert.deepEqual(checkLegal(root, { previousOf: none }).errors, [{ file: POLICY, line: 0, message: "a text is UTF-8" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// A part in force, for the release before: the policy's version 1 comes into force, by the
// passport's text.
const inForce = (text) => text.replace('      - version: 1\n        status: draft\n        summary:\n          en: "Draft: Privacy policy.', '      - version: 1\n        status: in_force\n        in_force_since: "2026-11-20"\n        summary:\n          en: "Draft: Privacy policy.');

test("a passport that is a folder, a texts/ that is a file and a VERSION that is a folder are named, not thrown", () => {
  assert.deepEqual(errorsOf([[PASSPORT, "", null], ["legal/legal.yaml/notes.txt", null, "notes\n"]]), ["legal/legal.yaml:0: the passport is a file, and this is none"]);
  assert.deepEqual(errorsOf([["legal/texts", "", null], ["legal/texts", null, "notes\n"]]), ["legal/texts:0: texts/ is a folder of the versions of the texts, and this is none"]);
  const version = errorsOf([["legal/VERSION", "", null], ["legal/VERSION/1", null, "1\n"]]);
  assert.ok(version.includes("legal/VERSION:0: no VERSION: the part's version, an integer and a newline"), version.join("\n"));
});

test("legal.in-force-unchanged reads the part of the release before, which previousOf gives", () => {
  const root = trialCopy([[PASSPORT, passport(), inForce(passport())]]);
  try {
    // What the release before had is read as legalAt reads it, from a commit of the part.
    const previous = { tag: "v0.13.0", part: readPartOf(root) };
    assert.deepEqual(checkLegal(root, { previousOf: () => previous }).errors, []);
    assert.equal(checkLegal(root, { previousOf: () => previous }).stats.previous, "v0.13.0");
    // A release before with no legal/ holds the rule.
    assert.deepEqual(checkLegal(root, { previousOf: () => ({ tag: "v0.12.0", part: null }) }).errors, []);
    // The policy's file changes: refused, against that release.
    const policy = path.join(root, POLICY);
    fs.appendFileSync(policy, "\nAnother sentence.\n");
    assert.deepEqual(checkLegal(root, { previousOf: () => previous }).errors, [{ file: POLICY, line: 0, message: "legal.in-force-unchanged: texts/privacy-policy/1.md, against v0.13.0" }]);
    // Its entry changes too: the passport is named as well.
    edit(root, PASSPORT, 'in_force_since: "2026-11-20"', 'in_force_since: "2026-11-21"');
    assert.deepEqual(
      checkLegal(root, { previousOf: () => previous }).errors.map(({ file, message }) => `${file}: ${message}`),
      ["legal/legal.yaml: legal.in-force-unchanged: texts.privacy-policy, legal/README.md, section 5, against v0.13.0", `${POLICY}: legal.in-force-unchanged: texts/privacy-policy/1.md, against v0.13.0`],
    );
    // A release before that cannot be read is an error, and the part is not read without it.
    assert.deepEqual(checkLegal(root, { previousOf: () => { throw new Error("a shallow clone"); } }).errors, [{ file: "legal", line: 0, message: "the release before cannot be read, for legal.in-force-unchanged: a shallow clone" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// The part of a copy's legal/, as legalAt reads one, from the folder.
function readPartOf(root) {
  const { dir, git } = scratchRepository("legal-part-");
  try {
    fs.cpSync(path.join(root, "legal"), path.join(dir, "legal"), { recursive: true });
    git("add", "--all");
    git("commit", "--quiet", "-m", "legal");
    return legalAt(dir, "HEAD");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the release before is the newest release tag in the history of HEAD, not HEAD's own unless the working tree changes legal/", () => {
  const { dir, git } = scratchRepository("legal-previous-");
  try {
    fs.writeFileSync(path.join(dir, "README.md"), "spec\n");
    git("add", "--all");
    git("commit", "--quiet", "-m", "first");
    // No release yet.
    assert.equal(previousLegal(dir), null);
    // A release with no legal/: the rule holds.
    git("tag", "v0.12.0");
    git("commit", "--quiet", "--allow-empty", "-m", "second");
    assert.deepEqual(previousLegal(dir), { tag: "v0.12.0", part: null });
    // A release with legal/: its passport and its texts, and nothing else of it.
    trialCopy([[PASSPORT, passport(), inForce(passport())]], dir);
    git("add", "--all");
    git("commit", "--quiet", "-m", "legal");
    git("tag", "v0.13.0");
    // HEAD's own tag is not the release before, while the working tree changes nothing of legal/.
    assert.equal(previousLegal(dir).tag, "v0.12.0");
    fs.appendFileSync(path.join(dir, POLICY), "\nAnother sentence.\n");
    const changed = previousLegal(dir);
    assert.equal(changed.tag, "v0.13.0");
    assert.equal(changed.part.passport.texts["privacy-policy"].versions[0].status, "in_force");
    assert.ok(Object.keys(changed.part.files).length >= 1 && Object.keys(changed.part.files).every((file) => file.startsWith("texts/")));
    // Every file of the release is read as its bytes, by one git cat-file.
    for (const file of fs.readdirSync(path.join(spec, "legal/texts"))) {
      assert.deepEqual(changed.part.files[`texts/${file}/1.md`], fs.readFileSync(path.join(spec, "legal/texts", file, "1.md")), file);
    }
    // ... and legal-check refuses the change against it, from git.
    assert.deepEqual(checkLegal(dir).errors, [{ file: POLICY, line: 0, message: "legal.in-force-unchanged: texts/privacy-policy/1.md, against v0.13.0" }]);
    git("checkout", "--quiet", "--", "legal");
    assert.deepEqual(checkLegal(dir).errors, []);
    // A byte order mark is a change too, though a decoder would take it out.
    fs.writeFileSync(path.join(dir, POLICY), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), fs.readFileSync(path.join(dir, POLICY))]));
    assert.deepEqual(checkLegal(dir).errors, [{ file: POLICY, line: 0, message: "legal.in-force-unchanged: texts/privacy-policy/1.md, against v0.13.0" }]);
    git("checkout", "--quiet", "--", "legal");
    // An untracked file under legal/ is a change of the working tree too.
    fs.writeFileSync(path.join(dir, "legal/notes.txt"), "notes\n");
    assert.equal(previousLegal(dir).tag, "v0.13.0");
    fs.rmSync(path.join(dir, "legal/notes.txt"));
    // A release whose passport breaks the YAML rules, or that has none, has no part to compare
    // with: legal-check names it, and reads nothing against it.
    fs.writeFileSync(path.join(dir, PASSPORT), "format: 1\nformat: 1\n");
    git("commit", "--quiet", "--all", "-m", "a passport that is no YAML of the rules");
    git("tag", "v0.13.1");
    git("checkout", "--quiet", "v0.13.0", "--", PASSPORT);
    git("commit", "--quiet", "-m", "the passport again");
    assert.throws(() => legalAt(dir, "v0.13.1"), /^Error: legal\/legal\.yaml at v0\.13\.1 cannot be read: line 2: yaml\.unique-keys/);
    const unread = checkLegal(dir).errors;
    assert.equal(unread.length, 1, JSON.stringify(unread));
    assert.match(unread[0].message, /^the release before cannot be read, for legal\.in-force-unchanged: legal\/legal\.yaml at v0\.13\.1 cannot be read/);
    git("rm", "--quiet", PASSPORT);
    git("commit", "--quiet", "-m", "no passport");
    git("tag", "v0.13.2");
    assert.throws(() => legalAt(dir, "v0.13.2"), /^Error: v0\.13\.2 has legal\/ and no legal\/legal\.yaml$/);
    assert.throws(() => legalAt(dir, "v9.9.9"), /git ls-tree/);
    // A shallow clone has no tags to count from.
    const shallow = `${dir}-shallow`;
    const clone = spawnSync(GIT, ["clone", "--quiet", "--depth", "1", `file://${dir}`, shallow], { encoding: "utf8", env: isolated });
    assert.equal(clone.status, 0, clone.stderr);
    try {
      assert.throws(() => previousLegal(shallow), /a shallow clone has no tags to find the previous release by; fetch the whole history/);
    } finally {
      fs.rmSync(shallow, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A self-hosted copy's folder, written from spec's own legal/: VERSION, legal.yaml and texts/.
function copyFolder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legal-copy-"));
  for (const name of ["VERSION", "legal.yaml", "texts"]) fs.cpSync(path.join(spec, "legal", name), path.join(dir, "own", name), { recursive: true });
  return dir;
}

const dirErrors = (dir, shown = "own") => checkLegalDir(path.join(dir, "own"), spec, shown).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);

test("a copy's folder is checked against this spec's schema and the rules of section 5 but legal.in-force-unchanged", () => {
  const dir = copyFolder();
  try {
    const own = path.join(dir, "own");
    const { errors, stats } = checkLegalDir(own, spec, "own");
    assert.deepEqual(errors, []);
    assert.equal(stats.version, "1");
    assert.ok(stats.texts >= 1);
    // The errors name the files by the path shown, and the folder alone.
    fs.writeFileSync(path.join(own, "README.md"), "# Our texts\n");
    fs.mkdirSync(path.join(own, "schemas"));
    fs.writeFileSync(path.join(own, "schemas/legal.schema.json"), "{}\n");
    assert.deepEqual(dirErrors(dir), [
      "own/README.md:0: no file of a copy's folder, which holds VERSION, legal.yaml and texts/ alone (legal/README.md, sections 3 and 8)",
      "own/schemas/legal.schema.json:0: no file of a copy's folder, which holds VERSION, legal.yaml and texts/ alone (legal/README.md, sections 3 and 8)",
    ]);
    fs.rmSync(path.join(own, "README.md"));
    fs.rmSync(path.join(own, "schemas"), { recursive: true });
    // Its texts are held to the rules.
    fs.appendFileSync(path.join(own, "texts/terms-of-use/1.md"), "\nWrite to <privacy@example.org>.\n");
    assert.deepEqual(dirErrors(dir), [`own/texts/terms-of-use/1.md:0: legal.markdown: it holds link at line ${fs.readFileSync(path.join(own, "texts/terms-of-use/1.md"), "utf8").split("\n").length - 1}`]);
    fs.copyFileSync(path.join(spec, "legal/texts/terms-of-use/1.md"), path.join(own, "texts/terms-of-use/1.md"));
    // Its version is this spec's.
    fs.writeFileSync(path.join(own, "VERSION"), "2\n");
    assert.deepEqual(dirErrors(dir), ["own/VERSION:1: the folder is of version 2, and this spec's legal/ of 1: check it by the spec of its version"]);
    fs.writeFileSync(path.join(own, "VERSION"), "two\n");
    assert.deepEqual(dirErrors(dir), ["own/VERSION:1: the part's version is an integer from 1 and a newline, with no leading zero"]);
    fs.rmSync(path.join(own, "VERSION"));
    assert.deepEqual(dirErrors(dir), ["own/VERSION:0: no VERSION: the part's version, an integer and a newline"]);
    fs.copyFileSync(path.join(spec, "legal/VERSION"), path.join(own, "VERSION"));
    // A passport the schema refuses, and none at all.
    edit(dir, "own/legal.yaml", "place: app", "place: website");
    assert.deepEqual(dirErrors(dir), ["own/legal.yaml:0: does not pass legal/schemas/legal.schema.json: texts.privacy-policy.place"]);
    fs.rmSync(path.join(own, "legal.yaml"));
    assert.deepEqual(dirErrors(dir), ["own/legal.yaml:0: no passport"]);
    // A passport that is a folder, a texts/ that is a file and a VERSION that is a folder are
    // named, and the folder is read no further.
    fs.mkdirSync(path.join(own, "legal.yaml"));
    fs.writeFileSync(path.join(own, "legal.yaml/notes.txt"), "notes\n");
    assert.deepEqual(dirErrors(dir), ["own/legal.yaml:0: the passport is a file, and this is none"]);
    fs.rmSync(path.join(own, "legal.yaml"), { recursive: true });
    fs.copyFileSync(path.join(spec, "legal/legal.yaml"), path.join(own, "legal.yaml"));
    fs.rmSync(path.join(own, "texts"), { recursive: true });
    fs.writeFileSync(path.join(own, "texts"), "notes\n");
    assert.deepEqual(dirErrors(dir), ["own/texts:0: texts/ is a folder of the versions of the texts, and this is none"]);
    fs.rmSync(path.join(own, "texts"));
    fs.cpSync(path.join(spec, "legal/texts"), path.join(own, "texts"), { recursive: true });
    fs.rmSync(path.join(own, "VERSION"));
    fs.mkdirSync(path.join(own, "VERSION"));
    assert.deepEqual(dirErrors(dir), ["own/VERSION:0: no VERSION: the part's version, an integer and a newline"]);
    fs.rmSync(path.join(own, "VERSION"), { recursive: true });
    fs.copyFileSync(path.join(spec, "legal/VERSION"), path.join(own, "VERSION"));
    assert.deepEqual(dirErrors(dir), []);
    // What stands beside them is named file by file, in a folder too.
    fs.mkdirSync(path.join(own, "notes"));
    fs.writeFileSync(path.join(own, "notes/a.txt"), "a\n");
    assert.deepEqual(dirErrors(dir), ["own/notes/a.txt:0: no file of a copy's folder, which holds VERSION, legal.yaml and texts/ alone (legal/README.md, sections 3 and 8)"]);
    assert.deepEqual(checkLegalDir(path.join(dir, "nothing"), spec, "nothing").errors, [{ file: "nothing", line: 0, message: "no folder there" }]);
    fs.writeFileSync(path.join(dir, "a-file"), "");
    assert.deepEqual(checkLegalDir(path.join(dir, "a-file"), spec, "a-file").errors, [{ file: "a-file", line: 0, message: "no folder there" }]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a copy's folder breaks no rule by changing a version in force: its operator keeps its own history", () => {
  const dir = copyFolder();
  try {
    const own = path.join(dir, "own");
    fs.writeFileSync(path.join(own, "legal.yaml"), inForce(fs.readFileSync(path.join(own, "legal.yaml"), "utf8")));
    assert.deepEqual(dirErrors(dir), []);
    assert.equal(checkLegalDir(own, spec).stats.current, 1);
    // A spec whose schema does not compile cannot check a folder.
    const broken = trialCopy([[PASSPORT_SCHEMA, '"type": "object"', '"type": "objects"']]);
    try {
      assert.throws(() => checkLegalDir(own, broken), /legal\/schemas\/legal\.schema\.json of this spec does not compile: run just legal-check/);
    } finally {
      fs.rmSync(broken, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the commands print ok, and the errors of a broken copy", () => {
  const main = path.join(spec, "tools/legal/main.mjs");
  const ok = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^legal-check: ok — 2 schemas, 5 rules, \d+ examples, \d+ vectors of reading with \d+ cases; the part: \d+ texts, \d+ versions, \d+ current(, against v\d+\.\d+\.\d+|, with no release before)\n$/);
  for (const args of [["extra"], ["--dir"], ["--dir", ""], ["--dir", "a", "b"]]) {
    const usage = spawnSync(process.execPath, [main, ...args], { encoding: "utf8" });
    assert.equal(usage.status, 2, args.join(" "));
    assert.match(usage.stderr, /^usage: node tools\/legal\/main\.mjs \[--dir <folder>\]/);
  }
  // A broken copy prints each error and a count, and sets the exit code.
  const root = trialCopy([["legal/notes.txt", null, "notes\n"]]);
  const printed = mock.method(console, "error", () => {});
  const logged = mock.method(console, "log", () => {});
  try {
    legalCheck(root, { previousOf: none });
    assert.equal(process.exitCode, 1);
    assert.deepEqual(
      printed.mock.calls.map((call) => call.arguments[0]),
      ["legal/notes.txt:0: no file of the layout of legal/ (legal/README.md, section 3)", "legal-check: 1 error"],
    );
    process.exitCode = 0;
    fs.rmSync(path.join(root, "legal/notes.txt"));
    legalCheck(root, { previousOf: () => ({ tag: "v0.12.0", part: null }) });
    assert.match(logged.mock.calls.at(-1).arguments[0], /^legal-check: ok — .*, against v0\.12\.0$/);
    legalCheckDir(path.join(root, "legal"), spec, "legal");
    assert.equal(process.exitCode, 1);
    assert.match(printed.mock.calls.at(-1).arguments[0], /^legal-check-dir: \d+ errors$/);
  } finally {
    printed.mock.restore();
    logged.mock.restore();
    process.exitCode = 0;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("legal-check-dir runs from another repository, its path from there", () => {
  const dir = copyFolder();
  try {
    const run = (folder) => spawnSync(JUST, ["-f", path.join(spec, "justfile"), "legal-check-dir", folder], { cwd: dir, encoding: "utf8", env: isolated });
    const ok = run("own/");
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /^legal-check-dir: ok — own, version 1: \d+ texts, \d+ versions, \d+ current\n$/m);
    fs.writeFileSync(path.join(dir, "own/notes.txt"), "notes\n");
    const broken = run("own");
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /^own\/notes\.txt:0: no file of a copy's folder/m);
    assert.match(broken.stderr, /^legal-check-dir: 1 error$/m);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
