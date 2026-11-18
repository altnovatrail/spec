// Each test rebuilds or creates a made-up container on the host of fakes.mjs: its fake docker runs
// the helper's script here, with real git on clones of a made-up GitHub in a temporary folder, and
// the fake devcontainer makes the container. None is a real container or repository.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { git } from "../../shared.mjs";
import { main } from "../main.mjs";
import { create, helperArgs, ORGANIZATION, rebuild, runLong, sessionsIn, UP_SCRIPT } from "../devcontainers.mjs";
import { container, host } from "./fakes.mjs";

const IDENTITY = ["-c", "user.name=t", "-c", "user.email=t@example.com"];

// A host whose clones are real: GitHub is a folder of bare repositories, each with a main whose
// .devcontainer/ holds its configuration; the projects' folder holds spec's clone, the orchestrator's
// own folder, and sim's, whose container is the fake's jovial_cannon.
function clones(t) {
  const h = host();
  t.after(h.done);
  const github = path.join(h.root, "github");
  const projects = path.join(h.root, "projects");
  fs.mkdirSync(projects);
  const repository = (repo) => {
    const work = path.join(h.root, "seed", repo);
    fs.mkdirSync(path.join(work, ".devcontainer"), { recursive: true });
    fs.writeFileSync(path.join(work, ".devcontainer", "devcontainer.json"), `{ "name": "${repo}" }\n`);
    git(work, ["init", "--quiet", "--initial-branch=main"]);
    git(work, ["add", "."]);
    git(work, [...IDENTITY, "commit", "--quiet", "-m", "init"]);
    git(h.root, ["clone", "--quiet", "--bare", work, path.join(github, `${repo}.git`)]);
  };
  for (const repo of ["spec", "sim", "tutor"]) repository(repo);
  const clone = (repo, folder = path.join(projects, repo)) => {
    git(h.root, ["clone", "--quiet", `${github}/${repo}.git`, folder]);
    return folder;
  };
  const sim = clone("sim");
  clone("spec");
  h.edit((cs) => {
    cs[0].Config.Labels["devcontainer.local_folder"] = path.join(projects, "spec");
    cs[2] = container("cccc3333sim", "jovial_cannon", sim, { running: true });
  });
  const deps = { ...h.deps, organization: github };
  const log = (file) => fs.readFileSync(file, "utf8");
  return { h, deps, github, projects, sim, clone, log };
}

test("rebuild runs the CLI in a helper of the orchestrator's image, at the host's path, and the new container takes the labels", (t) => {
  const { h, deps, sim, github, log } = clones(t);
  const made = rebuild("sim", {}, deps);
  assert.equal(made.repo, "sim");
  assert.equal(made.folder, sim);
  assert.deepEqual(made.from, { id: "cccc3333sim", name: "jovial_cannon" });
  assert.equal(made.to.name, "made_8");
  assert.match(log(made.to.log), new RegExp(`^main [0-9a-f]{40}: ${sim} has its \\.devcontainer/$`, "m"));
  // The helper: the socket and the clone's folder at the same path, the host's network, removed.
  const run = h.dockerCalls().find((c) => c[0] === "run");
  assert.deepEqual(run, helperArgs({ image: "sha256:image-of-busy_gauss", repo: "sim", mode: "rebuild", folder: sim, config: `${sim}/.devcontainer/devcontainer.json`, mount: sim, organization: github }));
  assert.deepEqual(run.slice(0, 16), ["run", "--rm", "--init", "--name", "novatrail-up-sim", "--network", "host", "--user", "vscode", "--mount", "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock", "--mount", `type=bind,source=${sim},target=${sim}`, "--workdir", sim, "sha256:image-of-busy_gauss"]);
  assert.deepEqual(h.upCalls(), [["up", "--workspace-folder", sim, "--config", `${sim}/.devcontainer/devcontainer.json`, "--mount-workspace-git-root", "false", "--remove-existing-container"]]);
  // The old one is gone, and the repository's container is the new one by its labels.
  assert.ok(!h.dockerCalls().some((c) => c[0] === "rm"));
  assert.deepEqual(JSON.parse(h.docker(["inspect", "--type", "container", made.to.id]))[0].Config.Labels["devcontainer.local_folder"], sim);
  assert.throws(() => h.docker(["inspect", "--type", "container", "cccc3333sim"]), /No such object/);
  // GitHub's address is NovaTrail's by default.
  assert.equal(helperArgs({ image: "i", repo: "sim", mode: "create", folder: "/f/sim", config: "/f/sim/c", mount: "/f" }).at(-1), ORGANIZATION);
  assert.equal(ORGANIZATION, "https://github.com/altnovatrail");
});

test("rebuild refuses the orchestrator's own container, one where Claude Code runs, and a configuration outside its folder", (t) => {
  const { h, deps, sim } = clones(t);
  assert.throws(() => rebuild("spec", { container: "busy_gauss" }, deps), /busy_gauss is the orchestrator's own container: the author rebuilds it/);
  h.edit((cs) => {
    cs[2].processes = ["  12 /bin/sh", "  13 claude -p --output-format stream-json", "  14 node /tmp/x/bin/claude -p", "  15 sh -c dir=$1; claude \"$@\"", "  16 /home/vscode/.vscode-server/extensions/anthropic.claude-code-2.1.280/resources/native-binary/claude", "  17 node /srv/claude-tools/main.js"];
  });
  assert.throws(() => rebuild("sim", {}, deps), /jovial_cannon: 3 process\(es\) of Claude Code run in it; rebuild it once they have ended/);
  const [found] = JSON.parse(h.docker(["inspect", "--type", "container", "cccc3333sim"]));
  assert.equal(sessionsIn(found, h.docker), 3);
  // A stopped container runs nothing, and is rebuilt without a look inside.
  h.edit((cs) => {
    cs[2].State.Running = false;
  });
  const looks = h.dockerCalls().filter((c) => c[0] === "top").length;
  assert.equal(rebuild("sim", {}, deps).from.name, "jovial_cannon");
  assert.equal(h.dockerCalls().filter((c) => c[0] === "top").length, looks);
  h.edit((cs) => {
    cs.push(container("dada0000odd", "odd_one", path.join(path.dirname(sim), "tutor"), { config: "/elsewhere/devcontainer.json", running: true }));
  });
  assert.throws(() => rebuild("tutor", { container: "odd_one" }, deps), /odd_one: its configuration, \/elsewhere\/devcontainer.json, is not in its folder/);
  assert.equal(h.upCalls().length, 1);
});

test("rebuild builds only a clone of the repository on GitHub whose .devcontainer/ is main's", (t) => {
  const { h, deps, sim, log } = clones(t);
  const failed = (pattern, why) => {
    assert.throws(() => rebuild("sim", {}, deps), (error) => {
      assert.match(error.message, pattern);
      const file = /its log is (\S+)$/.exec(error.message)[1];
      assert.match(log(file), why);
      return true;
    });
  };
  fs.writeFileSync(path.join(sim, ".devcontainer", "devcontainer.json"), `{ "name": "changed" }\n`);
  failed(/rebuild of sim failed, exit 4; its log is /, /its \.devcontainer\/ is not that of main on GitHub/);
  git(sim, ["checkout", "--quiet", "--", "."]);
  fs.writeFileSync(path.join(sim, ".devcontainer", "extra.sh"), "true\n");
  failed(/exit 4/, /is not that of main on GitHub/);
  fs.rmSync(path.join(sim, ".devcontainer", "extra.sh"));
  // A branch not merged into main is not built either; one whose .devcontainer/ is main's is.
  git(sim, ["checkout", "--quiet", "-b", "task"]);
  fs.writeFileSync(path.join(sim, ".devcontainer", "devcontainer.json"), `{ "name": "branch" }\n`);
  git(sim, [...IDENTITY, "commit", "--quiet", "-am", "branch"]);
  failed(/exit 4/, /is not that of main on GitHub/);
  git(sim, ["checkout", "--quiet", "main"]);
  fs.writeFileSync(path.join(sim, "README.md"), "a change outside .devcontainer/\n");
  git(sim, ["remote", "set-url", "origin", "https://github.com/someone/sim.git"]);
  failed(/exit 3/, /is not a clone of .*\/sim\.git: its origin is https:\/\/github.com\/someone\/sim.git/);
  git(sim, ["remote", "remove", "origin"]);
  failed(/exit 3/, /its origin is none/);
  assert.deepEqual(h.upCalls(), []);
  git(sim, ["remote", "add", "origin", `${deps.organization}/sim`]);
  assert.match(log(rebuild("sim", {}, deps).to.log), /has its \.devcontainer\//);
});

test("a build that fails names its message and its log, and the container stays", (t) => {
  const { h, deps } = clones(t);
  h.failUp("the build failed at step 3");
  assert.throws(() => rebuild("sim", {}, deps), /rebuild of sim failed, exit 1: the build failed at step 3; its log is .*\/containers\/sim-rebuild-20261115T220000Z\.log$/);
  assert.equal(JSON.parse(h.docker(["inspect", "--type", "container", "cccc3333sim"]))[0].Name, "/jovial_cannon");
});

test("create clones the repository beside spec's from GitHub's main and makes its container", (t) => {
  const { h, deps, projects, github } = clones(t);
  const made = create("tutor", {}, deps);
  const tutor = path.join(projects, "tutor");
  assert.deepEqual({ ...made, to: { ...made.to, log: null } }, { repo: "tutor", folder: tutor, config: `${tutor}/.devcontainer/devcontainer.json`, from: null, to: { id: "beef9made", name: "made_9", log: null } });
  assert.equal(git(tutor, ["remote", "get-url", "origin"]).trim(), `${github}/tutor.git`);
  assert.equal(git(tutor, ["branch", "--show-current"]).trim(), "main");
  // The helper mounts the folder that holds the clone, and the CLI keeps no container to remove.
  const run = h.dockerCalls().find((c) => c[0] === "run");
  assert.ok(run.includes(`type=bind,source=${projects},target=${projects}`));
  assert.deepEqual(h.upCalls(), [["up", "--workspace-folder", tutor, "--config", `${tutor}/.devcontainer/devcontainer.json`, "--mount-workspace-git-root", "false"]]);
  assert.throws(() => create("tutor", {}, deps), /tutor has a container already, made_9: rebuild it/);
});

test("create takes a folder of its own, uses a clone that is there, and refuses what is not one", (t) => {
  const { h, deps, clone } = clones(t);
  const other = path.join(h.root, "elsewhere");
  fs.mkdirSync(other);
  // A clone already there is not cloned again.
  const there = clone("tutor", path.join(other, "tutor"));
  fs.writeFileSync(path.join(there, "notes.txt"), "the author's\n");
  assert.equal(create("tutor", { folder: there }, deps).folder, there);
  assert.equal(fs.readFileSync(path.join(there, "notes.txt"), "utf8"), "the author's\n");
  // A folder that is no clone, a parent the host has not, and a folder that is not the repository's.
  fs.mkdirSync(path.join(other, "spec"));
  assert.throws(() => create("spec", { folder: path.join(other, "spec") }, deps), /create of spec failed, exit 3; its log is/);
  assert.throws(() => create("sim", { folder: path.join(h.root, "nowhere", "sim") }, deps), /create of sim failed, exit 1; its log is/);
  for (const folder of ["sim", `${other}/../elsewhere/sim`, `${other}/tutor`]) assert.throws(() => create("sim", { folder }, deps), /--folder must be the absolute path of a clone named sim/);
  for (const name of ["..", "../sim", "Sim"]) assert.throws(() => create(name, {}, deps), /not a repository's name/);
  // Another error of docker is not taken for no container.
  assert.throws(() => create("dup", { folder: path.join(other, "dup") }, { ...deps, docker: () => { throw new Error("docker ps: cannot connect"); } }), /cannot connect/);
});

test("rebuild and create from the command line print the containers before and after", async (t) => {
  const { h, deps, sim, projects } = clones(t);
  const out = [];
  const err = [];
  const opts = { ...deps, out: (l) => out.push(l), err: (l) => err.push(l) };
  assert.equal(await main(["rebuild", "sim", "--folder", sim], opts), 0);
  assert.equal(JSON.parse(out[0]).from.name, "jovial_cannon");
  assert.equal(await main(["rebuild", "sim", "--container", "made_8"], opts), 0);
  assert.equal(JSON.parse(out[1]).from.name, "made_8");
  assert.equal(await main(["create", "tutor", "--folder", path.join(projects, "tutor")], opts), 0);
  assert.equal(JSON.parse(out[2]).to.name, "made_9");
  assert.equal(await main(["create", "tutor"], opts), 1);
  assert.match(err[0], /^orchestrator: tutor has a container already/);
  assert.equal(await main(["create", "tutor", "--container", "x"], opts), 2);
  assert.equal(await main(["rebuild"], opts), 2);
  assert.equal(h.upCalls().length, 3);
});

test("the clone's own git configuration never runs in the helper, and nothing of the clone is written", (t) => {
  const { deps, sim } = clones(t);
  // What the repository's container could write into the clone's .git/: a fsmonitor and a hook, and
  // an address that sends GitHub's main elsewhere.
  const marker = path.join(path.dirname(sim), "ran");
  const program = path.join(path.dirname(sim), "evil.sh");
  fs.writeFileSync(program, `#!/bin/sh\necho "$0" >> ${marker}\n`, { mode: 0o755 });
  git(sim, ["config", "core.fsmonitor", program]);
  git(sim, ["config", "core.hooksPath", path.dirname(program)]);
  git(sim, ["config", `url.${path.join(path.dirname(sim), "nowhere")}/.insteadOf`, `${deps.organization}/`]);
  const before = fs.readdirSync(path.join(sim, ".git")).sort();
  assert.equal(rebuild("sim", {}, deps).from.name, "jovial_cannon");
  assert.ok(!fs.existsSync(marker));
  assert.deepEqual(fs.readdirSync(path.join(sim, ".git")).sort(), before);
});

test("a clone by SSH is NovaTrail's too; several containers on the labels, and a configuration that steps back, are refused", (t) => {
  const { h, deps, sim } = clones(t);
  git(sim, ["remote", "set-url", "origin", "git@github.com:altnovatrail/sim.git"]);
  // The address by SSH is GitHub's: with a made-up GitHub, it does not match, and with GitHub's, it does.
  assert.throws(() => rebuild("sim", {}, deps), /exit 3/);
  // The helper's script is a constant: the clone's folder reaches it as an argument, never in its text.
  assert.equal(helperArgs({ image: "i", repo: "sim", mode: "rebuild", folder: sim, config: "c", mount: sim }).at(-7), UP_SCRIPT);
  const script = UP_SCRIPT;
  const shell = (origin) => {
    git(sim, ["remote", "set-url", "origin", origin]);
    return spawnSync("sh", ["-c", script.replace("main=$(mktemp -d)", "exit 0"), "sh", "rebuild", "sim", sim, "c", ORGANIZATION], { encoding: "utf8" });
  };
  for (const origin of ["git@github.com:altnovatrail/sim.git", "git@github.com:altnovatrail/sim", "https://github.com/altnovatrail/sim"]) assert.equal(shell(origin).status, 0, origin);
  assert.equal(shell("git@github.com:someone/sim.git").status, 3);
  git(sim, ["remote", "set-url", "origin", `${deps.organization}/sim.git`]);
  h.edit((cs) => {
    cs.push(container("cccc4444sim", "old_sim", sim));
  });
  assert.throws(() => rebuild("sim", {}, deps), /2 containers of sim have the labels of jovial_cannon: cccc3333sim, cccc4444sim; remove the old ones, then rebuild/);
  h.edit((cs) => {
    cs.pop();
    cs[2].Config.Labels["devcontainer.config_file"] = `${sim}/../tutor/.devcontainer/devcontainer.json`;
  });
  assert.throws(() => rebuild("sim", { container: "jovial_cannon" }, deps), /its configuration, .*\/sim\/\.\.\/tutor\/.devcontainer\/devcontainer.json, is not in its folder/);
  assert.deepEqual(h.upCalls(), []);
});

test("a build past its time removes its helper and names the log", (t) => {
  const { h, deps } = clones(t);
  h.edit((cs) => {
    cs.push(container("abcd0000up", "novatrail-up-sim", "/nowhere"));
  });
  const late = { ...deps, dockerLong: () => ({ status: null, stdout: "", timedOut: true }) };
  assert.throws(() => rebuild("sim", {}, late), /^Error: rebuild of sim took more than 60 minutes, and its helper is removed; its log is .*sim-rebuild-/);
  assert.ok(h.dockerCalls().some((c) => c.join(" ") === "rm --force novatrail-up-sim"));
  // A helper already gone is no error of its own.
  assert.throws(() => rebuild("sim", {}, late), /took more than 60 minutes/);
  // runLong says so of a real time-out.
  const log = path.join(h.root, "late.log");
  assert.deepEqual(runLong(["-c", "sleep 5"], { log, program: "sh", timeout: 50 }), { status: null, stdout: "", timedOut: true });
  assert.throws(() => runLong(["x"], { log, program: path.join(h.root, "no-such-program") }), /docker x: spawnSync .*ENOENT/);
});
