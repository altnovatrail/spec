// contracts-check: the checks of the API contracts in spec's contracts/, and sample-check and
// report-check, which another NovaTrail repository runs on its own files (R83, R93, R95).
//
//   node tools/contracts/main.mjs                       spec's own contracts/, two levels above this file
//   node tools/contracts/main.mjs --samples <file>...   sample files of the repository it runs from
//   node tools/contracts/main.mjs --samples --eval-set <module> <file>...
//                                                       the files of a module's eval set
//   node tools/contracts/main.mjs --reports <file>... [--samples <file>...]
//                                                       report files of it, and their samples
//
// buf does not run while buf.yaml or buf.gen.yaml breaks R83, since it could then reach a service
// outside the repository, nor while a .proto file is out of place. Anything in contracts/ that the
// layout does not have is an error: what this check does not know would go unchecked, so whatever
// brings it extends the check. Prints one line per error, file:line: message, and exits 1 if there
// are any.
//
// sample-check reads each file as spec's examples are read and holds it to the same rules, by the
// image buf builds of this spec's contracts/ — the spec/ submodule's, at the tag the repository
// pins. With --eval-set the files are the folder eval/ of that module, held together to the rules
// of an eval set that need neither the module's package nor a key (R93). report-check holds each
// report to the rules spec's examples of the report are held to and, with --samples, to those
// samples (R95). Both print one line per error and exit 1 when a file breaks a rule, and 2 when they
// cannot check at all.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { byCodeUnits, inRepository, isMain } from "../shared.mjs";
import { breaking, build, contractFiles, format, generate, lint, previousRelease } from "./buf.mjs";
import { FOLDER, PACKAGE, checkVectors, plural } from "./observation.mjs";
import { FOLDER as PAPER_FOLDER, PACKAGE as PAPER, checkVectors as checkPaperVectors } from "./paper.mjs";
import { checkReport, checkReportExamples, isReport, reportOf, sampleBreaches, summaryOf } from "./report.mjs";
import { UNKNOWN, checkBufGenYaml, checkBufYaml, checkImage, classify, unknownFile } from "./rules.mjs";
import { FOLDER as SAMPLES, PACKAGE as EVAL, checkExamples, checkSamples, evalSampleBreaches, evalSetBreaches, isModuleId, sameIds, sampleOf } from "./sample.mjs";
import { FOLDER as RULES, checkVectors as checkRuleVectors } from "./strokes.mjs";
import { checkTypeScript } from "./typescript.mjs";

// The spec this file is part of: spec itself, or the spec/ submodule of another repository.
const SPEC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// buf.yaml and buf.gen.yaml at root against R83: the errors, a missing file one of them.
export function checkConfig(root) {
  const errors = [];
  for (const [file, check] of [["buf.yaml", checkBufYaml], ["buf.gen.yaml", checkBufGenYaml]]) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) errors.push(...check(fs.readFileSync(full, "utf8")));
    else errors.push({ file, line: 0, message: "the file is missing: buf reads it at the root of spec (contracts/README.md, sections 3 and 8)" });
  }
  return errors;
}

// The files of contracts/ by their kind, and an error for each the layout does not have.
export function layout(root) {
  const protos = [];
  const generated = new Map();
  const vectors = [];
  const examples = [];
  const errors = [];
  for (const file of contractFiles(root)) {
    const kind = classify(file);
    if (!kind) errors.push(unknownFile(file));
    else if (kind.kind === "proto") protos.push(file);
    else if (kind.kind === "generated") generated.set(file, kind.source);
    else if (kind.kind === "vector") vectors.push({ file, package: kind.package });
    else if (kind.kind === "example") examples.push({ file, package: kind.package });
  }
  return { protos, generated, vectors, examples, errors };
}

// The packages whose vectors the check runs.
const VECTORS = new Map([
  [PACKAGE, { folder: FOLDER, section: 10 }],
  [EVAL, { folder: RULES, section: 12 }],
  [PAPER, { folder: PAPER_FOLDER, section: 16 }],
]);

// Each vector is of a package that contracts/ has and whose vectors the check runs, and each such
// package has some: review alone would hold its rules otherwise.
export function vectorErrors(vectors, packages) {
  const errors = [];
  for (const vector of vectors) {
    if (!packages.has(vector.package)) errors.push({ file: vector.file, line: 0, message: `a vector of ${vector.package}, and contracts/ has no .proto file of that package` });
    else if (!VECTORS.has(vector.package)) errors.push({ file: vector.file, line: 0, message: `contracts-check runs no vectors of ${vector.package}: the task that brings them extends the check` });
  }
  for (const [name, { folder, section }] of VECTORS) {
    if (packages.has(name) && !vectors.some((vector) => vector.package === name)) {
      errors.push({ file: folder, line: 0, message: `${name} has no test vectors, and they hold the rules of contracts/README.md, section ${section}` });
    }
  }
  return errors;
}

// Each example is of a package that contracts/ has and whose examples the check reads, and the
// sample file and the runner's report have some: nothing else would show them whole.
export function exampleErrors(examples, packages) {
  const errors = [];
  for (const example of examples) {
    if (!packages.has(example.package)) errors.push({ file: example.file, line: 0, message: `an example of ${example.package}, and contracts/ has no .proto file of that package` });
    else if (example.package !== EVAL) errors.push({ file: example.file, line: 0, message: `contracts-check reads no examples of ${example.package}: the task that brings them extends the check` });
  }
  if (packages.has(EVAL) && !examples.some((example) => example.package === EVAL && !isReport(example.file))) {
    errors.push({ file: SAMPLES, line: 0, message: `${EVAL} has no examples of the sample file, and they show it as contracts/README.md, section 11, has it` });
  }
  if (packages.has(EVAL) && !examples.some((example) => example.package === EVAL && isReport(example.file))) {
    errors.push({ file: SAMPLES, line: 0, message: `${EVAL} has no example of the runner's report, report-<case>.json, and they show it as contracts/README.md, section 14, has it` });
  }
  return errors;
}

// The generated code in contracts/ against what buf generates of the files now.
export function compareGenerated(root, generated, written) {
  const errors = [];
  for (const [file, bytes] of written) {
    const kind = classify(file);
    // A file out of the layout that contracts/ holds already has its error from the layout.
    if (kind?.kind !== "generated") {
      if (!fs.existsSync(path.join(root, file))) errors.push({ file, line: 0, message: `buf generates it, and the layout of contracts/ has no such file; ${UNKNOWN}` });
    }
    else if (!generated.has(file)) errors.push({ file, line: 0, message: `buf generates it from ${kind.source}, and contracts/ lacks it; run just contracts` });
    else if (!fs.readFileSync(path.join(root, file)).equals(bytes)) errors.push({ file, line: 0, message: `the file is not what buf generates from ${kind.source}; run just contracts` });
  }
  for (const [file, source] of generated) {
    if (!written.has(file)) {
      const why = fs.existsSync(path.join(root, source)) ? `buf no longer generates it from ${source}` : `no .proto file generates it: ${source} is not there`;
      errors.push({ file, line: 0, message: `${why}; run just contracts` });
    }
  }
  return errors;
}

const byPlace = (a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message);

// Every check of the contracts at root: { errors, stats }.
export function checkContracts(root) {
  const errors = checkConfig(root);
  const { protos, generated, vectors, examples, errors: misplaced } = layout(root);
  errors.push(...misplaced);
  const packages = new Set(protos.map((file) => classify(file).package));
  errors.push(...vectorErrors(vectors, packages), ...exampleErrors(examples, packages));
  const stats = { protos: protos.length, packages: packages.size, generated: generated.size, vectors: vectors.length, cases: 0, examples: 0, previous: null, messages: 0, packaged: 0 };
  const done = () => ({ errors: errors.sort(byPlace), stats });

  if (protos.length === 0) {
    errors.push(...compareGenerated(root, generated, new Map()));
    // buf refuses a module with no .proto file, so it cannot hold that every package of the
    // previous release is still here: a package is never removed.
    const previous = previousRelease(root);
    stats.previous = previous;
    if (previous?.protos) {
      errors.push({ file: "contracts", line: 0, message: `${previous.tag} has ${previous.protos} .proto file${previous.protos === 1 ? "" : "s"} and contracts/ has none: a package is never removed, and what a package no longer needs stays (contracts/README.md, sections 2 and 5)` });
    }
    return done();
  }
  if (errors.some((error) => error.file === "buf.yaml" || error.file === "buf.gen.yaml")) {
    errors.push({ file: "buf.yaml", line: 0, message: "buf does not run while buf.yaml or buf.gen.yaml breaks R83: it could reach a service outside the repository" });
    return done();
  }
  if (misplaced.some((error) => error.file.endsWith(".proto"))) {
    errors.push({ file: "buf.yaml", line: 0, message: "buf does not run while a .proto file is out of the layout: its package and its code would be out of place too" });
    return done();
  }
  const built = build(root);
  if (built.errors.length) {
    errors.push(...built.errors);
    return done();
  }
  errors.push(...checkImage(built.image), ...format(root, protos), ...lint(root));
  for (const [name, check] of [[PACKAGE, checkVectors], [EVAL, checkRuleVectors], [PAPER, checkPaperVectors]]) {
    const files = vectors.filter((vector) => vector.package === name).map((vector) => vector.file);
    if (!packages.has(name) || files.length === 0) continue;
    const checked = check(root, built.image, files);
    errors.push(...checked.errors);
    stats.cases += checked.cases;
  }
  const ofEval = examples.filter((example) => example.package === EVAL).map((example) => example.file);
  const samples = ofEval.filter((file) => !isReport(file));
  const reports = ofEval.filter(isReport);
  let held = new Map();
  if (packages.has(EVAL) && samples.length) {
    const checked = checkExamples(root, built.image, samples, summaryOf);
    errors.push(...checked.errors);
    // A sample that breaks its rules has its error, and the reports are not held to the samples then.
    held = checked.errors.length ? null : checked.samples;
    stats.examples += samples.length;
  }
  if (packages.has(EVAL) && reports.length) {
    errors.push(...checkReportExamples(root, built.image, reports, held).errors);
    stats.examples += reports.length;
  }

  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-check-"));
  try {
    const previous = previousRelease(root, path.join(folder, "previous"));
    stats.previous = previous;
    if (previous?.protos) errors.push(...breaking(root, path.join(folder, "previous"), previous.tag));
    errors.push(...compareGenerated(root, generated, generate(root, path.join(folder, "generated"))));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  // The package is of the code in contracts/: while it is not what buf writes, there is nothing to
  // check it by.
  if (errors.length === 0) {
    const typescript = checkTypeScript(root);
    errors.push(...typescript.errors);
    stats.messages = typescript.messages;
    stats.packaged = typescript.vectors;
  }
  return done();
}

// The files another repository names, by their paths from root, the folder the check runs from:
// each [name, path to read], a file named twice once, by its first name. A path that leaves root or
// names no file throws, before buf runs.
function namedFiles(root, files, what) {
  const named = new Map();
  for (const file of files) {
    const full = inRepository(file, root);
    const stat = fs.statSync(full, { throwIfNoEntry: false });
    if (!stat) throw new Error(`${file}: there is no such file`);
    if (!stat.isFile()) throw new Error(`${file}: not a file; name the ${what} files themselves`);
    if (!named.has(full)) named.set(full, file);
  }
  return [...named].map(([full, file]) => [file, full]);
}

// The image buf builds of this spec's contracts/: it throws when buf build fails.
function specImage() {
  const built = build(SPEC);
  if (built.errors.length) throw new Error(`buf build fails in ${SPEC}: ${built.errors.map(({ file, line, message }) => `${file}:${line}: ${message}`).join("; ")}`);
  return built.image;
}

// A message of the image, or a throw: an image of this spec's contracts/ without it, or with a value
// of an enum its rules do not name, checks nothing.
function known({ message, error }) {
  if (error) throw new Error(error);
  return message;
}

// The sample files another repository names, by their paths from root, the folder sample-check
// runs from, and, unless null, the ID of the module whose eval set they are: { errors, samples },
// the errors by the paths given, and a file named twice checked once, by its first name. Of a
// module's eval set, the samples that hold are held together to the rules of an eval set that need
// neither the package nor a key. A path that leaves root or names no file throws before buf runs,
// and so does an ID that is no module's, or an image of this spec's contracts/ with no Sample.
export function checkSampleFiles(root, files, module = null) {
  if (module !== null && !isModuleId(module)) throw new Error(`${JSON.stringify(module)} is not the ID of a module, <publisher>/<name>: name the module whose eval set the files are, then the files`);
  if (files.length === 0) throw new Error(module === null ? "name the sample files to check" : `name the files of the eval set of ${module} to check`);
  const read = namedFiles(root, files, "sample");
  const message = known(sampleOf(specImage()));
  const checked = checkSamples(message, read, { breaches: module === null ? null : (value) => evalSampleBreaches(module, value) });
  const errors = module === null ? checked.errors : [...checked.errors, ...evalSetBreaches(checked.held)];
  return { errors: errors.sort(byPlace), samples: read.length };
}

// What the samples a call of report-check names are to the messages of the check.
const GIVEN = { measured: "the samples given with --samples that its capability measures", none: "no sample given with --samples" };

// The report files another repository names, by their paths from root, the folder report-check runs
// from, and, unless null, the sample files to hold them to: { errors, reports, samples }, the errors
// by the paths given, and each list read as checkSampleFiles reads one. A report is held to the
// samples only when every sample holds its rules and no two share an ID, since a report would
// otherwise be held to what is not there.
export function checkReportFiles(root, reports, samples = null) {
  if (reports.length === 0) throw new Error("name the report files to check");
  if (samples?.length === 0) throw new Error("name the sample files after --samples, or leave it out");
  const reportFiles = namedFiles(root, reports, "report");
  const sampleFiles = samples && namedFiles(root, samples, "sample");
  const image = specImage();
  const report = known(reportOf(image));
  const errors = [];
  let held = null;
  if (sampleFiles) {
    const checked = checkSamples(known(sampleOf(image)), sampleFiles, { keep: summaryOf });
    errors.push(...checked.errors, ...sameIds(checked.held));
    if (errors.length === 0) held = checked.samples;
  }
  for (const [file, full] of reportFiles) {
    const { problems, value, lineOf } = checkReport(fs.readFileSync(full), report);
    errors.push(...problems.map((one) => ({ file, ...one })));
    if (problems.length === 0 && held) errors.push(...sampleBreaches(value, held, GIVEN).map(({ at, message }) => ({ file, line: lineOf(at), message })));
  }
  return { errors: errors.sort(byPlace), reports: reportFiles.length, samples: sampleFiles?.length ?? 0 };
}

// A check of the files another repository names, as its recipe runs it: what check found, a line
// each, and its verdict, which ok words; the status 1 when a file breaks a rule, and 2 when it cannot
// check at all.
function run(name, check, ok) {
  try {
    const found = check();
    for (const { file, line, message } of found.errors) console.log(`${file}:${line}: ${message}`);
    if (found.errors.length) {
      console.log(`${name}: ${plural(found.errors.length, "error")}`);
      process.exitCode = 1;
    } else {
      console.log(`${name}: ok — ${ok(found)}`);
    }
  } catch (error) {
    console.error(`${name}: ${error.message}`);
    process.exitCode = 2;
  }
}

function sampleCheck(args) {
  const set = args[0] === "--eval-set";
  const module = set ? args[1] ?? "" : null;
  const files = set ? args.slice(2) : args;
  run("sample-check", () => checkSampleFiles(process.cwd(), files, module), ({ samples }) => plural(samples, "sample") + (set ? ` of the eval set of ${module}` : ""));
}

function reportCheck(args) {
  const at = args.indexOf("--samples");
  const reports = at < 0 ? args : args.slice(0, at);
  const samples = at < 0 ? null : args.slice(at + 1);
  run("report-check", () => {
    if (samples?.includes("--samples")) throw new Error("--samples comes once, before all the sample files");
    return checkReportFiles(process.cwd(), reports, samples);
  }, (found) => plural(found.reports, "report") + (samples ? `, held to ${plural(found.samples, "sample")}` : ""));
}

// What a run found, in a line.
export function summary({ protos, packages, generated, vectors, cases, examples, previous, messages, packaged = 0 }) {
  if (protos === 0) return "contracts/ holds no .proto file yet, so buf has nothing to check; buf.yaml and buf.gen.yaml are as R83 has them";
  const against = !previous
    ? "and no release of spec before HEAD to compare with"
    : previous.protos
      ? `compared with ${previous.tag}`
      : `and ${previous.tag} holds no .proto file to compare with`;
  const tested = (vectors ? `, ${vectors} file${vectors === 1 ? "" : "s"} of test vectors with ${cases} case${cases === 1 ? "" : "s"}` : "") + (examples ? `, ${examples} example${examples === 1 ? "" : "s"}` : "");
  return `${protos} .proto file${protos === 1 ? "" : "s"} in ${packages} package${packages === 1 ? "" : "s"}, ${generated} file${generated === 1 ? "" : "s"} of generated code${tested}, ${against}; tsc and Node take the ${messages} message${messages === 1 ? "" : "s"} of its npm package${packaged ? ` and the ${packaged} file${packaged === 1 ? "" : "s"} of vectors it carries` : ""}`;
}

function contractsCheck() {
  try {
    const { errors, stats } = checkContracts(SPEC);
    for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
    if (errors.length) {
      console.log(`contracts-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
      process.exitCode = 1;
    } else {
      console.log(`contracts-check: ok — ${summary(stats)}`);
    }
  } catch (error) {
    console.error(`contracts-check: ${error.message}`);
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) {
  // Every argument after --samples is a file, one beginning with - too, but a first --eval-set and
  // the module's ID after it; after --reports, every one but the first --samples, which divides the
  // reports from their samples.
  const args = process.argv.slice(2);
  if (args[0] === "--samples") sampleCheck(args.slice(1));
  else if (args[0] === "--reports") reportCheck(args.slice(1));
  else if (args.length) {
    console.error("contracts-check: the only arguments are --samples, with the sample files to check — or --eval-set, a module's ID and the files of its eval set —, and --reports, with the report files to check and, after --samples, their samples");
    process.exitCode = 2;
  } else contractsCheck();
}
