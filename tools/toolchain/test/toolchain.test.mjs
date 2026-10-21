// toolchain.sh run with a stand-in for docker that writes down what it was asked, in a repository
// and a runner's temporary directory whose paths hold the characters a shell reads as syntax: what
// the runner would build and run, argument by argument.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GIT } from "../../shared.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "toolchain.sh");
const justfile = path.join(here, "..", "..", "..", "justfile");
const awkward = 'a $HOME `id` "q" \\ b';
const user = `${process.getuid()}:${process.getgid()}`;

// A runner in a temporary directory: a docker that writes its arguments, NUL after each, and for
// build what it read; RUNNER_TEMP; and a repository with the script where `inSpec` puts it — in
// tools/ of spec itself, or in spec/tools/ of a repository with spec as its submodule.
function runner({ inSpec = false } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-")));
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  const log = path.join(root, "docker.log");
  fs.writeFileSync(
    path.join(bin, "docker"),
    '#!/bin/sh\nprintf \'%s\\0\' "$@" > "$DOCKER_LOG"\nif [ "$1" = build ]; then cat > "$DOCKER_LOG.stdin"; fi\n',
    { mode: 0o755 },
  );
  const temp = path.join(root, `temp ${awkward}`);
  fs.mkdirSync(temp);
  const repo = path.join(root, `repo ${awkward}`);
  const specDir = inSpec ? repo : path.join(repo, "spec");
  fs.mkdirSync(path.join(specDir, "tools", "toolchain"), { recursive: true });
  fs.copyFileSync(script, path.join(specDir, "tools", "toolchain", "toolchain.sh"));
  fs.mkdirSync(path.join(repo, ".devcontainer"));
  fs.writeFileSync(path.join(repo, ".devcontainer", "Dockerfile"), "FROM scratch AS toolchain\n");
  const relative = inSpec ? "tools/toolchain/toolchain.sh" : "spec/tools/toolchain/toolchain.sh";

  // The script run as a workflow step runs it: by its path from the repository's root, or from cwd.
  const toolchain = (args, { cwd = repo, env = {} } = {}) => {
    fs.rmSync(log, { force: true });
    const run = spawnSync("/bin/sh", [path.relative(cwd, path.join(repo, relative)), ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: temp, DOCKER_LOG: log, ...env },
    });
    const docker = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\0").slice(0, -1) : null;
    const stdin = fs.existsSync(`${log}.stdin`) ? fs.readFileSync(`${log}.stdin`, "utf8") : null;
    return { ...run, docker, stdin };
  };
  return { root, repo, temp, toolchain, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

// What docker run is given before the command.
const runPrefix = (repo, temp) => ["run", "--rm", "--user", user, "--env", "HOME=/tmp", "--volume", `${repo}:/work`, "--volume", `${temp}:${temp}:ro`, "--workdir", "/work", "novatrail-toolchain"];

test("build builds the toolchain stage of the repository's Dockerfile, without a context", () => {
  const r = runner();
  try {
    const built = r.toolchain(["build"]);
    assert.equal(built.status, 0, built.stderr);
    assert.deepEqual(built.docker, ["build", "--target", "toolchain", "--tag", "novatrail-toolchain", "-"]);
    assert.equal(built.stdin, "FROM scratch AS toolchain\n");
  } finally {
    r.done();
  }
});

test("run hands docker the paths as they are, whatever characters they hold", () => {
  const r = runner();
  try {
    const run = r.toolchain(["run", "just", "docs-check", `an argument ${awkward}`]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(run.docker, [...runPrefix(r.repo, r.temp), "just", "docs-check", `an argument ${awkward}`]);
  } finally {
    r.done();
  }
});

test("spec's recipes come from spec's justfile: spec/justfile in another repository, justfile in spec", () => {
  const other = runner();
  try {
    const version = other.toolchain(["spec", "release-version", "abc", ".github/workflows/self-release.yml"]);
    assert.equal(version.status, 0, version.stderr);
    assert.deepEqual(version.docker, [...runPrefix(other.repo, other.temp), "just", "-f", "spec/justfile", "release-version", "abc", ".github/workflows/self-release.yml"]);
    const probe = other.toolchain(["spec", "--dry-run", "release-refusal", "abc", "abc", `${other.temp}/release-create.err`]);
    assert.deepEqual(probe.docker.slice(-8), ["just", "-f", "spec/justfile", "--dry-run", "release-refusal", "abc", "abc", `${other.temp}/release-create.err`]);
    const licenses = other.toolchain(["spec", "licenses-check-repo", "package-lock.json"]);
    assert.deepEqual(licenses.docker.slice(-4), ["-f", "spec/justfile", "licenses-check-repo", "package-lock.json"]);
  } finally {
    other.done();
  }
  const spec = runner({ inSpec: true });
  try {
    const version = spec.toolchain(["spec", "release-version", "abc"]);
    assert.deepEqual(version.docker.slice(-5), ["just", "-f", "justfile", "release-version", "abc"]);
  } finally {
    spec.done();
  }
});

test("a path with a colon is refused: docker's --volume splits on it", () => {
  const r = runner();
  try {
    const stopped = r.toolchain(["run", "just"], { env: { RUNNER_TEMP: path.join(r.root, "a:b") } });
    assert.equal(stopped.status, 2, stopped.stderr);
    assert.match(stopped.stderr, /cannot mount a path with a colon/);
    assert.equal(stopped.docker, null);
  } finally {
    r.done();
  }
});

test("the script keeps its executable bit, in the tree and in git: workflows run it by its path", () => {
  assert.ok(fs.statSync(script).mode & 0o100, "toolchain.sh is not executable");
  const staged = spawnSync(GIT, ["-C", path.dirname(script), "ls-files", "--stage", "toolchain.sh"], { encoding: "utf8" });
  if (staged.status === 0 && staged.stdout) assert.match(staged.stdout, /^100755 /, "git keeps toolchain.sh as 100644");
});

test("it stops, and docker is never asked, off the repository's root, off a runner or when asked nothing it knows", () => {
  const r = runner();
  try {
    const sub = path.join(r.repo, "docs");
    fs.mkdirSync(sub);
    for (const [args, options, reason] of [
      [["spec", "release-version", "abc"], { cwd: sub }, /run it from the root of the repository/],
      [["build"], { cwd: sub }, /no \.devcontainer\/Dockerfile/],
      [["run", "just"], { env: { RUNNER_TEMP: "" } }, /RUNNER_TEMP is not set/],
      [["run"], {}, /run takes the command to run/],
      [["spec", "--dry-run"], {}, /spec takes the recipe to run/],
      [[], {}, /say what to do/],
      [["release"], {}, /release: not one of/],
    ]) {
      const stopped = r.toolchain(args, options);
      assert.equal(stopped.status, 2, `${args.join(" ")}: ${stopped.stderr}`);
      assert.match(stopped.stderr, reason);
      assert.equal(stopped.docker, null, `${args.join(" ")}: docker was asked`);
    }
  } finally {
    r.done();
  }
});

// What the probe asks of the toolchain's just, against spec's own justfile: a call with the
// arguments the publish step gives parses and runs nothing, and one with another number does not.
test("the dry run of release-refusal parses the call and runs nothing", () => {
  const just = process.env.JUST ?? "just";
  const parsed = spawnSync(just, ["-f", justfile, "--dry-run", "release-refusal", "HEAD", "HEAD", "/nonexistent/release-create.err"], { encoding: "utf8" });
  assert.equal(parsed.status, 0, parsed.stderr);
  const short = spawnSync(just, ["-f", justfile, "--dry-run", "release-refusal", "HEAD", "HEAD"], { encoding: "utf8" });
  assert.notEqual(short.status, 0);
  assert.match(short.stderr, /release-refusal/);
});
