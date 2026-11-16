// spec's second devcontainer, the orchestrator's (R156): its configuration is spec's own but for
// what the host's Docker asks, its stage ends the Dockerfile, and docker-group.sh, which runs on the
// host, leaves the number of the socket's group where the stage copies it from.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseJsonc } from "../../new-repo/devcontainer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const devcontainer = path.join(here, "..", "..", "..", ".devcontainer");
const read = (file) => fs.readFileSync(path.join(devcontainer, file), "utf8");
const SOCKET = "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind";

test("the orchestrator's configuration is spec's, with the host's Docker and no name in the network", () => {
  const spec = parseJsonc(read("devcontainer.json"));
  const orchestrator = parseJsonc(read("orchestrator/devcontainer.json"));
  assert.equal(orchestrator.name, "NovaTrail orchestrator");
  assert.deepEqual(orchestrator.build, { dockerfile: "../Dockerfile", target: "orchestrator", context: ".." });
  assert.deepEqual(spec.build, { dockerfile: "Dockerfile", target: "devcontainer", context: "." });
  assert.equal(orchestrator.initializeCommand, `${spec.initializeCommand} && bash .devcontainer/orchestrator/docker-group.sh`);
  assert.deepEqual(orchestrator.runArgs, spec.runArgs.filter((arg) => !arg.startsWith("--network-alias=")));
  assert.deepEqual(orchestrator.mounts, [...spec.mounts, SOCKET]);
  // Everything else — the user, the environment, the extensions at their versions, the settings
  // — is spec's container's, so that a raise there is a raise here.
  const rest = ({ name: _n, build: _b, initializeCommand: _i, runArgs: _r, mounts: _m, ...others }) => others;
  assert.deepEqual(rest(orchestrator), rest(spec));
});

test("the orchestrator's stage ends the Dockerfile: the devcontainer with the client of Docker, checked by its sum", () => {
  const dockerfile = read("Dockerfile");
  const stages = [...dockerfile.matchAll(/^FROM (\S+)(?: AS (\S+))?$/gm)].map((m) => m.slice(1, 3));
  assert.deepEqual(stages.slice(1), [
    ["toolchain", "devcontainer"],
    ["devcontainer", "orchestrator"],
  ]);
  const stage = dockerfile.slice(dockerfile.indexOf("FROM devcontainer AS orchestrator"));
  assert.match(stage, /^ARG DOCKER_VERSION=\d+\.\d+\.\d+$/m);
  for (const arch of ["AMD64", "ARM64"]) assert.match(stage, new RegExp(`^ARG DOCKER_SHA256_${arch}=[0-9a-f]{64}$`, "m"));
  assert.match(stage, /sha256sum --check --strict -/);
  // The client alone, of the archive's binaries (R12).
  assert.match(stage, /-xzf "\$workdir\/docker-\$\{DOCKER_VERSION\}-\$\{gnu_arch\}\.tgz" docker\/docker;/);
  assert.match(stage, /^COPY orchestrator\/ \/tmp\/orchestrator\/$/m);
  assert.ok(stage.trimEnd().endsWith("\nUSER vscode"), "the image is left to vscode");
});

// The step of the stage that gives vscode the socket's group, run as the build runs it, with its
// folder in a temporary directory and a getent, groupadd and usermod that write down what they are
// asked: getent knows 999 as systemd-journal's, as the base image does, and answers 2 for any other
// number. { status, stdout, stderr, calls }.
function groupStep(gid) {
  const stage = read("Dockerfile").slice(read("Dockerfile").indexOf("FROM devcontainer AS orchestrator"));
  const step = stage.slice(stage.indexOf("\nCOPY orchestrator/ /tmp/orchestrator/\nRUN ") + "\nCOPY orchestrator/ /tmp/orchestrator/\nRUN ".length);
  const script = step.slice(0, step.indexOf("\n\n")).replaceAll("\\\n", "\n");
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-step-")));
  try {
    const folder = path.join(dir, "orchestrator");
    fs.mkdirSync(folder);
    if (gid !== undefined) fs.writeFileSync(path.join(folder, "docker-gid"), `${gid}\n`);
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    const calls = path.join(dir, "calls");
    fs.writeFileSync(path.join(bin, "getent"), `#!/bin/sh\nif [ "$2" = 999 ]; then echo systemd-journal:x:999:; else exit 2; fi\n`, { mode: 0o755 });
    for (const tool of ["groupadd", "usermod"]) fs.writeFileSync(path.join(bin, tool), `#!/bin/sh\necho "${tool} $*" >> "${calls}"\n`, { mode: 0o755 });
    // The step names the folder outside quotes only, so a variable stands in for it, and the
    // temporary path reaches bash by the environment rather than in the script's text.
    // stdin is /dev/null: Node gives a child a socket, and Ubuntu's bash with a socket on stdin and no
    // SHLVL, as in CI's container, takes itself for rsh's and reads /etc/bash.bashrc.
    const result = spawnSync("bash", ["-euo", "pipefail", "-c", script.replaceAll("/tmp/orchestrator", '"$ORCHESTRATOR_FOLDER"')], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ORCHESTRATOR_FOLDER: folder },
    });
    assert.ok(!fs.existsSync(folder), "the step leaves no copy of the folder in the image");
    return { ...result, calls: fs.existsSync(calls) ? fs.readFileSync(calls, "utf8") : "" };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the stage gives vscode the group of the number docker-gid holds: a new one, or the image's own", () => {
  const added = groupStep(4242);
  assert.equal(added.status, 0, added.stderr);
  assert.equal(added.calls, "groupadd --gid 4242 docker-host\nusermod --append --groups docker-host vscode\n");
  const known = groupStep(999);
  assert.equal(known.status, 0, known.stderr);
  assert.equal(known.calls, "usermod --append --groups systemd-journal vscode\n");
  for (const wrong of ["abc", ""]) {
    const result = groupStep(wrong);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `orchestrator/docker-gid holds no group number: ${wrong}\n`);
    assert.equal(result.calls, "");
  }
});

// Docker's legacy builder builds every stage before the target, and the Dev Containers CLI's
// target follows the end of the Dockerfile: spec's ordinary configuration builds this stage too,
// and its initializeCommand writes no docker-gid.
test("the stage builds without docker-gid, as the ordinary configuration builds it on a host without buildx", () => {
  const result = groupStep(undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "orchestrator/docker-gid is not in the context: vscode joins no group of the Docker socket\n");
  assert.equal(result.calls, "");
});

// docker-group.sh copied into a folder of its own, since it writes beside itself, and run there,
// with a uname that answers `system`.
function groupScript(system = "Linux") {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-")));
  const script = path.join(dir, "docker-group.sh");
  fs.copyFileSync(path.join(devcontainer, "orchestrator", "docker-group.sh"), script);
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "uname"), `#!/bin/sh\necho ${system}\n`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const run = (...args) => spawnSync("bash", [script, ...args], { encoding: "utf8", env });
  return { dir, run, gid: path.join(dir, "docker-gid") };
}

// A socket listening at a path of the folder, as the host's Docker has its own.
async function listen(socket) {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(socket, resolve));
  return server;
}

test("docker-group.sh leaves the number of the socket's group beside itself, through a link too", async () => {
  const { dir, run, gid } = groupScript();
  const socket = path.join(dir, "docker.sock");
  const server = await listen(socket);
  try {
    const link = path.join(dir, "linked.sock");
    fs.symlinkSync(socket, link);
    const group = fs.statSync(socket).gid;
    for (const where of [socket, link]) {
      const result = run(where);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(gid, "utf8"), `${group}\n`);
      assert.equal(result.stdout, `docker socket ${where}: group ${group}\n`);
      assert.equal(result.stderr, "", "the same number again is no change");
    }
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("docker-group.sh says to rebuild when the socket's group is no longer the one the image was built with", async () => {
  const { dir, run, gid } = groupScript();
  const socket = path.join(dir, "docker.sock");
  const server = await listen(socket);
  try {
    const group = fs.statSync(socket).gid;
    fs.writeFileSync(gid, `${group + 1}\n`);
    const result = run(socket);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, `docker-group.sh: the socket's group was ${group + 1} and is ${group} now: rebuild the orchestrator's container (Dev Containers: Rebuild Container)\n`);
    assert.equal(fs.readFileSync(gid, "utf8"), `${group}\n`);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("docker-group.sh stops off Linux, where Docker's socket is a virtual machine's", async () => {
  const { dir, run, gid } = groupScript("Darwin");
  const socket = path.join(dir, "docker.sock");
  const server = await listen(socket);
  try {
    const result = run(socket);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "docker-group.sh: the orchestrator's container needs Docker on a Linux host, not Darwin\n");
    assert.ok(!fs.existsSync(gid), "no number is written");
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("docker-group.sh stops on a path that is no socket, and writes nothing", () => {
  const { dir, run, gid } = groupScript();
  try {
    const file = path.join(dir, "not-a-socket");
    fs.writeFileSync(file, "");
    for (const where of [file, path.join(dir, "missing.sock")]) {
      const result = run(where);
      assert.equal(result.status, 1);
      assert.equal(result.stderr, `docker-group.sh: ${where} is no socket: the orchestrator's container needs the host's Docker there\n`);
      assert.ok(!fs.existsSync(gid), "no number is written");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
