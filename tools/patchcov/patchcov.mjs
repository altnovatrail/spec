// The coverage of a patch as Codecov counts it, before a pull request: the lines the
// diff from the base adds or changes, each a hit, a miss or a partial by the reports, and their
// share of hits, cut down to two decimals. A line partly covered is no hit.

import fs from "node:fs";
import path from "node:path";
import { git } from "../shared.mjs";

const SAFE = ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false"];

// A line's coverage as Codecov keeps it: a count, or "taken/branches" for a line of branches.
// Its kind: hit, miss or partial.
export function kindOf(coverage) {
  if (typeof coverage === "string") {
    const [taken, all] = coverage.split("/");
    return taken === all ? "hit" : taken === "0" ? "miss" : "partial";
  }
  return coverage > 0 ? "hit" : "miss";
}

// Two coverages of one line, as Codecov merges two reports of a file: the larger count; a line of
// branches is all hit beside a count above 0, and itself beside 0; of two lines of branches, the
// larger of each part.
export function mergeCoverage(a, b) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (typeof a === "number" || typeof b === "number") {
    const [count, branches] = typeof a === "number" ? [a, b] : [b, a];
    if (count > 0) {
      const all = branches.split("/").at(-1);
      return `${all}/${all}`;
    }
    return branches;
  }
  if (a === b) return a;
  const [a1, a2] = a.split("/");
  const [b1, b2] = b.split("/");
  if (a1 === a2) return a;
  if (b1 === b2) return b;
  return `${Number(a1) > Number(b1) ? a1 : b1}/${Number(a2) > Number(b2) ? a2 : b2}`;
}

function addLine(files, file, line, coverage) {
  const lines = files.get(file) ?? new Map();
  files.set(file, lines);
  lines.set(line, mergeCoverage(lines.get(line), coverage));
}

// The lines of an lcov record that hold no line's coverage, which Codecov passes over.
const SUMMARY = new Set(["TN", "LF", "LH", "FNF", "FNH", "BRF", "BRH", "FNDA"]);

// An lcov report as Codecov's parser reads it: each record's DA lines by their count, then the
// BRDA lines of a line, which take its place — all branches taken a hit, none a miss, even where
// DA counted it, any other share a partial. A .js file's branches are not read, nor a .ts file's
// on its first line. The lines of each file: Map<file, Map<line, coverage>>.
export function parseLcov(text, files = new Map()) {
  for (const record of text.split("\nend_of_record")) {
    let file = null;
    let js = false;
    const lines = new Map();
    const branches = new Map();
    for (const raw of record.split("\n")) {
      const colon = raw.indexOf(":");
      if (colon < 0) continue;
      const method = raw.slice(0, colon);
      const content = raw.slice(colon + 1).trim();
      if (SUMMARY.has(method)) continue;
      if (method === "SF") {
        file = content;
        js = content.endsWith(".js");
        continue;
      }
      if (file === null) break;
      if (method === "DA") {
        const [line, hits] = content.split(",");
        if (!line || !hits || line === "undefined" || hits === "undefined" || /^[0n]/.test(line) || /^[=s]/.test(hits)) continue;
        const ln = Number.parseInt(line, 10);
        const count = Number(hits);
        if (!Number.isInteger(ln) || Number.isNaN(count)) continue;
        lines.set(ln, mergeCoverage(lines.get(ln), Math.max(Math.trunc(count), 0)));
      } else if (method === "BRDA" && !js) {
        const parts = content.split(",");
        if (parts.length < 4) continue;
        const [line, block, branch, taken] = [parts[0], parts[1], parts[2], parts.slice(3).join(",")];
        if (line === "1" && file.endsWith(".ts")) continue;
        if (line === "0" || line === "") continue;
        const of = branches.get(line) ?? new Map();
        branches.set(line, of);
        of.set(`${block}:${branch}`, taken === "-" || taken === "0" ? 0 : 1);
      }
    }
    if (file === null) continue;
    for (const [line, of] of branches) {
      const ln = Number.parseInt(line, 10);
      if (!Number.isInteger(ln)) continue;
      const taken = [...of.values()].reduce((s, v) => s + v, 0);
      lines.set(ln, `${taken}/${of.size}`);
    }
    for (const [ln, coverage] of lines) addLine(files, file, ln, coverage);
  }
  return files;
}

// Codecov's combine_partials: the segments of one line, [start, end or null, hits], joined by
// column — the larger count of a column wins — into runs of one count, the last run open to the
// line's end where a segment is. null when no run is left.
export function combineSegments(segments) {
  if (segments.length === 1) return segments;
  const columns = new Map();
  const push = (c, hits) => columns.set(c, [...(columns.get(c) ?? []), hits]);
  for (const [sc, ec, hits] of segments) if (ec !== null) for (let c = sc ?? 0; c < ec; c += 1) push(c, hits);
  const last = (columns.size ? Math.max(...columns.keys()) : Math.max(...segments.map(([sc]) => sc ?? 0))) + 1;
  const eol = [];
  for (const [sc, ec, hits] of segments) {
    if (ec !== null) continue;
    for (let c = sc ?? 0; c < last; c += 1) push(c, hits);
    eol.push(hits);
  }
  const sorted = [...columns].map(([c, hits]) => [c, Math.max(...hits)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const runs = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1][1] === sorted[i][1]) j += 1;
    runs.push([sorted[i][0], sorted[j][0] + 1, sorted[i][1]]);
    i = j + 1;
  }
  if (runs.length) {
    const first = runs[0];
    if (first[0] === 0 && first[1] === 1) {
      runs.shift();
      if (!runs.length) return [[0, null, first[2]]];
    }
    if (eol.length) {
      const hits = Math.max(...eol);
      const tail = runs.at(-1);
      if (tail[1] === last && tail[2] === hits) runs[runs.length - 1] = [tail[0], null, hits];
      else runs.push([last, null, hits]);
    }
  }
  return runs.length ? runs : null;
}

// A Go profile as Codecov's parser reads it: each block lays a segment on each line it covers —
// on its first line from its start, on each line between the whole line, on its last only when it
// ends past the second column, so a closing brace adds none —, a block repeated with the same
// count once. A line of one segment takes its count; of several, the share of its runs with hits.
// The files are the profile's import paths, as Map<path, Map<line, coverage>>.
export function parseGoProfile(text, files = new Map()) {
  const segments = new Map();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("mode: ")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const rest = line.slice(colon + 1);
    if (!rest || rest.endsWith("%")) continue;
    const match = /^(\d+)\.(\d+),(\d+)\.(\d+) \d+ (\d+)\s*$/.exec(rest);
    if (!match) throw new Error(`not a line of a Go profile: ${line}`);
    const [sl, sc, el, ec, hits] = match.slice(1).map(Number);
    const of = segments.get(line.slice(0, colon)) ?? new Map();
    segments.set(line.slice(0, colon), of);
    const add = (ln, segment) => {
      const set = of.get(ln) ?? new Map();
      set.set(segment.join(","), segment);
      of.set(ln, set);
    };
    if (sl === el) add(sl, [sc, ec, hits]);
    else {
      add(sl, [sc, null, hits]);
      for (let ln = sl + 1; ln < el; ln += 1) add(ln, [0, null, hits]);
      if (ec > 2) add(el, [null, ec, hits]);
    }
  }
  for (const [file, of] of segments) {
    for (const [ln, set] of of) {
      const all = [...set.values()];
      const runs = combineSegments(all);
      let coverage;
      if (!runs) coverage = Math.max(...all.map((s) => s[2]));
      else if (runs.length === 1) coverage = runs[0][2];
      else coverage = `${runs.filter((r) => r[2] > 0).length}/${runs.length}`;
      addLine(files, file, ln, coverage);
    }
  }
  return files;
}

// The lines the diff adds or changes, by file: `git diff -U0` from the base to HEAD, renames
// followed, so a moved file counts only the lines it changed.
export function changedLines(diff) {
  const changed = new Map();
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const name = line.slice(4);
      file = name === "/dev/null" ? null : name.replace(/^b\//, "");
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk || file === null) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const set = changed.get(file) ?? new Set();
    for (let i = 0; i < count; i += 1) set.add(start + i);
    if (set.size) changed.set(file, set);
  }
  return changed;
}

// A glob of codecov.yml's ignore, as a test of a path: ** any folders, * any name.
export function globTest(glob) {
  let source = "";
  const text = glob.replace(/^\.?\//, "");
  for (let i = 0; i < text.length; i += 1) {
    if (text.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 2;
    } else if (text.startsWith("**", i)) {
      source += ".*";
      i += 1;
    } else if (text[i] === "*") source += "[^/]*";
    else if (text[i] === "?") source += "[^/]";
    else source += text[i].replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  const re = new RegExp(`^${source}(?:/.*)?$`);
  return (file) => re.test(file);
}

const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");

// The patch's target and the ignored paths of a codecov.yml, read by its lines: the file is the
// repository's own, of a shape NovaTrail's template gives — coverage.status.patch.default.target,
// a percentage, and the list ignore. No YAML library: spec's tools of another repository have no
// node_modules. A target that is not there is an error, never a default.
export function readConfig(text) {
  const stack = [];
  let target = null;
  const ignore = [];
  let inIgnore = false;
  for (const raw of text.split("\n")) {
    const hash = raw.search(/\s#/);
    const line = hash === -1 ? raw : raw.slice(0, hash).trimEnd();
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const bare = line.trimStart();
    if (/^-\s/.test(bare)) {
      if (inIgnore) ignore.push(unquote(bare.slice(1).trimStart()));
      continue;
    }
    const key = /^([\w-]+):(.*)$/.exec(bare);
    if (!key) continue;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const keys = [...stack.map((s) => s.key), key[1]].join(".");
    inIgnore = keys === "ignore";
    if (keys === "ignore" && key[2].trim().startsWith("[")) {
      ignore.push(...key[2].trim().slice(1, -1).split(",").map(unquote).filter(Boolean));
    }
    if (keys === "coverage.status.patch.default.target") {
      const value = /^["']?(\d+(?:\.\d+)?)%?["']?$/.exec(key[2].trim());
      if (!value) throw new Error(`codecov.yml: the patch's target is not a percentage: ${key[2].trim()}`);
      target = Number(value[1]);
    }
    stack.push({ indent, key: key[1] });
  }
  if (target === null) throw new Error("codecov.yml: no coverage.status.patch.default.target");
  return { target, ignore };
}

// The Go modules of a repository, by their path, longest first: what turns an import path of a
// profile into the repository's file.
export function goModulesOf(root, files) {
  const modules = [];
  for (const file of files) {
    const match = /^module\s+(\S+)/m.exec(fs.readFileSync(path.join(root, file), "utf8"));
    if (match) modules.push({ module: match[1], dir: path.posix.dirname(file) === "." ? "" : path.posix.dirname(file) });
  }
  return modules.sort((a, b) => b.module.length - a.module.length);
}

// A path of a report as the repository's file: an lcov's relative path or absolute one inside the
// root, a profile's import path by the module it lies in. null when it is none of the repository's.
export function fileOf(name, root, modules) {
  if (path.isAbsolute(name)) {
    const relative = path.relative(root, name);
    return relative.startsWith("..") || path.isAbsolute(relative) ? null : relative.split(path.sep).join("/");
  }
  for (const { module, dir } of modules) {
    if (name === module || name.startsWith(`${module}/`)) {
      const inside = name.slice(module.length + 1);
      return dir ? `${dir}/${inside}` : inside;
    }
  }
  return name.replace(/^\.\//, "");
}

// The lines of a Go file that Codecov's uploader names as fixes and Codecov then drops from the
// report: blank lines, comments, a lone brace, `func {`, and a block comment from its `/*` line to
// its `*/` line, each alone on its line. An lcov report's TypeScript has none.
export function goFixes(text) {
  const fixed = new Set();
  const starts = [];
  const stops = [];
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  for (const [i, line] of lines.entries()) {
    const ln = i + 1;
    if (/^\s*(\/\*|\*\/)\s*$/.test(line)) {
      const source = line.trim();
      if (source.startsWith("/*")) starts.push(ln);
      else if (source.endsWith("*/")) stops.push(ln);
      fixed.add(ln);
    } else if (/^\s*$/.test(line) || /^\s*\/\//.test(line) || /^\s*[{}]\s*(\/\/.*)?$/.test(line) || /^\s*func\s*\{\s*(\/\/.*)?$/.test(line)) {
      fixed.add(ln);
    }
  }
  for (let i = 0; i < starts.length && i < stops.length; i += 1) for (let ln = starts[i] + 1; ln < stops[i]; ln += 1) fixed.add(ln);
  return fixed;
}

// Two decimals, cut down, as Codecov's default round: down and precision: 2.
export function truncate(ratio) {
  return Math.floor(ratio * 10000 + 1e-9) / 100;
}

// The patch's coverage: of the changed lines a report holds, outside the ignored paths, how many
// are hits, misses and partials, and their share against the target.
export function patchCoverage({ changed, reports, target, ignore = [] }) {
  const ignored = ignore.map(globTest);
  let hits = 0;
  let misses = 0;
  let partials = 0;
  const files = [];
  for (const [file, lines] of [...changed].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (ignored.some((test) => test(file))) continue;
    const covered = reports.get(file);
    if (!covered) continue;
    const row = { file, hits: 0, misses: [], partials: [] };
    for (const line of [...lines].sort((a, b) => a - b)) {
      if (!covered.has(line)) continue;
      const kind = kindOf(covered.get(line));
      if (kind === "hit") row.hits += 1;
      else if (kind === "miss") row.misses.push(line);
      else row.partials.push(line);
    }
    if (!row.hits && !row.misses.length && !row.partials.length) continue;
    hits += row.hits;
    misses += row.misses.length;
    partials += row.partials.length;
    files.push(row);
  }
  const lines = hits + misses + partials;
  const coverage = lines ? truncate(hits / lines) : null;
  return { target, coverage, hits, misses, partials, pass: coverage === null || coverage >= target, files };
}

// The patch of the repository at root from base to HEAD, by its reports and its codecov.yml.
export function measure({ root, base = null, reports = null, config = ".github/codecov.yml" }) {
  const run = (args) => git(root, [...SAFE, ...args]);
  const from = base ?? run(["merge-base", "origin/main", "HEAD"]).trim();
  const changed = changedLines(run(["diff", "-U0", "-M", "--no-color", "--no-ext-diff", "--no-textconv", from, "HEAD"]));
  // The command line that names the configuration may be a session's: it names a file of the
  // repository, never one beyond it.
  const inside = path.resolve(root) + path.sep;
  const configFile = path.resolve(root, config);
  if (!configFile.startsWith(inside)) throw new Error(`--config: ${config} is not a file of the repository`);
  const { target, ignore } = readConfig(fs.readFileSync(configFile, "utf8"));
  const named = reports ?? ["coverage/go.out", "coverage/lcov.info"].filter((f) => fs.existsSync(path.join(root, f)));
  if (!named.length) throw new Error("no report: neither coverage/go.out nor coverage/lcov.info, and none named");
  const modules = goModulesOf(root, run(["ls-files", "--", "go.mod", "*/go.mod"]).split("\n").filter(Boolean));
  const covered = new Map();
  for (const report of named) {
    const text = fs.readFileSync(path.resolve(root, report), "utf8");
    const parsed = text.startsWith("mode: ") ? parseGoProfile(text) : parseLcov(text);
    for (const [name, lines] of parsed) {
      const file = fileOf(name, root, modules);
      if (file === null) continue;
      for (const [line, coverage] of lines) addLine(covered, file, line, coverage);
    }
  }
  for (const [file, lines] of covered) {
    if (!file.endsWith(".go") || !fs.existsSync(path.join(root, file))) continue;
    for (const line of goFixes(fs.readFileSync(path.join(root, file), "utf8"))) lines.delete(line);
  }
  return { base: from, reports: named, ...patchCoverage({ changed, reports: covered, target, ignore }) };
}
