// The corpus of tools/types/roundtrip (R72; RUN.md, T45): every value of format/ that passes a
// schema, with the type of formatv0 that reads it, every value of admission/, with the type of
// admissionv0 (R96), every value of deployment/, with the type of deploymentv1 (R85), every value
// of legal/, with the type of legalv3 (R130), every value of consent-age/, with the type of
// consentagev1 (R134), and every value of export/, with the type of exportv2 (R135).
//
//   node tools/types/corpus.mjs <file>      writes the corpus of spec's own format/, admission/,
//                                           deployment/, legal/, consent-age/ and export/ to
//                                           <file>
//
// The corpus holds:
// - each valid example of a term, examples/<term>/valid/<case>.yaml;
// - each file of a part in a module: of each example of a whole module, examples/module/valid/, and
//   of each module of the vectors of packages and of the module index, and of each version laid out
//   as a module in the vectors of versions; and the canonical view of each example of a whole module;
// - each case of a part's rule that is a file, vectors/rules/<rule>/<case>.yaml: it passes the
//   part's schema (format/README.md, section 9);
// - each vector of verdicts, of the leak check, of the generator, of templates, of tiers, of
//   packages, of the module index and of versions;
// - each vector of the open view: its part, read by the part's type; its open view, read by the
//   type of open; and its part read by the type of open too, which a closed field of the part fails
//   when the part holds one;
// - of admission/: the table, each valid example, each vector of a rule — a table that passes its
//   schema — and each vector of answers;
// - of deployment/: each valid example of the file and each vector of reading, whose files are any
//   JSON value, as a reader gets them;
// - of legal/: the passport, each valid example of it and each vector of reading, whose passports
//   are any JSON value, as a reader gets them;
// - of consent-age/: the table, each valid example of it, each vector of reading, whose tables are
//   any JSON value, as a reader gets them, and each vector of the category;
// - of export/: each valid example of a file of an export, and each vector of reading, whose files
//   are any JSON value, as a reader gets them.
// Each case is { file, type, value, closed }: closed is true where reading the value fails on a
// field its type has not. A value that does not pass its schema, or a folder of vectors/ that the
// corpus does not know, is a problem: format-check names what is wrong with the first, and the task
// that brings the second extends the corpus. Prints the count of cases, or one line per problem and
// exits 1.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalText } from "../format-check/canonical.mjs";
import { partOf, readText } from "../format-check/cases.mjs";
import { idOf, listModule, placeFiles, readLayout } from "../format-check/module.mjs";
import { canonicalViewOf, memberOf } from "../format-check/package.mjs";
import { compileSchemas, fragmentOf, readSchema } from "../format-check/schemas.mjs";
import { isPackageFolder } from "../format-check/versions.mjs";
import { readModuleFile } from "../format-check/yaml.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { ADMISSION_PART, FOLDER as ADMISSION } from "../admission/main.mjs";
import { DEPLOYMENT_PART, FOLDER as DEPLOYMENT } from "../deployment/main.mjs";
import { LEGAL_PART, FOLDER as LEGAL } from "../legal/main.mjs";
import { CONSENT_AGE_PART, FOLDER as CONSENT_AGE } from "../consent-age/main.mjs";
import { EXPORT_PART, FOLDER as EXPORT } from "../export/main.mjs";
import { ADMISSION_PACKAGE, CONSENT_AGE_PACKAGE, DEPLOYMENT_PACKAGE, EXPORT_PACKAGE, LEGAL_PACKAGE, OPEN, PACKAGE } from "./go.mjs";
import { readAdmission, readConsentAge, readDeployment, readExport, readFormat, readLegal } from "./main.mjs";
import { buildModel } from "./model.mjs";

const FORMAT = "format";
// The vectors whose folders hold a file of a schema's for each case, by folder; those of verdicts in
// a folder for each check kind.
const VECTOR_FILES = { leaks: "leak-vector", random: "random-vector", templates: "template-vector", tiers: "tier-vector", pages: "page-vector" };
const VERDICTS = "verdicts";
const VERDICT_VECTOR = "verdict-vector";
// The vectors whose cases are folders: a module and its package, a release and its index.
const PACKAGES = "packages";
const PACKAGE_VECTOR = "package-vector";
const INDEXES = "indexes";
const INDEX_VECTOR = "index-vector";
// The vectors of versions: a new version and the published ones, each laid out as a module, or a
// published version of an earlier version of the format as a package as files, which the types of
// this version do not read.
const VERSIONS = "versions";
const VERSION_VECTOR = "version-vector";
const OPEN_VIEW = "open-view";
const RULES = "rules";
const CANONICAL_VIEW = "canonical-view";
const MODULE = "module";

// The corpus of the format at root, by the root types of model: { cases, problems }.
export function corpusOf(root, model) {
  const cases = [];
  const problems = [];
  const schemas = fs
    .readdirSync(path.join(root, FORMAT, "schemas"))
    .sort(byCodeUnits)
    .map((name) => readSchema(root, name));
  const { validators, schemaAt } = compileSchemas(schemas);
  const common = schemas.find((schema) => schema.term === "common")?.json?.$id;
  const definition = (name) => (common ? schemaAt(`${common}${fragmentOf(["$defs", name])}`) : undefined);
  const forms = { isLocalId: definition("local_id") ?? null, isMediaPath: definition("media_path") ?? null };
  const text = readText(fs.readFileSync(path.join(root, FORMAT, "README.md"), "utf8"));
  const { layout } = readLayout(text.layoutRows ?? []);
  const { read, add, list } = collector(root, { validators, model, packageName: PACKAGE, check: "format-check", cases, problems });
  const yamlFiles = (dir) => list(dir).filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"));

  // The files of the parts of a module's folder; and, when view is true, its canonical view.
  const addModule = (dir, view) => {
    const { rows } = placeFiles(listModule(path.join(root, dir)), layout, forms);
    const members = {};
    for (const [file, row] of rows) {
      if (!row?.part) continue;
      const value = read(`${dir}/${file}`);
      add(`${dir}/${file}`, row.part, value);
      if (row.id === null) members[memberOf(row)] = value;
      else (members[memberOf(row)] ??= {})[idOf(file, row)] = value;
    }
    if (!view) return;
    const built = canonicalViewOf(members);
    if (built.problem) problems.push(`${dir}: its canonical view cannot be built: run just format-check`);
    else add(`${dir} (its canonical view)`, CANONICAL_VIEW, built.view);
  };

  // The numbers and widths of the workbook's page, the one value of page.schema.json (section 14).
  if (fs.existsSync(path.join(root, FORMAT, "page.yaml"))) add(`${FORMAT}/page.yaml`, "page", read(`${FORMAT}/page.yaml`));

  for (const term of list(`${FORMAT}/examples`).map((entry) => entry.name)) {
    const dir = `${FORMAT}/examples/${term}/valid`;
    if (term === MODULE) for (const entry of list(dir)) addModule(`${dir}/${entry.name}`, true);
    else for (const entry of yamlFiles(dir)) add(`${dir}/${entry.name}`, term, read(`${dir}/${entry.name}`));
  }

  for (const folder of list(`${FORMAT}/vectors`).map((entry) => entry.name)) {
    const dir = `${FORMAT}/vectors/${folder}`;
    if (Object.hasOwn(VECTOR_FILES, folder)) for (const entry of yamlFiles(dir)) add(`${dir}/${entry.name}`, VECTOR_FILES[folder], read(`${dir}/${entry.name}`));
    else if (folder === VERDICTS) {
      for (const kind of list(dir)) for (const entry of yamlFiles(`${dir}/${kind.name}`)) add(`${dir}/${kind.name}/${entry.name}`, VERDICT_VECTOR, read(`${dir}/${kind.name}/${entry.name}`));
    } else if (folder === PACKAGES) {
      for (const entry of list(dir)) {
        addModule(`${dir}/${entry.name}/module`, false);
        add(`${dir}/${entry.name}/package.yaml`, PACKAGE_VECTOR, read(`${dir}/${entry.name}/package.yaml`));
      }
    } else if (folder === INDEXES) {
      for (const entry of list(dir)) {
        for (const module of list(`${dir}/${entry.name}/modules`)) addModule(`${dir}/${entry.name}/modules/${module.name}`, false);
        add(`${dir}/${entry.name}/index.yaml`, INDEX_VECTOR, read(`${dir}/${entry.name}/index.yaml`));
      }
    } else if (folder === VERSIONS) {
      for (const entry of list(dir)) {
        addModule(`${dir}/${entry.name}/module`, false);
        for (const version of list(`${dir}/${entry.name}/published`)) {
          const at = `${dir}/${entry.name}/published/${version.name}`;
          if (!isPackageFolder(list(at).map((file) => file.name))) addModule(at, false);
        }
        add(`${dir}/${entry.name}/version.yaml`, VERSION_VECTOR, read(`${dir}/${entry.name}/version.yaml`));
      }
    } else if (folder === OPEN_VIEW) {
      for (const term of list(dir)) for (const entry of list(`${dir}/${term.name}`)) addOpenView(`${dir}/${term.name}/${entry.name}`, term.name);
    } else if (folder === RULES) {
      // A case of a part's rule that is a file passes the part's schema; the cases of the YAML rules
      // do not, and the cases laid out as a module break a rule of a whole module or of many files.
      for (const rule of list(dir)) {
        const part = partOf(rule.name);
        if (!model.roots.has(part)) continue;
        for (const entry of yamlFiles(`${dir}/${rule.name}`)) add(`${dir}/${rule.name}/${entry.name}`, part, read(`${dir}/${rule.name}/${entry.name}`));
      }
    } else problems.push(`${dir}: tools/types does not know these vectors: the task that brings them extends the corpus`);
  }

  // A vector of the open view: its part, its open view, and its part read by the open view's type.
  function addOpenView(dir, term) {
    const part = read(`${dir}/part.yaml`);
    const view = read(`${dir}/open-view.yaml`);
    add(`${dir}/part.yaml`, term, part);
    if (view === undefined || part === undefined) return;
    const type = `${OPEN}.${model.roots.get(term)}`;
    cases.push({ file: `${dir}/open-view.yaml`, type, value: view, closed: false });
    cases.push({ file: `${dir}/part.yaml`, type, value: part, closed: canonicalText(part) !== canonicalText(view) });
  }

  return { cases, problems };
}

// What both corpora read and add their cases by: { read, add, list }. read gives the value of a
// YAML file, or undefined and a problem; add puts a value of a term's schema in the corpus when it
// passes the schema, as the type of the term's root in packageName; list gives the entries of a
// folder, none when it is not there. A problem names the check that says what is wrong.
function collector(root, { validators, model, packageName, check, cases, problems }) {
  const read = (file) => {
    const { value } = readModuleFile(fs.readFileSync(path.join(root, file)));
    if (value === undefined) problems.push(`${file}: breaks the YAML rules: run just ${check}`);
    return value;
  };
  const add = (file, term, value) => {
    if (value === undefined) return;
    const validate = validators.get(term);
    if (!validate || !model.roots.has(term)) problems.push(`${file}: no schema of ${term} compiles to a type: run just ${check}`);
    else if (!validate(value)) problems.push(`${file}: does not pass the schema of ${term}: run just ${check}`);
    else cases.push({ file, type: `${packageName}.${model.roots.get(term)}`, value, closed: false });
  };
  const list = (dir) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => byCodeUnits(a.name, b.name)) : []);
  return { read, add, list };
}

// The corpus of the admission table at root, by the root types of its model: { cases, problems }.
export function admissionCorpusOf(root, model) {
  const cases = [];
  const problems = [];
  const schemas = fs
    .readdirSync(path.join(root, ADMISSION, "schemas"))
    .sort(byCodeUnits)
    .map((name) => readSchema(root, name, ADMISSION_PART));
  const { validators } = compileSchemas(schemas);
  const { read, add, list } = collector(root, { validators, model, packageName: ADMISSION_PACKAGE, check: "admission-check", cases, problems });
  // The table is JSON, as admission-check reads it: one that is not is a problem of the corpus, not
  // an error of the command.
  const table = `${ADMISSION}/admission-table.json`;
  let value;
  try {
    value = JSON.parse(fs.readFileSync(path.join(root, table), "utf8"));
  } catch {
    problems.push(`${table}: not JSON: run just admission-check`);
  }
  add(table, "admission-table", value);
  for (const term of list(`${ADMISSION}/examples`)) {
    for (const entry of list(`${ADMISSION}/examples/${term.name}/valid`)) add(`${ADMISSION}/examples/${term.name}/valid/${entry.name}`, term.name, read(`${ADMISSION}/examples/${term.name}/valid/${entry.name}`));
  }
  for (const folder of list(`${ADMISSION}/vectors`)) {
    const dir = `${ADMISSION}/vectors/${folder.name}`;
    if (folder.name === "answers") for (const entry of list(dir)) add(`${dir}/${entry.name}`, "answer-vector", read(`${dir}/${entry.name}`));
    else if (folder.name === RULES) {
      for (const rule of list(dir)) for (const entry of list(`${dir}/${rule.name}`)) add(`${dir}/${rule.name}/${entry.name}`, partOf(rule.name), read(`${dir}/${rule.name}/${entry.name}`));
    } else problems.push(`${dir}: tools/types does not know these vectors: the task that brings them extends the corpus`);
  }
  return { cases, problems };
}

// The corpus of a normative part at root whose values are its examples, its vectors and the files
// it names, by the root types of its model: { cases, problems }. part is { folder, schemaPart,
// packageName, check, files, vectors }: the part's folder, its part of the schemas' conventions,
// the package of its types, the check that names what is wrong with a value, the files of the part
// that are values of a term, [file, term] by their paths from root, and the term of each folder of
// vectors, by its name, which is reading's alone unless given.
export function partCorpusOf(root, model, { folder, schemaPart, packageName, check, files = [], vectors: terms = { reading: "reading-vector" } }) {
  const cases = [];
  const problems = [];
  const schemas = fs
    .readdirSync(path.join(root, folder, "schemas"))
    .sort(byCodeUnits)
    .map((name) => readSchema(root, name, schemaPart));
  const { validators } = compileSchemas(schemas);
  const { read, add, list } = collector(root, { validators, model, packageName, check, cases, problems });
  for (const [file, term] of files) add(file, term, read(file));
  for (const term of list(`${folder}/examples`)) {
    for (const entry of list(`${folder}/examples/${term.name}/valid`)) add(`${folder}/examples/${term.name}/valid/${entry.name}`, term.name, read(`${folder}/examples/${term.name}/valid/${entry.name}`));
  }
  for (const vectors of list(`${folder}/vectors`)) {
    const dir = `${folder}/vectors/${vectors.name}`;
    if (Object.hasOwn(terms, vectors.name)) for (const entry of list(dir)) add(`${dir}/${entry.name}`, terms[vectors.name], read(`${dir}/${entry.name}`));
    else problems.push(`${dir}: tools/types does not know these vectors: the task that brings them extends the corpus`);
  }
  return { cases, problems };
}

// The corpus of the deployment configuration at root, by the root types of its model: each valid
// example of the file and each vector of reading.
export function deploymentCorpusOf(root, model) {
  return partCorpusOf(root, model, { folder: DEPLOYMENT, schemaPart: DEPLOYMENT_PART, packageName: DEPLOYMENT_PACKAGE, check: "deployment-check" });
}

// The corpus of the legal texts at root, by the root types of its model: the passport, each valid
// example of it and each vector of reading.
export function legalCorpusOf(root, model) {
  return partCorpusOf(root, model, { folder: LEGAL, schemaPart: LEGAL_PART, packageName: LEGAL_PACKAGE, check: "legal-check", files: [[`${LEGAL}/legal.yaml`, "legal"]] });
}

// The corpus of the table of the age of digital consent at root, by the root types of its model:
// the table, each valid example of it, each vector of reading and each vector of the category.
export function consentAgeCorpusOf(root, model) {
  return partCorpusOf(root, model, { folder: CONSENT_AGE, schemaPart: CONSENT_AGE_PART, packageName: CONSENT_AGE_PACKAGE, check: "consent-age-check", files: [[`${CONSENT_AGE}/consent-age.yaml`, "consent-age"]], vectors: { reading: "reading-vector", category: "category-vector" } });
}

// The corpus of the format of the export at root, by the root types of its model: each valid example
// of a file of an export and each vector of reading.
export function exportCorpusOf(root, model) {
  return partCorpusOf(root, model, { folder: EXPORT, schemaPart: EXPORT_PART, packageName: EXPORT_PACKAGE, check: "export-check" });
}

if (isMain(import.meta.url)) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file || rest.length) {
    console.error("usage: node tools/types/corpus.mjs <file>");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const { schemas, parts } = readFormat(root);
  const format = corpusOf(root, buildModel(schemas, parts));
  const admission = admissionCorpusOf(root, buildModel(readAdmission(root).schemas, []));
  const configuration = readDeployment(root);
  const deployment = deploymentCorpusOf(root, buildModel(configuration.schemas, [], configuration.options));
  const part = readLegal(root);
  const legal = legalCorpusOf(root, buildModel(part.schemas, [], part.options));
  const ages = readConsentAge(root);
  const consentAge = consentAgeCorpusOf(root, buildModel(ages.schemas, [], ages.options));
  const exportPart = readExport(root);
  const exported = exportCorpusOf(root, buildModel(exportPart.schemas, [], exportPart.options));
  const cases = [...format.cases, ...admission.cases, ...deployment.cases, ...legal.cases, ...consentAge.cases, ...exported.cases];
  const problems = [...format.problems, ...admission.problems, ...deployment.problems, ...legal.problems, ...consentAge.problems, ...exported.problems];
  for (const problem of problems) console.error(`corpus: ${problem}`);
  if (problems.length) process.exit(1);
  fs.writeFileSync(file, JSON.stringify(cases));
  console.log(`corpus: ${cases.length} cases`);
}
