// The verdicts of the check kinds of the module format, and the traps that wrong values match, as
// section 15 of its text gives them (format/README.md; R56, R57): a second implementation beside
// module-kit's, by which spec's CI computes the test vectors of verdicts. It computes every verdict
// but that of a predicate that runs: spec has no Starlark, so a predicate whose value is in notation
// gets null, and only module-kit computes it.

// The check kinds that give verdicts, and those that give feedback instead.
export const VERDICT_KINDS = ["number", "fraction", "choice", "predicate"];
export const FEEDBACK_KINDS = ["rubric"];

// A superscript or a subscript digit becomes U+FFFD, which no notation takes, so that NFKC does not
// make 7² into 72 (step 1); a unit such as cm² goes through the same step, and still matches. So
// does a vulgar fraction that a number stands right before or after, or NFKC would make 1½ into 11⁄2.
const SCRIPT_DIGIT = /[\u00B2\u00B3\u00B9\u2070-\u209F]/u;
const VULGAR_FRACTION = /[\u00BC-\u00BE\u2150-\u215F\u2189]/u;
const NUMBER_CHARACTER = /\p{N}/u;
const REPLACEMENT = "\uFFFD";
// The hyphens and dashes, and the minus sign, that become "-"; the slashes that become "/" (step 3).
const DASHES = /[\u2010\u2012-\u2015\u2212]/gu;
const SLASHES = /[\u2044\u2215]/gu;
// White space is the characters with the Unicode property White_Space (step 4): JavaScript's \s
// would miss U+0085 and take U+FEFF.
const WHITE_SPACE = /\p{White_Space}+/gu;
// The text without the run of the characters of chars that ends it. A loop: a regular expression
// such as / +$/ backtracks, in time quadratic in a long run that does not end the text.
function withoutEnd(text, chars) {
  let end = text.length;
  while (end > 0 && chars.includes(text[end - 1])) end--;
  return text.slice(0, end);
}
// After step 4, white space is single spaces; trim() would also drop U+FEFF, which is none.
const trimmed = (text) => withoutEnd(text, " ").replace(/^ +/, "");
const MAX_LENGTH = 16;
const INTEGER = /^-?(0|[1-9][0-9]*)$/;
const DECIMAL = /^-?(0|[1-9][0-9]*)\.[0-9]+$/;
const FRACTION = /^-?(0|[1-9][0-9]*) ?\/ ?[1-9][0-9]*$/;
// The one character whose full lowercase mapping is longer than its simple one, U+0130.
const SIMPLE_LOWER = new Map([["\u0130", "i"]]);

const BLANK = { verdict: "unreadable", reason: "blank" };
const NOTATION = { verdict: "unreadable", reason: "notation" };
const CORRECT = { verdict: "correct" };
const NOT_YET = { verdict: "not_yet" };

// Steps 2 to 4 of section 15: NFKC, the dashes and slashes, the white space.
export function normalized(text) {
  return trimmed(text.normalize("NFKC").replace(DASHES, "-").replace(SLASHES, "/").replace(WHITE_SPACE, " "));
}

// Each character to its simple lowercase mapping (UnicodeData.txt, field 13), as Go's
// unicode.ToLower: a character at a time, so that no context, such as a final sigma, counts.
export function lowercase(text) {
  let lowered = "";
  for (const char of text) lowered += SIMPLE_LOWER.get(char) ?? char.toLowerCase();
  return lowered;
}

// Step 1, before NFKC: the superscript and subscript digits, and the vulgar fractions that touch a
// number, become U+FFFD. The leak check takes the same step (section 20).
export function scriptsReplaced(text) {
  const chars = [...text];
  const touchesNumber = (at) => NUMBER_CHARACTER.test(chars[at - 1] ?? "") || NUMBER_CHARACTER.test(chars[at + 1] ?? "");
  return chars.map((char, at) => (SCRIPT_DIGIT.test(char) || (VULGAR_FRACTION.test(char) && touchesNumber(at)) ? REPLACEMENT : char)).join("");
}

// Steps 1 to 5, which a number's value and its units both go through.
function steps1To5(text) {
  return withoutEnd(normalized(scriptsReplaced(text)).replace(/^=/, ""), ".!?");
}

// The value as number, fraction and predicate read it, steps 1 to 7: { text }, or { reason } when it
// is blank.
export function readNumber(value, units = []) {
  const text = trimmed(withoutUnit(steps1To5(value), units));
  return text === "" ? { reason: "blank" } : { text };
}

// Step 6: of the units that end the text, with a space before it or none, the longest; dropped
// when something stands before it, and otherwise nothing is. Both sides compare by their
// lowercase, a character at a time.
function withoutUnit(text, units) {
  const chars = [...text];
  const lowered = lowercase(text);
  const fits = units
    .map((unit) => [...lowercase(trimmed(steps1To5(unit)))])
    .filter((unit) => unit.length > 0 && lowered.endsWith(unit.join("")))
    .sort((a, b) => b.length - a.length);
  if (!fits.length) return text;
  const before = chars.slice(0, chars.length - fits[0].length).join("");
  if (trimmed(before) === "") return text;
  return before.endsWith(" ") ? before.slice(0, -1) : before;
}

// A text in notation as a rational, { numerator, denominator } with the denominator positive, or
// null when it is not in the notation that the kind takes: number all three, fraction a simple
// fraction, predicate an integer.
export function rationalOf(text, kind) {
  if (text.length > MAX_LENGTH) return null;
  if (INTEGER.test(text)) return kind === "fraction" ? null : { numerator: BigInt(text), denominator: 1n };
  if (DECIMAL.test(text)) {
    if (kind !== "number") return null;
    const [whole, part] = text.split(".");
    const denominator = 10n ** BigInt(part.length);
    const magnitude = BigInt(whole.replace("-", "")) * denominator + BigInt(part);
    return { numerator: whole.startsWith("-") ? -magnitude : magnitude, denominator };
  }
  if (FRACTION.test(text)) {
    if (kind === "predicate") return null;
    const [numerator, denominator] = text.split("/").map((part) => BigInt(part.trim()));
    return { numerator, denominator };
  }
  return null;
}

export const equal = (a, b) => a.numerator * b.denominator === b.numerator * a.denominator;
export const absolute = (n) => (n < 0n ? -n : n);
const gcd = (a, b) => (b === 0n ? a : gcd(b, a % b));

// A value as number, fraction and predicate read it, steps 1 to 7 and the notation of the kind:
// { number }, or { reason }, blank or notation.
function numberOf(check, value) {
  const read = readNumber(value, check.kind === "number" ? check.units : []);
  if (read.reason) return read;
  const number = rationalOf(read.text, check.kind);
  return number ? { number } : { reason: "notation" };
}

// The verdict of an answer slot, an answer slot of a handwriting sheet or a box of a line, on the
// value read, a string or null: { verdict } or { verdict: "unreadable", reason }. null for a
// predicate whose value is in notation: Starlark decides it.
export function slotVerdict(slot, value) {
  const { check } = slot;
  if (value === null) return BLANK;
  if (check.kind === "choice") return choiceVerdict(value, check.key, check.options ?? slot.options);
  if (!["number", "fraction", "predicate"].includes(check.kind)) throw new Error(`format-check computes no verdict of the check kind ${check.kind}`);
  const { number, reason } = numberOf(check, value);
  if (reason) return reason === "blank" ? BLANK : NOTATION;
  if (check.kind === "predicate") return null;
  if (!equal(number, rationalOf(check.key, check.kind))) return NOT_YET;
  if (check.kind === "fraction" && check.form === "reduced" && gcd(absolute(number.numerator), number.denominator) !== 1n) return NOT_YET;
  return CORRECT;
}

// What a choice compares: the text normalized and in lowercase.
const choiceForm = (text) => lowercase(normalized(text));

// A choice compares the value with the key and the options, all normalized and in lowercase.
function choiceVerdict(value, key, options) {
  const read = choiceForm(value);
  if (read === "") return BLANK;
  if (read === choiceForm(key)) return CORRECT;
  return options.some((option) => choiceForm(option) === read) ? NOT_YET : NOTATION;
}

// What the check of an answer slot compares a value by, as a string, or null when the value is not
// in its notation: a choice, its normal form; a number or a fraction, its value in lowest terms.
export function comparableOf(slot, value) {
  const { check } = slot;
  if (check.kind === "choice") return choiceForm(value);
  if (check.kind !== "number" && check.kind !== "fraction") return null;
  const { number } = numberOf(check, value);
  if (!number) return null;
  const divisor = gcd(absolute(number.numerator), number.denominator);
  return `${number.numerator / divisor}/${number.denominator / divisor}`;
}

// The trap that a value read in an answer slot matches: the trap of the trap value that its check
// compares it equal to, for a value that is not yet right (section 15); otherwise null.
export function trapOf(slot, value) {
  if (value === null || slotVerdict(slot, value)?.verdict !== "not_yet") return null;
  const read = comparableOf(slot, value);
  return (slot.check.trap_values ?? []).find((trapValue) => comparableOf(slot, trapValue.value) === read)?.trap ?? null;
}

// The rules of a task that an answer slot's check breaks by itself (section 15): task.choice-key, a
// key that is none of the options as written; task.choice-options, two options alike once
// normalized; task.fraction-key, a key not in lowest terms when the form is reduced;
// task.trap-values, a trap value that is not yet right, for a choice not an option as written, or
// two trap values that the check compares equal.
export function slotBreaches(slot) {
  const { check } = slot;
  const breaches = [];
  const options = check.options ?? slot.options ?? [];
  if (check.kind === "choice") {
    if (!options.includes(check.key)) breaches.push("task.choice-key");
    const forms = options.map(choiceForm);
    if (new Set(forms).size !== forms.length) breaches.push("task.choice-options");
  }
  if (check.kind === "fraction" && check.form === "reduced") {
    const key = rationalOf(check.key, "fraction");
    if (key && gcd(absolute(key.numerator), key.denominator) !== 1n) breaches.push("task.fraction-key");
  }
  const trapValues = check.trap_values ?? [];
  const notYet = (trapValue) => slotVerdict(slot, trapValue.value)?.verdict === "not_yet" && (check.kind !== "choice" || options.includes(trapValue.value));
  const compared = trapValues.map((trapValue) => comparableOf(slot, trapValue.value));
  if (!trapValues.every(notYet) || new Set(compared).size !== compared.length) breaches.push("task.trap-values");
  return breaches;
}

// The verdict of an item, made of its answer slots' verdicts.
export function itemVerdict(verdicts) {
  if (verdicts.every((verdict) => verdict === "correct")) return "correct";
  for (const verdict of ["not_yet", "unreadable"]) if (verdicts.includes(verdict)) return verdict;
  return "unchecked";
}

// The answer slots of an item: on a handwriting sheet its answer_slots, on a workbook the boxes of
// its line.
export function answerSlotsOf(item) {
  return item.answer_slots ?? (item.line ?? []).filter((part) => "binding" in part);
}
