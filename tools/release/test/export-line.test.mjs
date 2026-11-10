// A new version of the format of the export starts a new line (R135): the rule, the shape of each
// schema it compares, and the script that release-version passes its lines through in spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { EXPORT, SCHEMAS, checkExportLine, checked, schemasAt, shapeChange, shapeChangedBetween } from "../export-line.mjs";
import { partLineOutput } from "../part-line.mjs";
import { env, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "export-line.mjs");
const check = (version, previous, now, then, changed = null) => () => checkExportLine({ version, previous, exportNow: now, exportThen: then, changed });

test("a release is held to the format of the export only after a release that carried it", () => {
  assert.equal(EXPORT.firstLine, "0.14");
  assert.equal(checked({ version: "v0.14.1", previous: "v0.14.0" }), true);
  assert.equal(checked({ version: "v0.14.0", previous: "v0.13.9" }), false);
});

test("another version of the format of the export needs a raised line, and never goes back", () => {
  assert.doesNotThrow(check("v0.14.3", "v0.14.2", "1", "1"));
  assert.throws(check("v0.14.3", "v0.14.2", "2", "1"), /^Error: export\/VERSION is 2, and at v0\.14\.2 it was 1: a new version of the format of the export starts a new line, so raise RELEASE_LINE above 0\.14 in the same change \(R135\)$/);
  assert.doesNotThrow(check("v0.15.0", "v0.14.2", "2", "1"));
  assert.throws(check("v0.15.0", "v0.14.2", "1", "2"), /never goes back/);
  assert.throws(check("v0.14.3", "v0.14.2", "1", "1", "the shape of export/schemas/profile.schema.json changed"), /a change of the schemas of the files of an export or of the IDs of its rules is a new version, in a new line \(R135\)$/);
});

const text = (file) => fs.readFileSync(path.join(root, file), "utf8");
const same = () => Object.fromEntries(SCHEMAS.map((schema) => [schema, { now: text(schema), before: text(schema) }]));

test("what changed of the shape: each schema of a file, and the IDs of the rules of the text, once", () => {
  assert.deepEqual(SCHEMAS, ["common", "manifest", "account", "profile", "device"].map((term) => `export/schemas/${term}.schema.json`));
  const readme = text("export/README.md");
  assert.equal(shapeChange({ schemas: same(), readmeNow: readme, readmeThen: readme }), null);
  const schemas = same();
  const profile = JSON.parse(schemas["export/schemas/profile.schema.json"].now);
  schemas["export/schemas/profile.schema.json"].now = JSON.stringify({ ...profile, description: "Another description." });
  assert.equal(shapeChange({ schemas, readmeNow: readme, readmeThen: readme }), null);
  schemas["export/schemas/profile.schema.json"].now = JSON.stringify({ ...profile, required: ["format"] });
  const renamed = readme.replace("| `export.proto` |", "| `export.schemas` |");
  assert.equal(shapeChange({ schemas, readmeNow: renamed, readmeThen: readme }), "the IDs of the rules of export/README.md, section 5, changed, and the shape of export/schemas/profile.schema.json changed");
});

test("the script passes the lines through, and reads each schema by git", () => {
  const run = (input, args, cwd = root) => spawnSync(process.execPath, [script, ...args], { cwd, input, encoding: "utf8", env });
  const before = "version=v0.14.0\nprevious=v0.13.9\nreleased=\nbehind=\n";
  assert.equal(run(before, []).stdout, before);
  const { dir, git } = scratchRepository("export-line-git-");
  try {
    writeFile(dir, git, "export/VERSION", "1\n");
    for (const schema of SCHEMAS) writeFile(dir, git, schema, '{"type": "object"}\n');
    git("commit", "--quiet", "-m", "one");
    git("tag", "v0.14.0");
    writeFile(dir, git, "export/schemas/device.schema.json", '{"type": "object", "description": "A device."}\n');
    git("commit", "--quiet", "-m", "an annotation");
    const head = git("rev-parse", "HEAD");
    const input = "version=v0.14.1\nprevious=v0.14.0\nreleased=\nbehind=\n";
    assert.equal(shapeChangedBetween(head, "v0.14.0", dir), null);
    assert.equal(partLineOutput(EXPORT, shapeChangedBetween, { input, commit: head, cwd: dir }), input);
    // A schema of a new kind of file is a change of the shape too.
    writeFile(dir, git, "export/schemas/report.schema.json", '{"type": "object"}\n');
    git("commit", "--quiet", "-m", "a new kind of file");
    assert.equal(shapeChangedBetween(git("rev-parse", "HEAD"), "v0.14.0", dir), "the schemas of export/schemas changed");
    assert.equal(schemasAt("v0.14.0", dir).length, 5);
    writeFile(dir, git, "export/schemas/manifest.schema.json", '{"type": "array"}\n');
    git("commit", "--quiet", "-m", "a shape");
    const refused = run(input, [git("rev-parse", "HEAD")], dir);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /^release-version: the shape of export\/schemas\/manifest\.schema\.json changed, and the schemas of export\/schemas changed after v0\.14\.0, and export\/VERSION is still 1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
