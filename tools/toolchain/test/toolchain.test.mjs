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

// A runner in a temporary directory: a docker that writes down each call — its arguments, NUL after
// each, and a record separator after the call — and for build what it read; that answers each
// subcommand with the code DOCKER_EXIT_<subcommand> names, 0 by default, and on a save that
// succeeds writes the file; RUNNER_TEMP; and a repository with the script where `inSpec` puts it —
// in tools/ of spec itself, or in spec/tools/ of a repository with spec as its submodule.
function runner({ inSpec = false } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-")));
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  const log = path.join(root, "docker.log");
  fs.writeFileSync(
    path.join(bin, "docker"),
    [
      "#!/bin/sh",
      'printf \'%s\\0\' "$@" >> "$DOCKER_LOG"',
      "printf '\\036' >> \"$DOCKER_LOG\"",
      'if [ "$1" = build ]; then cat > "$DOCKER_LOG.stdin"; fi',
      'eval "code=\\${DOCKER_EXIT_$1:-0}"',
      'if [ "$1" = save ] && [ "$code" = 0 ]; then echo image > "$3"; fi',
      'if [ "$1" = save ] && [ "$code" != 0 ]; then echo half > "$3"; fi',
      'exit "$code"',
      "",
    ].join("\n"),
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
    fs.rmSync(`${log}.stdin`, { force: true });
    const run = spawnSync("/bin/sh", [path.relative(cwd, path.join(repo, relative)), ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: temp, DOCKER_LOG: log, ...env },
    });
    const calls = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\x1e").slice(0, -1).map((call) => call.split("\0").slice(0, -1)) : [];
    const stdin = fs.existsSync(`${log}.stdin`) ? fs.readFileSync(`${log}.stdin`, "utf8") : null;
    // `docker` is the first call, or null when docker was never asked.
    return { ...run, calls, docker: calls[0] ?? null, stdin };
  };
  return { root, repo, temp, toolchain, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

// What docker run is given before the command.
const runPrefix = (repo, temp) => ["run", "--rm", "--user", user, "--env", "HOME=/tmp", "--volume", `${repo}:/work`, "--volume", `${temp}:${temp}:ro`, "--workdir", "/work", "novatrail-toolchain"];

const BUILD = ["build", "--target", "toolchain", "--tag", "novatrail-toolchain", "-"];

test("build builds the toolchain stage of the repository's Dockerfile, without a context", () => {
  const r = runner();
  try {
    const built = r.toolchain(["build"]);
    assert.equal(built.status, 0, built.stderr);
    assert.deepEqual(built.calls, [BUILD]);
    assert.equal(built.stdin, "FROM scratch AS toolchain\n");
    // An empty TOOLCHAIN_IMAGE_FILE is none: no cache, as a release builds.
    const empty = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: "" } });
    assert.equal(empty.status, 0, empty.stderr);
    assert.deepEqual(empty.calls, [BUILD]);
    const failed = r.toolchain(["build"], { env: { DOCKER_EXIT_build: "7" } });
    assert.equal(failed.status, 7);
  } finally {
    r.done();
  }
});

// The file of the image, in the runner's temporary directory, by a path whose characters a shell
// reads as syntax.
const imageFile = (r) => path.join(r.temp, `toolchain ${awkward}.tar`);
const LOAD = (file) => ["load", "--quiet", "--input", file];
const INSPECT = ["image", "inspect", "novatrail-toolchain"];
const SAVE = (file) => ["save", "--output", file, "novatrail-toolchain"];

test("with TOOLCHAIN_IMAGE_FILE, a file that is there is loaded and removed, and nothing is built", () => {
  const r = runner();
  try {
    const file = imageFile(r);
    fs.writeFileSync(file, "image");
    const hit = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: file } });
    assert.equal(hit.status, 0, hit.stderr);
    assert.deepEqual(hit.calls, [LOAD(file), INSPECT]);
    assert.equal(fs.existsSync(file), false);
    assert.doesNotMatch(hit.stdout, /::warning::/);
  } finally {
    r.done();
  }
});

test("a file that does not load, or gives no novatrail-toolchain, is removed and the stage is built, with no file written", () => {
  const r = runner();
  try {
    const file = imageFile(r);
    for (const [env, calls] of [
      [{ DOCKER_EXIT_load: "1" }, [LOAD(file), BUILD]],
      [{ DOCKER_EXIT_image: "1" }, [LOAD(file), INSPECT, BUILD]],
    ]) {
      fs.writeFileSync(file, "image");
      const broken = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: file, ...env } });
      assert.equal(broken.status, 0, broken.stderr);
      assert.deepEqual(broken.calls, calls);
      assert.match(broken.stdout, /^::warning::toolchain\.sh: the file of TOOLCHAIN_IMAGE_FILE did not give the image novatrail-toolchain, so it is built\. The cache entry .* delete it, or it is hit again$/m);
      assert.ok(broken.stderr.includes(file), "the path is not named");
      assert.ok(!broken.stdout.includes(awkward), "the path is in a workflow command");
      assert.equal(fs.existsSync(file), false, "a broken file stays, or one was written");
    }
    fs.writeFileSync(file, "image");
    const failed = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: file, DOCKER_EXIT_load: "1", DOCKER_EXIT_build: "3" } });
    assert.equal(failed.status, 3);
  } finally {
    r.done();
  }
});

test("with no file there, the stage is built and saved to it; a save that fails leaves a warning and no file", () => {
  const r = runner();
  try {
    const file = imageFile(r);
    const miss = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: file } });
    assert.equal(miss.status, 0, miss.stderr);
    assert.deepEqual(miss.calls, [BUILD, SAVE(file)]);
    assert.equal(fs.readFileSync(file, "utf8"), "image\n");
    assert.doesNotMatch(miss.stdout, /::warning::/);
    fs.rmSync(file);
    const unsaved = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: file, DOCKER_EXIT_save: "1" } });
    assert.equal(unsaved.status, 0, unsaved.stderr);
    assert.deepEqual(unsaved.calls, [BUILD, SAVE(file)]);
    assert.match(unsaved.stdout, /^::warning::toolchain\.sh: docker save could not write the file of TOOLCHAIN_IMAGE_FILE; the image is built, but not cached$/m);
    assert.ok(unsaved.stderr.includes(file), "the path is not named");
    assert.equal(fs.existsSync(file), false, "a half-written file stays");
    const failed = r.toolchain(["build"], { env: { TOOLCHAIN_IMAGE_FILE: file, DOCKER_EXIT_build: "5" } });
    assert.equal(failed.status, 5);
    assert.deepEqual(failed.calls, [BUILD]);
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
