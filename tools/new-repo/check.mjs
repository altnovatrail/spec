// new-repo-check: checks a working copy that new-repo built, once its FILL markers are written.
//
//   node tools/new-repo/check.mjs <name>
//
// The copy checked is .repos/<name>, for a name from the list of NovaTrail's repositories.
// Nothing of the template may be left in it — no {{…}} and no FILL marker. LICENSE and AGENTS.md
// must be spec's own; relative links in its Markdown must lead to files and headings that exist;
// its devcontainer must keep no name of spec's; and every link to spec on GitHub must name the
// tag the spec submodule is checked out at. A draft — a copy without .git — has no submodule:
// its links to spec need only agree with one another, and LICENSE and AGENTS.md are compared
// with spec's working tree. Prints one line per error, file:line: message, and exits 1 if any.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseMarkdown } from "../docs-check/markdown.mjs";
import { checkLinks } from "../docs-check/links.mjs";
import { FILL, isMain, knownRepository, placeholders, walk } from "./copy.mjs";
import { GIT, byCodeUnits } from "../shared.mjs";

const SPEC_LINK = /https:\/\/github\.com\/altnovatrail\/spec\/(?:tree|blob)\/([^/\s)#>]+)/g;

export function checkRepo({ dir, specRoot }) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });
  const files = walk(dir);
  const draft = !fs.existsSync(path.join(dir, ".git"));
  const text = new Map(files.map((file) => [file, fs.readFileSync(path.join(dir, file), "utf8")]));
  const eachLine = (file, look) => text.get(file).split("\n").forEach((line, i) => look(line, i + 1));

  for (const file of files) {
    eachLine(file, (line, n) => {
      for (const { whole } of placeholders(line)) report(file, n, `${whole} is left from the template`);
      if (line.match(FILL)) report(file, n, "a FILL marker is left unwritten");
    });
  }

  const reference = draft ? specRoot : path.join(dir, "spec");
  for (const file of ["LICENSE", "AGENTS.md"]) {
    const theirs = path.join(reference, file);
    if (!text.has(file)) report(file, 0, "missing");
    else if (!fs.existsSync(theirs)) report(file, 0, `cannot compare it with spec's: ${theirs} does not exist`);
    else if (fs.readFileSync(theirs, "utf8") !== text.get(file)) report(file, 0, "differs from spec's own");
  }

  const markdown = new Map(files.filter((f) => f.endsWith(".md")).map((f) => [f, parseMarkdown(text.get(f))]));
  checkLinks(markdown, dir, report);

  for (const file of files.filter((f) => f.startsWith(".devcontainer/"))) {
    eachLine(file, (line, n) => {
      if (line.includes("novatrail-spec")) report(file, n, "spec's container name or network is left in the devcontainer");
    });
  }

  // Links to spec on GitHub, by the version they name.
  const refs = [];
  for (const file of markdown.keys()) {
    eachLine(file, (line, n) => {
      for (const m of line.matchAll(SPEC_LINK)) refs.push({ file, line: n, ref: m[1] });
    });
  }
  if (draft) {
    const named = [...new Set(refs.map((r) => r.ref))].sort(byCodeUnits);
    if (named.length > 1) report(refs[0].file, refs[0].line, `the links to spec name different versions: ${named.join(", ")}`);
  } else {
    const tags = submoduleTags(dir);
    if (tags.length === 0) report("spec", 0, "the spec submodule is not checked out at a tag");
    for (const r of refs) {
      if (tags.length > 0 && !tags.includes(r.ref)) report(r.file, r.line, `links to spec at ${r.ref}, but the submodule is at ${tags.join(", ")}`);
    }
  }

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line);
  return errors;
}

// The tags at the commit spec/ is checked out at; one commit may carry several. An empty spec/
// has no .git of its own, and git run inside it would answer for the copy's own HEAD instead.
function submoduleTags(dir) {
  const spec = path.join(dir, "spec");
  if (!fs.existsSync(path.join(spec, ".git"))) return [];
  try {
    const listed = execFileSync(GIT, ["-C", dir, "config", "--file", ".gitmodules", "--get", "submodule.spec.path"], { encoding: "utf8" }).trim();
    if (listed !== "spec") return [];
    return execFileSync(GIT, ["-C", spec, "tag", "--points-at", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

if (isMain(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error("usage: check.mjs <name>");
    process.exit(2);
  }
  // The copy is .repos/<name>, and the name is taken from the list of NovaTrail's repositories,
  // never as given: no path and no command is built from what the caller typed.
  const name = knownRepository(process.argv[2]);
  if (!name) {
    console.error(`new-repo-check: ${process.argv[2]}: not one of NovaTrail's repositories (tools/docs-check/config.mjs)`);
    process.exit(2);
  }
  const specRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const dir = path.join(specRoot, ".repos", name);
  if (!fs.existsSync(dir)) {
    console.error(`new-repo-check: ${dir} does not exist`);
    process.exit(1);
  }
  const errors = checkRepo({ dir, specRoot });
  for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.log(`new-repo-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(`new-repo-check: ok — .repos/${name}${fs.existsSync(path.join(dir, ".git")) ? "" : " (a draft)"}`);
  }
}
