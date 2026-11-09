// The module index of section 26: the entry of a package, the build of an index from the index of
// the release before, and the four rules that refuse a build.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTRIES_KEPT, KNOWN_WITHDRAWALS, ONE_PACKAGE, VERSION_ABOVE, entryOf, indexFormProblems, indexOf, teachesOf, unreadablePrevious } from "../index.mjs";

const skill = (teaches) => (teaches ? { title: "A skill", assessability: "verdict", teaches } : { title: "A skill", assessability: "verdict" });
// A package as packageOf builds it, as far as the index reads it.
const built = (id, version, digest, server = {}) => ({ server, inventory: { module_format_version: "0.1", id, version }, digest });
const A = "sha256:" + "a".repeat(64);
const B = "sha256:" + "b".repeat(64);
const C = "sha256:" + "c".repeat(64);

test("a version teaches each anchor skill that a skill of its graph teaches, once, in the order of code units", () => {
  assert.deepEqual(teachesOf({}), []);
  assert.deepEqual(teachesOf({ skill_graph: { skills: { a: skill() } } }), []);
  const view = { skill_graph: { skills: { a: skill(["core.times"]), b: skill(["core.division", "core.times"]), c: skill() } } };
  assert.deepEqual(teachesOf(view), ["core.division", "core.times"]);
});

test("an entry names the package's format version, its digest and the release, and teaches when it teaches", () => {
  assert.deepEqual(entryOf(built("example/a", "0.1.0", A), "v0.1.0"), { module_format_version: "0.1", package_digest: A, release: "v0.1.0" });
  const teaching = built("example/a", "0.1.0", A, { skill_graph: { skills: { a: skill(["core.times"]) } } });
  assert.deepEqual(entryOf(teaching, "v0.2.0").teaches, ["core.times"]);
});

test("the first release gives each of its packages an entry that names it", () => {
  const { index, breaches } = indexOf({ version: "0.1", packages: [built("example/a", "0.1.0", A), built("example/b", "0.1.0", B)], release: "v0.1.0" });
  assert.deepEqual(breaches, []);
  assert.deepEqual(index, {
    module_format_version: "0.1",
    modules: { "example/a": { "0.1.0": { module_format_version: "0.1", package_digest: A, release: "v0.1.0" } }, "example/b": { "0.1.0": { module_format_version: "0.1", package_digest: B, release: "v0.1.0" } } },
  });
});

test("a later release keeps every entry, a package built again among them, and adds its new versions", () => {
  const first = indexOf({ version: "0.1", packages: [built("example/a", "0.1.0", A)], release: "v0.1.0" }).index;
  const before = structuredClone(first);
  const { index, breaches } = indexOf({ version: "0.1", previous: first, packages: [built("example/a", "0.1.0", A), built("example/a", "0.2.0", B)], release: "v0.2.0" });
  assert.deepEqual(breaches, []);
  assert.equal(index.modules["example/a"]["0.1.0"].release, "v0.1.0");
  assert.equal(index.modules["example/a"]["0.2.0"].release, "v0.2.0");
  // The previous index is read, never changed.
  assert.deepEqual(first, before);
});

test("a withdrawal marks a version with its reason, the release's own among them, and naming it again changes nothing", () => {
  const first = indexOf({ version: "0.1", packages: [built("example/a", "0.1.0", A)], release: "v0.1.0", withdrawals: { "example/a": { "0.1.0": "wrong_key" } } });
  assert.deepEqual(first.breaches, []);
  assert.deepEqual(first.index.modules["example/a"]["0.1.0"].withdrawn, "wrong_key");
  const again = indexOf({ version: "0.1", previous: first.index, packages: [], release: "v0.2.0", withdrawals: { "example/a": { "0.1.0": "wrong_key" } } });
  assert.deepEqual(again, { index: first.index, breaches: [] });
});

test("each rule of the index refuses the build that breaks it, and names the version", () => {
  const first = indexOf({ version: "0.1", packages: [built("example/a", "0.1.0", A)], release: "v0.1.0", withdrawals: { "example/a": { "0.1.0": "wrong_key" } } }).index;
  const rulesOf = (breaches) => breaches.map((breach) => breach.rule);
  const republished = indexOf({ version: "0.1", previous: first, packages: [built("example/a", "0.1.0", B)], release: "v0.2.0" }).breaches;
  assert.deepEqual(rulesOf(republished), [ONE_PACKAGE]);
  assert.match(republished[0].message, /names the package sha256:a+ of example\/a 0\.1\.0, and the release builds sha256:b+/);
  const twice = indexOf({ version: "0.1", packages: [built("example/b", "0.1.0", B), built("example/b", "0.1.0", C), built("example/b", "0.1.0", B)], release: "v0.1.0" }).breaches;
  assert.deepEqual(rulesOf(twice), [ONE_PACKAGE]);
  assert.match(twice[0].message, /two packages of example\/b 0\.1\.0/);
  const unknown = indexOf({ version: "0.1", previous: first, packages: [], release: "v0.2.0", withdrawals: { "example/a": { "0.2.0": "answer_leak" }, "example/b": { "0.1.0": "answer_leak" } } }).breaches;
  assert.deepEqual(rulesOf(unknown), [KNOWN_WITHDRAWALS, KNOWN_WITHDRAWALS]);
  const reason = indexOf({ version: "0.1", previous: first, packages: [], release: "v0.2.0", withdrawals: { "example/a": { "0.1.0": "answer_leak" } } }).breaches;
  assert.deepEqual(rulesOf(reason), [ENTRIES_KEPT]);
  assert.match(reason[0].message, /withdrawn for wrong_key, and the release withdraws it for answer_leak/);
});

test("an index names the format version in VERSION, its previous one no later, and lists teaches in the order of code units", () => {
  const index = { module_format_version: "0.2", modules: { "example/a": { "0.1.0": { teaches: ["core.times", "core.division"] }, "0.2.0": { teaches: ["core.division", "core.times"] } } } };
  assert.deepEqual(indexFormProblems(index, "0.1"), [
    "the index names the format version 0.2: it names 0.1, as format/VERSION has it",
    "the teaches of example/a 0.1.0 are not in the order of code units: core.division, core.times",
  ]);
  assert.deepEqual(indexFormProblems({ module_format_version: "0.1", modules: {} }, null), []);
  // The index of the release before may be built by an earlier version, never a later one.
  assert.deepEqual(indexFormProblems({ module_format_version: "0.9", modules: {} }, "1.0", true), []);
  assert.deepEqual(indexFormProblems({ module_format_version: "1.0", modules: {} }, "1.1", true), []);
  assert.deepEqual(indexFormProblems({ module_format_version: "1.1", modules: {} }, "1.0", true), ["the index names the format version 1.1, newer than 1.0, which format/VERSION has"]);
  assert.deepEqual(indexFormProblems({ module_format_version: "2.0", modules: {} }, "1.3", true), ["the index names the format version 2.0, newer than 1.3, which format/VERSION has"]);
});

// R102, В31 module-kit: a release whose previous index the build cannot read fails, by no rule.
test("the build reads no previous index of a later format version, nor one that the schema of its own refuses", () => {
  const packages = [built("example/a", "0.2.0", B)];
  const previous = (version, extra = {}) => ({ module_format_version: version, modules: { "example/a": { "0.1.0": { module_format_version: "0.1", package_digest: A, release: "v0.1.0" } } }, ...extra });
  // The schema of the module index, as far as these cases need: no member it does not know.
  const validate = (index) => Object.keys(index).every((member) => member === "module_format_version" || member === "modules");
  for (const version of ["0.2", "1.0"]) {
    const { index, breaches, failure } = indexOf({ version: "0.1", previous: previous(version), packages, release: "v0.2.0", validate });
    assert.equal(index, undefined);
    assert.deepEqual(breaches, []);
    assert.equal(failure, `the previous index was built by the format version ${version}, later than 0.1, by which the release builds`);
  }
  // The version comes first: an index of a later version is named so, not by what that version added.
  assert.match(unreadablePrevious(previous("0.2", { registry: {} }), "0.1", validate), /format version 0\.2, later than 0\.1/);
  assert.equal(unreadablePrevious(previous("0.1", { registry: {} }), "0.1", validate), "the previous index is not valid against the schema of the module index of the format version 0.1");
  assert.equal(indexOf({ version: "0.1", previous: previous("0.1", { registry: {} }), packages, release: "v0.2.0", validate }).index, undefined);
  // The same version, or an earlier one, that the schema takes, is read.
  for (const [version, built] of [["0.1", "0.1"], ["0.1", "0.2"], ["0.9", "1.0"]]) assert.equal(unreadablePrevious(previous(version), built, validate), undefined, `${version} by ${built}`);
  assert.deepEqual(indexOf({ version: "0.2", previous: previous("0.1"), packages, release: "v0.2.0", validate }).breaches, []);
  // With format/VERSION unread, no version is later: the missing VERSION is the error, not this.
  assert.equal(unreadablePrevious(previous("0.3"), null), undefined);
  assert.deepEqual(indexFormProblems(previous("0.3"), null, true), []);
});

test("a version new in the release stands above every version of its module in the previous index, withdrawn ones too", () => {
  const previous = indexOf({ version: "0.1", packages: [built("example/a", "0.9.0", A), built("example/a", "1.10.0", B)], release: "v0.1.0" }).index;
  // Above every published version, by its numbers: 1.10.1 is above 1.10.0, and 1.9.0 is not.
  assert.deepEqual(indexOf({ version: "0.1", previous, packages: [built("example/a", "1.10.1", C)], release: "v0.2.0" }).breaches, []);
  const below = indexOf({ version: "0.1", previous, packages: [built("example/a", "1.9.0", C)], release: "v0.2.0" });
  assert.deepEqual(below.breaches.map((breach) => breach.rule), [VERSION_ABOVE]);
  assert.match(below.breaches[0].message, /example\/a 1\.9\.0 is new in the release, and the previous index names 1\.10\.0 above it/);
  // The entry stands, so that a withdrawal of the same version breaks no other rule.
  const withdrawing = indexOf({ version: "0.1", previous, packages: [built("example/a", "1.9.0", C)], release: "v0.2.0", withdrawals: { "example/a": { "1.9.0": "wrong_key" } } });
  assert.deepEqual(withdrawing.breaches.map((breach) => breach.rule), [VERSION_ABOVE]);
  // A version that the previous index names is no new one, and another module is no matter.
  assert.deepEqual(indexOf({ version: "0.1", previous, packages: [built("example/a", "0.9.0", A), built("example/b", "0.1.0", C)], release: "v0.2.0" }).breaches, []);
  // A withdrawn version is published too.
  const withdrawn = indexOf({ version: "0.1", previous, packages: [], release: "v0.2.0", withdrawals: { "example/a": { "1.10.0": "wrong_key" } } }).index;
  const fix = indexOf({ version: "0.1", previous: withdrawn, packages: [built("example/a", "1.9.1", C)], release: "v0.3.0" });
  assert.match(fix.breaches[0].message, /names 1\.10\.0 above it/);
});
