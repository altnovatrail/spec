// Each test lays out a made-up repository — spec's own buf.yaml, buf.gen.yaml, contracts/go.mod and
// go.sum, with the trial contract of fixtures/base and the code buf generates from it —, breaks one
// thing in it, and expects contracts-check to name it. buf and its plugins run as the check runs
// them: buf of the toolchain stage, the Go plugins as tools of contracts/go.mod, protoc-gen-es from
// tools/. The last tests read spec's own contracts/.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { GIT } from "../../shared.mjs";
import { root, isolated, scratchRepository } from "../../release/test/repository.mjs";
import { checkContracts, summary } from "../main.mjs";
import { writeGenerated } from "../generate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const trial = "contracts/novatrail/trial/v1/trial.proto";

// A made-up repository: what buf reads of spec, the trial contract, and, unless told not to, the
// code buf generates from it, all committed on main.
function repository({ generated = true } = {}) {
  const { dir, git } = scratchRepository("contracts-check-");
  for (const file of ["LICENSE", "buf.yaml", "buf.gen.yaml", "contracts/README.md", "contracts/go.mod", "contracts/go.sum", "tools/package.json", "tools/contracts/npm/README.md"]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  fs.cpSync(path.join(here, "fixtures", "base"), dir, { recursive: true });
  fs.symlinkSync(path.join(root, "tools", "node_modules"), path.join(dir, "tools", "node_modules"));
  fs.writeFileSync(path.join(dir, ".gitignore"), "/tools/node_modules\n");
  if (generated) writeGenerated(dir);
  git("add", "--all");
  git("commit", "--quiet", "-m", "trial");
  return { dir, git };
}

// A file of the repository with from replaced by to; from null writes the file anew.
function edit(dir, file, from, to) {
  const full = path.join(dir, file);
  if (from === null) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, to);
  } else {
    const text = fs.readFileSync(full, "utf8");
    assert.ok(text.includes(from), `${file} has no ${JSON.stringify(from)}`);
    fs.writeFileSync(full, text.replace(from, to));
  }
}

// The errors of the check, file:line: message.
function errorsOf(dir) {
  return checkContracts(dir).errors.map(({ file, line, message }) => `${file}:${line}: ${message}`);
}

// Every error matches one of the patterns, and every pattern one of the errors.
function expectEach(dir, ...patterns) {
  const errors = errorsOf(dir);
  for (const error of errors) assert.ok(patterns.some((pattern) => pattern.test(error)), `unexpected: ${error}\nall:\n${errors.join("\n")}`);
  for (const pattern of patterns) assert.ok(errors.some((error) => pattern.test(error)), `missing: ${pattern}\nall:\n${errors.join("\n")}`);
}

test("the trial contract with its generated code passes, with no release to compare with", () => {
  const { dir } = repository();
  const { errors, stats } = checkContracts(dir);
  assert.deepEqual(errors, []);
  assert.deepEqual(stats, { protos: 1, packages: 1, generated: 4, vectors: 0, cases: 0, previous: null, messages: 4 });
  assert.equal(summary(stats), "1 .proto file in 1 package, 4 files of generated code, and no release of spec before HEAD to compare with; tsc and Node take the 4 messages of its npm package");
  for (const file of ["trial.pb.go", "trialv1connect/trial.connect.go", "trial_pb.js", "trial_pb.d.ts"]) {
    assert.ok(fs.existsSync(path.join(dir, "contracts/novatrail/trial/v1", file)), file);
  }
});

test("contracts/ with no .proto file passes, and a generated file left over is found", () => {
  const { dir } = repository();
  fs.rmSync(path.join(dir, trial));
  expectEach(dir, /trial\.pb\.go:0: no \.proto file generates it: contracts\/novatrail\/trial\/v1\/trial\.proto is not there; run just contracts/, /trial_pb\.js:0: no \.proto file/, /trial_pb\.d\.ts:0: no \.proto file/, /trial\.connect\.go:0: no \.proto file/);
  const { written, removed } = writeGenerated(dir);
  assert.deepEqual({ written, removed }, { written: 0, removed: 4 });
  assert.ok(!fs.existsSync(path.join(dir, "contracts/novatrail")), "the folders of generated code went too");
  const { errors, stats } = checkContracts(dir);
  assert.deepEqual(errors, []);
  assert.match(summary(stats), /^contracts\/ holds no \.proto file yet, so buf has nothing to check/);
});

test("a file the layout does not have is found, and a .proto out of place by its rule", () => {
  const { dir } = repository();
  edit(dir, "contracts/notes.txt", null, "notes\n");
  edit(dir, "contracts/novatrail/trial/v1alpha1/trial.proto", null, "syntax = \"proto3\";\n");
  expectEach(
    dir,
    /^contracts\/notes\.txt:0: contracts-check does not know it/,
    /^contracts\/novatrail\/trial\/v1alpha1\/trial\.proto:0: a contract is contracts\/novatrail\/<part>\/vN\/<name>\.proto/,
    /^buf\.yaml:0: buf does not run while a \.proto file is out of the layout/,
  );
});

test("a file buf format would write otherwise is found", () => {
  const { dir } = repository();
  edit(dir, trial, "  int32 ymin = 1;", "  int32   ymin = 1;");
  expectEach(dir, /^contracts\/novatrail\/trial\/v1\/trial\.proto:0: the file is not as buf format writes it; run buf format -w/);
});

test("buf lint finds a missing comment, a stream, a zero value and a package out of its folder", () => {
  const { dir } = repository();
  edit(dir, trial, "  // The top edge.\n", "");
  edit(dir, trial, "rpc GetPlace(GetPlaceRequest) returns (GetPlaceResponse);", "rpc GetPlace(GetPlaceRequest) returns (stream GetPlaceResponse);");
  edit(dir, trial, "KIND_UNSPECIFIED = 0;", "KIND_NONE = 0;");
  writeGenerated(dir);
  expectEach(
    dir,
    /trial\.proto:9: .*should have a non-empty comment.*\(buf lint, COMMENT_FIELD\)/,
    /trial\.proto:\d+: .*\(buf lint, RPC_NO_SERVER_STREAMING\)/,
    /trial\.proto:\d+: .*\(buf lint, ENUM_ZERO_VALUE_SUFFIX\)/,
  );
  const other = repository();
  edit(other.dir, trial, "package novatrail.trial.v1;", "package novatrail.other.v1;");
  writeGenerated(other.dir);
  // Its Connect code goes into a folder named by the package, which the layout does not have.
  expectEach(other.dir, /trial\.proto:\d+: .*\(buf lint, PACKAGE_DIRECTORY_MATCH\)/, /otherv1connect\/trial\.connect\.go:0: contracts-check does not know it/);
});

test("a comment does not switch a rule off", () => {
  const { dir } = repository();
  edit(dir, trial, "  // The top edge.\n", "  // buf:lint:ignore COMMENT_FIELD\n");
  writeGenerated(dir);
  const errors = errorsOf(dir);
  assert.ok(errors.length > 0 && errors.every((error) => /\(buf lint, [A-Z_]+\)/.test(error)), errors.join("\n"));
});

test("a json_name, an unsigned type and an edition are found, which buf lets pass", () => {
  const { dir } = repository();
  edit(dir, trial, "string task_id = 1;", "string task_id = 1 [json_name = \"taskId\"];");
  edit(dir, trial, "int32 xmin = 1;", "uint32 xmin = 1;");
  writeGenerated(dir);
  expectEach(dir, /trial\.proto:35: the field task_id sets json_name/, /trial\.proto:18: the field xmin is of the unsigned uint32/);
  const edition = repository();
  edit(edition.dir, trial, "syntax = \"proto3\";", "edition = \"2023\";");
  edit(edition.dir, trial, "optional string note = 3;", "string note = 3;");
  writeGenerated(edition.dir);
  expectEach(edition.dir, /trial\.proto:1: the file is of edition EDITION_2023, and a contract is proto3/);
});

test("a file buf cannot build stops the check at buf build", () => {
  const { dir } = repository();
  edit(dir, trial, "message Place {", "message Place {{");
  const errors = errorsOf(dir);
  assert.ok(errors.length > 0 && errors.every((error) => /\(buf build, COMPILE\)$/.test(error)), errors.join("\n"));
});

test("buf does not run while buf.yaml or buf.gen.yaml breaks R83", () => {
  const { dir } = repository();
  edit(dir, "buf.yaml", "version: v2\n", "version: v2\ndeps:\n  - buf.build/bufbuild/protovalidate\n");
  edit(dir, "buf.gen.yaml", "  - local: tools/node_modules/.bin/protoc-gen-es\n", "  - remote: buf.build/bufbuild/es:v2.16.0\n");
  expectEach(dir, /^buf\.yaml:\d+: deps:/, /^buf\.gen\.yaml:\d+: remote:/, /^buf\.yaml:0: buf does not run while buf\.yaml or buf\.gen\.yaml breaks R83/);
  assert.throws(() => writeGenerated(dir), /buf generate does not run while contracts-check finds these:\nbuf\.yaml:\d+: deps:/);
  fs.rmSync(path.join(dir, "buf.gen.yaml"));
  expectEach(dir, /^buf\.yaml:\d+: deps:/, /^buf\.gen\.yaml:0: the file is missing/, /buf does not run/);
});

test("buf breaking compares with the newest release before HEAD", () => {
  const { dir, git } = repository();
  git("tag", "v0.6.4");
  edit(dir, trial, "  optional string note = 3;", "  optional string remark = 3;");
  writeGenerated(dir);
  git("commit", "--quiet", "--all", "-m", "a field renamed");
  expectEach(dir, /trial\.proto:14: Field "3" on message "Place" changed name from "note" to "remark"\. \(buf breaking against v0\.6\.4, FIELD_SAME_NAME\)/, /\(buf breaking against v0\.6\.4, FIELD_SAME_JSON_NAME\)/);
  // A release of HEAD itself is no previous release: the one before it is.
  git("tag", "v0.6.5");
  expectEach(dir, /\(buf breaking against v0\.6\.4, FIELD_SAME_NAME\)/, /\(buf breaking against v0\.6\.4, FIELD_SAME_JSON_NAME\)/);
});

test("a field added passes against the release, and a release with no .proto has nothing to compare", () => {
  const { dir, git } = repository();
  git("tag", "v0.6.4");
  edit(dir, trial, "  repeated Part parts = 4;\n", "  repeated Part parts = 4;\n  // The bottom edge.\n  int32 ymax = 5;\n");
  writeGenerated(dir);
  git("commit", "--quiet", "--all", "-m", "a field added");
  const { errors, stats } = checkContracts(dir);
  assert.deepEqual(errors, []);
  assert.match(summary(stats), /, compared with v0\.6\.4; tsc and Node take the 4 messages of its npm package$/);

  const empty = scratchRepository("contracts-check-empty-");
  empty.git("commit", "--quiet", "--allow-empty", "-m", "before the contracts");
  empty.git("tag", "v0.6.0");
  const later = repository();
  later.git("fetch", "--quiet", "--tags", empty.dir);
  later.git("merge", "--quiet", "--allow-unrelated-histories", "-m", "both", "v0.6.0");
  const result = checkContracts(later.dir);
  assert.deepEqual(result.errors, []);
  assert.match(summary(result.stats), /, and v0\.6\.0 holds no \.proto file to compare with; tsc and Node take/);
});

test("the generated code is held to what buf generates, file for file", () => {
  const { dir } = repository();
  const generated = "contracts/novatrail/trial/v1";
  edit(dir, `${generated}/trial.pb.go`, "package trialv1", "package trialv1 // changed");
  fs.rmSync(path.join(dir, generated, "trial_pb.d.ts"));
  edit(dir, `${generated}/other_pb.js`, null, "export {};\n");
  expectEach(
    dir,
    /trial\.pb\.go:0: the file is not what buf generates from contracts\/novatrail\/trial\/v1\/trial\.proto; run just contracts/,
    /trial_pb\.d\.ts:0: buf generates it from contracts\/novatrail\/trial\/v1\/trial\.proto, and contracts\/ lacks it; run just contracts/,
    /other_pb\.js:0: no \.proto file generates it: contracts\/novatrail\/trial\/v1\/other\.proto is not there; run just contracts/,
  );
  const { written, removed } = writeGenerated(dir);
  assert.deepEqual({ written, removed }, { written: 4, removed: 1 });
  assert.deepEqual(checkContracts(dir).errors, []);
});

test("a generated file buf no longer writes is found", () => {
  const { dir } = repository();
  edit(dir, trial, /\n\/\/ Gives places\.[^]*$/.exec(fs.readFileSync(path.join(dir, trial), "utf8"))[0], "");
  expectEach(
    dir,
    /trial\.connect\.go:0: buf no longer generates it from contracts\/novatrail\/trial\/v1\/trial\.proto; run just contracts/,
    /trial\.pb\.go:0: the file is not what buf generates/,
    /trial_pb\.js:0: the file is not what buf generates/,
    /trial_pb\.d\.ts:0: the file is not what buf generates/,
  );
});

test("generation refuses while a file of contracts/ is out of place", () => {
  const { dir } = repository({ generated: false });
  edit(dir, "contracts/notes.txt", null, "notes\n");
  assert.throws(() => writeGenerated(dir), /contracts\/notes\.txt:0: contracts-check does not know it/);
});

test("a shallow clone is refused: it has no tags to find the previous release by", () => {
  const { dir, git } = repository();
  git("tag", "v0.6.4");
  edit(dir, trial, "  repeated Part parts = 4;\n", "  repeated Part parts = 4;\n  // The bottom edge.\n  int32 ymax = 5;\n");
  writeGenerated(dir);
  git("commit", "--quiet", "--all", "-m", "a field added");
  const shallow = `${dir}-shallow`;
  const clone = spawnSync(GIT, ["clone", "--quiet", "--depth", "1", `file://${dir}`, shallow], { encoding: "utf8", env: isolated });
  assert.equal(clone.status, 0, clone.stderr);
  fs.symlinkSync(path.join(root, "tools", "node_modules"), path.join(shallow, "tools", "node_modules"));
  assert.throws(() => checkContracts(shallow), /a shallow clone has no tags to find the previous release by/);
});

test("the command prints each error and exits 1, or prints the summary", () => {
  // The commands read the spec two levels above them, and take no other: a copy of them in the
  // made-up repository reads that one.
  const { dir } = repository();
  const tools = ["tools/shared.mjs", "tools/npm-package.mjs", "tools/release/version.mjs"];
  const contracts = ["main", "buf", "rules", "generate", "npm", "typescript", "contracts.check", "observation"].map((name) => `tools/contracts/${name}.mjs`);
  const format = ["verdicts", "templates", "expressions", "random", "schemas", "patterns"].map((name) => `tools/format-check/${name}.mjs`);
  for (const file of [...tools, ...contracts, ...format]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  const main = path.join(dir, "tools/contracts/main.mjs");
  const ok = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^contracts-check: ok — 1 \.proto file in 1 package, 4 files of generated code/);
  edit(dir, "contracts/notes.txt", null, "notes\n");
  const failed = spawnSync(process.execPath, [main], { encoding: "utf8" });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /^contracts\/notes\.txt:0: contracts-check does not know it[^]*contracts-check: 1 error\n$/);
  const generate = spawnSync(process.execPath, [path.join(dir, "tools/contracts/generate.mjs")], { encoding: "utf8" });
  assert.equal(generate.status, 1);
  assert.match(generate.stderr, /^contracts: buf generate does not run while contracts-check finds these:/);
});

test("removing every contract after a release is found, though buf cannot run on none", () => {
  const { dir, git } = repository();
  git("tag", "v0.6.4");
  fs.rmSync(path.join(dir, trial));
  writeGenerated(dir);
  git("commit", "--quiet", "--all", "-m", "every contract removed");
  expectEach(dir, /^contracts:0: v0\.6\.4 has 1 \.proto file and contracts\/ has none: a package is never removed/);
});

test("generation clears folders that another file's folder took with it", () => {
  // The Connect code sorts before the rest of its folder: its folders go first, and the files after
  // it find their folder gone.
  const { dir } = repository();
  const folder = path.join(dir, "contracts/novatrail/trial/v1");
  fs.rmSync(path.join(folder, "trial.proto"));
  for (const [from, to] of [["trial.pb.go", "zeta.pb.go"], ["trial_pb.js", "zeta_pb.js"], ["trial_pb.d.ts", "zeta_pb.d.ts"], ["trialv1connect/trial.connect.go", "trialv1connect/zeta.connect.go"]]) {
    fs.renameSync(path.join(folder, from), path.join(folder, to));
  }
  assert.deepEqual(writeGenerated(dir), { written: 0, removed: 4 });
  assert.ok(!fs.existsSync(path.join(dir, "contracts/novatrail")));
});

test("a test vector is of a package that contracts/ has and whose vectors the check runs", () => {
  const { dir } = repository();
  edit(dir, "contracts/vectors/trial/v1/one.json", null, "{}\n");
  edit(dir, "contracts/vectors/learner_model/v1/one.json", null, "{}\n");
  edit(dir, "contracts/vectors/trial/v1/One.json", null, "{}\n");
  edit(dir, "contracts/vectors/notes.txt", null, "notes\n");
  expectEach(
    dir,
    /^contracts\/vectors\/learner_model\/v1\/one\.json:0: a vector of novatrail\.learner_model\.v1, and contracts\/ has no \.proto file of that package$/,
    /^contracts\/vectors\/trial\/v1\/one\.json:0: contracts-check runs no vectors of novatrail\.trial\.v1: the task that brings them extends the check$/,
    /^contracts\/vectors\/trial\/v1\/One\.json:0: a test vector is contracts\/vectors\/<part>\/vN\/<case>\.json/,
    /^contracts\/vectors\/notes\.txt:0: a test vector is contracts\/vectors\/<part>\/vN\/<case>\.json/,
  );
});

test("the observation is checked by its vectors, and has some", () => {
  const { dir } = repository();
  const observation = "contracts/novatrail/observation/v1/observation.proto";
  fs.mkdirSync(path.join(dir, path.dirname(observation)), { recursive: true });
  fs.copyFileSync(path.join(root, observation), path.join(dir, observation));
  fs.cpSync(path.join(root, "format"), path.join(dir, "format"), { recursive: true });
  writeGenerated(dir);
  expectEach(dir, /^contracts\/vectors\/observation\/v1:0: novatrail\.observation\.v1 has no test vectors, and they hold the rules of contracts\/README\.md, section 10$/);
  fs.cpSync(path.join(root, "contracts/vectors"), path.join(dir, "contracts/vectors"), { recursive: true });
  const { errors, stats } = checkContracts(dir);
  assert.deepEqual(errors, []);
  assert.ok(stats.vectors > 0 && stats.cases > stats.vectors, JSON.stringify(stats));
  assert.match(summary(stats), new RegExp(`, ${stats.vectors} files of test vectors with ${stats.cases} cases, `));
  edit(dir, "contracts/vectors/observation/v1/essay.json", '"submission": "unreadable"', '"submission": "assessment"');
  expectEach(dir, /^contracts\/vectors\/observation\/v1\/essay\.json:\d+: case \d+: the submission ends unreadable, not assessment$/);
});

test("spec's own contracts/ passes", () => {
  const { errors, stats } = checkContracts(root);
  assert.deepEqual(errors, []);
  assert.ok(stats.vectors > 0, "spec's vectors of the observation are checked");
});
