// The examples and test vectors of the module format, and the rules and the layout of a module its
// text lists (format/README.md, sections 7–12, 15, 20–23, 25 and 26; R45 and its amendment of
// 2026-10-22, R46, R56, R57, R58, R59, R60, R62, R63).

import fs from "node:fs";
import path from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { byCodeUnits } from "../shared.mjs";
import { INDEX_PART, INDEX_RULES, indexFormProblems, indexOf } from "./index.mjs";
import { MANIFEST_PART, MODULE_RULES, VERSION_FIELD, VERSION_RULE, idOf, listFolder, listModule, mediaBreaches, placeFiles, textBreaches, versionProblem } from "./module.mjs";
import { differenceOf, openViewOf } from "./openview.mjs";
import { canonicalViewOf, memberOf, packageOf, tiersOf } from "./package.mjs";
import { fragmentOf, isKebabCase } from "./schemas.mjs";
import { leaksBefore, leaksIn, lessonLeaks, needlesOf } from "./leaks.mjs";
import { MAX_SIGNED, MAX_UNSIGNED, MIN_SIGNED, below, between, fraction, permutation, stateOf, streamOf } from "./random.mjs";
import { instanceMaker, instanceShown, numbersShown, pickOf, resultsOf, solverInputsOf, templateOf, withoutResults } from "./templates.mjs";
import { answerSlotsOf, itemVerdict, slotBreaches, slotVerdict, trapOf } from "./verdicts.mjs";
import { YAML_RULES, readModuleFile } from "./yaml.mjs";

// What an invalid example never names: the keyword that failed inside them is named instead
// (format/README.md, section 8).
const NEVER_NAMED = new Set(["$ref", "allOf", "properties", "items", "if", "then", "else"]);
const HEADER = "# error: ";
// The part of a task, whose rules format-check implements in part.
const TASK_PART = "task";
// The rules of a task that format-check implements, and so checks on every task it reads: those
// that an answer slot's check shows by itself (section 15), task.no-leaks (section 20), and the rules
// of templates (section 23), which it checks with the others on every instance of a template. Not
// task.template-solver: only module-kit runs a solver (section 24).
const TASK_RULES = ["task.choice-key", "task.choice-options", "task.fraction-key", "task.trap-values", "task.no-leaks", "task.template-names", "task.template-expressions", "task.placeholders", "task.template-instances", "task.instances"];
// The part of a lesson, and the rule of a lesson that format-check implements, with its leak check
// (section 21). The rule spans a lesson and its tasks, so its cases are laid out as modules.
const LESSON_PART = "lesson";
export const LESSON_LEAKS = "lesson.no-leaks";
// Every rule of a part that format-check implements: a case of one breaks it, and a case of any
// other rule breaks none of them.
const IMPLEMENTED_RULES = [...TASK_RULES, LESSON_LEAKS];

// What the text lists in its tables: the rows of each table whose first column is headed ID, each a
// rule's ID, <part>.<name>, and its statement (section 7); and the rows of the table whose first
// column is headed Path, the layout of a module, each a path and its part (section 10). Other tables
// are neither, whatever their first cells look like. { rules: [{ id, line }], layoutRows: [{ path,
// part, line }] or null when no table is headed Path, problems: [{ line, message }] }.
export function readText(readme) {
  const rules = [];
  let layoutRows = null;
  const problems = [];
  const lines = new Map();
  const visit = (node) => {
    if (node.type !== "table") {
      for (const child of node.children ?? []) visit(child);
      return;
    }
    const [header, ...rows] = node.children;
    const heading = cellText(header.children[0]);
    if (heading === "Path") {
      if (layoutRows) problems.push({ line: node.position.start.line, message: "a second layout of a module: the text has one table headed Path" });
      else layoutRows = rows.map((row) => ({ path: cellText(row.children[0]), part: cellText(row.children[1]), line: row.position.start.line }));
      return;
    }
    if (heading !== "ID") return;
    for (const row of rows) {
      const id = cellText(row.children[0]);
      const line = row.position.start.line;
      if (!isRuleId(id)) problems.push({ line, message: `${JSON.stringify(id)}: a rule's ID is <part>.<name>, each in kebab-case` });
      else if (lines.has(id)) problems.push({ line, message: `the rule ${id} again, after line ${lines.get(id)}` });
      else {
        lines.set(id, line);
        rules.push({ id, line });
      }
    }
  };
  visit(fromMarkdown(readme, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }));
  if (!layoutRows) problems.push({ line: 0, message: "the text has no layout of a module: a table whose first column is headed Path" });
  return { rules, layoutRows, problems };
}

function cellText(node) {
  if (!node) return "";
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(cellText).join("").trim();
}

// <part>.<name>, each in kebab-case: skill-graph.acyclic, yaml.no-tags.
export function isRuleId(text) {
  const parts = text.split(".");
  return parts.length === 2 && parts.every(isKebabCase);
}

export function partOf(rule) {
  return rule.split(".")[0];
}

// The rules format-check checks itself against those the text lists: the YAML rules, the rules of a
// whole module and, when the format has a schema of the module index, the rules of the index, each side with every rule
// of the other; and manifest.format-version, whose cases
// it tells apart by the version they name. Problems at the rules' lines in README.md, or at none.
export function compareOwnRules(rules, hasIndex = false) {
  const problems = [];
  for (const [part, own, file] of [
    ["yaml", YAML_RULES, "yaml.mjs"],
    ["module", MODULE_RULES, "module.mjs"],
    [INDEX_PART, INDEX_RULES, "index.mjs"],
  ]) {
    const listed = new Set(rules.filter((rule) => partOf(rule.id) === part).map((rule) => rule.id));
    // A format without a module index, as a trial one may be, has none of its rules.
    if (part === INDEX_PART && !hasIndex) continue;
    for (const id of listed) {
      if (!own.includes(id)) problems.push({ line: rules.find((rule) => rule.id === id).line, message: `format-check does not check ${id}: tools/format-check/${file} has to` });
    }
    for (const id of own) if (!listed.has(id)) problems.push({ line: 0, message: `format-check checks ${id}, and the text does not list it` });
  }
  if (!rules.some((rule) => rule.id === VERSION_RULE)) problems.push({ line: 0, message: `format-check checks the cases of ${VERSION_RULE}, and the text does not list it` });
  return problems;
}

// An example in a file: a valid one passes its schema, an invalid one gives the error its first line
// names, and both follow the YAML rules; an example of the manifest names the version of
// format/VERSION, and a valid example of the module index names it at its root and lists each
// entry's teaches in the order of code units (section 26). validate is its term's validator, or undefined when there is none; version is
// format/VERSION's, or null. Returns problems, each { line, message }.
export function checkExample(bytes, { kind, term, validate, version }) {
  const { value, violations, notYaml } = readModuleFile(bytes);
  const problems = yamlProblems(violations, notYaml);
  const text = new TextDecoder().decode(bytes);
  const header = expectedError(text);
  if (kind === "valid" && header) problems.push({ line: 1, message: "a valid example names no error" });
  if (kind === "invalid" && !header) problems.push({ line: 1, message: `an invalid example's first line is ${HEADER}<keyword> at <location>` });
  if (kind === "invalid" && header?.problem) problems.push({ line: 1, message: header.problem });
  if (problems.length) return problems;
  // An invalid example breaks one thing: the version too, unless the version is what it shows.
  if (term === MANIFEST_PART && !(kind === "invalid" && header.pointer === `/${VERSION_FIELD}`)) {
    const problem = versionProblem(value, version, null);
    if (problem) problems.push({ line: 0, message: problem });
  }
  if (!validate) return problems;

  const valid = validate(value);
  const errors = valid ? [] : validate.errors;
  if (kind === "valid") {
    for (const error of errors) problems.push({ line: 0, message: `does not pass its schema: ${describe(error)}` });
    if (valid && term === TASK_PART) problems.push(...taskRuleProblems(taskRuleBreaches(value, {}, validate), null));
    if (valid && term === INDEX_PART) for (const message of indexFormProblems(value, version)) problems.push({ line: 0, message });
    return problems;
  }
  if (valid) problems.push({ line: 1, message: `passes its schema, and names ${header.keyword} at ${header.location}` });
  else if (!errors.some((error) => error.keyword === header.keyword && error.instancePath === header.pointer)) {
    problems.push({ line: 1, message: `gives no ${header.keyword} at ${header.location}; it gives ${errors.map(describe).join("; ")}` });
  }
  return problems;
}

// A case of a rule's test vectors, in a file. A case of a YAML rule breaks that rule and no other; a
// case of a part's rule follows the YAML rules and passes the part's schema, so that only the rule
// refuses it (section 9). validate is the part's validator, or undefined; version is
// format/VERSION's, or null.
export function checkVector(bytes, { rule, validate, version }) {
  const read = readModuleFile(bytes);
  if (partOf(rule) !== "yaml") {
    const problems = partFileProblems(read, partOf(rule), { rule, validate, version });
    if (!problems.length && validate && partOf(rule) === TASK_PART) problems.push(...taskRuleProblems(taskRuleBreaches(read.value, {}, validate), rule));
    return problems;
  }
  const problems = read.notYaml.map(({ line, message }) => ({ line, message: `not YAML: ${message}` }));
  for (const { rule: broken, line, message } of read.violations) {
    if (broken !== rule) problems.push({ line, message: `breaks ${broken} too: ${message}` });
  }
  if (!read.notYaml.length && !read.violations.some((violation) => violation.rule === rule)) problems.push({ line: 0, message: `breaks no ${rule}` });
  return problems;
}

// A case laid out as a module: a whole-module example, or a vector of a rule that spans files. Each
// file of the case with a part follows the YAML rules and passes that part's schema; a manifest names
// the format's version; and the rules of a whole module hold, except in a vector of one of them,
// which breaks that rule and no other (sections 8–10). A vector of a part's rule holds a file of
// that part. rule is the vector's rule, or null for an example; validatorOf(part) gives a part's
// validator, or undefined; forms holds isLocalId and isMediaPath, the forms of common's local_id and
// media_path. An example of a whole module builds its canonical view too (section 25), which passes
// the schema of a canonical view by validateView, when it is given. Returns problems, each { file,
// line, message }, where file is the path of a file in the case, or "" for the case itself.
export function checkModuleCase(folder, { rule, layout, validatorOf, version, forms, validateView }) {
  const { problems, members, partsOk } = readModuleCase(folder, { rule, layout, validatorOf, version, forms });
  if (rule !== null || !validateView || problems.length || !partsOk) return problems;
  const { view, problem } = canonicalViewOf(members);
  if (problem) problems.push({ file: "", line: 0, message: `its canonical view cannot be built: ${problem}` });
  else if (!validateView(view)) for (const error of validateView.errors) problems.push({ file: "", line: 0, message: `its canonical view does not pass the schema of a canonical view: ${describe(error)}` });
  return problems;
}

// The same, and what a case holds: { problems, files, members, partsOk }. files are the files of the
// case that stand at a path of the layout, and members the value of each file of a part that passed
// its schema, under the member of a canonical view that holds the part, by local ID for a part with
// <id> (section 25); partsOk is false when a file of a part did not pass, so that members lacks it.
function readModuleCase(folder, { rule, layout, validatorOf, version, forms }) {
  const listing = listModule(folder);
  const { rows, breaches } = placeFiles(listing, layout, forms);
  const problems = [];
  const parts = new Set();
  const members = {};
  // The values of the files that passed their schemas, by part, for the rules that format-check
  // implements. A task is known by the name of its file, as module.file-ids has it.
  const values = { tasks: [], lessons: [], partsOk: true };
  // The rules of a whole module that could not be checked on this case: no vector of one then
  // says that it breaks no such rule.
  const unchecked = new Set(forms.isMediaPath ? [] : ["module.media"]);
  for (const [file, row] of rows) {
    if (!row?.part) continue;
    parts.add(row.part);
    const read = readModuleFile(fs.readFileSync(path.join(folder, file)));
    const validate = validatorOf(row.part);
    const fileProblems = partFileProblems(read, row.part, { rule, validate, version });
    for (const problem of fileProblems) problems.push({ file, ...problem });
    if (!validate || fileProblems.length) values.partsOk = false;
    else {
      if (row.id === null) members[memberOf(row)] = read.value;
      else (members[memberOf(row)] ??= {})[idOf(file, row)] = read.value;
      if (row.part === TASK_PART) values.tasks.push({ file, id: idOf(file, row), task: read.value });
      else if (row.part === LESSON_PART) values.lessons.push({ file, lesson: read.value });
      else values[row.part] = read.value;
    }
    // module.file-ids: an entry's file holds its own name in id, read only from a file that passed
    // its schema, so that a file the schema refuses breaks that and nothing more.
    const id = read.value?.id;
    if (row.id === null) continue;
    if (!validate || fileProblems.length > 0) unchecked.add("module.file-ids");
    else if (typeof id === "string" && id !== idOf(file, row)) {
      breaches.push({ rule: "module.file-ids", file, message: `holds the id ${JSON.stringify(id)}: the file of an entry is named by its id, ${idOf(file, row)}` });
    }
  }
  const files = [...rows].filter(([, row]) => row).map(([file]) => file);
  breaches.push(...mediaBreaches(folder, files, forms), ...textBreaches(folder, listing.files));
  problems.push(...wholeModuleProblems(breaches, rule, unchecked));
  if (values.partsOk) problems.push(...moduleRuleProblems(values, rule, values.tasks.length ? validatorOf(TASK_PART) : undefined));
  const part = rule === null ? null : partOf(rule);
  if (part !== null && part !== "yaml" && part !== "module" && !parts.has(part)) {
    problems.push({ file: "", line: 0, message: `holds no file of the part ${part}, whose rule ${rule} it is a case of` });
  }
  return { problems, files, members, partsOk: values.partsOk };
}

// A vector of packages (section 9): module/, laid out as a module, holds a module that breaks no rule
// that format-check checks, as an example of a whole module does; package.yaml follows the YAML rules
// and passes the schema of package vectors, by its validator validate; and the package that section 25
// builds of module/ is package.yaml's — its server part, the listing of its device part, its
// inventory and its digest, whatever the order of keys. The results of the solvers are the vector's
// own, in the instances of its server part: spec runs no Starlark, so it takes them as given. Returns
// problems, each { file, line, message }, where file is package.yaml, or module/ and a path in it.
export function checkPackageVector(folder, { layout, validatorOf, version, forms, validate }) {
  const moduleFolder = path.join(folder, PACKAGE_MODULE);
  const read = readModuleCase(moduleFolder, { rule: null, layout, validatorOf, version, forms });
  const problems = read.problems.map((problem) => ({ ...problem, file: problem.file ? `${PACKAGE_MODULE}/${problem.file}` : PACKAGE_MODULE }));
  const { problems: own, value } = vectorStart(fs.readFileSync(path.join(folder, PACKAGE_FILE)), validate, "package vectors");
  problems.push(...own.map((problem) => ({ file: PACKAGE_FILE, ...problem })));
  if (problems.length || !value || !read.partsOk) return problems;
  const built = packageOf(moduleFolder, read.files, read.members, resultsGiven(read.members, value.server_part));
  if (built.problem) return [{ file: built.inResults ? PACKAGE_FILE : PACKAGE_MODULE, line: 0, message: built.problem }];
  problems.push(...solvedProblems(read.members, built.server.instances));
  for (const [field, mine, what] of [
    ["server_part", built.server, "the canonical view"],
    ["device_part", built.device, "the listing of the device part"],
    ["inventory", built.inventory, "the inventory"],
  ]) {
    const at = differenceOf(mine, value[field]);
    if (at) problems.push({ file: PACKAGE_FILE, line: 0, message: `${field} is not ${what} of the module: they differ at ${fragmentOf([field, ...at])}` });
  }
  if (built.digest !== value.digest) problems.push({ file: PACKAGE_FILE, line: 0, message: `the digest of the package is ${built.digest}, not ${value.digest}` });
  return problems;
}

// The folder of the module in a vector of packages, and the file of the package it gives.
export const PACKAGE_MODULE = "module";
export const PACKAGE_FILE = "package.yaml";

// A vector of the module index (section 9): each folder of modules/ holds a module, laid out as one,
// that breaks no rule that format-check checks, as an example of a whole module does, and whose
// templates have no solver, since spec runs none; index.yaml follows the YAML rules and passes the
// schema of index vectors, by its validator validate, and each index in it names the format version
// in VERSION — the previous one, it or an earlier one — and lists teaches in order; and section 26 builds of the release's packages the index
// that index.yaml gives, whatever the order of keys, or refuses the build by its refusal and by no
// other rule. { problems, refusal }: problems, each { file, line, message }, where file is index.yaml,
// modules/ or a path in it; and the rule that the case says refuses the build, if it says one.
export function checkIndexVector(folder, { layout, validatorOf, version, forms, validate }) {
  const problems = [];
  const packages = [];
  // Whether every module of the release was read and built: a vector is compared only then, as a
  // module left out could leave the index the same.
  let built = true;
  const modulesFolder = path.join(folder, INDEX_MODULES);
  for (const entry of listFolder(modulesFolder)) {
    const at = `${INDEX_MODULES}/${entry.name}`;
    if (!entry.isDirectory() || !isKebabCase(entry.name)) {
      problems.push({ file: at, line: 0, message: `${INDEX_MODULES}/ holds a folder <name>/ for each module of the release, its name in kebab-case, laid out as a module, and nothing else` });
      continue;
    }
    const moduleFolder = path.join(modulesFolder, entry.name);
    const read = readModuleCase(moduleFolder, { rule: null, layout, validatorOf, version, forms });
    problems.push(...read.problems.map((problem) => ({ ...problem, file: problem.file ? `${at}/${problem.file}` : at })));
    if (read.problems.length || !read.partsOk) {
      built = false;
      continue;
    }
    const solved = Object.keys(read.members.tasks ?? {}).filter((id) => resultsOf(read.members.tasks[id]).length);
    if (solved.length) {
      problems.push({ file: at, line: 0, message: `the template ${solved.join(", ")} has a solver: spec runs none, so a module of a vector of the index has no solver` });
      continue;
    }
    const pkg = packageOf(moduleFolder, read.files, read.members);
    if (pkg.problem) problems.push({ file: at, line: 0, message: pkg.problem });
    else packages.push(pkg);
  }
  const { problems: own, value } = vectorStart(fs.readFileSync(path.join(folder, INDEX_FILE)), validate, "index vectors");
  problems.push(...own.map((problem) => ({ file: INDEX_FILE, ...problem })));
  if (!value) return { problems };
  for (const field of ["previous", "index"]) {
    if (value[field] === undefined) continue;
    for (const message of indexFormProblems(value[field], version, field === "previous")) problems.push({ file: INDEX_FILE, line: 0, message: `${field}: ${message}` });
  }
  if (problems.length || !built) return { problems, refusal: value.refusal };
  const { index, breaches } = indexOf({ version, previous: value.previous, packages, release: value.release, withdrawals: value.withdrawals });
  const shown = (breach) => `${breach.rule}: ${breach.message}`;
  if (value.refusal === undefined) {
    for (const breach of breaches) problems.push({ file: INDEX_FILE, line: 0, message: `the build is refused, and the case names no refusal: ${shown(breach)}` });
    const at = breaches.length ? null : differenceOf(index, value.index);
    if (at) problems.push({ file: INDEX_FILE, line: 0, message: `index is not the index that the release builds: they differ at ${fragmentOf(["index", ...at])}` });
  } else {
    if (!breaches.some((breach) => breach.rule === value.refusal)) problems.push({ file: INDEX_FILE, line: 0, message: `the build breaks no ${value.refusal}` });
    for (const breach of breaches) {
      if (breach.rule !== value.refusal) problems.push({ file: INDEX_FILE, line: 0, message: `breaks ${breach.rule} too: ${breach.message}` });
    }
  }
  return { problems, refusal: value.refusal };
}

// The folder of the modules of a release in a vector of the module index, and the file of the release.
export const INDEX_MODULES = "modules";
export const INDEX_FILE = "index.yaml";

// The results of the solvers of a module's templates as a vector's canonical view gives them: for each
// template with a solver, an object of its results on each instance, in order, or nothing when the
// view has no instances of it.
function resultsGiven(members, view) {
  const results = {};
  for (const [id, task] of Object.entries(members.tasks ?? {})) {
    const names = resultsOf(task);
    const given = view.instances?.[id];
    if (!names.length || !Array.isArray(given)) continue;
    results[id] = given.map((numbers) => Object.fromEntries(names.filter((name) => Object.hasOwn(numbers, name)).map((name) => [name, numbers[name]])));
  }
  return results;
}

// The rules of a task that format-check implements, on every instance of each template with a solver,
// filled with the results that a vector of packages gives: they make the instances that module-kit
// checks, as the results of an attempt of a vector of templates do (section 24).
function solvedProblems(members, instances = {}) {
  const problems = [];
  const parts = { manifest: members.manifest, traps: members.traps, techniques: members.techniques };
  for (const [id, task] of Object.entries(members.tasks ?? {})) {
    if (!resultsOf(task).length) continue;
    const make = instanceMaker(task);
    for (const numbers of instances[id]) {
      const solved = new Map(Object.entries(numbers));
      for (const [breach, detail] of sortedBreaches(plainBreaches(make(solved), parts))) {
        problems.push({ file: PACKAGE_FILE, line: 0, message: `the instance ${instanceShown(task, solved)} of ${id}, with the results of its solver that the vector gives, ${breachShown(breach, detail, false)}` });
      }
    }
  }
  return problems;
}

// A vector of tiers (section 9): it follows the YAML rules and passes the schema of tier vectors, by
// its validator validate, and the tier of each skill of its skill graph is the one section 12 gives.
export function checkTierVector(bytes, { validate }) {
  const { problems, value } = vectorStart(bytes, validate, "tier vectors");
  if (!value) return problems;
  const { tiers, problem } = tiersOf(value.skill_graph);
  if (problem) return [{ line: 0, message: problem }];
  const at = differenceOf(tiers, value.skill_tiers);
  if (at) problems.push({ line: 0, message: `the tiers are not those of section 12: they differ at ${fragmentOf(["skill_tiers", ...at])}` });
  return problems;
}

// A vector of the open view (section 9): part.yaml, a part of term, follows the YAML rules, names
// the format's version when it is a manifest, and passes the part's schema, by its validator
// validate; open-view.yaml follows the YAML rules; and the open view of the part, built by openView
// — byName and schemaAt —, is open-view.yaml, whatever the order of keys. Returns problems, each
// { file, line, message }, where file is part.yaml or open-view.yaml.
export function checkOpenView(partBytes, viewBytes, { term, validate, version, openView }) {
  const part = readModuleFile(partBytes);
  const expected = readModuleFile(viewBytes);
  const problems = [
    ...partFileProblems(part, term, { rule: null, validate, version }).map((problem) => ({ file: "part.yaml", ...problem })),
    ...yamlProblems(expected.violations, expected.notYaml).map((problem) => ({ file: "open-view.yaml", ...problem })),
  ];
  if (problems.length || !validate) return problems;
  // The part's schema compiled, and so did every schema it reaches: every reference resolves, and
  // every subschema has a validator.
  const at = differenceOf(openViewOf(part.value, `${term}.schema.json`, openView), expected.value);
  if (at) problems.push({ file: "open-view.yaml", line: 0, message: `is not the open view of part.yaml: they differ at ${fragmentOf(at)}` });
  return problems;
}

// A vector of verdicts (section 9): it follows the YAML rules and passes the schema of verdict vectors,
// by its validator validate; every answer slot of its item is checked by kind, the kind of its
// folder, and breaks none of the rules of a task that its check shows by itself; each reading names
// every answer slot; and each verdict is the one section 15 gives — the
// item's made of its answer slots', and an answer slot's computed from its check and the value read.
// A predicate's value in notation gets no verdict here: only module-kit runs Starlark. Returns
// problems, each { line, message }.
export function checkVerdictVector(bytes, { kind, validate }) {
  const { problems, value } = vectorStart(bytes, validate, "verdict vectors");
  if (!value) return problems;
  const { item, readings } = value;
  const slots = answerSlotsOf(item);
  slots.forEach((slot, at) => {
    if (slot.check.kind !== kind) problems.push({ line: 0, message: `answer slot ${at + 1} is checked by ${slot.check.kind}: a vector of ${kind} checks every answer slot by ${kind}` });
    else for (const rule of slotBreaches(slot)) problems.push({ line: 0, message: `answer slot ${at + 1} breaks ${rule}: the item of a vector is one that a task may hold` });
  });
  if (problems.length) return problems;
  readings.forEach((reading, at) => {
    const which = `reading ${at + 1}`;
    if (reading.answer_slots.length !== slots.length) {
      problems.push({ line: 0, message: `${which} reads ${reading.answer_slots.length} answer slots, and the item has ${slots.length}` });
      return;
    }
    reading.answer_slots.forEach((given, slot) => {
      const computed = slotVerdict(slots[slot], given.value);
      const value = JSON.stringify(given.value);
      if (computed === null) {
        if (given.verdict === "unreadable") problems.push({ line: 0, message: `${which}, answer slot ${slot + 1}: ${value} is in the notation of a predicate, which gives correct, not_yet or unchecked` });
      } else if (computed.verdict !== given.verdict || computed.reason !== given.reason) {
        problems.push({ line: 0, message: `${which}, answer slot ${slot + 1}: ${value} gets ${shown(computed)}, not ${shown(given)}` });
        return;
      }
      const trap = trapOf(slots[slot], given.value);
      if (trap !== (given.trap ?? null)) problems.push({ line: 0, message: `${which}, answer slot ${slot + 1}: ${value} matches ${trapShown(trap)}, not ${trapShown(given.trap)}` });
    });
    const made = itemVerdict(reading.answer_slots.map((given) => given.verdict));
    if (made !== reading.verdict) problems.push({ line: 0, message: `${which}: its answer slots make the item ${made}, not ${reading.verdict}` });
  });
  return problems;
}

function shown({ verdict, reason }) {
  return reason ? `${verdict} (${reason})` : verdict;
}

const trapShown = (trap) => (trap ? `the trap ${trap}` : "no trap");

// A test vector of the leak check (section 20): the YAML rules, the schema of leak vectors, the rules
// of a task that its answer slots' checks show by themselves, and what the leak check finds in each
// text, as a set.
export function checkLeakVector(bytes, { validate }) {
  const { problems, value } = vectorStart(bytes, validate, "leak vectors");
  if (!value) return problems;
  const { task, texts } = value;
  for (const breach of [...taskRuleBreaches(task).keys()].sort(byCodeUnits)) problems.push({ line: 0, message: `its task breaks ${breach}: the task of a vector is one that a module may hold` });
  if (problems.length) return problems;
  const needles = needlesOf(task);
  texts.forEach(({ text, leaks }, at) => {
    const found = leaksIn(text, needles);
    const same = found.length === leaks.length && found.every((leak) => leaks.includes(leak));
    if (!same) problems.push({ line: 0, message: `text ${at + 1}: the leak check finds ${leaksShown(found)} in ${JSON.stringify(text)}, not ${leaksShown(leaks)}` });
  });
  return problems;
}

// A vector of the generator (section 22): the YAML rules, the schema of such vectors, the state that
// its seed and names derive, and the value of each draw, in order, on the stream from its state. A
// state that its seed and names do not derive, or a draw whose arguments the functions do not take,
// ends the vector.
export function checkRandomVector(bytes, { validate }) {
  const { problems, value } = vectorStart(bytes, validate, "vectors of the generator");
  if (!value) return problems;
  for (const [text, what] of [[value.seed, "the seed"], [value.state.high, "the high word"], [value.state.low, "the low word"]]) {
    if (text !== undefined && !isUnsigned(text)) problems.push({ line: 0, message: `${what}, ${text}, is past 2^64 − 1` });
  }
  if (problems.length) return problems;
  const high = BigInt(value.state.high);
  const low = BigInt(value.state.low);
  if (value.seed !== undefined) {
    const derived = stateOf(BigInt(value.seed), value.names);
    if (derived.high !== high || derived.low !== low) return [{ line: 0, message: `the seed and the names derive the state {high: ${derived.high}, low: ${derived.low}}, not {high: ${high}, low: ${low}}` }];
  }
  const stream = streamOf(high, low);
  for (const [at, draw] of value.draws.entries()) {
    const problem = drawProblem(stream, draw);
    if (problem === null) continue;
    problems.push({ line: 0, message: `draw ${at + 1}: ${problem.message}` });
    if (problem.ends) break;
  }
  return problems;
}

// A vector of templates (sections 23 and 24): the YAML rules, the schema of such vectors, the rules of
// a task on every instance of its template, the number of its instances, the numbers that its solver
// gets, and for each attempt the instance that its seed picks — its numbers, and the task it is,
// whatever the order of keys. The results of a solver are the vector's own: spec runs no Starlark, so
// it takes them as given and checks the rules of a task on the instance they make, which the schema of
// vectors holds to the task's. validateTask is the task's validator, by which each instance passes its
// schema, and openView what the open view of the template is built with.
export function checkTemplateVector(bytes, { validate, validateTask, openView }) {
  const { problems, value } = vectorStart(bytes, validate, "vectors of templates");
  if (!value) return problems;
  const { task, count, inputs, attempts } = value;
  const counted = templateOf(task);
  for (const [breach, detail] of sortedBreaches(expandedOf(task, {}, validateTask, counted).breaches)) problems.push({ line: 0, message: `its template breaks ${breach}${detail ? `, ${detail}` : ""}: the template of a vector is one that a module may hold` });
  if (problems.length) return problems;
  const { instances } = counted;
  if (instances.length !== count) return [{ line: 0, message: `the template has ${instances.length} instances, not ${count}` }];
  const results = resultsOf(task);
  if (inputs) {
    const gets = solverInputsOf(task, openViewOf(task, `${TASK_PART}.schema.json`, openView));
    if (gets.join() !== [...inputs].sort(byCodeUnits).join()) problems.push({ line: 0, message: `the solver gets ${namesShown(gets)}, not ${namesShown(inputs)}` });
  }
  const make = instanceMaker(task);
  attempts.forEach((attempt, at) => {
    const which = `attempt ${at + 1}`;
    if (!isUnsigned(attempt.seed)) {
      problems.push({ line: 0, message: `${which}: the seed, ${attempt.seed}, is past 2^64 − 1` });
      return;
    }
    const numbers = instances[pickOf(BigInt(attempt.seed), task.id, count)];
    const given = Object.entries(attempt.numbers).filter(([name]) => !results.includes(name));
    const same = given.length === numbers.size && given.every(([name, number]) => numbers.get(name) === BigInt(number));
    if (!same) {
      problems.push({ line: 0, message: `${which}: the seed picks the instance ${numbersShown(numbers)}, not ${numbersShown(new Map(given))}` });
      return;
    }
    const missing = results.filter((name) => !Object.hasOwn(attempt.numbers, name));
    if (missing.length) {
      problems.push({ line: 0, message: `${which}: the numbers give no result ${namesShown(missing)} of the solver` });
      return;
    }
    const solved = new Map([...numbers, ...results.map((name) => [name, BigInt(attempt.numbers[name])])]);
    const instance = make(solved);
    const differs = differenceOf(instance, attempt.instance);
    if (differs) problems.push({ line: 0, message: `${which}: the instance is not the template with these numbers: they differ at ${fragmentOf(differs)}` });
    else if (results.length) {
      for (const [breach, detail] of sortedBreaches(plainBreaches(instance, {}))) problems.push({ line: 0, message: `${which}: the instance breaks ${breach}${detail ? `, ${detail}` : ""}` });
    }
  });
  return problems;
}

const namesShown = (names) => (names.length ? names.join(", ") : "nothing");

const isUnsigned = (text) => BigInt(text) <= MAX_UNSIGNED;
const isSigned = (text) => {
  const number = BigInt(text);
  return number >= MIN_SIGNED && number <= MAX_SIGNED;
};
const ends = (message) => ({ message, ends: true });

// Each function of section 22 that a vector may call, by its field: what is wrong with its
// arguments, or null, and its value on a stream.
const DRAWS = {
  integer: { refused: (args) => (isUnsigned(args.value) ? null : `its value, ${args.value}, is past 2^64 − 1`), value: (stream) => stream.integer() },
  below: {
    refused: (args) => (BigInt(args.bound) === 0n || !isUnsigned(args.bound) || !isUnsigned(args.value) ? `below takes a bound from 1 to 2^64 − 1, and gives an integer below it, not ${args.bound} and ${args.value}` : null),
    value: (stream, args) => below(stream, BigInt(args.bound)),
  },
  between: {
    refused: (args) => {
      const fits = isSigned(args.from) && isSigned(args.to) && isSigned(args.value) && BigInt(args.from) <= BigInt(args.to) && BigInt(args.to) - BigInt(args.from) + 1n <= MAX_SIGNED;
      return fits ? null : `between takes signed integers of 64 bits, the first not above the second and at most 2^63 − 1 integers from it to the second, not ${args.from} and ${args.to}`;
    },
    value: (stream, args) => between(stream, BigInt(args.from), BigInt(args.to)),
  },
  fraction: { refused: () => null, value: (stream) => fraction(stream) },
  // A permutation is computed only when its value lists as many integers as it orders: a count of
  // up to 2^31 − 1 would take long, and a vector cannot list one so long.
  permutation: {
    refused: (args) => (args.value.length === args.count ? null : `permutation orders ${args.count} integers, and its value lists ${args.value.length}`),
    value: (stream, args) => permutation(stream, args.count),
  },
};

// What is wrong with a draw of a vector of the generator, drawn on stream: null, or { message, ends },
// where ends is true when its arguments are out of the function's ranges and the stream cannot go on.
// A value compares as a BigInt, as a double or, for a permutation, integer by integer.
function drawProblem(stream, draw) {
  const [[fn, args]] = Object.entries(draw);
  const call = DRAWS[fn];
  if (!call) return ends(`format-check knows no function ${fn}`);
  const refused = call.refused(args);
  if (refused) return ends(refused);
  const computed = call.value(stream, args);
  const given = fn === "permutation" ? JSON.stringify(args.value) : args.value;
  const shown = fn === "permutation" ? JSON.stringify(computed) : computed;
  const same = typeof computed === "bigint" ? computed === BigInt(args.value) : shown === given;
  return same ? null : { message: `${fn} gives ${shown}, not ${given}`, ends: false };
}

// The start of a vector of verdicts, of the leak check, of the generator, of templates, of packages,
// of tiers or of the module index: the YAML rules, then the schema of such vectors. { problems, value }, with no value when the vector goes no further.
function vectorStart(bytes, validate, what) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read.violations, read.notYaml);
  if (problems.length || !validate) return { problems };
  if (!validate(read.value)) return { problems: validate.errors.map((error) => ({ line: 0, message: `does not pass the schema of ${what}: ${describe(error)}` })) };
  return { problems, value: read.value };
}

// Which of the rules that format-check implements a task breaks: a Map from each to what breaks it,
// or null, with the module's other parts when it lies in one.
const taskRuleBreaches = (task, parts = {}, validateTask = undefined) => expandedOf(task, parts, validateTask).breaches;

// The same, and the tasks that a lesson naming the task searches for: { breaches, tasks }. A task
// that is no template is itself. A template breaks its own rules, and the others through its
// instances, which are its tasks: each passes the task's schema by validateTask, when it is given,
// and is checked as a task (section 23). counted is the template's instances, when they are known.
function expandedOf(task, parts, validateTask, counted = undefined) {
  if (task.template === undefined) return { breaches: plainBreaches(task, parts), tasks: [task] };
  const { breaches, instances } = counted ?? templateOf(task);
  const tasks = [];
  if (!instances) return { breaches, tasks };
  const make = instanceMaker(task);
  // The results of a solver come from Starlark, so an instance here lacks them (section 24).
  const unsolved = resultsOf(task).length > 0;
  const known = withoutResults(task);
  for (const numbers of instances) {
    const made = make(numbers);
    const add = (rule, detail) => {
      if (breaches.has(rule)) return;
      const on = `on the instance ${instanceShown(task, numbers)}`;
      breaches.set(rule, detail ? `${on}: ${detail}` : on);
    };
    if (validateTask && !validateTask(made)) {
      add("task.instances", describe(validateTask.errors[0]));
      continue;
    }
    const instance = unsolved ? known(made) : made;
    tasks.push(instance);
    for (const [rule, detail] of plainBreaches(instance, parts, unsolved)) add(rule, detail);
  }
  return { breaches, tasks };
}

// The same for a task that is no template, or for an instance, which is unsolved when the results of
// its solver are not known.
function plainBreaches(task, parts, unsolved = false) {
  const breaches = new Map((task.items ?? []).flatMap((item) => answerSlotsOf(item).flatMap((slot) => slotBreaches(slot, unsolved))).map((rule) => [rule, null]));
  if (leaksBefore(task, parts)) breaches.set("task.no-leaks", null);
  return breaches;
}

const sortedBreaches = (breaches) => [...breaches].sort(([a], [b]) => byCodeUnits(a, b));
const breachShown = (breach, detail, too) => `breaks ${breach}${too ? " too" : ""}${detail ? `, ${detail}` : ""}`;

// What a task's breaches are in a vector of rule: it breaks its rule, if format-check implements
// it, and no other that format-check implements; outside a vector of one, none.
function taskRuleProblems(breaches, rule) {
  const own = TASK_RULES.includes(rule) ? rule : null;
  const problems = sortedBreaches(breaches)
    .filter(([breach]) => breach !== own)
    .map(([breach, detail]) => ({ line: 0, message: breachShown(breach, detail, own !== null) }));
  if (own && !breaches.has(own)) problems.push({ line: 0, message: `breaks no ${own}` });
  return problems;
}

// The same for the tasks and the lessons of a case laid out as a module, with its manifest, its trap
// catalog and its technique catalog: one of them breaks the rule of the case.
function moduleRuleProblems({ tasks, lessons, manifest, traps, techniques }, rule, validateTask) {
  const own = IMPLEMENTED_RULES.includes(rule) ? rule : null;
  const expanded = tasks.map(({ file, id, task }) => ({ file, id, ...expandedOf(task, { manifest, traps, techniques }, validateTask) }));
  const byId = new Map(expanded.map(({ id, tasks: theirs }) => [id, theirs]));
  const files = [
    ...expanded.map(({ file, breaches }) => ({ file, breaches })),
    ...lessons.map(({ file, lesson }) => ({ file, breaches: new Map(lessonLeaks(lesson, byId) ? [[LESSON_LEAKS, null]] : []) })),
  ];
  const problems = [];
  let ownBroken = false;
  for (const { file, breaches } of files) {
    if (breaches.has(own)) ownBroken = true;
    for (const [breach, detail] of sortedBreaches(breaches).filter(([breach]) => breach !== own)) problems.push({ file, line: 0, message: breachShown(breach, detail, own !== null) });
  }
  if (own && !ownBroken) problems.push({ file: "", line: 0, message: `breaks no ${own}` });
  return problems;
}

const leaksShown = (leaks) => (leaks.length ? leaks.map((leak) => JSON.stringify(leak)).join(", ") : "nothing");

// The rules of a whole module on the files of a case: all of them hold, but in a vector of one of
// them, which breaks that rule alone, unless it went unchecked.
function wholeModuleProblems(breaches, rule, unchecked) {
  const ownRule = rule !== null && partOf(rule) === "module" ? rule : null;
  const problems = breaches
    .filter((breach) => breach.rule !== ownRule)
    .map((breach) => ({ file: breach.file, line: 0, message: ownRule ? `breaks ${breach.rule} too: ${breach.message}` : `${breach.rule}: ${breach.message}` }));
  if (ownRule && !unchecked.has(ownRule) && !breaches.some((breach) => breach.rule === ownRule)) problems.push({ file: "", line: 0, message: `breaks no ${ownRule}` });
  return problems;
}

// A file of a part, read, in a vector of rule or, with rule null, in an example of a whole module:
// the YAML rules, the version that a manifest names, and the part's schema, by its validator
// validate, or none when it is undefined.
function partFileProblems({ value, violations, notYaml }, part, { rule, validate, version }) {
  const problems = yamlProblems(violations, notYaml);
  if (problems.length) return problems;
  const problem = part === MANIFEST_PART ? versionProblem(value, version, rule) : null;
  if (problem) problems.push({ line: 0, message: problem });
  if (validate && !validate(value)) for (const error of validate.errors) problems.push({ line: 0, message: `does not pass the schema of ${part}: ${describe(error)}` });
  return problems;
}

function yamlProblems(violations, notYaml) {
  return [
    ...notYaml.map(({ line, message }) => ({ line, message: `not YAML: ${message}` })),
    ...violations.map(({ rule, line, message }) => ({ line, message: `${rule}: ${message}` })),
  ];
}

// The error an invalid example names on its first line: { keyword, location, pointer }, or
// { problem } when the line is not of that form, or null when the file names none.
export function expectedError(text) {
  const first = text.split("\n", 1)[0];
  if (!first.startsWith(HEADER)) return null;
  const words = first.slice(HEADER.length).split(" ");
  const [keyword, at, location] = words;
  if (words.length !== 3 || at !== "at" || keyword === "" || !location.startsWith("#")) {
    return { problem: `the first line reads ${HEADER}<keyword> at <location>, such as "${HEADER}type at #/difficulty"` };
  }
  if (NEVER_NAMED.has(keyword)) return { problem: `${keyword} is never named: name the keyword that failed inside it` };
  let pointer;
  try {
    pointer = decodeURIComponent(location.slice(1));
  } catch {
    return { problem: `${location} is no JSON Pointer in a URI fragment` };
  }
  if (pointer !== "" && !pointer.startsWith("/")) return { problem: `${location} is no JSON Pointer in a URI fragment` };
  return { keyword, location, pointer };
}

function describe(error) {
  return `${error.keyword} at #${encodeURI(error.instancePath)}: ${error.message}`;
}
