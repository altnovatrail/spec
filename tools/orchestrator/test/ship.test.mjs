// Each test runs xrepo's pin, wait-release and ship through main.mjs on the made-up world of
// world.mjs and the made-up GitHub of github.mjs: none is a real repository, service or release.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { git } from "../../shared.mjs";
import { main } from "../main.mjs";
import { bucketOf, orderOf } from "../ship.mjs";
import { github } from "./github.mjs";
import { commit, world, write } from "./world.mjs";

const ID = ["-c", "user.name=t", "-c", "user.email=t@example.com"];
const PR = (repo) => `${repo}: the epic's change\n\nWhat the change does, for the session that reads it.\n`;

async function run(w, argv) {
  const { h } = w;
  h.out.length = 0;
  h.err.length = 0;
  const status = await main(argv, w.deps);
  return { status, out: h.out.map((l) => JSON.parse(l)), err: h.err.join("\n") };
}

const read = (file) => fs.readFileSync(file, "utf8");

// An epic that changed spec, module-kit — with spec as a submodule — and app, gated, its texts
// written: what ship takes.
async function changed(t, { releases = { spec: "v0.20.1", "module-kit": "v0.3.18" }, on = {}, repos = ["module-kit", "app"] } = {}) {
  const w = await world(t);
  const g = github(w, { releases, on });
  Object.assign(w.deps, { identity: ID, gh: g.gh, fetch: g.fetch, pollMs: 1, specUrl: w.origin("spec") });
  const up = await run(w, ["xrepo", "up", "e1", ...repos]);
  assert.equal(up.status, 0, up.err);
  const dir = path.join(w.epics, "e1");
  const kit = path.join(dir, "module-kit");
  git(kit, ["-c", "protocol.file.allow=always", "submodule", "add", "--quiet", w.origin("spec"), "spec"]);
  write(kit, { "kit.go": "package kit\n\nvar A = 1\n" });
  commit(kit, "module-kit: the epic's change");
  write(path.join(dir, "spec"), { "tree.txt": "second\n" });
  commit(path.join(dir, "spec"), "spec: the epic's change");
  write(path.join(dir, "app"), { "src/a.ts": "export const a = 1;\n" });
  commit(path.join(dir, "app"), "app: the epic's change");
  for (const repo of ["spec", "module-kit", "app"]) write(dir, { [`pr-${repo}.md`]: PR(repo) });
  const gate = await run(w, ["xrepo", "gate"]);
  assert.equal(gate.status, 0, JSON.stringify(gate.out));
  return { w, g, dir };
}

test("the order of the repositories: spec first, then by what each depends on, infra last; a circle is refused", async (t) => {
  const w = await world(t);
  await run(w, ["xrepo", "up", "e1", "api", "tutor", "module-kit", "app", "canvas", "infra"]);
  const dir = path.join(w.epics, "e1");
  assert.deepEqual(orderOf(dir, ["infra", "api", "tutor", "module-kit", "app", "canvas", "spec"]), ["spec", "canvas", "app", "module-kit", "tutor", "api", "infra"]);
  write(path.join(dir, "module-kit"), { "go.mod": "module github.com/altnovatrail/module-kit\n\nrequire github.com/altnovatrail/tutor v0.1.0\n" });
  assert.throws(() => orderOf(dir, ["tutor", "module-kit"]), /in a circle: tutor, module-kit/);
});

test("a check's bucket, of a run of checks and of a status", () => {
  assert.equal(bucketOf({ __typename: "CheckRun", name: "a", status: "IN_PROGRESS" }).bucket, "pending");
  assert.equal(bucketOf({ __typename: "CheckRun", name: "a", status: "COMPLETED", conclusion: "NEUTRAL" }).bucket, "pass");
  assert.equal(bucketOf({ __typename: "CheckRun", name: "a", status: "COMPLETED", conclusion: "SKIPPED" }).bucket, "skipping");
  assert.equal(bucketOf({ __typename: "CheckRun", name: "a", status: "COMPLETED", conclusion: "CANCELLED" }).bucket, "fail");
  assert.deepEqual(bucketOf({ __typename: "StatusContext", context: "s", state: "SUCCESS", targetUrl: "u" }), { name: "s", bucket: "pass", link: "u" });
  assert.equal(bucketOf({ __typename: "StatusContext", context: "s", state: "EXPECTED" }).bucket, "pending");
  assert.equal(bucketOf({ __typename: "StatusContext", context: "s", state: "ERROR" }).bucket, "fail");
});

test("ship: spec's pull request, merged and released, then each dependent pinned to the release, gated without the wiring, merged", async (t) => {
  const { w, g, dir } = await changed(t);
  const ship = await run(w, ["xrepo", "ship"]);
  assert.equal(ship.status, 0, ship.err + JSON.stringify(ship.out.at(-1)));
  const result = ship.out.at(-1);
  assert.equal(result.shipped, true);
  assert.deepEqual(Object.entries(result.nodes).map(([r, n]) => [r, n.phase, n.tag]), [["spec", "done", "v0.20.1"], ["app", "done", null], ["module-kit", "done", "v0.3.18"]]);
  assert.deepEqual(g.prs.map((p) => [p.repo, p.state, p.title]), [["spec", "MERGED", "spec: the epic's change"], ["app", "MERGED", "app: the epic's change"], ["module-kit", "MERGED", "module-kit: the epic's change"]]);
  assert.match(g.prs[0].body, /^What the change does/);

  // module-kit: go.mod by go get without the workspace, its submodule at the tag, CLAUDE.md's line
  // of spec; no go.work left.
  const kit = path.join(dir, "module-kit");
  assert.match(read(path.join(kit, "go.mod")), /github\.com\/altnovatrail\/spec v0\.20\.1\n\s*github\.com\/altnovatrail\/spec\/contracts v0\.20\.1/);
  assert.ok(w.calls("go").some((c) => c.args[0] === "get" && c.gowork === "off" && c.args.includes("github.com/altnovatrail/spec@v0.20.1")));
  assert.equal(git(kit, ["ls-tree", "HEAD", "spec"]).split(/\s+/)[2], git(w.origin("spec"), ["rev-parse", "v0.20.1^{commit}"]).trim());
  // Gated again at the link it commits, the release, not at the clone of spec.
  assert.equal(git(path.join(kit, "spec"), ["rev-parse", "HEAD"]).trim(), git(w.origin("spec"), ["rev-parse", "v0.20.1^{commit}"]).trim());
  assert.equal(read(path.join(kit, "CLAUDE.md")), "# module-kit\n\n- `spec/` — spec at `v0.20.1`.\n- An example: `v0.19.4`.\n");
  assert.ok(!fs.existsSync(path.join(kit, "go.work")));
  assert.match(git(kit, ["log", "-1", "--format=%s%n%b", "HEAD"]), /^Pin spec v0\.20\.1\n[^]*Signed-off-by: t/);
  // app: package.json and its lock by npm, verified; the justfile's spec_tag; spec's packages of the
  // clone gone.
  const app = path.join(dir, "app");
  const manifest = JSON.parse(read(path.join(app, "package.json")));
  assert.deepEqual([manifest.dependencies["@altnovatrail/contracts"], manifest.devDependencies["@altnovatrail/spec"], manifest.dependencies["@altnovatrail/canvas"]], ["0.20.1", "0.20.1", "0.3.36"]);
  assert.equal(read(path.join(app, "justfile")), 'spec_tag := "v0.20.1"\n');
  assert.ok(w.calls("npm").some((c) => c.cwd === app && c.args.includes("@altnovatrail/spec@0.20.1") && c.args.includes("--save-exact")));
  assert.ok(w.calls("just").some((c) => c.recipe === "release-verify-npm" && c.cwd === app));
  assert.ok(!fs.existsSync(path.join(app, "node_modules", "@altnovatrail", "spec", ".xrepo")));
  assert.deepEqual(JSON.parse(read(path.join(dir, ".stand", "pinned.json"))), { spec: "v0.20.1" });
  // Each dependent gated again at its pinned head.
  const record = JSON.parse(read(path.join(dir, ".stand", "gate.json")));
  assert.equal(record.repos["module-kit"].head, git(kit, ["rev-parse", "HEAD"]).trim());
  assert.equal(record.repos["module-kit"].wired, false);
  // The releases' files awaited: npm's versions and archives, the Go proxy's modules.
  for (const url of ["https://registry.npmjs.org/@altnovatrail/spec/0.20.1", "https://registry.npmjs.org/@altnovatrail/contracts/0.20.1", "https://proxy.golang.org/github.com/altnovatrail/spec/contracts/@v/v0.20.1.info", "https://proxy.golang.org/github.com/altnovatrail/module-kit/@v/v0.3.18.info"]) assert.ok(g.fetched.includes(url), url);
  // The orchestrator's own clone of spec, at spec's main after the merge.
  assert.equal(git(path.join(w.deps.home, "spec"), ["rev-parse", "HEAD"]).trim(), g.prs[0].merge);
  // Each step said as it went.
  assert.ok(ship.out.some((e) => e.repo === "module-kit" && e.pin));
  // A ship done is done.
  const again = await run(w, ["xrepo", "ship"]);
  assert.equal(again.out.at(-1).shipped, true);
  assert.equal(g.prs.length, 3);
});

test("ship stops on a failed check, on SonarCloud's issues, on a check that never came, and goes on from where it stopped; BEHIND takes main", async (t) => {
  let fail = true;
  const { w, g, dir } = await changed(t, {
    on: {
      spec: (p) => {
        p.checks = fail ? [{ __typename: "CheckRun", name: "CI / test", status: "COMPLETED", conclusion: "FAILURE", detailsUrl: "https://github.com/altnovatrail/spec/actions/runs/99/job/1" }] : undefined;
      },
      app: (p) => {
        if (p.views === 1) p.checks = [{ __typename: "CheckRun", name: "CI / test", status: "IN_PROGRESS" }];
        else if (p.views === 2) {
          p.checks = undefined;
          p.mergeState = "BEHIND";
        }
      },
    },
  });
  let ship = await run(w, ["xrepo", "ship"]);
  assert.equal(ship.status, 1);
  const stopped = ship.out.at(-1);
  assert.match(stopped.stopped, /^spec #101: CI \/ test failed; what failed is .*ship-spec-101-failed\.json/);
  assert.match(stopped.failures[0].log, /--- FAIL: TestX/);
  assert.ok(g.calls.some((c) => c[0] === "run" && c[1] === "view" && c[2] === "99" && c.includes("--log-failed")));
  assert.equal(JSON.parse(read(path.join(dir, ".stand", "ship.json"))).nodes.spec.phase, "checks");

  fail = false;
  g.sonar.total = 1;
  g.sonar.issues = [{ rule: "javascript:S1", component: "spec:a.mjs", line: 3, message: "a smell" }];
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /SonarCloud has 1 issues/);
  assert.deepEqual(ship.out.at(-1).sonar.issues, ["javascript:S1 spec:a.mjs:3 a smell"]);

  g.sonar.total = 0;
  g.sonar.down = true;
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /SonarCloud's API did not answer/);
  g.sonar.down = false;
  ship = await run(w, ["xrepo", "ship"]);
  assert.equal(ship.out.at(-1).shipped, true, JSON.stringify(ship.out.at(-1)));
  // One pull request each, though ship ran three times; app's branch took main by GitHub's update.
  assert.deepEqual(g.prs.map((p) => p.repo), ["spec", "app", "module-kit"]);
  assert.ok(g.calls.some((c) => c[0] === "pr" && c[1] === "update-branch" && c[2] === "102"));
});

test("ship stops on a conflict, a block, a head not the clone's, a check that never came and a red main; it refuses an epic not gated", async (t) => {
  const state = { spec: "DIRTY" };
  const { w, g, dir } = await changed(t, { on: { spec: (p) => {
    p.mergeState = state.spec;
    p.checks = state.late ? [{ __typename: "CheckRun", name: "CI / test", status: "COMPLETED", conclusion: "SUCCESS" }] : undefined;
  } } });
  let ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /conflicts with main: xrepo sync/);
  state.spec = "BLOCKED";
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /blocked with every check green/);
  state.spec = "CLEAN";
  state.late = true;
  w.deps.lateMs = -1;
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /codecov\/patch, SonarCloud Code Analysis never came/);
  state.late = false;
  write(path.join(dir, "spec"), { "more.txt": "x\n" });
  commit(path.join(dir, "spec"), "spec: after the pull request");
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /is not the clone's/);
  git(path.join(dir, "spec"), ["reset", "--quiet", "--hard", "HEAD~1"]);
  // main's CI red on the merge.
  const merge = g.gh;
  w.deps.gh = (args) => {
    const out = merge(args);
    if (args[0] === "pr" && args[1] === "merge") for (const r of g.runs.get(g.prs[0].merge)) r.conclusion = "failure";
    return out;
  };
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /CI, Release of main on \S+ failed/);

  const fresh = await world(t);
  Object.assign(fresh.deps, { identity: ID, gh: github(fresh).gh, pollMs: 1 });
  await run(fresh, ["xrepo", "up", "e1", "module-kit"]);
  write(path.join(fresh.epics, "e1", "module-kit"), { "a.go": "package kit\n" });
  commit(path.join(fresh.epics, "e1", "module-kit"), "module-kit: a change");
  ship = await run(fresh, ["xrepo", "ship"]);
  assert.match(ship.err, /module-kit has not passed the gate at its head/);
  await run(fresh, ["xrepo", "gate"]);
  ship = await run(fresh, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1)?.stopped ?? ship.err, /pr-module-kit\.md/);
  git(path.join(fresh.epics, "e1", "module-kit"), ["reset", "--quiet", "--hard", "origin/main"]);
  fs.rmSync(path.join(fresh.epics, "e1", ".stand", "ship.json"), { force: true });
  ship = await run(fresh, ["xrepo", "ship"]);
  assert.match(ship.err, /nothing to ship/);
});

test("ship's last node is infra, once api or app released: it stops for the session's edit of the deployment, then ships it", async (t) => {
  const { w, g, dir } = await changed(t, { releases: { spec: "v0.20.1", app: "v0.1.44" }, repos: ["module-kit", "app", "infra"] });
  let ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /^infra: raise deploy\/production\.json to app v0\.1\.44/);
  write(path.join(dir, "infra"), { "deploy/production.json": '{"app":{"release":"v0.1.43"}}\n' });
  commit(path.join(dir, "infra"), "infra: a wrong release");
  ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /^infra: raise deploy\/production\.json to app v0\.1\.44/);
  write(path.join(dir, "infra"), { "deploy/production.json": '{"app":{"release":"v0.1.44"}}\n' });
  commit(path.join(dir, "infra"), "infra: deploy app v0.1.44");
  write(dir, { "pr-infra.md": PR("infra") });
  ship = await run(w, ["xrepo", "ship"]);
  assert.equal(ship.out.at(-1).shipped, true, JSON.stringify(ship.out.at(-1)));
  assert.deepEqual(g.prs.map((p) => p.repo), ["spec", "app", "module-kit", "infra"]);
  assert.equal(ship.out.at(-1).nodes.infra.tag, null);
});

test("pin moves the dependents to a release, by default the latest; wait-release waits for its files and gives up at its time", async (t) => {
  const w = await world(t);
  const g = github(w);
  Object.assign(w.deps, { identity: ID, gh: g.gh, fetch: g.fetch, pollMs: 1 });
  await run(w, ["xrepo", "up", "e1", "tutor", "module-kit"]);
  git(w.origin("module-kit"), ["tag", "v0.3.18"]);
  g.tags.set("module-kit", ["v0.3.18"]);
  const pin = await run(w, ["xrepo", "pin", "module-kit"]);
  assert.equal(pin.status, 0, pin.err);
  assert.equal(pin.out[0].tag, "v0.3.18");
  assert.deepEqual(pin.out[0].dependents.map((d) => [d.repo, d.pinned]), [["tutor", ["go.mod"]]]);
  const tutor = path.join(w.epics, "e1", "tutor");
  assert.match(read(path.join(tutor, "go.mod")), /module-kit v0\.3\.18/);
  assert.doesNotMatch(read(path.join(tutor, "go.work")), /module-kit/);
  // A submodule spec the gate moved to the clone of spec stays out of a pin of another repository.
  git(tutor, ["-c", "protocol.file.allow=always", "submodule", "add", "--quiet", w.origin("spec"), "spec"]);
  commit(tutor, "tutor: spec as a submodule");
  const link = git(tutor, ["ls-tree", "HEAD", "spec"]).split(/\s+/)[2];
  write(path.join(tutor, "spec"), { "moved.txt": "x\n" });
  commit(path.join(tutor, "spec"), "spec: where the gate put it");
  write(tutor, { "go.mod": read(path.join(tutor, "go.mod")).replace("module-kit v0.3.18", "module-kit v0.3.17") });
  git(tutor, [...ID, "commit", "--quiet", "-m", "tutor: back to v0.3.17", "--", "go.mod"]);
  await run(w, ["xrepo", "pin", "module-kit", "v0.3.18"]);
  assert.deepEqual(git(tutor, ["show", "--name-only", "--format=", "HEAD"]).split("\n").filter(Boolean), ["go.mod"]);
  assert.equal(git(tutor, ["ls-tree", "HEAD", "spec"]).split(/\s+/)[2], link);
  // A dependent with changes not committed is refused.
  write(tutor, { "x.go": "package tutor\n" });
  assert.match((await run(w, ["xrepo", "pin", "module-kit", "v0.3.18"])).err, /tutor has changes not committed/);
  assert.match((await run(w, ["xrepo", "pin", "module-kit", "latest"])).err, /not a release's tag: latest/);

  const waited = await run(w, ["xrepo", "wait-release", "module-kit", "v0.3.18"]);
  assert.deepEqual(waited.out[0], { repo: "module-kit", tag: "v0.3.18", release: true, npm: {}, go: { "github.com/altnovatrail/module-kit": true } });
  w.deps.releaseMs = -1;
  const late = await run(w, ["xrepo", "wait-release", "canvas", "v0.3.40"]);
  assert.equal(late.status, 1);
  assert.match(late.err, /canvas v0\.3\.40: not all its files came in/);
});

test("infra the epic changed itself waits for the deployment of the releases too", async (t) => {
  const w = await world(t);
  const g = github(w, { releases: { app: "v0.1.44" } });
  Object.assign(w.deps, { identity: ID, gh: g.gh, fetch: g.fetch, pollMs: 1 });
  await run(w, ["xrepo", "up", "e1", "app", "infra"]);
  const dir = path.join(w.epics, "e1");
  write(path.join(dir, "app"), { "src/a.ts": "export const a = 1;\n" });
  commit(path.join(dir, "app"), "app: the epic's change");
  write(path.join(dir, "infra"), { "notes.txt": "the epic\n" });
  commit(path.join(dir, "infra"), "infra: the epic's change");
  for (const repo of ["app", "infra"]) write(dir, { [`pr-${repo}.md`]: PR(repo) });
  assert.equal((await run(w, ["xrepo", "gate"])).status, 0);
  let ship = await run(w, ["xrepo", "ship"]);
  assert.match(ship.out.at(-1).stopped, /^infra: raise deploy\/production\.json to app v0\.1\.44/);
  assert.deepEqual(g.prs.map((p) => p.repo), ["app"]);
  write(path.join(dir, "infra"), { "deploy/production.json": '{"app":{"release":"v0.1.44"}}\n' });
  commit(path.join(dir, "infra"), "infra: deploy app v0.1.44");
  ship = await run(w, ["xrepo", "ship"]);
  assert.equal(ship.out.at(-1).shipped, true, JSON.stringify(ship.out.at(-1)));
  assert.deepEqual(g.prs.map((p) => p.repo), ["app", "infra"]);
});
