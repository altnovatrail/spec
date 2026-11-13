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
import { isReport } from "../report.mjs";
import { FOLDER } from "../sample.mjs";

const justfile = path.join(root, "justfile");
const main = path.join(root, "tools/contracts/main.mjs");
const examples = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`).filter((file) => !isReport(file));
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
  assert.match(other.stderr, /^contracts-check: the only arguments are --samples, with the sample files to check — or --eval-set, .*, and --reports/);
  const dashed = command({ "-sample.json": evalSet }, ["--samples", "-sample.json"]);
  assert.equal(dashed.status, 0, dashed.stderr);
  assert.equal(dashed.stdout, "sample-check: ok — 1 sample\n");
});

test("checkSampleFiles reads spec's examples by the same code, and throws on a path outside root", () => {
  assert.deepEqual(checkSampleFiles(root, examples), { errors: [], samples: examples.length });
  assert.throws(() => checkSampleFiles(path.join(root, FOLDER), ["../../../../justfile"]), /not a file of the repository the check runs in/);
  assert.throws(() => checkSampleFiles(root, []), /^Error: name the sample files to check$/);
});

// A sample of a module's eval set, as modules holds one: spec's example of an eval set, of a task of
// that module.
const MODULE = "novatrail/olympiad-math";
const ofModule = (sample, module = MODULE) => {
  const { tutor: _, ...task } = sample.task;
  return { ...sample, task: { modules: { tag: "v0.1.0", module, version: "0.1.0", package_digest: `sha256:${"0".repeat(64)}` }, ...task } };
};
const setSample = ofModule(example("sheet-eval-set"));
const essay = ofModule(example("sheet-essay"));

test("with --eval-set, sample-check holds the files of a module's eval set together to the rules of section 13", () => {
  const set = { "eval/a.json": textOf(setSample), "eval/essay.json": textOf(essay) };
  const run = recipe(set, ["--eval-set", MODULE, ...Object.keys(set)]);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(run.stdout, `sample-check: ok — 2 samples of the eval set of ${MODULE}\n`);
  // A sample of measurement, one with no markup, one of another module's task or of tutor's, and two
  // with one ID.
  const measurement = textOf(ofModule(example("sheet-measurement")));
  const { markup: __, ...bare } = setSample;
  const unmarked = textOf({ ...bare, id: "synthetic-9001" });
  const other = textOf({ ...ofModule(example("sheet-eval-set"), "novatrail/school-math"), id: "synthetic-9002" });
  const tutors = textOf({ ...example("sheet-eval-set"), id: "synthetic-9003" });
  const twice = textOf(setSample);
  const bad = recipe({ ...set, "eval/m.json": measurement, "eval/u.json": unmarked, "eval/o.json": other, "eval/t.json": tutors, "eval/twice.json": twice }, ["--eval-set", MODULE, "eval/a.json", "eval/m.json", "eval/u.json", "eval/o.json", "eval/t.json", "eval/twice.json"]);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  const lines = bad.stdout.trimEnd().split("\n");
  assert.deepEqual(lines, [
    `eval/m.json:${lineOf(measurement, "purpose")}: a sample of the eval set of ${MODULE} is of the purpose PURPOSE_EVAL_SET, not "PURPOSE_MEASUREMENT" (contracts/README.md, section 13)`,
    `eval/o.json:${lineOf(other, "module")}: a sample of the eval set of ${MODULE} is of a task of that module, not of "novatrail/school-math" (contracts/README.md, section 13)`,
    `eval/t.json:${lineOf(tutors, "task")}: a sample of the eval set of ${MODULE} is of a task of that module: its source is modules (contracts/README.md, section 13)`,
    `eval/twice.json:${lineOf(twice, "id")}: the ID ${setSample.id} is eval/a.json's too: no two samples of an eval set share an ID (contracts/README.md, section 13)`,
    `eval/u.json:1: a sample of an eval set has its markup, which the runner measures AI by (contracts/README.md, section 13)`,
    "sample-check: 5 errors",
  ]);
  // A file named twice, and through a link, is one sample, and a sample that breaks section 11 has
  // that error alone.
  const linked = recipe({ ...set, "more/a.json": { link: "../eval/a.json" } }, ["--eval-set", MODULE, "eval/a.json", "./eval/a.json", "more/a.json"]);
  assert.equal(linked.status, 0, linked.stdout + linked.stderr);
  assert.equal(linked.stdout, `sample-check: ok — 1 sample of the eval set of ${MODULE}\n`);
  const licensed = textOf({ ...setSample, license: "MIT", purpose: "PURPOSE_MEASUREMENT" });
  const one = recipe({ "eval/l.json": licensed }, ["--eval-set", MODULE, "eval/l.json"]);
  assert.equal(one.status, 1, one.stdout + one.stderr);
  assert.doesNotMatch(one.stdout, /section 13/);
  // Without --eval-set the same files are checked each alone, and two with one ID pass.
  const alone = recipe({ "eval/a.json": textOf(setSample), "eval/twice.json": twice }, ["eval/a.json", "eval/twice.json"]);
  assert.equal(alone.status, 0, alone.stdout + alone.stderr);
});

test("--eval-set comes first, with the ID of a module, and then the files of its eval set", () => {
  for (const [args, pattern] of [
    [["--eval-set"], /^sample-check: "" is not the ID of a module, <publisher>\/<name>: name the module whose eval set the files are, then the files$/m],
    [["--eval-set", "eval/a.json"], /^sample-check: "eval\/a\.json" is not the ID of a module/m],
    [["--eval-set", MODULE], new RegExp(`^sample-check: name the files of the eval set of ${MODULE} to check$`, "m")],
  ]) {
    const run = recipe({ "eval/a.json": textOf(setSample) }, args);
    assert.equal(run.status, 2, `${args}: ${run.stdout}${run.stderr}`);
    assert.match(run.stderr, pattern, args.join(" "));
  }
  for (const id of ["novatrail/con", `novatrail/${"a".repeat(120)}`]) {
    const run = recipe({ "eval/a.json": textOf(setSample) }, ["--eval-set", id, "eval/a.json"]);
    assert.equal(run.status, 2, `${id}: ${run.stdout}${run.stderr}`);
  }
  // A sample names its module by an ID of the module format, with or without --eval-set.
  const unnamed = recipe({ "eval/a.json": textOf(ofModule(example("sheet-eval-set"), "Novatrail/Olympiad Math")) }, ["eval/a.json"]);
  assert.equal(unnamed.status, 1, unnamed.stdout + unnamed.stderr);
  assert.match(unnamed.stdout, /: the module's ID "Novatrail\/Olympiad Math" is not the ID of a module, <publisher>\/<name>, as the module format has it$/m);
  assert.deepEqual(checkSampleFiles(root, [`${FOLDER}/sheet-eval-set.json`], MODULE).errors.map((error) => error.message), [`a sample of the eval set of ${MODULE} is of a task of that module: its source is modules (contracts/README.md, section 13)`]);
});

// A large set, as modules has, of 631 files of some 600 KB each (T116; Д197), in a model: 60
// essays of some 260 KB each, whose sheet holds its crops as PNG, under a heap of 64 MB. The code
// before T116, which held every sample read until the set's rule ran, runs out of it on this model;
// now each file goes once it is read, and the set's rule keeps its IDs alone.
test("--eval-set reads a large set one file at a time, its rule kept by the IDs", () => {
  const files = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`eval/essay-${i}.json`, textOf({ ...essay, id: `synthetic-${5000 + i}` })]));
  const run = withRepository(files, (dir) => spawnSync(process.execPath, ["--max-old-space-size=64", main, "--samples", "--eval-set", MODULE, ...Object.keys(files)], { cwd: dir, encoding: "utf8" }));
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(run.stdout, `sample-check: ok — 60 samples of the eval set of ${MODULE}\n`);
});
