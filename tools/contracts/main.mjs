// contracts-check: the checks of the API contracts in spec's contracts/ (R83; RUN.md, T55).
//
//   node tools/contracts/main.mjs      spec's own contracts/, two levels above this file
//
// Checks, in order:
// - buf.yaml, as R83 fixes it — one module, contracts/, no deps, the lint categories STANDARD,
//   COMMENTS and UNARY_RPC with no exception and no comment that switches a rule off, the breaking
//   category FILE —, and buf.gen.yaml: local plugins only, out to contracts/, no input from
//   outside and no folder cleaned. While either breaks R83, buf does not run, since it could then
//   reach a service outside the repository;
// - the layout of contracts/ (contracts/README.md, section 3): its README, go.mod and go.sum,
//   vectors.go and its test, the contracts at contracts/novatrail/<part>/vN/<name>.proto, the code
//   buf generates from them, and the test vectors of a package at contracts/vectors/<part>/vN/.
//   Anything else is an error, so the task that brings it extends the check, and while a .proto
//   file is out of place buf does not run. A vector is of a package that contracts/ has, and of one
//   whose vectors the check runs: so far novatrail.observation.v1, which has them;
// - with no .proto file, nothing more but that the previous release has none either: buf refuses a
//   module without one, and a package is never removed;
// - buf build, and of the image it builds what buf lets pass: a syntax other than proto3, a package
//   without the prefix novatrail., a json_name, an unsigned type (sections 3–6);
// - buf format and buf lint;
// - the test vectors of the observation, by the image: each observation as the package reads and a
//   writer writes it, whether it is valid, the joined observation and the verdicts, as section 10
//   gives them, and that the vectors hold every rule of it (tools/contracts/observation.mjs);
// - buf breaking against the previous release of spec, the newest release tag in the history of
//   HEAD other than HEAD's own, whose buf.yaml and contracts/ git archive unpacks into a temporary
//   folder; a release with no .proto file has nothing to compare with (section 7);
// - the generated code: what buf generate writes from the files is what contracts/ holds, file for
//   file and byte for byte, and contracts/ holds no generated file buf no longer writes (section 8);
// - with the code as buf writes it, its npm package, @altnovatrail/contracts, of the working tree:
//   tsc of tools/ takes every message of it under nodenext and bundler, and Node runs it, its binary
//   form and its JSON with protobuf names read back (tools/contracts/typescript.mjs).
// Prints one line per error, file:line: message, and exits 1 if there are any.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { byCodeUnits, isMain } from "../shared.mjs";
import { breaking, build, contractFiles, format, generate, lint, previousRelease } from "./buf.mjs";
import { FOLDER, PACKAGE, checkVectors } from "./observation.mjs";
import { UNKNOWN, checkBufGenYaml, checkBufYaml, checkImage, classify, unknownFile } from "./rules.mjs";
import { checkTypeScript } from "./typescript.mjs";

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
  const errors = [];
  for (const file of contractFiles(root)) {
    const kind = classify(file);
    if (!kind) errors.push(unknownFile(file));
    else if (kind.kind === "proto") protos.push(file);
    else if (kind.kind === "generated") generated.set(file, kind.source);
    else if (kind.kind === "vector") vectors.push({ file, package: kind.package });
  }
  return { protos, generated, vectors, errors };
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

// Every check of the contracts at root: { errors, stats }.
export function checkContracts(root) {
  const errors = checkConfig(root);
  const { protos, generated, vectors, errors: misplaced } = layout(root);
  errors.push(...misplaced);
  const packages = new Set(protos.map((file) => classify(file).package));
  errors.push(...vectorErrors(vectors, packages));
  const stats = { protos: protos.length, packages: packages.size, generated: generated.size, vectors: vectors.length, cases: 0, previous: null, messages: 0 };
  const done = () => ({ errors: errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message)), stats });

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

// What a run found, in a line.
export function summary({ protos, packages, generated, vectors, cases, previous, messages }) {
  if (protos === 0) return "contracts/ holds no .proto file yet, so buf has nothing to check; buf.yaml and buf.gen.yaml are as R83 has them";
  const against = !previous
    ? "and no release of spec before HEAD to compare with"
    : previous.protos
      ? `compared with ${previous.tag}`
      : `and ${previous.tag} holds no .proto file to compare with`;
  const tested = vectors ? `, ${vectors} file${vectors === 1 ? "" : "s"} of test vectors with ${cases} case${cases === 1 ? "" : "s"}` : "";
  return `${protos} .proto file${protos === 1 ? "" : "s"} in ${packages} package${packages === 1 ? "" : "s"}, ${generated} file${generated === 1 ? "" : "s"} of generated code${tested}, ${against}; tsc and Node take the ${messages} message${messages === 1 ? "" : "s"} of its npm package`;
}

if (isMain(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  try {
    const { errors, stats } = checkContracts(root);
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
