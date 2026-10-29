// The corpus of tools/types/roundtrip (R72; RUN.md, T45): every value of format/ that passes a
// schema, with the type of formatv0 that reads it.
//
//   node tools/types/corpus.mjs <file>      writes the corpus of spec's own format/ to <file>
//
// The corpus holds:
// - each valid example of a term, examples/<term>/valid/<case>.yaml;
// - each file of a part in a module: of each example of a whole module, examples/module/valid/, and
//   of each module of the vectors of packages and of the module index; and the canonical view of
//   each example of a whole module;
// - each case of a part's rule that is a file, vectors/rules/<rule>/<case>.yaml: it passes the
//   part's schema (format/README.md, section 9);
// - each vector of verdicts, of the leak check, of the generator, of templates, of tiers, of
//   packages and of the module index;
// - each vector of the open view: its part, read by the part's type; its open view, read by the
//   type of open; and its part read by the type of open too, which a closed field of the part fails
//   when the part holds one.
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
import { readModuleFile } from "../format-check/yaml.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { OPEN, PACKAGE } from "./go.mjs";
import { readFormat } from "./main.mjs";
import { buildModel } from "./model.mjs";

const FORMAT = "format";
// The vectors whose folders hold a file of a schema's for each case, by folder; those of verdicts in
// a folder for each check kind.
const VECTOR_FILES = { leaks: "leak-vector", random: "random-vector", templates: "template-vector", tiers: "tier-vector" };
const VERDICTS = "verdicts";
const VERDICT_VECTOR = "verdict-vector";
// The vectors whose cases are folders: a module and its package, a release and its index.
const PACKAGES = "packages";
const PACKAGE_VECTOR = "package-vector";
const INDEXES = "indexes";
const INDEX_VECTOR = "index-vector";
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

  const read = (file) => {
    const { value } = readModuleFile(fs.readFileSync(path.join(root, file)));
    if (value === undefined) problems.push(`${file}: breaks the YAML rules: run just format-check`);
    return value;
  };
  const typeOf = (term) => `${PACKAGE}.${model.roots.get(term)}`;
  // A value of a term's schema: in the corpus when it passes the schema.
  const add = (file, term, value) => {
    if (value === undefined) return;
    const validate = validators.get(term);
    if (!validate || !model.roots.has(term)) problems.push(`${file}: no schema of ${term} compiles to a type: run just format-check`);
    else if (!validate(value)) problems.push(`${file}: does not pass the schema of ${term}: run just format-check`);
    else cases.push({ file, type: typeOf(term), value, closed: false });
  };
  const list = (dir) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => byCodeUnits(a.name, b.name)) : []);
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

if (isMain(import.meta.url)) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file || rest.length) {
    console.error("usage: node tools/types/corpus.mjs <file>");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const { schemas, parts } = readFormat(root);
  const { cases, problems } = corpusOf(root, buildModel(schemas, parts));
  for (const problem of problems) console.error(`corpus: ${problem}`);
  if (problems.length) process.exit(1);
  fs.writeFileSync(file, JSON.stringify(cases));
  console.log(`corpus: ${cases.length} cases`);
}
