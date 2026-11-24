// Each test runs xrepo's sync, push and gate through main.mjs on the made-up world of world.mjs:
// "GitHub" is a folder of repositories, the containers are fakes.mjs's, and just, go and npm are
// stand-ins.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git } from "../../shared.mjs";
import { main } from "../main.mjs";
import { GATES, gatedAt, SPEC_GATE } from "../gate.mjs";
import { commit, world, write } from "./world.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ID = ["-c", "user.name=t", "-c", "user.email=t@example.com"];

async function run(w, argv) {
  const { h } = w;
  h.out.length = 0;
  h.err.length = 0;
  const status = await main(argv, w.deps);
  return { status, out: h.out.map((l) => JSON.parse(l)), err: h.err.join("\n") };
}

const read = (file) => fs.readFileSync(file, "utf8");

async function epic(t, repos) {
  const w = await world(t);
  w.deps.identity = ID;
  const up = await run(w, ["xrepo", "up", "e1", ...repos]);
  assert.equal(up.status, 0, up.err);
  return { w, dir: path.join(w.epics, "e1") };
}

test("SPEC_GATE is spec's ci.yml: each step toolchain.sh spec <recipe> but the release's, and coverage for the tests' parts", () => {
  const ci = read(path.join(HERE, "..", "..", "..", ".github", "workflows", "ci.yml"));
  const steps = [...ci.matchAll(/toolchain\.sh spec ([\w-]+)/g)].map((m) => m[1]).filter((r) => !["release-version", "release-files", "coverage-part"].includes(r));
  assert.deepEqual([...new Set(steps)].sort(), SPEC_GATE.filter((r) => !["coverage", "ci-lint", "ci-vuln", "ci-licenses"].includes(r)).sort());
  assert.ok(ci.includes("coverage-part"));
  assert.equal(GATES.spec, SPEC_GATE);
});

test("sync merges main into each clone's branch, signed off, and renews the wiring; a conflict is left with its files", async (t) => {
  const { w, dir } = await epic(t, ["module-kit", "tutor"]);
  let sync = await run(w, ["xrepo", "sync"]);
  assert.equal(sync.status, 0, sync.err);
  assert.deepEqual(sync.out[0].clones.map((c) => c.sync), ["up to date", "up to date", "up to date"]);

  write(w.origin("module-kit"), { "main.go": "package kit\n" });
  commit(w.origin("module-kit"), "module-kit: main moves on");
  write(w.origin("tutor"), { "same.txt": "main\n" });
  commit(w.origin("tutor"), "tutor: main moves on");
  write(path.join(dir, "tutor"), { "same.txt": "epic\n" });
  commit(path.join(dir, "tutor"), "tutor: the epic's change");
  write(path.join(dir, "module-kit"), { "epic.go": "package kit\n" });
  commit(path.join(dir, "module-kit"), "module-kit: the epic's change");
  fs.rmSync(path.join(dir, "module-kit", "go.work"));

  sync = await run(w, ["xrepo", "sync"]);
  assert.equal(sync.status, 1);
  const rows = Object.fromEntries(sync.out[0].clones.map((c) => [c.repo, c]));
  assert.equal(rows["module-kit"].sync, "merged");
  assert.match(git(path.join(dir, "module-kit"), ["log", "-1", "--format=%P%n%B"]), /^\S+ \S+\n[^]*Signed-off-by: t <t@example\.com>/);
  assert.deepEqual(rows.tutor, { repo: "tutor", sync: "conflict", files: ["same.txt"] });
  assert.deepEqual(sync.out[0].conflicts, ["tutor"]);
  // A conflict anywhere leaves the wiring as it is.
  assert.ok(!fs.existsSync(path.join(dir, "module-kit", "go.work")));

  git(path.join(dir, "tutor"), ["merge", "--abort"]);
  git(path.join(dir, "tutor"), ["reset", "--quiet", "--hard", "HEAD~1"]);
  write(w.origin("module-kit"), { "more.go": "package kit\n" });
  commit(w.origin("module-kit"), "module-kit: again");
  sync = await run(w, ["xrepo", "sync"]);
  assert.equal(sync.status, 0, sync.err);
  assert.ok(fs.existsSync(path.join(dir, "module-kit", "go.work")));
  // A branch with nothing of its own follows main, with no merge commit: the epic has not changed it.
  const tutor = sync.out[0].clones.find((c) => c.repo === "tutor");
  assert.equal(tutor.sync, "fast-forward");
  assert.equal(tutor.head, git(w.origin("tutor"), ["rev-parse", "main"]).trim());
});

test("push sends each clone's branch ahead of GitHub's, new or not; a clone on another branch stops it first", async (t) => {
  const { w, dir } = await epic(t, ["module-kit"]);
  write(path.join(dir, "module-kit"), { "a.go": "package kit\n" });
  const head = commit(path.join(dir, "module-kit"), "module-kit: a change");
  let push = await run(w, ["xrepo", "push"]);
  assert.equal(push.status, 0, push.err);
  assert.deepEqual(push.out.map((r) => [r.repo, r.push]), [["spec", "new"], ["module-kit", "new"]]);
  assert.equal(git(w.origin("module-kit"), ["rev-parse", "e1"]).trim(), head);
  write(path.join(dir, "module-kit"), { "b.go": "package kit\n" });
  commit(path.join(dir, "module-kit"), "module-kit: another");
  push = await run(w, ["xrepo", "push"]);
  assert.deepEqual(push.out.map((r) => [r.repo, r.push]), [["spec", "up to date"], ["module-kit", "pushed"]]);
  // gh's credential helper, the orchestrator's, for each push.
  assert.ok(GATES["module-kit"]);
  git(path.join(dir, "spec"), ["switch", "--quiet", "--create", "other"]);
  push = await run(w, ["xrepo", "push"]);
  assert.equal(push.status, 1);
  assert.match(push.err, /spec is on other, not on the epic's branch e1/);
});

test("gate: each changed repository's CI in its container, the guards under the wiring passed by, patchcov, gate.json", async (t) => {
  const { w, dir } = await epic(t, ["module-kit", "tutor", "app"]);
  // tutor's spec as a submodule, behind the clone of spec, which the gate aligns.
  git(path.join(dir, "tutor"), ["-c", "protocol.file.allow=always", "submodule", "add", "--quiet", w.origin("spec"), "spec"]);
  commit(path.join(dir, "tutor"), "tutor: spec as a submodule");
  write(path.join(dir, "spec"), { "tree.txt": "second\n" });
  commit(path.join(dir, "spec"), "spec: a change");
  for (const [repo, files] of [["module-kit", { "kit.go": "package kit\n\nfunc A() int {\n\treturn 1\n}\n" }], ["tutor", { "tutor.go": "package tutor\n\n// why\nvar B = 2\n" }], ["app", { "src/a.ts": "export const a = 1;\n" }]]) {
    write(path.join(dir, repo), files);
    commit(path.join(dir, repo), `${repo}: a change`);
  }
  w.deps.env = { ...w.deps.env, XREPO_TEST_GATE: JSON.stringify({ "module-kit:ci-lint": "pin", "tutor:ci-lint": "release-licenses", "tutor:ci-test": "guard", "tutor:ci-licenses": "licenses" }) };
  const gate = await run(w, ["xrepo", "gate"]);
  assert.equal(gate.status, 0, JSON.stringify(gate.out));
  const result = gate.out[0];
  assert.deepEqual(result.submodules, ["tutor"]);
  assert.equal(git(path.join(dir, "tutor", "spec"), ["rev-parse", "HEAD"]).trim(), git(path.join(dir, "spec"), ["rev-parse", "HEAD"]).trim());
  const repos = Object.fromEntries(result.repos.map((r) => [r.repo, r]));
  assert.deepEqual(Object.keys(repos), ["spec", "app", "module-kit", "tutor"]);
  assert.deepEqual(repos.spec.recipes.map((r) => r.recipe), SPEC_GATE);
  assert.deepEqual(repos.app.recipes.map((r) => [r.recipe, r.status]), [["ci", "passed"]]);
  assert.deepEqual(repos["module-kit"].recipes.map((r) => [r.recipe, r.status]), [["ci-lint", "allowed: just ci-lint: the pin of spec"], ["ci-test", "passed"], ["ci-vuln", "passed"], ["ci-licenses", "passed"]]);
  assert.deepEqual(repos.tutor.recipes.map((r) => [r.recipe, r.status]), [["ci-lint", "allowed: just ci-lint: release-licenses of the modules go.work replaces"], ["ci-test", "passed"], ["ci-vuln", "passed"], ["ci-licenses", "allowed: just ci-licenses: the modules go.work replaces"], ["ci-sample-check", "passed"], ["ci-canvas-check", "passed"]]);
  assert.deepEqual(repos.tutor.skipped, ["TestSpecVersion", "TestReadingLogOfTheStub", "TestAdmitExamples", "TestMeasuresOfSpecExamples", "TestExamplesFollowTheRules", "TestExamplesReadBack", "TestReadStyledSheet", "TestStyledSheetCourse", "TestExamples"]);
  for (const repo of ["app", "module-kit", "tutor"]) assert.deepEqual([repos[repo].patchcov.status, repos[repo].patchcov.coverage], ["passed", 100], repo);
  // spec's change is a file no report holds.
  assert.equal(repos.spec.patchcov.coverage, null);
  const just = w.calls("just");
  // One repository after another: no repository's recipes between another's.
  const order = just.filter((c) => c.recipe !== "_install").map((c) => path.basename(c.cwd)).filter((r, i, all) => r !== all[i - 1]);
  assert.deepEqual(order, ["spec", "app", "module-kit", "tutor"]);
  const tutorTest = just.find((c) => c.recipe === "ci-test" && c.cwd.endsWith("/tutor"));
  assert.equal(tutorTest.goflags, "-skip=^(TestSpecVersion|TestReadingLogOfTheStub|TestAdmitExamples|TestMeasuresOfSpecExamples|TestExamplesFollowTheRules|TestExamplesReadBack|TestReadStyledSheet|TestStyledSheetCourse|TestExamples)$");
  assert.equal(tutorTest.allowed, "MIT,Apache-2.0");
  assert.equal(just.find((c) => c.recipe === "docs-check" && c.cwd.endsWith("/spec")).allowed, null);
  // spec's recipes run in spec's container, the others in their own.
  const execs = w.h.dockerCalls().filter((c) => c[0] === "exec" && c.includes("ci-test"));
  assert.ok(execs.some((c) => c.includes("40xmodule-kit")) && execs.some((c) => c.includes("30xtutor")));
  const record = JSON.parse(read(path.join(dir, ".stand", "gate.json")));
  assert.equal(record.repos.app.head, git(path.join(dir, "app"), ["rev-parse", "HEAD"]).trim());
  assert.ok(Object.values(record.repos).every((r) => r.pass));
  assert.equal(record.repos.app.spec, git(path.join(dir, "spec"), ["rev-parse", "HEAD"]).trim());
  // Gated with spec where it was: a commit of spec since undoes it.
  assert.ok(gatedAt(dir, "app", w.deps));
  write(path.join(dir, "spec"), { "later.txt": "x\n" });
  commit(path.join(dir, "spec"), "spec: later");
  assert.ok(!gatedAt(dir, "app", w.deps));
  git(path.join(dir, "spec"), ["reset", "--quiet", "--hard", "HEAD~1"]);

  // Without its go.work, ci-lint's check of the pin is no longer allowed; a missed line fails
  // patchcov; a failed recipe fails the gate.
  fs.rmSync(path.join(dir, "module-kit", "go.work"));
  w.deps.env = { ...w.deps.env, XREPO_TEST_GATE: JSON.stringify({ "module-kit:ci-lint": "pin", "app:cover": "miss", "tutor:ci-lint": "release-licenses-other", "tutor:ci-vuln": "fail", "tutor:ci-licenses": "licenses-other" }) };
  const failed = await run(w, ["xrepo", "gate", "module-kit", "app", "tutor"]);
  assert.equal(failed.status, 1);
  const again = Object.fromEntries(failed.out[0].repos.map((r) => [r.repo, r]));
  assert.equal(again["module-kit"].recipes[0].status, "failed");
  assert.equal(again["module-kit"].wired, false);
  assert.deepEqual(again["module-kit"].skipped, []);
  assert.deepEqual([again.app.patchcov.status, again.app.patchcov.coverage, again.app.patchcov.files.map((f) => f.file)], ["failed", 0, ["src/a.ts"]]);
  assert.equal(again.tutor.recipes.find((r) => r.recipe === "ci-vuln").status, "failed");
  // A license not allowed, or a module with no LICENSE that go.work does not replace, is no failure
  // of the wiring.
  assert.equal(again.tutor.recipes.find((r) => r.recipe === "ci-lint").status, "failed");
  assert.equal(again.tutor.recipes.find((r) => r.recipe === "ci-licenses").status, "failed");
  assert.match(read(again.tutor.recipes.find((r) => r.recipe === "ci-vuln").log), /ci-vuln failed/);
  // The record keeps spec's result, which this gate did not run.
  assert.equal(JSON.parse(read(path.join(dir, ".stand", "gate.json"))).repos.spec.pass, true);
  // A recipe past its time is ended in its container.
  w.deps.env = { ...w.deps.env, XREPO_TEST_GATE: "{}" };
  w.deps.recipeMs = 1;
  const late = await run(w, ["xrepo", "gate", "app"]);
  assert.equal(late.out[0].repos[0].recipes[0].status, "passed");
  assert.ok(w.h.dockerCalls().some((c) => c[0] === "exec" && c.some((a) => a.includes("timeout --kill-after=30 1 bash -c"))));
});

test("gate refuses changes not committed and an epic that changed nothing, and names a repository it knows no gate of", async (t) => {
  const { w, dir } = await epic(t, ["module-kit", "infra"]);
  let gate = await run(w, ["xrepo", "gate"]);
  assert.equal(gate.status, 1);
  assert.match(gate.err, /no clone has commits beyond main/);
  write(path.join(dir, "module-kit"), { "a.go": "package kit\n" });
  gate = await run(w, ["xrepo", "gate", "module-kit"]);
  assert.match(gate.err, /module-kit has changes not committed/);
  commit(path.join(dir, "module-kit"), "module-kit: a change");
  write(path.join(dir, "infra"), { "main.tf": "# a change\n" });
  commit(path.join(dir, "infra"), "infra: a change");
  // infra has no known gate: named as not checked, and nothing else stops for it.
  gate = await run(w, ["xrepo", "gate"]);
  assert.equal(gate.status, 0, gate.err);
  assert.deepEqual(gate.out[0].unchecked.map((u) => u.repo), ["infra"]);
  assert.deepEqual(gate.out[0].repos.map((r) => r.repo), ["module-kit"]);
  gate = await run(w, ["xrepo", "gate", "sim"]);
  assert.match(gate.err, /sim has no clone/);
  gate = await run(w, ["xrepo", "gate", "../x"]);
  assert.match(gate.err, /not a repository's name/);
});
