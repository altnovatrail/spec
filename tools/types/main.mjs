// types: the types of the module format, generated from its schemas (R72; RUN.md, T45).
//
//   node tools/types/main.mjs <folder>      writes the files under <folder>, by their paths from
//                                           the root of the repository
//
// Reads spec's own format/, two levels above this file: the schemas, the version, and the parts of
// a module that the layout of the format text names. Writes the Go of the model — the packages
// formatv0 and formatv0/open under types/, and the registry of tools/types/roundtrip — as gofmt
// leaves it but for the alignment of a struct's fields: `just types` runs gofmt on them, and
// `just types-check` compares them, so run, with the files in the repository. A form of a schema
// the model does not know stops it with the place of that form.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readText } from "../format-check/cases.mjs";
import { readLayout } from "../format-check/module.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { goFiles } from "./go.mjs";
import { buildModel } from "./model.mjs";

const SCHEMAS = "format/schemas";
const SUFFIX = ".schema.json";

// What the model is built of: { schemas, version, parts }, each schema { name, json }; version is
// format/VERSION's; parts the terms of the parts of a module, by the layout of the format text.
// Throws when one of them cannot be read: format-check names what is wrong with it.
export function readFormat(root) {
  const names = fs
    .readdirSync(path.join(root, SCHEMAS))
    .filter((name) => name.endsWith(SUFFIX))
    .sort(byCodeUnits);
  const schemas = names.map((name) => ({ name, json: JSON.parse(fs.readFileSync(path.join(root, SCHEMAS, name), "utf8")) }));
  const version = fs.readFileSync(path.join(root, "format/VERSION"), "utf8").trim();
  const text = readText(fs.readFileSync(path.join(root, "format/README.md"), "utf8"));
  if (!text.layoutRows) throw new Error("format/README.md has no layout of a module: run just format-check");
  const { layout, problems } = readLayout(text.layoutRows);
  if (problems.length) throw new Error("format/README.md has errors in the layout of a module: run just format-check");
  const parts = [...new Set(layout.map((row) => row.part).filter((part) => part !== null))];
  return { schemas, version, parts };
}

// The model and the files of the format at root, by their paths from the root of the repository.
export function generate(root) {
  const { schemas, version, parts } = readFormat(root);
  const model = buildModel(schemas, parts);
  return { model, files: goFiles(model, version) };
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
