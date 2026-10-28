// format-check: the checks of the module format in spec's format/ (R45 and its amendments, R46,
// R51, R56, R57, R58, R59, R60, R62; RUN.md, T25, T26, T28, T29, T30, T31, T32, T33 and T34).
//
//   node tools/format-check/main.mjs      spec's own format/, two levels above this file
//
// Finds the files by the layout of the format text, section 3, and checks:
// - VERSION: MAJOR.MINOR (R44);
// - each schema, schemas/<term>.schema.json, against the conventions of section 5 and the 2020-12
//   meta-schema, and that the schemas compile together;
// - each example, examples/<term>/valid/<case>.yaml and invalid/<case>.yaml: the YAML rules of
//   section 4, and its schema — a valid one passes it, an invalid one gives the error its first line
//   names (section 8);
// - each example of a whole module, examples/module/valid/<case>/, laid out as a module: its files
//   by the layout of section 10, the YAML rules and the schema of each file's part, and the rules of
//   a whole module — its manifest, its layout, the ids of the files at <id>, its media files, its
//   LICENSE and its plain texts —, and its canonical view passes the schema of a canonical view;
// - the rules the text lists, each with test vectors in vectors/rules/<rule>/, and each such folder
//   with its rule: a case of a YAML rule breaks that rule and no other; a case of a rule of a whole
//   module is a folder that breaks that rule and no other; a case of a part's rule follows the YAML
//   rules and passes the part's schema, and one laid out as a module follows the rules of a whole
//   module too (section 9). Of the rules of a task and of a lesson that it implements — those that
//   an answer slot's check shows by itself, task.no-leaks, lesson.no-leaks and the rules of
//   templates —, a case of one breaks it, and no other case breaks any, nor a valid example of a task
//   or of a whole module: a rule of a lesson spans files, so a valid example of a lesson alone goes
//   unchecked by it. A template breaks the rules of a task through its instances (sections 9, 20, 21
//   and 23);
// - the format version that each manifest names: the one in VERSION, but in the cases of
//   manifest.format-version, which name one no reader of it reads (section 11);
// - each vector of the open view, vectors/open-view/<part>/<case>/: part.yaml follows the YAML rules
//   and passes the part's schema, open-view.yaml follows the YAML rules, and the open view of the
//   part, built from the marks x-open (section 6), is open-view.yaml;
// - the vectors of verdicts, vectors/verdicts/<kind>/<case>.yaml, a folder for each check kind of the
//   task's schema that gives verdicts: each case follows the YAML rules and passes the schema of
//   verdict vectors, checks every answer slot by its folder's kind, and gives the verdicts that
//   section 15 computes — of a predicate, only blank and notation, since spec has no Starlark —
//   with the trap that each wrong value matches;
// - the vectors of the leak check, vectors/leaks/<case>.yaml: each case follows the YAML rules and
//   passes the schema of leak vectors, and the leak check of section 20 finds in each text what the
//   case lists;
// - the vectors of the generator, vectors/random/<case>.yaml: each case follows the YAML rules and
//   passes the schema of such vectors, its seed and names derive its state, and the functions of
//   section 22 give each value it lists, in order, on its stream;
// - the vectors of templates, vectors/templates/<case>.yaml: each case follows the YAML rules and
//   passes the schema of such vectors, its template breaks no rule of a task on any instance, and
//   section 23 gives the number of instances it lists and, for each seed, the instance it lists;
// - the vectors of tiers, vectors/tiers/<case>.yaml: each case follows the YAML rules and passes the
//   schema of such vectors, and section 12 gives the tier it lists for each skill of its graph;
// - the vectors of packages, vectors/packages/<case>/: module/ holds a module as an example of a
//   whole module does, package.yaml follows the YAML rules and passes the schema of such vectors, and
//   section 25 builds of module/ the server part, the listing of the device part, the inventory and
//   the digest that package.yaml lists, with the results of the solvers that it gives.
// Anything else in format/ is an error: what this check does not know would go unchecked, so the
// task that brings it extends the check. Prints one line per error, file:line: message, and exits 1
// if there are any.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { byCodeUnits, isMain } from "../shared.mjs";
import { LESSON_LEAKS, PACKAGE_FILE, PACKAGE_MODULE, checkExample, checkLeakVector, checkModuleCase, checkOpenView, checkPackageVector, checkRandomVector, checkTemplateVector, checkTierVector, checkVector, checkVerdictVector, compareOwnRules, isRuleId, partOf, readText } from "./cases.mjs";
import { listFolder, readLayout } from "./module.mjs";
import { checkConventions, compileSchemas, fragmentOf, isKebabCase, isSchemaName, readSchema } from "./schemas.mjs";
import { FEEDBACK_KINDS, VERDICT_KINDS } from "./verdicts.mjs";

const UNKNOWN = "format-check does not know it: the task that brings it to format/ extends the check";
// The vectors of the open view (section 9): a part, and the open view it gives.
const OPEN_VIEW = "open-view";
const OPEN_VIEW_FILES = ["part.yaml", "open-view.yaml"];
// The vectors of verdicts (section 9), and the schemas they read: theirs, and the task's, whose
// check kinds they are of.
const VERDICTS = "verdicts";
const VERDICT_VECTOR = "verdict-vector";
const TASK = "task";
// The vectors of the leak check (section 9), and their schema.
const LEAKS = "leaks";
const LEAK_VECTOR = "leak-vector";
// The vectors of the generator (section 22), and their schema.
const RANDOM = "random";
const RANDOM_VECTOR = "random-vector";
// The vectors of templates (section 23), and their schema.
const TEMPLATES = "templates";
const TEMPLATE_VECTOR = "template-vector";
// The vectors of tiers (section 12), and their schema.
const TIERS = "tiers";
const TIER_VECTOR = "tier-vector";
// The vectors of packages (section 25), and their schema, and the schema of the canonical view, by
// which the canonical view of each example of a whole module is checked.
const PACKAGES = "packages";
const PACKAGE_VECTOR = "package-vector";
const CANONICAL_VIEW = "canonical-view";
const README = "format/README.md";
// The schema of the definitions that the parts share.
const COMMON = "common";
// The examples of a whole module, which has no schema of its own.
const MODULE = "module";

export function checkFormat(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const files = readFiles(root, report);
  const version = readVersion(root, report);
  const schemas = readSchemas(root, files.schemas, version, report);
  const { rules, layout } = readFormatText(root, schemas, report);
  checkCases(root, files, { rules, layout, version, schemas }, report);

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line || byCodeUnits(a.message, b.message));
  const stats = { schemas: files.schemas.length, examples: files.examples.length, vectors: files.vectors.length, rules: rules?.length ?? 0, openViews: files.openViews.length, verdicts: files.verdicts.length, leaks: files.leaks.length, random: files.random.length, templates: files.templates.length, tiers: files.tiers.length, packages: files.packages.length };
  return { errors, stats };
}

// format/VERSION, MAJOR.MINOR and a newline (R44), or null.
function readVersion(root, report) {
  const file = "format/VERSION";
  if (!fs.existsSync(path.join(root, file))) {
    report(file, 0, "the format's version is missing");
    return null;
  }
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const version = text.endsWith("\n") ? text.slice(0, -1) : null;
  const parts = version?.split(".") ?? [];
  if (parts.length !== 2 || !parts.every((part) => part === "0" || /^[1-9][0-9]*$/.test(part))) {
    report(file, 1, "the version is MAJOR.MINOR and a newline, such as 0.1");
    return null;
  }
  return version;
}

// The schemas, checked and compiled: { has(term), validatorOf(term), forms, openView, checkKinds }. A term whose
// schema did not compile has no validator, and its files go unchecked, as is said once. forms holds
// isLocalId(name) and isMediaPath(path), the forms of common's local_id and media_path, by which the
// layout's <id> and module.media read names, or null when common has no such definition that
// compiled: then they go unchecked. openView holds byName and schemaAt, what the open view is built
// from. checkKinds is the enum of the task's $defs/check/properties/kind, or null when it has none.
function readSchemas(root, names, version, report) {
  const schemas = names.map((name) => readSchema(root, name));
  checkConventions(schemas, version);
  const { validators, schemaAt } = compileSchemas(schemas);
  const byTerm = new Map(schemas.map((schema) => [schema.term, schema]));
  for (const schema of schemas) for (const { line, message } of schema.problems) report(schema.file, line, message);
  const unchecked = new Set();
  const common = validators.has(COMMON) ? byTerm.get(COMMON).json.$id : null;
  const definition = (name) => (common ? schemaAt(`${common}${fragmentOf(["$defs", name])}`) : undefined);
  const localId = definition("local_id");
  const mediaPath = definition("media_path");
  if (common) {
    for (const [name, found] of [["local_id", localId], ["media_path", mediaPath]]) {
      if (!found) report(byTerm.get(COMMON).file, 0, `defines no ${name}, by which the layout's <id> and module.media read names`);
    }
  }
  const kinds = byTerm.get(TASK)?.json?.$defs?.check?.properties?.kind?.enum;
  return {
    checkKinds: Array.isArray(kinds) ? kinds : null,
    forms: { isLocalId: localId ? (name) => localId(name) : null, isMediaPath: mediaPath ? (media) => mediaPath(media) : null },
    openView: { byName: new Map(schemas.map((schema) => [schema.name, schema])), schemaAt },
    has: (term) => byTerm.has(term),
    validatorOf: (term) => {
      if (validators.has(term)) return validators.get(term);
      if (byTerm.has(term) && !unchecked.has(term)) {
        unchecked.add(term);
        report(byTerm.get(term).file, 0, "its examples and vectors go unchecked until its errors are fixed");
      }
      return undefined;
    },
  };
}

// The rules and the layout of a module that the text lists: rules null when there is no text to
// list them, and layout null when the text has none or it has errors.
function readFormatText(root, schemas, report) {
  if (!fs.existsSync(path.join(root, README))) {
    report(README, 0, "the text of the format is missing");
    return { rules: null, layout: null };
  }
  const text = readText(fs.readFileSync(path.join(root, README), "utf8"));
  for (const { line, message } of [...text.problems, ...compareOwnRules(text.rules)]) report(README, line, message);
  if (!text.layoutRows) return { rules: text.rules, layout: null };
  const { layout, problems } = readLayout(text.layoutRows);
  for (const { line, message } of problems) report(README, line, message);
  const missing = layout.filter((row) => row.part !== null && !schemas.has(row.part));
  for (const row of missing) report(README, row.line, `the layout names the part ${row.part}, and there is no schemas/${row.part}.schema.json`);
  return { rules: text.rules, layout: problems.length === 0 && missing.length === 0 ? layout : null };
}

// The examples and the test vectors, each against its schema and the rules it shows or breaks, and
// the rules of the text against the folders of their vectors.
function checkCases(root, files, { rules, layout, version, schemas }, report) {
  const schemaOf = (term, file, what) => {
    if (!schemas.has(term)) report(file, 0, `no schema ${term}.schema.json for ${what}`);
    return schemas.validatorOf(term);
  };
  let waiting = false;
  const waitForLayout = () => {
    if (rules && !waiting) {
      waiting = true;
      report(README, 0, "the cases laid out as a module go unchecked until the layout of a module is fixed");
    }
  };
  const validateView = schemas.has(CANONICAL_VIEW) ? schemas.validatorOf(CANONICAL_VIEW) : undefined;
  const checkFolder = (file, rule) => {
    if (!layout) return waitForLayout();
    for (const problem of checkModuleCase(path.join(root, file), { rule, layout, validatorOf: schemas.validatorOf, version, forms: schemas.forms, validateView })) {
      report(problem.file ? `${file}/${problem.file}` : file, problem.line, problem.message);
    }
  };

  for (const { file, term, kind, folder } of files.examples) {
    if (folder) {
      checkFolder(file, null);
      continue;
    }
    const validate = schemaOf(term, file, "the examples of this term");
    for (const { line, message } of checkExample(fs.readFileSync(path.join(root, file)), { kind, term, validate, version })) report(file, line, message);
  }
  if (rules) checkRuleFolders(files, rules, report);
  for (const { file, rule, folder } of files.vectors) {
    if (folder) {
      checkFolder(file, rule);
      continue;
    }
    const part = partOf(rule);
    const validate = part === "yaml" ? undefined : schemaOf(part, file, "the vectors of this part's rule");
    for (const { line, message } of checkVector(fs.readFileSync(path.join(root, file)), { rule, validate, version })) report(file, line, message);
  }
  for (const { file, term } of files.openViews) {
    if (!layout) {
      waitForLayout();
      continue;
    }
    if (!layout.some((row) => row.part === term)) {
      report(file, 0, `${term} is no part of the layout of a module: a vector of the open view is of a part`);
      continue;
    }
    const read = (name) => fs.readFileSync(path.join(root, file, name));
    for (const problem of checkOpenView(read("part.yaml"), read("open-view.yaml"), { term, validate: schemas.validatorOf(term), version, openView: schemas.openView })) {
      report(`${file}/${problem.file}`, problem.line, problem.message);
    }
  }
  checkVerdicts(root, files, schemas, report);
  checkLeaks(root, files, schemas, report);
  checkRandom(root, files, schemas, report);
  checkTemplates(root, files, schemas, report);
  checkTiers(root, files, schemas, report);
  checkPackages(root, files, { layout, version, schemas }, report, waitForLayout);
}

// The vectors of tiers: each case against the schema of such vectors and the tiers of section 12.
function checkTiers(root, files, schemas, report) {
  if (!files.tiers.length) return;
  if (!schemas.has(TIER_VECTOR)) {
    report(`format/vectors/${TIERS}`, 0, `no schema ${TIER_VECTOR}.schema.json for the vectors of tiers`);
    return;
  }
  const validate = schemas.validatorOf(TIER_VECTOR);
  for (const { file } of files.tiers) {
    for (const { line, message } of checkTierVector(fs.readFileSync(path.join(root, file)), { validate })) report(file, line, message);
  }
}

// The vectors of packages: each case's module against the rules of a whole module, and its package
// against the schema of such vectors and the package that section 25 builds.
function checkPackages(root, files, { layout, version, schemas }, report, waitForLayout) {
  if (!files.packages.length) return;
  if (!schemas.has(PACKAGE_VECTOR)) {
    report(`format/vectors/${PACKAGES}`, 0, `no schema ${PACKAGE_VECTOR}.schema.json for the vectors of packages`);
    return;
  }
  if (!layout) return waitForLayout();
  const validate = schemas.validatorOf(PACKAGE_VECTOR);
  for (const { file } of files.packages) {
    for (const problem of checkPackageVector(path.join(root, file), { layout, validatorOf: schemas.validatorOf, version, forms: schemas.forms, validate })) {
      report(`${file}/${problem.file}`, problem.line, problem.message);
    }
  }
}

// The vectors of the leak check: each case against the schema of leak vectors and the leak check of
// section 20.
function checkLeaks(root, files, schemas, report) {
  if (!files.leaks.length) return;
  if (!schemas.has(LEAK_VECTOR)) {
    report(`format/vectors/${LEAKS}`, 0, `no schema ${LEAK_VECTOR}.schema.json for the vectors of the leak check`);
    return;
  }
  const validate = schemas.validatorOf(LEAK_VECTOR);
  for (const { file } of files.leaks) {
    for (const { line, message } of checkLeakVector(fs.readFileSync(path.join(root, file)), { validate })) report(file, line, message);
  }
}

// The vectors of the generator: each case against the schema of such vectors and the generator of
// section 22.
function checkRandom(root, files, schemas, report) {
  if (!files.random.length) return;
  if (!schemas.has(RANDOM_VECTOR)) {
    report(`format/vectors/${RANDOM}`, 0, `no schema ${RANDOM_VECTOR}.schema.json for the vectors of the generator`);
    return;
  }
  const validate = schemas.validatorOf(RANDOM_VECTOR);
  for (const { file } of files.random) {
    for (const { line, message } of checkRandomVector(fs.readFileSync(path.join(root, file)), { validate })) report(file, line, message);
  }
}

// The vectors of templates: each case against the schema of such vectors, the rules of a task on its
// instances, and the instances of section 23.
function checkTemplates(root, files, schemas, report) {
  if (!files.templates.length) return;
  if (!schemas.has(TEMPLATE_VECTOR)) {
    report(`format/vectors/${TEMPLATES}`, 0, `no schema ${TEMPLATE_VECTOR}.schema.json for the vectors of templates`);
    return;
  }
  const validate = schemas.validatorOf(TEMPLATE_VECTOR);
  const validateTask = schemas.validatorOf(TASK);
  for (const { file } of files.templates) {
    for (const { line, message } of checkTemplateVector(fs.readFileSync(path.join(root, file)), { validate, validateTask, openView: schemas.openView })) report(file, line, message);
  }
}

// The vectors of verdicts: a folder for each check kind of the task's schema that gives verdicts,
// with its cases, and no other folder; each case against the schema of verdict vectors and the
// verdicts of section 15. A kind that format-check cannot compute is named at the task's schema.
function checkVerdicts(root, files, schemas, report) {
  const kinds = schemas.checkKinds;
  const schemaFile = `format/schemas/${TASK}.schema.json`;
  if (!kinds) {
    if (files.verdictFolders.length) report(`format/vectors/${VERDICTS}`, 0, `${schemaFile} names no check kinds in $defs/check/properties/kind: the vectors of verdicts go unchecked`);
    return;
  }
  const folderOf = (kind) => kind.replaceAll("_", "-");
  const withCases = new Set(files.verdicts.map((vector) => vector.kind));
  for (const kind of kinds) {
    if (VERDICT_KINDS.includes(kind)) {
      if (!withCases.has(folderOf(kind))) report(schemaFile, 0, `the check kind ${kind} has no vectors of verdicts in format/vectors/${VERDICTS}/${folderOf(kind)}/`);
    } else if (!FEEDBACK_KINDS.includes(kind)) {
      report(schemaFile, 0, `format-check computes no verdict of the check kind ${kind}: tools/format-check/verdicts.mjs has to`);
    }
  }
  const verdictKinds = new Map(kinds.filter((kind) => VERDICT_KINDS.includes(kind)).map((kind) => [folderOf(kind), kind]));
  for (const folder of files.verdictFolders) {
    if (!verdictKinds.has(folder.kind)) report(folder.file, 0, `no check kind of ${schemaFile} that gives verdicts is ${folder.kind}`);
  }
  if (!files.verdicts.length) return;
  if (!schemas.has(VERDICT_VECTOR)) {
    report(`format/vectors/${VERDICTS}`, 0, `no schema ${VERDICT_VECTOR}.schema.json for the vectors of verdicts`);
    return;
  }
  const validate = schemas.validatorOf(VERDICT_VECTOR);
  for (const { file, kind } of files.verdicts) {
    if (!verdictKinds.has(kind)) continue;
    for (const { line, message } of checkVerdictVector(fs.readFileSync(path.join(root, file)), { kind: verdictKinds.get(kind), validate })) report(file, line, message);
  }
}

// Each rule the text lists has vectors, and each folder of vectors has its rule in the text.
function checkRuleFolders(files, rules, report) {
  const listed = new Set(rules.map((rule) => rule.id));
  const withVectors = new Set(files.vectors.map((vector) => vector.rule));
  for (const rule of rules) {
    if (!withVectors.has(rule.id)) report(README, rule.line, `${rule.id} has no test vectors in format/vectors/rules/${rule.id}/`);
  }
  for (const folder of files.ruleFolders) {
    if (!listed.has(folder.rule)) report(folder.file, 0, `format/README.md lists no rule ${folder.rule}`);
  }
}

// The files of format/ by the layout of section 3, and an error for each one outside it. A case is a
// file, <case>.yaml, or a folder laid out as a module, <case>/: an example of a whole module is a
// folder, a case of a YAML rule a file, and a case of a rule of a whole module a folder. A vector of
// the open view is a folder of its own kind, vectors/open-view/<part>/<case>/, which holds
// part.yaml and open-view.yaml and nothing else; a vector of verdicts is a file,
// vectors/verdicts/<kind>/<case>.yaml, and so are a vector of the leak check, vectors/leaks/<case>.yaml,
// a vector of the generator, vectors/random/<case>.yaml, a vector of templates,
// vectors/templates/<case>.yaml, and a vector of tiers, vectors/tiers/<case>.yaml. A vector of
// packages is a folder, vectors/packages/<case>/, which holds module/ and package.yaml and nothing
// else.
function readFiles(root, report) {
  const files = { schemas: [], examples: [], vectors: [], ruleFolders: [], openViews: [], verdicts: [], verdictFolders: [], leaks: [], random: [], templates: [], tiers: [], packages: [] };
  if (!fs.existsSync(path.join(root, "format"))) {
    report("format", 0, "there is no format/");
    return files;
  }
  const at = { root, report, files };
  for (const entry of entriesOf(root, "format")) {
    if (entry.isFile && (entry.name === "README.md" || entry.name === "VERSION")) continue;
    if (!entry.isFolder) report(entry.file, 0, UNKNOWN);
    else if (entry.name === "schemas") readSchemaFiles(at, entry.file);
    else if (entry.name === "examples") readExampleFiles(at, entry.file);
    else if (entry.name === "vectors") readVectorFiles(at, entry.file);
    else report(entry.file, 0, UNKNOWN);
  }
  return files;
}

function entriesOf(root, dir) {
  return listFolder(path.join(root, dir)).map((entry) => ({ name: entry.name, file: `${dir}/${entry.name}`, isFile: entry.isFile(), isFolder: entry.isDirectory() }));
}

function readSchemaFiles({ root, report, files }, dir) {
  for (const schema of entriesOf(root, dir)) {
    if (schema.isFile && isSchemaName(schema.name)) files.schemas.push(schema.name);
    else report(schema.file, 0, `a schema is <term>.schema.json, its term in kebab-case; ${UNKNOWN}`);
  }
}

function readExampleFiles(at, dir) {
  const { root, report, files } = at;
  for (const term of entriesOf(root, dir)) {
    if (!term.isFolder || !isKebabCase(term.name)) {
      report(term.file, 0, `examples are in examples/<term>/, its term in kebab-case; ${UNKNOWN}`);
      continue;
    }
    for (const kind of entriesOf(root, term.file)) {
      const add = (file, folder) => files.examples.push({ file, term: term.name, kind: kind.name, folder });
      if (!kind.isFolder || (kind.name !== "valid" && kind.name !== "invalid")) report(kind.file, 0, `examples are in valid/ or invalid/; ${UNKNOWN}`);
      else if (term.name !== MODULE) readCases(at, kind.file, { onlyFile: `a case is <case>.yaml: an example laid out as a module is in examples/${MODULE}/valid/` }, add);
      else if (kind.name === "valid") readCases(at, kind.file, { onlyFolder: "an example of a whole module is a folder laid out as a module, <case>/" }, add);
      else report(kind.file, 0, "a whole module has no invalid examples: a module that breaks a rule of a whole module is a test vector of that rule");
    }
  }
}

function readVectorFiles(at, dir) {
  const { root, report, files } = at;
  for (const kind of entriesOf(root, dir)) {
    if (kind.isFolder && kind.name === OPEN_VIEW) {
      readOpenViewFiles(at, kind.file);
      continue;
    }
    if (kind.isFolder && kind.name === VERDICTS) {
      readVerdictFiles(at, kind.file);
      continue;
    }
    if (kind.isFolder && kind.name === LEAKS) {
      readCases(at, kind.file, { onlyFile: "a vector of the leak check is a file, <case>.yaml" }, (file) => at.files.leaks.push({ file }));
      continue;
    }
    if (kind.isFolder && kind.name === RANDOM) {
      readCases(at, kind.file, { onlyFile: "a vector of the generator is a file, <case>.yaml" }, (file) => at.files.random.push({ file }));
      continue;
    }
    if (kind.isFolder && kind.name === TEMPLATES) {
      readCases(at, kind.file, { onlyFile: "a vector of templates is a file, <case>.yaml" }, (file) => at.files.templates.push({ file }));
      continue;
    }
    if (kind.isFolder && kind.name === TIERS) {
      readCases(at, kind.file, { onlyFile: "a vector of tiers is a file, <case>.yaml" }, (file) => at.files.tiers.push({ file }));
      continue;
    }
    if (kind.isFolder && kind.name === PACKAGES) {
      readPackageFiles(at, kind.file);
      continue;
    }
    if (!kind.isFolder || kind.name !== "rules") {
      report(kind.file, 0, UNKNOWN);
      continue;
    }
    for (const folder of entriesOf(root, kind.file)) {
      if (!folder.isFolder || !isRuleId(folder.name)) {
        report(folder.file, 0, `vectors of a rule are in rules/<part>.<name>/, in kebab-case; ${UNKNOWN}`);
        continue;
      }
      files.ruleFolders.push({ file: folder.file, rule: folder.name });
      const add = (file, isFolder) => files.vectors.push({ file, rule: folder.name, folder: isFolder });
      const part = partOf(folder.name);
      const only = { yaml: { onlyFile: "a case of a YAML rule is a file, <case>.yaml: the rule is a file's" }, [MODULE]: { onlyFolder: "a case of a rule of a whole module is a folder laid out as a module, <case>/" } };
      const onlyFolder = { onlyFolder: `a case of ${LESSON_LEAKS} is a folder laid out as a module, <case>/: the rule spans a lesson and its tasks` };
      readCases(at, folder.file, folder.name === LESSON_LEAKS ? onlyFolder : (only[part] ?? {}), add);
    }
  }
}

function readOpenViewFiles({ root, report, files }, dir) {
  for (const term of entriesOf(root, dir)) {
    if (!term.isFolder || !isKebabCase(term.name)) {
      report(term.file, 0, `vectors of the open view are in open-view/<part>/<case>/, the part in kebab-case; ${UNKNOWN}`);
      continue;
    }
    for (const entry of entriesOf(root, term.file)) {
      if (!entry.isFolder || !isKebabCase(entry.name)) {
        report(entry.file, 0, `a vector of the open view is a folder <case>/, its name in kebab-case; ${UNKNOWN}`);
        continue;
      }
      const names = entriesOf(root, entry.file);
      const held = names.filter((name) => name.isFile).map((name) => name.name);
      const fits = names.length === OPEN_VIEW_FILES.length && OPEN_VIEW_FILES.every((name) => held.includes(name));
      if (fits) files.openViews.push({ file: entry.file, term: term.name });
      else report(entry.file, 0, `a vector of the open view holds ${OPEN_VIEW_FILES.join(" and ")}, and nothing else`);
    }
  }
}

function readPackageFiles({ root, report, files }, dir) {
  for (const entry of entriesOf(root, dir)) {
    if (!entry.isFolder || !isKebabCase(entry.name)) {
      report(entry.file, 0, `a vector of packages is a folder <case>/, its name in kebab-case; ${UNKNOWN}`);
      continue;
    }
    const names = entriesOf(root, entry.file);
    const fits = names.length === 2 && names.some((name) => name.isFolder && name.name === PACKAGE_MODULE) && names.some((name) => name.isFile && name.name === PACKAGE_FILE);
    if (fits) files.packages.push({ file: entry.file });
    else report(entry.file, 0, `a vector of packages holds the folder ${PACKAGE_MODULE}/ and ${PACKAGE_FILE}, and nothing else`);
  }
}

function readVerdictFiles(at, dir) {
  const { root, report, files } = at;
  for (const kind of entriesOf(root, dir)) {
    if (!kind.isFolder || !isKebabCase(kind.name)) {
      report(kind.file, 0, `vectors of verdicts are in verdicts/<kind>/<case>.yaml, the kind in kebab-case; ${UNKNOWN}`);
      continue;
    }
    files.verdictFolders.push({ file: kind.file, kind: kind.name });
    readCases(at, kind.file, { onlyFile: "a vector of verdicts is a file, <case>.yaml" }, (file) => files.verdicts.push({ file, kind: kind.name }));
  }
}

// The cases in dir: files <case>.yaml, unless onlyFolder says why a file is none there, and folders
// <case>/, unless onlyFile says why a folder is none; each name in kebab-case.
function readCases({ root, report }, dir, { onlyFile, onlyFolder }, add) {
  for (const entry of entriesOf(root, dir)) {
    const isFileCase = entry.isFile && entry.name.endsWith(".yaml") && isKebabCase(entry.name.slice(0, -".yaml".length));
    const isFolderCase = entry.isFolder && isKebabCase(entry.name);
    if (isFileCase) {
      if (onlyFolder) report(entry.file, 0, onlyFolder);
      else add(entry.file, false);
    } else if (isFolderCase) {
      if (onlyFile) report(entry.file, 0, onlyFile);
      else add(entry.file, true);
    } else if (onlyFile) report(entry.file, 0, `a case is <case>.yaml, its name in kebab-case; ${UNKNOWN}`);
    else if (onlyFolder) report(entry.file, 0, `a case is a folder <case>/, its name in kebab-case; ${UNKNOWN}`);
    else report(entry.file, 0, `a case is <case>.yaml, or a folder <case>/ laid out as a module, its name in kebab-case; ${UNKNOWN}`);
  }
}

if (isMain(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const { errors, stats } = checkFormat(root);
  for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.log(`format-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(`format-check: ok — ${stats.schemas} schemas, ${stats.examples} examples, ${stats.vectors} vectors of ${stats.rules} rules, ${stats.openViews} vectors of the open view, ${stats.verdicts} vectors of verdicts, ${stats.leaks} vectors of the leak check, ${stats.random} vectors of the generator, ${stats.templates} vectors of templates, ${stats.tiers} vectors of tiers, ${stats.packages} vectors of packages`);
  }
}
