// The examples and test vectors of the module format, and the rules and the layout of a module its
// text lists (format/README.md, sections 7–11, 15 and 20–23; R45 and its amendment of 2026-10-22, R46,
// R56, R57, R58, R59, R60).

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
import { MAX_SIGNED, MAX_UNSIGNED, MIN_SIGNED, below, between, fraction, permutation, stateOf, streamOf } from "./random.mjs";
import { instanceMaker, instanceShown, numbersShown, pickOf, templateOf } from "./templates.mjs";
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
// of templates (section 23), which it checks with the others on every instance of a template.
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
    if (valid && term === TASK_PART) problems.push(...taskRuleProblems(taskRuleBreaches(value, {}, validate), null));
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
  if (values.partsOk) problems.push(...moduleRuleProblems(values, rule, values.tasks.length ? validatorOf(TASK_PART) : undefined));
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

// A vector of templates (section 23): the YAML rules, the schema of such vectors, the rules of a task
// on every instance of its template, the number of its instances, and for each attempt the instance
// that its seed picks — its numbers, and the task it is, whatever the order of keys. validateTask is
// the task's validator, by which each instance passes its schema.
export function checkTemplateVector(bytes, { validate, validateTask }) {
  const { problems, value } = vectorStart(bytes, validate, "vectors of templates");
  if (!value) return problems;
  const { task, count, attempts } = value;
  const counted = templateOf(task);
  for (const [breach, detail] of sortedBreaches(expandedOf(task, {}, validateTask, counted).breaches)) problems.push({ line: 0, message: `its template breaks ${breach}${detail ? `, ${detail}` : ""}: the template of a vector is one that a module may hold` });
  if (problems.length) return problems;
  const { instances } = counted;
  if (instances.length !== count) return [{ line: 0, message: `the template has ${instances.length} instances, not ${count}` }];
  attempts.forEach((attempt, at) => {
    const which = `attempt ${at + 1}`;
    if (!isUnsigned(attempt.seed)) {
      problems.push({ line: 0, message: `${which}: the seed, ${attempt.seed}, is past 2^64 − 1` });
      return;
    }
    const numbers = instances[pickOf(BigInt(attempt.seed), task.id, count)];
    const given = Object.entries(attempt.numbers);
    const same = given.length === numbers.size && given.every(([name, number]) => numbers.get(name) === BigInt(number));
    if (!same) {
      problems.push({ line: 0, message: `${which}: the seed picks the instance ${numbersShown(numbers)}, not ${numbersShown(new Map(given))}` });
      return;
    }
    const differs = differenceOf(instanceMaker(task)(numbers), attempt.instance);
    if (differs) problems.push({ line: 0, message: `${which}: the instance is not the template with these numbers: they differ at ${fragmentOf(differs)}` });
  });
  return problems;
}

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

// The start of a vector of verdicts, of the leak check, of the generator or of templates: the YAML rules, then the
// schema of such vectors. { problems, value }, with no value when the vector goes no further.
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
  for (const numbers of instances) {
    const instance = make(numbers);
    const add = (rule, detail) => {
      if (breaches.has(rule)) return;
      const on = `on the instance ${instanceShown(task, numbers)}`;
      breaches.set(rule, detail ? `${on}: ${detail}` : on);
    };
    if (validateTask && !validateTask(instance)) {
      add("task.instances", describe(validateTask.errors[0]));
      continue;
    }
    tasks.push(instance);
    for (const [rule, detail] of plainBreaches(instance, parts)) add(rule, detail);
  }
  return { breaches, tasks };
}

// The same for a task that is no template.
function plainBreaches(task, parts) {
  const breaches = new Map((task.items ?? []).flatMap((item) => answerSlotsOf(item).flatMap(slotBreaches)).map((rule) => [rule, null]));
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
