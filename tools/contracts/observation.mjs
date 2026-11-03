// The test vectors of the observation, novatrail.observation.v1 (contracts/README.md, section 10;
// R86; RUN.md, T68): a second implementation of what module-kit does with observations — which
// one is valid, how two readers' observations join into one, and which verdict the joined one
// gives — beside module-kit's own, whose CI passes the same vectors. The verdicts of the check
// kinds are format-check's (tools/format-check/verdicts.mjs): spec has no Starlark, so the verdict
// of a predicate on a value in its notation is the vector's, while the join of two such values,
// which compares the integers read, is computed here too.
//
// A vector is a JSON file, contracts/vectors/observation/v1/<case>.json:
// - description, what the file is about; canvas, the task's canvas as the module format writes it;
//   and items, the task's items, each an item of the module format with the checks of its answer
//   slots, on a workbook all lines and on a handwriting sheet all with answer slots;
// - cases, each with its description, the observations of the readers in the order of the pair —
//   one for an essay, two otherwise —, as JSON with the protobuf names and every field written, and
//   valid, whether each is a valid observation;
// - tapped, when the task has answer slots bound choice: the text of the option tapped in each, in
//   order, or null where the learner tapped none;
// - for an essay, submission: assessment, unreadable or unchecked; otherwise joined, the joined
//   observation, null when either is not valid, and verdicts, each item's: its answer slots' and its
//   own, as a vector of verdicts of the module format writes them.
// The observations are read by @bufbuild/protobuf with the descriptors of the image buf builds of
// contracts/: the generated JavaScript beside the .proto files imports the runtime by a bare name,
// which resolves only where the npm package is installed (tools/contracts/typescript.mjs).

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createFileRegistry, fromJson, toJson } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { parseDocument, LineCounter } from "yaml";
import { byCodeUnits } from "../shared.mjs";
import { compileSchemas, readSchema } from "../format-check/schemas.mjs";
import { FEEDBACK_KINDS, VERDICT_KINDS, answerSlotsOf, itemVerdict, readingOf, slotBreaches, slotVerdict, trapOf } from "../format-check/verdicts.mjs";
import { isObject } from "./rules.mjs";

export const PACKAGE = "novatrail.observation.v1";
export const FOLDER = "contracts/vectors/observation/v1";
const TEXT = "contracts/README.md, section 10";
const OBSERVATION = `${PACKAGE}.Observation`;
const UNREADABLE = `${PACKAGE}.Unreadable`;
const UNSPECIFIED = "UNREADABLE_UNSPECIFIED";
const BLANK = "UNREADABLE_BLANK";
const AMBIGUOUS = "UNREADABLE_AMBIGUOUS";

// Each reason of the observation, with the reason of the verdict it gives: the table of section 10.
// A reason the package adds is named here by the task that adds it.
export const REASONS = new Map([
  [BLANK, "blank"],
  ["UNREADABLE_ILLEGIBLE", "illegible"],
  [AMBIGUOUS, "ambiguous"],
  ["UNREADABLE_NO_FINAL_ANSWER", "no_final_answer"],
  ["UNREADABLE_SEVERAL_FINAL_ANSWERS", "several_final_answers"],
]);
// The reasons that only an answer slot bound anywhere gives, and the ones an essay gives.
const FINAL_ANSWER = new Set(["UNREADABLE_NO_FINAL_ANSWER", "UNREADABLE_SEVERAL_FINAL_ANSWERS"]);
const ESSAY_REASONS = new Set([BLANK, "UNREADABLE_ILLEGIBLE"]);
const VERDICTS = ["correct", "not_yet", "unreadable", "unchecked"];
const SUBMISSIONS = ["assessment", "unreadable", "unchecked"];
// The form of the items on each canvas kind (format/README.md, section 14).
const ITEM_FORM = { workbook: "line", handwriting_sheet: "answer_slots" };
// Writing an observation as a vector holds it: the protobuf names (contracts/README.md, section 6),
// and every field with its zero too, so that a box at 0 says so.
const WRITTEN = { useProtoFieldName: true, alwaysEmitImplicit: true };
const WHITE_SPACE = /^\p{White_Space}*$/u;

const show = (value) => JSON.stringify(value);
const placeOf = (place) => `${place?.item ?? "?"}.${place?.slot ?? "?"}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The message Observation and the reasons of the enum Unreadable, of the image buf builds of
// contracts/: { message, reasons }, or { error }. Every file of the package is read, whichever
// holds what; the well-known types a file may import come from the runtime, since the image
// leaves imports out.
export function packageOf(image) {
  const set = fromJson(wkt.FileDescriptorSetSchema, image, { ignoreUnknownFields: true });
  const known = new Map(Object.values(wkt).filter((value) => value?.kind === "file").map((file) => [file.proto.name, file]));
  const resolve = (name) => set.file.find((proto) => proto.name === name) ?? known.get(name);
  const registry = createFileRegistry(...set.file.filter((proto) => proto.package === PACKAGE).map((proto) => createFileRegistry(proto, resolve)));
  const message = registry.getMessage(OBSERVATION);
  if (!message) return { error: `the image of buf build has no ${OBSERVATION}, which the vectors are of` };
  const reasons = registry.getEnum(UNREADABLE);
  if (!reasons) return { error: `the image of buf build has no ${UNREADABLE}, which the vectors are of` };
  const names = reasons.values.map((value) => value.name).filter((name) => name !== UNSPECIFIED);
  const unnamed = names.filter((name) => !REASONS.has(name));
  if (unnamed.length) return { error: `${UNREADABLE} has ${unnamed.join(", ")}, which the table of ${TEXT} does not name; the task that adds a reason extends the check` };
  return { message, reasons: new Set(names) };
}

// The validators of a vector's canvas and items, by the schemas of format/ in the same tree: { canvas,
// item }, or { error } while they do not compile, which format-check reports.
export function formatValidators(root) {
  const names = fs.readdirSync(path.join(root, "format/schemas")).filter((name) => name.endsWith(".schema.json")).sort(byCodeUnits);
  const schemas = names.map((name) => readSchema(root, name));
  const id = schemas.find((schema) => schema.term === "task")?.json?.$id;
  const { schemaAt } = compileSchemas(schemas);
  const canvas = id ? schemaAt(`${id}#/properties/canvas`) : undefined;
  const item = id ? schemaAt(`${id}#/$defs/item`) : undefined;
  return canvas && item ? { canvas, item } : { error: "the schema of a task does not compile, so a vector's canvas and items go unchecked; just format-check names what is wrong" };
}

// A vector's bytes read: { value, lineOf }, or { problems }. The file is UTF-8 JSON, as JSON.parse
// reads it, with no key twice in an object — JSON.parse keeps the last without a word, and yaml,
// for which JSON is YAML, names the second — and every string well formed, so that every reader
// takes the same text.
export function readVector(bytes) {
  let text;
  let value;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    value = JSON.parse(text);
  } catch (error) {
    return { problems: [{ line: 1, message: `not JSON: ${error.message}` }] };
  }
  const lines = new LineCounter();
  const document = parseDocument(text, { uniqueKeys: true, lineCounter: lines, logLevel: "error" });
  const lineOf = (at) => {
    for (let length = at.length; length >= 0; length--) {
      const node = document.getIn(at.slice(0, length), true);
      if (node?.range) return lines.linePos(node.range[0]).line;
    }
    return 1;
  };
  const problems = document.errors.filter((error) => error.code === "DUPLICATE_KEY").map((error) => ({ line: lines.linePos(error.pos[0]).line, message: "a key that its object has already" }));
  const strings = (node, at) => {
    if (typeof node === "string" && !node.isWellFormed()) problems.push({ line: lineOf(at), message: `${show(node)} holds a lone surrogate, which a reader in Go reads otherwise` });
    else if (Array.isArray(node)) node.forEach((item, i) => strings(item, [...at, i]));
    else if (isObject(node)) {
      for (const [key, item] of Object.entries(node)) {
        strings(key, at);
        strings(item, [...at, key]);
      }
    }
  };
  strings(value, []);
  return problems.length ? { problems } : { value, lineOf };
}

// The keys an object has beyond those given, and those it lacks of the required ones.
function keysOf(object, required, optional = []) {
  const unknown = Object.keys(object).filter((key) => !required.includes(key) && !optional.includes(key));
  const missing = required.filter((key) => !(key in object));
  return [...unknown.map((key) => `${key}: no such key`), ...missing.map((key) => `${key} is missing`)];
}

// What makes an observation not valid, given the answer slots that AI reads, in order, each { item,
// slot, at } with at the answer slot of the module format, and the reasons the package knows: the
// conditions of section 10 it breaks, none when it is valid.
export function breaches(observation, places, reasons) {
  const found = [];
  const slots = observation.answer_slots;
  const expected = places.map(placeOf);
  const given = slots.map((slot) => placeOf(slot.answer_slot));
  if (!isDeepStrictEqual(given, expected)) found.push(`it holds the answer slots ${given.join(", ") || "none"}, and AI reads ${expected.join(", ")}, each once and in order, and no other`);
  const byPlace = new Map(places.map((place) => [placeOf(place), place.at]));
  for (const slot of slots) {
    const at = placeOf(slot.answer_slot);
    const binding = byPlace.get(at)?.binding;
    if ("value" in slot) {
      if (WHITE_SPACE.test(slot.value)) found.push(`${at}: its value ${show(slot.value)} is empty or only white space`);
      if (binding === "sheet" && slot.crop_box) found.push(`${at}: a slot bound sheet has no crop_box`);
    } else if ("unreadable" in slot) {
      const reason = slot.unreadable;
      if (reason === UNSPECIFIED) found.push(`${at}: its reason is ${UNSPECIFIED}`);
      else if (!reasons.has(reason)) found.push(`${at}: its reason ${show(reason)} is none that the package knows`);
      else if (FINAL_ANSWER.has(reason) && binding !== "anywhere" && binding) found.push(`${at}: ${reason} only in a slot bound anywhere, and this one is bound ${binding}`);
      else if (binding === "sheet" && !ESSAY_REASONS.has(reason)) found.push(`${at}: a slot bound sheet gives a value, ${BLANK} or UNREADABLE_ILLEGIBLE, not ${reason}`);
      if (slot.crop_box) found.push(`${at}: a crop_box stands only beside a value`);
    } else found.push(`${at}: it gives neither a value nor a reason`);
    const box = slot.crop_box;
    if (box && "value" in slot && binding !== "sheet") {
      if (binding !== "anywhere" && binding) found.push(`${at}: a crop_box only in a slot bound anywhere, and this one is bound ${binding}`);
      else if (![box.ymin, box.xmin, box.ymax, box.xmax].every((n) => n >= 0 && n <= 1000) || box.ymin >= box.ymax || box.xmin >= box.xmax) found.push(`${at}: the crop_box ${show(box)} is not whole thousandths from 0 to 1000 with ymin < ymax and xmin < xmax`);
    }
  }
  return found;
}

// A reader's answer slot as the join takes it: { reason }, or { value, box, reading }; a value that
// the kind normalizes to nothing is UNREADABLE_BLANK before any pairing.
function sideOf(slot, read) {
  if (!("value" in read)) return { reason: read.unreadable };
  const reading = readingOf(slot, read.value);
  return reading.blank ? { reason: BLANK } : { value: read.value, box: read.crop_box, reading };
}

// The joined observation of two valid ones, answer slot by answer slot (section 10): two values that
// read as the same join into the first, with the first's box or else the second's; two reasons
// that are the same into that reason; every other pair into UNREADABLE_AMBIGUOUS.
export function join(first, second, places) {
  return {
    answer_slots: places.map((place, i) => {
      const [a, b] = [sideOf(place.at, first.answer_slots[i]), sideOf(place.at, second.answer_slots[i])];
      const joined = { answer_slot: first.answer_slots[i].answer_slot };
      if ("value" in a && "value" in b && isDeepStrictEqual(a.reading, b.reading)) {
        joined.value = a.value;
        if (a.box ?? b.box) joined.crop_box = a.box ?? b.box;
      } else joined.unreadable = "reason" in a && a.reason === b.reason ? a.reason : AMBIGUOUS;
      return joined;
    }),
  };
}

// What an answer slot gets on a value, a string or null: { verdict, reason?, trap? } as section 15
// of the module format gives it, or { verdict: null } for a predicate on a value in its notation,
// whose verdict Starlark gives.
function verdictOn(slot, value) {
  const computed = slotVerdict(slot, value);
  const trap = trapOf(slot, value);
  return computed === null ? { verdict: null } : { ...computed, ...(trap ? { trap } : {}) };
}

// An observation of a vector against the message, at a path of the vector: { observation }, as it
// reads, or { problem } when it does not read, or is not as a writer writes it.
function observationAt(json, message, which) {
  let read;
  try {
    read = toJson(message, fromJson(message, json), WRITTEN);
  } catch (error) {
    return { problem: `${which} does not read as ${OBSERVATION}: ${error.message}` };
  }
  if (!isDeepStrictEqual(read, json)) return { problem: `${which} is not as a writer writes it, with the protobuf names and every field: ${show(read)} (contracts/README.md, section 6)` };
  return { observation: read };
}

// A vector, its bytes, against the package and the format's validators: { problems, seen }, with
// seen what the vector holds for the package's coverage — the reasons that joined observations
// give, the check kinds, whether an observation is not valid, whether a choice is tapped — and
// cases, how many it holds.
export function checkVector(bytes, { message, reasons, canvas, item }) {
  const seen = { reasons: new Set(), kinds: new Set(), invalid: false, tapped: false, cases: 0 };
  const read = readVector(bytes);
  if (read.problems) return { problems: read.problems, seen };
  const { value, lineOf } = read;
  const problems = [];
  const problem = (at, text) => problems.push({ line: lineOf(at), message: text });
  if (!isObject(value)) return { problems: [{ line: 1, message: "a vector is an object: description, canvas, items and cases" }], seen };
  for (const text of keysOf(value, ["description", "canvas", "items", "cases"])) problem([], text);
  if (problems.length) return { problems, seen };
  if (typeof value.description !== "string" || value.description.trim() === "") problem(["description"], "description is a text that says what the vector holds");
  if (!canvas(value.canvas)) problem(["canvas"], `canvas is not a canvas of the module format: ${canvas.errors.map((error) => `${error.instancePath || "it"} ${error.message}`).join("; ")}`);
  if (!Array.isArray(value.items) || value.items.length === 0) problem(["items"], "items lists the task's items, one at least");
  if (!Array.isArray(value.cases) || value.cases.length === 0) problem(["cases"], "cases lists the cases, one at least");
  if (problems.length) return { problems, seen };

  // The task: its items are those of the module format, of the form of its canvas, and break no rule
  // of a task that their checks show; an answer slot bound anywhere or sheet is its only one.
  const form = ITEM_FORM[value.canvas.kind];
  value.items.forEach((one, i) => {
    if (!item(one)) problem(["items", i], `item ${i + 1} is not an item of the module format: ${item.errors.map((error) => `${error.instancePath || "it"} ${error.message}`).join("; ")}`);
    else if (!(form in one)) problem(["items", i], `item ${i + 1} has no ${form}, which an item on a ${value.canvas.kind} has`);
    else for (const [j, slot] of answerSlotsOf(one).entries()) for (const rule of slotBreaches(slot)) problem(["items", i], `answer slot ${i + 1}.${j + 1} breaks ${rule}: the items of a vector are those a task may hold`);
  });
  if (problems.length) return { problems, seen };
  const all = value.items.flatMap((one, i) => answerSlotsOf(one).map((slot, j) => ({ item: i + 1, slot: j + 1, at: slot })));
  const alone = all.find((place) => place.at.binding === "anywhere" || place.at.binding === "sheet");
  if (alone && all.length > 1) return { problems: [{ line: lineOf(["items"]), message: `answer slot ${placeOf(alone)} is bound ${alone.at.binding}, so it is the only answer slot of its task (format/README.md, section 14)` }], seen };
  const places = all.filter((place) => place.at.binding !== "choice");
  const choices = all.filter((place) => place.at.binding === "choice");
  if (places.length === 0) return { problems: [{ line: lineOf(["items"]), message: "no answer slot of the task is read by AI: every one is bound choice, so there is no observation" }], seen };
  for (const place of all) seen.kinds.add(place.at.check.kind);
  const essay = all.length === 1 && all[0].at.binding === "sheet";
  seen.cases = value.cases.length;

  value.cases.forEach((one, k) => {
    const at = ["cases", k];
    const which = `case ${k + 1}`;
    const here = (text, more = []) => problem([...at, ...more], `${which}: ${text}`);
    if (!isObject(one)) return here("a case is an object");
    const keys = essay ? ["description", "observations", "valid", "submission"] : ["description", "observations", "valid", "joined", "verdicts", ...(choices.length ? ["tapped"] : [])];
    const wrong = keysOf(one, keys);
    if (wrong.length) return wrong.forEach((text) => here(text));
    if (typeof one.description !== "string" || one.description.trim() === "") return here("description is a text that says what the case shows", ["description"]);
    const readers = essay ? 1 : 2;
    if (!Array.isArray(one.observations) || one.observations.length !== readers) return here(`observations lists ${plural(readers, "observation")}: ${essay ? "an essay has one reader" : "two readers of one provider read the work"}`, ["observations"]);
    if (!Array.isArray(one.valid) || one.valid.length !== readers || !one.valid.every((flag) => typeof flag === "boolean")) return here(`valid is ${readers === 1 ? "true or false" : "two of true and false"}, one for each observation`, ["valid"]);

    const observations = [];
    for (const [n, json] of one.observations.entries()) {
      const read = observationAt(json, message, `observation ${n + 1}`);
      if (read.problem) return here(read.problem, ["observations", n]);
      observations.push(read.observation);
    }
    const valid = observations.map((observation, n) => {
      const found = breaches(observation, places, reasons);
      if ((found.length === 0) !== one.valid[n]) here(`observation ${n + 1} is ${found.length ? `not valid — ${found.join("; ")} —` : "valid"}, and valid says ${one.valid[n]}`, ["valid", n]);
      else if (found.length > 1) here(`observation ${n + 1} breaks ${found.length} conditions of validity — ${found.join("; ")} —, and one that is not valid breaks one, so that it shows which`, ["observations", n]);
      return found.length === 0;
    });
    if (valid.includes(false)) seen.invalid = true;

    if (essay) {
      if (!SUBMISSIONS.includes(one.submission)) return here(`submission is one of ${SUBMISSIONS.join(", ")}`, ["submission"]);
      const ends = !valid[0] ? "unchecked" : "value" in observations[0].answer_slots[0] ? "assessment" : "unreadable";
      if (ends !== one.submission) here(`the submission ends ${ends}, not ${one.submission}`, ["submission"]);
      return;
    }

    // The options tapped, one for each answer slot bound choice, in order: the text of an option as
    // written, or null.
    const tapped = new Map();
    if (choices.length) {
      const list = Array.isArray(one.tapped) ? one.tapped : [];
      const listed = list.map((tap) => placeOf(tap?.answer_slot));
      if (!isDeepStrictEqual(listed, choices.map(placeOf))) return here(`tapped lists ${listed.join(", ") || "none"}, and the answer slots bound choice are ${choices.map(placeOf).join(", ")}`, ["tapped"]);
      for (const [n, tap] of list.entries()) {
        const slot = choices[n].at;
        const wrong = keysOf(tap, ["answer_slot", "value"]);
        const { answer_slot: place } = tap;
        if (wrong.length || !isDeepStrictEqual(Object.keys(place).sort(byCodeUnits), ["item", "slot"]) || !Number.isInteger(place.item) || !Number.isInteger(place.slot)) return here(`tapped ${n + 1} is { answer_slot: { item, slot }, value }, its place in integers`, ["tapped", n]);
        if (tap.value !== null && !slot.options.includes(tap.value)) return here(`tapped ${n + 1}: ${show(tap.value)} is none of the options as written, ${show(slot.options)}`, ["tapped", n]);
        if (tap.value !== null) seen.tapped = true;
        tapped.set(placeOf(choices[n]), tap.value);
      }
    }

    // The joined observation, or none when either is not valid.
    const joined = valid.every(Boolean) ? join(observations[0], observations[1], places) : null;
    if (one.joined === null) {
      if (joined) here(`the observations join into ${show(joined)}, not null`, ["joined"]);
    } else {
      const read = observationAt(one.joined, message, "joined");
      if (read.problem) return here(read.problem, ["joined"]);
      if (!joined) return here("an observation is not valid, so there is no joined one: joined is null", ["joined"]);
      if (!isDeepStrictEqual(read.observation, joined)) here(`the observations join into ${show(joined)}`, ["joined"]);
    }
    for (const slot of joined?.answer_slots ?? []) if ("unreadable" in slot) seen.reasons.add(slot.unreadable);

    // The verdicts: each answer slot's, of the joined observation or the option tapped, and each
    // item's, made of its answer slots' as the vector gives them, since a predicate's are Starlark's.
    const joinedAt = new Map((joined?.answer_slots ?? []).map((slot) => [placeOf(slot.answer_slot), slot]));
    if (!Array.isArray(one.verdicts) || one.verdicts.length !== value.items.length) return here(`verdicts lists ${plural(value.items.length, "item")}, each with its answer slots' verdicts and its own`, ["verdicts"]);
    value.items.forEach((task, i) => {
      const given = one.verdicts[i];
      const slots = answerSlotsOf(task);
      const atItem = ["verdicts", i];
      if (!isObject(given) || keysOf(given, ["answer_slots", "verdict"]).length || !Array.isArray(given.answer_slots) || given.answer_slots.length !== slots.length) return here(`the verdicts of item ${i + 1} are { answer_slots, verdict }, with ${plural(slots.length, "answer slot")}`, atItem);
      let shaped = true;
      for (const [j, slot] of slots.entries()) {
        const mine = given.answer_slots[j];
        const where = `answer slot ${i + 1}.${j + 1}`;
        const atSlot = [...atItem, "answer_slots", j];
        if (!isObject(mine) || keysOf(mine, ["verdict"], ["reason", "trap"]).length || !VERDICTS.includes(mine.verdict)) {
          here(`the verdict of ${where} is { verdict, reason, trap }, with a verdict of ${VERDICTS.join(", ")}`, atSlot);
          shaped = false;
          continue;
        }
        // A slot bound choice gets the verdict of the option tapped, whatever the observations are;
        // a slot that AI reads, that of its joined read, or unchecked with no joined observation.
        const place = `${i + 1}.${j + 1}`;
        const read = joinedAt.get(place);
        let expected;
        if (slot.binding === "choice") expected = verdictOn(slot, tapped.get(place));
        else if (!read) expected = { verdict: "unchecked" };
        else if ("value" in read) expected = verdictOn(slot, read.value);
        else expected = { verdict: "unreadable", reason: REASONS.get(read.unreadable) };
        if (expected.verdict === null) {
          if (!["correct", "not_yet", "unchecked"].includes(mine.verdict) || "reason" in mine || "trap" in mine) here(`${where}: ${show(read.value)} is in the notation of a predicate, which Starlark gives correct, not_yet or unchecked, with no reason and no trap`, atSlot);
        } else if (!isDeepStrictEqual(mine, expected)) here(`${where} gets ${show(expected)}, not ${show(mine)}`, atSlot);
      }
      const made = shaped && itemVerdict(given.answer_slots.map((mine) => mine.verdict));
      if (shaped && made !== given.verdict) here(`the answer slots of item ${i + 1} make it ${made}, not ${given.verdict}`, [...atItem, "verdict"]);
    });
  });
  return { problems, seen };
}

// The vectors of the observation at root, files of contracts/, by the image buf builds: the
// errors, { file, line, message } — each vector's, and, when every one holds, what they lack
// together: every reason of the table of section 10 that a joined observation gives, every check
// kind, an observation that is not valid and a choice tapped — and how many cases they hold.
export function checkVectors(root, image, files) {
  const known = packageOf(image);
  if (known.error) return { errors: [{ file: FOLDER, line: 0, message: known.error }], cases: 0 };
  const validators = formatValidators(root);
  if (validators.error) return { errors: [{ file: FOLDER, line: 0, message: validators.error }], cases: 0 };
  const errors = [];
  const seen = { reasons: new Set(), kinds: new Set(), invalid: false, tapped: false, cases: 0 };
  for (const file of files) {
    const { problems, seen: found } = checkVector(fs.readFileSync(path.join(root, file)), { ...known, ...validators });
    errors.push(...problems.map((one) => ({ file, ...one })));
    for (const reason of found.reasons) seen.reasons.add(reason);
    for (const kind of found.kinds) seen.kinds.add(kind);
    seen.invalid ||= found.invalid;
    seen.tapped ||= found.tapped;
    seen.cases += found.cases;
  }
  if (errors.length === 0) {
    const lack = (text) => errors.push({ file: FOLDER, line: 0, message: `no vector ${text}: the vectors hold every rule of ${TEXT}` });
    for (const reason of REASONS.keys()) if (!seen.reasons.has(reason)) lack(`joins into ${reason}`);
    for (const kind of [...VERDICT_KINDS, ...FEEDBACK_KINDS]) if (!seen.kinds.has(kind)) lack(`has an answer slot checked by ${kind}`);
    if (!seen.invalid) lack("has an observation that is not valid");
    if (!seen.tapped) lack("taps an option of an answer slot bound choice");
  }
  return { errors, cases: seen.cases };
}
