// What release-verify reads from GitHub, through git and with no token (R77): the commit a tag of
// a repository names, the release tags of a repository, and the history of its main.
//
// git runs as a fresh machine has it, and nowhere near the caller's repository: no GIT_ variable
// of the caller's, no global or system settings, and an empty folder of its own as its working
// directory, above which it looks for no repository. A caller's settings could otherwise point
// github.com elsewhere (url.<base>.insteadOf), and the .git/config of a checkout holds the token
// actions/checkout writes there (http.<url>.extraheader). Nothing prompts for a password, and a
// partial clone fetches no object it lacks: a commit that is not on main stays unknown.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GIT } from "../shared.mjs";
import { RELEASE_TAG } from "./version.mjs";

export const GITHUB = "https://github.com/altnovatrail/";
const SHA = /^[0-9a-f]{40}$/;
const TAG_REF = /^refs\/tags\/(.+?)(\^\{\})?$/;
// A remote that takes the connection and then stalls is a failure, not a CI job that hangs.
const TIMEOUT = 120_000;

// The environment git runs in: the caller's without its GIT_ variables, and ours.
export function gitEnvironment(work, from = process.env) {
  const environment = Object.fromEntries(Object.entries(from).filter(([name]) => !name.startsWith("GIT_")));
  return {
    ...environment,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_CEILING_DIRECTORIES: path.dirname(work),
  };
}

// GitHub as git reads it, at base, the organization's address; tests give a file:// folder of
// made-up repositories instead. close() removes what it fetched.
export function github(base = GITHUB) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-git-"));
  const environment = gitEnvironment(work);
  const histories = new Map();
  // What ls-remote said, by its arguments: a lock file's packages ask about .github's tags each.
  const listings = new Map();
  const git = (args) => spawnSync(GIT, args, { cwd: work, env: environment, encoding: "utf8", timeout: TIMEOUT });
  const address = (repository) => `${base}${repository}`;

  // The release tags ls-remote lists with these arguments, each by its commit, asked once.
  function tagRefs(repository, args) {
    const key = args.join("\n");
    if (!listings.has(key)) listings.set(key, listRefs(repository, args));
    return listings.get(key);
  }

  // ls-remote matches a pattern against the end of a ref's name: refs/tags/v1 matches a branch
  // refs/heads/x/refs/tags/v1 as well. So only the lines whose names are wanted exactly count.
  function listRefs(repository, args) {
    const listed = git(["ls-remote", ...args]);
    if (listed.status !== 0) throw new Error(`git ls-remote ${address(repository)} failed: ${(listed.stderr || listed.error?.message || "").trim()}`);
    const direct = new Map();
    const peeled = new Map();
    for (const line of listed.stdout.split("\n").filter(Boolean)) {
      const [sha, name] = line.split("\t");
      const match = TAG_REF.exec(name ?? "");
      if (!match || !SHA.test(sha) || !RELEASE_TAG.test(match[1])) continue;
      (match[2] ? peeled : direct).set(match[1], sha);
    }
    // An annotated tag's own line names the tag object; the commit is the line ^{} names.
    return new Map([...direct.keys()].map((tag) => [tag, peeled.get(tag) ?? direct.get(tag)]));
  }

  // The bare history of main alone: commits without their trees, fetched once.
  function history(repository) {
    if (!histories.has(repository)) {
      const dir = path.join(work, `${histories.size}.git`);
      const cloned = git(["clone", "--bare", "--quiet", "--filter=tree:0", "--single-branch", "--branch", "main", "--no-tags", address(repository), dir]);
      if (cloned.status !== 0) throw new Error(`the history of main of ${address(repository)} could not be fetched: ${(cloned.stderr || cloned.error?.message || "").trim()}`);
      histories.set(repository, dir);
    }
    return histories.get(repository);
  }

  return {
    // The folder git fetches into, which close() removes.
    work,
    // The commit of the release tag, or undefined when the repository has no such tag. Naming
    // the tag's ^{} too is what makes ls-remote print the commit of an annotated tag.
    tagCommit(repository, tag) {
      if (!RELEASE_TAG.test(tag)) throw new Error(`'${tag}' is no release tag, vMAJOR.MINOR.PATCH`);
      return tagRefs(repository, [address(repository), `refs/tags/${tag}`, `refs/tags/${tag}^{}`]).get(tag);
    },
    // Each commit that a release tag names, with the tags that name it.
    releaseTags(repository) {
      const commits = new Map();
      for (const [tag, sha] of tagRefs(repository, ["--tags", address(repository)])) commits.set(sha, [...(commits.get(sha) ?? []), tag]);
      return commits;
    },
    // Whether ancestor is commit or lies in its history, both on main. A commit main does not
    // hold is unknown to the history, and so is in no history of it.
    isAncestor(repository, ancestor, commit) {
      for (const name of [ancestor, commit]) if (!SHA.test(name) && name !== "HEAD") throw new Error(`'${name}' is no commit's SHA`);
      return git(["--git-dir", history(repository), "merge-base", "--is-ancestor", ancestor, commit]).status === 0;
    },
    onMain(repository, commit) {
      return this.isAncestor(repository, commit, "HEAD");
    },
    close() {
      fs.rmSync(work, { recursive: true, force: true });
    },
  };
}
