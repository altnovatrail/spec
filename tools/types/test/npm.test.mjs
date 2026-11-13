// The npm package of the types: its package.json and its files, by the line of its version, of the
// working tree or of a commit, and its archive, which npm packs and tar reads back.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TAR } from "../../shared.mjs";
import { EXPORT_V2_LINE, FIRST_ADMISSION_LINE, FIRST_CANVAS_LINE, FIRST_CONSENT_AGE_LINE, FIRST_DEPLOYMENT_LINE, FIRST_EXPORT_LINE, FIRST_LEGAL_LINE, LEGAL_V2_LINE, LEGAL_V3_LINE, FIRST_PAGE_LINE, NAME, archiveOf, checkArchive, filesOf, manifestOf, packOf, writePackage } from "../npm.mjs";
import { treeOf } from "../../npm-package.mjs";
import { scratchRepository, writeFile } from "../../release/test/repository.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const script = path.join(spec, "tools", "types", "npm.mjs");

const scratch = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

// The package's files of the newest line, which holds those of every earlier one.
const FILES = filesOf("99.0.0");

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
  assert.deepEqual(manifest.files, ["formatv0"]);
  assert.doesNotMatch(manifest.description, /novatrail-canvas/);
  for (const field of ["main", "scripts", "dependencies", "private", "publishConfig"]) assert.equal(manifest[field], undefined, field);
  const format = [
    ["LICENSE", "LICENSE"],
    ["README.md", "tools/types/npm/README.md"],
    ["formatv0/index.d.ts", "types/formatv0/index.d.ts"],
    ["formatv0/open/index.d.ts", "types/formatv0/open/index.d.ts"],
  ];
  assert.deepEqual(filesOf("0.4.12").map(({ file, from }) => [file, from]), format);
  for (const version of ["0.0.0", "0.4.0"]) assert.deepEqual(filesOf(version).map(({ file }) => file), format.map(([file]) => file), version);
  for (const version of ["", "0.4"]) assert.throws(() => filesOf(version), /is not MAJOR\.MINOR\.PATCH/, version);
});

test("from the line 0.8 on, the package holds and exports the types of the admission table too", () => {
  assert.equal(FIRST_ADMISSION_LINE, "0.8");
  for (const version of ["0.8.0", "0.9.15"]) {
    assert.deepEqual(filesOf(version).slice(-2), [{ file: "canvas/index.d.ts", from: "types/canvas/index.d.ts" }, { file: "admissionv0/index.d.ts", from: "types/admissionv0/index.d.ts" }], version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.exports, {
      "./formatv0": { types: "./formatv0/index.d.ts" },
      "./formatv0/open": { types: "./formatv0/open/index.d.ts" },
      "./canvas": { types: "./canvas/index.d.ts" },
      "./admissionv0": { types: "./admissionv0/index.d.ts" },
      "./package.json": "./package.json",
    });
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0"]);
    assert.match(manifest.description, /<novatrail-canvas>, the contract of the canvas and the app\. And the types of the admission table, /);
  }
  assert.doesNotMatch(manifestOf("0.7.9").description, /admission/);
});

// T88: canvas lays its page out by the numbers and widths of format 0.4, from this package.
test("from the line 0.10 on, the package holds the page of the workbook and its vectors, as JSON", () => {
  assert.equal(FIRST_PAGE_LINE, "0.10");
  const tree = treeOf(spec);
  for (const version of ["0.10.0", "0.10.7"]) {
    const files = filesOf(version, tree);
    const page = files.filter(({ file }) => file.startsWith("format/"));
    assert.deepEqual(page[0], { file: "format/page.json", from: "types/page/page.json" });
    assert.equal(page.length, 1 + fs.readdirSync(path.join(spec, "format", "vectors", "pages")).length, version);
    assert.deepEqual(page[1], { file: "format/vectors/pages/eleven-long.json", from: "types/page/vectors/eleven-long.json" });
    assert.equal(JSON.parse(fs.readFileSync(path.join(spec, "types", "page", "page.json"), "utf8")).numbers.size, 30);
    const manifest = manifestOf(version);
    assert.equal(manifest.exports["./format/page.json"], "./format/page.json");
    assert.equal(manifest.exports["./format/vectors/pages/*.json"], "./format/vectors/pages/*.json");
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0", "format"]);
    // The types of the lines before stay as they were.
    assert.deepEqual(files.slice(4, 6), [{ file: "canvas/index.d.ts", from: "types/canvas/index.d.ts" }, { file: "admissionv0/index.d.ts", from: "types/admissionv0/index.d.ts" }], version);
    assert.deepEqual(Object.keys(manifest.exports), ["./formatv0", "./formatv0/open", "./canvas", "./admissionv0", "./format/page.json", "./format/vectors/pages/*.json", "./package.json"]);
    assert.match(manifest.description, /the numbers and widths of the workbook's page and its test vectors, as JSON/);
  }
  // Without a tree, the vectors are not listed.
  assert.deepEqual(filesOf("0.10.0").filter(({ file }) => file.startsWith("format/")).map(({ file }) => file), ["format/page.json"]);
  assert.doesNotMatch(manifestOf("0.9.15").description, /page/);
});

test("from the line 0.11 on, the package holds and exports the types of the deployment configuration too", () => {
  assert.equal(FIRST_DEPLOYMENT_LINE, "0.11");
  const tree = treeOf(spec);
  for (const version of ["0.11.0", "0.12.4"]) {
    const files = filesOf(version, tree);
    assert.deepEqual(files.at(-1), { file: "deploymentv1/index.d.ts", from: "types/deploymentv1/index.d.ts" }, version);
    // The types and the page of the lines before stay as they were.
    assert.deepEqual(files.slice(4, 7), [{ file: "canvas/index.d.ts", from: "types/canvas/index.d.ts" }, { file: "admissionv0/index.d.ts", from: "types/admissionv0/index.d.ts" }, { file: "format/page.json", from: "types/page/page.json" }], version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0", "format", "deploymentv1"]);
    assert.deepEqual(Object.keys(manifest.exports), ["./formatv0", "./formatv0/open", "./canvas", "./admissionv0", "./format/page.json", "./format/vectors/pages/*.json", "./deploymentv1", "./package.json"]);
    assert.deepEqual(manifest.exports["./deploymentv1"], { types: "./deploymentv1/index.d.ts" });
    assert.match(manifest.description, /And the types of the deployment configuration, the file \/deployment\.json that the app reads at its start\.$/);
  }
  assert.ok(!filesOf("0.10.7", tree).some(({ file }) => file.startsWith("deploymentv1/")));
  assert.doesNotMatch(manifestOf("0.10.7").description, /deployment/);
});

test("from the line 0.13 on, the package holds and exports the types of the legal texts too", () => {
  assert.equal(FIRST_LEGAL_LINE, "0.13");
  const tree = treeOf(spec);
  for (const version of ["0.13.0", "0.13.9"]) {
    const files = filesOf(version, tree);
    assert.deepEqual(files.slice(-2), [{ file: "deploymentv1/index.d.ts", from: "types/deploymentv1/index.d.ts" }, { file: "legalv1/index.d.ts", from: "types/legalv1/index.d.ts" }], version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0", "format", "deploymentv1", "legalv1"]);
    assert.deepEqual(Object.keys(manifest.exports), ["./formatv0", "./formatv0/open", "./canvas", "./admissionv0", "./format/page.json", "./format/vectors/pages/*.json", "./deploymentv1", "./legalv1", "./package.json"]);
    assert.deepEqual(manifest.exports["./legalv1"], { types: "./legalv1/index.d.ts" });
    assert.match(manifest.description, /And the types of the deployment configuration, the file \/deployment\.json that the app reads at its start\. And the types of the legal texts' passport, which names each text, its versions and the sets of texts of the samples page\.$/);
  }
  assert.ok(!filesOf("0.12.4", tree).some(({ file }) => file.startsWith("legalv1/")));
  assert.doesNotMatch(manifestOf("0.12.4").description, /legal/);
});

test("from the line 0.14 on, the package holds and exports the types of the table of the age of digital consent too", () => {
  assert.equal(FIRST_CONSENT_AGE_LINE, "0.14");
  assert.equal(FIRST_EXPORT_LINE, "0.14");
  const tree = treeOf(spec);
  for (const version of ["0.14.0", "0.14.9"]) {
    const files = filesOf(version, tree);
    assert.deepEqual(files.slice(-2), [{ file: "consentagev1/index.d.ts", from: "types/consentagev1/index.d.ts" }, { file: "exportv1/index.d.ts", from: "types/exportv1/index.d.ts" }], version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0", "format", "deploymentv1", "legalv1", "consentagev1", "exportv1"]);
    assert.deepEqual(Object.keys(manifest.exports), ["./formatv0", "./formatv0/open", "./canvas", "./admissionv0", "./format/page.json", "./format/vectors/pages/*.json", "./deploymentv1", "./legalv1", "./consentagev1", "./exportv1", "./package.json"]);
    assert.deepEqual(manifest.exports["./consentagev1"], { types: "./consentagev1/index.d.ts" });
    assert.deepEqual(manifest.exports["./exportv1"], { types: "./exportv1/index.d.ts" });
    assert.match(manifest.description, /And the types of the table of the age of digital consent, which gives each country's age with the law that sets it\. And the types of the files of an export, the file the owner of an account gets of a profile or of the account\.$/);
  }
  assert.ok(!filesOf("0.13.4", tree).some(({ file }) => file.startsWith("consentagev1/")));
  assert.doesNotMatch(manifestOf("0.13.4").description, /digital consent/);
});

test("from the line 0.15 on, the package holds and exports the types of the legal texts' version 2, legalv2, in place of legalv1", () => {
  assert.equal(LEGAL_V2_LINE, "0.15");
  const tree = treeOf(spec);
  for (const version of ["0.15.0", "0.16.9"]) {
    const files = filesOf(version, tree);
    assert.ok(files.some(({ file, from }) => file === "legalv2/index.d.ts" && from === "types/legalv2/index.d.ts"), version);
    assert.ok(!files.some(({ file }) => file.startsWith("legalv1/")), version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0", "format", "deploymentv1", "legalv2", "consentagev1", "exportv1"]);
    assert.deepEqual(manifest.exports["./legalv2"], { types: "./legalv2/index.d.ts" });
    assert.equal(manifest.exports["./legalv1"], undefined);
  }
  // A release of the line 0.14, run again, gets the package it got: legalv1.
  assert.ok(filesOf("0.14.9", tree).some(({ file }) => file === "legalv1/index.d.ts"));
});

test("from the line 0.17 on, the package holds and exports the types of the legal texts' version 3, legalv3, in place of legalv2", () => {
  assert.equal(LEGAL_V3_LINE, "0.17");
  const tree = treeOf(spec);
  for (const version of ["0.17.0", "1.0.0"]) {
    const files = filesOf(version, tree);
    assert.ok(files.some(({ file, from }) => file === "legalv3/index.d.ts" && from === "types/legalv3/index.d.ts"), version);
    assert.ok(!files.some(({ file }) => file.startsWith("legalv2/") || file.startsWith("legalv1/")), version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.files, ["formatv0", "canvas", "admissionv0", "format", "deploymentv1", "legalv3", "consentagev1", "exportv2"]);
    assert.deepEqual(manifest.exports["./legalv3"], { types: "./legalv3/index.d.ts" });
    assert.equal(manifest.exports["./legalv2"], undefined);
  }
});

test("from the line 0.17 on, the package holds and exports the types of the export's version 2, exportv2, in place of exportv1", () => {
  assert.equal(EXPORT_V2_LINE, "0.17");
  const tree = treeOf(spec);
  for (const version of ["0.17.0", "1.0.0"]) {
    const files = filesOf(version, tree);
    assert.deepEqual(files.at(-1), { file: "exportv2/index.d.ts", from: "types/exportv2/index.d.ts" }, version);
    assert.ok(!files.some(({ file }) => file.startsWith("exportv1/")), version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.exports["./exportv2"], { types: "./exportv2/index.d.ts" });
    assert.equal(manifest.exports["./exportv1"], undefined);
  }
  // A release of the line 0.16, run again, gets the package it got: exportv1.
  assert.deepEqual(filesOf("0.16.9", tree).at(-1), { file: "exportv1/index.d.ts", from: "types/exportv1/index.d.ts" });
  assert.equal(manifestOf("0.16.9").files.at(-1), "exportv1");
});

test("from the line 0.5 on, the package holds and exports the types of <novatrail-canvas> too", () => {
  assert.equal(FIRST_CANVAS_LINE, "0.5");
  const canvas = ["canvas/index.d.ts", "types/canvas/index.d.ts"];
  for (const version of ["0.5.0", "0.7.9"]) {
    assert.deepEqual(filesOf(version).at(-1), { file: canvas[0], from: canvas[1] }, version);
    const manifest = manifestOf(version);
    assert.deepEqual(manifest.exports, {
      "./formatv0": { types: "./formatv0/index.d.ts" },
      "./formatv0/open": { types: "./formatv0/open/index.d.ts" },
      "./canvas": { types: "./canvas/index.d.ts" },
      "./package.json": "./package.json",
    });
    assert.deepEqual(manifest.files, ["formatv0", "canvas"]);
    assert.match(manifest.description, /^The types of NovaTrail's module format .* And the types of the element <novatrail-canvas>/);
  }
  // A package of the line 0.4 is the one its releases got: the package.json of the archive of
  // v0.4.1, as npm holds it, field for field and in its order.
  assert.equal(
    JSON.stringify(manifestOf("0.4.1"), null, 2),
    JSON.stringify(
      {
        name: "@altnovatrail/spec",
        version: "0.4.1",
        description: "The types of NovaTrail's module format for TypeScript, generated from its schemas: the parts of a module and their open views, the canonical view, the inventory, the module index and the test vectors.",
        license: "Apache-2.0",
        repository: { type: "git", url: "git+https://github.com/altnovatrail/spec.git" },
        type: "module",
        exports: {
          "./formatv0": { types: "./formatv0/index.d.ts" },
          "./formatv0/open": { types: "./formatv0/open/index.d.ts" },
          "./package.json": "./package.json",
        },
        files: ["formatv0"],
        sideEffects: false,
      },
      null,
      2,
    ),
  );
  assert.equal(filesOf("0.4.9").length, filesOf("0.5.0").length - 1);
  for (const version of ["", "v0.4.0", "0.4", "0.04.0", "0.4.0-rc.1"]) assert.throws(() => archiveOf(version), /is not MAJOR\.MINOR\.PATCH/, version);
});

test("the package is written of the working tree, of files alone", () => {
  const root = tree();
  try {
    writePackage(root, "1.2.3", path.join(root, "out"));
    for (const { file, from } of FILES) assert.equal(fs.readFileSync(path.join(root, "out", file), "utf8"), `${from}\n`);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "out", "package.json"), "utf8")), manifestOf("1.2.3"));
    // The package of an earlier line leaves the types of <novatrail-canvas> out.
    writePackage(root, "0.4.3", path.join(root, "earlier"));
    assert.equal(fs.existsSync(path.join(root, "earlier", "canvas")), false);
    assert.equal(fs.readFileSync(path.join(root, "earlier", "formatv0/index.d.ts"), "utf8"), "types/formatv0/index.d.ts\n");
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
    // A commit of the line 0.4, which has no types of <novatrail-canvas>: its package is the one
    // its line holds, and the package of a later line is no package of it.
    for (const { from } of filesOf("0.4.0")) writeFile(dir, git, from, `${from} at the commit\n`);
    git("commit", "--quiet", "-m", "the package's files");
    const earlier = git("rev-parse", "HEAD");
    writePackage(dir, "0.4.0", path.join(dir, "earlier"), earlier);
    assert.throws(() => writePackage(dir, "0.5.0", path.join(dir, "later"), earlier), /types\/canvas\/index\.d\.ts is no file of [0-9a-f]{40}/);
    writeFile(dir, git, "types/canvas/index.d.ts", "types/canvas/index.d.ts at the commit\n");
    git("commit", "--quiet", "-m", "the types of the element");
    const commit = git("rev-parse", "HEAD");
    writePackage(dir, "0.5.0", path.join(dir, "later"), commit);
    assert.equal(fs.readFileSync(path.join(dir, "later", "canvas/index.d.ts"), "utf8"), "types/canvas/index.d.ts at the commit\n");
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
    const later = packOf(root, "0.5.0", dir);
    assert.deepEqual(listing(later), ["package/LICENSE", "package/README.md", "package/canvas/index.d.ts", "package/formatv0/index.d.ts", "package/formatv0/open/index.d.ts", "package/package.json"]);
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
    const archiveWith = (name, extra, manifest, version = "0.4.0") => {
      const folder = path.join(dir, name, "package");
      for (const { file } of filesOf(version)) {
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
    // A package of the line 0.5 holds the types of <novatrail-canvas>; one of 0.4 that does is refused.
    checkArchive(archiveWith("later", null, manifestOf("0.5.0"), "0.5.0"), "0.5.0");
    assert.throws(() => checkArchive(archiveWith("lacking", null, manifestOf("0.5.0")), "0.5.0"), /lacking\.tgz holds \[.*\], not \[.*package\/canvas\/index\.d\.ts/);
    assert.throws(() => checkArchive(archiveWith("early", null, manifestOf("0.4.0"), "0.5.0"), "0.4.0"), /early\.tgz holds \[.*package\/canvas\/index\.d\.ts.*\], not \[/);
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
