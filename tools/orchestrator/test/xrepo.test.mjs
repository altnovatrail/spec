// Each test runs xrepo's commands through main.mjs on the made-up world of world.mjs: "GitHub" is
// a folder of repositories, the containers are fakes.mjs's, and just and go are stand-ins.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { git } from "../../shared.mjs";
import { argumentsOf, main } from "../main.mjs";
import { goWorkOf, PACK, quickCheckOf, readmeOf, UNPACK } from "../xrepo.mjs";
import { commit, world, write } from "./world.mjs";

async function run(w, argv) {
  const { h } = w;
  h.out.length = 0;
  h.err.length = 0;
  const status = await main(argv, w.deps);
  return { status, out: h.out.map((l) => JSON.parse(l)), err: h.err.join("\n") };
}

const read = (file) => fs.readFileSync(file, "utf8");
const unpacks = (w) => w.h.dockerCalls().filter((c) => c[0] === "exec" && c.includes(UNPACK));

test("xrepo's command lines: its command is the second word, and each holds its own options", () => {
  assert.deepEqual(argumentsOf(["xrepo", "up", "e18", "api", "app"]), { command: "xrepo up", words: ["e18", "api", "app"], values: {} });
  assert.deepEqual(argumentsOf(["xrepo", "serve", "--ai", "--limit", "3.5", "--epic", "e18"]), { command: "xrepo serve", words: [], values: { ai: true, limit: 3.5, epic: "e18" } });
  assert.deepEqual(argumentsOf(["xrepo", "test", "tutor", "./internal/report"]).words, ["tutor", "./internal/report"]);
  // A command with no other word takes the epic as its word too.
  assert.deepEqual(argumentsOf(["xrepo", "push", "e18"]), { command: "xrepo push", words: [], values: { epic: "e18" } });
  assert.deepEqual(argumentsOf(["xrepo", "ship", "e18", "--epic", "e18"]).values, { epic: "e18" });
  assert.deepEqual(argumentsOf(["xrepo", "test", "app", "src/a.test.ts", "--browser"]).values, { browser: true });
  for (const argv of [["xrepo", "up"], ["xrepo"], ["xrepo", "ship", "e1", "e2"], ["xrepo", "ship", "e1", "--epic", "e2"], ["xrepo", "gate", "--browser"], ["xrepo", "pin"], ["xrepo", "wait-release", "spec"], ["xrepo", "serve", "--limit", "0"], ["xrepo", "status", "--ai"], ["xrepo", "toString"]]) {
    assert.throws(() => argumentsOf(argv), argv.join(" "));
  }
});

test("up clones each repository and spec on the epic's branch, wires Go and npm out of git, and writes the folder's files", async (t) => {
  const w = await world(t);
  // tutor's epic has pushed its branch already.
  const tutorOrigin = w.origin("tutor");
  git(tutorOrigin, ["switch", "--quiet", "--create", "e1"]);
  write(tutorOrigin, { "work.go": "package tutor\n" });
  const pushed = commit(tutorOrigin, "tutor: the epic's work");
  git(tutorOrigin, ["switch", "--quiet", "main"]);

  const up = await run(w, ["xrepo", "up", "e1", "api", "app", "canvas", "tutor", "module-kit"]);
  assert.equal(up.status, 0, up.err);
  const dir = path.join(w.epics, "e1");
  assert.deepEqual(up.out.map((r) => [r.repo, r.branch, r.from]), [["spec", "e1", "main"], ["api", "e1", "main"], ["app", "e1", "main"], ["canvas", "e1", "main"], ["module-kit", "e1", "main"], ["tutor", "e1", "origin"]]);
  assert.equal(git(path.join(dir, "tutor"), ["rev-parse", "HEAD"]).trim(), pushed);
  assert.equal(git(path.join(dir, "tutor"), ["rev-parse", "--abbrev-ref", "@{upstream}"]).trim(), "origin/e1");
  // A new branch is not pushed.
  assert.equal(git(w.origin("api"), ["branch", "--list", "e1"]).trim(), "");

  // Go: spec and its contracts always, the clones of the epic, never engine, which has none; the
  // go line the newest of the modules'.
  assert.equal(read(path.join(dir, "api", "go.work")), "go 1.27.5\n\nuse .\n\nreplace github.com/altnovatrail/module-kit => ../module-kit\nreplace github.com/altnovatrail/spec => ../spec\nreplace github.com/altnovatrail/spec/contracts => ../spec/contracts\nreplace github.com/altnovatrail/tutor => ../tutor\n");
  assert.deepEqual(up.out[1].go, ["github.com/altnovatrail/module-kit => ../module-kit", "github.com/altnovatrail/spec => ../spec", "github.com/altnovatrail/spec/contracts => ../spec/contracts", "github.com/altnovatrail/tutor => ../tutor"]);
  assert.equal(up.out[0].go, null);
  assert.match(read(path.join(dir, "api", ".git", "info", "exclude")), /^\/go\.work\n\/go\.work\.sum\n$/m);
  for (const repo of ["api", "tutor", "module-kit"]) assert.equal(git(path.join(dir, repo), ["status", "--porcelain"]), "", repo);

  // npm: spec's packages of its clone, by the version its release would take, where package.json
  // names them.
  const app = path.join(dir, "app", "node_modules", "@altnovatrail");
  assert.deepEqual(JSON.parse(read(path.join(app, "spec", "package.json"))), { name: "@altnovatrail/spec", version: "0.20.1" });
  assert.equal(read(path.join(app, "contracts", "tree.txt")), "first\n");
  assert.deepEqual(up.out[2].npm.packages, ["@altnovatrail/spec", "@altnovatrail/contracts"]);
  assert.deepEqual(up.out[3].npm.packages, ["@altnovatrail/spec"]);
  assert.ok(!fs.existsSync(path.join(dir, "canvas", "node_modules", "@altnovatrail", "contracts", ".xrepo")));
  assert.equal(read(path.join(app, "spec", ".xrepo")).trim(), up.out[2].npm.spec);
  // Packed in spec's container, installed and unpacked in each consumer's.
  const execs = w.h.dockerCalls().filter((c) => c[0] === "exec");
  assert.ok(execs.some((c) => c.includes(PACK) && c.includes("bbbb2222spec")));
  assert.ok(unpacks(w).every((c) => c.includes("10xapp") || c.includes("20xcanvas")));
  assert.deepEqual(w.calls("just").filter((c) => c.recipe === "_install").map((c) => path.basename(c.cwd)), ["app", "canvas"]);
  // app's deployment configuration, from the host's clone.
  assert.equal(up.out[2].deployment, "copied");
  assert.equal(read(path.join(dir, "app", "deployment.local.json")), "{}\n");

  const workspace = JSON.parse(read(path.join(dir, "e1.code-workspace")));
  assert.deepEqual(workspace.folders.map((f) => f.path), ["spec", "api", "app", "canvas", "module-kit", "tutor"]);
  const readme = read(path.join(dir, "README.md"));
  for (const guard of ["TestSpecVersion", "TestReadingLogOfTheStub", "TestAdmitExamples", "TestMeasuresOfSpecExamples", "TestTheVersionOfModuleKitIsTheOneGoModPins", "TestSpecAndItsContractsAreAtOneTag"]) assert.match(readme, new RegExp(`\\| \`${guard}\` \\|`));
  assert.match(readme, /\| module-kit \| `just ci-lint: the pin of spec` \|/);
  assert.match(readme, /\| tutor \| `just ci-lint: release-licenses` \|/);

  // Again: the clones are kept, and the packages are not laid again while spec's tree is the same.
  const before = unpacks(w).length;
  const again = await run(w, ["xrepo", "up", "e1", "api"]);
  assert.equal(again.status, 0, again.err);
  assert.ok(again.out.every((r) => r.from === "kept"));
  assert.equal(unpacks(w).length, before);
  // A change of spec's working tree, even one git does not track yet, is laid on the next up.
  write(path.join(dir, "spec"), { "tree.txt": "second\n", "new.txt": "x" });
  await run(w, ["xrepo", "up", "e1"]);
  assert.equal(read(path.join(app, "contracts", "tree.txt")), "second\n");
  assert.equal(unpacks(w).length, before + 3);
});

test("up refuses names that are not an epic's or a repository's, and the other commands need the epic named once there are two", async (t) => {
  const w = await world(t);
  for (const argv of [["xrepo", "up", "E1", "api"], ["xrepo", "up", "../e1", "api"], ["xrepo", "up", "e1", ".."], ["xrepo", "up", "e1", "../api"]]) {
    const r = await run(w, argv);
    assert.equal(r.status, 1, argv.join(" "));
    assert.match(r.err, /not an epic's name|not a repository's name/);
  }
  assert.ok(!fs.existsSync(w.epics) || fs.readdirSync(w.epics).length === 0);
  assert.match((await run(w, ["xrepo", "status"])).err, /0 epics in .*; name one with --epic/);
  fs.mkdirSync(path.join(w.epics, "e1"), { recursive: true });
  fs.mkdirSync(path.join(w.epics, "e2"));
  assert.match((await run(w, ["xrepo", "stop"])).err, /2 epics in .*: e1, e2; name one with --epic/);
  assert.match((await run(w, ["xrepo", "stop", "--epic", "e3"])).err, /no epic e3 in/);
  assert.equal((await run(w, ["xrepo", "stop", "--epic", "e2"])).out[0].stand, "none");
});

test("status names each clone's branch against GitHub's, its changes, its submodule and whether its wiring is fresh", async (t) => {
  const w = await world(t);
  git(w.origin("tutor"), ["branch", "e1"]);
  await run(w, ["xrepo", "up", "e1", "app", "tutor"]);
  const dir = path.join(w.epics, "e1");
  write(path.join(dir, "tutor"), { "more.go": "package tutor\n" });
  commit(path.join(dir, "tutor"), "tutor: more");
  write(path.join(dir, "app"), { "src.ts": "x" });
  let s = (await run(w, ["xrepo", "status"])).out[0];
  assert.equal(s.epic, "e1");
  const by = Object.fromEntries(s.clones.map((c) => [c.repo, c]));
  assert.deepEqual([by.tutor.ahead, by.tutor.behind, by.tutor.changed, by.tutor.go_work], [1, 0, 0, true]);
  assert.deepEqual([by.app.ahead, by.app.changed, by.app.go_work], [null, 1, false]);
  assert.deepEqual(by.app.npm, { "@altnovatrail/spec": "fresh", "@altnovatrail/contracts": "fresh" });
  assert.equal(by.spec.npm, null);
  assert.equal(s.stand, null);
  write(path.join(dir, "spec"), { "tree.txt": "second\n" });
  s = (await run(w, ["xrepo", "status"])).out[0];
  assert.equal(s.clones.find((c) => c.repo === "app").npm["@altnovatrail/spec"], "stale");
});

test("test runs a repository's quick checks in its container, with its targets as words, and fails as they fail", async (t) => {
  const w = await world(t);
  await run(w, ["xrepo", "up", "e1", "app", "tutor"]);
  const dir = path.join(w.epics, "e1");
  let r = await run(w, ["xrepo", "test", "tutor", "./internal/report", "./x;touch y"]);
  assert.equal(r.status, 1, r.err);
  assert.match(r.err, /not a package, folder or file of the clone: \.\/x;touch y/);
  r = await run(w, ["xrepo", "test", "tutor", "../api"]);
  assert.match(r.err, /not a package, folder or file of the clone: \.\.\/api/);
  r = await run(w, ["xrepo", "test", "tutor", "/etc"]);
  assert.match(r.err, /not a package, folder or file of the clone: \/etc/);
  r = await run(w, ["xrepo", "test", "tutor", "./internal/report", "./internal/runner"]);
  assert.equal(r.status, 0, r.err);
  assert.deepEqual(w.calls("go").at(-1), { cwd: path.join(dir, "tutor"), args: ["test", "-count=1", "./internal/report", "./internal/runner"] });
  assert.match(r.out[0].output, /go test -count=1 \.\/internal\/report/);
  assert.ok(w.h.dockerCalls().at(-1).includes("30xtutor"));
  r = await run(w, ["xrepo", "test", "tutor"]);
  assert.deepEqual(w.calls("go").at(-1).args, ["test", "-count=1", "./..."]);
  fs.writeFileSync(path.join(dir, "tutor", "FAIL"), "");
  r = await run(w, ["xrepo", "test", "tutor"]);
  assert.equal(r.status, 1, r.err);
  assert.equal(r.out[0].status, 3);
  // Options are no target: go test's -exec would run a program.
  r = await run(w, ["xrepo", "test", "tutor", "-exec=sh"]);
  assert.equal(r.status, 2);
  assert.match(r.err, /xrepo test: an unknown option/);
  // app: installed, its packages renewed, Vitest's project node without the browsers.
  r = await run(w, ["xrepo", "test", "app", "src/a.test.ts"]);
  assert.equal(r.status, 0, r.err);
  assert.match(r.out[0].output, /vitest \["run","--project","node","--exclude","scripts\/site.test.ts","--exclude","scripts\/page.test.ts",".\/src\/a.test.ts"\]/);
  // With --browser, every project of Vitest on the targets, the tests that open browsers among them.
  r = await run(w, ["xrepo", "test", "app", "scripts/page.test.ts", "--browser"]);
  assert.equal(r.status, 0, r.err);
  assert.match(r.out[0].output, /vitest \["run",".\/scripts\/page.test.ts"\]/);
  assert.match((await run(w, ["xrepo", "test", "tutor", "--browser"])).err, /--browser: tutor has no Vitest of its own/);
  r = await run(w, ["xrepo", "test", "spec"]);
  assert.match(r.out[0].output, /just docs-check/);
  assert.match((await run(w, ["xrepo", "test", "canvas"])).err, /canvas has no clone/);
  assert.deepEqual(quickCheckOf(dir, "spec", ["tools/x/test/a.test.mjs"]), { script: 'just _tools && exec node --test "$@"', args: ["tools/x/test/a.test.mjs"] });
  fs.mkdirSync(path.join(dir, "bare", ".git"), { recursive: true });
  assert.throws(() => quickCheckOf(dir, "bare", []), /neither go\.mod nor package\.json/);
});

test("down keeps a clone with work not in main, removes the others, keeps the README and notes, and pulls the host's clones on a clean main", async (t) => {
  const w = await world(t);
  await run(w, ["xrepo", "up", "e1", "tutor", "module-kit"]);
  const dir = path.join(w.epics, "e1");
  write(path.join(dir, "tutor"), { "work.go": "package tutor\n" });
  commit(path.join(dir, "tutor"), "tutor: not merged");
  fs.writeFileSync(path.join(dir, "notes.md"), "what got in the way\n");
  // module-kit's host clone is on a clean main behind GitHub; tutor's has a change of its own.
  for (const repo of ["module-kit", "tutor"]) {
    fs.rmSync(w.work(repo), { recursive: true });
    git(path.dirname(w.work(repo)), ["clone", "--quiet", w.origin(repo), w.work(repo)]);
  }
  write(w.origin("module-kit"), { "later.go": "package kit\n" });
  const later = commit(w.origin("module-kit"), "module-kit: later");
  fs.writeFileSync(path.join(w.work("tutor"), "mine.txt"), "x");
  const r = await run(w, ["xrepo", "down"]);
  assert.equal(r.status, 0, r.err);
  const d = r.out[0];
  assert.deepEqual(d.clones, [{ repo: "spec", removed: true }, { repo: "module-kit", removed: true }, { repo: "tutor", removed: false, why: "commits not in main" }]);
  assert.ok(fs.existsSync(path.join(dir, "tutor")) && !fs.existsSync(path.join(dir, "spec")));
  const kept = path.join(w.deps.home, "epics", "e1");
  assert.equal(read(path.join(kept, "notes.md")), "what got in the way\n");
  assert.match(read(path.join(kept, "README.md")), /^# e1: a task across repositories/);
  const pull = Object.fromEntries(d.host.map((x) => [x.repo, x.pull]));
  assert.equal(pull["module-kit"], "pulled");
  assert.equal(git(w.work("module-kit"), ["rev-parse", "HEAD"]).trim(), later);
  assert.equal(pull.tutor, "skipped: changed");
  // spec's container clone here is no git repository at all.
  assert.match(pull.spec, /^skipped: /);
  // The last clone gone, the folder goes too.
  fs.rmSync(path.join(dir, "tutor"), { recursive: true });
  git(w.origin("tutor"), ["checkout", "--quiet", "main"]);
  await run(w, ["xrepo", "up", "e1", "tutor"]);
  assert.equal((await run(w, ["xrepo", "down"])).status, 0);
  assert.ok(!fs.existsSync(dir));
});

test("a go.work only where a module of NovaTrail with a clone in the epic is required", (t) => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync("/tmp"), "gowork-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  write(dir, { "a/go.mod": "module github.com/altnovatrail/a\n\ngo 1.27\n\nrequire github.com/altnovatrail/engine v0.1.8\n", "b/go.mod": "module x\n\nrequire github.com/altnovatrail/a v0.1.0\n", "a/.git/HEAD": "" });
  assert.equal(goWorkOf(dir, "a"), null);
  assert.equal(goWorkOf(dir, "none"), null);
  // A go.mod with no go line gives none either: a workspace needs one.
  assert.equal(goWorkOf(dir, "b"), null);
  assert.match(readmeOf("e1", [{ repo: "a", from: "main", go: null, npm: null }]), /\| a \| main \| — \| — \|/);
});
