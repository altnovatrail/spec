// contracts-check: the checks of the API contracts in spec's contracts/ (R83; RUN.md, T55).
//
//   node tools/contracts/main.mjs                       spec's own contracts/, two levels above this file
//   node tools/contracts/main.mjs --samples <file>...   sample files of the repository it runs from
//
// Checks, in order:
// - buf.yaml, as R83 fixes it — one module, contracts/, no deps, the lint categories STANDARD,
//   COMMENTS and UNARY_RPC with no exception and no comment that switches a rule off, the breaking
//   category FILE —, and buf.gen.yaml: local plugins only, out to contracts/, no input from
//   outside and no folder cleaned. While either breaks R83, buf does not run, since it could then
//   reach a service outside the repository;
// - the layout of contracts/ (contracts/README.md, section 3): its README, go.mod and go.sum,
//   vectors.go and its test, the contracts at contracts/novatrail/<part>/vN/<name>.proto, the code
//   buf generates from them, the test vectors of a package at contracts/vectors/<part>/vN/, and its
//   examples at contracts/examples/<part>/vN/. Anything else is an error, so the task that brings
//   it extends the check, and while a .proto file is out of place buf does not run. A vector is of
//   a package that contracts/ has, and of one whose vectors the check runs: so far
//   novatrail.observation.v1, which has them; an example likewise, so far of novatrail.eval.v1;
// - with no .proto file, nothing more but that the previous release has none either: buf refuses a
//   module without one, and a package is never removed;
// - buf build, and of the image it builds what buf lets pass: a syntax other than proto3, a package
//   without the prefix novatrail., a json_name, an unsigned type (sections 3–6);
// - buf format and buf lint;
// - the test vectors of the observation, by the image: each observation as the package reads and a
//   writer writes it, whether it is valid, the joined observation and the verdicts, as section 10
//   gives them, and that the vectors hold every rule of it (tools/contracts/observation.mjs);
// - the examples of the sample file, by the image: each sample as the package reads and a writer
//   writes it, and the rules of section 11 — its fields by its purpose and writer, its strokes,
//   groups, boxes and crops, the chunks of its PNG —, and that together they show every purpose,
//   writer, ink, surface and event (tools/contracts/sample.mjs);
// - buf breaking against the previous release of spec, the newest release tag in the history of
//   HEAD other than HEAD's own, whose buf.yaml and contracts/ git archive unpacks into a temporary
//   folder; a release with no .proto file has nothing to compare with (section 7);
// - the generated code: what buf generate writes from the files is what contracts/ holds, file for
//   file and byte for byte, and contracts/ holds no generated file buf no longer writes (section 8);
// - with the code as buf writes it, its npm package, @altnovatrail/contracts, of the working tree:
//   tsc of tools/ takes every message of it under nodenext and bundler, and Node runs it, its binary
//   form and its JSON with protobuf names read back (tools/contracts/typescript.mjs).
// Prints one line per error, file:line: message, and exits 1 if there are any.
//
// With --samples, sample-check: the sample files another NovaTrail repository names, by their
// paths from the folder it runs from, its root (R93). Each path is a file of that folder, or the
// check stops before buf runs; then buf builds the image of this spec's contracts/ — the spec/
// submodule's, at the tag the repository pins —, and each file is read as the examples of spec are
// and held to the rules of contracts/README.md, section 11, by the same code, which asks nothing
// of the files together. Prints one line per error, file:line: message, and exits 1 if there are
// any, or 2 when it cannot check at all.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { byCodeUnits, inRepository, isMain } from "../shared.mjs";
import { breaking, build, contractFiles, format, generate, lint, previousRelease } from "./buf.mjs";
import { FOLDER, PACKAGE, checkVectors } from "./observation.mjs";
import { UNKNOWN, checkBufGenYaml, checkBufYaml, checkImage, classify, unknownFile } from "./rules.mjs";
import { FOLDER as SAMPLES, PACKAGE as EVAL, checkExamples, checkSamples, sampleOf } from "./sample.mjs";
import { checkTypeScript } from "./typescript.mjs";

// The spec this file is part of: spec itself, or the spec/ submodule of another repository.
const SPEC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// buf.yaml and buf.gen.yaml at root, against R83: the errors, with a missing file one of them.
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

// The test vectors against the packages: each is of a package that contracts/ has and whose vectors
// the check runs, and the observation has some, since review alone would hold section 10 otherwise.
export function vectorErrors(vectors, packages) {
  const errors = [];
  for (const vector of vectors) {
    if (!packages.has(vector.package)) errors.push({ file: vector.file, line: 0, message: `a vector of ${vector.package}, and contracts/ has no .proto file of that package` });
    else if (vector.package !== PACKAGE) errors.push({ file: vector.file, line: 0, message: `contracts-check runs no vectors of ${vector.package}: the task that brings them extends the check` });
  }
  if (packages.has(PACKAGE) && !vectors.some((vector) => vector.package === PACKAGE)) {
    errors.push({ file: FOLDER, line: 0, message: `${PACKAGE} has no test vectors, and they hold the rules of contracts/README.md, section 10` });
  }
  return errors;
}

// The examples against the packages: each is of a package that contracts/ has and whose examples
// the check reads, and the sample file has some, since nothing else would show it whole.
export function exampleErrors(examples, packages) {
  const errors = [];
  for (const example of examples) {
    if (!packages.has(example.package)) errors.push({ file: example.file, line: 0, message: `an example of ${example.package}, and contracts/ has no .proto file of that package` });
    else if (example.package !== EVAL) errors.push({ file: example.file, line: 0, message: `contracts-check reads no examples of ${example.package}: the task that brings them extends the check` });
  }
  if (packages.has(EVAL) && !examples.some((example) => example.package === EVAL)) {
    errors.push({ file: SAMPLES, line: 0, message: `${EVAL} has no examples, and they show the sample file of contracts/README.md, section 11` });
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

// Errors in the order of their files, lines and messages.
const byPlace = (a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message);

// Every check of the contracts at root: { errors, stats }.
export function checkContracts(root) {
  const errors = checkConfig(root);
  const { protos, generated, vectors, examples, errors: misplaced } = layout(root);
  errors.push(...misplaced);
  const packages = new Set(protos.map((file) => classify(file).package));
  errors.push(...vectorErrors(vectors, packages), ...exampleErrors(examples, packages));
  const stats = { protos: protos.length, packages: packages.size, generated: generated.size, vectors: vectors.length, cases: 0, examples: 0, previous: null, messages: 0 };
  const done = () => ({ errors: errors.sort(byPlace), stats });

  if (protos.length === 0) {
    errors.push(...compareGenerated(root, generated, new Map()));
    // buf refuses a module with no .proto file, so it cannot hold that every package of the
    // previous release is still here: a package is never removed (the text, section 2).
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
  const observed = vectors.filter((vector) => vector.package === PACKAGE).map((vector) => vector.file);
  if (packages.has(PACKAGE) && observed.length) {
    const checked = checkVectors(root, built.image, observed);
    errors.push(...checked.errors);
    stats.cases = checked.cases;
  }
  const samples = examples.filter((example) => example.package === EVAL).map((example) => example.file);
  if (packages.has(EVAL) && samples.length) {
    errors.push(...checkExamples(root, built.image, samples).errors);
    stats.examples = samples.length;
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
  }
  return done();
}

// The sample files another repository names, by their paths from root, the folder sample-check
// runs from: { errors, samples }, the errors by the paths given, and a file named twice checked
// once, by its first name. A path that leaves root or names no file throws before buf runs, and
// so does an image of this spec's contracts/ with no Sample.
export function checkSampleFiles(root, files) {
  if (files.length === 0) throw new Error("name the sample files to check");
  const named = new Map();
  for (const file of files) {
    const full = inRepository(file, root);
    const stat = fs.statSync(full, { throwIfNoEntry: false });
    if (!stat) throw new Error(`${file}: there is no such file`);
    if (!stat.isFile()) throw new Error(`${file}: not a file; name the sample files themselves`);
    if (!named.has(full)) named.set(full, file);
  }
  const built = build(SPEC);
  if (built.errors.length) throw new Error(`buf build fails in ${SPEC}: ${built.errors.map(({ file, line, message }) => `${file}:${line}: ${message}`).join("; ")}`);
  const known = sampleOf(built.image);
  if (known.error) throw new Error(known.error);
  const read = [...named].map(([full, file]) => [file, full]);
  return { errors: checkSamples(known.message, read).errors.sort(byPlace), samples: read.length };
}

// sample-check: what it found in the files, a line each, and its verdict; 2 when it cannot check.
function sampleCheck(files) {
  try {
    const { errors, samples } = checkSampleFiles(process.cwd(), files);
    for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
    if (errors.length) {
      console.log(`sample-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
      process.exitCode = 1;
    } else {
      console.log(`sample-check: ok — ${samples} sample${samples === 1 ? "" : "s"}`);
    }
  } catch (error) {
    console.error(`sample-check: ${error.message}`);
    process.exitCode = 2;
  }
}

// What a run found, in a line.
export function summary({ protos, packages, generated, vectors, cases, examples, previous, messages }) {
  if (protos === 0) return "contracts/ holds no .proto file yet, so buf has nothing to check; buf.yaml and buf.gen.yaml are as R83 has them";
  const against = !previous
    ? "and no release of spec before HEAD to compare with"
    : previous.protos
      ? `compared with ${previous.tag}`
      : `and ${previous.tag} holds no .proto file to compare with`;
  const tested = (vectors ? `, ${vectors} file${vectors === 1 ? "" : "s"} of test vectors with ${cases} case${cases === 1 ? "" : "s"}` : "") + (examples ? `, ${examples} example${examples === 1 ? "" : "s"}` : "");
  return `${protos} .proto file${protos === 1 ? "" : "s"} in ${packages} package${packages === 1 ? "" : "s"}, ${generated} file${generated === 1 ? "" : "s"} of generated code${tested}, ${against}; tsc and Node take the ${messages} message${messages === 1 ? "" : "s"} of its npm package`;
}

// contracts-check: what it found in spec's contracts/, a line each, and its verdict.
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
  // Every argument after --samples is a file, one beginning with - too.
  const args = process.argv.slice(2);
  if (args[0] === "--samples") sampleCheck(args.slice(1));
  else if (args.length) {
    console.error("contracts-check: the only argument is --samples, with the sample files to check");
    process.exitCode = 2;
  } else contractsCheck();
}
