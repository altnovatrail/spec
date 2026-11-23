// Each test reads made-up run/QUESTIONS.md files, and GitHub through a stand-in for gh:
// none goes to the network. runGh itself runs node in place of gh.

import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, fingerprintOf, ledgerOf, parseNumbers, QUESTIONS, readRepository, report, rowsForSpec, runGh } from "../inbox.mjs";
import { inbox, OTHERS } from "../main.mjs";
import { dueOf } from "../due.mjs";

// The two dates of docs/measurements.md, and a day before both.
const DATED = "Next measurement: by 2026-12-12.\n\nNext check of Claude Code's changelog: by 2027-02-12.\n";
const dated = { measurementsSource: DATED, today: new Date("2026-11-12T10:00:00Z") };

const HEADER = "| ID | Question | From | Options | Recommendation |\n|---|---|---|---|---|";
const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);
const D = "d".repeat(40);

// A repository's run/QUESTIONS.md, its table 3 holding the rows given; below it a table 4 with a row
// marked for spec, which is not a question and is never read.
function questions(...rows) {
  return [
    "# Questions to the author — table 3 of the plan of api",
    "",
    "## Table 3. Questions to the author",
    "",
    HEADER,
    ...rows,
    "",
    "## Table 4. Technical debt",
    "",
    "| ID | Debt | From | Risk | When to return |\n|---|---|---|---|---|",
    "| Д1 | «В реестр spec»: a debt, not a question | T01 | — | — |",
    "",
  ].join("\n");
}

const rowsOf = (source) => rowsForSpec(source, QUESTIONS);

const row = (n, text) => `| В${n} | «В реестр spec»: ${text} | T01 | — | — |`;

// spec's run/INBOX.md with table 5 holding the rows given.
function spec(...rows) {
  return ["# Rows of other repositories recorded in spec", "", "## Table 5. Rows of other repositories recorded in spec", "", "| Repository | Rows | Fingerprint | Where answered |\n|---|---|---|---|", ...rows, ""].join("\n");
}

// A stand-in for gh over { name: { sha, questions, pulls: [{ number, title, sha, base, files,
// questions }] } }, a missing `base` being main, and `questions` the run/QUESTIONS.md of commits — a
// map of commits in the repository's, the text of its head in a pull request's —, which is not there
// where it is not given; no other file is. Lists come in two pages, as --paginate --slurp gives
// them; a pull request whose files are null cannot be read, and the questions "502" cannot be read
// either.
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
    const ref = /^contents\/run\/QUESTIONS\.md\?ref=(\w+)$/u.exec(tail)?.[1];
    const asked = { ...repository.questions };
    for (const p of repository.pulls) asked[p.sha] = p.questions;
    const text = ref && asked[ref];
    if (text === "502") throw new Error(`gh api ${endpoint}: HTTP 502`);
    if (text !== undefined) return text;
    throw new Error(`gh api ${endpoint}: HTTP 404`);
  };
}

test("the rows marked for spec, whatever the mark's case, quotes and spaces, at the start of the question and only in table 3", () => {
  const rows = rowsOf(
    questions(
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
  const [one, two] = rowsOf(questions(row(5, "раскладка релиза"), row(6, "перенос")));
  const print = fingerprintOf([one, two]);
  assert.match(print, /^[0-9a-f]{12}$/u);
  assert.equal(fingerprintOf([two, one]), print);
  // Its place in the file, its white space and its Markdown marks are no change of the row.
  const moved = rowsOf(questions("| В0 | Своё | T01 | — | — |", "| В5 | «В реестр spec»:  **раскладка**   релиза | T01 | — | — |", row(6, "перенос")));
  assert.equal(fingerprintOf(moved), print);
  // A word in any cell is.
  assert.notEqual(fingerprintOf(rowsOf(questions(row(5, "раскладка релиза"), "| В6 | «В реестр spec»: перенос | T01 | — | (а) |"))), print);
  assert.notEqual(fingerprintOf([one]), print);
});

test("a file with no table 3, or a row with no number, holds nothing for spec", () => {
  assert.deepEqual(rowsOf("# Questions\n\nNothing.\n"), []);
  assert.deepEqual(rowsOf(questions("| — | «В реестр spec» без номера | T01 | — | — |")), []);
});

test("table 3 and table 5 are read under their English headings alone", () => {
  const source = questions(row(2, "a row of a plan in English"));
  assert.deepEqual(rowsOf(source).map((r) => r.number), [2]);
  assert.deepEqual([...ledgerOf(spec("| `api` | В1 | — | R80 |")).ledger.get("api")], [1]);
  // A heading in Russian, or another table's, holds nothing for spec.
  assert.deepEqual(rowsOf(source.replace("## Table 3. Questions to the author", "## Таблица 3. Вопросы автору без ответа")), []);
  assert.deepEqual(rowsOf(source.replace("## Table 3.", "## Table 2.")), []);
  const russian = spec("| `api` | В1 | — | R80 |").replace("## Table 5. Rows of other repositories recorded in spec", "## Таблица 5. Строки других репозиториев, записанные в `spec`");
  assert.equal(ledgerOf(russian).ledger.size, 0);
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
    'run/INBOX.md:9: the fingerprint of a row of table 5 is 12 hexadecimal digits, or — while it has none: "Д66"',
    'run/INBOX.md:10: a row of table 5 names no repository or no rows В: "app | все | — | Д68"',
  ]);
  assert.equal(ledgerOf("# Inbox\n").ledger.size, 0);
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
  const rows = rowsOf(questions(row(5, "записана"), row(6, "тоже записана"), row(7, "одна")));
  const both = fingerprintOf(rows.slice(0, 2));
  const repositories = [{ name: "api", main: { sha: A, rows }, pulls: [] }];
  const ledger = new Map([["api", new Set([5, 6, 7, 9])]]);
  const entry = (list, numbers, fingerprint, line) => ({ repository: "api", list, numbers, fingerprint, line });
  const result = compare(repositories, ledger, ["api"], [entry("В5–В6", [5, 6], both, 20), entry("В7", [7], null, 21), entry("В9", [9], "0123456789ab", 22)]);
  assert.deepEqual(result.changed, [{ repository: "api", list: "В7", line: 21, sha: A, file: QUESTIONS, lines: [rows[2].line], recorded: null, fingerprint: fingerprintOf([rows[2]]) }]);
  // A row edited at the source; and one that left it, whose rest no longer has the fingerprint.
  const edited = rowsOf(questions(row(5, "записана, с дополнением"), row(6, "тоже записана")));
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
      fresh: [{ repository: "api", number: 6, sha: A, file: "run/QUESTIONS.md", line: 12, text: long }],
      coming: [{ repository: "app", number: 11, pull: 13, title: "T03", sha: C, file: "run/QUESTIONS.md", line: 14, text: "на подходе" }],
      changed: [
        { repository: "api", list: "В5–В6", line: 20, sha: B, file: "run/QUESTIONS.md", lines: [11, 12], recorded: "0123456789ab", fingerprint: "ba9876543210" },
        { repository: "app", list: "В7", line: 21, sha: D, file: "run/QUESTIONS.md", lines: [13], recorded: null, fingerprint: "00112233aabb" },
      ],
      gone: [{ repository: "tutor", number: 33 }],
    },
    12,
  );
  assert.deepEqual(lines, [
    "inbox: 12 repositories read; 1 new on main, 1 on the way, 2 changed since recorded, 1 to leave table 5",
    "new on main — record, or bring to the author:",
    `  api В6 (run/QUESTIONS.md:12, main aaaaaaa): ${"x".repeat(199)}…`,
    "on the way, in open pull requests — recorded only on the author's word:",
    '  app В11 (pull request #13 "T03", ccccccc, run/QUESTIONS.md:14): на подходе',
    "changed on main since table 5 recorded them — read the rows again, record what is new, then write the fingerprint in table 5:",
    "  api В5–В6 (table 5 at run/INBOX.md:20; its run/QUESTIONS.md:11–12, main bbbbbbb): 0123456789ab → ba9876543210",
    "  app В7 (table 5 at run/INBOX.md:21; its run/QUESTIONS.md:13, main ddddddd): — → 00112233aabb",
    "in table 5, but no longer marked for spec at the source — the row can leave:",
    "  tutor В33",
  ]);
  assert.deepEqual(report({ fresh: [], coming: [], gone: [] }, 12), ["inbox: 12 repositories read; 0 new on main, 0 on the way, 0 changed since recorded, 0 to leave table 5"]);
});

test("table 3 is read from run/QUESTIONS.md alone, once a commit: a pull request adds the rows its merge base with main has not", () => {
  const calls = [];
  const old = "e".repeat(40);
  const older = "0".repeat(40);
  const gh = fakeGh({
    api: {
      sha: A,
      questions: { [A]: questions(row(6, "раскладка релиза")), [old]: questions(row(3, "закрыта на main с тех пор")) },
      pulls: [
        { number: 13, title: "T04", sha: C, files: ["docs/architecture.md", QUESTIONS], questions: questions(row(6, "раскладка релиза"), row(8, "перенос")) },
        { number: 9, title: "Bump devcontainers/base", sha: D, files: [".devcontainer/Dockerfile"], questions: questions(row(2, "давно записана")) },
        { number: 7, title: "T02, ветка давняя", sha: B, base: old, files: [QUESTIONS], questions: questions(row(3, "закрыта на main с тех пор"), row(10, "своя")) },
        // A branch cut before run/: its merge base has no run/QUESTIONS.md, so what it adds cannot
        // be told — a row main closed since would look new —, and it is to be rebased.
        { number: 11, title: "T01, ветка до run/", sha: "1".repeat(40), base: older, files: ["RUN.md", QUESTIONS], questions: questions(row(6, "раскладка релиза"), row(12, "с давней ветки")) },
        // One that changes RUN.md alone adds nothing, whatever its RUN.md holds.
        { number: 6, title: "T03", sha: "2".repeat(40), files: ["RUN.md"] },
        { number: 5, title: "не читается", sha: "f".repeat(40), files: null },
        { number: 4, title: "не читается", sha: "3".repeat(40), files: [QUESTIONS], questions: "502" },
        // Its head without run/QUESTIONS.md: a read that fails.
        { number: 3, title: "без таблицы", sha: "4".repeat(40), files: [QUESTIONS] },
        // Whose merge base is that head: the read failed once, and fails here too, from the cache.
        { number: 2, title: "на ветке без таблицы", sha: "5".repeat(40), base: "4".repeat(40), files: [QUESTIONS], questions: questions(row(14, "своя")) },
      ],
    },
  });
  const read = readRepository("api", (args) => {
    calls.push(args.filter((a) => a.startsWith("repos/")).join(" "));
    return gh(args);
  });
  assert.equal(read.main.sha, A);
  assert.deepEqual(
    read.main.rows.map((r) => [r.number, r.file]),
    [[6, QUESTIONS]],
  );
  assert.deepEqual(
    read.pulls.map((p) => [p.number, p.rows.map((r) => [r.number, r.file])]),
    [
      [13, [[8, QUESTIONS]]],
      [9, []],
      [7, [[10, QUESTIONS]]],
      [6, []],
    ],
  );
  assert.deepEqual(read.problems, [
    `cannot read pull request #11 of api — its merge base ${older.slice(0, 7)} has no run/QUESTIONS.md: rebase it on main`,
    "cannot read pull request #5 of api — gh api repos/altnovatrail/api/pulls/5/files?per_page=100: HTTP 502",
    `cannot read pull request #4 of api — gh api repos/altnovatrail/api/contents/run/QUESTIONS.md?ref=${"3".repeat(40)}: HTTP 502`,
    `cannot read pull request #3 of api — gh api repos/altnovatrail/api/contents/run/QUESTIONS.md?ref=${"4".repeat(40)}: HTTP 404`,
    `cannot read pull request #2 of api — its merge base ${"4".repeat(7)} has no run/QUESTIONS.md: rebase it on main`,
  ]);
  assert.deepEqual(calls.slice(0, 3), ["repos/altnovatrail/api/commits/main", `repos/altnovatrail/api/contents/run/QUESTIONS.md?ref=${A}`, "repos/altnovatrail/api/pulls?state=open&per_page=100"]);
  // Each commit is read once — main is the merge base of #13 too —, and RUN.md never.
  const contents = calls.filter((c) => c.includes("/contents/"));
  assert.deepEqual(contents, [...new Set(contents)]);
  assert.equal(contents.filter((c) => c.endsWith(`ref=${A}`)).length, 1);
  assert.equal(calls.some((c) => c.includes("contents/RUN.md")), false);
  const done = inbox({ ...dated, names: ["api"], ledgerSource: spec("| `api` | В6 | — | Д67 |"), gh });
  assert.equal(done.status, 2);
  assert.ok(done.lines.includes(`  api В6 (table 5 at run/INBOX.md:7; its run/QUESTIONS.md:7, main aaaaaaa): — → ${fingerprintOf(read.main.rows)}`), done.lines.join("\n"));
  assert.ok(done.lines.some((l) => l.startsWith("  api В10 (pull request #7")), done.lines.join("\n"));
  assert.equal(done.lines.some((l) => l.startsWith("  api В12 ")), false, "a pull request cut before run/ adds nothing");
  assert.equal(done.lines.some((l) => l.startsWith("  api В6 (pull request")), false);
});

test("inbox reads every other repository, and says what it could not read", () => {
  assert.equal(OTHERS.includes("spec"), false);
  assert.ok(OTHERS.includes("api") && OTHERS.includes(".github"));
  const repositories = {
    api: { sha: A, questions: { [A]: questions(row(5, "записана"), row(6, "новая")) }, pulls: [] },
    app: { sha: B, questions: { [B]: questions() }, pulls: [] },
    // Main without run/QUESTIONS.md is a repository that cannot be read, not one with no rows.
    sim: { sha: C, pulls: [] },
  };
  const print = fingerprintOf(rowsOf(questions(row(5, "записана"))));
  const done = inbox({ ...dated, names: ["api", "app"], ledgerSource: spec(`| \`api\` | В5 | ${print} | Д67 |`), gh: fakeGh(repositories) });
  assert.equal(done.status, 0);
  assert.deepEqual(done.lines.slice(0, 2), ["inbox: 2 repositories read; 1 new on main, 0 on the way, 0 changed since recorded, 0 to leave table 5", "new on main — record, or bring to the author:"]);
  const unprinted = inbox({ ...dated, names: ["api"], ledgerSource: spec("| `api` | В5 | — | Д67 |"), gh: fakeGh(repositories) });
  assert.equal(unprinted.status, 0);
  assert.equal(unprinted.lines.at(-1), `  api В5 (table 5 at run/INBOX.md:7; its run/QUESTIONS.md:7, main aaaaaaa): — → ${print}`);
  const unreadable = inbox({ ...dated, names: ["api"], ledgerSource: spec("| `api` | что-то | — | Д67 |"), gh: fakeGh(repositories) });
  assert.equal(unreadable.status, 1);
  assert.match(unreadable.lines.at(-1), /a row of table 5 names no repository or no rows В/u);
  const partly = inbox({ ...dated, names: ["api", "infra"], ledgerSource: spec("| `infra` | В2 | — | Т-29 |"), gh: fakeGh(repositories) });
  assert.equal(partly.status, 2);
  assert.deepEqual(partly.lines.slice(0, 1), ["inbox: 1 repositories read; 2 new on main, 0 on the way, 0 changed since recorded, 0 to leave table 5"]);
  assert.equal(partly.lines.at(-1), "inbox: cannot read infra — gh api repos/altnovatrail/infra/commits/main: HTTP 404");
  const missing = inbox({ ...dated, names: ["sim"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(missing.status, 2);
  assert.equal(missing.lines.at(-1), `inbox: cannot read sim — gh api repos/altnovatrail/sim/contents/run/QUESTIONS.md?ref=${C}: HTTP 404`);
});

test("runGh gives what the program printed, or throws with what it said", () => {
  assert.equal(runGh(["-e", "process.stdout.write('ok')"], process.execPath), "ok");
  assert.throws(() => runGh(["-e", "process.stderr.write('HTTP 404'); process.exit(1)"], process.execPath), /HTTP 404$/u);
  assert.throws(() => runGh(["-e", "process.exit(3)"], process.execPath), /exit 3$/u);
  assert.throws(() => runGh([], "/nonexistent/gh"), /\/nonexistent\/gh.*ENOENT/u);
  assert.throws(() => runGh(["-e", "setTimeout(() => {}, 10000)"], process.execPath, 200), /ETIMEDOUT/u);
});

test("inbox prints the monthly measurement and the check of the changelog once their dates have come", () => {
  const repositories = { app: { sha: B, questions: { [B]: questions() }, pulls: [] } };
  const quiet = inbox({ ...dated, names: ["app"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(quiet.status, 0);
  assert.equal(quiet.lines.some((l) => l.startsWith("due:")), false);
  const later = inbox({ ...dated, today: new Date("2026-12-12T00:00:00Z"), names: ["app"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(later.status, 0);
  assert.deepEqual(later.lines.filter((l) => l.startsWith("due:")), ["due: the monthly measurement of the sessions' tokens, by 2026-12-12"]);
  assert.equal(dueOf(DATED, new Date("2027-03-01T00:00:00Z")).due.length, 2);
  assert.deepEqual(dueOf(DATED.replace("2026-12-12", "2026-13-12"), new Date("2027-03-01T00:00:00Z")).problems, ['inbox: the section Keeping the savings of docs/measurements.md names "Next measurement: by 2026-13-12.", and 2026-13-12 is no date']);
  const undated = inbox({ ...dated, measurementsSource: "Next measurement: by 2026-12-12.\nNext measurement: by 2026-12-13.\n", names: ["app"], ledgerSource: spec(""), gh: fakeGh(repositories) });
  assert.equal(undated.status, 1);
  assert.deepEqual(undated.lines.filter((l) => l.includes("docs/measurements.md should")), [
    'inbox: the section Keeping the savings of docs/measurements.md should name "Next measurement: by YYYY-MM-DD." once, and names it 2 times',
    'inbox: the section Keeping the savings of docs/measurements.md should name "Next check of Claude Code\'s changelog: by YYYY-MM-DD." once, and names it 0 times',
  ]);
});
