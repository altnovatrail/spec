// A new version of the table of the age of digital consent starts a new line (R134): the rule, the shape it compares, the
// script that release-version passes its lines through in spec, and the recipe, in a made-up copy
// of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CONSENT_AGE, checkConsentAgeLine, checked, shapeChange, shapeChangedBetween } from "../consent-age-line.mjs";
import { partLineOutput, ruleIdsOf } from "../part-line.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "consent-age-line.mjs");
const SHAPE = "the shape of consent-age/schemas/consent-age.schema.json changed";
const RULES = "the IDs of the rules of consent-age/README.md, section 5, changed";

const check = (version, previous, now, then, changed = null) => () => checkConsentAgeLine({ version, previous, consentAgeNow: now, consentAgeThen: then, changed });

test("a release is held to the table only after a release that carried it", () => {
  assert.equal(CONSENT_AGE.firstLine, "0.14");
  assert.equal(checked({ version: "v0.14.1", previous: "v0.14.0" }), true);
  assert.equal(checked({ version: "v1.0.0", previous: "v0.15.4" }), true);
  assert.equal(checked({ version: "v0.14.0", previous: "v0.13.9" }), false);
  assert.equal(checked({ version: "", previous: "v0.14.0" }), false);
});

test("another version of the table needs a raised line, and never goes back", () => {
  assert.doesNotThrow(check("v0.14.3", "v0.14.2", "1", "1"));
  assert.doesNotThrow(check("v0.15.0", "v0.14.2", "1", "1"));
  assert.throws(check("v0.14.3", "v0.14.2", "2", "1"), /^Error: consent-age\/VERSION is 2, and at v0\.14\.2 it was 1: a new version of the table of the age of digital consent starts a new line, so raise RELEASE_LINE above 0\.14 in the same change \(R134\)$/);
  assert.doesNotThrow(check("v0.15.0", "v0.14.2", "2", "1"));
  assert.doesNotThrow(check("v0.15.0", "v0.14.2", "10", "9"));
  assert.throws(check("v0.15.0", "v0.14.2", "1", "2"), /^Error: consent-age\/VERSION is 1, below 2 at v0\.14\.2: a version of the table of the age of digital consent never goes back/);
  assert.throws(
    check("v0.14.3", "v0.14.2", "1", "1", SHAPE),
    /^Error: the shape of consent-age\/schemas\/consent-age\.schema\.json changed after v0\.14\.2, and consent-age\/VERSION is still 1: a change of the schema of the table of the age of digital consent or of the IDs of its rules is a new version, in a new line \(R134\)$/,
  );
  assert.throws(check("v0.15.0", "v0.14.2", "1", "1", RULES), /^Error: the IDs of the rules of consent-age\/README\.md, section 5, changed after v0\.14\.2/);
  assert.doesNotThrow(check("v0.15.0", "v0.14.2", "2", "1", SHAPE));
});

const schema = fs.readFileSync(path.join(root, "consent-age/schemas/consent-age.schema.json"), "utf8");
const readme = fs.readFileSync(path.join(root, "consent-age/README.md"), "utf8");

test("what changed of the shape: the table's schema without its annotations, the IDs of the rules, both, or neither", () => {
  assert.deepEqual(ruleIdsOf(readme), ["consent-age.days", "consent-age.entries-ordered", "consent-age.ages-kept"]);
  const same = { schemaNow: schema, schemaThen: schema, readmeNow: readme, readmeThen: readme };
  assert.equal(shapeChange(same), null);
  const json = JSON.parse(schema);
  const annotated = JSON.stringify({ ...json, title: "Another title", description: "Another description." });
  assert.equal(shapeChange({ ...same, schemaNow: annotated }), null);
  const shaped = JSON.stringify({ ...json, required: ["format", "countries"] });
  assert.equal(shapeChange({ ...same, schemaNow: shaped }), SHAPE);
  const reordered = readme.replace("| `consent-age.days` |", "| `consent-age.dates` |");
  assert.equal(shapeChange({ ...same, readmeNow: reordered }), RULES);
  assert.equal(shapeChange({ ...same, schemaNow: shaped, readmeNow: reordered }), `${SHAPE}, and ${RULES}`);
  // A release before with no schema or no text had no rules and no shape.
  assert.equal(shapeChange({ ...same, schemaThen: null, readmeThen: null }), `${SHAPE}, and ${RULES}`);
  assert.throws(() => shapeChange({ ...same, schemaThen: "{" }), /consent-age\/schemas\/consent-age\.schema\.json at the release before is not JSON/);
});

test("the script passes the lines through when there is nothing to check, and reads the part by git when there is", () => {
  const run = (input, args, cwd = root) => spawnSync(process.execPath, [script, ...args], { cwd, input, encoding: "utf8", env });
  const before = "version=v0.14.0\nprevious=v0.13.9\nreleased=\nbehind=\n";
  const through = run(before, []);
  assert.equal(through.status, 0, through.stderr);
  assert.equal(through.stdout, before);
  const { dir, git } = scratchRepository("consent-age-line-git-");
  try {
    writeFile(dir, git, "consent-age/VERSION", "1\n");
    writeFile(dir, git, "consent-age/schemas/consent-age.schema.json", '{"type": "object"}\n');
    git("commit", "--quiet", "-m", "one");
    git("tag", "v0.14.0");
    // A new entry, and an annotation: no change of the shape.
    writeFile(dir, git, "consent-age/consent-age.yaml", "format: 1\n");
    writeFile(dir, git, "consent-age/schemas/consent-age.schema.json", '{"type": "object", "description": "A table."}\n');
    git("commit", "--quiet", "-m", "an entry");
    const head = git("rev-parse", "HEAD");
    const input = "version=v0.14.1\nprevious=v0.14.0\nreleased=\nbehind=\n";
    assert.equal(shapeChangedBetween(head, "v0.14.0", dir), null);
    assert.equal(partLineOutput(CONSENT_AGE, shapeChangedBetween, { input, commit: head, cwd: dir }), input);
    const passed = run(input, [head], dir);
    assert.equal(passed.status, 0, passed.stderr);
    assert.equal(passed.stdout, input);
    writeFile(dir, git, "consent-age/schemas/consent-age.schema.json", '{"type": "array"}\n');
    git("commit", "--quiet", "-m", "a shape");
    const shaped = git("rev-parse", "HEAD");
    const refused = run(input, [shaped], dir);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /^release-version: the shape of consent-age\/schemas\/consent-age\.schema\.json changed after v0\.14\.0, and consent-age\/VERSION is still 1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const lines = (version, previous) => `version=${version}\nprevious=${previous}\nreleased=\nbehind=\n`;
const text = (rule) => `# The age of digital consent\n\n| ID | Rule |\n|---|---|\n| \`${rule}\` | A rule. |\n`;

test("in spec, release-version refuses another shape or a new version of the table in the line of the release before it", () => {
  const { dir, git } = scratchRepository("consent-age-line-");
  try {
    copySpecTools(dir, git);
    writeFile(dir, git, "format/VERSION", "0.4\n");
    writeFile(dir, git, "admission/VERSION", "0.1\n");
    writeFile(dir, git, "deployment/VERSION", "1\n");
    writeFile(dir, git, "legal/VERSION", "1\n");
    writeFile(dir, git, "consent-age/VERSION", "1\n");
    writeFile(dir, git, "consent-age/schemas/consent-age.schema.json", '{"title": "A table", "type": "object"}\n');
    writeFile(dir, git, "consent-age/README.md", text("consent-age.days"));
    releaseLine(dir, git, "0.14");
    git("commit", "--quiet", "-m", "the first table");
    git("tag", "v0.14.0");

    // A new entry keeps the part's version.
    writeFile(dir, git, "consent-age/consent-age.yaml", "format: 1\n");
    git("commit", "--quiet", "-m", "an entry");
    const same = recipe(dir);
    assert.equal(same.status, 0, same.stderr);
    assert.equal(same.stdout, lines("v0.14.1", "v0.14.0"));
    git("tag", "v0.14.1");

    writeFile(dir, git, "consent-age/README.md", text("consent-age.dates"));
    git("commit", "--quiet", "-m", "a rule of another ID, and no new version");
    const renamed = recipe(dir);
    assert.notEqual(renamed.status, 0);
    assert.match(renamed.stderr, /the IDs of the rules of consent-age\/README\.md, section 5, changed after v0\.14\.1, and consent-age\/VERSION is still 1/);

    writeFile(dir, git, "consent-age/VERSION", "2\n");
    git("commit", "--quiet", "-m", "a new version, and no new line");
    const refused = recipe(dir);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /consent-age\/VERSION is 2, and at v0\.14\.1 it was 1: a new version of the table of the age of digital consent starts a new line/);

    releaseLine(dir, git, "0.15");
    git("commit", "--quiet", "-m", "and its new line");
    const raised = recipe(dir);
    assert.equal(raised.status, 0, raised.stderr);
    assert.equal(raised.stdout, lines("v0.15.0", "v0.14.1"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
