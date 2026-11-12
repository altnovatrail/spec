// Each test reads made-up RUN.md files, and GitHub through a stand-in for gh: none goes to the
// network. runGh itself runs node in place of gh.

import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, fingerprintOf, ledgerOf, parseNumbers, readRepository, report, rowsForSpec, runGh } from "../inbox.mjs";
import { inbox, OTHERS } from "../main.mjs";
import { dueOf } from "../due.mjs";

// measurements 1.9 with its two dates, and a day before both.
const DATED = "Next measurement: by 2026-12-12.\n\nNext check of Claude Code's changelog: by 2027-02-12.\n";
const dated = { measurementsSource: DATED, today: new Date("2026-11-12T10:00:00Z") };

const HEADER = "| ID | Вопрос | Откуда | Варианты | Рекомендация |\n|---|---|---|---|---|";
const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);
const D = "d".repeat(40);

// A RUN.md whose table 3 holds the rows given, and whose table 4 holds a row marked for spec,
// which is not a question and is never read.
function run(...rows) {
  return [
    "# RUN.md — план работ api",
    "",
    "## Таблица 3. Вопросы автору без ответа",
    "",
    HEADER,
    ...rows,
    "",
    "## Таблица 4. Технический долг",
    "",
    "| ID | Долг | Откуда | Чем грозит | Когда вернуться |\n|---|---|---|---|---|",
    "| Д1 | «В реестр spec»: долг, а не вопрос | T01 | — | — |",
    "",
  ].join("\n");
}

const row = (n, text) => `| В${n} | «В реестр spec»: ${text} | T01 | — | — |`;

// spec's RUN.md with table 5 holding the rows given.
function spec(...rows) {
  return ["# RUN.md — план работ spec", "", "## Таблица 5. Строки других репозиториев, записанные в `spec`", "", "| Репозиторий | Строки | Отпечаток | Где ответ |\n|---|---|---|---|", ...rows, ""].join("\n");
}

// A stand-in for gh over { name: { sha, run, runs, pulls: [{ number, title, sha, base, files, run }] } },
// a missing `base` being main and `runs` the RUN.md of other commits. Lists come in two pages, as
// --paginate --slurp gives them; a pull request whose files are null cannot be read.
function fakeGh(repositories) {
  return (args) => {
    const endpoint = args.find((a) => a.startsWith("repos/"));
    const [, , name, ...rest] = endpoint.split("/");
    const repository = repositories[name];
    if (!repository) throw new Error(`gh api ${endpoint}: HTTP 404`);
    const tail = rest.join("/");
    const twoPages = (list) => JSON.stringify([list.slice(0, 1), list.slice(1)]);
    if (tail === "commits/main") return `${repository.sha}\n`;
    if (tail.startsWith("pulls?")) return twoPages(repository.pulls.map((p) => ({ number: p.number, title: p.title, head: { sha: p.sha } })));
    const files = /^pulls\/(\d+)\/files\?per_page=100$/u.exec(tail)?.[1];
    if (files) {
      const pull = repository.pulls.find((p) => p.number === Number(files));
      if (!pull.files) throw new Error(`gh api ${endpoint}: HTTP 502`);
      return twoPages(pull.files.map((filename) => ({ filename })));
    }
    const head = /^compare\/main\.\.\.(\w+)$/u.exec(tail)?.[1];
    if (head) return `${repository.pulls.find((p) => p.sha === head).base ?? repository.sha}\n`;
    const ref = /^contents\/RUN\.md\?ref=(\w+)$/u.exec(tail)?.[1];
    const runs = { [repository.sha]: repository.run, ...repository.runs };
    for (const p of repository.pulls) runs[p.sha] = p.run;
    if (ref in runs) return runs[ref];
    throw new Error(`gh api ${endpoint}: HTTP 404`);
  };
}

test("the rows marked for spec, whatever the mark's case, quotes and spaces, at the start of the question and only in table 3", () => {
  const rows = rowsForSpec(
    run(
      "| В1 | «В реестр spec», к П-17: как   ребёнок \t не попадёт | T01 | а; б | а |",
      "| В2 | **В реестр spec.** Лимит трат | T03 | — | — |",
      "| В3 | Своё, не для spec | T04 | — | — |",
      "| В4 | Свой порядок задач | T05 | — | (б): T03 потом отправит «в реестр spec» |",
      "| В5 | Как стоит T03. Её итог уйдёт «в реестр spec» | T06 | — | — |",
      "| В6 | “в  реестр spec”: типографские кавычки | T07 | — | — |",
      "| В7 | В реестр spec: неразрывный пробел | T08 | — | — |",
    ),
  );
  assert.deepEqual(
    rows.map((r) => [r.number, r.text]),
    [
      [1, "«В реестр spec», к П-17: как ребёнок не попадёт"],
      [2, "В реестр spec. Лимит трат"],
      [6, "“в реестр spec”: типографские кавычки"],
      [7, "В реестр spec: неразрывный пробел"],
    ],
  );
  assert.equal(rows[0].line, 7);
  assert.deepEqual(rows[0].cells, ["В1", "«В реестр spec», к П-17: как ребёнок не попадёт", "T01", "а; б", "а"]);
});

test("a fingerprint is of every cell of the rows, in the order of their numbers, and of nothing else", () => {
  const [one, two] = rowsForSpec(run(row(5, "раскладка релиза"), row(6, "перенос")));
  const print = fingerprintOf([one, two]);
  assert.match(print, /^[0-9a-f]{12}$/u);
  assert.equal(fingerprintOf([two, one]), print);
  // Its place in the file, its white space and its Markdown marks are no change of the row.
  const moved = rowsForSpec(run("| В0 | Своё | T01 | — | — |", "| В5 | «В реестр spec»:  **раскладка**   релиза | T01 | — | — |", row(6, "перенос")));
  assert.equal(fingerprintOf(moved), print);
  // A word in any cell is.
  assert.notEqual(fingerprintOf(rowsForSpec(run(row(5, "раскладка релиза"), "| В6 | «В реестр spec»: перенос | T01 | — | (а) |"))), print);
  assert.notEqual(fingerprintOf([one]), print);
});

test("a RUN.md with no table 3, or a row with no number, holds nothing for spec", () => {
  assert.deepEqual(rowsForSpec("# RUN.md\n\nНичего.\n"), []);
  assert.deepEqual(rowsForSpec(run("| — | «В реестр spec» без номера | T01 | — | — |")), []);
});

test("numbers, ranges and lists of rows В", () => {
  assert.deepEqual(parseNumbers("В7"), [7]);
  assert.deepEqual(parseNumbers("В7–В10"), [7, 8, 9, 10]);
  assert.deepEqual(parseNumbers("В7-В8, В12; В14–15"), [7, 8, 12, 14, 15]);
  assert.equal(parseNumbers("В9–В7"), null);
  assert.equal(parseNumbers("Д7"), null);
  assert.equal(parseNumbers(""), null);
});

test("table 5 gives each repository its numbers, and names a row it cannot read", () => {
  const { ledger, entries, problems } = ledgerOf(
    spec("| `api` | В1–В3 | 0123456789ab | Д62 |", "| `api` | В5 | — | Д67; R80 |", "| `tutor` | В33 | Д66 | не для `spec` |", "| `app` | все | — | Д68 |"),
  );
  assert.deepEqual([...ledger.get("api")], [1, 2, 3, 5]);
  assert.deepEqual([...ledger.get("tutor")], [33]);
  assert.equal(ledger.has("app"), false);
  assert.deepEqual(
    entries.map((e) => [e.repository, e.list, e.numbers, e.fingerprint, e.line]),
    [
      ["api", "В1–В3", [1, 2, 3], "0123456789ab", 7],
      ["api", "В5", [5], null, 8],
      ["tutor", "В33", [33], null, 9],
    ],
  );
  assert.deepEqual(problems, [
    'RUN.md:9: the fingerprint of a row of table 5 is 12 hexadecimal digits, or — while it has none: "Д66"',
    'RUN.md:10: a row of table 5 names no repository or no rows В: "app | все | — | Д68"',
  ]);
  assert.equal(ledgerOf("# RUN.md\n").ledger.size, 0);
});

test("compare: new on main, on the way, and what can leave table 5", () => {
  const repositories = [
    { name: "tutor", main: { sha: B, rows: [{ number: 33, text: "старая", line: 9 }] }, pulls: [] },
    {
      name: "api",
      main: {
        sha: A,
        rows: [
          { number: 5, text: "записана", line: 11 },
          { number: 6, text: "новая", line: 12 },
        ],
      },
      pulls: [
        {
          number: 13,
          title: "T04",
          sha: C,
          rows: [
            { number: 8, text: "на подходе", line: 14 },
            { number: 9, text: "записана с ветки по слову автора", line: 15 },
          ],
        },
      ],
    },
  ];
  const ledger = new Map([
    ["api", new Set([4, 5, 9])],
    ["tutor", new Set([33])],
    ["modules", new Set([1])],
    ["site", new Set([1])],
  ]);
  const result = compare(repositories, ledger, ["api", "modules", "tutor"]);
  assert.deepEqual(
    result.fresh.map((r) => [r.repository, r.number]),
    [["api", 6]],
  );
  assert.deepEqual(
    result.coming.map((r) => [r.repository, r.number, r.pull]),
    [["api", 8, 13]],
  );
  assert.deepEqual(
    result.gone.map((r) => [r.repository, r.number]),
    [["api", 4]],
  );
  assert.deepEqual(result.changed, []);
  assert.deepEqual(result.problems, ["table 5 names site, which is not a NovaTrail repository inbox reads"]);
  assert.deepEqual(compare(repositories, new Map([["modules", new Set([1])]])).problems, ["table 5 names modules, which is not a NovaTrail repository inbox reads"]);
});

test("compare: rows of table 5 whose rows on main changed, or have no fingerprint yet", () => {
  const rows = rowsForSpec(run(row(5, "записана"), row(6, "тоже записана"), row(7, "одна")));
  const both = fingerprintOf(rows.slice(0, 2));
  const repositories = [{ name: "api", main: { sha: A, rows }, pulls: [] }];
  const ledger = new Map([["api", new Set([5, 6, 7, 9])]]);
  const entry = (list, numbers, fingerprint, line) => ({ repository: "api", list, numbers, fingerprint, line });
  const result = compare(repositories, ledger, ["api"], [entry("В5–В6", [5, 6], both, 20), entry("В7", [7], null, 21), entry("В9", [9], "0123456789ab", 22)]);
  assert.deepEqual(result.changed, [{ repository: "api", list: "В7", line: 21, sha: A, lines: [rows[2].line], recorded: null, fingerprint: fingerprintOf([rows[2]]) }]);
  // A row edited at the source; and one that left it, whose rest no longer has the fingerprint.
  const edited = rowsForSpec(run(row(5, "записана, с дополнением"), row(6, "тоже записана")));
  const again = compare([{ name: "api", main: { sha: B, rows: edited }, pulls: [] }], ledger, ["api"], [entry("В5–В6", [5, 6], both, 20)]);
  assert.deepEqual(
    again.changed.map((c) => [c.list, c.recorded, c.fingerprint, c.lines]),
    [["В5–В6", both, fingerprintOf(edited), [edited[0].line, edited[1].line]]],
  );
  const left = compare([{ name: "api", main: { sha: B, rows: rows.slice(1, 2) }, pulls: [] }], ledger, ["api"], [entry("В5–В6", [5, 6], both, 20)]);
  assert.deepEqual(
    left.changed.map((c) => [c.list, c.fingerprint]),
    [["В5–В6", fingerprintOf(rows.slice(1, 2))]],
  );
  assert.deepEqual(
    left.gone.map((g) => g.number),
    [5, 7, 9],
  );
});

test("the report names each row with its place, and cuts a long question", () => {
  const long = "x".repeat(250);
  const lines = report(
    {
      fresh: [{ repository: "api", number: 6, sha: A, line: 12, text: long }],
      coming: [{ repository: "app", number: 11, pull: 13, title: "T03", sha: C, line: 14, text: "на подходе" }],
      changed: [
        { repository: "api", list: "В5–В6", line: 20, sha: B, lines: [11, 12], recorded: "0123456789ab", fingerprint: "ba9876543210" },
        { repository: "app", list: "В7", line: 21, sha: D, lines: [13], recorded: null, fingerprint: "00112233aabb" },
      ],
      gone: [{ repository: "tutor", number: 33 }],
    },
    12,
  );
  assert.deepEqual(lines, [
    "inbox: 12 repositories read; 1 new on main, 1 on the way, 2 changed since recorded, 1 to leave table 5",
    "new on main — record, or bring to the author:",
    `  api В6 (RUN.md:12, main aaaaaaa): ${"x".repeat(199)}…`,
    "on the way, in open pull requests — recorded only on the author's word:",
    '  app В11 (pull request #13 "T03", ccccccc, RUN.md:14): на подходе',
    "changed on main since table 5 recorded them — read the rows again, record what is new, then write the fingerprint in table 5:",
    "  api В5–В6 (table 5 at RUN.md:20; its RUN.md:11–12, main bbbbbbb): 0123456789ab → ba9876543210",
    "  app В7 (table 5 at RUN.md:21; its RUN.md:13, main ddddddd): — → 00112233aabb",
    "in table 5, but no longer marked for spec at the source — the row can leave:",
    "  tutor В33",
  ]);
  assert.deepEqual(report({ fresh: [], coming: [], gone: [] }, 12), ["inbox: 12 repositories read; 0 new on main, 0 on the way, 0 changed since recorded, 0 to leave table 5"]);
});

test("a pull request adds the rows its merge base with main has not, each RUN.md read once", () => {
  const calls = [];
  const old = "e".repeat(40);
  const gh = fakeGh({
    api: {
      sha: A,
      run: run(row(6, "раскладка релиза")),
      runs: { [old]: run(row(3, "закрыта на main с тех пор")) },
      pulls: [
        { number: 13, title: "T04", sha: C, files: ["docs/architecture.md", "RUN.md"], run: run(row(6, "раскладка релиза"), row(8, "перенос")) },
        { number: 9, title: "Bump devcontainers/base", sha: D, files: [".devcontainer/Dockerfile"], run: run(row(2, "давно записана")) },
        { number: 7, title: "T02, ветка давняя", sha: B, base: old, files: ["RUN.md"], run: run(row(3, "закрыта на main с тех пор"), row(10, "своя")) },
        { number: 5, title: "не читается", sha: "f".repeat(40), files: null, run: "" },
      ],
    },
  });
  const read = readRepository("api", (args) => {
    calls.push(args.filter((a) => a.startsWith("repos/")).join(" "));
    return gh(args);
  });
  assert.equal(read.main.sha, A);
  assert.deepEqual(
    read.main.rows.map((r) => r.number),
    [6],
  );
  assert.deepEqual(
    read.pulls.map((p) => [p.number, p.rows.map((r) => r.number)]),
    [
      [13, [8]],
      [9, []],
      [7, [10]],
    ],
  );
  assert.deepEqual(read.problems, ["cannot read pull request #5 of api — gh api repos/altnovatrail/api/pulls/5/files?per_page=100: HTTP 502"]);
  assert.equal(calls.filter((c) => c === `repos/altnovatrail/api/contents/RUN.md?ref=${A}`).length, 1);
  assert.deepEqual(calls.slice(0, 3), ["repos/altnovatrail/api/commits/main", `repos/altnovatrail/api/contents/RUN.md?ref=${A}`, "repos/altnovatrail/api/pulls?state=open&per_page=100"]);
});

test("inbox reads every other repository, and says what it could not read", () => {
  assert.equal(OTHERS.includes("spec"), false);
  assert.ok(OTHERS.includes("api") && OTHERS.includes(".github"));
  const repositories = {
    api: { sha: A, run: run(row(5, "записана"), row(6, "новая")), pulls: [] },
    app: { sha: B, run: run(), pulls: [] },
  };
  const print = fingerprintOf(rowsForSpec(run(row(5, "записана"))));
  const done = inbox({ ...dated, names: ["api", "app"], ledgerSource: spec(`| \`api\` | В5 | ${print} | Д67 |`), gh: fakeGh(repositories) });
  assert.equal(done.status, 0);
  assert.deepEqual(done.lines.slice(0, 2), ["inbox: 2 repositories read; 1 new on main, 0 on the way, 0 changed since recorded, 0 to leave table 5", "new on main — record, or bring to the author:"]);
  const unprinted = inbox({ ...dated, names: ["api"], ledgerSource: spec("| `api` | В5 | — | Д67 |"), gh: fakeGh(repositories) });
  assert.equal(unprinted.status, 0);
  assert.equal(unprinted.lines.at(-1), `  api В5 (table 5 at RUN.md:7; its RUN.md:7, main aaaaaaa): — → ${print}`);
  const unreadable = inbox({ ...dated, names: ["api"], ledgerSource: spec("| `api` | что-то | — | Д67 |"), gh: fakeGh(repositories) });
  assert.equal(unreadable.status, 1);
  assert.match(unreadable.lines.at(-1), /a row of table 5 names no repository or no rows В/u);
  const partly = inbox({ ...dated, names: ["api", "infra"], ledgerSource: spec("| `infra` | В2 | — | Т-29 |"), gh: fakeGh(repositories) });
  assert.equal(partly.status, 2);
  assert.deepEqual(partly.lines.slice(0, 1), ["inbox: 1 repositories read; 2 new on main, 0 on the way, 0 changed since recorded, 0 to leave table 5"]);
  assert.equal(partly.lines.at(-1), "inbox: cannot read infra — gh api repos/altnovatrail/infra/commits/main: HTTP 404");
});

test("runGh gives what the program printed, or throws with what it said", () => {
  assert.equal(runGh(["-e", "process.stdout.write('ok')"], process.execPath), "ok");
  assert.throws(() => runGh(["-e", "process.stderr.write('HTTP 404'); process.exit(1)"], process.execPath), /HTTP 404$/u);
  assert.throws(() => runGh(["-e", "process.exit(3)"], process.execPath), /exit 3$/u);
  assert.throws(() => runGh([], "/nonexistent/gh"), /\/nonexistent\/gh.*ENOENT/u);
  assert.throws(() => runGh(["-e", "setTimeout(() => {}, 10000)"], process.execPath, 200), /ETIMEDOUT/u);
});

test("inbox prints the monthly measurement and the check of the changelog once their dates have come", () => {
  const repositories = { app: { sha: B, run: run(), pulls: [] } };
  const quiet = inbox({ ...dated, names: ["app"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(quiet.status, 0);
  assert.equal(quiet.lines.some((l) => l.startsWith("due:")), false);
  const later = inbox({ ...dated, today: new Date("2026-12-12T00:00:00Z"), names: ["app"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(later.status, 0);
  assert.deepEqual(later.lines.filter((l) => l.startsWith("due:")), ["due: the monthly measurement of the sessions' tokens, by 2026-12-12 (measurements 1.9; RUN.md, rule 13)"]);
  assert.equal(dueOf(DATED, new Date("2027-03-01T00:00:00Z")).due.length, 2);
  assert.deepEqual(dueOf(DATED.replace("2026-12-12", "2026-13-12"), new Date("2027-03-01T00:00:00Z")).problems, ['inbox: measurements 1.9 names "Next measurement: by 2026-13-12.", and 2026-13-12 is no date']);
  const undated = inbox({ ...dated, measurementsSource: "Next measurement: by 2026-12-12.\nNext measurement: by 2026-12-13.\n", names: ["app"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(undated.status, 1);
  assert.deepEqual(undated.lines.filter((l) => l.includes("measurements 1.9 should")), [
    'inbox: measurements 1.9 should name "Next measurement: by YYYY-MM-DD." once, and names it 2 times',
    'inbox: measurements 1.9 should name "Next check of Claude Code\'s changelog: by YYYY-MM-DD." once, and names it 0 times',
  ]);
});
