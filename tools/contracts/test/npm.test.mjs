// The npm package of the contracts' code: its files, read from the working tree or a commit, its
// package.json with the runtime tools/package.json pins, and its archive, which npm packs and tar
// reads back.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TAR } from "../../shared.mjs";
import { treeOf } from "../../npm-package.mjs";
import { NAME, RUNTIME, archiveOf, checkArchive, manifestOf, packOf, packageOf, runtimeOf, writePackage } from "../npm.mjs";
import { scratchRepository, writeFile } from "../../release/test/repository.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const script = path.join(spec, "tools", "contracts", "npm.mjs");

const scratch = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const listing = (archive) => spawnSync(TAR, ["-tzf", archive], { encoding: "utf8" }).stdout.split("\n").filter(Boolean).sort();
const PINS = { dependencies: { "@bufbuild/protobuf": "2.16.0", "@bufbuild/protoc-gen-es": "2.16.0" } };

// The files a tree of the contracts holds: LICENSE, the README of the package, tools/package.json,
// and the code of two contracts beside their .proto files and the Go code.
const FILES = {
  LICENSE: "license\n",
  "tools/contracts/npm/README.md": "readme\n",
  "tools/package.json": `${JSON.stringify(PINS)}\n`,
  "contracts/README.md": "the contracts\n",
  "contracts/go.mod": "module github.com/altnovatrail/spec/contracts\n",
  "contracts/novatrail/trial/v1/trial.proto": "syntax = \"proto3\";\n",
  "contracts/novatrail/trial/v1/trial.pb.go": "package trialv1\n",
  "contracts/novatrail/trial/v1/trial_pb.js": "export {};\n",
  "contracts/novatrail/trial/v1/trial_pb.d.ts": "export {};\n",
  "contracts/novatrail/place/v2/place_pb.js": "export {};\n",
  "contracts/novatrail/place/v2/place_pb.d.ts": "export {};\n",
};

function tree() {
  const root = scratch("contracts-npm-tree-");
  for (const [file, text] of Object.entries(FILES)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

test("the package holds the code of protoc-gen-es, exports each file by its path, and depends on the runtime", () => {
  assert.equal(NAME, "@altnovatrail/contracts");
  assert.equal(RUNTIME, "@bufbuild/protobuf");
  assert.equal(archiveOf("0.7.0"), "altnovatrail-contracts-0.7.0.tgz");
  const root = tree();
  try {
    const { files, manifest } = packageOf("0.7.3", treeOf(root));
    assert.deepEqual(files.map(({ file, from }) => [file, from]), [
      ["LICENSE", "LICENSE"],
      ["README.md", "tools/contracts/npm/README.md"],
      ["novatrail/place/v2/place_pb.d.ts", "contracts/novatrail/place/v2/place_pb.d.ts"],
      ["novatrail/place/v2/place_pb.js", "contracts/novatrail/place/v2/place_pb.js"],
      ["novatrail/trial/v1/trial_pb.d.ts", "contracts/novatrail/trial/v1/trial_pb.d.ts"],
      ["novatrail/trial/v1/trial_pb.js", "contracts/novatrail/trial/v1/trial_pb.js"],
    ]);
    assert.equal(manifest.name, NAME);
    assert.equal(manifest.version, "0.7.3");
    assert.equal(manifest.license, "Apache-2.0");
    assert.deepEqual(manifest.repository, { type: "git", url: "git+https://github.com/altnovatrail/spec.git" });
    assert.equal(manifest.type, "module");
    assert.deepEqual(manifest.exports, {
      "./novatrail/place/v2/place_pb.js": { types: "./novatrail/place/v2/place_pb.d.ts", default: "./novatrail/place/v2/place_pb.js" },
      "./novatrail/trial/v1/trial_pb.js": { types: "./novatrail/trial/v1/trial_pb.d.ts", default: "./novatrail/trial/v1/trial_pb.js" },
      "./package.json": "./package.json",
    });
    assert.deepEqual(manifest.files, ["novatrail"]);
    assert.equal(manifest.sideEffects, false);
    assert.deepEqual(manifest.dependencies, { "@bufbuild/protobuf": "2.16.0" });
    for (const field of ["main", "scripts", "private", "publishConfig", "devDependencies", "peerDependencies"]) assert.equal(manifest[field], undefined, field);
    for (const version of ["", "v0.7.0", "0.7"]) assert.throws(() => packageOf(version, treeOf(root)), /is not MAJOR\.MINOR\.PATCH/, version);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the runtime is pinned exactly, at the version of the plugin that writes the code", () => {
  const tree = (pins) => ({ read: () => Buffer.from(JSON.stringify(pins)) });
  assert.equal(runtimeOf(tree(PINS)), "2.16.0");
  assert.throws(() => runtimeOf(tree({ dependencies: { "@bufbuild/protoc-gen-es": "2.16.0" } })), /pins @bufbuild\/protobuf at undefined, not at an exact version/);
  assert.throws(() => runtimeOf(tree({ dependencies: { "@bufbuild/protobuf": "^2.16.0", "@bufbuild/protoc-gen-es": "2.16.0" } })), /at "\^2\.16\.0", not at an exact version/);
  assert.throws(() => runtimeOf(tree({ dependencies: { "@bufbuild/protobuf": "2.16.0", "@bufbuild/protoc-gen-es": "2.17.0" } })), /pins @bufbuild\/protobuf at 2\.16\.0 and @bufbuild\/protoc-gen-es at "2\.17\.0": the code is written for the runtime of the plugin's own version/);
  assert.throws(() => runtimeOf({ read: () => Buffer.from("{") }), /tools\/package\.json does not say which @bufbuild\/protobuf the code needs/);
  assert.throws(() => manifestOf("0.7.0", ["novatrail/trial/v1/trial_pb.js"], "2.16.0"), /trial_pb\.js has no declarations beside it, contracts\/novatrail\/trial\/v1\/trial_pb\.d\.ts: run just contracts/);
});

test("the package is written of the working tree, and a tree with no code has no package", () => {
  const root = tree();
  try {
    writePackage(root, "0.7.0", path.join(root, "out"));
    assert.equal(fs.readFileSync(path.join(root, "out", "novatrail/trial/v1/trial_pb.js"), "utf8"), "export {};\n");
    assert.equal(fs.existsSync(path.join(root, "out", "novatrail/trial/v1/trial.pb.go")), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "out", "package.json"), "utf8")), packageOf("0.7.0", treeOf(root)).manifest);
    fs.rmSync(path.join(root, "tools/contracts/npm/README.md"));
    assert.throws(() => writePackage(root, "0.7.0", path.join(root, "unread")), /tools\/contracts\/npm\/README\.md is no file of [^:]*$/);
    fs.rmSync(path.join(root, "contracts/novatrail"), { recursive: true });
    assert.throws(() => writePackage(root, "0.7.0", path.join(root, "none")), /contracts\/ holds no code of protoc-gen-es/);
    fs.rmSync(path.join(root, "contracts"), { recursive: true });
    assert.throws(() => writePackage(root, "0.7.0", path.join(root, "nothing")), /contracts\/ holds no code of protoc-gen-es/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the package is written of a commit's objects, not of the working tree", () => {
  const { dir, git } = scratchRepository("contracts-npm-commit-");
  try {
    for (const [file, text] of Object.entries(FILES)) writeFile(dir, git, file, `${text.trimEnd()} at the commit\n`);
    writeFile(dir, git, "tools/package.json", `${JSON.stringify(PINS)}\n`);
    git("commit", "--quiet", "-m", "the contracts");
    const commit = git("rev-parse", "HEAD");
    fs.writeFileSync(path.join(dir, "contracts/novatrail/trial/v1/trial_pb.js"), "changed since\n");
    fs.writeFileSync(path.join(dir, "contracts/novatrail/trial/v1/later_pb.js"), "export {};\n");
    writePackage(dir, "0.7.0", path.join(dir, "out"), commit);
    assert.equal(fs.readFileSync(path.join(dir, "out", "novatrail/trial/v1/trial_pb.js"), "utf8"), "export {}; at the commit\n");
    assert.equal(fs.existsSync(path.join(dir, "out", "novatrail/trial/v1/later_pb.js")), false);
    assert.throws(() => writePackage(dir, "0.7.0", path.join(dir, "nowhere"), "no-such-commit"), /git -C .* ls-tree .* failed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("npm packs the package, and the archive is read back", () => {
  const root = tree();
  const dir = scratch("contracts-npm-pack-");
  try {
    const archive = packOf(root, "0.7.0", dir);
    assert.equal(archive, path.join(dir, "altnovatrail-contracts-0.7.0.tgz"));
    assert.deepEqual(listing(archive), [
      "package/LICENSE",
      "package/README.md",
      "package/novatrail/place/v2/place_pb.d.ts",
      "package/novatrail/place/v2/place_pb.js",
      "package/novatrail/trial/v1/trial_pb.d.ts",
      "package/novatrail/trial/v1/trial_pb.js",
      "package/package.json",
    ]);
    checkArchive(archive, root, "0.7.0");
    assert.throws(() => checkArchive(archive, root, "0.7.1"), /the package\.json of altnovatrail-contracts-0\.7\.0\.tgz is not the one of @altnovatrail\/contracts@0\.7\.1/);
    fs.writeFileSync(path.join(root, "contracts/novatrail/trial/v1/more_pb.js"), "export {};\n");
    fs.writeFileSync(path.join(root, "contracts/novatrail/trial/v1/more_pb.d.ts"), "export {};\n");
    assert.throws(() => checkArchive(archive, root, "0.7.0"), /altnovatrail-contracts-0\.7\.0\.tgz holds \[.*\], not \[.*more_pb\.js/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the script packs spec's own package and prints the archive's path, or says why not", () => {
  const dir = scratch("contracts-npm-script-");
  try {
    const packed = spawnSync(process.execPath, [script, spec, "0.0.0", dir], { encoding: "utf8" });
    assert.equal(packed.status, 0, packed.stderr);
    assert.equal(packed.stdout, `${path.join(dir, "altnovatrail-contracts-0.0.0.tgz")}\n`);
    assert.ok(listing(packed.stdout.trim()).includes("package/novatrail/observation/v1/observation_pb.js"));
    const refused = spawnSync(process.execPath, [script, spec, "v0.0.0", dir], { encoding: "utf8" });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /^npm: the version 'v0\.0\.0' is not MAJOR\.MINOR\.PATCH/);
    const usage = spawnSync(process.execPath, [script, spec], { encoding: "utf8" });
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /^usage: node tools\/contracts\/npm\.mjs <root> <version> <folder> \[<commit>\]/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
