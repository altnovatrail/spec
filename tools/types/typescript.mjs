// The check of the TypeScript of the module format, of the admission table, of the deployment
// configuration, of the legal texts, of the table of the age of digital consent and of the format of
// the export by its compiler (R73, R96, R85, R130, R134, R135): each case of the
// corpus
// (tools/types/corpus.mjs), the value of a declaration of its type, as code that imports the types
// from the npm package @altnovatrail/spec would declare it.
//
//   node tools/types/typescript.mjs <corpus.json> <folder>     writes the project tsc checks into
//                                                              the folder, a new one
//
// The project is corpus.ts and a tsconfig for each resolution of modules a consumer may use:
// nodenext, as canvas resolves them, and bundler. Each is as strict as TypeScript goes, and checks
// the package's declarations too. A declaration is one line, so that what tsc says of it is said
// of its line: a case whose value holds a field its type has not — the part of a vector of the open
// view, read by its open view — stands under @ts-expect-error, and tsc fails when it takes the value.
// The directive takes any error of its line, but the open view of the same vector is a case of its
// own, which tsc takes: the part holds the same open fields with the same values, so what is left
// to refuse in it is its closed fields. tools/types/roundtrip reads it so in Go.
// Beside the corpus stands canvas.ts, a copy of canvas.check.ts beside this module: the check of
// the types of <novatrail-canvas>, which are written by hand (R74). It has a tsconfig for each
// resolution of modules too, tsconfig.canvas.<resolution>.json, as strict, and with the DOM, whose
// types the element's take. The corpus's own tsconfigs have no DOM: the module format's types take
// none of it.
// The package goes into the project's node_modules/@altnovatrail/spec, which `just types-check`
// unpacks from the archive that tools/types/npm.mjs builds of the working tree: so the package's
// exports are checked as well. Beside it go the npm package of the contracts' code,
// @altnovatrail/contracts, which tools/contracts/npm.mjs builds, and the runtime of protobuf-es: the
// check of <novatrail-canvas> holds the element's marks to the contract's message (R83). Then the
// recipe runs tsc on each tsconfig.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TYPESCRIPT_CONFIGS, TYPESCRIPT_STRICT, isMain } from "../shared.mjs";
import { ADMISSION_PACKAGE, CONSENT_AGE_PACKAGE, DEPLOYMENT_PACKAGE, EXPORT_PACKAGE, LEGAL_PACKAGE, OPEN, PACKAGE } from "./go.mjs";
import { NAME } from "./npm.mjs";

// The tsconfig of each resolution of modules and how strict it is: shared with the check of the
// contracts' code (tools/contracts/typescript.mjs).
export { TYPESCRIPT_CONFIGS as CONFIGS, TYPESCRIPT_STRICT as STRICT };
// The check of the types of <novatrail-canvas>, its name in the project, and the libraries of its
// tsconfigs: the DOM's too.
export const CANVAS_CHECK = fileURLToPath(new URL("canvas.check.ts", import.meta.url));
const CANVAS = "canvas.ts";
const CANVAS_LIB = ["es2022", "dom"];
// The packages a case's type may be of, each by the path the npm package exports it at.
const PACKAGES = { [PACKAGE]: `${NAME}/${PACKAGE}`, [OPEN]: `${NAME}/${PACKAGE}/${OPEN}`, [ADMISSION_PACKAGE]: `${NAME}/${ADMISSION_PACKAGE}`, [DEPLOYMENT_PACKAGE]: `${NAME}/${DEPLOYMENT_PACKAGE}`, [LEGAL_PACKAGE]: `${NAME}/${LEGAL_PACKAGE}`, [CONSENT_AGE_PACKAGE]: `${NAME}/${CONSENT_AGE_PACKAGE}`, [EXPORT_PACKAGE]: `${NAME}/${EXPORT_PACKAGE}` };

// The source of corpus.ts: a declaration of each case, each named by its place in the corpus.
export function sourceOf(cases) {
  const lines = [`// The corpus of tools/types, ${cases.length} cases (tools/types/typescript.mjs).`, ""];
  for (const { file, type } of cases) {
    const [name, ...rest] = type.split(".");
    if (!Object.hasOwn(PACKAGES, name) || rest.length !== 1) throw new Error(`${file}: the type ${type} is of no package of ${NAME}`);
  }
  // Only the packages the cases are of: a package of an earlier line exports no admissionv0, nor
  // deploymentv1, nor legalv3, nor consentagev1, nor exportv2.
  const used = new Set(cases.map(({ type }) => type.split(".")[0]));
  for (const [name, from] of Object.entries(PACKAGES)) if (used.has(name)) lines.push(`import type * as ${name} from ${JSON.stringify(from)};`);
  cases.forEach(({ file, type, value, closed }, index) => {
    lines.push("", `// ${file}${closed ? `, whose closed fields ${type} has not` : ""}`);
    if (closed) lines.push("// @ts-expect-error");
    lines.push(`export const case${index}: ${type} = ${JSON.stringify(value)};`);
  });
  return `${lines.join("\n")}\n`;
}

// The tsconfig of the check of <novatrail-canvas> beside the corpus's file of a resolution.
export const canvasConfigOf = (file) => file.replace(/^tsconfig\./, "tsconfig.canvas.");

// Writes the project of the cases into folder, a new one, with the check of <novatrail-canvas>,
// the text of canvas.check.ts unless another is given.
export function writeProject(cases, folder, check = fs.readFileSync(CANVAS_CHECK, "utf8")) {
  if (fs.existsSync(folder)) throw new Error(`${folder} is there already; the project goes into a new folder`);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "corpus.ts"), sourceOf(cases));
  fs.writeFileSync(path.join(folder, CANVAS), check);
  // The project's own package.json makes corpus.ts a module of ES, as a consumer's is.
  fs.writeFileSync(path.join(folder, "package.json"), `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`);
  const write = (file, config) => fs.writeFileSync(path.join(folder, file), `${JSON.stringify(config, null, 2)}\n`);
  for (const [file, resolution] of Object.entries(TYPESCRIPT_CONFIGS)) {
    write(file, { compilerOptions: { ...resolution, ...TYPESCRIPT_STRICT }, files: ["corpus.ts"] });
    write(canvasConfigOf(file), { compilerOptions: { ...resolution, ...TYPESCRIPT_STRICT, lib: CANVAS_LIB }, files: [CANVAS] });
  }
}

if (isMain(import.meta.url)) {
  const [corpus, folder, ...rest] = process.argv.slice(2);
  if (!folder || rest.length) {
    console.error("usage: node tools/types/typescript.mjs <corpus.json> <folder>");
    process.exit(2);
  }
  try {
    const cases = JSON.parse(fs.readFileSync(corpus, "utf8"));
    writeProject(cases, path.resolve(folder));
    console.log(`typescript: ${cases.length} cases and the check of <novatrail-canvas>, ${Object.keys(TYPESCRIPT_CONFIGS).length} configurations each`);
  } catch (error) {
    console.error(`typescript: ${error.message}`);
    process.exit(1);
  }
}
