// Each test builds a copy in a temporary directory — from spec's working tree, or from a small
// stand-in for spec made for the test — and looks at what new-repo built or new-repo-check said.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { newRepo } from "../new-repo.mjs";
import { checkRepo } from "../check.mjs";
import { parseJsonc } from "../devcontainer.mjs";
import { FILL, PLACEHOLDER, walk } from "../copy.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const specRoot = path.resolve(here, "../../..");

// The stand-in for spec is a local repository, which git refuses as a submodule unless told.
process.env.GIT_CONFIG_COUNT = "1";
process.env.GIT_CONFIG_KEY_0 = "protocol.file.allow";
process.env.GIT_CONFIG_VALUE_0 = "always";

const made = [];
after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function temporary() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "new-repo-test-"));
  made.push(dir);
  return dir;
}

const read = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");
const devcontainer = (dir) => parseJsonc(read(dir, ".devcontainer/devcontainer.json"));
const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const commitAll = (dir, message) => {
  git(dir, "add", "--all");
  git(dir, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", message);
};

// A draft copy, built from spec's working tree, or from another root given as `from`.
function draft(name, kind, card, from = specRoot) {
  const dest = path.join(temporary(), name);
  newRepo({ specRoot: from, name, kind, card, dest, draft: "v0.0.0-test", date: "2026-01-02" });
  return dest;
}

// A stand-in for spec: what new-repo reads from it, changed for the test, committed and tagged
// when asked.
function standIn({ change = () => {}, commit = false, tag = null } = {}) {
  const root = temporary();
  for (const source of ["repo-template", "LICENSE", "AGENTS.md", ".devcontainer", "docs/architecture.md"]) {
    fs.mkdirSync(path.dirname(path.join(root, source)), { recursive: true });
    fs.cpSync(path.join(specRoot, source), path.join(root, source), { recursive: true, verbatimSymlinks: true });
  }
  change(root);
  if (commit || tag) {
    git(root, "init", "--quiet", "--initial-branch=main");
    commitAll(root, "stand-in");
    if (tag) git(root, "tag", tag);
  }
  return root;
}

// Every FILL marker written: in its place, a sentence.
function fill(dir) {
  for (const file of walk(dir)) {
    const text = read(dir, file);
    if (text.match(FILL)) fs.writeFileSync(path.join(dir, file), text.replace(/<!--\s*FILL:[\s\S]*?-->/g, "Written from the card."));
  }
}

function change(dir, file, from, to) {
  const text = read(dir, file);
  assert.ok(text.includes(from), `${file} has no "${from}"`);
  fs.writeFileSync(path.join(dir, file), text.replace(from, to));
}

const messages = (dir, root = specRoot) => checkRepo({ dir, specRoot: root }).map((e) => `${e.file}:${e.line}: ${e.message}`);

const EXPECTED_FILES = [
  ".claude/settings.json",
  ".devcontainer/Dockerfile",
  ".devcontainer/devcontainer.json",
  ".devcontainer/host-network.sh",
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE",
  "README.md",
  "RUN.md",
  "docs/architecture.md",
  "docs/decisions.md",
];

test("a draft of each kind holds the whole template, its values filled in", () => {
  for (const [name, kind, card] of [
    ["modules", "docs", "3.10"],
    ["learner-model", "go", "3.8"],
    ["canvas", "typescript", "3.2"],
  ]) {
    const dir = draft(name, kind, card);
    assert.deepEqual(walk(dir), EXPECTED_FILES);
    for (const file of EXPECTED_FILES) assert.equal(read(dir, file).match(PLACEHOLDER), null, `${name}: ${file} keeps a placeholder`);
    assert.match(read(dir, "README.md"), new RegExp(`^# ${name}\n`));
    assert.match(read(dir, "CLAUDE.md"), new RegExp(`architecture ${card.replace(".", "\\.")} spec`));
    assert.match(read(dir, "docs/decisions.md"), /заведён 2026-01-02 из заготовки `spec` v0\.0\.0-test/);
    for (const file of ["README.md", "CLAUDE.md", "RUN.md", "docs/architecture.md"]) assert.ok(read(dir, file).match(FILL), `${name}: ${file} has no FILL`);
    for (const file of ["LICENSE", "AGENTS.md"]) assert.equal(read(dir, file), read(specRoot, file), `${name}: ${file} is not spec's`);
    assert.ok(fs.statSync(path.join(dir, ".devcontainer/host-network.sh")).mode & 0o100, "host-network.sh lost its executable bit");
    assert.equal(fs.existsSync(path.join(dir, ".git")), false, "a draft leaves git alone");
  }
});

test("the devcontainer is spec's, with the repository's name, network and kind", () => {
  const spec = parseJsonc(read(specRoot, ".devcontainer/devcontainer.json"));
  const kinds = JSON.parse(read(specRoot, "repo-template/kinds.json"));
  for (const [name, kind] of [
    ["learner-model", "go"],
    ["infra", "docs"],
  ]) {
    const dir = draft(name, kind, name === "infra" ? "3.11" : "3.8");
    const dc = devcontainer(dir);
    assert.equal(dc.name, `novatrail-${name}`);
    assert.deepEqual(dc.runArgs, [`--network=novatrail-${name}`]);
    assert.match(read(dir, ".devcontainer/host-network.sh"), new RegExp(`^network="novatrail-${name}"$`, "m"));
    assert.match(read(dir, ".devcontainer/Dockerfile"), new RegExp(`^# Development container for NovaTrail's ${name}\\.`));
    assert.deepEqual(dc.mounts, spec.mounts, "the sign-in volumes are shared");
    assert.deepEqual(dc.customizations.vscode.extensions, [...spec.customizations.vscode.extensions, ...kinds[kind]]);
    assert.match(dc.postStartCommand, /git submodule update --init spec$/);
    const { "git.repositoryScanMaxDepth": onlySpec, ...settings } = spec.customizations.vscode.settings;
    assert.equal(onlySpec, 2);
    assert.deepEqual(dc.customizations.vscode.settings, settings);
    const rest = ({ name: _n, runArgs: _r, postStartCommand: _p, customizations: _c, ...others }) => others;
    assert.deepEqual(rest(dc), rest(spec));
  }
});

test(".github gets a container name without the dot", () => {
  const dc = devcontainer(draft(".github", "docs", "3.11"));
  assert.equal(dc.name, "novatrail-github");
  assert.deepEqual(dc.runArgs, ["--network=novatrail-github"]);
});

test("refuses what it cannot build, and leaves nothing behind", () => {
  const dest = path.join(temporary(), "copy");
  const build = (name, kind, card) => () => newRepo({ specRoot, name, kind, card, dest, draft: "v0.0.0-test" });
  assert.throws(build("wiki", "docs", "3.8"), /wiki: not one of NovaTrail's repositories/);
  assert.throws(build("engine", "rust", "3.8"), /rust: the kinds are docs, go, typescript/);
  assert.throws(build("api", "go", "3.8"), /architecture 3\.8 is "3\.8\. learner-model и engine", not the card of api/);
  assert.throws(build("api", "go", "3.99"), /architecture 3\.99: no such card/);
  assert.throws(build("api", "go", "three"), /a card is a section number/);
  assert.equal(fs.existsSync(dest), false);

  fs.mkdirSync(dest);
  fs.writeFileSync(path.join(dest, "keep"), "");
  assert.throws(build("api", "go", "3.5"), /already exists and is not empty/);
  assert.deepEqual(fs.readdirSync(dest), ["keep"]);
});

test("a change to spec's devcontainer stops the recipe instead of a quietly wrong copy", () => {
  const root = standIn({ change: (r) => change(r, ".devcontainer/devcontainer.json", '"name": "novatrail-spec"', '"name": "spec"') });
  const dest = path.join(temporary(), "engine");
  assert.throws(() => newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, draft: "v0.0.0-test" }), /the container's name and network: expected "novatrail-spec" 2 time\(s\).*found 1/);
  assert.equal(fs.existsSync(dest), false, "half a copy was left behind");
});

test("a placeholder the recipe does not know stops it", () => {
  const root = standIn({ change: (r) => change(r, "repo-template/files/README.md", "# {{name}}", "# {{nmae}}") });
  assert.throws(() => draft("engine", "go", "3.8", root), /\{\{nmae\}\} is not one of name, card, spec_tag, date/);
});

test("check: red while a FILL marker is left, green once all are written", () => {
  const dir = draft("learner-model", "go", "3.8");
  const before = messages(dir);
  const markers = walk(dir).reduce((n, file) => n + (read(dir, file).match(FILL)?.length ?? 0), 0);
  assert.equal(before.length, markers, before.join("\n"));
  for (const m of before) assert.match(m, /a FILL marker is left unwritten$/);
  fill(dir);
  assert.deepEqual(messages(dir), []);
});

test("check: what a careless fill can leave", () => {
  const cases = [
    ["README.md", "(docs/decisions.md)", "(docs/decision.md)", /^README\.md:\d+: link docs\/decision\.md: docs\/decision\.md does not exist$/],
    ["AGENTS.md", "Codex", "Kodex", /^AGENTS\.md:0: differs from spec's own$/],
    ["RUN.md", "# RUN.md — план работ learner-model", "# RUN.md — план работ {{name}}", /^RUN\.md:1: \{\{name\}\} is left from the template$/],
    [".devcontainer/devcontainer.json", '"name": "novatrail-learner-model"', '"name": "novatrail-spec"', /^\.devcontainer\/devcontainer\.json:\d+: spec's container name or network is left/],
    ["CLAUDE.md", "## Documents", "## Documents\n\nSee [spec](https://github.com/altnovatrail/spec/tree/main).", /the links to spec name different versions: main, v0\.0\.0-test$/],
  ];
  for (const [file, from, to, expected] of cases) {
    const dir = draft("learner-model", "go", "3.8");
    fill(dir);
    change(dir, file, from, to);
    const found = messages(dir);
    assert.equal(found.length, 1, `${file}: expected one error, got:\n${found.join("\n")}`);
    assert.match(found[0], expected);
  }
});

test("from a tag: the files are the tag's, spec is a submodule at it, all staged, nothing committed", () => {
  const root = standIn({ tag: "v9.9.9" });
  change(root, "repo-template/files/README.md", "## Status", "WORKING TREE ONLY\n\n## Status");
  const dest = path.join(temporary(), "engine");
  const { tag } = newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root, date: "2026-01-02" });

  assert.equal(tag, "v9.9.9");
  assert.doesNotMatch(read(dest, "README.md"), /WORKING TREE ONLY/);
  assert.match(read(dest, "README.md"), /altnovatrail\/spec\/tree\/v9\.9\.9/);
  assert.equal(git(path.join(dest, "spec"), "describe", "--tags", "--exact-match", "HEAD"), "v9.9.9");
  const status = git(dest, "status", "--porcelain").split("\n");
  assert.ok(status.includes("A  .gitmodules") && status.includes("A  spec") && status.includes("A  CLAUDE.md"), status.join("\n"));
  assert.ok(status.every((line) => line.startsWith("A  ")), status.join("\n"));
  assert.throws(() => git(dest, "rev-parse", "--verify", "--quiet", "HEAD"), "the copy must not be committed");

  fill(dest);
  assert.deepEqual(messages(dest, root), []);
  change(dest, "CLAUDE.md", "## Documents", "## Documents\n\nSee [spec](https://github.com/altnovatrail/spec/tree/v9.9.8).");
  assert.deepEqual(
    messages(dest, root).map((m) => m.replace(/:\d+:/, ":N:")),
    ["CLAUDE.md:N: links to spec at v9.9.8, but the submodule is at v9.9.9"],
  );
});

test("without a tag nothing is built", () => {
  const root = standIn({ commit: true });
  const dest = path.join(temporary(), "engine");
  assert.throws(() => newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root }), /spec has no release tag to build from/);
  assert.equal(fs.existsSync(dest), false);
});

test("from a tag older than the template: refused", () => {
  const root = standIn({ commit: true });
  fs.rmSync(path.join(root, "repo-template"), { recursive: true });
  commitAll(root, "no template");
  git(root, "tag", "v0.0.2");
  const dest = path.join(temporary(), "engine");
  assert.throws(() => newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root }), /v0\.0\.2: cannot take repo-template/);
  assert.equal(fs.existsSync(dest), false);
});

test("from a tag: the highest version, even when HEAD is behind it", () => {
  const root = standIn({ tag: "v0.1.0" });
  change(root, "repo-template/files/README.md", "## Status", "FROM v0.2.0\n\n## Status");
  commitAll(root, "a newer template");
  git(root, "tag", "v0.2.0");
  git(root, "checkout", "--quiet", "--detach", "v0.1.0");
  const dest = path.join(temporary(), "engine");
  const { tag } = newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root });
  assert.equal(tag, "v0.2.0");
  assert.match(read(dest, "README.md"), /FROM v0\.2\.0/);
  assert.equal(git(path.join(dest, "spec"), "describe", "--tags", "--exact-match", "HEAD"), "v0.2.0");
});

test("from a tag: one that spec's remote lacks, or holds at another commit, is refused", () => {
  const root = standIn({ tag: "v0.1.0" });
  const remote = path.join(temporary(), "remote.git");
  execFileSync("git", ["clone", "--quiet", "--bare", root, remote]);

  git(root, "tag", "v0.2.0");
  const unpushed = path.join(temporary(), "engine");
  assert.throws(() => newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest: unpushed, specUrl: remote }), /v0\.2\.0 is not at .* yet: push the tag first/);
  assert.equal(fs.existsSync(unpushed), false);

  git(root, "tag", "--delete", "v0.2.0");
  change(root, "LICENSE", "Apache License", "Apache License\n");
  commitAll(root, "moved");
  git(root, "tag", "--force", "v0.1.0");
  const moved = path.join(temporary(), "engine");
  assert.throws(() => newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest: moved, specUrl: remote }), /v0\.1\.0 is \w+ here but \w+ at .*: fetch or push the tag so that both agree/);
  assert.equal(fs.existsSync(moved), false);
});

test("--draft without a tag to name is refused", () => {
  const dest = path.join(temporary(), "engine");
  assert.throws(() => newRepo({ specRoot, name: "engine", kind: "go", card: "3.8", dest, draft: "" }), /--draft needs the tag/);
});

test("check: an empty spec/ is not taken for the copy's own tag", () => {
  const root = standIn({ tag: "v9.9.9" });
  const dest = path.join(temporary(), "engine");
  newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root });
  fill(dest);
  commitAll(dest, "the first commit");
  git(dest, "tag", "v9.9.9");
  git(dest, "submodule", "deinit", "--quiet", "--force", "spec");
  const found = messages(dest, root);
  assert.ok(found.includes("spec:0: the spec submodule is not checked out at a tag"), found.join("\n"));
});

test("from a tag: a pre-release is not the latest release", () => {
  const root = standIn({ tag: "v0.1.0" });
  change(root, "repo-template/files/README.md", "## Status", "FROM A RELEASE CANDIDATE\n\n## Status");
  commitAll(root, "a release candidate");
  git(root, "tag", "v0.2.0-rc.1");
  const dest = path.join(temporary(), "engine");
  const { tag } = newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root });
  assert.equal(tag, "v0.1.0");
  assert.doesNotMatch(read(dest, "README.md"), /RELEASE CANDIDATE/);
});

test("a failed build empties a directory that was there before, and keeps it", () => {
  const root = standIn({ commit: true });
  const remote = path.join(temporary(), "remote.git");
  execFileSync("git", ["clone", "--quiet", "--bare", root, remote]);
  git(root, "tag", "v0.1.0");
  const dest = path.join(temporary(), "engine");
  fs.mkdirSync(dest);
  assert.throws(() => newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: remote }), /v0\.1\.0 is not at/);
  assert.deepEqual(fs.readdirSync(dest), []);
});

test("check: a link may name any tag of the submodule's commit", () => {
  const root = standIn({ tag: "v9.9.9" });
  git(root, "tag", "v9.9.9-docs");
  const dest = path.join(temporary(), "engine");
  newRepo({ specRoot: root, name: "engine", kind: "go", card: "3.8", dest, specUrl: root });
  fill(dest);
  git(path.join(dest, "spec"), "fetch", "--quiet", "--tags");
  change(dest, "CLAUDE.md", "## Documents", "## Documents\n\nSee [spec](https://github.com/altnovatrail/spec/tree/v9.9.9-docs).");
  assert.deepEqual(messages(dest, root), []);
});
