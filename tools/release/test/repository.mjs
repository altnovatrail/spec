// What the tests of tools/release share: spec's justfile and the just to run it, and made-up
// repositories to run its recipes in.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GIT } from "../../shared.mjs";

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const justfile = path.join(root, "justfile");
// The just that runs these tests, which `just release-version-test` passes on; or else the one
// .devcontainer/Dockerfile installs, for `node --test` run by hand.
export const JUST = process.env.JUST ?? "/usr/local/bin/just";

// The environment of the tests, without a line of its own: spec's line is then release.yml's.
export const env = { ...process.env };
delete env.RELEASE_LINE;

// git to run in a made-up repository as a fresh machine has it: no one's global or system
// settings, such as signed tags, and no GIT_ variable from whatever runs the tests pointing it
// elsewhere.
export const isolated = Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith("GIT_")));
Object.assign(isolated, { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" });

// A made-up repository with main as its branch, and git to run in it.
export function scratchRepository(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const git = (...args) => {
    const result = spawnSync(GIT, ["-C", dir, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", ...args], {
      encoding: "utf8",
      env: isolated,
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("-c", "init.defaultBranch=main", "init", "--quiet");
  return { dir, git };
}

// A recipe, release-version unless named, run from dir: through the given justfile flags, with
// its arguments, and with RELEASE_LINE set in the shell or, when line is null, not.
export function recipe(dir, { name = "release-version", justfileFlags = [], args = [], line = null } = {}) {
  const lineEnv = line === null ? {} : { RELEASE_LINE: line };
  return spawnSync(JUST, [...justfileFlags, name, ...args], { cwd: dir, encoding: "utf8", env: { ...isolated, ...lineEnv } });
}

// A file of a made-up repository, written and staged.
export function writeFile(dir, git, file, text) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
  git("add", "--all");
}

// spec as far as its release recipes go, copied into a made-up repository: its justfile and the
// release tools. Staged, not committed.
export function copySpecTools(dir, git) {
  const files = ["justfile", "tools/shared.mjs", "tools/release/version.mjs", "tools/release/line.mjs", "tools/release/files.mjs", "tools/release/format-line.mjs"];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  git("add", "--all");
}

// The line spec's release.yml sets, written into a made-up repository and staged.
export function releaseLine(dir, git, line) {
  writeFile(dir, git, ".github/workflows/release.yml", `env:\n  RELEASE_LINE: "${line}"\n`);
}
