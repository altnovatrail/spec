// The module index of section 26: the entry of a package, the build of an index from the index of
// the release before, and the three rules that refuse a build.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTRIES_KEPT, KNOWN_WITHDRAWALS, ONE_PACKAGE, entryOf, indexFormProblems, indexOf, teachesOf } from "../index.mjs";

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
