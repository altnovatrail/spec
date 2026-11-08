// The runner's report of the eval protocol, novatrail.eval.v1.Report (contracts/README.md, section
// 14; R95; RUN.md, T60): whether a file is a report as a writer writes it and as the rules of
// section 14 let it be — who ran it, the capability it measured, its models, the code of its
// verdicts, its eval set, and each sample's result: refused with its reason, or its answer slots or
// its essay, with what each repeat gave. The reports among the examples of
// contracts/examples/eval/v1/, report-<case>.json, pass it, are of the samples beside them, and
// together show every capability, a refused and a measured sample, every verdict a reading gives
// and every mark AI gives a criterion.
//
// A report is read as a sample is (tools/contracts/sample.mjs): UTF-8 JSON with no key twice, read
// strictly by the descriptors of the image buf builds of contracts/, whose text is the one written
// back with the protobuf names and every field. Then the rules no descriptor holds. The measures
// that section 14 counts from a report are not computed here: tutor's runner counts them, and the
// records of a report let anyone count them again.

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { byCodeUnits } from "../shared.mjs";
import { ESSAY_REASONS, REASONS, VERDICTS, WHITE_SPACE } from "./observation.mjs";
import { FOLDER, ID, PACKAGE, TAG, byPlace, isLocalId, isModuleId, messageOf, placeOf, readMessage, show } from "./sample.mjs";

const TEXT = "contracts/README.md, section 14";

// The values of each enum of the report, as the rules of section 14 name them; a value the package
// adds is named here by the task that adds it.
const HANDWRITING = "CAPABILITY_HANDWRITING_READING";
const RUBRIC = "CAPABILITY_RUBRIC_ASSESSMENT";
export const CAPABILITIES = [HANDWRITING, RUBRIC];
export const CODES = ["VERDICT_CODE_MODULE_KIT", "VERDICT_CODE_RUNNER"];
export const REFUSALS = ["REFUSAL_INVALID", "REFUSAL_NO_MARKUP", "REFUSAL_OTHER_TASK", "REFUSAL_CHILD"];
export const CAUSES = ["UNCHECKED_CAUSE_FAILURE", "UNCHECKED_CAUSE_LIMIT", "UNCHECKED_CAUSE_INVALID", "UNCHECKED_CAUSE_NO_MARK", "UNCHECKED_CAUSE_CHECK"];
export const ASSESSMENTS = ["CRITERION_ASSESSMENT_MET", "CRITERION_ASSESSMENT_NOT_MET", "CRITERION_ASSESSMENT_NONE"];
const ENUMS = [["Capability", CAPABILITIES], ["VerdictCode", CODES], ["Refusal", REFUSALS], ["UncheckedCause", CAUSES], ["CriterionAssessment", ASSESSMENTS]];
// The reasons of the verdict "unreadable": the module format's, blank and notation, and the
// observation's (section 10); and what an essay is read as when it holds no text.
const VERDICT_REASONS = new Set(["blank", "notation", ...REASONS.values()]);
const ESSAY_READ = [...ESSAY_REASONS].join(" or ");
const NO_MARK = "UNCHECKED_CAUSE_NO_MARK";
// The check's own cause: a predicate that gave no verdict on a valid observation (R102). An essay's
// rubric has no predicate, so its readings never name it.
const CHECK = "UNCHECKED_CAUSE_CHECK";
const SLOT_CAUSES = CAUSES.filter((cause) => cause !== NO_MARK);
const ESSAY_CAUSES = CAUSES.filter((cause) => cause !== CHECK);

const COMMIT = /^[0-9a-f]{40}$/;

// Whether an example of the package is a report, by its name: report-<case>.json (section 3).
export const isReport = (file) => path.basename(file).startsWith("report-");

// The message Report, of the image buf builds of contracts/: { message }, or { error }, also when an
// enum of the report has a value that the rules of section 14 do not name.
export const reportOf = (image) => messageOf(image, { name: "Report", what: "the message of the runner's report", text: TEXT, enums: ENUMS });

// What a verdict breaks, as the vectors of verdicts of the module format write one: its verdict, a
// reason beside "unreadable" alone, and a trap, by its local ID, beside "not_yet" alone.
function verdictBreaches(verdict, at, what, breach) {
  if (!verdict) {
    breach(at, `${what} is missing`);
    return;
  }
  if (!VERDICTS.includes(verdict.verdict)) breach([...at, "verdict"], `${what} is ${show(verdict.verdict)}, and a verdict is ${VERDICTS.join(", ")}`);
  if (verdict.verdict === "unreadable") {
    if (!VERDICT_REASONS.has(verdict.reason)) breach([...at, "reason"], `${what} is unreadable with the reason ${show(verdict.reason)}, and its reasons are ${[...VERDICT_REASONS].join(", ")}`);
  } else if (verdict.reason !== "") breach([...at, "reason"], `${what} is ${show(verdict.verdict)} with the reason ${show(verdict.reason)}: only "unreadable" has a reason`);
  if (verdict.verdict === "not_yet") {
    if (verdict.trap !== "" && !isLocalId(verdict.trap)) breach([...at, "trap"], `${what} names the trap ${show(verdict.trap)}, which is no local ID`);
  } else if (verdict.trap !== "") breach([...at, "trap"], `${what} is ${show(verdict.verdict)} with the trap ${show(verdict.trap)}: only "not_yet" has a trap`);
}

// What a model breaks: a provider and a model, each named.
function modelBreaches(model, at, breach) {
  for (const key of ["provider", "model"]) if (WHITE_SPACE.test(model[key])) breach([...at, key], `the ${key} of the model is not named`);
}

// What one repeat's reading of an answer slot breaks: its verdict, and a cause beside "unchecked"
// alone, which is never the essay's NO_MARK.
function readingBreaches(reading, at, breach) {
  verdictBreaches(reading.verdict, [...at, "verdict"], "the verdict on the reading", breach);
  const unchecked = reading.verdict?.verdict === "unchecked";
  if (unchecked && !CAUSES.includes(reading.unchecked)) breach([...at, "unchecked"], `the verdict is unchecked, and its cause is ${show(reading.unchecked)}: ${SLOT_CAUSES.join(", ")}`);
  else if (!unchecked && reading.unchecked !== "UNCHECKED_CAUSE_UNSPECIFIED") breach([...at, "unchecked"], `the reading gave a verdict, and it names the cause ${show(reading.unchecked)}: a cause stands beside "unchecked" alone`);
  else if (reading.unchecked === NO_MARK) breach([...at, "unchecked"], `${NO_MARK} is an essay's, whose assessment marked no criterion`);
}

// What a measurement of answer slots breaks: the slots by place, a truth that got a verdict, and a
// reading for each repeat.
function slotsBreaches(measured, repeats, at, breach) {
  if ("essay" in measured) breach([...at, "essay"], "a run of reading measures answer slots, not essays: an essay is measured on the whole path, in a run of assessment");
  measured.answer_slots.forEach((result, i) => {
    const where = [...at, "answer_slots", i];
    const place = result.answer_slot;
    if (!place || place.item < 1 || place.slot < 1) breach([...where, "answer_slot"], `the answer slot is at ${show(place)}: an item and a slot, each from 1`);
    else if (i > 0 && measured.answer_slots[i - 1].answer_slot && byPlace(measured.answer_slots[i - 1].answer_slot, place) >= 0) breach([...where, "answer_slot"], `the answer slot ${placeOf(place)} comes after ${placeOf(measured.answer_slots[i - 1].answer_slot)}: they go in the task's order, each once`);
    verdictBreaches(result.truth, [...where, "truth"], "the verdict on the truth", breach);
    if (result.truth?.verdict === "unchecked") breach([...where, "truth", "verdict"], "the truth gets no verdict, so the markup does not fit the task: the runner refuses the sample as REFUSAL_INVALID");
    if (result.readings.length !== repeats) breach([...where, "readings"], `the answer slot has ${result.readings.length} readings, and the run ${repeats} repeats`);
    result.readings.forEach((reading, j) => readingBreaches(reading, [...where, "readings", j], breach));
  });
}

// What a measurement of an essay breaks: its truth, the people's marks, and for each repeat its
// assessment of the same criteria, a reason it could not be read, or why it gave nothing.
function essayBreaches(measured, repeats, at, breach) {
  if (measured.answer_slots.length) breach([...at, "answer_slots"], "a run of assessment measures essays, whose answer slot gets no verdict");
  const { essay } = measured;
  if (!essay) {
    breach(at, "a run of assessment measures the sample's essay, and the result has none");
    return;
  }
  const where = [...at, "essay"];
  if ("truth" in essay && !ESSAY_REASONS.has(essay.truth)) breach([...where, "truth"], `the truth of an essay is its text, or ${ESSAY_READ}, not ${show(essay.truth)}`);
  if ("truth" in essay && essay.people.length) breach([...where, "people"], "an essay that cannot be read reaches no assessment, so the people marked no criterion");
  essay.people.forEach((mark, i) => {
    if (mark.criterion < 1) breach([...where, "people", i, "criterion"], `the criterion ${mark.criterion} is no place in a rubric, from 1`);
    else if (i > 0 && mark.criterion <= essay.people[i - 1].criterion) breach([...where, "people", i, "criterion"], `the criterion ${mark.criterion} comes after ${essay.people[i - 1].criterion}: the marks go ascending, each once`);
  });
  if (essay.readings.length !== repeats) breach([...where, "readings"], `the essay has ${essay.readings.length} readings, and the run ${repeats} repeats`);
  const criteria = essay.people.map((mark) => mark.criterion);
  essay.readings.forEach((reading, j) => {
    const at = [...where, "readings", j];
    if ("assessment" in reading) {
      const given = reading.assessment.criteria.map((one) => one.criterion);
      if (!isDeepStrictEqual(given, criteria)) breach([...at, "assessment", "criteria"], `the assessment marks the criteria ${show(given)}, and the people's are ${show(criteria)}: AI's mark stands beside each of theirs`);
      reading.assessment.criteria.forEach((one, k) => {
        if (!ASSESSMENTS.includes(one.assessment)) breach([...at, "assessment", "criteria", k, "assessment"], `the mark ${show(one.assessment)} is none of ${ASSESSMENTS.join(", ")}`);
      });
    } else if ("unreadable" in reading) {
      if (!ESSAY_REASONS.has(reading.unreadable)) breach([...at, "unreadable"], `an essay is read as ${ESSAY_READ}, not ${show(reading.unreadable)}`);
    } else if ("unchecked" in reading) {
      if (reading.unchecked === CHECK) breach([...at, "unchecked"], `${CHECK} is a predicate's, and the rubric of an essay has none`);
      else if (!ESSAY_CAUSES.includes(reading.unchecked)) breach([...at, "unchecked"], `the cause ${show(reading.unchecked)} is none of ${ESSAY_CAUSES.join(", ")}`);
    } else breach(at, "the reading says neither assessment, unreadable nor unchecked");
  });
}

// What a report, as JSON with the protobuf names, breaks of the rules of section 14: each { at,
// message }, with at its path in the file; none when it is valid.
export function breaches(report) {
  const found = [];
  const breach = (at, message) => found.push({ at, message });
  if (report.protocol !== PACKAGE) breach(["protocol"], `protocol is ${show(report.protocol)}, and the file is read as ${show(PACKAGE)} alone`);
  if (!TAG.test(report.runner)) breach(["runner"], `the runner ${show(report.runner)} is not the tag of a release of tutor, vMAJOR.MINOR.PATCH`);
  const { capability } = report;
  if (!CAPABILITIES.includes(capability)) breach(["capability"], `the capability is ${show(capability)}, and a run measures ${CAPABILITIES.join(" or ")}`);
  const reading = capability === HANDWRITING;
  const assessing = capability === RUBRIC;
  const readers = report.readers.length;
  if (reading && (readers < 1 || readers > 2)) breach(["readers"], `a run of reading has one reader or the two of a pair, and this one ${readers}`);
  if (assessing && readers !== 1) breach(["readers"], `a run of assessment has one reader, and this one ${readers}`);
  report.readers.forEach((model, i) => modelBreaches(model, ["readers", i], breach));
  if ("assessor" in report) {
    if (!assessing) breach(["assessor"], "only a run of assessment has an assessor");
    modelBreaches(report.assessor, ["assessor"], breach);
  } else if (assessing) breach([], "a run of assessment names its assessor");
  if (!report.verdicts) breach([], "the report names no code of its verdicts");
  else {
    if (!CODES.includes(report.verdicts.code)) breach(["verdicts", "code"], `the code of the verdicts is ${show(report.verdicts.code)}, and it is ${CODES.join(" or ")}`);
    if (!TAG.test(report.verdicts.version)) breach(["verdicts", "version"], `the version ${show(report.verdicts.version)} is not the tag of a release, vMAJOR.MINOR.PATCH`);
  }
  if ("module" in report) {
    if (!isModuleId(report.module.module)) breach(["module", "module"], `${show(report.module.module)} is not the ID of a module, <publisher>/<name>`);
    if (!COMMIT.test(report.module.commit)) breach(["module", "commit"], `the commit ${show(report.module.commit)} is not 40 lowercase hexadecimal digits`);
  } else if ("capability_set" in report) {
    if (WHITE_SPACE.test(report.capability_set.name)) breach(["capability_set", "name"], "the eval set of the capability is not named");
  } else breach([], "the report names no eval set: a module's, or a capability's");
  const { repeats } = report;
  if (repeats < 1) breach(["repeats"], `repeats is ${repeats}: each sample is read once at least`);
  report.samples.forEach((result, i) => {
    const at = ["samples", i];
    if (!ID.test(result.sample)) breach([...at, "sample"], `the ID ${show(result.sample)} is not 1 to 64 lowercase Latin letters, digits and hyphens`);
    else if (i > 0 && byCodeUnits(report.samples[i - 1].sample, result.sample) >= 0) breach([...at, "sample"], `the sample ${result.sample} comes after ${report.samples[i - 1].sample}: the samples go ascending by ID, each once`);
    if ("refused" in result) {
      if (!REFUSALS.includes(result.refused)) breach([...at, "refused"], `the refusal ${show(result.refused)} is none of ${REFUSALS.join(", ")}`);
    } else if ("measured" in result) {
      // A capability that breaks its rule leaves the measurement to its form: an essay or slots.
      if (assessing || (!reading && "essay" in result.measured)) essayBreaches(result.measured, repeats, [...at, "measured"], breach);
      else slotsBreaches(result.measured, repeats, [...at, "measured"], breach);
    } else breach(at, `the sample ${result.sample} was neither refused nor measured`);
  });
  return found;
}

// A report, its bytes, against the message: { problems, seen, value }, with seen what it shows of
// the package for the examples' coverage — its capability, a refused or measured sample, the
// verdicts of its readings, the marks of its assessments — and value the report read.
export function checkReport(bytes, message) {
  const seen = new Set();
  const read = readMessage(bytes, message, { what: "a report", text: TEXT });
  if (read.problems) return { problems: read.problems, seen };
  const { value, lineOf } = read;
  const problems = breaches(value).map(({ at, message: text }) => ({ line: lineOf(at), message: text }));
  seen.add(value.capability);
  for (const result of value.samples) {
    seen.add("refused" in result ? "refused" : "measured");
    for (const slot of result.measured?.answer_slots ?? []) for (const one of slot.readings) seen.add(one.verdict?.verdict);
    for (const one of result.measured?.essay?.readings ?? []) for (const criterion of one.assessment?.criteria ?? []) seen.add(criterion.assessment);
  }
  return { problems, seen, value, lineOf };
}

// Whether a run of the capability measures the sample: a run of assessment the essays, whose
// markup has the people's marks, and a run of reading every other sample.
const measures = (capability, sample) => (capability === RUBRIC) === Boolean(sample.markup?.marks);

// What sampleBreaches calls spec's examples beside a report, in its messages.
export const EXAMPLES = { measured: "the examples its capability measures", none: "no example that holds its rules" };

// What a report breaks of its samples, the ones that hold, by their IDs — spec's examples beside the
// report, or the samples a call of report-check names, which of names in the messages: a report on
// a capability set names every one of them that its capability measures; each sample it names is
// one of them; a child's is refused as REFUSAL_CHILD, one without markup as REFUSAL_NO_MARKUP, and
// any other is measured; a measured sample's answer slots are the
// truth's that a model reads — on a workbook, its filled boxes, and on a sheet that shows no stroke,
// which has no crops, none — with the markup's notes, and its essay the truth's and the marks of its
// markup.
export function sampleBreaches(report, samples, of = EXAMPLES) {
  const found = [];
  const breach = (at, message) => found.push({ at, message });
  if ("capability_set" in report) {
    const set = [...samples.values()].filter((sample) => measures(report.capability, sample)).map((sample) => sample.id).sort(byCodeUnits);
    const named = report.samples.map((result) => result.sample);
    if (!isDeepStrictEqual(named, set)) breach(["samples"], `the report names the samples ${show(named)}, and ${of.measured} are ${show(set)}`);
  }
  report.samples.forEach((result, i) => {
    const at = ["samples", i];
    const sample = samples.get(result.sample);
    if (!sample) {
      breach([...at, "sample"], `${of.none} is the sample ${result.sample}`);
      return;
    }
    const child = sample.writer === "WRITER_CHILD";
    const expected = child ? "REFUSAL_CHILD" : !sample.markup ? "REFUSAL_NO_MARKUP" : null;
    if (expected && result.refused !== expected) breach(at, `the sample ${result.sample} is refused as ${expected}`);
    if (!expected && !("measured" in result)) breach(at, `the sample ${result.sample} has its markup and goes to AI, so it is measured`);
    if (!("measured" in result) || expected) return;
    const truth = sample.markup.truth?.answer_slots ?? [];
    const marks = sample.markup.marks?.marks;
    if (report.capability === RUBRIC) {
      const { essay } = result.measured;
      if (!essay || !marks) {
        breach([...at, "measured"], `the sample ${result.sample} is ${marks ? "an" : "no"} essay, and the result has ${essay ? "one" : "none"}`);
        return;
      }
      if (!isDeepStrictEqual(essay.people, marks)) breach([...at, "measured", "essay", "people"], `the people's marks are ${show(essay.people)}, and the markup's ${show(marks)}`);
      const reason = truth[0]?.unreadable;
      if (essay.truth !== reason) breach([...at, "measured", "essay"], `the truth of the essay is ${show(essay.truth ?? "its text")}, and the markup's ${show(reason ?? "its text")}`);
      return;
    }
    if (marks) {
      breach([...at, "measured"], `the sample ${result.sample} is an essay, which a run of reading does not measure`);
      return;
    }
    // A sheet that shows no stroke has no crops (section 11): like an empty box, it goes to no model.
    const blank = sample.sheet && !sample.sheet.crops;
    const filled = sample.workbook && new Set(sample.workbook.filled_boxes.map((box) => placeOf(box.answer_slot ?? {})));
    const read = blank ? [] : truth.filter((slot) => !filled || filled.has(placeOf(slot.answer_slot ?? {}))).map((slot) => placeOf(slot.answer_slot ?? {}));
    const given = result.measured.answer_slots.map((slot) => placeOf(slot.answer_slot ?? {}));
    if (!isDeepStrictEqual(given, read)) breach([...at, "measured", "answer_slots"], `the answer slots are ${show(given)}, and those of the truth that a model reads ${show(read)}`);
    const notes = new Map((sample.markup.notes ?? []).map((note) => [placeOf(note.answer_slot ?? {}), note]));
    result.measured.answer_slots.forEach((slot, j) => {
      const note = notes.get(placeOf(slot.answer_slot ?? {}));
      if (slot.mirrored !== Boolean(note?.mirrored) || slot.crossed_out !== Boolean(note?.crossed_out)) breach([...at, "measured", "answer_slots", j], `the answer slot ${placeOf(slot.answer_slot ?? {})} is noted mirrored ${slot.mirrored} and crossed out ${slot.crossed_out}, as the markup does not note it`);
    });
  });
  return found;
}

// The examples of the runner's report at root, files of contracts/, by the image buf builds, and the
// samples beside them, by their IDs (tools/contracts/sample.mjs, checkExamples), or null while one
// of them breaks its rules, whose error is its own: the errors, { file, line, message } — each
// report's, of itself and, unless null, of the samples it names, and, when
// every one holds, what they lack together: every capability, a refused and a measured sample,
// every verdict a reading gives and every mark AI gives a criterion.
export function checkReportExamples(root, image, files, samples) {
  const known = reportOf(image);
  if (known.error) return { errors: [{ file: FOLDER, line: 0, message: known.error }] };
  const errors = [];
  const seen = new Set();
  for (const file of files) {
    const { problems, seen: found, value, lineOf } = checkReport(fs.readFileSync(path.join(root, file)), known.message);
    errors.push(...problems.map((one) => ({ file, ...one })));
    if (problems.length === 0 && samples) errors.push(...sampleBreaches(value, samples).map(({ at, message }) => ({ file, line: lineOf(at), message })));
    for (const each of found) seen.add(each);
  }
  if (errors.length === 0) {
    for (const each of [...CAPABILITIES, "refused", "measured", ...VERDICTS, ...ASSESSMENTS]) {
      if (!seen.has(each)) errors.push({ file: FOLDER, line: 0, message: `no report among the examples shows ${each}: together they show every capability, a refused and a measured sample, every verdict a reading gives and every mark AI gives a criterion (${TEXT})` });
    }
  }
  return { errors };
}
