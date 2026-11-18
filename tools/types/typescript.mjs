// The check of the generated TypeScript by its compiler: each case of the corpus
// (tools/types/corpus.mjs) is the value of a declaration of its type, as a consumer of the npm
// package @altnovatrail/spec would declare it (R73, R96, R85, R130, R134, R135).
//
//   node tools/types/typescript.mjs <corpus.json> <folder>     writes the project tsc checks into
//                                                              the folder, a new one
//
// The project has a tsconfig for each resolution of modules a consumer may use, nodenext, as canvas
// resolves them, and bundler, each as strict as TypeScript goes and checking the package's
// declarations too. A declaration is one line, so that what tsc says of it is said of its line: a
// case whose value holds a field its type has not, the part of a vector of the open view read by
// its open view, stands under @ts-expect-error. The directive takes any error of its line, but the
// open view of the same vector is a case of its own, which tsc takes, so what is left to refuse in
// the part is its closed fields.
// canvas.ts, a copy of canvas.check.ts, checks the hand-written types of <novatrail-canvas> (R74) by
// tsconfigs of their own with the DOM, whose types the element's take; the corpus's tsconfigs have
// no DOM, which the module format's types must not need.
// The caller, `just types-check`, unpacks the package built of the working tree into the
// project's node_modules, so its exports are checked as well, and beside it the npm package of the
// contracts' code and the runtime of protobuf-es: the check of <novatrail-canvas> holds the
// element's marks to the contract's message (R83).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TYPESCRIPT_CONFIGS, TYPESCRIPT_STRICT, isMain } from "../shared.mjs";
import { ADMISSION_PACKAGE, CONSENT_AGE_PACKAGE, DEPLOYMENT_PACKAGE, EXPORT_PACKAGE, LEGAL_PACKAGE, OPEN, PACKAGE } from "./go.mjs";
import { NAME } from "./npm.mjs";

// Shared with the check of the contracts' code (tools/contracts/typescript.mjs).
export { TYPESCRIPT_CONFIGS as CONFIGS, TYPESCRIPT_STRICT as STRICT };
export const CANVAS_CHECK = fileURLToPath(new URL("canvas.check.ts", import.meta.url));
const CANVAS = "canvas.ts";
const CANVAS_LIB = ["es2022", "dom"];
const PACKAGES = { [PACKAGE]: `${NAME}/${PACKAGE}`, [OPEN]: `${NAME}/${PACKAGE}/${OPEN}`, [ADMISSION_PACKAGE]: `${NAME}/${ADMISSION_PACKAGE}`, [DEPLOYMENT_PACKAGE]: `${NAME}/${DEPLOYMENT_PACKAGE}`, [LEGAL_PACKAGE]: `${NAME}/${LEGAL_PACKAGE}`, [CONSENT_AGE_PACKAGE]: `${NAME}/${CONSENT_AGE_PACKAGE}`, [EXPORT_PACKAGE]: `${NAME}/${EXPORT_PACKAGE}` };

// The source of corpus.ts. Throws on a case whose type is of no package the npm package exports.
export function sourceOf(cases) {
  const lines = [`// The corpus of tools/types, ${cases.length} cases (tools/types/typescript.mjs).`, ""];
  for (const { file, type } of cases) {
    const [name, ...rest] = type.split(".");
    if (!Object.hasOwn(PACKAGES, name) || rest.length !== 1) throw new Error(`${file}: the type ${type} is of no package of ${NAME}`);
  }
  // Only the packages the cases are of: a package of an earlier line may lack the other parts'.
  const used = new Set(cases.map(({ type }) => type.split(".")[0]));
  for (const [name, from] of Object.entries(PACKAGES)) if (used.has(name)) lines.push(`import type * as ${name} from ${JSON.stringify(from)};`);
  cases.forEach(({ file, type, value, closed }, index) => {
    lines.push("", `// ${file}${closed ? `, whose closed fields ${type} has not` : ""}`);
    if (closed) lines.push("// @ts-expect-error");
    lines.push(`export const case${index}: ${type} = ${JSON.stringify(value)};`);
  });
  return `${lines.join("\n")}\n`;
}

export const canvasConfigOf = (file) => file.replace(/^tsconfig\./, "tsconfig.canvas.");

// Writes the project into folder, which must not exist yet; check is the text of the canvas check.
export function writeProject(cases, folder, check = fs.readFileSync(CANVAS_CHECK, "utf8")) {
  if (fs.existsSync(folder)) throw new Error(`${folder} is there already; the project goes into a new folder`);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "corpus.ts"), sourceOf(cases));
  fs.writeFileSync(path.join(folder, CANVAS), check);
  // A module of ES, as a consumer's is.
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
