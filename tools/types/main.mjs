// types: the types of the module format, of the admission table, of the deployment configuration,
// of the legal texts, of the table of the age of digital consent and of the format of the export,
// generated from their schemas (R72, R96, R85, R130, R134, R135; RUN.md, T45, T61, T91, T96, T100,
// T101).
//
//   node tools/types/main.mjs <folder>      writes the files under <folder>, by their paths from
//                                           the root of the repository
//
// Reads spec's own format/, two levels above this file: the schemas, the version, and the parts of
// a module that the layout of the format text names; and admission/, deployment/, legal/,
// consent-age/ and export/, the schemas and the version of each. Writes the Go of the models — the
// packages formatv0 and formatv0/open under types/, admissionv0, deploymentv1, legalv1,
// consentagev1 and exportv1 beside them, and the registry
// of tools/types/roundtrip — as gofmt
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
const DEPLOYMENT = "deployment";
const LEGAL = "legal";
const CONSENT_AGE = "consent-age";
const EXPORT = "export";
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

// What the deployment configuration's model is built of: { schemas, version, options }, of
// deployment/schemas and deployment/VERSION (R85), and the options of buildModel: a vector's file
// holds any JSON value. It has no open view. Its types are the package
// deploymentv1, which holds the version 1 alone: every change of the configuration is a new
// version (deployment/README.md, section 2), which would need a package of its own, so another one
// stops the generator (R72).
export function readDeployment(root) {
  const version = fs.readFileSync(path.join(root, DEPLOYMENT, "VERSION"), "utf8").trim();
  if (version !== "1") throw new Error(`deployment/VERSION is ${version}: the types of the deployment configuration are the package deploymentv1, of its version 1, and another version needs a package of its own`);
  return { schemas: schemasIn(root, `${DEPLOYMENT}/schemas`), version, options: { anyValue: true } };
}

// What the legal texts' model is built of: { schemas, version, options }, of legal/schemas and
// legal/VERSION (R130), and the options of buildModel: a vector's passport holds any JSON value.
// It has no open view. Its types are the package legalv1, which holds the part's version 1 alone:
// another version is a change of the part's layout, schema or rules (legal/README.md, section 2),
// which would need a package of its own, so another one stops the generator (R72).
export function readLegal(root) {
  const version = fs.readFileSync(path.join(root, LEGAL, "VERSION"), "utf8").trim();
  if (version !== "1") throw new Error(`legal/VERSION is ${version}: the types of the legal texts are the package legalv1, of the part's version 1, and another version needs a package of its own`);
  return { schemas: schemasIn(root, `${LEGAL}/schemas`), version, options: { anyValue: true } };
}

// What the model of the table of the age of digital consent is built of: { schemas, version,
// options }, of consent-age/schemas and consent-age/VERSION (R134), and the options of buildModel: a
// vector of reading's table holds any JSON value. It has no open view. Its types are the package
// consentagev1, which holds the part's version 1 alone: another version is a change of the part's
// layout, schema or rules (consent-age/README.md, section 2), which would need a package of its
// own, so another one stops the generator (R72).
export function readConsentAge(root) {
  const version = fs.readFileSync(path.join(root, CONSENT_AGE, "VERSION"), "utf8").trim();
  if (version !== "1") throw new Error(`consent-age/VERSION is ${version}: the types of the table of the age of digital consent are the package consentagev1, of the part's version 1, and another version needs a package of its own`);
  return { schemas: schemasIn(root, `${CONSENT_AGE}/schemas`), version, options: { anyValue: true } };
}

// What the model of the format of the export is built of: { schemas, version, options }, of
// export/schemas and export/VERSION (R135), and the options of buildModel: a field of the JSON of a
// message of protobuf, or of a value of <novatrail-canvas>, and a vector's file, hold any JSON value.
// It has no open view. Its types are the package exportv1, which holds the part's version 1 alone
// (export/README.md, section 2), so another one stops the generator (R72).
export function readExport(root) {
  const version = fs.readFileSync(path.join(root, EXPORT, "VERSION"), "utf8").trim();
  if (version !== "1") throw new Error(`export/VERSION is ${version}: the types of the format of the export are the package exportv1, of the part's version 1, and another version needs a package of its own`);
  return { schemas: schemasIn(root, `${EXPORT}/schemas`), version, options: { anyValue: true } };
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

// The models and the files of the format, of the admission table, of the deployment configuration,
// of the legal texts and of the table of the age of digital consent at root, by their paths from
// the root of the repository: { model, admission, deployment, legal, consentAge, exported, files },
// admission the admission table's model, deployment the configuration's, legal the legal texts',
// consentAge the table of the age of digital consent's and exported the format of the export's.
export function generate(root) {
  const { schemas, version, parts } = readFormat(root);
  const model = buildModel(schemas, parts);
  const table = readAdmission(root);
  const admission = { model: buildModel(table.schemas, []), version: table.version };
  const configuration = readDeployment(root);
  const deployment = { model: buildModel(configuration.schemas, [], configuration.options), version: configuration.version };
  const part = readLegal(root);
  const legal = { model: buildModel(part.schemas, [], part.options), version: part.version };
  const ages = readConsentAge(root);
  const consentAge = { model: buildModel(ages.schemas, [], ages.options), version: ages.version };
  const exportPart = readExport(root);
  const exported = { model: buildModel(exportPart.schemas, [], exportPart.options), version: exportPart.version };
  const files = new Map([...goFiles(model, version, admission, deployment, legal, consentAge, exported), ...tsFiles(model, version, admission, deployment, legal, consentAge, exported), ...pageFiles(root)]);
  return { model, admission: admission.model, deployment: deployment.model, legal: legal.model, consentAge: consentAge.model, exported: exported.model, files };
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
