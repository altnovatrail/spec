// docs-check: the checks of the documents of spec, or of a NovaTrail repository that has spec as
// its submodule.
//
//   node tools/docs-check/main.mjs             spec itself, where this script lies
//   node tools/docs-check/main.mjs --component the repository this spec is the submodule of
//
// The root is never a path from the command line: given to git as its working directory, such a
// path would let whoever writes the command run git in any folder (R32, the 2026-10-26 amendment).
//
// Reads every Markdown file of root — in a repository, those git tracks and those its .gitignore
// files do not keep out — and checks that relative links lead somewhere, that cited sections
// exist, that the registers are numbered without gaps and every cited number exists, that no
// number is typed in the wrong script, and that every Mermaid diagram parses. In a
// repository of its own, citations of spec — "architecture 3.8 spec", "R18 spec", "Т-15" — are
// checked against its spec/ submodule, at the tag it is pinned to, and spec/ itself is not
// checked. Prints one line per error, file:line: message, and exits 1 if there are any.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { componentProfile, specProfile } from "./config.mjs";
import { parseMarkdown } from "./markdown.mjs";
import { checkLinks } from "./links.mjs";
import { checkSections } from "./sections.mjs";
import { checkCitedNumbers, readRegisters } from "./registers.mjs";
import { findWrongScript, scopeAfter } from "./citations.mjs";
import { checkDiagrams } from "./mermaid.mjs";
import { execFileSync } from "node:child_process";
import { GIT, byCodeUnits, isMain } from "../shared.mjs";

export async function check(root, profile = specProfile) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });

  const files = readMarkdown(root, profile.excluded, (reason) => report(".git", 0, `git cannot list the repository's files: ${reason}`));
  // With no files to read, every other check would only repeat that.
  if (!files) return { errors, stats: { files: 0 } };
  // What the documents may cite or link to, besides themselves: spec's own documents, as spec/…
  const context = new Map(files);
  const specDir = profile.spec?.dir ?? null;
  if (specDir) {
    if (fs.existsSync(path.join(specDir, "RULES.md"))) {
      const fail = (reason) => report("spec", 0, `git cannot list spec's files: ${reason}`);
      for (const [file, doc] of readMarkdown(specDir, specProfile.excluded, fail) ?? []) context.set(`spec/${file}`, doc);
    } else {
      report("spec", 0, "spec's documents are not there: check the submodule out (git submodule update --init spec)");
    }
  }
  const locate = (resolved) =>
    specDir && (resolved === "spec" || resolved.startsWith("spec/")) ? path.join(specDir, resolved.slice("spec/".length)) : path.join(root, resolved);

  const stats = { files: files.size };
  stats.links = checkLinks(files, root, report, { context, locate });
  stats.sections = checkSections(files, context, profile, report);
  const own = readRegisters(files, profile.registers, report);
  // spec's registers are read, not checked: what is wrong in them is spec's to report.
  const spec = profile.spec ? readRegisters(context, profile.spec.registers, () => {}) : own;
  // The repository's own registers, read or not: an own number is never looked up in spec's.
  const ownPrefixes = new Set(profile.registers.map((r) => r.prefix));
  const registerOf = (prefix, scope) => (scope === "spec" || !ownPrefixes.has(prefix) ? spec : own).get(prefix);
  stats.numbers = checkCitedNumbers(files, registerOf, report);
  // Only a number the register could hold: P-256 is a curve and T-34 a tank, not П-256 or Т-34.
  for (const [file, doc] of files) {
    for (const block of doc.blocks) {
      for (const wrong of findWrongScript(block)) {
        const scope = scopeAfter(block.text, wrong.start + wrong.text.length);
        if (scope === "foreign") continue;
        const register = registerOf(wrong.prefix, scope);
        if (!register || wrong.number < 1 || wrong.number > register.next) continue;
        report(file, block.lineAt(wrong.start), `${wrong.text}: a register number typed in the wrong script (R, О-, П-, Т-)`);
      }
    }
  }
  stats.diagrams = await checkDiagrams(files, report);

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line);
  return { errors, stats };
}

// The parsed Markdown files of root, by their paths relative to it with forward slashes, in a
// stable order. A root with a .git of its own — a repository, the spec/ submodule, a copy that
// new-repo built — has its files listed by git: the tracked ones still in the working tree and the
// untracked ones that the repository's .gitignore files do not keep out. So a document not
// committed yet is read, and what the repository keeps out of git, such as tutor's samples/, is
// not: git does not even enter a folder it ignores (R32, the 2026-10-26 amendment). Only the
// repository's own rules count, not the user's global ones or .git/info/exclude, so the list is
// the same on every machine. If git cannot list the files, `fail` hears why, and the result is
// null. A root without a .git — a draft new-repo built, the copies of the tests — is walked
// whole. What `excluded` names is left out either way.
function readMarkdown(root, excluded, fail) {
  const skip = (relative) =>
    relative.split("/").some((name) => excluded.names.includes(name)) ||
    excluded.paths.some((excludedPath) => relative === excludedPath || relative.startsWith(`${excludedPath}/`));
  let files;
  if (fs.existsSync(path.join(root, ".git"))) {
    try {
      files = listedByGit(root);
    } catch (error) {
      fail(error.message.trim().split("\n").pop());
      return null;
    }
  } else {
    files = walkedTree(root, skip);
  }
  const found = files.filter((file) => file.endsWith(".md") && !skip(file));
  return new Map(found.sort(byCodeUnits).map((file) => [file, parseMarkdown(fs.readFileSync(path.join(root, file), "utf8"))]));
}

// The Markdown files git lists in the repository at root that are files in its working tree: not
// a tracked file deleted since or a symlink. An unmerged file is listed once. git's `*` matches
// across folders, so `*.md` is every Markdown file at any depth.
function listedByGit(root) {
  // git runs in root rather than with -C root, so the path never becomes one of its arguments; and
  // without the fsmonitor hook, which ls-files would otherwise run from the repository's config.
  const args = ["-c", "core.fsmonitor=false", "ls-files", "-z", "--cached", "--others", "--exclude-per-directory=.gitignore", "--", "*.md"];
  const listed = execFileSync(GIT, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(listed.split("\0"))].filter((file) => file && fs.lstatSync(path.join(root, file), { throwIfNoEntry: false })?.isFile());
}

// Every file under root, by its relative path, but none in a folder that `skip` leaves out.
function walkedTree(root, skip) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (skip(relative)) continue;
      if (entry.isDirectory()) walk(relative);
      else if (entry.isFile()) found.push(relative);
    }
  };
  walk("");
  return found;
}

// Whether root is a NovaTrail repository with this spec as its spec/ submodule, as git reads its
// .gitmodules — the same question new-repo-check asks.
export function isRepositoryAround(root, specRoot) {
  if (path.basename(specRoot) !== "spec" || !fs.existsSync(path.join(root, "docs", "decisions.md"))) return false;
  try {
    const listed = execFileSync(GIT, ["-C", root, "config", "--file", ".gitmodules", "--get", "submodule.spec.path"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return listed.trim() === "spec";
  } catch {
    return false;
  }
}

if (isMain(import.meta.url)) {
  const specRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--component")) {
    console.error("docs-check: the only argument is --component; the root is spec itself or the repository around it");
    process.exit(2);
  }
  let root;
  let profile;
  if (args[0] === "--component") {
    // The repository around this spec, never a path from the command line.
    root = path.dirname(specRoot);
    if (!isRepositoryAround(root, specRoot)) {
      console.error(`docs-check: --component runs from the spec/ submodule of a NovaTrail repository, and ${specRoot} is not one`);
      process.exit(2);
    }
    profile = componentProfile(specRoot);
  } else {
    root = specRoot;
    profile = specProfile;
  }
  const { errors, stats } = await check(root, profile);
  for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.log(`docs-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(
      `docs-check: ok — ${stats.files} files, ${stats.links} links, ${stats.sections} sections, ` +
        `${stats.numbers} numbers, ${stats.diagrams} diagrams`,
    );
  }
}
