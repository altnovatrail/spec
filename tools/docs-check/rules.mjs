// The rules of .claude/rules/: Claude Code loads one when the session reads or edits a file that
// its `paths` match, and CLAUDE.md names each, so that a session that has not opened a part's
// files yet still finds the part's checks (R143; measurements 1.5). A rule whose front matter
// does not parse, or that has no `paths`, Claude Code loads in every session, and a pattern that
// matches no file never loads it: either way the rule says nothing of where it is meant to apply.

import path from "node:path";
import { parse as parseYaml } from "yaml";
import { decode, isExternal, resolveLink } from "./links.mjs";

export const RULES_DIR = ".claude/rules/";

export const isRule = (file) => file.startsWith(RULES_DIR);

// The files that may hold the project's CLAUDE.md, either of which may name the rules.
const CLAUDE_FILES = ["CLAUDE.md", ".claude/CLAUDE.md"];

// The YAML front matter of a Markdown file — between a first line "---" and the next line "---" —
// and the file with those lines blanked, so that what follows keeps its line numbers. Claude Code
// takes the front matter off before it loads a rule. With no front matter, `yaml` is null.
export function splitFrontMatter(source) {
  const lines = source.replace(/^\uFEFF/, "").split("\n");
  if (lines[0].trimEnd() !== "---") return { yaml: null, body: source };
  const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === "---");
  if (end < 0) return { yaml: null, body: source };
  return { yaml: lines.slice(1, end).join("\n"), body: [...lines.slice(0, end + 1).fill(""), ...lines.slice(end + 1)].join("\n") };
}

// Checks each rule among `files`, the parsed Markdown of the root, against `listed`, every file a
// pattern may match, by its path relative to the root. Returns how many rules there are.
export function checkRules(files, listed, report) {
  const named = namedRules(files);
  let count = 0;
  for (const [file, doc] of files) {
    if (!isRule(file)) continue;
    count++;
    for (const pattern of pathsOf(file, doc.frontMatter, report) ?? []) {
      if (!listed.some((candidate) => matches(candidate, pattern))) {
        report(file, lineOf(doc.frontMatter, pattern), `paths: ${pattern} matches no file of the repository, so the rule never loads`);
      }
    }
    if (!named.has(file)) report(file, 1, "CLAUDE.md names no link to this rule: a session that has not opened the part's files will not find it");
  }
  return count;
}

// The files the project's CLAUDE.md links to, as the link check resolves them.
function namedRules(files) {
  const named = new Set();
  for (const claude of CLAUDE_FILES) {
    for (const { url } of files.get(claude)?.links ?? []) {
      if (isExternal(url)) continue;
      const target = decode(url.split("#")[0]);
      if (target) named.add(resolveLink(claude, target));
    }
  }
  return named;
}

// Whether a pattern matches a file, as Claude Code reads a pattern of `paths`, relative to the
// folder that holds .claude (measurements 1.8): "/*.md" only at that root, a pattern without a
// slash — "*.md" — at any depth, and "*" and "**" over names that begin with a dot as over any
// other. path.matchesGlob never lets them match a dot, so a dot that begins a name stands in both
// for a character it has no rule for.
export function matches(file, pattern) {
  const undot = (text) => text.replace(/(^|\/)\./g, "$1\uE001");
  let glob = pattern.trim();
  if (glob.startsWith("/")) glob = glob.slice(1);
  else if (!glob.replace(/\/$/, "").includes("/")) glob = `**/${glob}`;
  return path.posix.matchesGlob(undot(file), undot(glob));
}

// The patterns of a rule's `paths`, a YAML list or a comma-separated string, as Claude Code
// reads them; or null, with the error reported.
function pathsOf(file, frontMatter, report) {
  if (frontMatter === null) {
    report(file, 1, "no front matter with paths: the rule loads in every session, and what every task needs belongs in CLAUDE.md");
    return null;
  }
  let data;
  try {
    data = parseYaml(frontMatter);
  } catch (error) {
    report(file, 2, `the front matter is not YAML, so Claude Code loads the rule in every session: ${error.message.split("\n")[0]}`);
    return null;
  }
  const paths = data?.paths;
  const patterns = typeof paths === "string" ? splitPatterns(paths) : paths;
  if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some((p) => typeof p !== "string" || p.trim() === "")) {
    report(file, 2, "paths: not a list of patterns, so the rule loads in every session");
    return null;
  }
  return patterns;
}

// A comma-separated string of patterns, split at the commas outside a brace group — "*.{ts,tsx}"
// is one pattern —, and with no empty entry, as after a comma at the end.
function splitPatterns(text) {
  const patterns = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "{") depth++;
    if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      patterns.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  patterns.push(current);
  return patterns.map((p) => p.trim()).filter(Boolean);
}

// The line of the file — the front matter starts on line 2 — that holds the pattern: the entry
// that is the pattern, or failing that the first line that holds it.
function lineOf(frontMatter, pattern) {
  const lines = frontMatter.split("\n");
  const entry = (line) => line.trim().replace(/^-\s*/, "").replace(/^(["'])(.*)\1$/, "$2");
  let index = lines.findIndex((line) => entry(line) === pattern);
  if (index < 0) index = lines.findIndex((line) => line.includes(pattern));
  return index < 0 ? 1 : index + 2;
}
