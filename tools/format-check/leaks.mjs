// The leak check of the module format, as section 20 of its text gives it (format/README.md; R57, R58):
// a second implementation beside module-kit's, by which spec's CI computes the test vectors of the leak
// check and checks task.no-leaks and lesson.no-leaks. The scans are loops over the characters: a
// regular expression over a text of any length could backtrack.

import { absolute, answerSlotsOf, equal, lowercase, normalized, rationalOf, scriptsReplaced } from "./verdicts.mjs";

// A character of a word: a letter, a mark or a number, the general categories L, M and N.
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;
const isWordCharacter = (char) => char !== undefined && WORD_CHARACTER.test(char);
const isDigit = (char) => char !== undefined && char >= "0" && char <= "9";
// The check kinds whose keys the leak check searches for: a predicate has no key, a rubric neither.
const KEYED_KINDS = new Set(["number", "fraction", "choice"]);
const VERDICT_KINDS = new Set(["number", "fraction", "choice", "predicate"]);

// The normal form of a text, of a key of a choice and of a leak phrase: step 1 of section 15, NFKC,
// the dashes and slashes, the white space, and each character to its simple lowercase mapping. An
// array of characters, so that a character outside the Basic Multilingual Plane is one.
export function leakForm(text) {
  return [...lowercase(normalized(scriptsReplaced(text)))];
}

// Where the digits from at end.
function digitsEnd(chars, at) {
  let end = at;
  while (isDigit(chars[end])) end++;
  return end;
}

const bigOf = (chars, start, end) => BigInt(chars.slice(start, end).join(""));

// The longest run of the form of a number that begins at a digit: a simple fraction, digits, an
// optional space, "/", an optional space and digits that are not all zero; a decimal, digits, "."
// and digits; or an integer. { end, numerator, denominator }.
function longestRun(chars, at) {
  const whole = digitsEnd(chars, at);
  let longest = { end: whole, numerator: bigOf(chars, at, whole), denominator: 1n };
  if (chars[whole] === "." && isDigit(chars[whole + 1])) {
    const end = digitsEnd(chars, whole + 1);
    const denominator = 10n ** BigInt(end - whole - 1);
    longest = { end, numerator: bigOf(chars, at, whole) * denominator + bigOf(chars, whole + 1, end), denominator };
  }
  let slash = whole;
  if (chars[slash] === " ") slash++;
  if (chars[slash] === "/") {
    const start = chars[slash + 1] === " " ? slash + 2 : slash + 1;
    const end = digitsEnd(chars, start);
    if (end > start && end > longest.end) {
      const denominator = bigOf(chars, start, end);
      if (denominator !== 0n) longest = { end, numerator: bigOf(chars, at, whole), denominator };
    }
  }
  return longest;
}

// The numbers of a text in its normal form, each { numerator, denominator }. At each digit the
// longest run of the form of a number is taken: it is a number when no character of a word stands
// right before it and none right after it, and either way the search goes on after the whole run,
// so that no tail of a longer token, as the 5 of x7.5, is read as a number.
export function numbersIn(chars) {
  const numbers = [];
  let at = 0;
  while (at < chars.length) {
    if (!isDigit(chars[at])) {
      at++;
      continue;
    }
    const { end, numerator, denominator } = longestRun(chars, at);
    if (!isWordCharacter(chars[at - 1]) && !isWordCharacter(chars[end])) numbers.push({ numerator, denominator });
    at = end;
  }
  return numbers;
}

const magnitudeOf = ({ numerator, denominator }) => ({ numerator: absolute(numerator), denominator });

// Whether a needle's normal form stands in a text's normal form at at.
function standsAt(chars, form, at) {
  for (let i = 0; i < form.length; i++) if (chars[at + i] !== form[i]) return false;
  return true;
}

// Whether a phrase in its normal form — a key of a choice or a leak phrase — is found in a text's
// normal form: where it stands, with no character of a word right outside an end of it that is a
// character of a word itself. A phrase whose normal form is empty is found nowhere.
export function holdsForm(chars, form) {
  if (!form.length) return false;
  const opensWord = isWordCharacter(form[0]);
  const closesWord = isWordCharacter(form[form.length - 1]);
  for (let at = 0; at + form.length <= chars.length; at++) {
    if (!standsAt(chars, form, at)) continue;
    if (opensWord && isWordCharacter(chars[at - 1])) continue;
    if (closesWord && isWordCharacter(chars[at + form.length])) continue;
    return true;
  }
  return false;
}

// A text in its normal form, with its numbers, which every key of a number searches.
function searched(text) {
  const chars = leakForm(text);
  return { chars, numbers: numbersIn(chars) };
}

// A needle, normalized once: a key of a number or a fraction by its magnitude, and a key of a choice
// or a leak phrase by its normal form. written is how the task writes it.
function needleOf(written, kind) {
  if (kind === "number" || kind === "fraction") return { written, magnitude: magnitudeOf(rationalOf(written, kind)) };
  return { written, form: leakForm(written) };
}

// Whether a needle is found in a searched text.
function holds(text, needle) {
  if (needle.form) return holdsForm(text.chars, needle.form);
  return text.numbers.some((number) => equal(magnitudeOf(number), needle.magnitude));
}

const isText = (text) => typeof text === "string";

// The texts that the learner reads in parts such as a statement's: the paragraphs, and the alt of
// the pictures.
const partTexts = (parts) => (parts ?? []).flatMap((part) => [part.text, part.alt]).filter(isText);

// The texts that the learner sees with an item: the paragraphs of the statement and the alt of its
// pictures, the item's text, the text pieces of its line and the options of its answer slots bound
// choice.
function ownTextsOf(task, item) {
  const line = (item.line ?? []).map((part) => part.text);
  const options = (item.answer_slots ?? []).flatMap((slot) => (slot.binding === "choice" ? slot.options : []));
  return [...partTexts(task.statement), item.text, ...line, ...options].filter(isText);
}

// A key of a number or a fraction is searched for only when it is in notation: a key that holds a
// placeholder, outside a template, breaks task.placeholders instead (section 23).
const isSearchable = (check) => (check.kind !== "number" && check.kind !== "fraction") || rationalOf(check.key, check.kind) !== null;

// What the leak check searches a text for (section 20): the key of every check of a number, a
// fraction or a choice that the texts of its own item do not show, and every leak phrase.
export function needlesOf(task) {
  const needles = [];
  for (const item of task.items ?? []) {
    const own = ownTextsOf(task, item).map(searched);
    for (const { check } of answerSlotsOf(item)) {
      if (!KEYED_KINDS.has(check.kind) || !isSearchable(check)) continue;
      const needle = needleOf(check.key, check.kind);
      if (!own.some((text) => holds(text, needle))) needles.push(needle);
    }
  }
  for (const phrase of task.leak_phrases ?? []) needles.push(needleOf(phrase, "phrase"));
  return needles;
}

// The keys and leak phrases among the needles that the leak check finds in a text, as the task
// writes them, each once.
export function leaksIn(text, needles) {
  const target = searched(text);
  return [...new Set(needles.filter((needle) => holds(target, needle)).map((needle) => needle.written))];
}

export const leaksOf = (text, task) => leaksIn(text, needlesOf(task));

const hasVerdict = (task) => (task.items ?? []).some((item) => answerSlotsOf(item).some((slot) => VERDICT_KINDS.has(slot.check.kind)));
const trapValuesOf = (task) => (task.items ?? []).flatMap((item) => answerSlotsOf(item).flatMap((slot) => slot.check.trap_values ?? []));

// The traps that a task names: in its traps, and in the trap values of its checks.
export const trapsNamed = (task) => [...(task.traps ?? []), ...trapValuesOf(task).map((trapValue) => trapValue.trap)];

// The texts of a module that the learner can see before a task is solved, which task.no-leaks
// searches: the task's givens and unknown, the text of each trap value and the simpler case of each
// item; and, of the module's other parts when they are given, the title and description of each
// technique the task names, the advice of each trap it names and, for a task with an item with a
// verdict, the manifest's rung templates.
export function textsShownBefore(task, { manifest, traps, techniques } = {}) {
  const texts = [...(task.givens ?? []), task.unknown, ...(task.items ?? []).map((item) => item.simpler_case), ...trapValuesOf(task).map((trapValue) => trapValue.text)];
  for (const id of task.techniques ?? []) texts.push(techniques?.techniques?.[id]?.title, techniques?.techniques?.[id]?.description);
  for (const id of trapsNamed(task)) texts.push(traps?.traps?.[id]?.trap_advice);
  if (hasVerdict(task)) texts.push(...(manifest?.rung_templates ?? []));
  return texts.filter(isText);
}

// Whether a task breaks task.no-leaks: a text that it shows before it is solved holds a key or a leak
// phrase of it.
export function leaksBefore(task, parts) {
  const needles = needlesOf(task);
  return textsShownBefore(task, parts).some((text) => leaksIn(text, needles).length > 0);
}

// The texts of a lesson, which lesson.no-leaks searches (section 21): its title, and the paragraphs
// and the alt of the pictures of each explanation and of each worked example's statement and demo.
// The open view of a lesson reaches the learner's app whole, so a text after a task is seen before
// the task is solved too.
export function lessonTexts(lesson) {
  const segments = lesson.segments ?? [];
  const parts = segments.flatMap((segment) => [...(segment.explanation ?? []), ...(segment.worked_example?.statement ?? []), ...(segment.worked_example?.demo ?? [])]);
  return [lesson.title, ...partTexts(parts)].filter(isText);
}

// Whether a lesson breaks lesson.no-leaks: one of its texts holds a key or a leak phrase of a task
// that it names. tasks maps the local ID of each task of the module to the tasks that it is: the task
// itself, or the instances of a template (section 23); a task that the module does not hold is
// lesson.known-tasks', not this rule's. Each text is normalized once.
export function lessonLeaks(lesson, tasks) {
  const texts = lessonTexts(lesson).map(searched);
  const named = new Set((lesson.segments ?? []).map((segment) => segment.task).filter((id) => tasks.has(id)));
  return [...named].some((id) => tasks.get(id).some((task) => needlesOf(task).some((needle) => texts.some((text) => holds(text, needle)))));
}
