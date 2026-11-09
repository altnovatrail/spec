// The versions of a module of section 27: the steps between versions, the places of a package that
// every version of the format keeps, a package as files, the meaning of a check, the part that a
// comparison finds and the eight rules of versions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalBytes, descriptorOf, digestOf } from "../canonical.mjs";
import {
  ABOVE,
  BANDS_KEPT,
  IDS_KEPT,
  LANGUAGES_KEPT,
  RETIRED_COMPLETE,
  RETIRED_KEPT,
  RETIRED_KNOWN,
  STEP,
  checkMeaningOf,
  compareVersions,
  formatVersionCompare,
  foundPartOf,
  higherPart,
  packageFromFiles,
  placesOf,
  semverCompare,
  semverOf,
  stepPart,
} from "../versions.mjs";

const DIGEST = `sha256:${"a".repeat(64)}`;

test("versions compare by their numbers, not their text", () => {
  assert.deepEqual(semverOf("1.10.0"), [1n, 10n, 0n]);
  assert.equal(semverOf("1.0"), null);
  assert.equal(semverOf("01.0.0"), null);
  assert.equal(semverOf(1), null);
  assert.equal(semverCompare("1.10.0", "1.9.0"), 1);
  assert.equal(semverCompare("1.9.0", "1.10.0"), -1);
  assert.equal(semverCompare("2.0.0", "2.0.0"), 0);
  assert.equal(semverCompare("99999999999999999999.0.0", "99999999999999999998.0.0"), 1);
  assert.equal(formatVersionCompare("0.10", "0.9"), 1);
  assert.equal(formatVersionCompare("0.2", "1.0"), -1);
  assert.equal(formatVersionCompare("0.3", "0.3"), 0);
  assert.equal(higherPart("minor", "patch"), "minor");
  assert.equal(higherPart("none", "major"), "major");
});

test("a step raises one part, and while X is 0, y plays the major", () => {
  for (const [from, to, part] of [
    ["1.2.3", "1.2.4", "patch"],
    ["1.2.3", "1.3.0", "minor"],
    ["1.2.3", "2.0.0", "major"],
    ["0.2.3", "0.2.4", "minor"],
    ["0.2.3", "0.3.0", "major"],
    ["0.2.3", "1.0.0", "major"],
    ["0.0.3", "0.0.4", "major"],
    ["0.0.3", "0.1.0", "major"],
    ["0.0.3", "1.0.0", "major"],
    ["1.2.3", "1.2.5", null],
    ["1.2.3", "1.3.3", null],
    ["1.2.3", "2.0.1", null],
    ["1.2.3", "1.2.3", null],
    ["0.2.3", "0.3.1", null],
    ["0.0.3", "0.0.5", null],
  ]) {
    assert.equal(stepPart(from, to), part, `${from} → ${to}`);
  }
});

// A canonical view and an inventory of a module, as far as the places read them.
const inventoryOf = (version, formatVersion = "0.3") => ({ module_format_version: formatVersion, id: "example/a", version, server_part: { digest: DIGEST, size: 2 }, device_part: { digest: DIGEST, size: 2 } });
const MANIFEST = {
  module_format_version: "0.3",
  id: "example/a",
  version: "1.0.0",
  title: "A",
  subject: "mathematics",
  audience: { age_categories: ["under_13"] },
  bands: [{ id: "easy", title: "Easy" }],
  languages: { explanation: "en" },
  authors: [{ name: "An author" }],
  license: "Apache-2.0",
};

test("the places of a package are read where every version of the format keeps them", () => {
  const view = { manifest: MANIFEST, skill_graph: { skills: { a: {} }, retired_skills: { b: { replaced_by: ["a"] } } }, tasks: { t: {} }, traps: { traps: { x: {} } } };
  assert.deepEqual(placesOf(inventoryOf("1.0.0"), view).places, {
    formatVersion: "0.3",
    id: "example/a",
    version: "1.0.0",
    languages: { explanation: "en" },
    bands: ["easy"],
    skills: ["a"],
    retired: { b: ["a"] },
    tasks: ["t"],
    lessons: [],
    traps: ["x"],
    techniques: [],
  });
  const problem = (inventory, view) => placesOf(inventory, view).problem;
  assert.match(problem(null, view), /holds no inventory/);
  assert.match(problem({ ...inventoryOf("1.0.0"), module_format_version: "x" }, view), /module_format_version/);
  assert.match(problem({ ...inventoryOf("1.0.0"), id: 1 }, view), /id of its inventory/);
  assert.match(problem(inventoryOf("1.0"), view), /version of its inventory/);
  assert.match(problem({ ...inventoryOf("1.0.0"), server_part: { digest: "md5:1" } }, view), /digest of the server part/);
  assert.match(problem(inventoryOf("1.0.0"), {}), /manifest in its canonical view/);
  assert.match(problem(inventoryOf("1.0.0"), { manifest: { ...MANIFEST, languages: "en" } }), /manifest\.languages/);
  assert.match(problem(inventoryOf("1.0.0"), { manifest: { ...MANIFEST, bands: [{ title: "Easy" }] } }), /manifest\.bands/);
  assert.match(problem(inventoryOf("1.0.0"), { manifest: MANIFEST, skill_graph: { skills: {}, retired_skills: { b: ["a"] } } }), /retired_skills/);
  assert.match(problem(inventoryOf("1.0.0"), { manifest: MANIFEST, techniques: { techniques: [] } }), /techniques\.techniques/);
  assert.match(problem(inventoryOf("1.0.0"), { manifest: MANIFEST, tasks: [] }), /holds no tasks/);
});

test("a package as files of an earlier version is read by the places that every version keeps", () => {
  const view = { manifest: MANIFEST };
  const server = canonicalBytes(view);
  const inventory = { ...inventoryOf("1.0.0", "0.2"), server_part: descriptorOf(server) };
  const files = { "inventory.json": canonicalBytes(inventory), "server.json": server };
  assert.deepEqual(packageFromFiles(files).pkg, { inventory, view, digest: digestOf(files["inventory.json"]) });
  // Its canonical text and its device part may be another version's: only the places are read.
  const spaced = Buffer.from(JSON.stringify(view, null, 2));
  const respaced = { ...inventory, server_part: descriptorOf(spaced), device_part: "another form" };
  assert.deepEqual(packageFromFiles({ "inventory.json": Buffer.from(JSON.stringify(respaced)), "server.json": spaced }).pkg.view, view);
  const problems = (changed) => packageFromFiles({ ...files, ...changed }).problems;
  assert.deepEqual(problems({ "server.json": Buffer.from("{") }).map((problem) => problem.file), ["server.json"]);
  assert.match(problems({ "server.json": Buffer.from("{") })[0].message, /is no JSON value/);
  assert.deepEqual(problems({ "server.json": canonicalBytes({ ...view, more: 1 }) }).map((problem) => problem.file), ["inventory.json"]);
  const { server_part: _, ...partial } = inventory;
  assert.deepEqual(problems({ "inventory.json": canonicalBytes(partial) }), [{ file: "inventory.json", message: `names the server part null, and server.json is ${JSON.stringify(descriptorOf(server))}` }]);
});

const slot = (check, extra = {}) => ({ binding: "anywhere", check, ...extra });

test("a check is compared by what decides its verdict and its trap", () => {
  const same = (a, b) => assert.equal(checkMeaningOf(a), checkMeaningOf(b));
  const other = (a, b) => assert.notEqual(checkMeaningOf(a), checkMeaningOf(b));
  const trap = (value, name = "off") => ({ value, trap: name, text: "Words." });
  same(slot({ kind: "number", key: "2.50", units: ["cm", "CM ", "m"] }), slot({ kind: "number", key: "5/2", units: ["m", "cm"] }));
  other(slot({ kind: "number", key: "7", units: ["cm"] }), slot({ kind: "number", key: "7", units: ["cm", "m"] }));
  other(slot({ kind: "number", key: "7" }), slot({ kind: "number", key: "8" }));
  same(slot({ kind: "number", key: "7", trap_values: [trap("6"), trap("8")] }), slot({ kind: "number", key: "7", trap_values: [{ value: "8.0", trap: "off" }, trap("6", "off")] }));
  other(slot({ kind: "number", key: "7", trap_values: [trap("6")] }), slot({ kind: "number", key: "7", trap_values: [trap("6", "slip")] }));
  same(slot({ kind: "fraction", key: "6/8" }), slot({ kind: "fraction", key: "3/4", form: "any" }));
  other(slot({ kind: "fraction", key: "3/4" }), slot({ kind: "fraction", key: "3/4", form: "reduced" }));
  same(slot({ kind: "choice", key: "ODD", options: ["even", "odd"] }), slot({ kind: "choice", key: "odd", options: ["Odd", "Even"] }));
  // The notation decides the verdict of a word that is none of the options (R111): options unless given.
  same(slot({ kind: "choice", key: "odd", options: ["even", "odd"] }), slot({ kind: "choice", key: "odd", options: ["even", "odd"], notation: "options" }));
  other(slot({ kind: "choice", key: "odd", options: ["even", "odd"] }), slot({ kind: "choice", key: "odd", options: ["even", "odd"], notation: "word" }));
  same(slot({ kind: "choice", key: "Kim.", options: ["Kim.", "Lea"], notation: "word" }), slot({ kind: "choice", key: "kim", options: ["lea", "kim"], notation: "word" }));
  same(slot({ kind: "choice", key: "a" }, { binding: "choice", options: ["a", "b"] }), slot({ kind: "choice", key: "A" }, { binding: "choice", options: ["B", "A"] }));
  other(slot({ kind: "choice", key: "a" }, { binding: "choice", options: ["a", "b"] }), slot({ kind: "choice", key: "a" }, { binding: "choice", options: ["a", "b", "c"] }));
  other(slot({ kind: "predicate", predicate: "value > 1" }), slot({ kind: "predicate", predicate: "value>1" }));
  same(slot({ kind: "rubric", criteria: [{ text: "One." }] }), slot({ kind: "rubric", criteria: [{ text: "Two." }] }));
  other(slot({ kind: "rubric", criteria: [] }), slot({ kind: "number", key: "1" }));
  assert.throws(() => checkMeaningOf(slot({ kind: "text", key: "a" })), /compares no check of the kind text/);
});

// A canonical view of a whole module to compare, with change applied to a copy.
const TASK = {
  id: "t",
  statement: [{ text: "Count." }],
  canvas: { kind: "handwriting_sheet" },
  items: [{ answer_slots: [slot({ kind: "number", key: "7" })] }],
  skills: { primary: ["a", "b"] },
  band: "easy",
  difficulty: 1,
};
const VIEW = { manifest: MANIFEST, skill_graph: { skills: { a: { title: "A", assessability: "verdict" }, b: { title: "B", assessability: "verdict" } } }, tasks: { t: TASK } };
const DEVICE = { license: { digest: DIGEST, size: 11 } };
const partOf = (change, device = DEVICE) => {
  const after = structuredClone(VIEW);
  change(after);
  return foundPartOf({ view: VIEW, device: DEVICE }, { view: after, device }).part;
};

test("the part found is the highest that a change raises, and the version alone raises none", () => {
  assert.equal(partOf((view) => (view.manifest = { ...view.manifest, version: "2.0.0" })), "none");
  assert.equal(partOf(() => {}, { license: { digest: DIGEST, size: 12 } }), "patch");
  assert.equal(partOf((view) => (view.manifest = { ...view.manifest, title: "B" })), "patch");
  assert.equal(partOf((view) => (view.tasks.t = { ...TASK, skills: { primary: ["b", "a"] } })), "patch");
  assert.equal(partOf((view) => (view.tasks.t = { ...TASK, skills: { primary: ["a"] } })), "minor");
  assert.equal(partOf((view) => (view.tasks.t = { ...TASK, age_categories: ["under_13"] })), "patch");
  assert.equal(partOf((view) => (view.tasks.t = { ...TASK, items: [{ answer_slots: [slot({ kind: "number", key: "8" })] }] })), "major");
  assert.equal(partOf((view) => (view.tasks.t = { ...TASK, items: [{ answer_slots: [slot({ kind: "number", key: "7" }, { binding: "zone" })] }] })), "major");
  assert.equal(partOf((view) => (view.solving_steps = { steps: [{ title: "Solve", exit_condition: "none" }] })), "minor");
  assert.equal(partOf((view) => (view.manifest = { ...view.manifest, canvas: { digit_height: 24 } })), "patch");
  assert.equal(partOf((view) => (view.manifest = { ...view.manifest, bands: [{ id: "hard", title: "Hard" }] })), "patch");
  assert.equal(partOf((view) => (view.skill_graph.retired_skills = { c: { replaced_by: ["a"] } })), "major");
  // replaced_by is a set: another order is no change of the table, only of the view.
  const retiredBy = (by) => ({ view: { ...VIEW, skill_graph: { ...VIEW.skill_graph, retired_skills: { c: { replaced_by: by } } } }, device: DEVICE });
  assert.equal(foundPartOf(retiredBy(["a", "b"]), retiredBy(["b", "a"])).part, "patch");
  assert.equal(partOf((view) => (view.traps = { traps: { x: { description: "X.", trap_advice: "Y." } } })), "minor");
});

test("instances of a template match by the numbers of their parameters", () => {
  const template = {
    ...TASK,
    template: { parameters: { a: { from: 1, to: 2 } } },
    canvas: { kind: "workbook" },
    items: [{ line: [{ text: "{a} + 1 =" }, { binding: "box", check: { kind: "number", key: "{b}" } }] }],
  };
  const view = (numbers, task = template) => ({ ...VIEW, tasks: { t: task }, instances: { t: numbers } });
  const before = view([{ a: 1, b: 2 }, { a: 2, b: 3 }]);
  const part = (after) => foundPartOf({ view: before, device: DEVICE }, { view: after, device: DEVICE }).part;
  assert.equal(part(view([{ a: 2, b: 3 }])), "minor");
  assert.equal(part(view([{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }])), "minor");
  assert.equal(part(view([{ a: 1, b: 2 }, { a: 2, b: 4 }])), "major");
  const renamed = { ...template, template: { parameters: { c: { from: 1, to: 2 } } } };
  assert.equal(part(view([{ c: 1, b: 2 }, { c: 2, b: 3 }], renamed)), "major");
  const plain = { ...template, template: undefined, items: [{ line: [{ text: "1 + 1 =" }, { binding: "box", check: { kind: "number", key: "2" } }] }] };
  delete plain.template;
  assert.equal(part({ ...VIEW, tasks: { t: plain } }), "major");
  assert.equal(part(view([{ a: 1, b: 2 }, { a: 2, b: 3 }], { ...template, canvas: { kind: "handwriting_sheet" } })), "major");
});

// A version to compare: its places, and its view and device listing when it is of format 0.3.
function version(at, change = () => {}, formatVersion = "0.3") {
  const view = structuredClone(VIEW);
  view.manifest = { ...view.manifest, version: at, module_format_version: formatVersion };
  change(view);
  const { places } = placesOf(inventoryOf(at, formatVersion), view);
  const digest = digestOf(canonicalBytes([view, formatVersion]));
  return formatVersion === "0.3" ? { digest, places, view, device: DEVICE } : { digest, places };
}
const rulesOf = (published, next) => compareVersions({ published, next }).breaches.map((breach) => breach.rule);

test("the newest published version as it was is no change, and a new version stands above every published one", () => {
  assert.deepEqual(compareVersions({ published: [version("1.0.0")], next: version("1.0.0") }), { part: "none", changes: [], breaches: [], unchanged: true });
  assert.deepEqual(rulesOf([version("1.0.0")], version("1.0.0", (view) => (view.manifest.title = "B"))), [ABOVE]);
  assert.deepEqual(rulesOf([version("1.0.0"), version("1.1.0")], version("1.0.1")), [ABOVE]);
  assert.deepEqual(rulesOf([version("1.1.0"), version("1.0.0")], version("1.1.1")), []);
});

test("a new version is the next by one part, no lower than the part found", () => {
  assert.deepEqual(rulesOf([version("1.0.0")], version("1.0.2")), [STEP]);
  const added = (view) => (view.tasks.u = { ...TASK, id: "u" });
  assert.deepEqual(rulesOf([version("1.0.0")], version("1.0.1", added)), [STEP]);
  assert.match(compareVersions({ published: [version("1.0.0")], next: version("1.0.1", added) }).breaches[0].message, /raises the patch part after 1\.0\.0, and the comparison finds a minor change: #\/tasks\/u: the task u is added/);
  assert.deepEqual(rulesOf([version("1.0.0")], version("1.1.0", added)), []);
  assert.deepEqual(rulesOf([version("1.0.0")], version("2.0.0", added)), []);
});

test("through a move of the format the part is major, and the rules read the places", () => {
  const old = version("1.0.0", () => {}, "0.2");
  assert.equal(compareVersions({ published: [old], next: version("2.0.0") }).part, "major");
  assert.deepEqual(rulesOf([old], version("1.1.0")), [STEP]);
  assert.deepEqual(rulesOf([old], version("2.0.0", (view) => delete view.skill_graph.skills.b)), [RETIRED_COMPLETE]);
  // Section 27 gives the part of a move only while the format is v0.
  assert.throws(() => compareVersions({ published: [version("1.0.0", () => {}, "1.0")], next: version("2.0.0", () => {}, "1.1") }), /only while the format is v0/);
});

test("retired skills stay, expand only and name a published skill", () => {
  const retired = (entries) => (view) => {
    for (const id of Object.keys(entries)) delete view.skill_graph.skills[id];
    view.skill_graph.retired_skills = Object.fromEntries(Object.entries(entries).map(([id, by]) => [id, { replaced_by: by }]));
  };
  const withC = version("1.0.0", (view) => (view.skill_graph.skills.c = { title: "C", assessability: "verdict" }));
  const cRetired = version("2.0.0", retired({ c: ["b"] }));
  assert.deepEqual(rulesOf([withC, cRetired], version("3.0.0")), [RETIRED_COMPLETE, RETIRED_KEPT]);
  assert.deepEqual(rulesOf([cRetired], version("3.0.0", retired({ c: ["a"] }))), [RETIRED_KEPT]);
  assert.deepEqual(rulesOf([cRetired], version("3.0.0", retired({ c: ["a"], b: ["a"] }))), []);
  assert.deepEqual(rulesOf([version("1.0.0")], version("2.0.0", retired({ ghost: [] }))), [RETIRED_KNOWN]);
});

test("an ID gone from the newest version does not come back, and the languages and the bands stay", () => {
  const withU = version("1.0.0", (view) => (view.tasks.u = { ...TASK, id: "u" }));
  assert.deepEqual(rulesOf([withU, version("2.0.0")], version("2.1.0", (view) => (view.tasks.u = { ...TASK, id: "u" }))), [IDS_KEPT]);
  assert.deepEqual(rulesOf([version("1.0.0")], version("2.0.0", (view) => (view.manifest.languages = { explanation: "de" }))), [LANGUAGES_KEPT]);
  assert.deepEqual(rulesOf([version("1.0.0")], version("2.0.0", (view) => (view.manifest.bands = [{ id: "hard", title: "Hard" }]))), [BANDS_KEPT]);
  assert.deepEqual(rulesOf([version("1.0.0")], version("1.1.0", (view) => view.manifest.bands.push({ id: "hard", title: "Hard" }))), []);
});
