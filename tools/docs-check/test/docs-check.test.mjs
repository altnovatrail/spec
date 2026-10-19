// Each test breaks one thing in a trial copy of fixtures/base and expects docs-check to name it.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { check } from "../main.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(here, "fixtures", "base");
const main = path.join(here, "..", "main.mjs");

// A copy of the base fixture with each [file, from, to] edit applied; `to` null deletes the file.
function trialCopy(edits = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-"));
  fs.cpSync(base, root, { recursive: true });
  for (const [file, from, to] of edits) {
    const target = path.join(root, file);
    if (to === null) {
      fs.rmSync(target);
      continue;
    }
    const text = fs.readFileSync(target, "utf8");
    assert.ok(text.includes(from), `the fixture ${file} has no "${from}"`);
    fs.writeFileSync(target, text.replace(from, to));
  }
  return root;
}

async function errorsOf(edits) {
  const root = trialCopy(edits);
  try {
    return (await check(root)).errors.map((e) => `${e.file}:${e.line}: ${e.message}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function expectOnly(edits, pattern) {
  const errors = await errorsOf(edits);
  assert.equal(errors.length, 1, `expected one error, got:\n${errors.join("\n")}`);
  assert.match(errors[0], pattern);
}

test("the base fixture is green", async () => {
  assert.deepEqual(await errorsOf(), []);
});

test("exit code: 0 when green, 1 with errors", () => {
  const green = spawnSync(process.execPath, [main, base], { encoding: "utf8" });
  assert.equal(green.status, 0, green.stdout + green.stderr);
  const root = trialCopy([["README.md", "(draft/)", "(drafts/)"]]);
  try {
    const red = spawnSync(process.execPath, [main, root], { encoding: "utf8" });
    assert.equal(red.status, 1);
    assert.match(red.stdout, /^README\.md:7: link drafts\/: drafts does not exist$/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
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
  try {
    const link = path.join(dir, "docs-check");
    fs.symlinkSync(path.dirname(main), link);
    const root = trialCopy([["README.md", "(draft/)", "(drafts/)"]]);
    try {
      const red = spawnSync(process.execPath, [path.join(link, "main.mjs"), root], { encoding: "utf8" });
      assert.equal(red.status, 1, red.stdout + red.stderr);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
