// types: the types of the module format and of the admission table, generated from their schemas
// (R72, R96; RUN.md, T45, T61).
//
//   node tools/types/main.mjs <folder>      writes the files under <folder>, by their paths from
//                                           the root of the repository
//
// Reads spec's own format/, two levels above this file: the schemas, the version, and the parts of
// a module that the layout of the format text names; and admission/, its schemas and its version.
// Writes the Go of the models — the packages formatv0 and formatv0/open under types/, admissionv0
// beside them, and the registry of tools/types/roundtrip — as gofmt
// leaves it but for the alignment of a struct's fields, and the TypeScript of the same packages
// beside it, index.d.ts in each (R73): `just types` runs gofmt on them, and `just types-check`
// compares them, so run, with the files in the repository. A form of a schema the model does not
// know stops it with the place of that form.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readText } from "../format-check/cases.mjs";
import { readModuleFile } from "../format-check/yaml.mjs";
import { readLayout } from "../format-check/module.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { goFiles } from "./go.mjs";
import { tsFiles } from "./ts.mjs";
import { buildModel } from "./model.mjs";

const SCHEMAS = "format/schemas";
const ADMISSION = "admission";
const SUFFIX = ".schema.json";

// What the model is built of: { schemas, version, parts }, each schema { name, json }; version is
// format/VERSION's; parts the terms of the parts of a module, by the layout of the format text.
// Throws when one of them cannot be read: format-check names what is wrong with it.
export function readFormat(root) {
  const schemas = schemasIn(root, SCHEMAS);
  const version = fs.readFileSync(path.join(root, "format/VERSION"), "utf8").trim();
  const text = readText(fs.readFileSync(path.join(root, "format/README.md"), "utf8"));
  if (!text.layoutRows) throw new Error("format/README.md has no layout of a module: run just format-check");
  const { layout, problems } = readLayout(text.layoutRows);
  if (problems.length) throw new Error("format/README.md has errors in the layout of a module: run just format-check");
  const parts = [...new Set(layout.map((row) => row.part).filter((part) => part !== null))];
  return { schemas, version, parts };
}

// What the admission table's model is built of: { schemas, version }, as readFormat gives them, of
// admission/schemas and admission/VERSION (R96). The table has no open view. Its types are the
// package admissionv0, which holds the major version 0 alone: a major version of the table would
// need a package of its own, so another one stops the generator (R72).
export function readAdmission(root) {
  const version = fs.readFileSync(path.join(root, ADMISSION, "VERSION"), "utf8").trim();
  if (!version.startsWith("0.")) throw new Error(`admission/VERSION is ${version}: the types of the admission table are the package admissionv0, of its major version 0, and another major version needs a package of its own`);
  return { schemas: schemasIn(root, `${ADMISSION}/schemas`), version };
}

// The schemas of a folder of root, { name, json }, in the order of code units of their names.
function schemasIn(root, dir) {
  return fs
    .readdirSync(path.join(root, dir))
    .filter((name) => name.endsWith(SUFFIX))
    .sort(byCodeUnits)
    .map((name) => ({ name, json: JSON.parse(fs.readFileSync(path.join(root, dir, name), "utf8")) }));
}

// The page of the workbook as JSON, for code that reads no YAML (T88): format/page.yaml as
// types/page/page.json, and each vector of the page, format/vectors/pages/<case>.yaml, as
// types/page/vectors/<case>.json, which the npm package carries. None when the format has no page.
export const PAGE_DIR = "types/page";
export function pageFiles(root) {
  const json = (file) => {
    const { value, violations, notYaml } = readModuleFile(fs.readFileSync(path.join(root, file)));
    if (violations.length || notYaml.length || value === undefined) throw new Error(`${file} is not YAML within the rules: run just format-check`);
    return `${JSON.stringify(value, null, 2)}\n`;
  };
  if (!fs.existsSync(path.join(root, "format", "page.yaml"))) return [];
  const vectors = path.join(root, "format", "vectors", "pages");
  const cases = fs.existsSync(vectors) ? fs.readdirSync(vectors).filter((name) => name.endsWith(".yaml")).sort(byCodeUnits) : [];
  return [[`${PAGE_DIR}/page.json`, json("format/page.yaml")], ...cases.map((name) => [`${PAGE_DIR}/vectors/${name.replace(/\.yaml$/, ".json")}`, json(`format/vectors/pages/${name}`)])];
}

// The models and the files of the format and of the admission table at root, by their paths from
// the root of the repository: { model, admission, files }, admission the table's model.
export function generate(root) {
  const { schemas, version, parts } = readFormat(root);
  const model = buildModel(schemas, parts);
  const table = readAdmission(root);
  const admission = { model: buildModel(table.schemas, []), version: table.version };
  return { model, admission: admission.model, files: new Map([...goFiles(model, version, admission), ...tsFiles(model, version, admission), ...pageFiles(root)]) };
}

// Writes the files under folder, which holds no file of theirs yet.
export function writeFiles(files, folder) {
  for (const [file, text] of files) {
    const target = path.join(folder, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, { flag: "wx" });
  }
}

if (isMain(import.meta.url)) {
  const [folder, ...rest] = process.argv.slice(2);
  if (!folder || rest.length) {
    console.error("usage: node tools/types/main.mjs <folder>");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  try {
    writeFiles(generate(root).files, path.resolve(folder));
  } catch (error) {
    console.error(`types: ${error.message}`);
    process.exit(1);
  }
}
