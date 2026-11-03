// sample-check, as another repository runs it: `just -f spec/justfile sample-check <file>…` from
// its root, here a made-up repository in a temporary directory with copies of spec's examples. buf
// is the toolchain stage's, and the image it builds is of spec's own contracts/.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { root } from "../../release/test/repository.mjs";
import { checkSampleFiles } from "../main.mjs";
import { FOLDER } from "../sample.mjs";

const justfile = path.join(root, "justfile");
const main = path.join(root, "tools/contracts/main.mjs");
const examples = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`);
const example = (name) => JSON.parse(fs.readFileSync(path.join(root, FOLDER, `${name}.json`), "utf8"));
const textOf = (value) => `${JSON.stringify(value, null, 2)}\n`;
const lineOf = (text, key) => text.split("\n").findIndex((line) => line.trimStart().startsWith(`"${key}":`)) + 1;

// A repository of its own in a temporary directory, with the given files — a text, or { link } to
// where a link of that name leads —, and run(dir) in it.
function withRepository(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sample-check-"));
  try {
    for (const [name, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      if (typeof text === "string") fs.writeFileSync(path.join(dir, name), text);
      else fs.symlinkSync(text.link, path.join(dir, name));
    }
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const recipe = (files, args) => withRepository(files, (dir) => spawnSync(process.env.JUST ?? "just", ["-f", justfile, "sample-check", ...args], { cwd: dir, encoding: "utf8" }));
const command = (files, args) => withRepository(files, (dir) => spawnSync(process.execPath, [main, ...args], { cwd: dir, encoding: "utf8" }));

const evalSet = textOf(example("sheet-eval-set"));
const good = {
  "eval/sheet eval set.json": evalSet,
  "eval/measurement.json": textOf(example("sheet-measurement")),
  "eval/workbook.json": textOf(example("workbook-child")),
};

test("sample-check passes the samples a repository names, by their paths from its root", () => {
  const run = recipe(good, Object.keys(good));
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(run.stdout, "sample-check: ok — 3 samples\n");
  // A link that stays in the repository is read where it leads, and a file named twice once.
  const linked = recipe({ ...good, "samples/eval.json": { link: "../eval/workbook.json" } }, ["samples/eval.json", "eval/workbook.json", "./eval/workbook.json"]);
  assert.equal(linked.status, 0, linked.stdout + linked.stderr);
  assert.equal(linked.stdout, "sample-check: ok — 1 sample\n");
});

test("sample-check names the file and the line of each rule a sample breaks", () => {
  const bad = textOf({ ...example("sheet-eval-set"), license: "MIT" });
  const extra = textOf({ ...example("sheet-eval-set"), device: "tablet" });
  const run = recipe({ "eval/good.json": evalSet, "eval/bad.json": bad, "eval/extra.json": extra }, ["eval/good.json", "eval/bad.json", "eval/extra.json"]);
  assert.equal(run.status, 1, run.stdout + run.stderr);
  assert.match(run.stdout, new RegExp(`^eval/bad\\.json:${lineOf(bad, "license")}: a sample of an eval set names its license, "Apache-2\\.0"$`, "m"));
  assert.match(run.stdout, /^eval\/extra\.json:1: it does not read as novatrail\.eval\.v1\.Sample: .*"device"/m);
  assert.doesNotMatch(run.stdout, /^eval\/good\.json:/m);
  assert.match(run.stdout, /\nsample-check: 2 errors\n$/);
  const twice = recipe({ "eval/bad.json": bad }, ["eval/bad.json", "eval//bad.json"]);
  assert.equal(twice.stdout, `eval/bad.json:${lineOf(bad, "license")}: a sample of an eval set names its license, "Apache-2.0"\nsample-check: 1 error\n`);
});

test("sample-check reads files of the repository alone, and stops before buf on a path it cannot check", () => {
  for (const [args, pattern] of [
    [["../sample.json"], /^sample-check: \.\.\/sample\.json: not a file of the repository the check runs in, /m],
    [[path.join(root, examples[0])], /: not a file of the repository the check runs in, /],
    [["."], /^sample-check: \.: not a file of the repository the check runs in, /m],
    [["eval"], /^sample-check: eval: not a file; name the sample files themselves$/m],
    [["eval/none.json"], /^sample-check: eval\/none\.json: there is no such file$/m],
    [["eval/out.json"], /^sample-check: eval\/out\.json: a link that leads out of the repository the check runs in, /m],
    [[], /^sample-check: name the sample files to check$/m],
    [["eval/measurement.json", "../sample.json"], /^sample-check: \.\.\/sample\.json: not a file of the repository/m],
  ]) {
    const run = recipe({ ...good, "eval/out.json": { link: path.join(root, examples[0]) } }, args);
    assert.equal(run.status, 2, `${args}: ${run.stdout}${run.stderr}`);
    assert.match(run.stderr, pattern, args.join(" "));
    assert.equal(run.stdout, "", args.join(" "));
  }
});

test("the command takes --samples alone, and every argument after it is a file", () => {
  const empty = command(good, ["--samples"]);
  assert.equal(empty.status, 2);
  assert.equal(empty.stderr, "sample-check: name the sample files to check\n");
  const other = command(good, ["--lock=x"]);
  assert.equal(other.status, 2);
  assert.match(other.stderr, /^contracts-check: the only argument is --samples/);
  const dashed = command({ "-sample.json": evalSet }, ["--samples", "-sample.json"]);
  assert.equal(dashed.status, 0, dashed.stderr);
  assert.equal(dashed.stdout, "sample-check: ok — 1 sample\n");
});

test("checkSampleFiles reads spec's examples by the same code, and throws on a path outside root", () => {
  assert.deepEqual(checkSampleFiles(root, examples), { errors: [], samples: examples.length });
  assert.throws(() => checkSampleFiles(path.join(root, FOLDER), ["../../../../justfile"]), /not a file of the repository the check runs in/);
  assert.throws(() => checkSampleFiles(root, []), /^Error: name the sample files to check$/);
});
