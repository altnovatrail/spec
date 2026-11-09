// A new version of the deployment configuration starts a new line (R85): the rule, the shape it
// compares, the script that release-version passes its lines through in spec, and the recipe, in a
// made-up copy of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DEPLOYMENT, checkDeploymentLine, checked, ruleIdsOf, shapeChange, shapeChangedBetween, shapeOf } from "../deployment-line.mjs";
import { partLineOutput } from "../part-line.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "deployment-line.mjs");
const SHAPE = "the shape of deployment/schemas/deployment.schema.json changed";
const RULES = "the IDs of the rules of deployment/README.md, section 5, changed";

const check = (version, previous, now, then, changed = null) => () => checkDeploymentLine({ version, previous, deploymentNow: now, deploymentThen: then, changed });

test("a release is held to the configuration only after a release that carried it", () => {
  assert.equal(checked({ version: "v0.11.1", previous: "v0.11.0" }), true);
  assert.equal(checked({ version: "v1.0.0", previous: "v0.12.4" }), true);
  assert.equal(checked({ version: "v0.11.0", previous: "v0.10.9" }), false);
  assert.equal(checked({ version: "", previous: "v0.11.0" }), false);
  assert.equal(checked({ version: "v0.11.0", previous: "" }), false);
});

test("another version of the configuration needs a raised line, and never goes back", () => {
  assert.doesNotThrow(check("v0.11.3", "v0.11.2", "1", "1"));
  assert.doesNotThrow(check("v0.12.0", "v0.11.2", "1", "1"));
  assert.throws(
    check("v0.11.3", "v0.11.2", "2", "1"),
    /^Error: deployment\/VERSION is 2, and at v0\.11\.2 it was 1: a new version of the deployment configuration starts a new line, so raise RELEASE_LINE above 0\.11 in the same change \(R85\)$/,
  );
  assert.doesNotThrow(check("v0.12.0", "v0.11.2", "2", "1"));
  // By number, not by text: 10 is above 9.
  assert.doesNotThrow(check("v0.12.0", "v0.11.2", "10", "9"));
  assert.throws(check("v0.12.0", "v0.11.2", "1", "2"), /^Error: deployment\/VERSION is 1, below 2 at v0\.11\.2: a version of the deployment configuration never goes back/);
  // Every change of the file's shape is a new version: the same version with another shape is
  // refused, in a raised line too, and a new version may come with it.
  assert.throws(
    check("v0.11.3", "v0.11.2", "1", "1", SHAPE),
    /^Error: the shape of deployment\/schemas\/deployment\.schema\.json changed after v0\.11\.2, and deployment\/VERSION is still 1: every change of the deployment configuration's shape is a new version, in a new line \(R85\)$/,
  );
  assert.throws(check("v0.12.0", "v0.11.2", "1", "1", RULES), /^Error: the IDs of the rules of deployment\/README\.md, section 5, changed after v0\.11\.2/);
  assert.doesNotThrow(check("v0.12.0", "v0.11.2", "2", "1", SHAPE));
});

const schema = JSON.parse(fs.readFileSync(path.join(root, "deployment/schemas/deployment.schema.json"), "utf8"));
const readme = fs.readFileSync(path.join(root, "deployment/README.md"), "utf8");
const edited = (change) => {
  const copy = structuredClone(schema);
  change(copy);
  return copy;
};

test("the shape of a schema is the schema without its annotations, at every level, whatever the order of its keys", () => {
  const annotated = edited((s) => {
    s.title = "Another title";
    s.description = "Another description.";
    s.$comment = "A comment.";
    s.properties.api.description = "Another.";
    s.properties.api.examples = ["https://api.example.org"];
    s.$defs.sign_in.properties.apiKey.description = "Another.";
  });
  assert.equal(shapeOf(annotated), shapeOf(schema));
  assert.equal(shapeOf(Object.fromEntries(Object.entries(schema).reverse())), shapeOf(schema));
  // A field, a value allowed or refused, a required field, a definition or a closing is shape.
  const changes = [
    (s) => (s.properties.api.pattern = "^https://.+$"),
    (s) => (s.properties.format.const = 2),
    (s) => s.required.pop(),
    (s) => (s.$defs.sign_in.properties.measurementId = { type: "string", description: "Analytics." }),
    (s) => (s.$defs.parameter.minLength = 2),
    (s) => delete s.unevaluatedProperties,
  ];
  for (const change of changes) assert.notEqual(shapeOf(edited(change)), shapeOf(schema), change.toString());
  // A field named as an annotation is a field: only keywords are taken out.
  assert.notEqual(shapeOf({ type: "object", properties: { title: { type: "string" } } }), shapeOf({ type: "object", properties: {} }));
  const branches = { allOf: [{ description: "a", type: "string" }], items: { title: "b", type: "integer" }, enum: [{ b: 1, a: 2 }] };
  assert.equal(shapeOf(branches), shapeOf({ enum: [{ a: 2, b: 1 }], items: { type: "integer" }, allOf: [{ type: "string" }] }));
});

test("what changed of the shape: the file's schema, the IDs of the rules, both, or neither", () => {
  const text = JSON.stringify(schema);
  const same = { schemaNow: text, schemaThen: text, readmeNow: readme, readmeThen: readme };
  assert.deepEqual(ruleIdsOf(readme), ["deployment.api-origin", "deployment.loopback"]);
  assert.equal(shapeChange(same), null);
  // A description, or a rule's wording under its ID, is no change of the shape.
  assert.equal(shapeChange({ ...same, schemaNow: JSON.stringify(edited((s) => (s.description = "Other."))), readmeNow: readme.replace("in clear text.", "in the clear.") }), null);
  const pattern = JSON.stringify(edited((s) => (s.properties.api.pattern = "^https://.+$")));
  assert.equal(shapeChange({ ...same, schemaNow: pattern }), SHAPE);
  assert.equal(shapeChange({ ...same, readmeNow: readme.replace("| `deployment.loopback` |", "| `deployment.loopback-host` |") }), RULES);
  const added = readme.replace("| `deployment.loopback` |", "| `deployment.auth-domain` | A rule. |\n| `deployment.loopback` |");
  assert.equal(shapeChange({ ...same, schemaNow: pattern, readmeNow: added }), `${SHAPE}, and ${RULES}`);
  // A revision with no file has no shape and no rules.
  assert.equal(shapeChange({ schemaNow: null, schemaThen: null, readmeNow: null, readmeThen: null }), null);
  assert.equal(shapeChange({ ...same, readmeThen: null }), RULES);
  assert.equal(shapeChange({ ...same, schemaThen: null }), SHAPE);
  assert.throws(() => shapeChange({ ...same, schemaNow: "{" }), /deployment\/schemas\/deployment\.schema\.json at the commit is not JSON/);
});

test("the script passes the lines through when there is nothing to check, and wants a SHA when there is", () => {
  const run = (input, args) => spawnSync(process.execPath, [script, ...args], { input, encoding: "utf8", env });
  const before = "version=v0.11.0\nprevious=v0.10.9\nreleased=\nbehind=\n";
  const through = run(before, []);
  assert.equal(through.status, 0, through.stderr);
  assert.equal(through.stdout, before);
  const noCommit = run("version=v0.11.1\nprevious=v0.11.0\nreleased=\nbehind=\n", ["HEAD"]);
  assert.equal(noCommit.status, 1);
  assert.match(noCommit.stderr, /^release-version: the commit is 'HEAD', not a SHA/);
  const { dir, git } = scratchRepository("deployment-line-script-");
  try {
    git("commit", "--quiet", "--allow-empty", "-m", "one");
    const head = git("rev-parse", "HEAD");
    const missing = spawnSync(process.execPath, [script, head], { cwd: dir, input: "version=v0.11.1\nprevious=v0.11.0\nreleased=\nbehind=\n", encoding: "utf8", env });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /^release-version: no deployment\/VERSION at /);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the rule reads the versions and the shape of the commit and of the release before it, by git", () => {
  const { dir, git } = scratchRepository("deployment-line-git-");
  try {
    writeFile(dir, git, "deployment/VERSION", "1\n");
    writeFile(dir, git, "deployment/schemas/deployment.schema.json", '{"type": "object"}\n');
    git("commit", "--quiet", "-m", "one");
    git("tag", "v0.11.0");
    writeFile(dir, git, "deployment/schemas/deployment.schema.json", '{"type": "object", "description": "A file."}\n');
    git("commit", "--quiet", "-m", "an annotation");
    const head = git("rev-parse", "HEAD");
    const input = "version=v0.11.1\nprevious=v0.11.0\nreleased=\nbehind=\n";
    assert.equal(shapeChangedBetween(head, "v0.11.0", dir), null);
    assert.equal(partLineOutput(DEPLOYMENT, shapeChangedBetween, { input, commit: head, cwd: dir }), input);
    writeFile(dir, git, "deployment/schemas/deployment.schema.json", '{"type": "array"}\n');
    git("commit", "--quiet", "-m", "a shape");
    const shaped = git("rev-parse", "HEAD");
    assert.equal(shapeChangedBetween(shaped, "v0.11.0", dir), SHAPE);
    assert.throws(() => partLineOutput(DEPLOYMENT, shapeChangedBetween, { input, commit: shaped, cwd: dir }), /the shape of deployment\/schemas\/deployment\.schema\.json changed after v0\.11\.0/);
    assert.throws(() => partLineOutput(DEPLOYMENT, shapeChangedBetween, { input, cwd: dir }), /the commit is '', not a SHA/);
    // Nothing is read for a release of an earlier line.
    const before = "version=v0.11.0\nprevious=v0.10.4\nreleased=\nbehind=\n";
    assert.equal(partLineOutput(DEPLOYMENT, () => assert.fail("read"), { input: before, cwd: dir }), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const lines = (version, previous) => `version=${version}\nprevious=${previous}\nreleased=\nbehind=\n`;
const text = (rule, wording = "A rule.") => `# The deployment configuration\n\n| ID | Rule |\n|---|---|\n| \`${rule}\` | ${wording} |\n`;

test("in spec, release-version refuses another shape or a new version of the configuration in the line of the release before it", () => {
  const { dir, git } = scratchRepository("deployment-line-");
  try {
    copySpecTools(dir, git);
    writeFile(dir, git, "format/VERSION", "0.4\n");
    writeFile(dir, git, "admission/VERSION", "0.1\n");
    writeFile(dir, git, "deployment/VERSION", "1\n");
    writeFile(dir, git, "deployment/schemas/deployment.schema.json", '{"title": "A file", "type": "object"}\n');
    writeFile(dir, git, "deployment/README.md", text("deployment.loopback"));
    releaseLine(dir, git, "0.11");
    git("commit", "--quiet", "-m", "the first configuration");
    git("tag", "v0.11.0");

    // A change of the text under the same rules, of an annotation, of the schema of a vector, of an
    // example or of a vector keeps the version: it is no change of the shape.
    writeFile(dir, git, "deployment/README.md", text("deployment.loopback", "A rule, said again."));
    writeFile(dir, git, "deployment/schemas/deployment.schema.json", '{"title": "Another title", "type": "object"}\n');
    writeFile(dir, git, "deployment/schemas/reading-vector.schema.json", "{}\n");
    writeFile(dir, git, "deployment/examples/deployment/valid/a.yaml", "format: 1\n");
    writeFile(dir, git, "deployment/vectors/reading/accepted.yaml", "cases: []\n");
    git("commit", "--quiet", "-m", "the same version");
    const same = recipe(dir);
    assert.equal(same.status, 0, same.stderr);
    assert.equal(same.stdout, lines("v0.11.1", "v0.11.0"));
    git("tag", "v0.11.1");

    writeFile(dir, git, "deployment/schemas/deployment.schema.json", '{"title": "Another title", "type": "array"}\n');
    git("commit", "--quiet", "-m", "the shape, and no new version");
    const unversioned = recipe(dir);
    assert.notEqual(unversioned.status, 0);
    assert.match(unversioned.stderr, /the shape of deployment\/schemas\/deployment\.schema\.json changed after v0\.11\.1, and deployment\/VERSION is still 1/);
    git("reset", "--quiet", "--hard", "HEAD~1");

    writeFile(dir, git, "deployment/README.md", text("deployment.loopback-host"));
    git("commit", "--quiet", "-m", "a rule of another ID, and no new version");
    const renamed = recipe(dir);
    assert.notEqual(renamed.status, 0);
    assert.match(renamed.stderr, /the IDs of the rules of deployment\/README\.md, section 5, changed after v0\.11\.1, and deployment\/VERSION is still 1/);

    writeFile(dir, git, "deployment/VERSION", "2\n");
    git("commit", "--quiet", "-m", "a new version, and no new line");
    const refused = recipe(dir);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /deployment\/VERSION is 2, and at v0\.11\.1 it was 1: a new version of the deployment configuration starts a new line/);
    assert.equal(refused.stdout, "");

    releaseLine(dir, git, "0.12");
    git("commit", "--quiet", "-m", "and its new line");
    const raised = recipe(dir);
    assert.equal(raised.status, 0, raised.stderr);
    assert.equal(raised.stdout, lines("v0.12.0", "v0.11.1"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
