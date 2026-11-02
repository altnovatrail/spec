// Each test reads made-up RUN.md files, and GitHub through a stand-in for gh: none goes to the
// network. runGh itself runs node in place of gh.

import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, ledgerOf, parseNumbers, readRepository, report, rowsForSpec, runGh } from "../inbox.mjs";
import { inbox, OTHERS } from "../main.mjs";

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
  return ["# RUN.md — план работ spec", "", "## Таблица 5. Строки других репозиториев, записанные в `spec`", "", "| Репозиторий | Строки | Где ответ |\n|---|---|---|", ...rows, ""].join("\n");
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
  const { ledger, problems } = ledgerOf(spec("| `api` | В1–В3 | Д62 |", "| `api` | В5 | Д67; R80 |", "| `tutor` | В33 | не для `spec` |", "| `app` | все | Д68 |"));
  assert.deepEqual([...ledger.get("api")], [1, 2, 3, 5]);
  assert.deepEqual([...ledger.get("tutor")], [33]);
  assert.equal(ledger.has("app"), false);
  assert.deepEqual(problems, ['RUN.md:10: a row of table 5 names no repository or no rows В: "app | все | Д68"']);
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
  assert.deepEqual(result.problems, ["table 5 names site, which is not a NovaTrail repository inbox reads"]);
  assert.deepEqual(compare(repositories, new Map([["modules", new Set([1])]])).problems, ["table 5 names modules, which is not a NovaTrail repository inbox reads"]);
});

test("the report names each row with its place, and cuts a long question", () => {
  const long = "x".repeat(250);
  const lines = report(
    {
      fresh: [{ repository: "api", number: 6, sha: A, line: 12, text: long }],
      coming: [{ repository: "app", number: 11, pull: 13, title: "T03", sha: C, line: 14, text: "на подходе" }],
      gone: [{ repository: "tutor", number: 33 }],
    },
    12,
  );
  assert.deepEqual(lines, [
    "inbox: 12 repositories read; 1 new on main, 1 on the way, 1 to leave table 5",
    "new on main — record, or bring to the author:",
    `  api В6 (RUN.md:12, main aaaaaaa): ${"x".repeat(199)}…`,
    "on the way, in open pull requests — recorded only on the author's word:",
    '  app В11 (pull request #13 "T03", ccccccc, RUN.md:14): на подходе',
    "in table 5, but no longer marked for spec at the source — the row can leave:",
    "  tutor В33",
  ]);
  assert.deepEqual(report({ fresh: [], coming: [], gone: [] }, 12), ["inbox: 12 repositories read; 0 new on main, 0 on the way, 0 to leave table 5"]);
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
  const done = inbox({ names: ["api", "app"], ledgerSource: spec("| `api` | В5 | Д67 |"), gh: fakeGh(repositories) });
  assert.equal(done.status, 0);
  assert.deepEqual(done.lines.slice(0, 2), ["inbox: 2 repositories read; 1 new on main, 0 on the way, 0 to leave table 5", "new on main — record, or bring to the author:"]);
  const unreadable = inbox({ names: ["api"], ledgerSource: spec("| `api` | что-то | Д67 |"), gh: fakeGh(repositories) });
  assert.equal(unreadable.status, 1);
  assert.match(unreadable.lines.at(-1), /a row of table 5 names no repository or no rows В/u);
  const partly = inbox({ names: ["api", "infra"], ledgerSource: spec("| `infra` | В2 | Т-29 |"), gh: fakeGh(repositories) });
  assert.equal(partly.status, 2);
  assert.deepEqual(partly.lines.slice(0, 1), ["inbox: 1 repositories read; 2 new on main, 0 on the way, 0 to leave table 5"]);
  assert.equal(partly.lines.at(-1), "inbox: cannot read infra — gh api repos/altnovatrail/infra/commits/main: HTTP 404");
});

test("runGh gives what the program printed, or throws with what it said", () => {
  assert.equal(runGh(["-e", "process.stdout.write('ok')"], process.execPath), "ok");
  assert.throws(() => runGh(["-e", "process.stderr.write('HTTP 404'); process.exit(1)"], process.execPath), /HTTP 404$/u);
  assert.throws(() => runGh(["-e", "process.exit(3)"], process.execPath), /exit 3$/u);
  assert.throws(() => runGh([], "/nonexistent/gh"), /\/nonexistent\/gh.*ENOENT/u);
  assert.throws(() => runGh(["-e", "setTimeout(() => {}, 10000)"], process.execPath, 200), /ETIMEDOUT/u);
});
