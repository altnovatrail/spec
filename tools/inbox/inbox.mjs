// What inbox reads and compares: the rows «в реестр spec» of table 3 in the other repositories'
// RUN.md, and table 5 of spec's own, the rows spec has recorded (R81). Reading GitHub goes through
// a gh function the caller gives, so that the tests run with no network.

import { spawnSync } from "node:child_process";
import { parseMarkdown } from "../docs-check/markdown.mjs";
import { ORGANIZATION } from "../release/repositories.mjs";
import { byCodeUnits, GH } from "../shared.mjs";

// The mark a session puts on a row for spec, at the start of its question. Repositories write it
// «В реестр spec», **В реестр spec.** or «в реестр spec», so its case does not count. The same words
// further on — a recommendation that sends something «в реестр spec» later — are no mark. The words
// may stand after any quote, «, “, „ or ", and with any white space between them, a no-break space
// too.
const MARK = /^[«“„"\s]*в\s+реестр\s+spec/iu;
const ROW = /^В(\d+)$/u;
// "В7", "В7–В10", "В7–10", with an en dash or a hyphen.
const NUMBERS = /^В(\d+)(?:\s*[–-]\s*В?(\d+))?$/u;

// The table under the heading whose text begins `prefix`, as parseMarkdown gives it, or none.
function tablesUnder(doc, prefix) {
  const index = doc.headings.findIndex((h) => h.text.startsWith(prefix));
  return index < 0 ? [] : doc.tables.filter((table) => table.heading === index);
}

// The rows of table 3 marked for spec: { number, text, line }, text being the question's cell
// with its white space folded. parseMarkdown gives a cell's plain text, so **В реестр spec.** reads
// as В реестр spec.
export function rowsForSpec(source) {
  const rows = [];
  for (const table of tablesUnder(parseMarkdown(source), "Таблица 3.")) {
    for (const row of table.rows) {
      const number = ROW.exec(row.cells[0] ?? "")?.[1];
      const text = (row.cells[1] ?? "").replace(/\s+/gu, " ");
      if (number && MARK.test(text)) rows.push({ number: Number(number), text, line: row.line });
    }
  }
  return rows;
}

// "В1–В5, В7" as the numbers it names; null when a part is not a number or a range.
export function parseNumbers(text) {
  const numbers = [];
  for (const part of text.split(/[,;]/u).map((p) => p.trim())) {
    const match = NUMBERS.exec(part);
    if (!match) return null;
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (to < from) return null;
    for (let n = from; n <= to; n++) numbers.push(n);
  }
  return numbers;
}

// Table 5 of spec's RUN.md: repository → the numbers spec has recorded. A row it cannot read is a
// problem, with its line.
export function ledgerOf(source) {
  const ledger = new Map();
  const problems = [];
  for (const table of tablesUnder(parseMarkdown(source), "Таблица 5.")) {
    for (const row of table.rows) {
      const [name = "", list = ""] = row.cells;
      const numbers = parseNumbers(list);
      if (!name || !numbers) {
        problems.push(`RUN.md:${row.line}: a row of table 5 names no repository or no rows В: "${row.cells.join(" | ")}"`);
        continue;
      }
      const recorded = ledger.get(name) ?? new Set();
      for (const n of numbers) recorded.add(n);
      ledger.set(name, recorded);
    }
  }
  return { ledger, problems };
}

// How long one call of gh may take, as tools/release/github.mjs gives git: a stalled network ends
// in a refusal that says so, rather than in a session that waits.
const TIMEOUT = 120_000;

// Runs gh with the arguments and gives its standard output, or throws with what it said.
export function runGh(args, program = GH, timeout = TIMEOUT) {
  const run = spawnSync(program, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout });
  if (run.error) throw new Error(`${program}: ${run.error.message}`);
  if (run.status !== 0) throw new Error(`${program} ${args.join(" ")}: ${(run.stderr || run.stdout).trim() || `exit ${run.status}`}`);
  return run.stdout;
}

// One repository as GitHub holds it: the commit of main and its rows for spec, and each open pull
// request with the rows it adds. RUN.md is read at a commit, once a commit, so that the rows and the
// commit named agree. A pull request adds the rows its head has and its merge base with main has
// not: one that leaves RUN.md alone adds none, however old its branch — Dependabot's keep the RUN.md
// of their day —, and one cut long ago does not bring back the rows main has closed since. Lists come
// page by page. A pull request that cannot be read is a problem of its own, and the rest is read.
export function readRepository(name, gh = runGh) {
  const repo = `repos/${ORGANIZATION.name}/${name}`;
  const pages = (endpoint) => JSON.parse(gh(["api", "--paginate", "--slurp", endpoint])).flat();
  const read = new Map();
  const runAt = (sha) => {
    if (!read.has(sha)) read.set(sha, rowsForSpec(gh(["api", `${repo}/contents/RUN.md?ref=${sha}`, "-H", "Accept: application/vnd.github.raw"])));
    return read.get(sha);
  };
  const added = (pull) => {
    if (!pages(`${repo}/pulls/${pull.number}/files?per_page=100`).some((file) => file.filename === "RUN.md")) return [];
    const base = gh(["api", `${repo}/compare/main...${pull.head.sha}`, "--jq", ".merge_base_commit.sha"]).trim();
    const before = new Set(runAt(base).map((row) => row.number));
    return runAt(pull.head.sha).filter((row) => !before.has(row.number));
  };
  const sha = gh(["api", `${repo}/commits/main`, "--jq", ".sha"]).trim();
  const main = { sha, rows: runAt(sha) };
  const problems = [];
  const pulls = [];
  for (const pull of pages(`${repo}/pulls?state=open&per_page=100`)) {
    try {
      pulls.push({ number: pull.number, title: pull.title, sha: pull.head.sha, rows: added(pull) });
    } catch (error) {
      problems.push(`cannot read pull request #${pull.number} of ${name} — ${error.message}`);
    }
  }
  return { name, main, pulls, problems };
}

// What spec has still to take: rows on main that table 5 does not hold; rows of open pull requests
// that neither main nor table 5 holds; and numbers of table 5 that neither main nor an open pull
// request holds now, which can leave the table — a row recorded from a pull request, on the author's
// word, stays while the pull request is open. A repository that table 5 names and `known` does not
// — the repositories inbox reads, whether or not they could be read — is a problem.
export function compare(repositories, ledger, known = repositories.map((r) => r.name)) {
  const fresh = [];
  const coming = [];
  const gone = [];
  const problems = [];
  const read = new Set(known);
  for (const repository of [...repositories].sort((a, b) => byCodeUnits(a.name, b.name))) {
    const recorded = ledger.get(repository.name) ?? new Set();
    const onMain = new Set(repository.main.rows.map((row) => row.number));
    const inPulls = new Set(repository.pulls.flatMap((pull) => pull.rows.map((row) => row.number)));
    for (const row of repository.main.rows) {
      if (!recorded.has(row.number)) fresh.push({ repository: repository.name, sha: repository.main.sha, ...row });
    }
    for (const pull of repository.pulls) {
      for (const row of pull.rows) {
        if (!onMain.has(row.number) && !recorded.has(row.number)) coming.push({ repository: repository.name, pull: pull.number, title: pull.title, sha: pull.sha, ...row });
      }
    }
    for (const n of [...recorded].sort((a, b) => a - b)) {
      if (!onMain.has(n) && !inPulls.has(n)) gone.push({ repository: repository.name, number: n });
    }
  }
  for (const name of [...ledger.keys()].sort(byCodeUnits)) {
    if (!read.has(name)) problems.push(`table 5 names ${name}, which is not a NovaTrail repository inbox reads`);
  }
  return { fresh, coming, gone, problems };
}

const short = (sha) => sha.slice(0, 7);
const excerpt = (text) => (text.length > 200 ? `${text.slice(0, 199)}…` : text);

// The lines inbox prints.
export function report({ fresh, coming, gone }, count) {
  const lines = [`inbox: ${count} repositories read; ${fresh.length} new on main, ${coming.length} on the way, ${gone.length} to leave table 5`];
  if (fresh.length) {
    lines.push("new on main — record, or bring to the author:");
    for (const r of fresh) lines.push(`  ${r.repository} В${r.number} (RUN.md:${r.line}, main ${short(r.sha)}): ${excerpt(r.text)}`);
  }
  if (coming.length) {
    lines.push("on the way, in open pull requests — recorded only on the author's word:");
    for (const r of coming) lines.push(`  ${r.repository} В${r.number} (pull request #${r.pull} "${r.title}", ${short(r.sha)}, RUN.md:${r.line}): ${excerpt(r.text)}`);
  }
  if (gone.length) {
    lines.push("in table 5, but no longer marked for spec at the source — the row can leave:");
    for (const r of gone) lines.push(`  ${r.repository} В${r.number}`);
  }
  return lines;
}
