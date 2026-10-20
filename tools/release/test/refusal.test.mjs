// release-refusal run in a made-up repository with workflows of its own: which refusals of the
// Releases API it lets pass, and why it stops the others.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { justfile, recipe, scratchRepository, writeFile } from "./repository.mjs";

test("release-refusal passes only the documented refusal: an older commit of main that adds or modifies a workflow, 404 or 403", () => {
  const { dir, git } = scratchRepository("release-refusal-");
  try {
    // first and tip have the same workflows; changed modifies ci.yml; lacking has no new.yml,
    // which tip adds — a file only deleted relative to the tip is no addition or modification.
    writeFile(dir, git, ".github/workflows/ci.yml", "name: CI\n");
    git("commit", "--quiet", "-m", "first");
    const first = git("rev-parse", "HEAD");
    writeFile(dir, git, ".github/workflows/ci.yml", "name: CI, changed\n");
    git("commit", "--quiet", "-m", "change a workflow");
    const changed = git("rev-parse", "HEAD");
    writeFile(dir, git, ".github/workflows/ci.yml", "name: CI\n");
    git("commit", "--quiet", "-m", "change it back");
    const lacking = git("rev-parse", "HEAD");
    writeFile(dir, git, ".github/workflows/new.yml", "name: New\n");
    git("commit", "--quiet", "-m", "add a workflow");
    const tip = git("rev-parse", "HEAD");
    // A commit off main, on a branch, that changes a workflow: the tip's release covers none of it.
    git("switch", "--quiet", "-c", "side", first);
    writeFile(dir, git, ".github/workflows/ci.yml", "name: CI, on a branch\n");
    git("commit", "--quiet", "-m", "a branch's workflow");
    const side = git("rev-parse", "HEAD");
    git("switch", "--quiet", "main");

    const error = (text) => {
      const file = path.join(dir, ".git", "release-create.err");
      fs.writeFileSync(file, text);
      return file;
    };
    const run = (commit, errorText) => recipe(dir, { name: "release-refusal", justfileFlags: ["-f", justfile], args: [commit, tip, error(errorText)] });

    for (const text of ["HTTP 404: Not Found (https://api.github.com/repos/o/r/releases)\n", "HTTP 403: Resource not accessible by integration\n"]) {
      const passed = run(changed, text);
      assert.equal(passed.status, 0, passed.stderr);
      assert.match(passed.stdout, /is no longer the tip of main .* and adds or modifies its workflow files/);
    }
    for (const [commit, text, reason] of [
      [tip, "HTTP 404: Not Found\n", /is the tip of main/],
      [side, "HTTP 404: Not Found\n", /is not in the history of/],
      [first, "HTTP 404: Not Found\n", /adds or modifies no file under \.github\/workflows\//],
      [lacking, "HTTP 404: Not Found\n", /adds or modifies no file under \.github\/workflows\//],
      [changed, "HTTP 403: Forbidden\n", /neither HTTP 404 nor/],
      [changed, "HTTP 422: Validation Failed\n", /neither HTTP 404 nor/],
    ]) {
      const refused = run(commit, text);
      assert.equal(refused.status, 1, `${commit}: ${refused.stdout}`);
      assert.match(refused.stderr, reason);
    }
    const unread = recipe(dir, { name: "release-refusal", justfileFlags: ["-f", justfile], args: [changed, tip, path.join(dir, "no-such.err")] });
    assert.equal(unread.status, 1);
    assert.match(unread.stderr, /cannot be read/);
    assert.notEqual(recipe(dir, { name: "release-refusal", justfileFlags: ["-f", justfile], args: ["no-such-commit", tip, error("HTTP 404\n")] }).status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
