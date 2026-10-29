// The check of the TypeScript of the module format by its compiler (R73): each case of the corpus
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
// The package goes into the project's node_modules/@altnovatrail/spec, which `just types-check`
// unpacks from the archive that tools/types/npm.mjs builds of the working tree: so the package's
// exports are checked as well. Then the recipe runs tsc on each tsconfig.

import fs from "node:fs";
import path from "node:path";
import { isMain } from "../shared.mjs";
import { OPEN, PACKAGE } from "./go.mjs";
import { NAME } from "./npm.mjs";

// The tsconfig of each resolution of modules, by its file name.
export const CONFIGS = {
  "tsconfig.nodenext.json": { module: "nodenext", moduleResolution: "nodenext" },
  "tsconfig.bundler.json": { module: "preserve", moduleResolution: "bundler" },
};
const STRICT = {
  target: "es2022",
  lib: ["es2022"],
  types: [],
  strict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  verbatimModuleSyntax: true,
  isolatedModules: true,
  skipLibCheck: false,
  noEmit: true,
};
// The packages a case's type may be of, each by the path the npm package exports it at.
const PACKAGES = { [PACKAGE]: `${NAME}/${PACKAGE}`, [OPEN]: `${NAME}/${PACKAGE}/${OPEN}` };

// The source of corpus.ts: a declaration of each case, each named by its place in the corpus.
export function sourceOf(cases) {
  const lines = [`// The corpus of tools/types, ${cases.length} cases (tools/types/typescript.mjs).`, ""];
  for (const [name, from] of Object.entries(PACKAGES)) lines.push(`import type * as ${name} from ${JSON.stringify(from)};`);
  cases.forEach(({ file, type, value, closed }, index) => {
    const [name, ...rest] = type.split(".");
    if (!Object.hasOwn(PACKAGES, name) || rest.length !== 1) throw new Error(`${file}: the type ${type} is of no package of ${NAME}`);
    lines.push("", `// ${file}${closed ? `, whose closed fields ${type} has not` : ""}`);
    if (closed) lines.push("// @ts-expect-error");
    lines.push(`export const case${index}: ${type} = ${JSON.stringify(value)};`);
  });
  return `${lines.join("\n")}\n`;
}

// Writes the project of the cases into folder, a new one.
export function writeProject(cases, folder) {
  if (fs.existsSync(folder)) throw new Error(`${folder} is there already; the project goes into a new folder`);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "corpus.ts"), sourceOf(cases));
  // The project's own package.json makes corpus.ts a module of ES, as a consumer's is.
  fs.writeFileSync(path.join(folder, "package.json"), `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`);
  for (const [file, resolution] of Object.entries(CONFIGS)) {
    const config = { compilerOptions: { ...resolution, ...STRICT }, files: ["corpus.ts"] };
    fs.writeFileSync(path.join(folder, file), `${JSON.stringify(config, null, 2)}\n`);
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
    console.log(`typescript: ${cases.length} cases, ${Object.keys(CONFIGS).length} configurations`);
  } catch (error) {
    console.error(`typescript: ${error.message}`);
    process.exit(1);
  }
}
