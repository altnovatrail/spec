// report-check, as another repository runs it: `just -f spec/justfile report-check <file>…
// [--samples <file>…]` from its root, here a made-up repository in a temporary directory with copies
// of spec's examples. buf is the toolchain stage's, and the image it builds is of spec's own
// contracts/.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { root } from "../../release/test/repository.mjs";
import { checkReportFiles } from "../main.mjs";
import { isReport } from "../report.mjs";
import { FOLDER } from "../sample.mjs";

const justfile = path.join(root, "justfile");
const main = path.join(root, "tools/contracts/main.mjs");
const names = fs.readdirSync(path.join(root, FOLDER)).filter((name) => name.endsWith(".json"));
const example = (name) => JSON.parse(fs.readFileSync(path.join(root, FOLDER, name), "utf8"));
const textOf = (value) => `${JSON.stringify(value, null, 2)}\n`;
const lineOf = (text, key) => text.split("\n").findIndex((line) => line.trimStart().startsWith(`"${key}":`)) + 1;

// A repository of its own in a temporary directory, with the given files — a text, or { link } to
// where a link of that name leads —, and run(dir) in it.
function withRepository(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "report-check-"));
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
const recipe = (files, args) => withRepository(files, (dir) => spawnSync(process.env.JUST ?? "just", ["-f", justfile, "report-check", ...args], { cwd: dir, encoding: "utf8" }));
const command = (files, args) => withRepository(files, (dir) => spawnSync(process.execPath, [main, ...args], { cwd: dir, encoding: "utf8" }));

// spec's examples, laid out as another repository would hold them: the reports, and their samples.
const good = Object.fromEntries(names.map((name) => [`eval/${name}`, textOf(example(name))]));
const reports = Object.keys(good).filter(isReport);
const samples = Object.keys(good).filter((file) => !isReport(file));

test("report-check passes the reports a repository names, alone and held to their samples", () => {
  const alone = recipe(good, reports);
  assert.equal(alone.status, 0, alone.stdout + alone.stderr);
  assert.equal(alone.stdout, "report-check: ok — 2 reports\n");
  const held = recipe(good, [...reports, "--samples", ...samples]);
  assert.equal(held.status, 0, held.stdout + held.stderr);
  assert.equal(held.stdout, `report-check: ok — 2 reports, held to ${samples.length} samples\n`);
  // A link that stays in the repository is read where it leads, and a file named twice once.
  const linked = recipe({ ...good, "runs/report.json": { link: "../eval/report-assessment.json" } }, ["runs/report.json", "eval/report-assessment.json", "./eval//report-assessment.json"]);
  assert.equal(linked.status, 0, linked.stdout + linked.stderr);
  assert.equal(linked.stdout, "report-check: ok — 1 report\n");
});

test("report-check names the file and the line of each rule a report breaks", () => {
  const bad = textOf({ ...example("report-reading.json"), runner: "0.0.0" });
  const run = recipe({ ...good, "eval/report-bad.json": bad }, ["eval/report-bad.json", ...reports]);
  assert.equal(run.status, 1, run.stdout + run.stderr);
  assert.equal(run.stdout, `eval/report-bad.json:${lineOf(bad, "runner")}: the runner "0.0.0" is not the tag of a release of tutor, vMAJOR.MINOR.PATCH\nreport-check: 1 error\n`);
  // A file that is no report does not read as one, strictly.
  const sample = recipe(good, [samples[0]]);
  assert.equal(sample.status, 1, sample.stdout + sample.stderr);
  assert.match(sample.stdout, /^eval\/[a-z-]+\.json:1: it does not read as novatrail\.eval\.v1\.Report: /m);
});

test("report-check holds a report to the samples the call names, and only once they hold", () => {
  // A report on a capability set names every sample given that its capability measures, and each
  // sample it names is given.
  const fewer = recipe(good, ["eval/report-reading.json", "--samples", "eval/sheet-eval-set.json"]);
  assert.equal(fewer.status, 1, fewer.stdout + fewer.stderr);
  assert.match(fewer.stdout, /^eval\/report-reading\.json:\d+: the report names the samples \[.*\], and the samples given with --samples that its capability measures are \["synthetic-1104"\]$/m);
  assert.match(fewer.stdout, /^eval\/report-reading\.json:\d+: no sample given with --samples is the sample synthetic-1103$/m);
  // A sample that breaks its rules has its error, and no report is held to the samples then.
  const broken = textOf({ ...example("sheet-eval-set.json"), license: "MIT" });
  const run = recipe({ ...good, "eval/sheet-eval-set.json": broken }, [...reports, "--samples", ...samples]);
  assert.equal(run.status, 1, run.stdout + run.stderr);
  assert.equal(run.stdout, `eval/sheet-eval-set.json:${lineOf(broken, "license")}: a sample of an eval set names its license, "Apache-2.0"\nreport-check: 1 error\n`);
  // A report that breaks its rules has its errors, and is not held to the samples.
  const unnamed = textOf({ ...example("report-reading.json"), capability_set: { name: " " } });
  const both = recipe({ ...good, "eval/report-unnamed.json": unnamed }, ["eval/report-unnamed.json", "--samples", "eval/sheet-eval-set.json"]);
  assert.equal(both.status, 1, both.stdout + both.stderr);
  assert.equal(both.stdout, `eval/report-unnamed.json:${lineOf(unnamed, "capability_set") + 1}: the eval set of the capability is not named\nreport-check: 1 error\n`);
  // A report on a module's eval set is not held to name every sample given, only to name samples given.
  const { capability_set: _, ...rest } = example("report-assessment.json");
  const ofModule = textOf({ ...rest, module: { module: "novatrail/olympiad-math", commit: "0".repeat(40) } });
  const module = recipe({ ...good, "eval/report-module.json": ofModule }, ["eval/report-module.json", "--samples", ...samples]);
  assert.equal(module.status, 0, module.stdout + module.stderr);
  const missing = recipe({ ...good, "eval/report-module.json": ofModule }, ["eval/report-module.json", "--samples", "eval/sheet-eval-set.json"]);
  assert.equal(missing.status, 1, missing.stdout + missing.stderr);
  assert.match(missing.stdout, /^eval\/report-module\.json:\d+: no sample given with --samples is the sample synthetic-1107\nreport-check: 1 error\n$/m);
  // Two samples with one ID: a report names a sample by its ID.
  const copy = good["eval/sheet-eval-set.json"];
  const twice = recipe({ ...good, "eval/copy.json": copy }, [...reports, "--samples", ...samples, "eval/copy.json"]);
  assert.equal(twice.status, 1, twice.stdout + twice.stderr);
  assert.equal(twice.stdout, `eval/copy.json:${lineOf(copy, "id")}: the ID ${example("sheet-eval-set.json").id} is eval/sheet-eval-set.json's too: a report names a sample by its ID, so the samples it is held to have one ID each\nreport-check: 1 error\n`);
});

test("report-check reads files of the repository alone, and stops before buf on a call it cannot check", () => {
  for (const [args, pattern] of [
    [["../report.json"], /^report-check: \.\.\/report\.json: not a file of the repository the check runs in, /m],
    [["eval"], /^report-check: eval: not a file; name the report files themselves$/m],
    [["eval/none.json"], /^report-check: eval\/none\.json: there is no such file$/m],
    [["eval/out.json"], /^report-check: eval\/out\.json: a link that leads out of the repository the check runs in, /m],
    [[reports[0], "--samples", "eval"], /^report-check: eval: not a file; name the sample files themselves$/m],
    [[reports[0], "--samples", "../sample.json"], /^report-check: \.\.\/sample\.json: not a file of the repository/m],
    [[], /^report-check: name the report files to check$/m],
    [["--samples", samples[0]], /^report-check: name the report files to check$/m],
    [[reports[0], "--samples"], /^report-check: name the sample files after --samples, or leave it out$/m],
    [[reports[0], "--samples", samples[0], "--samples", samples[1]], /^report-check: --samples comes once, before all the sample files$/m],
  ]) {
    const run = recipe({ ...good, "eval/out.json": { link: path.join(root, FOLDER, names[0]) } }, args);
    assert.equal(run.status, 2, `${args}: ${run.stdout}${run.stderr}`);
    assert.match(run.stderr, pattern, args.join(" "));
    assert.equal(run.stdout, "", args.join(" "));
  }
});

test("the command takes --reports, and every argument after it but the first --samples is a file", () => {
  const dashed = command({ "-report.json": good[reports[0]] }, ["--reports", "-report.json"]);
  assert.equal(dashed.status, 0, dashed.stderr);
  assert.equal(dashed.stdout, "report-check: ok — 1 report\n");
  const other = command(good, ["--report", reports[0]]);
  assert.equal(other.status, 2);
  assert.match(other.stderr, /^contracts-check: the only arguments are --samples, with the sample files to check — or --eval-set, .*, and --reports, /);
});

test("checkReportFiles reads spec's examples by the same code, and throws on a path outside root", () => {
  const files = names.map((name) => `${FOLDER}/${name}`);
  assert.deepEqual(checkReportFiles(root, files.filter(isReport)), { errors: [], reports: 2, samples: 0 });
  assert.deepEqual(checkReportFiles(root, files.filter(isReport), files.filter((file) => !isReport(file))), { errors: [], reports: 2, samples: samples.length });
  assert.throws(() => checkReportFiles(path.join(root, FOLDER), ["../../../../justfile"]), /not a file of the repository the check runs in/);
});
