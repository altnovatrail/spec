// What release-verify reads from GitHub through git, read here from made-up repositories through
// file://: the commit of a tag, the release tags, and the history of main.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { GIT } from "../../shared.mjs";
import { GITHUB, gitEnvironment, github } from "../github.mjs";
import { isolated, scratchRepository } from "./repository.mjs";

// A made-up organization: a folder of bare repositories that serve partial clones, as GitHub's
// do. .github's main has three commits; v0.1.0 is a light tag, v0.1.1 an annotated one, and
// v1.0.0-rc.1 no release. A commit off main has a branch whose name ends like a tag's.
function organization() {
  const { dir, git } = scratchRepository("release-verify-github-");
  const commit = (message) => {
    git("commit", "--quiet", "--allow-empty", "-m", message);
    return git("rev-parse", "HEAD");
  };
  const first = commit("first");
  git("tag", "v0.1.0");
  const second = commit("second");
  git("tag", "-a", "-m", "release", "v0.1.1");
  const third = commit("third");
  git("tag", "v1.0.0-rc.1");
  git("switch", "--quiet", "-c", "x/refs/tags/v9.9.9", first);
  const side = commit("side");
  git("tag", "v0.2.0");
  git("switch", "--quiet", "main");
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-organization-"));
  const bare = path.join(base, ".github");
  const cloned = spawnSync(GIT, ["clone", "--quiet", "--bare", "--no-local", dir, bare], { encoding: "utf8", env: isolated });
  assert.equal(cloned.status, 0, cloned.stderr);
  spawnSync(GIT, ["--git-dir", bare, "config", "uploadpack.allowFilter", "true"], { env: isolated });
  const tagObject = git("rev-parse", "v0.1.1");
  fs.rmSync(dir, { recursive: true, force: true });
  return { base, url: `${pathToFileURL(base).href}/`, first, second, third, side, tagObject };
}

test("the commit of a tag: a light tag's, an annotated tag's commit rather than the tag, and none for a branch or a missing tag", () => {
  const made = organization();
  const reader = github(made.url);
  try {
    assert.equal(reader.tagCommit(".github", "v0.1.0"), made.first);
    assert.equal(reader.tagCommit(".github", "v0.1.1"), made.second);
    assert.notEqual(made.tagObject, made.second);
    // ls-remote matches refs/tags/v9.9.9 against the branch refs/heads/x/refs/tags/v9.9.9 too.
    assert.equal(reader.tagCommit(".github", "v9.9.9"), undefined);
    assert.equal(reader.tagCommit(".github", "v0.3.0"), undefined);
    for (const tag of ["v1.0.0-rc.1", "main", "*", "--upload-pack=x"]) assert.throws(() => reader.tagCommit(".github", tag), /is no release tag/, tag);
    assert.throws(() => reader.tagCommit("no-such-repository", "v0.1.0"), /git ls-remote .*no-such-repository failed/);
  } finally {
    reader.close();
    fs.rmSync(made.base, { recursive: true, force: true });
  }
});

test("the release tags: each commit a release tag names, with its tags, and no branch and no pre-release", () => {
  const made = organization();
  const reader = github(made.url);
  try {
    assert.deepEqual(reader.releaseTags(".github"), new Map([[made.first, ["v0.1.0"]], [made.second, ["v0.1.1"]], [made.side, ["v0.2.0"]]]));
  } finally {
    reader.close();
    fs.rmSync(made.base, { recursive: true, force: true });
  }
});

test("the history of main: what lies on it, in which order, and a commit off main is in no history of it", () => {
  const made = organization();
  const reader = github(made.url);
  try {
    assert.equal(reader.onMain(".github", made.first), true);
    assert.equal(reader.onMain(".github", made.third), true);
    assert.equal(reader.onMain(".github", made.side), false);
    assert.equal(reader.isAncestor(".github", made.first, made.second), true);
    assert.equal(reader.isAncestor(".github", made.second, made.second), true);
    assert.equal(reader.isAncestor(".github", made.second, made.first), false);
    assert.equal(reader.isAncestor(".github", made.first, made.side), false);
    assert.equal(reader.isAncestor(".github", "0".repeat(40), made.third), false);
    for (const name of ["main", "--all", made.first.slice(0, 7)]) assert.throws(() => reader.isAncestor(".github", name, made.first), /is no commit's SHA/, name);
    assert.throws(() => reader.onMain("no-such-repository", made.first), /the history of main of .*no-such-repository could not be fetched/);
  } finally {
    reader.close();
    fs.rmSync(made.base, { recursive: true, force: true });
  }
});

test("git runs with none of the caller's settings, and close() leaves nothing behind", () => {
  const made = organization();
  const saved = { ...process.env };
  // The caller's git would send every address of the organization to a folder that is not there.
  Object.assign(process.env, {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `url.file:///nowhere/.insteadOf`,
    GIT_CONFIG_VALUE_0: made.url,
    GIT_DIR: "/nowhere",
  });
  let reader;
  try {
    reader = github(made.url);
    assert.equal(reader.tagCommit(".github", "v0.1.0"), made.first);
    assert.equal(reader.onMain(".github", made.second), true);
  } finally {
    process.env = saved;
    reader?.close();
    fs.rmSync(made.base, { recursive: true, force: true });
  }
  const environment = gitEnvironment("/tmp/work", { PATH: "/usr/bin", GIT_SSH_COMMAND: "x", GIT_CONFIG_PARAMETERS: "'a.b=c'" });
  assert.deepEqual(environment, {
    PATH: "/usr/bin",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_CEILING_DIRECTORIES: "/tmp",
  });
  assert.equal(GITHUB, "https://github.com/altnovatrail/");
  const fetched = github(made.url);
  assert.equal(fs.existsSync(fetched.work), true);
  fetched.close();
  assert.equal(fs.existsSync(fetched.work), false);
});
