// Each test breaks one thing in a trial copy of fixtures/base — or of fixtures/component, a
// repository of its own with a copy of the base as its spec/ — and expects docs-check to name it.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { check } from "../main.mjs";
import { componentProfile, specProfile } from "../config.mjs";
import { readBudgets } from "../budgets.mjs";
import { GIT } from "../../shared.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(here, "fixtures", "base");
const component = path.join(here, "fixtures", "component");
const main = path.join(here, "..", "main.mjs");

// A copy of the base fixture with each [file, from, to] edit applied; `to` null deletes the file,
// and `from` null writes `to` as a new file.
function trialCopy(edits = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-"));
  fs.cpSync(base, root, { recursive: true });
  applyEdits(root, edits);
  return root;
}

// A copy of the component fixture, with the base fixture and a RULES.md as its spec/ unless
// told otherwise, and the edits applied.
function componentCopy(edits = [], { spec = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-component-"));
  fs.cpSync(component, root, { recursive: true });
  if (spec) {
    fs.cpSync(base, path.join(root, "spec"), { recursive: true });
    fs.writeFileSync(path.join(root, "spec", "RULES.md"), "# Rules\n");
  }
  applyEdits(root, edits);
  return root;
}

function applyEdits(root, edits) {
  for (const [file, from, to] of edits) {
    const target = path.join(root, file);
    if (to === null) {
      fs.rmSync(target);
      continue;
    }
    if (from === null) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, to);
      continue;
    }
    const text = fs.readFileSync(target, "utf8");
    assert.ok(text.includes(from), `the fixture ${file} has no "${from}"`);
    fs.writeFileSync(target, text.replace(from, () => to));
  }
}

async function errorsOf(edits) {
  const root = trialCopy(edits);
  try {
    return (await check(root)).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function expectOnly(edits, pattern, errorsFor = errorsOf) {
  const errors = await errorsFor(edits);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

async function componentErrors(edits, options) {
  const root = componentCopy(edits, options);
  try {
    return (await check(root, componentProfile(path.join(root, "spec")))).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const componentOnly = (edits, pattern) => expectOnly(edits, pattern, componentErrors);

test("the base fixture is green", async () => {
  assert.deepEqual(await errorsOf(), []);
});

// A copy of docs-check under dir/tools, as it lies in spec, so that run from there it checks dir;
// the path of its main.mjs. The fixture's budgets.json stays: spec's limits name spec's sections.
function toolsInto(dir) {
  const tools = path.join(dir, "tools");
  fs.mkdirSync(tools, { recursive: true });
  const own = path.dirname(main);
  fs.cpSync(own, path.join(tools, "docs-check"), { recursive: true, filter: (from) => !["test", "budgets.json"].includes(path.relative(own, from).split(path.sep)[0]) });
  fs.cpSync(path.join(here, "..", "..", "shared.mjs"), path.join(tools, "shared.mjs"));
  fs.symlinkSync(path.join(here, "..", "..", "node_modules"), path.join(tools, "node_modules"));
  // The copy's comments cite spec's log, not the fixture's: dir's budgets read no comments.
  const budgets = path.join(tools, "docs-check", "budgets.json");
  const limits = JSON.parse(fs.readFileSync(budgets, "utf8"));
  delete limits.spec.comments;
  fs.writeFileSync(budgets, JSON.stringify(limits));
  return path.join(tools, "docs-check", "main.mjs");
}

test("exit code: 0 when green, 1 with errors", () => {
  const root = trialCopy();
  try {
    const script = toolsInto(root);
    const green = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(green.status, 0, green.stdout + green.stderr);
    applyEdits(root, [["README.md", "(draft/)", "(drafts/)"]]);
    const red = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(red.status, 1);
    assert.match(red.stdout, /^README\.md:7: link drafts\/: drafts does not exist$/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a path on the command line is refused: the root is never taken from it", () => {
  const run = spawnSync(process.execPath, [main, base], { encoding: "utf8" });
  assert.equal(run.status, 2, run.stdout + run.stderr);
  assert.match(run.stderr, /the only argument is --component/);
});

test("a broken link", async () => {
  await expectOnly([["docs/product.md", "(decisions.md)", "(decision.md)"]], /^docs\/product\.md:3: link decision\.md: docs\/decision\.md does not exist$/);
});

test("a link that leaves the repository", async () => {
  await expectOnly([["draft/README.md", "(../docs/)", "(../../docs/)"]], /leads outside the repository/);
});

test("a broken anchor", async () => {
  await expectOnly([["README.md", "#журнал-решений", "#журнал"]], /docs\/decisions\.md has no heading with the anchor #журнал$/);
});

test("a section that does not exist", async () => {
  await expectOnly([["docs/architecture.md", "(repositories 8;", "(repositories 7;"]], /^docs\/architecture\.md:7: docs\/repositories\.md has no section 7$/);
});

test("a section in a list and in a range", async () => {
  await expectOnly([["docs/repositories.md", "architecture 3, 3.6", "architecture 3, 3.7"]], /has no section 3\.7$/);
  await expectOnly([["docs/concepts.md", "в разделе 2.", "в разделах 1–3."]], /docs\/concepts\.md has no section 3$/);
  // The last number of a range is a section even when a word follows it, and a count after a comma
  // is not one (T124 measured "measurements 1.1–1.99 records" passing).
  const range = (text) => [["docs/architecture.md", "(repositories 8; privacy 9)", `(repositories 8; privacy 9; ${text})`]];
  await expectOnly(range("product 13.1–13.9 records"), /^docs\/architecture\.md:\d+: docs\/product\.md has no section 13\.9$/);
  await expectOnly(range("product 13–14 модулей"), /docs\/product\.md has no section 14$/);
  assert.deepEqual(await errorsOf(range("product 13.1–13.2 records, 14 модулей")), []);
  assert.deepEqual(await errorsOf(range("sections 9–11 of the license")), []);
  // A range after a comma or «и» before a word is a count, as a number there is.
  assert.deepEqual(await errorsOf(range("product 13, 10–12 модулей; product 13 и 2–3 недели")), []);
  await expectOnly(range("product 1, 13–14"), /docs\/product\.md has no section 14$/);
  // "sections 9–11 in SB 297" are a law's, as "of the license" is another text's.
  assert.deepEqual(await errorsOf(range("sections 9–11 in SB 297")), []);
  await expectOnly(range("sections 3–4 here"), /docs\/architecture\.md has no section 4$/);
});

test("dpia N is a section of docs/dpia.md, the DPIA", async () => {
  await expectOnly(
    [
      ["docs/dpia.md", null, "# DPIA\n\n## 6. Риски и меры\n"],
      ["docs/privacy.md", "как П-5 canvas-api (раздел 9) |", "как П-5 canvas-api (раздел 9); риски — dpia 6 и dpia 7 |"],
    ],
    /^docs\/privacy\.md:\d+: docs\/dpia\.md has no section 7$/,
  );
});

test("sources N and measurements N are sections of docs/sources.md and docs/measurements.md", async () => {
  const files = [
    ["docs/sources.md", null, "# Источники\n\n## 1. Как вести\n\n### 1.1. Запись\n"],
    ["docs/measurements.md", null, "# Замеры\n\n## 1. Сессии\n"],
  ];
  const cite = (text) => ["docs/privacy.md", "как П-5 canvas-api (раздел 9) |", `как П-5 canvas-api (раздел 9); ${text} |`];
  assert.deepEqual(await errorsOf([...files, cite("источник — sources 1.1, замер — measurements 1")]), []);
  await expectOnly([...files, cite("источник — sources 1.2")], /^docs\/privacy\.md:\d+: docs\/sources\.md has no section 1\.2$/);
  await expectOnly([...files, cite("замер — measurements 2")], /^docs\/privacy\.md:\d+: docs\/measurements\.md has no section 2$/);
});

test("«раздел N» after a link means that document's section", async () => {
  await expectOnly([["docs/repositories.md", "раздел 9 |", "раздел 8 |"]], /docs\/privacy\.md has no section 8$/);
});

test("«section N» in a file without sections means the document linked before it", async () => {
  await expectOnly([["README.md", "in section 13", "in section 14"]], /^README\.md:5: docs\/product\.md has no section 14$/);
});

test("a section of something else — «раздел 3 лицензии» — is not checked", async () => {
  assert.deepEqual(await errorsOf([["docs/decisions.md", "раздел 3 лицензии", "раздел 99 лицензии"]]), []);
});

test("a citation of MathTrail's documents is not checked", async () => {
  assert.deepEqual(await errorsOf([["docs/product.md", "product 5.4 и 8 canvas-api", "product 55 и 88 canvas-api"]]), []);
});

test("a number missing from the register", async () => {
  const errors = await errorsOf([["docs/decisions.md", "**R02. Второе решение.** Как R38 canvas-api.", "Пусто."]]);
  assert.ok(errors.some((e) => /^docs\/decisions\.md:1: R02 is missing/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /R02 does not exist/.test(e)), errors.join("\n"));
});

test("a number defined twice", async () => {
  const errors = await errorsOf([["docs/privacy.md", "| П-1 | Согласие |", "| П-1 | Согласие | x | x |\n| П-1 | Повтор |"]]);
  assert.ok(errors.some((e) => /П-1 is defined twice/.test(e)), errors.join("\n"));
});

test("a register out of order", async () => {
  const rows = "| Т-1 | Первый | architecture 3, 3.6 |\n| Т-2 | Второй | [privacy.md](privacy.md), раздел 9 |";
  const swapped = rows.split("\n").reverse().join("\n");
  await expectOnly([["docs/repositories.md", rows, swapped]], /^docs\/repositories\.md:10: Т-1 comes after Т-2: the register goes in order$/);
});

// The base fixture has О-2 in 13.1 above О-1 in 13.2, and is green: decided questions move to 13.1.

test("a wrong next free number", async () => {
  await expectOnly([["docs/repositories.md", "следующий номер — Т-3", "следующий номер — Т-4"]], /^docs\/repositories\.md:5: the next free number is Т-4, but the last is Т-2: it should be Т-3$/);
});

test("no next free number", async () => {
  await expectOnly([["docs/decisions.md", " Следующий номер — R04.", ""]], /does not name the next free number/);
});

// The documents move to English (R143): the registers' openings and the citations read in English too.
test("the next free number in English", async () => {
  assert.deepEqual(await errorsOf([["docs/decisions.md", " Следующий номер — R04.", " Next number — R04."]]), []);
  assert.deepEqual(await errorsOf([["docs/repositories.md", "следующий номер — Т-3", "the next free number — Т-3"]]), []);
  // spec's tables are in English (R154), and a Russian opening still reads until every plan is.
  assert.deepEqual(await errorsOf([["run/QUESTIONS.md", "next — В4.", "следующий — В4."]]), []);
  // The English opening is read: a next free number below a row is named.
  await expectOnly([["run/QUESTIONS.md", "next — В4.", "next — В2."]], /^run\/QUESTIONS\.md:\d+: the next free number is В2, but В3 is in the table/);
  await expectOnly([["docs/decisions.md", " Следующий номер — R04.", " Next number — R05."]], /the next free number is R05, but the last is R03: it should be R04$/);
  const errors = await errorsOf([["docs/decisions.md", " Следующий номер — R04.", " Nextnumber — R04."]]);
  assert.ok(errors.some((e) => e.includes('does not name the next free number ("Next number — R04")')), errors.join("\n"));
});

test("sections cited in English: a list, a link before, and a section of another text", async () => {
  await expectOnly([["docs/concepts.md", "в разделе 2.", "in sections 1 and 3."]], /docs\/concepts\.md has no section 3$/);
  assert.deepEqual(await errorsOf([["docs/concepts.md", "в разделе 2.", "in section 3 of the license."]]), []);
});

test("a cited number that does not exist", async () => {
  await expectOnly([["docs/concepts.md", "R01–R03)", "R01–R03; R05)"]], /^docs\/concepts\.md:11: R05 does not exist \(docs\/decisions\.md\)$/);
});

test("every number of a range exists", async () => {
  assert.deepEqual(await errorsOf([["docs/concepts.md", "(Т-1 — Т-2;", "(Т-1 — Т-5;"]]), [
    "docs/concepts.md:11: Т-3 is the next free number, not an entry yet (docs/repositories.md)",
    "docs/concepts.md:11: Т-4 does not exist (docs/repositories.md)",
    "docs/concepts.md:11: Т-5 does not exist (docs/repositories.md)",
  ]);
});

test("the next free number cited as if it existed", async () => {
  await expectOnly([["docs/architecture.md", "privacy 9).", "privacy 9; П-2)."]], /П-2 is the next free number, not an entry yet/);
});

test("a number written without its zero", async () => {
  await expectOnly([["README.md", "Decision R02", "Decision R2"]], /^README\.md:8: R2: write R02$/);
});

test("other repositories' numbers are not checked", async () => {
  const edits = [
    ["README.md", '"R37 canvas-api"', '"R937 canvas-api"'],
    ["README.md", '"canvas-api: R37, R38"', '"canvas-api: R937, R938–R940"'],
    ["docs/architecture.md", "«R3 api»", "«R93 api»"],
    ["docs/product.md", "О-56 standalone", "О-956 standalone"],
    ["docs/concepts.md", "SPEC 2, R187", "SPEC 2, R9187"],
  ];
  assert.deepEqual(await errorsOf(edits), []);
});

test("a number after a list of another repository's citations is ours", async () => {
  await expectOnly([["docs/concepts.md", "R163 — не наши.", "R163; R09 — наш."]], /R09 does not exist/);
});

test("a number in the wrong script", async () => {
  await expectOnly([["docs/architecture.md", "(repositories 8;", "(Р01; repositories 8;"]], /Р01: a register number typed in the wrong script/);
  await expectOnly([["docs/architecture.md", "(repositories 8;", "(T-1; repositories 8;"]], /T-1: a register number typed in the wrong script/);
});

test("numbers in code are not citations", async () => {
  assert.deepEqual(await errorsOf([["docs/concepts.md", "`tools/x`", "`R99`"]]), []);
});

test("a broken diagram", async () => {
  await expectOnly([["docs/product.md", '--> b["урок"]', '--> b["урок"\n    -->']], /^docs\/product\.md:13: the Mermaid diagram does not parse: Parse error on line 4:/);
});

// Cases from the code review of T01.

test("a table under an unnumbered heading after a register is not in the register", async () => {
  const appendix = "\n## Приложение\n\n| ключ | значение |\n|---|---|\n| k | v |\n";
  const root = trialCopy();
  try {
    fs.appendFileSync(path.join(root, "docs/privacy.md"), appendix);
    assert.deepEqual((await check(root)).errors, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dates and counts after a section are not sections", async () => {
  const edits = [["docs/architecture.md", "(repositories 8; privacy 9)", "(repositories 8, 2026-10-19; privacy 9, 12 модулей; product 1 — 13 модулей)"]];
  assert.deepEqual(await errorsOf(edits), []);
});

test("a NovaTrail repository's name after a citation is its suffix, even where the phrase goes on", async () => {
  // "R03 modules сравнивает граф" is R03 of modules, and "R10 engine решил" R10 of engine: neither
  // is looked up in the own register (R32).
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Decision R02; R99 modules сравнивает граф, R98 engine решил, R97 app и R96 api, and"]]), []);
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Decision R02, architecture 9.9 canvas говорит, and"]]), []);
  // With the name in code, and in a list, too.
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Decision R02; R99 и R98 `modules` берут, and"]]), []);
  // An own number with no name after it is still looked up.
  await expectOnly([["README.md", "Decision R02 and", "Per R99: modules are data, and"]], /^README\.md:8: R99 does not exist/);
});

test("О-, П- and Т- are spec's wherever they are cited, so a NovaTrail name after one is prose", async () => {
  await expectOnly([["README.md", "Decision R02 and", "Decision R02; П-9 app показывает, and"]], /^README\.md:8: П-9 does not exist/);
  // A MathTrail repository's name still makes it another log's: no register here holds it.
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Decision R02; П-9 canvas-api, and"]]), []);
});

test("«(раздел N)» right after a link means that document's section", async () => {
  await expectOnly([["docs/repositories.md", "[privacy.md](privacy.md), раздел 9", "[privacy.md](privacy.md) (раздел 3)"]], /docs\/privacy\.md has no section 3$/);
});

test("«раздел N» followed by a word is still checked, unless the word names another text", async () => {
  await expectOnly([["docs/concepts.md", "Словарь — в разделе 2.", "Словарь описывает раздел 99 подробно."]], /docs\/concepts\.md has no section 99$/);
});

// Cases from the second round of the code review of T01.

test("a MathTrail list ends at a citation of our own documents", async () => {
  await expectOnly([["README.md", '"canvas-api: R37, R38"', '"canvas-api: R37, concepts 9, R02"']], /^README\.md:8: docs\/concepts\.md has no section 9$/);
  await expectOnly([["README.md", '"canvas-api: R37, R38"', '"canvas-api: R37, concepts 2, R99"']], /^README\.md:8: R99 does not exist/);
});

test("a repository name in code still marks a citation foreign: R3 `api`", async () => {
  assert.deepEqual(await errorsOf([["docs/architecture.md", "«R3 api»", "«R3 `api`»"]]), []);
});

test("«разделы 3 и 4 лицензии» is a section of another text", async () => {
  assert.deepEqual(await errorsOf([["docs/decisions.md", "раздел 3 лицензии", "разделы 33 и 44 лицензии"]]), []);
});

test("words that begin with «раздел» are not section citations", async () => {
  assert.deepEqual(await errorsOf([["docs/concepts.md", "Словарь — в разделе 2.", "Словарь — в разделе 2. Разделить 7 групп."]]), []);
});

test("Latin lookalikes beyond the register are names, not numbers: P-256, T-34", async () => {
  assert.deepEqual(await errorsOf([["docs/architecture.md", "(repositories 8;", "(P-256, T-34; repositories 8;"]]), []);
});

test("the script runs through a symlink", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-link-"));
  const root = trialCopy([["README.md", "(draft/)", "(drafts/)"]]);
  try {
    const link = path.join(dir, "docs-check");
    fs.symlinkSync(path.dirname(toolsInto(root)), link);
    const red = spawnSync(process.execPath, [path.join(link, "main.mjs")], { encoding: "utf8" });
    assert.equal(red.status, 1, red.stdout + red.stderr);
    assert.match(red.stdout, /^README\.md:7: link drafts\/: drafts does not exist$/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The tables of questions and debt: В in run/QUESTIONS.md and Д in run/DEBT.md (RUN.md, T18, T132
// and T165; R153).

test("a В defined twice", async () => {
  await expectOnly([["run/QUESTIONS.md", "| В3 | The third question |", "| В3 | The third question |\n| В3 | A repeat |"]], /^run\/QUESTIONS\.md:\d+: В3 is defined twice$/);
});

test("a next free В that is not above the table", async () => {
  await expectOnly([["run/QUESTIONS.md", "next — В4.", "next — В3."]], /^run\/QUESTIONS\.md:7: the next free number is В3, but В3 is in the table: it should be above every number in it$/);
});

test("a table of debt that names no next free number", async () => {
  await expectOnly([["run/DEBT.md", "Numbers are not reused: next — Д2.", "Numbers are not reused."]], /^run\/DEBT\.md:\d+: register Д: its opening does not name the next free number/);
});

test("a next free Д that is not above the table of debt", async () => {
  await expectOnly([["run/DEBT.md", "next — Д2.", "next — Д1."]], /^run\/DEBT\.md:\d+: the next free number is Д1, but Д1 is in the table/);
});

const debtTable = "# Debt\n\n## Table 4. Technical debt\n\nNumbers are not reused: next — Д2.\n\n| ID | Debt |\n|---|---|\n| Д1 | The first debt |\n";

test("spec's tables are in run/ alone: without run/DEBT.md, a table in DEBT.md or RUN.md is not read", async () => {
  const errors = [
    "RUN.md:3: link run/DEBT.md: run/DEBT.md does not exist",
    "run/DEBT.md:0: register Д: the file does not exist",
    'tools/docs-check/budgets.json:0: budgets: files "run/DEBT.md" names no file of the repository',
    'tools/docs-check/budgets.json:0: budgets: rows "run/DEBT.md" names no Markdown file of the repository',
  ];
  // The budgets of run/DEBT.md hold nothing without it, and say so (R145).
  assert.deepEqual(await errorsOf([["run/DEBT.md", null, null], ["DEBT.md", null, debtTable]]), errors);
  assert.deepEqual(await errorsOf([["run/DEBT.md", null, null], ["RUN.md", "(run/DEBT.md).\n", `(run/DEBT.md).\n\n${debtTable.slice("# Debt\n\n".length)}`]]), errors);
  assert.deepEqual(await errorsOf([["run/QUESTIONS.md", null, null]]), ["RUN.md:3: link run/QUESTIONS.md: run/QUESTIONS.md does not exist", "run/QUESTIONS.md:0: register В: the file does not exist"]);
});

test("a table written back where it once lived, beside its file in run/, is a second copy", async () => {
  const table4 = "\n## Table 4. Technical debt\n\n| ID | Debt |\n|---|---|\n| Д2 | A new debt in the wrong place |\n";
  await expectOnly([["RUN.md", "(run/DEBT.md).\n", `(run/DEBT.md).\n${table4}`]], /^RUN\.md:\d+: register Д: its table is in run\/DEBT\.md, and this one under «Table 4\. …» is a second copy$/);
  await expectOnly([["DEBT.md", null, debtTable]], /^DEBT\.md:3: register Д: its table is in run\/DEBT\.md, and this one under «Table 4\. …» is a second copy$/);
  const table3 = "\n## Table 3. Questions to the author\n\n| ID | Question |\n|---|---|\n";
  await expectOnly([["RUN.md", "(run/DEBT.md).\n", `(run/DEBT.md).\n${table3}`]], /^RUN\.md:\d+: register В: its table is in run\/QUESTIONS\.md, and this one under «Table 3\. …» is a second copy$/);
});

test("«раздел N» right after a link outside the repository is that text's section", async () => {
  assert.deepEqual(await errorsOf([["docs/concepts.md", "Словарь — в разделе 2.", "Словарь — [чужой](https://example.org/x.md), раздел 99."]]), []);
  assert.deepEqual(await errorsOf([["docs/concepts.md", "Словарь — в разделе 2.", "Словарь — как `docs/spec.md` canvas-api, раздел 99."]]), []);
});

// A repository of its own: its documents, and its citations of spec against its spec/ (T18).

test("a repository of its own: the base component is green", async () => {
  assert.deepEqual(await componentErrors(), []);
});

test("a gap in the repository's own log", async () => {
  const log = "> Записей пока нет. Следующий номер — R01.";
  const errors = await componentErrors([["docs/decisions.md", log, "> Следующий номер — R04.\n\n**R01. Первое.** Да.\n\n**R03. Третье.** Да."]]);
  assert.ok(errors.some((e) => /^docs\/decisions\.md:1: R02 is missing/.test(e)), errors.join("\n"));
});

test("a link into spec/ that does not exist, and an anchor in spec/ that does not", async () => {
  await componentOnly([["README.md", "(spec/docs/product.md)", "(spec/docs/produkt.md)"]], /^README\.md:\d+: link spec\/docs\/produkt\.md: spec\/docs\/produkt\.md does not exist$/);
  await componentOnly([["README.md", "#журнал-решений", "#журнал"]], /spec\/docs\/decisions\.md has no heading with the anchor #журнал$/);
});

test("a number of spec's that is not on its tag", async () => {
  await componentOnly([["README.md", "R02 spec,", "R09 spec,"]], /^README\.md:\d+: R09 does not exist \(spec\/docs\/decisions\.md\)$/);
});

test("a section of spec's that does not exist, also at the end of a list", async () => {
  await componentOnly([["docs/architecture.md", "architecture 3.6 spec", "architecture 3.7 spec"]], /spec\/docs\/architecture\.md has no section 3\.7$/);
  await componentOnly([["docs/architecture.md", "concepts 2, 2.1 spec", "concepts 2, 2.2 spec"]], /spec\/docs\/concepts\.md has no section 2\.2$/);
  await componentOnly(
    [
      ["spec/docs/dpia.md", null, "# DPIA\n\n## 6. Риски и меры\n"],
      ["docs/architecture.md", "вопросы — product 13 spec.", "вопросы — product 13 spec; риски — dpia 6 spec и dpia 7 spec."],
    ],
    /spec\/docs\/dpia\.md has no section 7$/,
  );
});

test("a repository's own sources and measurements, and spec's", async () => {
  const own = (text) => ["docs/architecture.md", "Свои разделы — architecture 2.1.", `Свои разделы — architecture 2.1; ${text}.`];
  const files = [
    ["docs/sources.md", null, "# Источники\n\n## 1. Поставщики\n\n### 1.1. Запись\n"],
    ["spec/docs/sources.md", null, "# Источники\n\n## 1. Как вести\n\n## 2. Поставщики\n"],
    ["spec/docs/measurements.md", null, "# Замеры\n\n## 1. Сессии\n\n### 1.5. Порядок работы\n"],
  ];
  assert.deepEqual(await componentErrors([...files, own("источник — sources 1.1, у spec — sources 2 spec; замер — measurements 1.5 spec")]), []);
  await componentOnly([...files, own("источник — sources 1.2")], /^docs\/architecture\.md:\d+: docs\/sources\.md has no section 1\.2$/);
  await componentOnly([...files, own("у spec — sources 3 spec")], /spec\/docs\/sources\.md has no section 3$/);
  // A repository that has no docs/measurements.md yet: a bare citation is of spec's, without the suffix.
  await componentOnly([...files, own("замер — measurements 1")], /: "[^"]*": measurements is spec's document; cite it as "measurements 1 spec"$/);
  await componentOnly([own("источник — sources 2")], /: "[^"]*": sources is spec's document; cite it as "sources 2 spec"$/);
});

test("spec's document cited without the suffix", async () => {
  await componentOnly([["docs/architecture.md", "concepts 2, 2.1 spec", "concepts 2"]], /"concepts 2[^"]*": concepts is spec's document; cite it as "concepts 2 spec"$/);
});

test("the repository's own sections: bare, and «раздел N» in its RUN.md", async () => {
  await componentOnly([["docs/architecture.md", "architecture 2.1.", "architecture 2.2."]], /^docs\/architecture\.md:\d+: docs\/architecture\.md has no section 2\.2$/);
  await componentOnly([["RUN.md", "раздел 2.1", "раздел 2.9"]], /^RUN\.md:\d+: docs\/architecture\.md has no section 2\.9$/);
});

test("an open question is spec's wherever it is cited", async () => {
  await componentOnly([["README.md", "Т-2,", "Т-9,"]], /^README\.md:\d+: Т-9 does not exist \(spec\/docs\/repositories\.md\)$/);
});

test("an example taken out of code is checked as a citation", async () => {
  await componentOnly([["README.md", "`R01`", "R01"]], /R01 is the next free number, not an entry yet \(docs\/decisions\.md\)$/);
});

test("the repository's table of debt: a Д defined twice in run/DEBT.md", async () => {
  await componentOnly([["run/DEBT.md", "next — Д1.\n\n| ID | Debt |\n|---|---|\n", "next — Д2.\n\n| ID | Debt |\n|---|---|\n| Д1 | A debt |\n| Д1 | A repeat |\n"]], /^run\/DEBT\.md:\d+: Д1 is defined twice$/);
});

// The places a repository's tables once lived, before R153: table 3 in its RUN.md, table 4 in its
// DEBT.md (T132) or in its RUN.md. Every repository has moved (T177): a table there is a second
// copy, and none is read in place of its file of run/.
const table3 = (rows = "") => `## Table 3. Questions to the author\n\nNumbers are not reused: next — В3.\n\n| ID | Question |\n|---|---|\n${rows}`;
const table4 = (rows = "") => `## Table 4. Technical debt\n\nNumbers are not reused: next — Д3.\n\n| ID | Debt |\n|---|---|\n${rows}`;
const inRun = (tables) => ["RUN.md", "долг — в [run/DEBT.md](run/DEBT.md).\n", `долг — в [run/DEBT.md](run/DEBT.md).\n\n${tables}`];

test("a repository's table left in RUN.md or DEBT.md beside its file of run/ is a second copy", async () => {
  await componentOnly([inRun(table3("| В9 | A copy |\n"))], /^RUN\.md:\d+: register В: its table is in run\/QUESTIONS\.md, and this one under «Table 3\. …» is a second copy$/);
  await componentOnly([inRun(table4("| Д9 | A copy |\n"))], /^RUN\.md:\d+: register Д: its table is in run\/DEBT\.md, and this one under «Table 4\. …» is a second copy$/);
  await componentOnly([["DEBT.md", null, `# Debt of the component\n\n${table4("| Д2 | A debt |\n")}`]], /^DEBT\.md:3: register Д: its table is in run\/DEBT\.md, and this one under «Table 4\. …» is a second copy$/);
  // A heading with no table under it is no copy.
  assert.deepEqual(await componentErrors([inRun("## Table 4. Technical debt\n\nThe table is in its own file.\n")]), []);
});

test("a repository in the old layout is not read from it: its file of run/ is named", async () => {
  const gone = (file) => [file, null, null];
  const link = (file) => `RUN.md:5: link ${file}: ${file} does not exist`;
  assert.deepEqual(await componentErrors([gone("run/QUESTIONS.md"), gone("run/DEBT.md"), inRun(`${table3("| В2 | A question |\n")}\n${table4("| Д2 | A debt |\n")}`)]), [
    link("run/QUESTIONS.md"),
    link("run/DEBT.md"),
    "run/DEBT.md:0: register Д: the file does not exist",
    "run/QUESTIONS.md:0: register В: the file does not exist",
  ]);
  assert.deepEqual(await componentErrors([gone("run/DEBT.md"), ["DEBT.md", null, `# Debt of the component\n\n${table4("| Д2 | A debt |\n")}`]]), [link("run/DEBT.md"), "run/DEBT.md:0: register Д: the file does not exist"]);
});

test("a repository whose run/DEBT.md is gone, with only the link left in RUN.md, is told of run/DEBT.md", async () => {
  const errors = await componentErrors([["run/DEBT.md", null, null]]);
  assert.deepEqual(errors, ["RUN.md:5: link run/DEBT.md: run/DEBT.md does not exist", "run/DEBT.md:0: register Д: the file does not exist"]);
});

test("the repository's tables: a В defined twice", async () => {
  await componentOnly([["run/QUESTIONS.md", "| В2 | The second, в реестр spec |", "| В2 | The second, в реестр spec |\n| В2 | A repeat |"]], /В2 is defined twice$/);
});

test("an empty spec/ is named, not taken for spec", async () => {
  const errors = await componentErrors([], { spec: false });
  assert.ok(errors.some((e) => /^spec:0: spec's documents are not there/.test(e)), errors.join("\n"));
});

test("--component refuses to run where spec is not a repository's submodule", () => {
  const run = spawnSync(process.execPath, [main, "--component"], { encoding: "utf8" });
  assert.equal(run.status, 2, run.stdout + run.stderr);
  assert.match(run.stderr, /--component runs from the spec\/ submodule of a NovaTrail repository/);
});

// Cases from the code review of T18.

test("a list of numbers takes the suffix after its last", async () => {
  await componentOnly([["README.md", "R02 spec, R01–R03 spec", "R02, R09 spec"]], /^README\.md:\d+: R09 does not exist \(spec\/docs\/decisions\.md\)$/);
});

test("a folder called spec deeper down is the repository's own, and checked", async () => {
  const root = componentCopy();
  try {
    fs.mkdirSync(path.join(root, "docs", "spec"));
    fs.writeFileSync(path.join(root, "docs", "spec", "README.md"), "# Schemas\n\n[x](nope.md)\n");
    const errors = (await check(root, componentProfile(path.join(root, "spec")))).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
    assert.deepEqual(errors, ["docs/spec/README.md:3: link nope.md: docs/spec/nope.md does not exist"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("«раздел N» after a link to an anchor is still checked", async () => {
  await expectOnly([["docs/concepts.md", "Словарь — в разделе 2.", "Словарь — [выше](#2-словарь), раздел 99."]], /docs\/concepts\.md has no section 99$/);
});

test("a NovaTrail name before «раздел N» is a word of prose, not another repository", async () => {
  await expectOnly([["docs/concepts.md", "Словарь — в разделе 2.", "Словарь — в приложении app, раздел 99."]], /docs\/concepts\.md has no section 99$/);
});

test("«раздел N spec» with no document of spec's to tell", async () => {
  await componentOnly([["RUN.md", "раздел 2.1", "раздел 2.1 spec"]], /a section of spec's document; cite it by name/);
});

test("a table is read under its English heading alone (R154; T177)", async () => {
  await expectOnly([["run/DEBT.md", "## Table 4. Technical debt", "## Таблица 4. Технический долг"]], /^run\/DEBT\.md:0: register Д: no heading «Table 4\. …» to hold it$/);
  await componentOnly([["run/QUESTIONS.md", "## Table 3. Questions to the author", "## Таблица 3. Вопросы автору без ответа"]], /^run\/QUESTIONS\.md:0: register В: no heading «Table 3\. …» to hold it$/);
  await expectOnly([["run/DEBT.md", "## Table 4. Technical debt", "## Table 5. Technical debt"]], /^run\/DEBT\.md:0: register Д: no heading «Table 4\. …» to hold it$/);
  // A table left where it once lived is a second copy, under its English heading or its Russian one.
  await expectOnly([["RUN.md", "(run/DEBT.md).\n", "(run/DEBT.md).\n\n## Таблица 4. Технический долг\n\n| ID | Долг |\n|---|---|\n| Д2 | Копия |\n"]], /^RUN\.md:\d+: register Д: its table is in run\/DEBT\.md, and this one under «Таблица 4\. …» is a second copy$/);
  await expectOnly([["RUN.md", "(run/DEBT.md).\n", "(run/DEBT.md).\n\n## Table 4. Technical debt\n\n| ID | Debt |\n|---|---|\n| Д2 | A copy |\n"]], /^RUN\.md:\d+: register Д: its table is in run\/DEBT\.md, and this one under «Table 4\. …» is a second copy$/);
  // A heading in Russian with no table under it is prose.
  assert.deepEqual(await errorsOf([["RUN.md", "(run/DEBT.md).\n", "(run/DEBT.md).\n\n## Таблица 4. Технический долг\n\nПереехала.\n"]]), []);
});

test("a table whose heading is gone is named", async () => {
  await componentOnly([["run/QUESTIONS.md", "## Table 3. Questions to the author", "## Questions"]], /^run\/QUESTIONS\.md:0: register В: no heading «Table 3\. …» to hold it$/);
});

// Cases from the second round of the code review of T18.

test("a spec citation in the wrong script is measured against spec's register", async () => {
  await componentOnly([["README.md", "R02 spec,", "Р03 spec,"]], /^README\.md:\d+: Р03: a register number typed in the wrong script/);
});

test("without its own log, the repository's numbers are not looked up in spec's", async () => {
  const errors = await componentErrors([["docs/decisions.md", "# Журнал решений компонента", null], ["README.md", "Its own log starts at", "Its own R02; its own log starts at"]]);
  assert.deepEqual(errors, ["docs/decisions.md:0: register R: the file does not exist"]);
});

test("«раздел N» in an item under one that links outside is that text's section", async () => {
  const edits = [["docs/architecture.md", "Пока пусто.", "- Источник — [SPEC.md](https://example.org/SPEC.md), ветка main:\n  - раздел 9 — цитата;\n  - mathtrail/mathtrail-standalone, раздел 8."]];
  assert.deepEqual(await componentErrors(edits), []);
});

test("the tables need no order: a row may stand above a lower number", async () => {
  assert.deepEqual(await componentErrors([["run/QUESTIONS.md", "| В2 | The second, в реестр spec |", "| В2 | The second, в реестр spec |\n| В1 | The first, back again |"]]), []);
});

test("--component runs from a repository's spec/ submodule and checks the repository", () => {
  const root = componentCopy();
  try {
    const tools = path.join(root, "spec", "tools");
    fs.mkdirSync(tools, { recursive: true });
    fs.cpSync(path.dirname(main), path.join(tools, "docs-check"), { recursive: true });
    fs.cpSync(path.join(here, "..", "..", "shared.mjs"), path.join(tools, "shared.mjs"));
    fs.symlinkSync(path.join(here, "..", "..", "node_modules"), path.join(tools, "node_modules"));
    const green = spawnSync(process.execPath, [path.join(tools, "docs-check", "main.mjs"), "--component"], { encoding: "utf8" });
    assert.equal(green.status, 0, green.stdout + green.stderr);
    assert.match(green.stdout, /^docs-check: ok — 6 files,/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Cases from В22 .github: a name that no prose has is a suffix wherever a word ends with it — and,
// since В5 sim, so is every NovaTrail name (R32).

test(".github and a hyphenated name are another repository's even when the phrase goes on", async () => {
  const edits = [["README.md", "Its own log starts at `R01`.", "Its own log starts at `R01`. R19 .github и его цитаты, R03 module-kit и его рецепты, R06 и R07 skill-map, architecture 9.9 .github и её тексты."]];
  assert.deepEqual(await componentErrors(edits), []);
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Per R99 .github and R98 `learner-model` and"]]), []);
});

test("a name that is also a word is a suffix wherever a word ends with it, as the others are", async () => {
  assert.deepEqual(await componentErrors([["README.md", "Its own log starts at `R01`.", "Its own log starts at `R01`. R03 canvas и его тесты, R10 engine решил."]]), []);
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Per R99 api and"]]), []);
  await expectOnly([["README.md", "Decision R02 and", "Per R99 apis and"]], /^README\.md:8: R99 does not exist/);
});

test("a hyphen that goes on is part of another word, not the name", async () => {
  await expectOnly([["README.md", "Decision R02 and", "Per R99 module-kit-like tools and"]], /^README\.md:8: R99 does not exist/);
});

// Which files are read: in a repository, those git tracks or does not ignore; elsewhere, all
// (В29 tutor; R32).

const brokenReport = "# Run\n\n[the sheets](nope.md)\n";

// The copy at root made a repository of its own, with the files named staged.
function inRepository(root, staged = []) {
  execFileSync(GIT, ["-C", root, "init", "--quiet", "--initial-branch=main"]);
  if (staged.length) execFileSync(GIT, ["-C", root, "add", "--", ...staged]);
  return root;
}

// samples/runs/report.md under root, with a broken link, and samples/ kept out of git.
function samplesOutOfGit(root) {
  fs.writeFileSync(path.join(root, ".gitignore"), "/samples/\n");
  fs.mkdirSync(path.join(root, "samples", "runs"), { recursive: true });
  fs.writeFileSync(path.join(root, "samples", "runs", "report.md"), brokenReport);
  return root;
}

test("in a repository, a folder that .gitignore keeps out is not read, and a document not committed yet is", async () => {
  const root = samplesOutOfGit(inRepository(trialCopy()));
  try {
    fs.writeFileSync(path.join(root, "docs", "new.md"), brokenReport);
    const errors = (await check(root)).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
    assert.deepEqual(errors, ["docs/new.md:3: link nope.md: docs/nope.md does not exist"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("in a repository, a tracked document deleted since is not read", async () => {
  const root = trialCopy();
  try {
    fs.writeFileSync(path.join(root, "docs", "gone.md"), brokenReport);
    inRepository(root, ["docs/gone.md"]);
    fs.rmSync(path.join(root, "docs", "gone.md"));
    assert.deepEqual((await check(root)).errors, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("in a component, samples/ out of git is not read, nor are the errors of spec/ the component's", async () => {
  const root = samplesOutOfGit(inRepository(componentCopy()));
  try {
    fs.appendFileSync(path.join(root, "spec", "docs", "product.md"), "\n[broken](nope.md)\n");
    assert.deepEqual((await check(root, componentProfile(path.join(root, "spec")))).errors, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a spec/ that is a repository of its own is read through git, and its ignored folders are not", async () => {
  const root = inRepository(componentCopy());
  try {
    const spec = samplesOutOfGit(inRepository(path.join(root, "spec")));
    // An anchor is checked only in a file that was read: read, this report would fail the link.
    fs.appendFileSync(path.join(root, "README.md"), "\n[the report](spec/samples/runs/report.md#nope)\n");
    assert.deepEqual((await check(root, componentProfile(spec))).errors, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a .git that git cannot read is named, and nothing else is checked", async () => {
  const root = trialCopy();
  try {
    fs.writeFileSync(path.join(root, ".git"), `gitdir: ${path.join(root, "gone")}\n`);
    const errors = (await check(root)).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /^\.git:0: git cannot list the repository's files: fatal: /);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a spec/ whose .git git cannot read is named", async () => {
  const root = componentCopy();
  try {
    fs.writeFileSync(path.join(root, "spec", ".git"), "gitdir: ../.git/modules/spec\n");
    const errors = (await check(root, componentProfile(path.join(root, "spec")))).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
    assert.ok(errors.some((e) => /^spec:0: git cannot list spec's files: fatal: /.test(e)), errors.join("\n"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("without a .git of its own, a draft is walked whole, its ignored folders too", async () => {
  await expectOnly([], /^samples\/runs\/report\.md:3: link nope\.md: samples\/runs\/nope\.md does not exist$/, async () => {
    const root = samplesOutOfGit(trialCopy());
    try {
      return (await check(root)).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test("in a repository, git runs without the fsmonitor hook that its config names", async () => {
  const root = inRepository(trialCopy());
  try {
    const marker = path.join(root, "hook-ran");
    const hook = path.join(root, "hook.sh");
    fs.writeFileSync(hook, `#!/bin/sh\necho ran > "${marker}"\nexit 1\n`, { mode: 0o755 });
    execFileSync(GIT, ["-C", root, "config", "core.fsmonitor", hook]);
    assert.deepEqual((await check(root)).errors, []);
    assert.equal(fs.existsSync(marker), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// The rules of .claude/rules/: front matter with paths that match files, and a link in CLAUDE.md
// (R143; measurements 1.5).

const rule = (paths = '  - "docs/**"\n', body = "# Docs\n\nSee [the product](../../docs/product.md).\n") => `---\npaths:\n${paths}---\n\n${body}`;
const claude = "# CLAUDE.md\n\nThe rule of the documents: [docs](.claude/rules/docs.md).\n";
const withRule = (text, edits = []) => [["CLAUDE.md", null, claude], [".claude/rules/docs.md", null, text], ...edits];

test("a rule with paths that match files, named in CLAUDE.md, is green and counted", async () => {
  const root = trialCopy(withRule(rule('  - "docs/**"\n  - "README.md"\n')));
  try {
    const { errors, stats } = await check(root);
    assert.deepEqual(errors, []);
    assert.equal(stats.rules, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a rule's paths may be a comma-separated string, as Claude Code reads them", async () => {
  assert.deepEqual(await errorsOf(withRule("---\npaths: docs/*.md, draft/**\n---\n\n# Docs\n")), []);
  // A brace group keeps its comma, and a comma at the end leaves no empty pattern.
  assert.deepEqual(await errorsOf(withRule("---\npaths: docs/*.{md,txt}, draft/**,\n---\n\n# Docs\n")), []);
});

test("a pattern is read as Claude Code reads it: a dot begins a name like any letter, / anchors at the root, no slash means any depth", async () => {
  const dotted = [[".github/workflows/ci.yml", null, "on: push\n"], ["tools/.npmrc", null, "x\n"], [".github/x.go", null, "package x\n"]];
  assert.deepEqual(await errorsOf(withRule(rule('  - ".github/**"\n  - "tools/**"\n  - "**/*.go"\n  - "/README.md"\n  - "*.md"\n'), dotted)), []);
  await expectOnly(withRule(rule('  - "/product.md"\n')), /paths: \/product\.md matches no file/);
});

test("a rule saved with a byte order mark keeps its front matter", async () => {
  assert.deepEqual(await errorsOf(withRule(`\uFEFF${rule()}`)), []);
});

test("a rule with no front matter loads in every session", async () => {
  await expectOnly(withRule("# Docs\n\nAlways.\n"), /^\.claude\/rules\/docs\.md:1: no front matter with paths: the rule loads in every session/);
});

test("a rule whose front matter is not YAML loads in every session", async () => {
  await expectOnly(withRule(rule('  - "docs/**\n')), /^\.claude\/rules\/docs\.md:2: the front matter is not YAML/);
});

test("a rule without paths, or with paths that are no list of patterns, loads in every session", async () => {
  await expectOnly(withRule("---\nname: docs\n---\n\n# Docs\n"), /^\.claude\/rules\/docs\.md:2: paths: not a list of patterns/);
  await expectOnly(withRule(rule("  - 3\n")), /paths: not a list of patterns/);
  await expectOnly(withRule("---\npaths: []\n---\n"), /paths: not a list of patterns/);
});

test("a pattern that matches no file is named on its line", async () => {
  await expectOnly(withRule(rule('  - "docs/**"\n  - "format/**"\n')), /^\.claude\/rules\/docs\.md:4: paths: format\/\*\* matches no file of the repository, so the rule never loads$/);
  // Its own entry, not the first line that holds its text.
  await expectOnly(withRule(rule('  - "*.md"\n  - "md"\n')), /^\.claude\/rules\/docs\.md:4: paths: md matches no file/);
});

test("a pattern matches any file, not only a document, and a file of the root by name", async () => {
  assert.deepEqual(await errorsOf(withRule(rule('  - "justfile"\n  - "**/*.go"\n'), [["justfile", null, "x:\n"], ["tools/a/b.go", null, "package b\n"]])), []);
});

test("a rule that CLAUDE.md does not name is named, and so is one with no CLAUDE.md at all", async () => {
  await expectOnly(withRule(rule(), [["CLAUDE.md", claude, "# CLAUDE.md\n"]]), /^\.claude\/rules\/docs\.md:1: CLAUDE\.md names no link to this rule/);
  await expectOnly([[".claude/rules/docs.md", null, rule()]], /CLAUDE\.md names no link to this rule/);
});

test("CLAUDE.md names a rule by any link the link check resolves to it, or from .claude/CLAUDE.md", async () => {
  const named = (text) => withRule(rule(), [["CLAUDE.md", claude, `# CLAUDE.md\n\n${text}\n`]]);
  assert.deepEqual(await errorsOf(named("[docs](/.claude/rules/docs.md) and [docs](./.claude/rules/../rules/docs.md#docs)")), []);
  assert.deepEqual(await errorsOf(withRule(rule(), [["CLAUDE.md", claude, null], [".claude/CLAUDE.md", null, "# CLAUDE.md\n\n[docs](rules/docs.md)\n"]])), []);
  // A link with a stray % is a link the rule check reads as the link check does, not a crash.
  const errors = await errorsOf(named("[docs](.claude/rules/docs.md) and [odd](docs/100%.md)"));
  assert.deepEqual(errors, ["CLAUDE.md:3: link docs/100%.md: docs/100%.md does not exist"]);
});

test("a rule's body is checked as a document, on the lines of the file", async () => {
  await expectOnly(withRule(rule(undefined, "# Docs\n\nSee [the product](../../docs/nope.md).\n")), /^\.claude\/rules\/docs\.md:8: link \.\.\/\.\.\/docs\/nope\.md: docs\/nope\.md does not exist$/);
  await expectOnly(withRule(rule(undefined, "# Docs\n\nAs R99 says.\n")), /^\.claude\/rules\/docs\.md:8: .*R99/);
});

test("in a repository, a pattern is matched against the files git lists, not those it ignores", async () => {
  const root = inRepository(trialCopy(withRule(rule('  - "docs/**"\n  - "build/**"\n'))));
  try {
    fs.writeFileSync(path.join(root, ".gitignore"), "/build/\n");
    fs.mkdirSync(path.join(root, "build"));
    fs.writeFileSync(path.join(root, "build", "out.txt"), "x\n");
    const errors = (await check(root)).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
    assert.deepEqual(errors, [".claude/rules/docs.md:4: paths: build/** matches no file of the repository, so the rule never loads"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a repository's rules are checked as spec's are", async () => {
  const body = "# Docs\n\nSee [the component](../../docs/architecture.md).\n";
  assert.deepEqual(await componentErrors(withRule(rule(undefined, body))), []);
  // Claude Code matches files under spec/ too, so a pattern into it is a pattern like any other.
  assert.deepEqual(await componentErrors(withRule(rule('  - "spec/docs/**"\n', body))), []);
  await componentOnly(withRule(rule('  - "spec/nope/**"\n', body)), /paths: spec\/nope\/\*\* matches no file/);
});

// Budgets of size (R145): the fixture's tools/docs-check/budgets.json holds 4 KB for RUN.md and
// run/DEBT.md, 2 KB for a rule, 1 KB for an entry and a section, 2 KB for product 13, 1 KB for a row
// of run/DEBT.md; and for a repository, 4 KB for RUN.md and run/TASKS.md, 1 KB for an entry, a
// section and a row of run/DEBT.md and of run/TASKS.md — a limit for rows of run/TASKS.md the real
// block does not set, here to hold the file's absence for rows as for files.

const filler = (n) => `\n\n${"z".repeat(n)}\n`;

test("a file over its budget names its size and its limit, and where the limit is", async () => {
  await expectOnly([["RUN.md", "# План\n", `# План${filler(4200)}`]], /^RUN\.md:1: 4,\d{3} bytes, over its budget of 4 KB \(4,096 bytes\) — tools\/docs-check\/budgets\.json$/);
  assert.deepEqual(await errorsOf([["RUN.md", "# План\n", `# План${filler(3000)}`]]), []);
});

test("a decision entry over its budget, to the next entry", async () => {
  await expectOnly([["docs/decisions.md", "Как R38 canvas-api.", `Как R38 canvas-api.${filler(1100)}`]], /^docs\/decisions\.md:11: R02: 1,\d{3} bytes, over its budget of 1 KB \(1,024 bytes\)/);
  assert.deepEqual(await errorsOf([["docs/decisions.md", "Как R38 canvas-api.", `Как R38 canvas-api.${filler(900)}`]]), []);
});

test("an entry with a limit of its own, by its number, and the others with theirs", async () => {
  const budgets = ["tools/docs-check/budgets.json", '"entry": 1,\n    "section"', '"entry": 1,\n    "entries": { "R02": 2 },\n    "section"'];
  const grow = (n) => ["docs/decisions.md", "Как R38 canvas-api.", `Как R38 canvas-api.${filler(n)}`];
  assert.deepEqual(await errorsOf([budgets, grow(1500)]), []);
  // By its number: `R2` is `R02`.
  assert.deepEqual(await errorsOf([[budgets[0], budgets[1], budgets[2].replace('"R02"', '"R2"')], grow(1500)]), []);
  await expectOnly([budgets, grow(2100)], /^docs\/decisions\.md:11: R02: 2,\d{3} bytes, over its budget of 2 KB \(2,048 bytes\) — tools\/docs-check\/budgets\.json$/);
  await expectOnly([budgets, ["docs/decisions.md", "так проще (раздел 3 лицензии).", `так проще (раздел 3 лицензии).${filler(1100)}`]], /^docs\/decisions\.md:9: R01: 1,\d{3} bytes, over its budget of 1 KB/);
  // A repository's docs-budgets.json names its own; a number not in the log is an error.
  await componentOnly([["docs-budgets.json", null, '{ "entries": { "R01": 3 } }\n']], /^docs-budgets\.json:0: budgets: entries "R01" names no entry of the decision log$/);
});

test("a section over its budget, to the next heading, and a section with a limit of its own", async () => {
  await expectOnly([["docs/product.md", "## 13. Открытые вопросы\n", `## 12. Ещё${filler(1100)}\n## 13. Открытые вопросы\n`]], /^docs\/product\.md:\d+: section 12: 1,\d{3} bytes, over its budget of 1 KB/);
  assert.deepEqual(await errorsOf([["docs/product.md", "Номера не меняются.", `Номера не меняются.${filler(1500)}`]]), []);
  await expectOnly([["docs/product.md", "Номера не меняются.", `Номера не меняются.${filler(2100)}`]], /^docs\/product\.md:\d+: section 13: 2,\d{3} bytes, over its budget of 2 KB/);
});

test("text under an unnumbered heading, and above the first heading, has the limit of a section", async () => {
  await expectOnly([["docs/product.md", "## 13. Открытые вопросы\n", `## Приложение${filler(1100)}\n## 13. Открытые вопросы\n`]], /^docs\/product\.md:\d+: under «Приложение»: 1,\d{3} bytes, over its budget of 1 KB/);
  await expectOnly([["docs/product.md", "# Продукт\n", `${"z".repeat(1100)}\n\n# Продукт\n`]], /^docs\/product\.md:1: above the first heading: 1,\d{3} bytes, over its budget of 1 KB/);
});

test("a limit of its own for a section that does not exist is an error", async () => {
  await expectOnly([["tools/docs-check/budgets.json", '"product 13"', '"product 14"']], /^tools\/docs-check\/budgets\.json:0: budgets: sections "product 14" names no numbered section/);
});

test("a rule over its budget, front matter and all", async () => {
  await expectOnly(withRule(rule(undefined, `# Docs${filler(2100)}`)), /^\.claude\/rules\/docs\.md:1: a rule: 2,\d{3} bytes, over its budget of 2 KB/);
});

test("a row of a table over its budget", async () => {
  await expectOnly([["run/DEBT.md", "| Д1 | The first debt |", `| Д1 | The first debt ${"z".repeat(1100)} |`]], /^run\/DEBT\.md:\d+: a row «Д1» — 1,\d{3} bytes, over its budget of 1 KB/);
});

test("budgets that are wrong are errors, not a check turned off", async () => {
  const file = "tools/docs-check/budgets.json";
  await expectOnly([[file, '"entry": 1,\n    "section"', '"entry": 0,\n    "section"']], /budgets\.json:0: budgets: entry is 0, not a whole number of KB above 0$/);
  await expectOnly([[file, '"rule": 2,', '"rule": 2, "rules": 2,']], /budgets\.json:0: budgets: unknown key "rules"$/);
  await expectOnly([[file, '"rows": { "run/DEBT.md": 1 },', '"rows": { "run/DEBT.md": 1.5 },']], /budgets: rows "run\/DEBT\.md" is 1\.5, not a whole number/);
  await expectOnly([[file, '"sections": { "product 13": 2 },', '"sections": [],']], /budgets: sections is not an object of limits$/);
  await expectOnly([[file, '"sections": { "product 13": 2 },', '"sections": { "product 13": 2 }, "entries": { "R02": 0 },']], /budgets: entries "R02" is 0, not a whole number of KB above 0$/);
  await expectOnly([[file, '"sections": { "product 13": 2 },', '"sections": { "product 13": 2 }, "entries": { "R9": 2 },']], /^tools\/docs-check\/budgets\.json:0: budgets: entries "R9" names no entry of the decision log$/);
  await expectOnly([[file, '"sections": { "product 13": 2 },', '"sections": { "product 13": 2 }, "entries": { "02": 2 },']], /budgets: entries "02" names no entry of the decision log$/);
  await expectOnly([[file, '"sections": { "product 13": 2 },', '"sections": { "product 13": 2 }, "entries": { "R02": 2, "R2": 2 },']], /budgets: entries "R02" and "R2" name one entry$/);
  await expectOnly([[file, '"repository"', '"repo"']], /budgets: unknown block "repo"$/);
  assert.deepEqual(await errorsOf([[file, '"spec"', '"spek"']]), ['tools/docs-check/budgets.json:0: budgets: unknown block "spek"', 'tools/docs-check/budgets.json:0: budgets: no block "spec"']);
  await expectOnly([[file, null, "null\n"]], /budgets\.json:0: budgets: not a JSON object$/);
  await expectOnly([[file, '"RUN.md": 4, "run/DEBT.md": 4', '"RUN.md": 4, "run/DEBT.MD": 4']], /budgets\.json:0: budgets: files "run\/DEBT\.MD" names no file of the repository$/);
  await expectOnly([[file, '"rows": { "run/DEBT.md": 1 },', '"rows": { "run/DEBT.md": 1, "debt.md": 1 },']], /budgets\.json:0: budgets: rows "debt\.md" names no Markdown file of the repository$/);
  await expectOnly([[file, "{", "{,"]], /budgets\.json:0: budgets: not JSON/);
  await expectOnly([[file, null, null]], /budgets\.json:0: budgets: the file is not there$/);
  await expectOnly([[file, null, null], [`${file}/x`, null, "{}"]], /budgets\.json:0: budgets: the file cannot be read: EISDIR$/);
});

test("a repository is checked only once it has docs-budgets.json, by spec's block and its own", async () => {
  const big = ["RUN.md", "# План компонента\n", `# План компонента${filler(4200)}`];
  assert.deepEqual(await componentErrors([big]), []);
  await componentOnly([big, ["docs-budgets.json", null, "{}\n"]], /^RUN\.md:1: 4,\d{3} bytes, over its budget of 4 KB \(4,096 bytes\) — spec\/tools\/docs-check\/budgets\.json$/);
  assert.deepEqual(await componentErrors([big, ["docs-budgets.json", null, '{ "files": { "RUN.md": 8 } }\n']]), []);
  await componentOnly([big, ["docs-budgets.json", null, '{ "files": { "RUN.md": 3 } }\n']], /over its budget of 3 KB \(3,072 bytes\) — docs-budgets\.json$/);
  await componentOnly([["docs-budgets.json", null, "[]\n"]], /^docs-budgets\.json:0: budgets: not a JSON object$/);
  // spec's block names the tables of run/ (R153, R155): run/TASKS.md, which a repository with no
  // task outside an epic does not have, holds nothing there and is no error, and its own file naming
  // it is one; any other table of run/ it lacks is an error.
  assert.deepEqual(await componentErrors([["docs-budgets.json", null, "{}\n"]]), []);
  await componentOnly([["docs-budgets.json", null, '{ "files": { "run/TASKS.md": 4 } }\n']], /^docs-budgets\.json:0: budgets: files "run\/TASKS\.md" names no file of the repository$/);
  await componentOnly([["docs-budgets.json", null, '{ "rows": { "run/TASKS.md": 4 } }\n']], /^docs-budgets\.json:0: budgets: rows "run\/TASKS\.md" names no Markdown file of the repository$/);
  await componentOnly([["run/DEBT.md", "next — Д1.\n\n| ID | Debt |\n|---|---|\n", `next — Д3.\n\n| ID | Debt |\n|---|---|\n| Д2 | ${"z".repeat(1100)} |\n`], ["docs-budgets.json", null, "{}\n"]], /^run\/DEBT\.md:\d+: a row «Д2» — 1,\d{3} bytes, over its budget of 1 KB \(1,024 bytes\) — spec\/tools\/docs-check\/budgets\.json$/);
  await componentOnly([["docs-budgets.json", null, "{}\n"], ["spec/tools/docs-check/budgets.json", '"files": { "RUN.md": 4, "run/TASKS.md": 4 },', '"files": { "RUN.md": 4, "run/EPICS.md": 4, "run/TASKS.md": 4 },']], /^spec\/tools\/docs-check\/budgets\.json:0: budgets: files "run\/EPICS\.md" names no file of the repository$/);
  // DEBT.md at the root is no table of the plan any more (T177): spec's block naming it is an error.
  await componentOnly([["docs-budgets.json", null, "{}\n"], ["spec/tools/docs-check/budgets.json", '"rows": { "run/DEBT.md": 1,', '"rows": { "DEBT.md": 1, "run/DEBT.md": 1,']], /^spec\/tools\/docs-check\/budgets\.json:0: budgets: rows "DEBT\.md" names no Markdown file of the repository$/);
  // Any other file of spec's block, or a path of the plan mistyped, is an error all the same.
  await componentOnly([["docs-budgets.json", null, "{}\n"], ["spec/tools/docs-check/budgets.json", '"files": { "RUN.md": 4, "run/TASKS.md": 4 },\n    "entry"', '"files": { "RUN.MD": 4, "run/TASKS.md": 4 },\n    "entry"']], /^spec\/tools\/docs-check\/budgets\.json:0: budgets: files "RUN\.MD" names no file of the repository$/);
  await componentOnly([["docs-budgets.json", null, "{}\n"], ["spec/tools/docs-check/budgets.json", '"rows": { "run/DEBT.md": 1, "run/TASKS.md": 1 }', '"rows": { "run/DEBT.MD": 1, "run/TASKS.md": 1 }']], /^spec\/tools\/docs-check\/budgets\.json:0: budgets: rows "run\/DEBT\.MD" names no Markdown file of the repository$/);
  // The repository's own decision log and sections, by the block "repository".
  await componentOnly([["docs-budgets.json", null, "{}\n"], ["docs/architecture.md", "Пока пусто.", `Пока пусто.${filler(1100)}`]], /^docs\/architecture\.md:\d+: section 3: 1,\d{3} bytes/);
});

// The numbers of decisions in comments of code (R32): the fixture's log holds R01–R03, and its
// block "spec" turns the check on.
test("a number of a decision in a comment names an entry of the log", async () => {
  const code = (file, text) => [file, null, text];
  await expectOnly([code("tools/a.mjs", "// Why (R09).\nconst a = 1;\n")], /^tools\/a\.mjs:1: R09 in a comment names no entry of the decision log \(docs\/decisions\.md\)$/);
  await expectOnly([code("tools/a.mjs", "const a = 1;\n/* one\n * R2 */\n")], /^tools\/a\.mjs:3: R2 in a comment: write R02$/);
  await expectOnly([code(".github/workflows/a.yml", "on: push\n# Why (R04).\n")], /^\.github\/workflows\/a\.yml:2: R04 in a comment names no entry/);
  await expectOnly([code("justfile", "a:\n    echo \"R09\" # R08\n")], /^justfile:2: R08 in a comment/);
  await expectOnly([code("x/Dockerfile", "# R07\nFROM a\n")], /^x\/Dockerfile:1: R07 in a comment/);
  await expectOnly([code("a.go", "package a\n\n// The anchor\n// (R05,\n// R03).\n")], /^a\.go:4: R05 in a comment/);
  const fine = [
    code("tools/a.mjs", "// (R01; R02 spec) R37 canvas-api, R03 api, `R99` and \"standalone: `x/y`, R163\".\nconst a = \"R99\"; const b = `R98 ${c}`;\n"),
    code("tools/b.ts", "// Code generated by a tool. DO NOT EDIT.\n// R99\n"),
    code("a.sh", "echo \"# R99\"\n"),
    code("a.md", "Not code: R03.\n"),
    code("a.json", '{ "R99": 1 }\n'),
  ];
  assert.deepEqual(await errorsOf(fine), []);
  // Without the switch nothing is read; a switch that is not true or false is an error.
  const off = ["tools/docs-check/budgets.json", '"rows": { "run/DEBT.md": 1 },\n    "comments": true', '"rows": { "run/DEBT.md": 1 }'];
  assert.deepEqual(await errorsOf([off, code("tools/a.mjs", "// R09\n")]), []);
  await expectOnly([["tools/docs-check/budgets.json", '"comments": true', '"comments": "yes"']], /^tools\/docs-check\/budgets\.json:0: budgets: comments is "yes", not true or false$/);
});

test("in a repository, comments are checked once its docs-budgets.json turns them on", async () => {
  const code = ["tools/a.mjs", null, "// R01; R02 spec; R03 api.\n// R09 spec.\n"];
  assert.deepEqual(await componentErrors([code]), []);
  assert.deepEqual(await componentErrors([code, ["docs-budgets.json", null, "{}\n"]]), []);
  assert.deepEqual(await componentErrors([code, ["docs-budgets.json", null, '{ "comments": true }\n']]), [
    "tools/a.mjs:1: R01 in a comment names no entry of the decision log (docs/decisions.md)",
    "tools/a.mjs:2: R09 in a comment names no entry of the decision log (spec/docs/decisions.md)",
  ]);
  // spec/ is spec's, not the repository's.
  assert.deepEqual(await componentErrors([["spec/tools/a.mjs", null, "// R09\n"], ["docs-budgets.json", null, '{ "comments": true }\n']]), []);
});

test("spec's own budgets.json is well formed, and names files that are there", () => {
  const root = path.join(here, "..", "..", "..");
  const errors = [];
  const limits = readBudgets(root, specProfile.budgets, (file, line, message) => errors.push(`${file}:${line}: ${message}`));
  assert.deepEqual(errors, []);
  for (const file of Object.keys(limits.files)) assert.ok(fs.existsSync(path.join(root, file)), file);
  const own = readBudgets(root, { ...specProfile.budgets, block: "repository" }, (file, line, message) => errors.push(`${file}:${line}: ${message}`));
  assert.deepEqual(errors, []);
  assert.ok(own.entry && own.section && own.files["RUN.md"]);
});
