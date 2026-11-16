// Each test reads made-up plans of a made-up GitHub, a function in place of gh: none is a real
// repository's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { highestIn, nextTask, runGh } from "../numbers.mjs";

const PLAN = [
  "| Статус | ID | Задача | Кто | План | Зависит от |",
  "|---|---|---|---|---|---|",
  "| [x] | T26 | Задача, что ссылается на T90 | Claude | — | T25 |",
  "| T27 | первая ячейка |",
  "| [ ] | **T24** | жирный номер |",
  "| В7 | T95 — номер вопроса, не задачи |",
  "",
  "#### T25. Задача",
  "",
  "Текст, что называет T99 и `T98`, и #### T97. не в начале строки.",
  "### T6.1 не задача",
].join("\n");

test("a plan defines its numbers in a row's first two cells and in a heading, not where it cites one", () => {
  assert.equal(highestIn(PLAN), 27);
  assert.equal(highestIn("#### T31. Тело\n"), 31);
  assert.equal(highestIn("Нет задач."), 0);
});

// A GitHub of trees and files, and the calls made to it.
function github({ trees, files, pulls = [], branches = [] }) {
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    // Every endpoint comes after "--", and is the last word.
    assert.equal(args.at(-2), "--", args.join(" "));
    const endpoint = args.at(-1);
    if (endpoint.includes("/pulls?")) return JSON.stringify([pulls.slice(0, 1), pulls.slice(1)]);
    if (endpoint.includes("/branches?")) return JSON.stringify([branches]);
    const tree = /git\/trees\/([^?]+)\?recursive=1$/.exec(endpoint);
    if (tree) return JSON.stringify(trees[tree[1]]);
    const blob = /git\/blobs\/(\w+)$/.exec(endpoint);
    assert.ok(blob, endpoint);
    assert.deepEqual(args.slice(0, 4), ["api", "-H", "Accept: application/vnd.github.raw", "--"]);
    return files[blob[1]];
  };
  return { gh, calls };
}

const entry = (path, sha, type = "blob") => ({ path, type, sha });

test("next reads main, each open pull request's head and each other branch, each file once, and the runs given", () => {
  const main = {
    truncated: false,
    tree: [entry("RUN.md", "a"), entry("run/TASKS.md", "b"), entry("docs/plan/E1.md", "c"), entry("docs/plan/old/E0.md", "x"), entry("docs/other.md", "x"), entry("README.md", "x"), entry("run", "t", "tree")],
  };
  const head = { truncated: false, tree: [entry("RUN.md", "a2"), entry("run/TASKS.md", "b"), entry("docs/plan/E1.md", "c")] };
  const { gh, calls } = github({
    trees: { main, h1: head, h2: main, h3: { truncated: false, tree: [entry("run/TASKS.md", "b3")] } },
    files: { a: PLAN, b: "#### T28. Тело\n", c: "| [x] | T05 | x |\n", a2: `${PLAN}\n| [ ] | T29 | x |\n`, b3: "#### T31. Тело\n" },
    pulls: [
      { number: 51, head: { sha: "h1" } },
      { number: 52, head: { sha: "h2" } },
    ],
    // main and the branches of the pull requests are read once; a branch with no pull request is read.
    branches: [
      { name: "main", commit: { sha: "m0" } },
      { name: "t29-x", commit: { sha: "h1" } },
      { name: "t31-pushed", commit: { sha: "h3" } },
    ],
  });
  assert.deepEqual(nextTask("skill-map", { gh }), {
    repo: "skill-map",
    next: "T32",
    main: "T28",
    pull_requests: [
      { number: 51, task: "T29" },
      { number: 52, task: "T28" },
    ],
    branches: [{ name: "t31-pushed", task: "T31" }],
    runs: [],
  });
  const blobs = calls.filter((c) => c.at(-1).includes("/git/blobs/")).map((c) => c.at(-1).split("/").at(-1));
  assert.deepEqual(blobs, ["a", "b", "c", "a2", "b3"], "a file the branches share is read once, and no other file is read");
  assert.equal(calls.filter((c) => c.at(-1).includes("/git/trees/")).length, 4);
  assert.ok(calls.some((c) => c.join(" ") === "api --paginate --slurp -- repos/altnovatrail/skill-map/branches?per_page=100"));
  assert.ok(calls.some((c) => c.join(" ") === "api --paginate --slurp -- repos/altnovatrail/skill-map/pulls?state=open&per_page=100"));
  assert.ok(calls.every((c) => c.some((a) => a.startsWith("repos/altnovatrail/skill-map/"))));

  // A run not done holds every number it has gone by.
  const held = nextTask("skill-map", { gh, runs: [{ run: "skill-map-T27-20261116T051705Z", tasks: ["T40", "T33"] }] });
  assert.equal(held.next, "T41");
  assert.deepEqual(held.runs, [{ run: "skill-map-T27-20261116T051705Z", task: "T40" }]);
});

test("a repository with no task yet starts at T1; a tree cut short, or not a repository's name, is an error", () => {
  const empty = github({ trees: { main: { truncated: false, tree: [] } }, files: {} });
  assert.deepEqual(nextTask(".github", { gh: empty.gh }), { repo: ".github", next: "T1", main: null, pull_requests: [], branches: [], runs: [] });
  const cut = github({ trees: { main: { truncated: true, tree: [] } }, files: {} });
  assert.throws(() => nextTask("sim", { gh: cut.gh }), /sim: GitHub gave the tree of main cut short/);
  for (const name of ["..", "../sim", "Sim", "sim/x"]) assert.throws(() => nextTask(name, { gh: empty.gh }), /not a repository's name/);
  // What GitHub names is never read as an option of gh.
  const head = github({ trees: { main: { truncated: false, tree: [] } }, files: {}, pulls: [{ number: 3, head: { sha: "--paginate" } }] });
  assert.throws(() => nextTask("sim", { gh: head.gh }), /sim: not a commit or a branch's head: "--paginate"/);
  const blob = github({ trees: { main: { truncated: false, tree: [entry("RUN.md", "-H")] } }, files: {} });
  assert.throws(() => nextTask("sim", { gh: blob.gh }), /sim: not a file's blob: "-H"/);
});

test("gh that cannot start, or that fails, is an error with what it said", () => {
  assert.throws(() => runGh(["api"], { program: "/nonexistent/gh" }), /gh api: spawnSync \/nonexistent\/gh ENOENT/);
  assert.throws(() => runGh(["-c", "echo said >&2; exit 3"], { program: "/bin/sh" }), /gh -c echo said >&2; exit 3: said/);
  assert.throws(() => runGh(["-c", "exit 4"], { program: "/bin/sh" }), /gh -c exit 4: exit 4/);
  assert.equal(runGh(["-c", "echo out"], { program: "/bin/sh" }), "out\n");
});
