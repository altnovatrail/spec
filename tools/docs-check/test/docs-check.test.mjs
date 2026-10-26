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
import { componentProfile } from "../config.mjs";
import { GIT } from "../../shared.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(here, "fixtures", "base");
const component = path.join(here, "fixtures", "component");
const main = path.join(here, "..", "main.mjs");

// A copy of the base fixture with each [file, from, to] edit applied; `to` null deletes the file.
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
// the path of its main.mjs.
function toolsInto(dir) {
  const tools = path.join(dir, "tools");
  fs.mkdirSync(tools, { recursive: true });
  const own = path.dirname(main);
  fs.cpSync(own, path.join(tools, "docs-check"), { recursive: true, filter: (from) => path.relative(own, from).split(path.sep)[0] !== "test" });
  fs.cpSync(path.join(here, "..", "..", "shared.mjs"), path.join(tools, "shared.mjs"));
  fs.symlinkSync(path.join(here, "..", "..", "node_modules"), path.join(tools, "node_modules"));
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

test("NovaTrail's repository names in prose do not hide our numbers", async () => {
  await expectOnly([["README.md", "Decision R02 and", "Per R99 modules are data, and"]], /^README\.md:8: R99 does not exist/);
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

// The tables of a RUN.md, В and Д (RUN.md, T18).

test("a В defined twice", async () => {
  await expectOnly([["RUN.md", "| В3 | Третий вопрос |", "| В3 | Третий вопрос |\n| В3 | Повтор |"]], /^RUN\.md:\d+: В3 is defined twice$/);
});

test("a next free В that is not above the table", async () => {
  await expectOnly([["RUN.md", "следующий — В4.", "следующий — В3."]], /^RUN\.md:7: the next free number is В3, but В3 is in the table: it should be above every number in it$/);
});

test("a table of debt that names no next free number", async () => {
  await expectOnly([["RUN.md", "Номера не переиспользуются: следующий — Д2.", "Номера не переиспользуются."]], /register Д: its opening does not name the next free number/);
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

test("the repository's tables: a В defined twice", async () => {
  await componentOnly([["RUN.md", "| В2 | Второй, в реестр spec |", "| В2 | Второй, в реестр spec |\n| В2 | Повтор |"]], /В2 is defined twice$/);
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

test("a table whose heading is gone is named", async () => {
  await componentOnly([["RUN.md", "## Таблица 3. Вопросы автору без ответа", "## Вопросы"]], /^RUN\.md:0: register В: no heading «Таблица 3\. …» to hold it$/);
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
  assert.deepEqual(await componentErrors([["RUN.md", "| В2 | Второй, в реестр spec |", "| В2 | Второй, в реестр spec |\n| В1 | Первый, вернулся |"]]), []);
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
    assert.match(green.stdout, /^docs-check: ok — 4 files,/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Cases from В22 .github: a name that no prose has is a suffix wherever a word ends with it.

test(".github and a hyphenated name are another repository's even when the phrase goes on", async () => {
  const edits = [["README.md", "Its own log starts at `R01`.", "Its own log starts at `R01`. R19 .github и его цитаты, R03 module-kit и его рецепты, R06 и R07 skill-map, architecture 9.9 .github и её тексты."]];
  assert.deepEqual(await componentErrors(edits), []);
  assert.deepEqual(await errorsOf([["README.md", "Decision R02 and", "Per R99 .github and R98 `learner-model` and"]]), []);
});

test("a name that is also a word still counts only where it ends the phrase", async () => {
  await componentOnly([["README.md", "Its own log starts at `R01`.", "Its own log starts at `R01`. R03 canvas и его тесты."]], /^README\.md:\d+: R03 does not exist/);
  await expectOnly([["README.md", "Decision R02 and", "Per R99 api and"]], /^README\.md:8: R99 does not exist/);
});

test("a hyphen that goes on is part of another word, not the name", async () => {
  await expectOnly([["README.md", "Decision R02 and", "Per R99 module-kit-like tools and"]], /^README\.md:8: R99 does not exist/);
});

// Which files are read: in a repository, those git tracks or does not ignore; elsewhere, all
// (В29 tutor; R32, the 2026-10-26 amendment).

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
