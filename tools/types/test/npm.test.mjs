// The npm package of the types: its package.json, its files of the working tree or of a commit,
// and its archive, which npm packs and tar reads back.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TAR } from "../../shared.mjs";
import { FILES, NAME, archiveOf, checkArchive, manifestOf, packOf, writePackage } from "../npm.mjs";
import { scratchRepository, writeFile } from "../../release/test/repository.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const script = path.join(spec, "tools", "types", "npm.mjs");

const scratch = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

// A tree that holds the package's files, each with its own text.
function tree() {
  const root = scratch("types-npm-tree-");
  for (const { from } of FILES) {
    fs.mkdirSync(path.dirname(path.join(root, from)), { recursive: true });
    fs.writeFileSync(path.join(root, from), `${from}\n`);
  }
  return root;
}

const listing = (archive) => spawnSync(TAR, ["-tzf", archive], { encoding: "utf8" }).stdout.split("\n").filter(Boolean).sort();

test("the package is named and versioned as the release, and exports each package of the types", () => {
  assert.equal(NAME, "@altnovatrail/spec");
  assert.equal(archiveOf("0.4.0"), "altnovatrail-spec-0.4.0.tgz");
  const manifest = manifestOf("0.4.12");
  assert.equal(manifest.version, "0.4.12");
  assert.equal(manifest.license, "Apache-2.0");
  assert.deepEqual(manifest.repository, { type: "git", url: "git+https://github.com/altnovatrail/spec.git" });
  assert.equal(manifest.type, "module");
  assert.deepEqual(manifest.exports, {
    "./formatv0": { types: "./formatv0/index.d.ts" },
    "./formatv0/open": { types: "./formatv0/open/index.d.ts" },
    "./package.json": "./package.json",
  });
  for (const field of ["main", "scripts", "dependencies", "private", "publishConfig"]) assert.equal(manifest[field], undefined, field);
  assert.deepEqual(
    FILES.map(({ file, from }) => [file, from]),
    [
      ["LICENSE", "LICENSE"],
      ["README.md", "tools/types/npm/README.md"],
      ["formatv0/index.d.ts", "types/formatv0/index.d.ts"],
      ["formatv0/open/index.d.ts", "types/formatv0/open/index.d.ts"],
    ],
  );
  for (const version of ["", "v0.4.0", "0.4", "0.04.0", "0.4.0-rc.1"]) assert.throws(() => archiveOf(version), /is not MAJOR\.MINOR\.PATCH/, version);
});

test("the package is written of the working tree, of files alone", () => {
  const root = tree();
  try {
    writePackage(root, "1.2.3", path.join(root, "out"));
    for (const { file, from } of FILES) assert.equal(fs.readFileSync(path.join(root, "out", file), "utf8"), `${from}\n`);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "out", "package.json"), "utf8")), manifestOf("1.2.3"));
    assert.throws(() => writePackage(root, "1.2.3", path.join(root, "out")), /out is there already/);
    fs.rmSync(path.join(root, "types/formatv0/index.d.ts"));
    fs.symlinkSync("../../LICENSE", path.join(root, "types/formatv0/index.d.ts"));
    assert.throws(() => writePackage(root, "1.2.3", path.join(root, "linked")), /types\/formatv0\/index\.d\.ts is no file of .*: run just types/);
    assert.equal(fs.existsSync(path.join(root, "linked")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the package is written of a commit's objects, not of the working tree", () => {
  const { dir, git } = scratchRepository("types-npm-commit-");
  try {
    for (const { from } of FILES) writeFile(dir, git, from, `${from} at the commit\n`);
    git("commit", "--quiet", "-m", "the package's files");
    const commit = git("rev-parse", "HEAD");
    fs.writeFileSync(path.join(dir, "LICENSE"), "changed since\n");
    writePackage(dir, "0.4.0", path.join(dir, "out"), commit);
    assert.equal(fs.readFileSync(path.join(dir, "out", "LICENSE"), "utf8"), "LICENSE at the commit\n");
    assert.equal(fs.readFileSync(path.join(dir, "out", "formatv0/open/index.d.ts"), "utf8"), "types/formatv0/open/index.d.ts at the commit\n");

    git("rm", "--quiet", "tools/types/npm/README.md");
    fs.mkdirSync(path.join(dir, "tools/types/npm"), { recursive: true });
    fs.symlinkSync("../../../LICENSE", path.join(dir, "tools/types/npm/README.md"));
    git("add", "--all");
    git("commit", "--quiet", "-m", "a link in the place of a file");
    assert.throws(() => writePackage(dir, "0.4.0", path.join(dir, "linked"), "HEAD"), /tools\/types\/npm\/README\.md is no file of HEAD/);
    git("rm", "--quiet", "tools/types/npm/README.md");
    git("commit", "--quiet", "-m", "no README");
    assert.throws(() => writePackage(dir, "0.4.0", path.join(dir, "missing"), "HEAD"), /tools\/types\/npm\/README\.md is no file of HEAD/);
    assert.throws(() => writePackage(dir, "0.4.0", path.join(dir, "nowhere"), "no-such-commit"), /git -C .* ls-tree .* failed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("npm packs the package, and the archive is read back", () => {
  const root = tree();
  const dir = scratch("types-npm-pack-");
  try {
    const archive = packOf(root, "0.4.0", dir);
    assert.equal(archive, path.join(dir, "altnovatrail-spec-0.4.0.tgz"));
    assert.deepEqual(listing(archive), ["package/LICENSE", "package/README.md", "package/formatv0/index.d.ts", "package/formatv0/open/index.d.ts", "package/package.json"]);
    assert.throws(() => packOf(root, "0.4.0", dir), /altnovatrail-spec-0\.4\.0\.tgz is there already/);

    // An npm that fails is named, and its work folder goes.
    const failing = path.join(dir, "npm-cli.js");
    fs.writeFileSync(failing, "process.stderr.write('no registry here\\n'); process.exit(1);\n");
    assert.throws(() => packOf(root, "0.4.1", dir, undefined, failing), /npm pack failed: no registry here/);
    assert.equal(fs.existsSync(path.join(dir, "altnovatrail-spec-0.4.1.tgz")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an archive with a file too many, or with another package.json, is refused", () => {
  const dir = scratch("types-npm-archive-");
  try {
    const archiveWith = (name, extra, manifest) => {
      const folder = path.join(dir, name, "package");
      for (const { file } of FILES) {
        fs.mkdirSync(path.dirname(path.join(folder, file)), { recursive: true });
        fs.writeFileSync(path.join(folder, file), "a\n");
      }
      fs.writeFileSync(path.join(folder, "package.json"), JSON.stringify(manifest));
      if (extra) fs.writeFileSync(path.join(folder, extra), "b\n");
      const archive = path.join(dir, `${name}.tgz`);
      const packed = spawnSync(TAR, ["-czf", archive, "-C", path.join(dir, name), "package"], { encoding: "utf8" });
      assert.equal(packed.status, 0, packed.stderr);
      return archive;
    };
    checkArchive(archiveWith("right", null, manifestOf("0.4.0")), "0.4.0");
    assert.throws(() => checkArchive(archiveWith("extra", "index.js", manifestOf("0.4.0")), "0.4.0"), /extra\.tgz holds \[.*package\/index\.js.*\], not \[/);
    assert.throws(() => checkArchive(archiveWith("other", null, manifestOf("0.4.1")), "0.4.0"), /the package\.json of other\.tgz is not the one of @altnovatrail\/spec@0\.4\.0/);
    assert.throws(() => checkArchive(path.join(dir, "none.tgz"), "0.4.0"), /tar .* failed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the script packs spec's own package and prints the archive's path, or says why not", () => {
  const dir = scratch("types-npm-script-");
  try {
    const packed = spawnSync(process.execPath, [script, spec, "0.0.0", dir], { encoding: "utf8" });
    assert.equal(packed.status, 0, packed.stderr);
    assert.equal(packed.stdout, `${path.join(dir, "altnovatrail-spec-0.0.0.tgz")}\n`);
    const refused = spawnSync(process.execPath, [script, spec, "v0.0.0", dir], { encoding: "utf8" });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /^npm: the version 'v0\.0\.0' is not MAJOR\.MINOR\.PATCH/);
    const usage = spawnSync(process.execPath, [script, spec], { encoding: "utf8" });
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /^usage: node tools\/types\/npm\.mjs <root> <version> <folder> \[<commit>\]/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
