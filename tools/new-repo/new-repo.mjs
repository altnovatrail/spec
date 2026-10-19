// new-repo: builds the working copy of a new NovaTrail repository from repo-template/.
//
//   node tools/new-repo/new-repo.mjs <name> <kind> <card> [--draft <tag>]
//
// <name> is the repository, <kind> one of repo-template/kinds.json, <card> the number of the
// component's card in docs/architecture.md, such as 3.8. The files come from spec's latest tag —
// the highest version among its tags — so the copy and the spec submodule it pins say the same,
// and the tag must be the same commit on spec's remote. The copy lands in .repos/<name>,
// which spec ignores, with spec as a submodule at that tag and everything staged, uncommitted.
// --draft builds from the working tree instead, names <tag> in the text, and leaves git alone:
// a copy to read before the tag exists. The FILL markers are left for whoever fills the copy in.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { novatrailRepositories } from "../docs-check/config.mjs";
import { escape } from "../docs-check/citations.mjs";
import { editDevcontainer } from "./devcontainer.mjs";
import { FILL, PLACEHOLDER, isMain, walk } from "./copy.mjs";

export const SPEC_URL = "https://github.com/altnovatrail/spec.git";

// What a copy is built from: the template, what its files link to, and the cards.
const SOURCES = ["repo-template", "LICENSE", "AGENTS.md", ".devcontainer", "docs/architecture.md"];

export function newRepo({ specRoot, name, kind, card, dest, draft = null, specUrl = SPEC_URL, date = today() }) {
  if (!novatrailRepositories.includes(name)) {
    throw new Error(`${name}: not one of NovaTrail's repositories (tools/docs-check/config.mjs)`);
  }
  if (!/^\d+(?:\.\d+)*$/.test(card)) throw new Error(`${card}: a card is a section number, such as 3.8`);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) throw new Error(`${dest}: already exists and is not empty`);
  const isDraft = draft !== null;
  if (isDraft && !/^\S+$/.test(draft)) throw new Error("--draft needs the tag the copy should name, such as v0.1.0");

  const tag = isDraft ? draft : latestTag(specRoot);
  const source = isDraft ? specRoot : extract(specRoot, tag);
  const existed = fs.existsSync(dest);
  let started = false;
  try {
    const kinds = JSON.parse(fs.readFileSync(path.join(source, "repo-template", "kinds.json"), "utf8"));
    if (!Object.hasOwn(kinds, kind)) throw new Error(`${kind}: the kinds are ${Object.keys(kinds).join(", ")}`);
    checkCard(source, name, card);

    started = true;
    fs.mkdirSync(dest, { recursive: true });
    copyTemplate(path.join(source, "repo-template", "files"), dest, { name, card, spec_tag: tag, date });
    editDevcontainer(dest, name, kinds[kind]);
    if (!isDraft) initGit(dest, specRoot, specUrl, tag);
  } catch (error) {
    // Half a copy would only be refused as "not empty" next time. An empty directory that was
    // there before stays, emptied again.
    if (started && existed) {
      for (const entry of fs.readdirSync(dest)) fs.rmSync(path.join(dest, entry), { recursive: true, force: true });
    } else if (started) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    throw error;
  } finally {
    if (!isDraft) fs.rmSync(source, { recursive: true, force: true });
  }
  return { tag, fill: countFill(dest) };
}

const git =(dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// The highest release among spec's tags, wherever HEAD is: a branch forked before the latest
// tag must not quietly build from an older one. Releases only — vX.Y.Z — since git sorts a
// pre-release such as v0.2.0-rc.1 above v0.2.0 itself.
function latestTag(specRoot) {
  const releases = git(specRoot, "tag", "--list", "v*", "--sort=-v:refname")
    .split("\n")
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
  if (releases.length === 0) {
    throw new Error("spec has no release tag to build from: tag it, or fetch its tags (git fetch --tags), or build a draft with just new-repo-draft");
  }
  return releases[0];
}

// The sources as they are at the tag, unpacked into a directory of their own.
function extract(specRoot, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "new-repo-"));
  try {
    const archive = execFileSync("git", ["-C", specRoot, "archive", "--format=tar", tag, "--", ...SOURCES], {
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    execFileSync("tar", ["-x", "-C", dir], { input: archive });
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error(`${tag}: cannot take ${SOURCES.join(", ")} from it — is it older than repo-template? ${error.stderr ?? error.message}`.trim());
  }
  return dir;
}

// The card must exist and name the repository: "### 3.8. learner-model и engine".
function checkCard(source, name, card) {
  const text = fs.readFileSync(path.join(source, "docs", "architecture.md"), "utf8");
  const heading = text.split("\n").find((line) => line.startsWith(`### ${card}. `));
  if (!heading) throw new Error(`architecture ${card}: no such card in docs/architecture.md`);
  const named = new RegExp(`(?<![\\p{L}\\p{N}.-])${escape(name)}(?![\\p{L}\\p{N}-])`, "u");
  if (!named.test(heading)) {
    throw new Error(`architecture ${card} is "${heading.slice(4)}", not the card of ${name}: a repository needs a card that names it in its heading`);
  }
}

// The template's own files get their {{…}} filled in. What it links to — LICENSE, AGENTS.md and
// .devcontainer/, spec's own — is copied as it is, so no placeholder can creep into those.
function copyTemplate(from, to, values) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isSymbolicLink()) {
      // Files, not links: a link inside would point into a directory that is about to go.
      fs.cpSync(fs.realpathSync(source), target, { recursive: true, dereference: true });
    } else if (entry.isDirectory()) {
      fs.mkdirSync(target);
      copyTemplate(source, target, values);
    } else {
      const text = fs.readFileSync(source, "utf8").replace(PLACEHOLDER, (whole, key) => {
        if (!Object.hasOwn(values, key)) throw new Error(`${source}: ${whole} is not one of ${Object.keys(values).join(", ")}`);
        return values[key];
      });
      fs.writeFileSync(target, text, { mode: fs.statSync(source).mode });
    }
  }
}

// The files came from the tag here, and the submodule comes from spec's remote: the tag must be
// the same commit in both, or the copy would say one thing and pin another.
function initGit(dest, specRoot, specUrl, tag) {
  git(dest, "init", "--quiet", "--initial-branch=main");
  git(dest, "submodule", "add", "--quiet", specUrl, "spec");
  const spec = path.join(dest, "spec");
  try {
    git(spec, "fetch", "--quiet", "origin", "tag", tag);
  } catch {
    throw new Error(`${tag} is not at ${specUrl} yet: push the tag first`);
  }
  git(spec, "checkout", "--quiet", "--detach", tag);
  const here = git(specRoot, "rev-parse", `${tag}^{commit}`);
  const there = git(spec, "rev-parse", "HEAD");
  if (here !== there) throw new Error(`${tag} is ${here.slice(0, 7)} here but ${there.slice(0, 7)} at ${specUrl}: fetch or push the tag so that both agree`);
  git(dest, "add", "--all");
}

function countFill(dest) {
  const fill = {};
  for (const file of walk(dest)) {
    const found = fs.readFileSync(path.join(dest, file), "utf8").match(FILL)?.length ?? 0;
    if (found) fill[file] = found;
  }
  return fill;
}

// The date where the recipe runs, not in UTC.
function today() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
}

if (isMain(import.meta.url)) {
  const { values: flags, positionals } = parseArgs({ options: { draft: { type: "string" } }, allowPositionals: true });
  if (positionals.length !== 3) {
    console.error("usage: new-repo.mjs <name> <kind> <card> [--draft <tag>]");
    process.exit(2);
  }
  const [name, kind, card] = positionals;
  const specRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const dest = path.join(specRoot, ".repos", name);
  try {
    const { tag, fill } = newRepo({ specRoot, name, kind, card, dest, draft: flags.draft ?? null });
    const relative = path.relative(specRoot, dest);
    console.log(`new-repo: ${relative} from spec ${tag}${flags.draft ? " — a draft from the working tree, git left alone" : ", spec pinned as a submodule, all staged"}`);
    console.log("FILL markers to write from the card, architecture " + card + ":");
    for (const [file, count] of Object.entries(fill)) console.log(`  ${file}: ${count}`);
    console.log(`then: just new-repo-check ${name}`);
  } catch (error) {
    console.error(`new-repo: ${error.message}`);
    process.exitCode = 1;
  }
}
