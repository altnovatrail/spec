// A new version of the legal texts starts a new line (R130): the rule, the shape it compares, the
// script that release-version passes its lines through in spec, and the recipe, in a made-up copy
// of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { LEGAL, checkLegalLine, checked, shapeChange, shapeChangedBetween } from "../legal-line.mjs";
import { partLineOutput, ruleIdsOf } from "../part-line.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "legal-line.mjs");
const SHAPE = "the shape of legal/schemas/legal.schema.json changed";
const RULES = "the IDs of the rules of legal/README.md, section 5, changed";

const check = (version, previous, now, then, changed = null) => () => checkLegalLine({ version, previous, legalNow: now, legalThen: then, changed });

test("a release is held to the legal texts only after a release that carried them", () => {
  assert.equal(LEGAL.firstLine, "0.13");
  assert.equal(checked({ version: "v0.13.1", previous: "v0.13.0" }), true);
  assert.equal(checked({ version: "v1.0.0", previous: "v0.14.4" }), true);
  assert.equal(checked({ version: "v0.13.0", previous: "v0.12.9" }), false);
  assert.equal(checked({ version: "", previous: "v0.13.0" }), false);
});

test("another version of the legal texts needs a raised line, and never goes back", () => {
  assert.doesNotThrow(check("v0.13.3", "v0.13.2", "1", "1"));
  assert.doesNotThrow(check("v0.14.0", "v0.13.2", "1", "1"));
  assert.throws(check("v0.13.3", "v0.13.2", "2", "1"), /^Error: legal\/VERSION is 2, and at v0\.13\.2 it was 1: a new version of the legal texts starts a new line, so raise RELEASE_LINE above 0\.13 in the same change \(R130\)$/);
  assert.doesNotThrow(check("v0.14.0", "v0.13.2", "2", "1"));
  assert.doesNotThrow(check("v0.14.0", "v0.13.2", "10", "9"));
  assert.throws(check("v0.14.0", "v0.13.2", "1", "2"), /^Error: legal\/VERSION is 1, below 2 at v0\.13\.2: a version of the legal texts never goes back/);
  assert.throws(
    check("v0.13.3", "v0.13.2", "1", "1", SHAPE),
    /^Error: the shape of legal\/schemas\/legal\.schema\.json changed after v0\.13\.2, and legal\/VERSION is still 1: a change of the legal texts' passport schema or of the IDs of their rules is a new version, in a new line \(R130\)$/,
  );
  assert.throws(check("v0.14.0", "v0.13.2", "1", "1", RULES), /^Error: the IDs of the rules of legal\/README\.md, section 5, changed after v0\.13\.2/);
  assert.doesNotThrow(check("v0.14.0", "v0.13.2", "2", "1", SHAPE));
});

const schema = fs.readFileSync(path.join(root, "legal/schemas/legal.schema.json"), "utf8");
const readme = fs.readFileSync(path.join(root, "legal/README.md"), "utf8");

test("what changed of the shape: the passport's schema without its annotations, the IDs of the rules, both, or neither", () => {
  assert.deepEqual(ruleIdsOf(readme), ["legal.files", "legal.versions", "legal.set-texts", "legal.markdown", "legal.operator", "legal.in-force-unchanged"]);
  const same = { schemaNow: schema, schemaThen: schema, readmeNow: readme, readmeThen: readme };
  assert.equal(shapeChange(same), null);
  const json = JSON.parse(schema);
  const annotated = JSON.stringify({ ...json, title: "Another title", description: "Another description." });
  assert.equal(shapeChange({ ...same, schemaNow: annotated }), null);
  const shaped = JSON.stringify({ ...json, required: ["format", "texts"] });
  assert.equal(shapeChange({ ...same, schemaNow: shaped }), SHAPE);
  const reordered = readme.replace("| `legal.markdown` |", "| `legal.markup` |");
  assert.equal(shapeChange({ ...same, readmeNow: reordered }), RULES);
  assert.equal(shapeChange({ ...same, schemaNow: shaped, readmeNow: reordered }), `${SHAPE}, and ${RULES}`);
  // A release before with no schema or no text had no rules and no shape.
  assert.equal(shapeChange({ ...same, schemaThen: null, readmeThen: null }), `${SHAPE}, and ${RULES}`);
  assert.throws(() => shapeChange({ ...same, schemaThen: "{" }), /legal\/schemas\/legal\.schema\.json at the release before is not JSON/);
});

test("the script passes the lines through when there is nothing to check, and reads the part by git when there is", () => {
  const run = (input, args, cwd = root) => spawnSync(process.execPath, [script, ...args], { cwd, input, encoding: "utf8", env });
  const before = "version=v0.13.0\nprevious=v0.12.9\nreleased=\nbehind=\n";
  const through = run(before, []);
  assert.equal(through.status, 0, through.stderr);
  assert.equal(through.stdout, before);
  const { dir, git } = scratchRepository("legal-line-git-");
  try {
    writeFile(dir, git, "legal/VERSION", "1\n");
    writeFile(dir, git, "legal/schemas/legal.schema.json", '{"type": "object"}\n');
    git("commit", "--quiet", "-m", "one");
    git("tag", "v0.13.0");
    // A new text, and an annotation: no change of the shape.
    writeFile(dir, git, "legal/texts/privacy-policy/2.md", "# Privacy policy\n");
    writeFile(dir, git, "legal/schemas/legal.schema.json", '{"type": "object", "description": "A passport."}\n');
    git("commit", "--quiet", "-m", "a text");
    const head = git("rev-parse", "HEAD");
    const input = "version=v0.13.1\nprevious=v0.13.0\nreleased=\nbehind=\n";
    assert.equal(shapeChangedBetween(head, "v0.13.0", dir), null);
    assert.equal(partLineOutput(LEGAL, shapeChangedBetween, { input, commit: head, cwd: dir }), input);
    const passed = run(input, [head], dir);
    assert.equal(passed.status, 0, passed.stderr);
    assert.equal(passed.stdout, input);
    writeFile(dir, git, "legal/schemas/legal.schema.json", '{"type": "array"}\n');
    git("commit", "--quiet", "-m", "a shape");
    const shaped = git("rev-parse", "HEAD");
    const refused = run(input, [shaped], dir);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /^release-version: the shape of legal\/schemas\/legal\.schema\.json changed after v0\.13\.0, and legal\/VERSION is still 1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const lines = (version, previous) => `version=${version}\nprevious=${previous}\nreleased=\nbehind=\n`;
const text = (rule) => `# The legal texts\n\n| ID | Rule |\n|---|---|\n| \`${rule}\` | A rule. |\n`;

test("in spec, release-version refuses another shape or a new version of the legal texts in the line of the release before it", () => {
  const { dir, git } = scratchRepository("legal-line-");
  try {
    copySpecTools(dir, git);
    writeFile(dir, git, "format/VERSION", "0.4\n");
    writeFile(dir, git, "admission/VERSION", "0.1\n");
    writeFile(dir, git, "deployment/VERSION", "1\n");
    writeFile(dir, git, "legal/VERSION", "1\n");
    writeFile(dir, git, "legal/schemas/legal.schema.json", '{"title": "A passport", "type": "object"}\n');
    writeFile(dir, git, "legal/README.md", text("legal.files"));
    releaseLine(dir, git, "0.13");
    git("commit", "--quiet", "-m", "the first legal texts");
    git("tag", "v0.13.0");

    // A new version of a text keeps the part's version.
    writeFile(dir, git, "legal/texts/privacy-policy/1.md", "# Privacy policy\n");
    writeFile(dir, git, "legal/legal.yaml", "format: 1\n");
    git("commit", "--quiet", "-m", "a text");
    const same = recipe(dir);
    assert.equal(same.status, 0, same.stderr);
    assert.equal(same.stdout, lines("v0.13.1", "v0.13.0"));
    git("tag", "v0.13.1");

    writeFile(dir, git, "legal/README.md", text("legal.file-names"));
    git("commit", "--quiet", "-m", "a rule of another ID, and no new version");
    const renamed = recipe(dir);
    assert.notEqual(renamed.status, 0);
    assert.match(renamed.stderr, /the IDs of the rules of legal\/README\.md, section 5, changed after v0\.13\.1, and legal\/VERSION is still 1/);

    writeFile(dir, git, "legal/VERSION", "2\n");
    git("commit", "--quiet", "-m", "a new version, and no new line");
    const refused = recipe(dir);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /legal\/VERSION is 2, and at v0\.13\.1 it was 1: a new version of the legal texts starts a new line/);

    releaseLine(dir, git, "0.14");
    git("commit", "--quiet", "-m", "and its new line");
    const raised = recipe(dir);
    assert.equal(raised.status, 0, raised.stderr);
    assert.equal(raised.stdout, lines("v0.14.0", "v0.13.1"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
