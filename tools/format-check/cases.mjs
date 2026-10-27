// The examples and test vectors of the module format, and the rules and the layout of a module its
// text lists (format/README.md, sections 7–11, 15, 20 and 21; R45 and its amendment of 2026-10-22, R46,
// R56, R57, R58).

import fs from "node:fs";
import path from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { byCodeUnits } from "../shared.mjs";
import { MANIFEST_PART, MODULE_RULES, VERSION_FIELD, VERSION_RULE, idOf, listModule, mediaBreaches, placeFiles, versionProblem } from "./module.mjs";
import { differenceOf, openViewOf } from "./openview.mjs";
import { fragmentOf, isKebabCase } from "./schemas.mjs";
import { leaksBefore, leaksIn, lessonLeaks, needlesOf } from "./leaks.mjs";
import { answerSlotsOf, itemVerdict, slotBreaches, slotVerdict, trapOf } from "./verdicts.mjs";
import { YAML_RULES, readModuleFile } from "./yaml.mjs";

// What an invalid example never names: the keyword that failed inside them is named instead
// (format/README.md, section 8).
const NEVER_NAMED = new Set(["$ref", "allOf", "properties", "items", "if", "then", "else"]);
const HEADER = "# error: ";
// The part of a task, whose rules format-check implements in part.
const TASK_PART = "task";
// The rules of a task that format-check implements, and so checks on every task it reads: those
// that an answer slot's check shows by itself (section 15), and task.no-leaks (section 20).
const TASK_RULES = ["task.choice-key", "task.choice-options", "task.fraction-key", "task.trap-values", "task.no-leaks"];
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

// The rules format-check checks itself against those the text lists: the YAML rules and the rules
// of a whole module, each side with every rule of the other; and manifest.format-version, whose cases
// it tells apart by the version they name. Problems at the rules' lines in README.md, or at none.
export function compareOwnRules(rules) {
  const problems = [];
  for (const [part, own, file] of [
    ["yaml", YAML_RULES, "yaml.mjs"],
    ["module", MODULE_RULES, "module.mjs"],
  ]) {
    const listed = new Set(rules.filter((rule) => partOf(rule.id) === part).map((rule) => rule.id));
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
// format/VERSION. validate is its term's validator, or undefined when there is none; version is
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
    if (valid && term === TASK_PART) problems.push(...taskRuleProblems(taskRuleBreaches(value), null));
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
    if (!problems.length && validate && partOf(rule) === TASK_PART) problems.push(...taskRuleProblems(taskRuleBreaches(read.value), rule));
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
// media_path. Returns problems, each { file, line, message }, where file is the path of a file in
// the case, or "" for the case itself.
export function checkModuleCase(folder, { rule, layout, validatorOf, version, forms }) {
  const { rows, breaches } = placeFiles(listModule(folder), layout, forms);
  const problems = [];
  const parts = new Set();
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
    else if (row.part === TASK_PART) values.tasks.push({ file, id: idOf(file, row), task: read.value });
    else if (row.part === LESSON_PART) values.lessons.push({ file, lesson: read.value });
    else values[row.part] = read.value;
    // module.file-ids: an entry's file holds its own name in id, read only from a file that passed
    // its schema, so that a file the schema refuses breaks that and nothing more.
    const id = read.value?.id;
    if (row.id === null) continue;
    if (!validate || fileProblems.length > 0) unchecked.add("module.file-ids");
    else if (typeof id === "string" && id !== idOf(file, row)) {
      breaches.push({ rule: "module.file-ids", file, message: `holds the id ${JSON.stringify(id)}: the file of an entry is named by its id, ${idOf(file, row)}` });
    }
  }
  breaches.push(...mediaBreaches(folder, [...rows].filter(([, row]) => row).map(([file]) => file), forms));
  problems.push(...wholeModuleProblems(breaches, rule, unchecked));
  if (values.partsOk) problems.push(...moduleRuleProblems(values, rule));
  const part = rule === null ? null : partOf(rule);
  if (part !== null && part !== "yaml" && part !== "module" && !parts.has(part)) {
    problems.push({ file: "", line: 0, message: `holds no file of the part ${part}, whose rule ${rule} it is a case of` });
  }
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
  for (const breach of [...taskRuleBreaches(task)].sort(byCodeUnits)) problems.push({ line: 0, message: `its task breaks ${breach}: the task of a vector is one that a module may hold` });
  if (problems.length) return problems;
  const needles = needlesOf(task);
  texts.forEach(({ text, leaks }, at) => {
    const found = leaksIn(text, needles);
    const same = found.length === leaks.length && found.every((leak) => leaks.includes(leak));
    if (!same) problems.push({ line: 0, message: `text ${at + 1}: the leak check finds ${leaksShown(found)} in ${JSON.stringify(text)}, not ${leaksShown(leaks)}` });
  });
  return problems;
}

// The start of a vector of verdicts or of the leak check: the YAML rules, then the schema of such
// vectors. { problems, value }, with no value when the vector goes no further.
function vectorStart(bytes, validate, what) {
  const read = readModuleFile(bytes);
  const problems = yamlProblems(read.violations, read.notYaml);
  if (problems.length || !validate) return { problems };
  if (!validate(read.value)) return { problems: validate.errors.map((error) => ({ line: 0, message: `does not pass the schema of ${what}: ${describe(error)}` })) };
  return { problems, value: read.value };
}

// Which of the rules that format-check implements a task breaks: with the module's other parts when
// it lies in one.
function taskRuleBreaches(task, parts = {}) {
  const breaches = new Set((task.items ?? []).flatMap((item) => answerSlotsOf(item).flatMap(slotBreaches)));
  if (leaksBefore(task, parts)) breaches.add("task.no-leaks");
  return breaches;
}

// What a task's breaches are in a vector of rule: it breaks its rule, if format-check implements
// it, and no other that format-check implements; outside a vector of one, none.
function taskRuleProblems(breaches, rule) {
  const own = TASK_RULES.includes(rule) ? rule : null;
  const problems = [...breaches].filter((breach) => breach !== own).sort(byCodeUnits).map((breach) => ({ line: 0, message: own ? `breaks ${breach} too` : `breaks ${breach}` }));
  if (own && !breaches.has(own)) problems.push({ line: 0, message: `breaks no ${own}` });
  return problems;
}

// The same for the tasks and the lessons of a case laid out as a module, with its manifest, its trap
// catalog and its technique catalog: one of them breaks the rule of the case.
function moduleRuleProblems({ tasks, lessons, manifest, traps, techniques }, rule) {
  const own = IMPLEMENTED_RULES.includes(rule) ? rule : null;
  const byId = new Map(tasks.map(({ id, task }) => [id, task]));
  const files = [
    ...tasks.map(({ file, task }) => ({ file, breaches: taskRuleBreaches(task, { manifest, traps, techniques }) })),
    ...lessons.map(({ file, lesson }) => ({ file, breaches: new Set(lessonLeaks(lesson, byId) ? [LESSON_LEAKS] : []) })),
  ];
  const problems = [];
  let ownBroken = false;
  for (const { file, breaches } of files) {
    if (breaches.has(own)) ownBroken = true;
    for (const breach of [...breaches].filter((breach) => breach !== own).sort(byCodeUnits)) problems.push({ file, line: 0, message: own ? `breaks ${breach} too` : `breaks ${breach}` });
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
