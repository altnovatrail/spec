// The templates of tasks, as section 23 of the format text gives them (format/README.md; R60): their
// names, expressions and placeholders, their instances in the order of an odometer, the instance that
// the seed of an attempt picks, and the task that an instance is. A second implementation beside
// module-kit's, by which spec's CI computes the test vectors of templates. A solver's results come
// from Starlark, which spec does not run (section 24; R61): format-check knows where they stand and
// what the solver gets, and takes their numbers only from the vectors.

import { byCodeUnits } from "../shared.mjs";
import { EvaluationError, evaluate, isName, parseExpression, typeOf } from "./expressions.mjs";
import { below, stateOf, streamOf } from "./random.mjs";

export const MAX_COMBINATIONS = 10_000n;
// A derived number lies within an integer of YAML (section 4).
const LIMIT = 2n ** 53n - 1n;
// The names of the place of randomness of an attempt on a template, around the task's ID.
const PLACE_FIRST = "template";
const PLACE_LAST = "instance";

// Whether a key or a trap value of a number or a fraction holds a placeholder: its schema takes a
// brace only in one.
export const holdsPlaceholder = (text) => typeof text === "string" && text.includes("{");

// The names of the results of a template's solver: none when it has no solver (section 24).
export const resultsOf = (task) => task.template?.solver?.results ?? [];

// Where a result of the solver may stand (section 24): in the key or a trap value of a check of a
// number or a fraction, in the solution and in a leak phrase. at is the path of keys to a string of
// the task, as stringsOf gives it.
function takesResults(task, at) {
  const [field, , list, , part, which, , inner] = at;
  if (field === "solution" || field === "leak_phrases") return true;
  if (field !== "items" || part !== "check" || (list !== "answer_slots" && list !== "line")) return false;
  const { kind } = task.items[at[1]][list][at[3]].check;
  if (kind !== "number" && kind !== "fraction") return false;
  return (which === "key" && at.length === 6) || (which === "trap_values" && inner === "value" && at.length === 8);
}

// The names that the placeholders among a text's pieces name, or none when it breaks
// task.placeholders.
const namesOf = (pieces) => (pieces ?? []).filter((piece) => typeof piece !== "string").map((piece) => piece.name);
const namesIn = (text) => namesOf(piecesOf(text).pieces);

// A text of a template in pieces, read from left to right: { pieces }, each a string or { name }, or
// { problem } at the first brace that is neither doubled nor of a placeholder.
export function piecesOf(text) {
  const pieces = [];
  let plain = "";
  let at = 0;
  while (at < text.length) {
    const char = text[at];
    if ((char === "{" || char === "}") && text[at + 1] === char) {
      plain += char;
      at += 2;
      continue;
    }
    if (char === "}") return { problem: `a } at ${at + 1} closes no placeholder: a brace of the text is written twice` };
    if (char !== "{") {
      plain += char;
      at++;
      continue;
    }
    const end = text.indexOf("}", at);
    const name = end === -1 ? "" : text.slice(at + 1, end);
    if (!isName(name)) return { problem: `a { at ${at + 1} opens no placeholder: a placeholder is {name}, and a brace of the text is written twice` };
    if (plain) pieces.push(plain);
    plain = "";
    pieces.push({ name });
    at = end + 1;
  }
  if (plain) pieces.push(plain);
  return { pieces };
}

// Every string of a task outside its template, with the path of keys to it.
function stringsOf(value, at = []) {
  if (typeof value === "string") return [{ at, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => stringsOf(item, [...at, index]));
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !(at.length === 0 && key === "template"))
      .flatMap(([key, item]) => stringsOf(item, [...at, key]));
  }
  return [];
}

const pathShown = (at) => `#${at.map((key) => `/${key}`).join("")}`;

// Numbers as a reader shows them: each name, in order, with its number.
export const numbersShown = (numbers, names = [...numbers.keys()]) => names.map((name) => `${name} = ${numbers.get(name)}`).join(", ");

// A template's own rules, and its instances: { breaches, instances }. breaches maps each rule of a
// template that the task breaks to what breaks it; instances lists, in order, each instance's numbers,
// a Map from every parameter and derived number to its BigInt, or is null when a breach leaves them
// uncounted. A task read once is counted once: the checks of its rules and its package's canonical
// view share what this gives, and none of them changes it.
const counted = new WeakMap();

export function templateOf(task) {
  if (!counted.has(task)) counted.set(task, countedOf(task));
  return counted.get(task);
}

function countedOf(task) {
  const breaches = new Map();
  const breach = (rule, message) => {
    if (!breaches.has(rule)) breaches.set(rule, message);
  };
  const { parameters, derived = {}, constraint } = task.template;
  const names = Object.keys(parameters).sort(byCodeUnits);
  for (const name of Object.keys(derived)) if (Object.hasOwn(parameters, name)) breach("task.template-names", `${name} is both a parameter and a derived number`);
  const results = new Set(resultsOf(task));
  for (const name of results) {
    if (Object.hasOwn(parameters, name)) breach("task.template-names", `${name} is both a parameter and a result of the solver`);
    else if (Object.hasOwn(derived, name)) breach("task.template-names", `${name} is both a derived number and a result of the solver`);
  }

  // The tree of an expression of the type it has to have, or null after its breach.
  const typedAs = (what, text, allowed, type) => {
    const parsed = parseExpression(text);
    const typed = parsed.tree ? typeOf(parsed.tree, allowed) : parsed;
    const article = (of) => (of === "int" ? "an int" : "a bool");
    if (typed.problem) breach("task.template-expressions", `${what}: ${typed.problem}`);
    else if (typed.type !== type) breach("task.template-expressions", `${what} is ${article(typed.type)} expression, and it has to be ${article(type)} one`);
    else return parsed.tree;
    return null;
  };
  const parameterNames = new Set(names);
  const derivedTrees = Object.entries(derived).map(([name, text]) => ({ name, tree: typedAs(`the derived number ${name}`, text, parameterNames, "int") }));
  const constraintTree = constraint === undefined ? null : typedAs("the constraint", constraint, new Set([...names, ...Object.keys(derived)]), "bool");

  const known = new Set([...names, ...Object.keys(derived), ...results]);
  for (const { at, text } of stringsOf(task)) {
    const { pieces, problem } = piecesOf(text);
    const named = namesOf(pieces);
    const unknown = named.find((name) => !known.has(name));
    const result = named.find((name) => results.has(name) && !Object.hasOwn(parameters, name) && !Object.hasOwn(derived, name));
    if (problem) breach("task.placeholders", `${pathShown(at)}: ${problem}`);
    else if (unknown) breach("task.placeholders", `${pathShown(at)}: {${unknown}} names no parameter, derived number or result of the solver`);
    else if (result && !takesResults(task, at)) breach("task.placeholders", `${pathShown(at)}: {${result}} is a result of the solver, which stands only in a key or a trap value of a number or a fraction, in the solution and in a leak phrase`);
  }
  if (breaches.size) return { breaches, instances: null };

  const domains = names.map((name) => ({ name, from: BigInt(parameters[name].from), to: BigInt(parameters[name].to) }));
  const combinations = domains.reduce((product, { from, to }) => product * (to >= from ? to - from + 1n : 0n), 1n);
  if (combinations > MAX_COMBINATIONS) {
    breach("task.template-instances", `its domains multiply to ${combinations} combinations, more than ${MAX_COMBINATIONS}`);
    return { breaches, instances: null };
  }
  const instances = [];
  for (const numbers of odometer(domains)) {
    const shown = () => numbersShown(numbers, names);
    try {
      for (const { name, tree } of derivedTrees) {
        const value = evaluate(tree, numbers);
        if (value > LIMIT || value < -LIMIT) throw new EvaluationError(`the derived number ${name} is ${value}, past ±(2^53 − 1)`);
        numbers.set(name, value);
      }
      if (constraintTree === null || evaluate(constraintTree, numbers)) instances.push(numbers);
    } catch (error) {
      if (!(error instanceof EvaluationError)) throw error;
      breach("task.template-instances", `on ${shown()}: ${error.message}`);
      return { breaches, instances: null };
    }
  }
  if (combinations === 0n) breach("task.template-instances", "a domain is empty: its to is below its from");
  else if (!instances.length) breach("task.template-instances", "no combination of its parameters meets its constraint");
  return { breaches, instances: instances.length ? instances : null };
}

// The combinations of the domains, in the order of an odometer: the first changing slowest. Each a
// Map from a parameter's name to its BigInt.
function* odometer(domains) {
  if (domains.some(({ from, to }) => to < from)) return;
  const current = domains.map(({ from }) => from);
  while (true) {
    yield new Map(domains.map(({ name }, index) => [name, current[index]]));
    let index = domains.length - 1;
    while (index >= 0 && current[index] === domains[index].to) {
      current[index] = domains[index].from;
      index--;
    }
    if (index < 0) return;
    current[index]++;
  }
}

// The number of the instance that an attempt with seed gets, among count: below(count) of the place of
// the seed whose names are template, the task's ID and instance (section 22).
export function pickOf(seed, id, count) {
  const { high, low } = stateOf(seed, [PLACE_FIRST, id, PLACE_LAST]);
  return Number(below(streamOf(high, low), BigInt(count)));
}

// What makes the instances of a template: a function from an instance's numbers to the task it is —
// the template with every placeholder replaced by its number in decimal digits, and every doubled
// brace by one, in a single pass, and without its template. Each string is read into pieces once. A
// placeholder of a result of the solver whose number is not given, which spec does not know, stays as
// it is written.
export function instanceMaker(task) {
  const results = new Set(resultsOf(task));
  const numberOf = (numbers, name) => (results.has(name) && !numbers.has(name) ? `{${name}}` : String(numbers.get(name)));
  const read = (value) => {
    if (typeof value === "string") {
      const { pieces } = piecesOf(value);
      return pieces.every((piece) => typeof piece === "string") ? () => pieces.join("") : (numbers) => pieces.map((piece) => (typeof piece === "string" ? piece : numberOf(numbers, piece.name))).join("");
    }
    if (Array.isArray(value)) {
      const items = value.map(read);
      return (numbers) => items.map((item) => item(numbers));
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value).map(([key, item]) => [key, read(item)]);
      return (numbers) => Object.fromEntries(entries.map(([key, item]) => [key, item(numbers)]));
    }
    return () => value;
  };
  return read(Object.fromEntries(Object.entries(task).filter(([key]) => key !== "template")));
}

export const instanceOf = (task, numbers) => instanceMaker(task)(numbers);

// What a reader shows of an instance: its parameters' numbers, in the order of their names.
export const instanceShown = (task, numbers) => numbersShown(numbers, Object.keys(task.template.parameters).sort(byCodeUnits));

// What spec checks of an instance whose solver's results it does not know: a function from the
// instance to the instance without the leak phrases that name a result. Its keys and trap values that
// name one keep their placeholders, which the rules of an answer slot pass over (section 24).
export function withoutResults(task) {
  const results = new Set(resultsOf(task));
  const dropped = new Set((task.leak_phrases ?? []).flatMap((phrase, index) => (namesIn(phrase).some((name) => results.has(name)) ? [index] : [])));
  if (!dropped.size) return (instance) => instance;
  return ({ leak_phrases: phrases, ...rest }) => {
    const kept = phrases.filter((_, index) => !dropped.has(index));
    return kept.length ? { ...rest, leak_phrases: kept } : rest;
  };
}

// The names of the numbers that the solver of a template gets on each instance, in the order of their
// names (section 24): the parameters and the derived numbers whose placeholders stand in the open
// view of the template, openView.
export function solverInputsOf(task, openView) {
  const { parameters, derived = {} } = task.template;
  const names = new Set(stringsOf(openView).flatMap(({ text }) => namesIn(text)));
  return [...names].filter((name) => Object.hasOwn(parameters, name) || Object.hasOwn(derived, name)).sort(byCodeUnits);
}
