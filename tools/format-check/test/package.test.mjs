// The package of section 25: the members of a canonical view, the tiers of section 12, the numbers
// of the instances of templates, the listing of the device part and the inventory.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalBytes, digestOf } from "../canonical.mjs";
import { canonicalViewOf, deviceListingOf, memberOf, packageOf, tiersOf } from "../package.mjs";

const skill = (prerequisites) => (prerequisites ? { title: "A skill", prerequisites, assessability: "verdict" } : { title: "A skill", assessability: "verdict" });
const MANIFEST = { module_format_version: "0.1", id: "example/trial", version: "0.1.0", title: "A trial module" };
const TEMPLATE = {
  id: "pair",
  template: { parameters: { b: { from: 1, to: 2 }, a: { from: 1, to: 3 } }, derived: { sum: "a + b" }, constraint: "a != b" },
  items: [{ answer_slots: [{ binding: "anywhere", check: { kind: "number", key: "{sum}" } }] }],
};

test("a part has its member by its row of the layout: its term, or the folder of its files", () => {
  assert.equal(memberOf({ part: "skill-graph", id: null, names: ["skill-graph.yaml"] }), "skill_graph");
  assert.equal(memberOf({ part: "task", id: ".yaml", names: ["tasks"] }), "tasks");
});

test("a skill stands one tier above the highest of its prerequisites among the module's skills", () => {
  assert.deepEqual(tiersOf({}).tiers, {});
  assert.deepEqual(tiersOf({ skills: { a: skill(), b: skill(["core.reading"]) } }).tiers, { a: 1, b: 1 });
  assert.deepEqual(tiersOf({ skills: { c: skill(["a", "b"]), b: skill(["a"]), a: skill() } }).tiers, { a: 1, b: 2, c: 3 });
});

test("a cycle of prerequisites or a prerequisite of no skill gives no tiers, but a problem", () => {
  assert.match(tiersOf({ skills: { a: skill(["b"]), b: skill(["a"]) } }).problem, /run in a cycle/);
  assert.match(tiersOf({ skills: { a: skill(["a"]) } }).problem, /run in a cycle/);
  assert.match(tiersOf({ skills: { a: skill(["gone"]) } }).problem, /a needs gone, which is no skill of the module/);
});

test("the canonical view adds the tiers and the numbers of every instance, in their order", () => {
  const { view } = canonicalViewOf({ manifest: MANIFEST, skill_graph: { skills: { a: skill() } }, tasks: { pair: TEMPLATE, plain: { id: "plain" } } });
  assert.deepEqual(view.skill_tiers, { a: 1 });
  // a before b, the first changing slowest, and the combinations with a == b left out.
  assert.deepEqual(view.instances, {
    pair: [
      { a: 1, b: 2, sum: 3 },
      { a: 2, b: 1, sum: 3 },
      { a: 3, b: 1, sum: 4 },
      { a: 3, b: 2, sum: 5 },
    ],
  });
  assert.equal(view.tasks.pair, TEMPLATE);
  assert.deepEqual(Object.keys(canonicalViewOf({ manifest: MANIFEST }).view), ["manifest"]);
});

test("the results of a solver come from the vector, and must be given for every instance", () => {
  const solved = { ...TEMPLATE, template: { ...TEMPLATE.template, solver: { program: "def solve(n):\n    return {}\n", results: ["twice"] } } };
  const given = { pair: [1, 2, 3, 4].map((twice) => ({ twice })) };
  assert.deepEqual(
    canonicalViewOf({ manifest: MANIFEST, tasks: { pair: solved } }, given).view.instances.pair.map((numbers) => numbers.twice),
    [1, 2, 3, 4],
  );
  // Without them, an instance holds the numbers that spec computes.
  assert.equal(canonicalViewOf({ manifest: MANIFEST, tasks: { pair: solved } }).view.instances.pair[0].twice, undefined);
  const short = canonicalViewOf({ manifest: MANIFEST, tasks: { pair: solved } }, { pair: [{ twice: 1 }] });
  assert.match(short.problem, /given for 1 instances, and it has 4/);
  assert.equal(short.inResults, true);
});

test("a template whose ID is a name that every object inherits gets no results it was not given", () => {
  const { view, problem } = canonicalViewOf({ manifest: MANIFEST, tasks: { constructor: { ...TEMPLATE, id: "constructor" } } }, { other: [] });
  assert.equal(problem, undefined);
  assert.equal(view.instances.constructor.length, 4);
});

test("a template that spec cannot count, or a graph with a cycle, gives no canonical view", () => {
  const broken = { ...TEMPLATE, template: { parameters: { a: { from: 2, to: 1 } } } };
  assert.match(canonicalViewOf({ manifest: MANIFEST, tasks: { pair: broken } }).problem, /the template pair has no instances/);
  assert.match(canonicalViewOf({ manifest: MANIFEST, skill_graph: { skills: { a: skill(["a"]) } } }).problem, /cycle/);
});

test("the device part lists LICENSE, NOTICE and the media files, and the inventory names both parts", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "package-"));
  try {
    const write = (file, text) => {
      fs.mkdirSync(path.dirname(path.join(folder, file)), { recursive: true });
      fs.writeFileSync(path.join(folder, file), text);
    };
    write("LICENSE", "A license.\n");
    write("NOTICE", "Notices.\n");
    write("media/b.png", "b");
    write("media/a/c.png", "c");
    const files = ["LICENSE", "NOTICE", "media/b.png", "media/a/c.png", "manifest.yaml", "eval/sample.txt"];
    const listing = deviceListingOf(folder, files);
    assert.deepEqual(Object.keys(listing), ["license", "notice", "media"]);
    assert.deepEqual(Object.keys(listing.media), ["a/c.png", "b.png"]);
    assert.deepEqual(listing.license, { digest: digestOf(Buffer.from("A license.\n")), size: 11 });
    assert.deepEqual(Object.keys(deviceListingOf(folder, ["LICENSE"])), ["license"]);

    const built = packageOf(folder, files, { manifest: MANIFEST });
    assert.deepEqual(built.server, { manifest: MANIFEST });
    assert.deepEqual(built.inventory, {
      module_format_version: "0.1",
      id: "example/trial",
      version: "0.1.0",
      server_part: { digest: digestOf(canonicalBytes(built.server)), size: canonicalBytes(built.server).length },
      device_part: { digest: digestOf(canonicalBytes(listing)), size: canonicalBytes(listing).length },
    });
    assert.equal(built.digest, digestOf(canonicalBytes(built.inventory)));
    assert.match(packageOf(folder, files, { manifest: { module_format_version: "0.1", title: "No ID" } }).problem, /names no id, version/);
    assert.match(packageOf(folder, files, { manifest: MANIFEST, skill_graph: { skills: { a: skill(["a"]) } } }).problem, /cycle/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
