// The files of spec's release of a commit: which, by the line and format/VERSION, and how
// release-files builds them, in made-up copies of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { FIRST_ADMISSION_LINE, FIRST_CONTRACTS_LINE, FIRST_DEPLOYMENT_LINE, FIRST_CONSENT_AGE_LINE, FIRST_LEGAL_LINE, FIRST_NPM_LINE, consentAgeVersion, deploymentVersion, formatVersion, legalVersion, releaseFiles, versionTexts } from "../files.mjs";
import { FIRST_FILES_LINE, compareLines } from "../version.mjs";
import { TAR } from "../../shared.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "files.mjs");

test("from the line 0.3 on, a release carries the format as one file, named by its version", () => {
  assert.equal(FIRST_FILES_LINE, "0.3");
  assert.deepEqual(releaseFiles("0.3", "0.1\n"), [{ name: "format-0.1.tar.gz", path: "format" }]);
  assert.deepEqual(releaseFiles("2.10", "2.4\n--\n0.3\n--\n1\n--\n1\n--\n1\n", "v2.10.0")[0], { name: "format-2.4.tar.gz", path: "format" });
  // A release of an earlier line carries none, and its commit need not have a VERSION.
  assert.deepEqual(releaseFiles("0.2", ""), []);
  assert.deepEqual(releaseFiles("0.2", "0.1\n"), []);
});

test("from the line 0.4 on, a release carries the npm package too, of the release's tag", () => {
  assert.equal(FIRST_NPM_LINE, "0.4");
  assert.deepEqual(releaseFiles("0.3", "0.1\n", "v0.3.9"), [{ name: "format-0.1.tar.gz", path: "format" }]);
  assert.deepEqual(releaseFiles("0.4", "0.1\n", "v0.4.0"), [
    { name: "format-0.1.tar.gz", path: "format" },
    { name: "altnovatrail-spec-0.4.0.tgz", path: "types" },
  ]);
  assert.deepEqual(releaseFiles("1.12", "1.3\n--\n0.2\n--\n3\n--\n2\n--\n1\n", "v1.12.7")[5], { name: "altnovatrail-spec-1.12.7.tgz", path: "types" });
  for (const tag of [undefined, "", "0.4.0", "v0.4", "v0.4.0-rc.1"]) {
    assert.throws(() => releaseFiles("0.4", "0.1\n", tag), /a release of the line 0\.4 carries the npm package, which takes the release's tag/, String(tag));
  }
  assert.throws(() => releaseFiles("0.4", "0.1\n", "v0.5.0"), /v0\.5\.0 is no release of the line 0\.4/);
});

test("from the line 0.7 on, a release carries the npm package of the contracts' code as well", () => {
  assert.equal(FIRST_CONTRACTS_LINE, "0.7");
  assert.deepEqual(releaseFiles("0.6", "0.2\n", "v0.6.9").map(({ name }) => name), ["format-0.2.tar.gz", "altnovatrail-spec-0.6.9.tgz"]);
  assert.deepEqual(releaseFiles("0.7", "0.2\n", "v0.7.0"), [
    { name: "format-0.2.tar.gz", path: "format" },
    { name: "altnovatrail-spec-0.7.0.tgz", path: "types" },
    { name: "altnovatrail-contracts-0.7.0.tgz", path: "contracts" },
  ]);
  assert.deepEqual(releaseFiles("1.2", "1.0\n--\n0.1\n--\n2\n--\n1\n--\n1\n", "v1.2.3")[6], { name: "altnovatrail-contracts-1.2.3.tgz", path: "contracts" });
});

test("from the line 0.8 on, a release carries the admission table too, named by its own version", () => {
  assert.equal(FIRST_ADMISSION_LINE, "0.8");
  // A release of an earlier line reads format/VERSION alone, though the commit may have both, and
  // a malformed admission/VERSION too.
  assert.deepEqual(releaseFiles("0.7", "0.2\n--\n0.1\n", "v0.7.9").map(({ name }) => name), ["format-0.2.tar.gz", "altnovatrail-spec-0.7.9.tgz", "altnovatrail-contracts-0.7.9.tgz"]);
  assert.deepEqual(releaseFiles("0.7", "0.2\n--\nnot a version\n", "v0.7.9").length, 3);
  assert.deepEqual(releaseFiles("0.8", "0.2\n--\n0.1\n", "v0.8.0"), [
    { name: "format-0.2.tar.gz", path: "format" },
    { name: "admission-0.1.tar.gz", path: "admission" },
    { name: "altnovatrail-spec-0.8.0.tgz", path: "types" },
    { name: "altnovatrail-contracts-0.8.0.tgz", path: "contracts" },
  ]);
  assert.deepEqual(versionTexts("0.2\n"), { format: "0.2\n", admission: null, deployment: null, legal: null, consentAge: null });
  assert.deepEqual(versionTexts("--\n0.1\n"), { format: "", admission: "0.1\n", deployment: null, legal: null, consentAge: null });
  for (const text of ["0.2\n", "0.2\n--\n"]) {
    assert.throws(() => releaseFiles("0.8", text, "v0.8.0"), /a release of the line 0\.8 carries the admission table, and the commit has no admission\/VERSION/, JSON.stringify(text));
  }
  assert.throws(() => releaseFiles("0.8", "0.2\n--\n0.01\n", "v0.8.0"), /^Error: admission\/VERSION is "0\.01\\n", not MAJOR\.MINOR and a newline/);
  // With no format/VERSION, its side is empty, and the refusal names it, not the table's.
  assert.throws(() => releaseFiles("0.8", "--\n0.1\n", "v0.8.0"), /^Error: format\/VERSION is "", not MAJOR\.MINOR/);
  assert.throws(() => releaseFiles("0.8", "0.2\n--\n0.1\n--\n1\n--\n1\n--\n1\n--\n", "v0.8.0"), /there are more lines --/);
});

test("from the line 0.11 on, a release carries the deployment configuration too, named by its integer", () => {
  assert.equal(FIRST_DEPLOYMENT_LINE, "0.11");
  // A release of an earlier line reads no deployment/VERSION, whatever it says.
  assert.deepEqual(releaseFiles("0.10", "0.4\n--\n0.1\n--\nnot a version\n", "v0.10.3").map(({ name }) => name), ["format-0.4.tar.gz", "admission-0.1.tar.gz", "altnovatrail-spec-0.10.3.tgz", "altnovatrail-contracts-0.10.3.tgz"]);
  assert.deepEqual(releaseFiles("0.11", "0.4\n--\n0.1\n--\n1\n", "v0.11.0"), [
    { name: "format-0.4.tar.gz", path: "format" },
    { name: "admission-0.1.tar.gz", path: "admission" },
    { name: "deployment-1.tar.gz", path: "deployment" },
    { name: "altnovatrail-spec-0.11.0.tgz", path: "types" },
    { name: "altnovatrail-contracts-0.11.0.tgz", path: "contracts" },
  ]);
  assert.deepEqual(versionTexts("0.4\n--\n0.1\n--\n1\n"), { format: "0.4\n", admission: "0.1\n", deployment: "1\n", legal: null, consentAge: null });
  for (const text of ["0.4\n--\n0.1\n", "0.4\n--\n0.1\n--\n"]) {
    assert.throws(() => releaseFiles("0.11", text, "v0.11.0"), /a release of the line 0\.11 carries the deployment configuration, and the commit has no deployment\/VERSION/, JSON.stringify(text));
  }
  assert.equal(deploymentVersion("12\n"), "12");
  for (const text of ["0\n", "01\n", "1.0\n", "1", "1\n\n", " 1\n"]) {
    assert.throws(() => deploymentVersion(text), /^Error: deployment\/VERSION is .*, not an integer from 1 and a newline$/, JSON.stringify(text));
  }
  assert.throws(() => releaseFiles("0.11", "0.4\n--\n0.1\n--\n1.0\n", "v0.11.0"), /^Error: deployment\/VERSION is "1\.0\\n", not an integer from 1/);
});

test("from the line 0.13 on, a release carries the legal texts too, named by their integer", () => {
  assert.equal(FIRST_LEGAL_LINE, "0.13");
  // A release of an earlier line reads no legal/VERSION, whatever it says.
  assert.deepEqual(releaseFiles("0.12", "0.4\n--\n0.1\n--\n1\n--\nnot a version\n", "v0.12.0").map(({ name }) => name), ["format-0.4.tar.gz", "admission-0.1.tar.gz", "deployment-1.tar.gz", "altnovatrail-spec-0.12.0.tgz", "altnovatrail-contracts-0.12.0.tgz"]);
  assert.deepEqual(releaseFiles("0.13", "0.4\n--\n0.1\n--\n1\n--\n1\n", "v0.13.0"), [
    { name: "format-0.4.tar.gz", path: "format" },
    { name: "admission-0.1.tar.gz", path: "admission" },
    { name: "deployment-1.tar.gz", path: "deployment" },
    { name: "legal-1.tar.gz", path: "legal" },
    { name: "altnovatrail-spec-0.13.0.tgz", path: "types" },
    { name: "altnovatrail-contracts-0.13.0.tgz", path: "contracts" },
  ]);
  assert.deepEqual(versionTexts("0.4\n--\n0.1\n--\n1\n--\n2\n"), { format: "0.4\n", admission: "0.1\n", deployment: "1\n", legal: "2\n", consentAge: null });
  for (const text of ["0.4\n--\n0.1\n--\n1\n", "0.4\n--\n0.1\n--\n1\n--\n"]) {
    assert.throws(() => releaseFiles("0.13", text, "v0.13.0"), /a release of the line 0\.13 carries the legal texts, and the commit has no legal\/VERSION/, JSON.stringify(text));
  }
  assert.equal(legalVersion("3\n"), "3");
  for (const text of ["0\n", "01\n", "1.0\n", "1"]) {
    assert.throws(() => legalVersion(text), /^Error: legal\/VERSION is .*, not an integer from 1 and a newline$/, JSON.stringify(text));
  }
});

test("from the line 0.14 on, a release carries the table of the age of digital consent too, named by its integer", () => {
  assert.equal(FIRST_CONSENT_AGE_LINE, "0.14");
  // A release of an earlier line reads no consent-age/VERSION, whatever it says.
  assert.deepEqual(releaseFiles("0.13", "0.4\n--\n0.1\n--\n1\n--\n1\n--\nnot a version\n", "v0.13.0").map(({ name }) => name), ["format-0.4.tar.gz", "admission-0.1.tar.gz", "deployment-1.tar.gz", "legal-1.tar.gz", "altnovatrail-spec-0.13.0.tgz", "altnovatrail-contracts-0.13.0.tgz"]);
  assert.deepEqual(releaseFiles("0.14", "0.4\n--\n0.1\n--\n1\n--\n1\n--\n1\n", "v0.14.0"), [
    { name: "format-0.4.tar.gz", path: "format" },
    { name: "admission-0.1.tar.gz", path: "admission" },
    { name: "deployment-1.tar.gz", path: "deployment" },
    { name: "legal-1.tar.gz", path: "legal" },
    { name: "consent-age-1.tar.gz", path: "consent-age" },
    { name: "altnovatrail-spec-0.14.0.tgz", path: "types" },
    { name: "altnovatrail-contracts-0.14.0.tgz", path: "contracts" },
  ]);
  assert.deepEqual(versionTexts("0.4\n--\n0.1\n--\n1\n--\n2\n--\n3\n"), { format: "0.4\n", admission: "0.1\n", deployment: "1\n", legal: "2\n", consentAge: "3\n" });
  assert.throws(() => versionTexts("0.4\n--\n0.1\n--\n1\n--\n2\n--\n3\n--\n4\n"), /there are more lines --/);
  for (const text of ["0.4\n--\n0.1\n--\n1\n--\n1\n", "0.4\n--\n0.1\n--\n1\n--\n1\n--\n"]) {
    assert.throws(() => releaseFiles("0.14", text, "v0.14.0"), /a release of the line 0\.14 carries the table of the age of digital consent, and the commit has no consent-age\/VERSION/, JSON.stringify(text));
  }
  assert.equal(consentAgeVersion("4\n"), "4");
  for (const text of ["0\n", "01\n", "1.0\n", "1"]) {
    assert.throws(() => consentAgeVersion(text), /^Error: consent-age\/VERSION is .*, not an integer from 1 and a newline$/, JSON.stringify(text));
  }
});

test("a VERSION that is not MAJOR.MINOR and a newline, and a line that is not MAJOR.MINOR, are refused", () => {
  assert.equal(formatVersion("0.1\n"), "0.1");
  for (const text of ["", "0.1", "0.1\n\n", "01.1\n", "0.1.0\n", "v0.1\n", " 0.1\n"]) {
    assert.throws(() => releaseFiles("0.3", text), /not MAJOR\.MINOR and a newline/, JSON.stringify(text));
  }
  for (const line of ["", "0.3.0", "v0.3"]) assert.throws(() => releaseFiles(line, "0.1\n"), /is not MAJOR\.MINOR/);
});

test("lines compare by number", () => {
  assert.ok(compareLines("0.10", "0.9") > 0);
  assert.ok(compareLines("1.0", "0.30") > 0);
  assert.equal(compareLines("0.3", "0.3"), 0);
  assert.ok(compareLines("0.2", "0.3") < 0);
});

test("the script prints a line for each file, and says why it refuses", () => {
  const run = (line, input) => spawnSync(process.execPath, [script, line], { input, encoding: "utf8", env });
  const files = run("0.3", "0.1\n");
  assert.equal(files.status, 0, files.stderr);
  assert.equal(files.stdout, "format-0.1.tar.gz format\n");
  const none = run("0.2", "");
  assert.equal(none.status, 0, none.stderr);
  assert.equal(none.stdout, "");
  const broken = run("0.3", "");
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /^release-files: format\/VERSION is "", not MAJOR\.MINOR/);
  const npm = spawnSync(process.execPath, [script, "0.4", "v0.4.2"], { input: "0.1\n", encoding: "utf8", env });
  assert.equal(npm.status, 0, npm.stderr);
  assert.equal(npm.stdout, "format-0.1.tar.gz format\naltnovatrail-spec-0.4.2.tgz types\n");
  const contracts = spawnSync(process.execPath, [script, "0.7", "v0.7.1"], { input: "0.2\n", encoding: "utf8", env });
  assert.equal(contracts.status, 0, contracts.stderr);
  assert.equal(contracts.stdout, "format-0.2.tar.gz format\naltnovatrail-spec-0.7.1.tgz types\naltnovatrail-contracts-0.7.1.tgz contracts\n");
  const admission = spawnSync(process.execPath, [script, "0.8", "v0.8.1"], { input: "0.2\n--\n0.1\n", encoding: "utf8", env });
  assert.equal(admission.status, 0, admission.stderr);
  assert.equal(admission.stdout, "format-0.2.tar.gz format\nadmission-0.1.tar.gz admission\naltnovatrail-spec-0.8.1.tgz types\naltnovatrail-contracts-0.8.1.tgz contracts\n");
  const deployment = spawnSync(process.execPath, [script, "0.11", "v0.11.2"], { input: "0.4\n--\n0.1\n--\n1\n", encoding: "utf8", env });
  assert.equal(deployment.status, 0, deployment.stderr);
  assert.equal(deployment.stdout, "format-0.4.tar.gz format\nadmission-0.1.tar.gz admission\ndeployment-1.tar.gz deployment\naltnovatrail-spec-0.11.2.tgz types\naltnovatrail-contracts-0.11.2.tgz contracts\n");
  const legal = spawnSync(process.execPath, [script, "0.13", "v0.13.1"], { input: "0.4\n--\n0.1\n--\n1\n--\n1\n", encoding: "utf8", env });
  assert.equal(legal.status, 0, legal.stderr);
  assert.equal(legal.stdout, "format-0.4.tar.gz format\nadmission-0.1.tar.gz admission\ndeployment-1.tar.gz deployment\nlegal-1.tar.gz legal\naltnovatrail-spec-0.13.1.tgz types\naltnovatrail-contracts-0.13.1.tgz contracts\n");
});

// A made-up spec with a small format, committed in the line given: release-files reads it.
function copy(line) {
  const repository = scratchRepository("release-files-");
  const { dir, git } = repository;
  copySpecTools(dir, git);
  writeFile(dir, git, "LICENSE", "Apache License\n");
  writeFile(dir, git, "format/VERSION", "0.1\n");
  writeFile(dir, git, "format/schemas/task.schema.json", "{}\n");
  writeFile(dir, git, "format/vectors/packages/a/module/.editor-notes", "on a dot\n");
  writeFile(dir, git, "docs/product.md", "# Not in the file\n");
  writeFile(dir, git, "types/formatv0/index.d.ts", "export type A = string;\n");
  writeFile(dir, git, "types/formatv0/open/index.d.ts", "export type B = number;\n");
  writeFile(dir, git, "tools/types/npm/README.md", "# @altnovatrail/spec\n");
  releaseLine(dir, git, line);
  git("commit", "--quiet", "-m", "first");
  return repository;
}

const listing = (file) => {
  const listed = spawnSync(TAR, ["-tzf", file], { encoding: "utf8" });
  assert.equal(listed.status, 0, listed.stderr);
  return listed.stdout.split("\n").filter((name) => name !== "" && !name.endsWith("/")).sort();
};

test("release-files builds the format of the commit, with LICENSE, in a folder named as the file", () => {
  const { dir, git } = copy("0.3");
  try {
    // The working tree is not the commit, and the file holds the commit alone.
    fs.writeFileSync(path.join(dir, "format", "VERSION"), "0.9\n");
    fs.writeFileSync(path.join(dir, "format", "untracked.yaml"), "a: 1\n");
    const built = recipe(dir, { name: "release-files", args: ["HEAD", "dist"] });
    assert.equal(built.status, 0, built.stderr);
    assert.match(built.stdout, /format-0\.1\.tar\.gz, 4 files of [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "dist")), ["format-0.1.tar.gz"]);
    assert.deepEqual(listing(path.join(dir, "dist", "format-0.1.tar.gz")), [
      "format-0.1/LICENSE",
      "format-0.1/format/VERSION",
      "format-0.1/format/schemas/task.schema.json",
      "format-0.1/format/vectors/packages/a/module/.editor-notes",
    ]);
    const version = spawnSync(TAR, ["-xzOf", path.join(dir, "dist", "format-0.1.tar.gz"), "format-0.1/format/VERSION"], { encoding: "utf8" });
    assert.equal(version.stdout, "0.1\n");

    // A folder that is there already is refused, so that no file of another build slips in.
    const again = recipe(dir, { name: "release-files", args: ["HEAD", "dist"] });
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /dist is there already/);
    assert.notEqual(recipe(dir, { name: "release-files", args: ["no-such-commit", "other"] }).status, 0);

    // A new version of the format names a new file, and from the line 0.4 on the npm package of
    // the release's tag comes too, of the commit's types.
    writeFile(dir, git, "format/VERSION", "0.2\n");
    releaseLine(dir, git, "0.4");
    git("commit", "--quiet", "-m", "a new version of the format, in a new line");
    fs.writeFileSync(path.join(dir, "types", "formatv0", "index.d.ts"), "export type Changed = never;\n");
    const next = recipe(dir, { name: "release-files", args: ["HEAD", "next", "v0.4.0"] });
    assert.equal(next.status, 0, next.stderr);
    assert.match(next.stdout, /release-files: altnovatrail-spec-0\.4\.0\.tgz, the npm package of types\/ at [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "next")).sort(), ["altnovatrail-spec-0.4.0.tgz", "format-0.2.tar.gz"]);
    const npm = path.join(dir, "next", "altnovatrail-spec-0.4.0.tgz");
    assert.deepEqual(listing(npm), ["package/LICENSE", "package/README.md", "package/formatv0/index.d.ts", "package/formatv0/open/index.d.ts", "package/package.json"]);
    const declarations = spawnSync(TAR, ["-xzOf", npm, "package/formatv0/index.d.ts"], { encoding: "utf8" });
    assert.equal(declarations.stdout, "export type A = string;\n");

    // Without the release's tag, or with another line's, the line 0.4 gets no files.
    const untagged = recipe(dir, { name: "release-files", args: ["HEAD", "untagged"] });
    assert.notEqual(untagged.status, 0);
    assert.match(untagged.stderr, /a release of the line 0\.4 carries the npm package, which takes the release's tag/);
    const other = recipe(dir, { name: "release-files", args: ["HEAD", "other-line", "v0.3.7"] });
    assert.notEqual(other.status, 0);
    assert.match(other.stderr, /v0\.3\.7 is no release of the line 0\.4/);

    // From the line 0.5 on, the package holds the types of <novatrail-canvas> too. A release of the
    // line 0.4, run again, gets the package it got, though its commit has none of them.
    const earlier = git("rev-parse", "HEAD");
    writeFile(dir, git, "types/canvas/index.d.ts", 'export type Tool = "pen";\n');
    releaseLine(dir, git, "0.5");
    git("commit", "--quiet", "-m", "the types of the element, in a new line");
    const canvas = recipe(dir, { name: "release-files", args: ["HEAD", "canvas", "v0.5.0"] });
    assert.equal(canvas.status, 0, canvas.stderr);
    assert.deepEqual(listing(path.join(dir, "canvas", "altnovatrail-spec-0.5.0.tgz")), [
      "package/LICENSE",
      "package/README.md",
      "package/canvas/index.d.ts",
      "package/formatv0/index.d.ts",
      "package/formatv0/open/index.d.ts",
      "package/package.json",
    ]);
    const again04 = recipe(dir, { name: "release-files", args: [earlier, "earlier", "v0.4.0"] });
    assert.equal(again04.status, 0, again04.stderr);
    const rebuilt = path.join(dir, "earlier", "altnovatrail-spec-0.4.0.tgz");
    assert.deepEqual(listing(rebuilt), listing(npm));
    const entry = (archive, file) => spawnSync(TAR, ["-xzOf", archive, `package/${file}`], { encoding: "utf8" }).stdout;
    for (const file of ["package.json", "formatv0/index.d.ts"]) assert.equal(entry(rebuilt, file), entry(npm, file), file);
    // The commit of the line 0.5 holds the types changed since, which the rebuilt 0.4 package has not.
    assert.equal(entry(path.join(dir, "canvas", "altnovatrail-spec-0.5.0.tgz"), "formatv0/index.d.ts"), "export type Changed = never;\n");

    // A commit with contracts, in the line 0.6, gets no package of them: a release of that line,
    // run again, builds the files it got. From the line 0.7 on, the package of their code comes.
    writeFile(dir, git, "contracts/novatrail/trial/v1/trial.proto", "syntax = \"proto3\";\n");
    writeFile(dir, git, "contracts/novatrail/trial/v1/trial_pb.js", "export const TrialSchema = 1;\n");
    writeFile(dir, git, "contracts/novatrail/trial/v1/trial_pb.d.ts", "export declare const TrialSchema: number;\n");
    writeFile(dir, git, "tools/contracts/npm/README.md", "# @altnovatrail/contracts\n");
    writeFile(dir, git, "tools/package.json", `${JSON.stringify({ dependencies: { "@bufbuild/protobuf": "2.16.0", "@bufbuild/protoc-gen-es": "2.16.0" } })}\n`);
    releaseLine(dir, git, "0.6");
    git("commit", "--quiet", "-m", "a contract, in the line 0.6");
    const before = recipe(dir, { name: "release-files", args: ["HEAD", "before", "v0.6.7"] });
    assert.equal(before.status, 0, before.stderr);
    assert.deepEqual(fs.readdirSync(path.join(dir, "before")).sort(), ["altnovatrail-spec-0.6.7.tgz", "format-0.2.tar.gz"]);
    releaseLine(dir, git, "0.7");
    git("commit", "--quiet", "-m", "the line 0.7");
    fs.writeFileSync(path.join(dir, "contracts/novatrail/trial/v1/trial_pb.js"), "changed since\n");
    const contracts = recipe(dir, { name: "release-files", args: ["HEAD", "with-contracts", "v0.7.0"] });
    assert.equal(contracts.status, 0, contracts.stderr);
    assert.match(contracts.stdout, /release-files: altnovatrail-contracts-0\.7\.0\.tgz, the npm package of contracts\/ at [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "with-contracts")).sort(), ["altnovatrail-contracts-0.7.0.tgz", "altnovatrail-spec-0.7.0.tgz", "format-0.2.tar.gz"]);
    const code = path.join(dir, "with-contracts", "altnovatrail-contracts-0.7.0.tgz");
    assert.deepEqual(listing(code), ["package/LICENSE", "package/README.md", "package/novatrail/trial/v1/trial_pb.d.ts", "package/novatrail/trial/v1/trial_pb.js", "package/package.json"]);
    assert.equal(entry(code, "novatrail/trial/v1/trial_pb.js"), "export const TrialSchema = 1;\n");
    assert.deepEqual(JSON.parse(entry(code, "package.json")).dependencies, { "@bufbuild/protobuf": "2.16.0" });

    // From the line 0.8 on, the admission table comes too, by its own version (R96), and a commit
    // of the line without admission/VERSION is refused.
    releaseLine(dir, git, "0.8");
    git("commit", "--quiet", "-m", "the line 0.8, with no table yet");
    const missing = recipe(dir, { name: "release-files", args: ["HEAD", "no-table", "v0.8.0"] });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /a release of the line 0\.8 carries the admission table, and the commit has no admission\/VERSION/);
    writeFile(dir, git, "admission/VERSION", "0.1\n");
    writeFile(dir, git, "admission/admission-table.json", "{}\n");
    writeFile(dir, git, "types/admissionv0/index.d.ts", "export type AdmissionTable = object;\n");
    git("commit", "--quiet", "-m", "the admission table");
    const admission = recipe(dir, { name: "release-files", args: ["HEAD", "with-admission", "v0.8.0"] });
    assert.equal(admission.status, 0, admission.stderr);
    assert.match(admission.stdout, /admission-0\.1\.tar\.gz, 3 files of [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "with-admission")).sort(), ["admission-0.1.tar.gz", "altnovatrail-contracts-0.8.0.tgz", "altnovatrail-spec-0.8.0.tgz", "format-0.2.tar.gz"]);
    assert.deepEqual(listing(path.join(dir, "with-admission", "admission-0.1.tar.gz")), ["admission-0.1/LICENSE", "admission-0.1/admission/VERSION", "admission-0.1/admission/admission-table.json"]);

    // From the line 0.11 on, the deployment configuration comes too, by its integer (R85), and a
    // commit of the line without deployment/VERSION is refused.
    releaseLine(dir, git, "0.11");
    git("commit", "--quiet", "-m", "the line 0.11, with no deployment configuration yet");
    const unconfigured = recipe(dir, { name: "release-files", args: ["HEAD", "no-deployment", "v0.11.0"] });
    assert.notEqual(unconfigured.status, 0);
    assert.match(unconfigured.stderr, /a release of the line 0\.11 carries the deployment configuration, and the commit has no deployment\/VERSION/);
    writeFile(dir, git, "deployment/VERSION", "1\n");
    writeFile(dir, git, "deployment/schemas/deployment.schema.json", "{}\n");
    // The npm package of the line holds the page of the workbook and the deployment configuration's
    // types as well.
    writeFile(dir, git, "types/page/page.json", "{}\n");
    writeFile(dir, git, "types/deploymentv1/index.d.ts", "export type Deployment = object;\n");
    git("commit", "--quiet", "-m", "the deployment configuration");
    const deployment = recipe(dir, { name: "release-files", args: ["HEAD", "with-deployment", "v0.11.0"] });
    assert.equal(deployment.status, 0, deployment.stderr);
    assert.match(deployment.stdout, /deployment-1\.tar\.gz, 3 files of [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "with-deployment")).sort(), ["admission-0.1.tar.gz", "altnovatrail-contracts-0.11.0.tgz", "altnovatrail-spec-0.11.0.tgz", "deployment-1.tar.gz", "format-0.2.tar.gz"]);
    assert.deepEqual(listing(path.join(dir, "with-deployment", "deployment-1.tar.gz")), ["deployment-1/LICENSE", "deployment-1/deployment/VERSION", "deployment-1/deployment/schemas/deployment.schema.json"]);

    // From the line 0.13 on, the legal texts come too, by their integer (R130), and a commit of the
    // line without legal/VERSION is refused.
    releaseLine(dir, git, "0.13");
    git("commit", "--quiet", "-m", "the line 0.13, with no legal texts yet");
    const unwritten = recipe(dir, { name: "release-files", args: ["HEAD", "no-legal", "v0.13.0"] });
    assert.notEqual(unwritten.status, 0);
    assert.match(unwritten.stderr, /a release of the line 0\.13 carries the legal texts, and the commit has no legal\/VERSION/);
    writeFile(dir, git, "legal/VERSION", "1\n");
    writeFile(dir, git, "legal/legal.yaml", "format: 1\n");
    writeFile(dir, git, "legal/texts/privacy-policy/1.md", "# Privacy policy\n");
    writeFile(dir, git, "types/legalv1/index.d.ts", "export type Legal = object;\n");
    git("commit", "--quiet", "-m", "the legal texts");
    const legal = recipe(dir, { name: "release-files", args: ["HEAD", "with-legal", "v0.13.0"] });
    assert.equal(legal.status, 0, legal.stderr);
    assert.match(legal.stdout, /legal-1\.tar\.gz, 4 files of [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "with-legal")).sort(), ["admission-0.1.tar.gz", "altnovatrail-contracts-0.13.0.tgz", "altnovatrail-spec-0.13.0.tgz", "deployment-1.tar.gz", "format-0.2.tar.gz", "legal-1.tar.gz"]);
    assert.deepEqual(listing(path.join(dir, "with-legal", "legal-1.tar.gz")), ["legal-1/LICENSE", "legal-1/legal/VERSION", "legal-1/legal/legal.yaml", "legal-1/legal/texts/privacy-policy/1.md"]);

    // From the line 0.14 on, the table of the age of digital consent comes too, by its integer
    // (R134), and a commit of the line without consent-age/VERSION is refused.
    releaseLine(dir, git, "0.14");
    git("commit", "--quiet", "-m", "the line 0.14, with no table yet");
    const untabled = recipe(dir, { name: "release-files", args: ["HEAD", "no-consent-age", "v0.14.0"] });
    assert.notEqual(untabled.status, 0);
    assert.match(untabled.stderr, /a release of the line 0\.14 carries the table of the age of digital consent, and the commit has no consent-age\/VERSION/);
    writeFile(dir, git, "consent-age/VERSION", "1\n");
    writeFile(dir, git, "consent-age/consent-age.yaml", "format: 1\n");
    writeFile(dir, git, "types/consentagev1/index.d.ts", "export type ConsentAge = object;\n");
    git("commit", "--quiet", "-m", "the table");
    const consentAge = recipe(dir, { name: "release-files", args: ["HEAD", "with-consent-age", "v0.14.0"] });
    assert.equal(consentAge.status, 0, consentAge.stderr);
    assert.match(consentAge.stdout, /consent-age-1\.tar\.gz, 3 files of [0-9a-f]{40}/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "with-consent-age")).sort(), ["admission-0.1.tar.gz", "altnovatrail-contracts-0.14.0.tgz", "altnovatrail-spec-0.14.0.tgz", "consent-age-1.tar.gz", "deployment-1.tar.gz", "format-0.2.tar.gz", "legal-1.tar.gz"]);
    assert.deepEqual(listing(path.join(dir, "with-consent-age", "consent-age-1.tar.gz")), ["consent-age-1/LICENSE", "consent-age-1/consent-age/VERSION", "consent-age-1/consent-age/consent-age.yaml"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// git quotes a name that is not plain ASCII, or holds a quote or a backslash, and tar lists it
// as it is: the two lists are held name for name, whatever the names.
test("release-files holds names that git would quote", () => {
  const { dir, git } = copy("0.3");
  try {
    writeFile(dir, git, "format/media/ёлка.png", "not a picture\n");
    writeFile(dir, git, 'format/notes/a "quoted" \\ name.txt', "odd\n");
    git("commit", "--quiet", "-m", "odd names");
    const built = recipe(dir, { name: "release-files", args: ["HEAD", "dist"] });
    assert.equal(built.status, 0, built.stderr);
    assert.match(built.stdout, /format-0\.1\.tar\.gz, 6 files of/);
    const listed = listing(path.join(dir, "dist", "format-0.1.tar.gz"));
    assert.ok(listed.includes("format-0.1/format/media/ёлка.png"), listed.join("\n"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a commit of a line before 0.3 gets an empty folder, with or without format/VERSION", () => {
  const { dir, git } = copy("0.2");
  try {
    const built = recipe(dir, { name: "release-files", args: ["HEAD", "dist"] });
    assert.equal(built.status, 0, built.stderr);
    assert.deepEqual(fs.readdirSync(path.join(dir, "dist")), []);
    git("rm", "--quiet", "format/VERSION");
    git("commit", "--quiet", "-m", "before the format had a version");
    const older = recipe(dir, { name: "release-files", args: ["HEAD", "older"] });
    assert.equal(older.status, 0, older.stderr);
    assert.deepEqual(fs.readdirSync(path.join(dir, "older")), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a commit of the line 0.3 or later without format/VERSION is refused", () => {
  const { dir, git } = copy("0.3");
  try {
    git("rm", "--quiet", "format/VERSION");
    git("commit", "--quiet", "-m", "no version");
    const built = recipe(dir, { name: "release-files", args: ["HEAD", "dist"] });
    assert.notEqual(built.status, 0);
    assert.match(built.stderr, /format\/VERSION is "", not MAJOR\.MINOR/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
