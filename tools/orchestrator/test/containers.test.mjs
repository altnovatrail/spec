// Each test finds made-up containers through the fake docker of fakes.mjs: none is a real one.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureRunning, findContainer, inspect, ownFolder, placeOf, runDocker } from "../containers.mjs";
import { host, HOST } from "./fakes.mjs";

test("a repository's container is found by both labels beside the orchestrator's own folder", (t) => {
  const h = host();
  t.after(h.done);
  assert.equal(ownFolder(h.docker, "aaaa1111"), `${HOST}/spec`);
  // spec's folder has two configurations: the one for documents is spec's container for its tasks.
  assert.equal(findContainer("spec", { docker: h.docker, hostname: "aaaa1111" }).Name, "/modest_lichterman");
  assert.equal(findContainer("sim", { docker: h.docker, hostname: "aaaa1111" }).Name, "/jovial_cannon");
  const ps = h.dockerCalls().findLast((c) => c[0] === "ps");
  assert.deepEqual(ps, ["ps", "--all", "--no-trunc", "--filter", `label=devcontainer.local_folder=${HOST}/sim`, "--filter", `label=devcontainer.config_file=${HOST}/sim/.devcontainer/devcontainer.json`, "--format", "{{.ID}}"]);
});

test("of two with the same labels the running one; MathTrail's clone of the same name is another folder", (t) => {
  const h = host();
  t.after(h.done);
  assert.equal(findContainer("infra", { docker: h.docker, hostname: "aaaa1111" }).Name, "/dreamy_robinson");
  assert.equal(findContainer("infra", { docker: h.docker, folder: "/home/someone/projects/mathtrail/infra" }).Name, "/elastic_liskov");
  assert.throws(() => findContainer("dup", { docker: h.docker, hostname: "aaaa1111" }), /2 containers of dup, 2 of them running: dup_one, dup_two; name one with --container/);
  assert.equal(findContainer("dup", { docker: h.docker, container: "dup_two" }).Id, "cdcd8888dup");
  // A container given by name is still the repository's own.
  assert.throws(() => findContainer("sim", { docker: h.docker, container: "dup_two" }), new RegExp(`dup_two is the container of ${HOST}/dup, not of sim`));
  h.edit((cs) => delete cs[7].Config.Labels["devcontainer.local_folder"]);
  assert.throws(() => findContainer("dup", { docker: h.docker, container: "dup_two" }), /dup_two is the container of no clone, not of dup/);
});

test("no container, no label of its own, and not a repository's name each say what to do", (t) => {
  const h = host();
  t.after(h.done);
  assert.throws(() => findContainer("tutor", { docker: h.docker, hostname: "aaaa1111" }), new RegExp(`no container of tutor by devcontainer.local_folder=${HOST}/tutor: create it, or open ${HOST}/tutor in VS Code and «Reopen in Container» once`));
  h.edit((cs) => delete cs[0].Config.Labels["devcontainer.local_folder"]);
  assert.throws(() => ownFolder(h.docker, "aaaa1111"), /has no label devcontainer.local_folder: run in spec's orchestrator container, or name the repository's folder with --folder/);
  for (const name of ["..", "../sim", "Sim", ""]) assert.throws(() => findContainer(name, { docker: h.docker }), /not a repository's name/);
  assert.throws(() => findContainer("sim", { docker: h.docker, container: "nobody" }), /no container named nobody/);
  // docker gets no name or folder as the command line spells it.
  assert.throws(() => findContainer("sim", { docker: h.docker, container: "--format={{.Id}}" }), /no container named --format/);
  assert.ok(!h.dockerCalls().some((c) => c.includes("--format={{.Id}}")));
  for (const folder of ["sim", "/home/someone/projects/novatrail/../novatrail/sim", "/home/someone/projects/novatrail/learner-model"]) {
    assert.throws(() => findContainer("sim", { docker: h.docker, folder }), /--folder must be the absolute path of a clone named sim/);
  }
});

test("the place of a run: the clone's folder inside, and the volume of Claude Code, or an error", (t) => {
  const h = host();
  t.after(h.done);
  const place = placeOf(findContainer("sim", { docker: h.docker, hostname: "aaaa1111" }));
  assert.deepEqual(place, { id: "cccc3333sim", name: "jovial_cannon", folder: `${HOST}/sim`, workdir: path.join(h.root, "workspaces", "sim"), claude: h.volume });
  assert.throws(() => placeOf(findContainer("bare", { docker: h.docker, hostname: "aaaa1111" })), /bare_one: the volume novatrail-claude is not mounted/);
  const [sim] = inspect(["cccc3333sim"], h.docker);
  assert.throws(() => placeOf({ ...sim, Mounts: [] }), /jovial_cannon: no folder of the host's clone mounted/);
  assert.throws(() => placeOf({ ...sim, Config: {} }), /no folder of the host's clone mounted \(devcontainer.local_folder=none\)/);
  assert.deepEqual(inspect([], h.docker), []);
});

test("a stopped container is started and waited for; one that never runs is an error", (t) => {
  const h = host();
  t.after(h.done);
  const [sim] = inspect(["cccc3333sim"], h.docker);
  assert.equal(ensureRunning(sim, { docker: h.docker, sleep: () => {} }).State.Running, true);
  assert.ok(h.dockerCalls().some((c) => c[0] === "start" && c[1] === "cccc3333sim"));
  const [started] = inspect(["cccc3333sim"], h.docker);
  assert.equal(ensureRunning(started, { docker: h.docker, sleep: () => {} }), started, "a running one is left as it is");
  h.edit((cs) => {
    cs[1].stuck = true;
  });
  const [spec] = inspect(["bbbb2222spec"], h.docker);
  let slept = 0;
  assert.throws(() => ensureRunning(spec, { docker: h.docker, sleep: () => (slept += 1), tries: 3, pause: 10 }), /modest_lichterman: started, but not running after 0.03 s/);
  assert.equal(slept, 3);
});

test("docker that cannot start, that fails, or that runs past its time is an error with what it said", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docker-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // A program of its own, not a shell with -c: CodeQL would read every docker command line as a
  // shell's command then.
  const fake = path.join(dir, "docker");
  fs.writeFileSync(fake, '#!/bin/sh\n[ "$1" = slow ] && exec sleep 5\necho said >&2\nexit 3\n', { mode: 0o755 });
  assert.throws(() => runDocker(["ps"], { program: "/nonexistent/docker" }), /docker ps: spawnSync \/nonexistent\/docker ENOENT/);
  assert.throws(() => runDocker(["ps", "-a"], { program: fake }), /docker ps -a: said/);
  assert.throws(() => runDocker(["slow"], { program: fake, timeout: 100 }), /docker slow: no end in 0.1 s/);
});
