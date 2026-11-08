// The runner's report of the eval protocol, as tools/contracts/report.mjs checks it: by the image
// buf builds of spec's own contracts/, each of spec's examples of a report in memory with one thing
// broken, against the samples beside them, and the examples themselves, which pass.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { root } from "../../release/test/repository.mjs";
import { build } from "../buf.mjs";
import { breaches, checkReport, checkReportExamples, isReport, reportOf, sampleBreaches } from "../report.mjs";
import { FOLDER } from "../sample.mjs";

let image;
let message;
before(() => {
  const built = build(root);
  assert.deepEqual(built.errors, []);
  image = built.image;
  ({ message } = reportOf(image));
  assert.ok(message);
});
const all = fs.readdirSync(path.join(root, FOLDER)).map((name) => `${FOLDER}/${name}`);
const reports = all.filter(isReport);
const samples = all.filter((file) => !isReport(file));
const example = (name) => JSON.parse(fs.readFileSync(path.join(root, FOLDER, `${name}.json`), "utf8"));
const reading = () => example("report-reading");
const assessment = () => example("report-assessment");
const sampleMap = () => new Map(samples.map((file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))).map((sample) => [sample.id, sample]));

const bytesOf = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value, null, 2));
const problemsOf = (value) => checkReport(bytesOf(value), message).problems.map((problem) => problem.message);
const changed = (made, edit) => {
  edit(made);
  return made;
};

// Every problem matches one of the patterns, and every pattern one of the problems.
function expectOnly(value, ...patterns) {
  const problems = problemsOf(value);
  for (const problem of problems) assert.ok(patterns.some((pattern) => pattern.test(problem)), `unexpected: ${problem}\nall:\n${problems.join("\n")}`);
  for (const pattern of patterns) assert.ok(problems.some((problem) => pattern.test(problem)), `missing: ${pattern}\nall:\n${problems.join("\n")}`);
}
// What a report breaks of the samples beside it, by their messages.
const ofSamples = (value, map = sampleMap()) => sampleBreaches(value, map).map((one) => one.message);

test("spec's own reports pass, are of the samples beside them, and together show what a report holds", () => {
  assert.ok(reports.length > 0 && samples.length > 0);
  assert.deepEqual(checkReportExamples(root, image, reports, sampleMap()), { errors: [] });
  for (const file of reports) assert.deepEqual(checkReport(fs.readFileSync(path.join(root, file)), message).problems, [], file);
  assert.equal(isReport(`${FOLDER}/report-reading.json`), true);
  assert.equal(isReport(`${FOLDER}/sheet-essay.json`), false);
});

test("the reports together show every capability, refused and measured, every verdict of a reading and every mark", () => {
  const { errors } = checkReportExamples(root, image, [`${FOLDER}/report-assessment.json`], sampleMap());
  const lacking = errors.map((error) => error.message.match(/^no report among the examples shows (\S+):/)?.[1]);
  assert.deepEqual(lacking.sort(), ["CAPABILITY_HANDWRITING_READING", "correct", "not_yet", "refused", "unchecked", "unreadable"]);
  assert.ok(errors.every((error) => error.file === FOLDER && error.line === 0));
});

test("a report that breaks a rule fails, and the coverage is not looked at", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reports-"));
  try {
    const folder = path.join(dir, FOLDER);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "report-one.json"), bytesOf(changed(reading(), (r) => (r.repeats = 3))));
    const { errors } = checkReportExamples(dir, image, [`${FOLDER}/report-one.json`], sampleMap());
    assert.deepEqual(errors.map((error) => error.file), [`${FOLDER}/report-one.json`, `${FOLDER}/report-one.json`, `${FOLDER}/report-one.json`]);
    assert.ok(errors.every((error) => /readings, and the run 3 repeats$/.test(error.message)));
    // A report that holds its rules is held to the samples beside it that hold: here, none.
    fs.writeFileSync(path.join(folder, "report-two.json"), bytesOf(assessment()));
    // While a sample beside it breaks its rules, a report is held to its own alone.
    assert.deepEqual(checkReportExamples(dir, image, [`${FOLDER}/report-two.json`], null).errors.filter((error) => error.file !== FOLDER), []);
    const alone = checkReportExamples(dir, image, [`${FOLDER}/report-two.json`], new Map());
    assert.deepEqual(alone.errors.map((error) => [error.file, error.message]), [
      [`${FOLDER}/report-two.json`, 'the report names the samples ["synthetic-1107"], and the examples its capability measures are []'],
      [`${FOLDER}/report-two.json`, "no example that holds its rules is the sample synthetic-1107"],
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the image must hold the report, and name only the values the rules know", () => {
  assert.match(reportOf({ file: [] }).error, /^the image of buf build has no novatrail\.eval\.v1\.Report/);
  assert.deepEqual(checkReportExamples(root, { file: [] }, reports, sampleMap()).errors.map((error) => error.file), [FOLDER]);
  for (const [name, value] of [["Capability", "CAPABILITY_VOICE"], ["Refusal", "REFUSAL_LATE"], ["CriterionAssessment", "CRITERION_ASSESSMENT_HALF"]]) {
    const more = structuredClone(image);
    const file = more.file.find((one) => one.package === "novatrail.eval.v1" && one.enumType?.some((each) => each.name === name));
    file.enumType.find((one) => one.name === name).value.push({ name: value, number: 9 });
    assert.match(reportOf(more).error, new RegExp(`^novatrail\\.eval\\.v1\\.${name} has ${value}, which the rules of contracts/README\\.md, section 14 do not name`));
  }
});

test("a report is read as JSON, strictly, as a writer writes it", () => {
  assert.match(problemsOf("{")[0], /^not JSON:/);
  assert.match(problemsOf("[]")[0], /^a report is an object/);
  assert.match(problemsOf(changed(reading(), (r) => (r.sample_text = "x")))[0], /^it does not read as novatrail\.eval\.v1\.Report: .*sample_text/);
  assert.match(problemsOf(changed(reading(), (r) => delete r.samples[0].measured.answer_slots[0].mirrored))[0], /^it is not as a writer writes it, .*: at samples\.0\.measured\.answer_slots\.0$/);
});

test("who ran the report, what it measured, its models, its verdicts and its eval set", () => {
  expectOnly(changed(reading(), (r) => (r.protocol = "novatrail.eval.v2")), /^protocol is "novatrail\.eval\.v2", and the file is read as "novatrail\.eval\.v1" alone$/);
  expectOnly(changed(reading(), (r) => (r.runner = "0.0.0")), /^the runner "0\.0\.0" is not the tag of a release of tutor/);
  expectOnly(changed(reading(), (r) => (r.capability = "CAPABILITY_UNSPECIFIED")), /^the capability is "CAPABILITY_UNSPECIFIED", and a run measures CAPABILITY_HANDWRITING_READING or CAPABILITY_RUBRIC_ASSESSMENT$/);
  // A capability that breaks its rule leaves each measurement to its form, slots or an essay.
  expectOnly(changed(reading(), (r) => {
    r.capability = "CAPABILITY_UNSPECIFIED";
    r.samples[0].measured.answer_slots[0].readings.pop();
  }), /^the capability is "CAPABILITY_UNSPECIFIED"/, /^the answer slot has 1 readings, and the run 2 repeats$/);
  expectOnly(changed(assessment(), (r) => {
    r.capability = "CAPABILITY_UNSPECIFIED";
    delete r.assessor;
    r.samples[0].measured.essay.readings.pop();
  }), /^the capability is "CAPABILITY_UNSPECIFIED"/, /^the essay has 2 readings, and the run 3 repeats$/);
  expectOnly(changed(reading(), (r) => r.readers.push(r.readers[0])), /^a run of reading has one reader or the two of a pair, and this one 3$/);
  expectOnly(changed(reading(), (r) => r.readers.pop()));
  expectOnly(changed(reading(), (r) => (r.readers[1].model = " ")), /^the model of the model is not named$/);
  expectOnly(changed(reading(), (r) => (r.assessor = { provider: "example", model: "example-assessor" })), /^only a run of assessment has an assessor$/);
  expectOnly(changed(assessment(), (r) => delete r.assessor), /^a run of assessment names its assessor$/);
  expectOnly(changed(assessment(), (r) => r.readers.push(r.readers[0])), /^a run of assessment has one reader, and this one 2$/);
  expectOnly(changed(reading(), (r) => delete r.verdicts), /^the report names no code of its verdicts$/);
  expectOnly(changed(reading(), (r) => (r.verdicts = { code: "VERDICT_CODE_UNSPECIFIED", version: "0.2" })), /^the code of the verdicts is "VERDICT_CODE_UNSPECIFIED"/, /^the version "0\.2" is not the tag of a release/);
  expectOnly(changed(reading(), (r) => (r.verdicts.code = "VERDICT_CODE_MODULE_KIT")));
  const module = (set) => changed(reading(), (r) => {
    delete r.capability_set;
    r.module = set;
  });
  expectOnly(module({ module: "novatrail/olympiad-math", commit: "0".repeat(40) }));
  expectOnly(module({ module: "olympiad-math", commit: "ABC" }), /^"olympiad-math" is not the ID of a module/, /^the commit "ABC" is not 40 lowercase hexadecimal digits$/);
  expectOnly(changed(reading(), (r) => (r.capability_set.name = "")), /^the eval set of the capability is not named$/);
  expectOnly(changed(reading(), (r) => delete r.capability_set), /^the report names no eval set/);
  expectOnly(changed(reading(), (r) => (r.repeats = 0)), /^repeats is 0: each sample is read once at least$/, /readings, and the run 0 repeats/);
});

test("the samples, ascending by ID, each refused with its reason or measured", () => {
  expectOnly(changed(reading(), (r) => (r.samples[0].sample = "Sample 1")), /^the ID "Sample 1" is not 1 to 64/);
  expectOnly(changed(reading(), (r) => r.samples.reverse()), /comes after .*: the samples go ascending by ID, each once$/);
  expectOnly(changed(reading(), (r) => r.samples.push(r.samples.at(-1))), /^the sample synthetic-1106 comes after synthetic-1106/);
  expectOnly(changed(reading(), (r) => (r.samples[2].refused = "REFUSAL_UNSPECIFIED")), /^the refusal "REFUSAL_UNSPECIFIED" is none of /);
  expectOnly(changed(reading(), (r) => delete r.samples[2].refused), /^the sample synthetic-1105 was neither refused nor measured$/);
});

test("a run of reading: answer slots, a truth with its verdict, and a reading for each repeat", () => {
  const slot = (edit) => changed(reading(), (r) => edit(r.samples[0].measured.answer_slots[0], r.samples[0].measured));
  expectOnly(slot((s, m) => (m.essay = { people: [], readings: [] })), /^a run of reading measures answer slots, not essays/);
  expectOnly(slot((s) => (s.answer_slot.item = 0)), /^the answer slot is at \{"item":0,"slot":1\}: an item and a slot, each from 1$/);
  expectOnly(slot((s, m) => m.answer_slots.push(structuredClone(s))), /^the answer slot 1\.1 comes after 1\.1: they go in the task's order, each once$/);
  expectOnly(slot((s) => delete s.truth), /^the verdict on the truth is missing$/);
  expectOnly(slot((s) => (s.truth.verdict = "wrong")), /^the verdict on the truth is "wrong", and a verdict is correct, not_yet, unreadable, unchecked$/);
  expectOnly(slot((s) => (s.truth.reason = "blank")), /^the verdict on the truth is "not_yet" with the reason "blank": only "unreadable" has a reason$/);
  expectOnly(slot((s) => (s.truth = { verdict: "unreadable", reason: "smudged", trap: "" })), /^the verdict on the truth is unreadable with the reason "smudged", and its reasons are blank, notation, illegible/);
  expectOnly(slot((s) => (s.truth = { verdict: "unreadable", reason: "notation", trap: "" })));
  expectOnly(slot((s) => (s.truth.trap = "Wrong Trap")), /^the verdict on the truth names the trap "Wrong Trap", which is no local ID$/);
  expectOnly(slot((s) => (s.truth.trap = "sign-on-transfer")));
  expectOnly(slot((s) => (s.truth = { verdict: "correct", reason: "", trap: "sign-on-transfer" })), /^the verdict on the truth is "correct" with the trap "sign-on-transfer": only "not_yet" has a trap$/);
  expectOnly(slot((s) => (s.truth = { verdict: "unchecked", reason: "", trap: "" })), /^the truth gets no verdict, so the markup does not fit the task: the runner refuses the sample as REFUSAL_INVALID$/);
  expectOnly(slot((s) => s.readings.pop()), /^the answer slot has 1 readings, and the run 2 repeats$/);
  expectOnly(slot((s) => (s.readings[0].verdict = { verdict: "unchecked", reason: "", trap: "" })), /^the verdict is unchecked, and its cause is "UNCHECKED_CAUSE_UNSPECIFIED"/);
  expectOnly(slot((s) => (s.readings[0].unchecked = "UNCHECKED_CAUSE_LIMIT")), /^the reading gave a verdict, and it names the cause "UNCHECKED_CAUSE_LIMIT"/);
  expectOnly(slot((s) => (s.readings[0] = { verdict: { verdict: "unchecked", reason: "", trap: "" }, unchecked: "UNCHECKED_CAUSE_NO_MARK" })), /^UNCHECKED_CAUSE_NO_MARK is an essay's/);
  expectOnly(slot((s) => (s.readings[0] = { verdict: { verdict: "unchecked", reason: "", trap: "" }, unchecked: "UNCHECKED_CAUSE_INVALID" })));
});

test("a run of assessment: the essay, the people's marks, and an outcome for each repeat", () => {
  const essay = (edit) => changed(assessment(), (r) => edit(r.samples[0].measured.essay, r.samples[0].measured));
  expectOnly(essay((e, m) => m.answer_slots.push({ answer_slot: { item: 1, slot: 1 }, truth: { verdict: "correct", reason: "", trap: "" }, mirrored: false, crossed_out: false, readings: [] })), /^a run of assessment measures essays, whose answer slot gets no verdict$/);
  expectOnly(essay((e, m) => delete m.essay), /^a run of assessment measures the sample's essay, and the result has none$/);
  expectOnly(essay((e) => (e.truth = "UNREADABLE_AMBIGUOUS")), /^the truth of an essay is its text, or UNREADABLE_BLANK or UNREADABLE_ILLEGIBLE, not "UNREADABLE_AMBIGUOUS"$/, /^an essay that cannot be read reaches no assessment, so the people marked no criterion$/);
  expectOnly(essay((e) => (e.people[0].criterion = 0)), /^the criterion 0 is no place in a rubric, from 1$/, /^the assessment marks the criteria .*, and the people's are /);
  expectOnly(essay((e) => {
    e.people.reverse();
    for (const one of e.readings) one.assessment?.criteria.reverse();
  }), /^the criterion \d comes after \d: the marks go ascending, each once$/);
  expectOnly(essay((e) => e.readings.pop()), /^the essay has 2 readings, and the run 3 repeats$/);
  expectOnly(essay((e) => e.readings[0].assessment.criteria.pop()), /^the assessment marks the criteria \[1,2,3,5\], and the people's are \[1,2,3,5,6\]/);
  expectOnly(essay((e) => (e.readings[0].assessment.criteria[0].assessment = "CRITERION_ASSESSMENT_UNSPECIFIED")), /^the mark "CRITERION_ASSESSMENT_UNSPECIFIED" is none of /);
  expectOnly(essay((e) => (e.readings[2] = { unreadable: "UNREADABLE_AMBIGUOUS" })), /^an essay is read as UNREADABLE_BLANK or UNREADABLE_ILLEGIBLE, not "UNREADABLE_AMBIGUOUS"$/);
  expectOnly(essay((e) => (e.readings[2] = { unchecked: "UNCHECKED_CAUSE_NO_MARK" })));
  expectOnly(essay((e) => (e.readings[2] = { unchecked: "UNCHECKED_CAUSE_UNSPECIFIED" })), /^the cause "UNCHECKED_CAUSE_UNSPECIFIED" is none of /);
  expectOnly(essay((e) => (e.readings[2] = {})), /^the reading says neither assessment, unreadable nor unchecked$/);
});

test("a report of the examples is of the samples beside it", () => {
  assert.deepEqual(ofSamples(reading()), []);
  assert.deepEqual(ofSamples(assessment()), []);
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0].sample = "synthetic-1"))), ['the report names the samples ["synthetic-1","synthetic-1104","synthetic-1105","synthetic-1106"], and the examples its capability measures are ["synthetic-1103","synthetic-1104","synthetic-1105","synthetic-1106"]', "no example that holds its rules is the sample synthetic-1"]);
  // A report on the capability set of the examples names each that its capability measures.
  assert.deepEqual(ofSamples(changed(reading(), (r) => r.samples.splice(1, 1))), ['the report names the samples ["synthetic-1103","synthetic-1105","synthetic-1106"], and the examples its capability measures are ["synthetic-1103","synthetic-1104","synthetic-1105","synthetic-1106"]']);
  const moduleSet = () => changed(reading(), (r) => {
    delete r.capability_set;
    r.module = { module: "novatrail/olympiad-math", commit: "0".repeat(40) };
    r.samples.splice(1, 1);
  });
  assert.deepEqual(ofSamples(moduleSet()), []);
  // A run of reading measures no essay.
  const withEssay = changed(moduleSet(), (r) => r.samples.push({ sample: "synthetic-1107", measured: { answer_slots: [] } }));
  assert.deepEqual(ofSamples(withEssay), ["the sample synthetic-1107 is an essay, which a run of reading does not measure"]);
  // A child's sample is refused, and one without markup too; any other is measured.
  const child = changed(moduleSet(), (r) => (r.samples[1] = { sample: "synthetic-1105", measured: structuredClone(r.samples[0].measured) }));
  assert.deepEqual(ofSamples(child), ["the sample synthetic-1105 is refused as REFUSAL_CHILD"]);
  const bare = sampleMap();
  delete bare.get("synthetic-1103").markup;
  assert.deepEqual(ofSamples(reading(), bare), ["the sample synthetic-1103 is refused as REFUSAL_NO_MARKUP"]);
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0] = { sample: "synthetic-1103", refused: "REFUSAL_NO_MARKUP" })), bare), []);
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0] = { sample: "synthetic-1103", refused: "REFUSAL_OTHER_TASK" }))), ["the sample synthetic-1103 has its markup and goes to AI, so it is measured"]);
  // A measured sample's answer slots are those of its truth that a model reads, with its notes.
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0].measured.answer_slots[0].answer_slot.slot = 2))), ['the answer slots are ["1.2"], and those of the truth that a model reads ["1.1"]']);
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0].measured.answer_slots[0].mirrored = true))), ["the answer slot 1.1 is noted mirrored true and crossed out false, as the markup does not note it"]);
  const book = sampleMap();
  const filled = book.get("synthetic-1105");
  filled.writer = "WRITER_ADULT";
  const boxes = filled.workbook.filled_boxes.map(({ answer_slot }) => ({ answer_slot, truth: { verdict: "not_yet", reason: "", trap: "" }, mirrored: false, crossed_out: false, readings: [] }));
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[2] = { sample: "synthetic-1105", measured: { answer_slots: boxes } })), book), []);
  // A sheet that shows no stroke has no crops and goes to no model, as an empty box does: it is
  // measured with no answer slot.
  const empty = sampleMap();
  const sheet = empty.get("synthetic-1103");
  delete sheet.sheet.crops;
  sheet.markup.truth.answer_slots = sheet.markup.truth.answer_slots.map(({ answer_slot }) => ({ answer_slot, unreadable: "UNREADABLE_BLANK" }));
  assert.deepEqual(ofSamples(reading(), empty), ['the answer slots are ["1.1"], and those of the truth that a model reads []']);
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0].measured.answer_slots = [])), empty), []);
  assert.deepEqual(ofSamples(changed(reading(), (r) => (r.samples[0].measured.answer_slots = []))), ['the answer slots are [], and those of the truth that a model reads ["1.1"]']);
  // An essay's people and truth are those of its markup.
  assert.deepEqual(ofSamples(changed(assessment(), (r) => r.samples[0].measured.essay.people.pop())), [`the people's marks are ${JSON.stringify(assessment().samples[0].measured.essay.people.slice(0, -1))}, and the markup's ${JSON.stringify(assessment().samples[0].measured.essay.people)}`]);
  assert.deepEqual(ofSamples(changed(assessment(), (r) => (r.samples[0].measured.essay.truth = "UNREADABLE_ILLEGIBLE"))), ['the truth of the essay is "UNREADABLE_ILLEGIBLE", and the markup\'s "its text"']);
  assert.deepEqual(ofSamples(changed(assessment(), (r) => (r.samples[0].sample = "synthetic-1104"))), ['the report names the samples ["synthetic-1104"], and the examples its capability measures are ["synthetic-1107"]', "the sample synthetic-1104 is no essay, and the result has one"]);
  assert.deepEqual(ofSamples(changed(assessment(), (r) => delete r.samples[0].measured.essay)), ["the sample synthetic-1107 is an essay, and the result has none"]);
});

test("the breaches of a report name where they are", () => {
  const found = breaches(changed(reading(), (r) => {
    r.runner = "";
    r.samples[3].measured.answer_slots[0].readings[1].unchecked = "UNCHECKED_CAUSE_UNSPECIFIED";
  }));
  assert.deepEqual(found.map((one) => one.at), [["runner"], ["samples", 3, "measured", "answer_slots", 0, "readings", 1, "unchecked"]]);
});
