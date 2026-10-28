// The files of spec's release of a commit: which, by the line and format/VERSION, and how
// release-files builds them, in made-up copies of spec.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { formatVersion, releaseFiles } from "../files.mjs";
import { FIRST_FILES_LINE, compareLines } from "../version.mjs";
import { TAR } from "../../shared.mjs";
import { copySpecTools, env, recipe, releaseLine, root, scratchRepository, writeFile } from "./repository.mjs";

const script = path.join(root, "tools", "release", "files.mjs");

test("from the line 0.3 on, a release carries the format as one file, named by its version", () => {
  assert.equal(FIRST_FILES_LINE, "0.3");
  assert.deepEqual(releaseFiles("0.3", "0.1\n"), [{ name: "format-0.1.tar.gz", path: "format" }]);
  assert.deepEqual(releaseFiles("2.10", "2.4\n"), [{ name: "format-2.4.tar.gz", path: "format" }]);
  // A release of an earlier line carries none, and its commit need not have a VERSION.
  assert.deepEqual(releaseFiles("0.2", ""), []);
  assert.deepEqual(releaseFiles("0.2", "0.1\n"), []);
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

    // A new version of the format names a new file.
    writeFile(dir, git, "format/VERSION", "0.2\n");
    releaseLine(dir, git, "0.4");
    git("commit", "--quiet", "-m", "a new version of the format, in a new line");
    const next = recipe(dir, { name: "release-files", args: ["HEAD", "next"] });
    assert.equal(next.status, 0, next.stderr);
    assert.deepEqual(fs.readdirSync(path.join(dir, "next")), ["format-0.2.tar.gz"]);
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
