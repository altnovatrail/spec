// The verdicts of the check kinds of the module format, as section 15 of its text gives them
// (format/README.md; R56): a second implementation beside module-kit's, by which spec's CI computes
// the test vectors of verdicts. It computes every verdict but that of a predicate that runs: spec has
// no Starlark, so a predicate whose value is in notation gets null, and only module-kit computes it.

// The check kinds that give verdicts, and those that give feedback instead.
export const VERDICT_KINDS = ["number", "fraction", "choice", "predicate"];
export const FEEDBACK_KINDS = ["rubric"];

// A superscript or a subscript digit becomes U+FFFD, which no notation takes, so that NFKC does not
// make 7² into 72 (step 1); a unit such as cm² goes through the same step, and still matches.
const SCRIPT_DIGITS = /[\u00B2\u00B3\u00B9\u2070-\u209F]/gu;
const REPLACEMENT = "\uFFFD";
// The hyphens and dashes, and the minus sign, that become "-"; the slashes that become "/" (step 3).
const DASHES = /[\u2010\u2012-\u2015\u2212]/gu;
const SLASHES = /[\u2044\u2215]/gu;
// White space is the characters with the Unicode property White_Space (step 4): JavaScript's \s
// would miss U+0085 and take U+FEFF.
const WHITE_SPACE = /\p{White_Space}+/gu;
// After step 4, white space is single spaces; trim() would also drop U+FEFF, which is none.
const trimmed = (text) => text.replace(/^ +| +$/g, "");
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

// Steps 1 to 5, which a number's value and its units both go through.
function steps1To5(text) {
  return normalized(text.replace(SCRIPT_DIGITS, REPLACEMENT)).replace(/^=/, "").replace(/[.!?]+$/, "");
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

const equal = (a, b) => a.numerator * b.denominator === b.numerator * a.denominator;
const absolute = (n) => (n < 0n ? -n : n);
const gcd = (a, b) => (b === 0n ? a : gcd(b, a % b));

// The verdict of an answer slot, an answer slot of a handwriting sheet or a box of a line, on the
// value read, a string or null: { verdict } or { verdict: "unreadable", reason }. null for a
// predicate whose value is in notation: Starlark decides it.
export function slotVerdict(slot, value) {
  const { check } = slot;
  if (value === null) return BLANK;
  if (check.kind === "choice") return choiceVerdict(value, check.key, check.options ?? slot.options);
  if (!["number", "fraction", "predicate"].includes(check.kind)) throw new Error(`format-check computes no verdict of the check kind ${check.kind}`);
  const read = readNumber(value, check.kind === "number" ? check.units : []);
  if (read.reason) return read.reason === "blank" ? BLANK : NOTATION;
  const number = rationalOf(read.text, check.kind);
  if (!number) return NOTATION;
  if (check.kind === "predicate") return null;
  if (!equal(number, rationalOf(check.key, check.kind))) return NOT_YET;
  if (check.kind === "fraction" && check.form === "reduced" && gcd(absolute(number.numerator), number.denominator) !== 1n) return NOT_YET;
  return CORRECT;
}

// A choice compares the value with the key and the options, all normalized and in lowercase.
function choiceVerdict(value, key, options) {
  const form = (text) => lowercase(normalized(text));
  const read = form(value);
  if (read === "") return BLANK;
  if (read === form(key)) return CORRECT;
  return options.some((option) => form(option) === read) ? NOT_YET : NOTATION;
}

// The rules of a task that an answer slot's check breaks by itself (section 15): task.choice-key, a
// key that is none of the options as written; task.choice-options, two options alike once
// normalized; task.fraction-key, a key not in lowest terms when the form is reduced.
export function slotBreaches(slot) {
  const { check } = slot;
  const breaches = [];
  if (check.kind === "choice") {
    const options = check.options ?? slot.options ?? [];
    if (!options.includes(check.key)) breaches.push("task.choice-key");
    const forms = options.map((option) => lowercase(normalized(option)));
    if (new Set(forms).size !== forms.length) breaches.push("task.choice-options");
  }
  if (check.kind === "fraction" && check.form === "reduced") {
    const key = rationalOf(check.key, "fraction");
    if (key && gcd(absolute(key.numerator), key.denominator) !== 1n) breaches.push("task.fraction-key");
  }
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
