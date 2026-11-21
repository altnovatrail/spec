// A made-up GitHub for xrepo's ship, over the origins of world.mjs: gh's pull requests — opened,
// checked, brought up to date and merged into the origin's main —, the runs of main, the releases
// a merge makes, and fetch's npm, Go proxy and SonarCloud. None is a real service.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { git } from "../../shared.mjs";

const PASS = (name) => ({ __typename: "CheckRun", name, status: "COMPLETED", conclusion: "SUCCESS", detailsUrl: `https://github.com/altnovatrail/x/actions/runs/7/job/1` });
const CHECKS = ["CI / test", "codecov/patch", "SonarCloud Code Analysis"];
const ID = ["-c", "user.name=t", "-c", "user.email=t@example.com"];

// The service: `releases` names the tag a merge into each repository releases, none for a
// repository that releases nothing; `on` lets a test change a pull request as gh views it.
export function github(w, { releases = {}, on = {} } = {}) {
  const prs = [];
  const runs = new Map();
  const tags = new Map();
  const calls = [];
  const repoOf = (args) => args[args.indexOf("-R") + 1].split("/")[1];
  const pr = (args) => prs.find((p) => p.number === Number(args[2]) && p.repo === repoOf(args));
  const head = (p) => git(w.origin(p.repo), ["rev-parse", p.head]).trim();
  const rollup = (p) => (p.checks ?? CHECKS.map(PASS));
  const api = (endpoint) => {
    const [, , repo, ...rest] = endpoint.split("/");
    const tail = rest.join("/");
    if (tail === "actions/workflows") return { workflows: (repo === "infra" ? ["CI", "Deploy"] : ["CI", "Release"]).map((name) => ({ name })) };
    if (tail === "releases/latest") return { tag_name: [...(tags.get(repo) ?? ["v0.0.1"])].at(-1) };
    if (tail.startsWith("releases/tags/")) {
      if (!(tags.get(repo) ?? []).includes(tail.slice("releases/tags/".length))) throw new Error("gh: Not Found (HTTP 404)");
      return { draft: false };
    }
    if (tail.startsWith("compare/")) {
      const [sha, tag] = tail.slice("compare/".length).split("...");
      try {
        const at = git(w.origin(repo), ["rev-parse", `${tag}^{commit}`]).trim();
        if (at === sha) return { status: "identical" };
        git(w.origin(repo), ["merge-base", "--is-ancestor", sha, at]);
        return { status: "ahead" };
      } catch {
        return { status: "behind" };
      }
    }
    if (tail.startsWith("contents/go.mod?ref=")) {
      return git(w.origin(repo), ["show", `${tail.split("=")[1]}:go.mod`]);
    }
    throw new Error(`fake gh: no api ${endpoint}`);
  };
  const gh = (args) => {
    calls.push(args);
    const [what, verb] = args;
    if (what === "api") {
      const endpoint = args[args.indexOf("--") + 1];
      const answer = api(endpoint);
      return typeof answer === "string" ? answer : JSON.stringify(answer);
    }
    if (what === "pr" && verb === "list") {
      const repo = repoOf(args);
      if (args.includes("merged")) return JSON.stringify([{ number: 1, statusCheckRollup: CHECKS.map(PASS) }]);
      return JSON.stringify(prs.filter((p) => p.repo === repo && p.state === "OPEN" && p.head === args[args.indexOf("--head") + 1]).map((p) => ({ number: p.number })));
    }
    if (what === "pr" && verb === "create") {
      const repo = repoOf(args);
      const p = { repo, number: prs.length + 101, head: args[args.indexOf("--head") + 1], title: args[args.indexOf("--title") + 1], body: fs.readFileSync(args[args.indexOf("--body-file") + 1], "utf8"), state: "OPEN", mergeState: "CLEAN", views: 0 };
      prs.push(p);
      return `https://github.com/altnovatrail/${repo}/pull/${p.number}\n`;
    }
    if (what === "pr" && verb === "view") {
      const p = pr(args);
      if (args.includes("mergeCommit")) return JSON.stringify({ mergeCommit: { oid: p.merge } });
      p.views += 1;
      on[p.repo]?.(p);
      return JSON.stringify({ state: p.state, mergeStateStatus: p.mergeState, headRefOid: head(p), statusCheckRollup: rollup(p) });
    }
    if (what === "pr" && verb === "update-branch") {
      const p = pr(args);
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "update-"));
      git(tmp, ["clone", "--quiet", "--branch", p.head, w.origin(p.repo), "c"]);
      git(path.join(tmp, "c"), [...ID, "merge", "--quiet", "--no-edit", "origin/main"]);
      git(path.join(tmp, "c"), ["push", "--quiet", "origin", p.head]);
      fs.rmSync(tmp, { recursive: true, force: true });
      p.mergeState = "CLEAN";
      return "";
    }
    if (what === "pr" && verb === "merge") {
      const p = pr(args);
      const origin = w.origin(p.repo);
      git(origin, [...ID, "merge", "--quiet", "--no-ff", "-m", `Merge pull request #${p.number}`, p.head]);
      p.merge = git(origin, ["rev-parse", "HEAD"]).trim();
      p.state = "MERGED";
      const tag = releases[p.repo];
      if (tag) {
        git(origin, ["tag", tag, p.merge]);
        tags.set(p.repo, [...(tags.get(p.repo) ?? []), tag]);
      }
      runs.set(p.merge, [{ databaseId: 1, workflowName: "CI", status: "completed", conclusion: "success" }, ...(p.repo === "infra" ? [] : [{ databaseId: 2, workflowName: "Release", status: "completed", conclusion: "success" }])]);
      return "";
    }
    if (what === "run" && verb === "list") return JSON.stringify(runs.get(args[args.indexOf("--commit") + 1]) ?? []);
    if (what === "run" && verb === "view") return "test\n--- FAIL: TestX\nFAIL\n";
    throw new Error(`fake gh: no ${args.join(" ")}`);
  };
  const sonar = { total: 0, issues: [], gate: "OK" };
  const answer = (body, ok = true) => ({ ok, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
  const fetched = [];
  const fetch = async (url) => {
    fetched.push(url);
    if (url.startsWith("https://registry.npmjs.org/")) return answer({ dist: { tarball: "https://registry.npmjs.org/a.tgz" } });
    if (url.startsWith("https://proxy.golang.org/")) return answer({});
    if (url.includes("/api/") && sonar.down) return answer({}, false);
    if (url.includes("/api/issues/search")) return answer({ total: sonar.total, issues: sonar.issues });
    if (url.includes("/api/qualitygates/")) return answer({ projectStatus: { status: sonar.gate } });
    return answer({}, false);
  };
  return { gh, fetch, prs, runs, tags, calls, sonar, fetched };
}
