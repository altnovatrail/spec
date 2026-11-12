// Each test compares a made-up Russian document with an English translation of it, right or with
// one thing broken, and expects translation-check to say what broke and where.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { anchorMap, compare, unitsOf } from "../compare.mjs";
import { endsOf, join, split } from "../pieces.mjs";
import { check, main, relink, rewriteAnchors, sample } from "../main.mjs";
import { table, vocabulary } from "../vocabulary.mjs";
import { GIT } from "../../shared.mjs";

const MAIN = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "main.mjs");

const RU = `# Документ

> Следующий номер — R04.

## 1. Назначение

Решение R01 и R02 spec, product 7, О-3 и Д12; см. [журнал](decisions.md#журнал-решений), раздел 2 и T121. Файл \`format-<версия>.tar.gz\` и \`just docs-check\`; 14 878 вызовов, 2,5 %.

- первый пункт — «Next number» по-английски;
  - вложенный пункт со ссылкой на [R03](decisions.md#r03).
- второй пункт: закон «О персональных данных».

— *Почему:* так решил автор. — *Отвергнуто:* иначе.

— *Вторая поправка 2026-11-12:* поправка.

## 2. Таблица

| Термин | Что это |
|---|---|
| модуль | данные, R02 |

\`\`\`mermaid
flowchart LR
  a[Модуль] --> b[Граф]
\`\`\`
`;

const EN = `# Document

> Next number — R04.

## 1. Purpose

Decisions R01 and R02 spec, product 7, О-3 and Д12; see [the log](decisions.md#журнал-решений), section 2 and T121. The file \`format-<version>.tar.gz\` and \`just docs-check\`; 14,878 calls, 2.5 %.

- the first item — "Next number" in English;
  - a nested item with a link to [R03](decisions.md#r03).
- the second item: the law «О персональных данных».

— *Why:* the author decided so. — *Rejected:* otherwise.

— *Second amendment 2026-11-12:* an amendment.

## 2. Table

| Term | What it is |
|---|---|
| module («модуль») | data, R02 |

\`\`\`mermaid
flowchart LR
  a[Module] --> b[Graph]
\`\`\`
`;

const differences = (en, ru = RU, options) => compare(ru, en, options).map((e) => `${e.line}: ${e.message}`);
const broken = (from, to) => {
  assert.ok(EN.includes(from), `the translation has no "${from}"`);
  return differences(EN.replace(from, () => to));
};
const some = (list, pattern) => assert.ok(list.some((d) => pattern.test(d)), `none matches ${pattern}:\n${list.join("\n")}`);
const only = (list, pattern) => {
  assert.equal(list.length, 1, `expected one difference, got:\n${list.join("\n")}`);
  assert.match(list[0], pattern);
};

test("a right translation has no differences", () => {
  assert.deepEqual(differences(EN), []);
});

test("headings: a missing one, another level, another number, one too many", () => {
  assert.ok(broken("## 2. Table", "Table").some((d) => d.includes('the translation has no heading for "2. Таблица"')));
  some(broken("## 2. Table", "### 2. Table"), /heading "2\. Table" stands for "2\. Таблица" \(original:17\): its level is 3, not 2/);
  some(broken("## 2. Table", "## 3. Table"), /its number is 3, not 2/);
  assert.ok(broken("## 2. Table", "## 2. Table\n\n## 3. More").some((d) => d.includes('a heading the original does not have: "3. More"')));
});

test("a register number, a section or a task missing, or one the original does not have", () => {
  some(broken("Decisions R01 and R02 spec", "Decisions R01 and R02"), /register or task number "R02 spec" of the original \(original:7\) is missing here/);
  assert.ok(broken("and Д12;", "and Д13;").some((d) => d.includes('register or task number "Д13" is not in the original')));
  some(broken("product 7,", "product 8,"), /^7: section cited "product 7" of the original/);
  assert.ok(broken("and T121.", "and T122.").some((d) => d.includes('"T122" is not in the original')));
  assert.ok(broken("section 2 and", "chapter 2 and").some((d) => d.includes('section cited "section 2" of the original')));
});

test("a link that moved to another item is named where it went", () => {
  const moved = EN.replace(" with a link to [R03](decisions.md#r03).", " with a link to R03.").replace("in English;", "in English, [R03](decisions.md#r03);");
  const list = differences(moved);
  assert.ok(list.some((d) => /link "decisions\.md#r03" of the original \(original:10\) is missing here: it stands at line 9, in another paragraph/.test(d)), list.join("\n"));
});

test("links keep their URL, and an anchor follows the renamed heading", () => {
  some(broken("(decisions.md#журнал-решений)", "(decisions.md#decision-log)"), /link "decisions\.md#журнал-решений" of the original/);
  const renamed = (url) => url.replace("#журнал-решений", "#decision-log");
  assert.deepEqual(differences(EN.replace("#журнал-решений", "#decision-log"), RU, { link: renamed }), []);
});

test("numbers: as digits, the English way", () => {
  some(broken("14,878 calls", "14878 calls"), /number "14" of the original/);
  assert.ok(broken("2.5 %", "two and a half %").some((d) => d.includes('number "2" of the original')));
});

test("code stays, but for its Russian words", () => {
  assert.ok(broken("`just docs-check`", "`just docs-checks`").some((d) => d.includes('code "just docs-check" of the original')));
  assert.ok(broken("`format-<version>.tar.gz`", "`format-<version>.tgz`").some((d) => d.includes("code `-<>..` (its words aside) of the original")));
  assert.ok(broken("`format-<version>.tar.gz`", "`format-<версия>.tar.gz`").some((d) => d.includes("untranslated placeholder in code: `format-<версия>.tar.gz`")));
});

test("quotes: an English one word for word, a Russian one from the original", () => {
  only(broken('"Next number" in English', '"The next number" in English'), /the quote «Next number» of the original \(original:9\) is not here word for word/);
  only(broken("«О персональных данных»", "«О данных граждан»"), /the Russian quote «О данных граждан» is not in the original/);
});

test("a Russian word left outside quotes is untranslated", () => {
  only(broken("the author decided so", "the author решил so"), /untranslated: "решил so/);
  assert.deepEqual(broken("and Д12;", "and Д12;"), []);
});

test("a comment and an image are translated too, and keep their numbers", () => {
  const doc = (body) => `# T\n\n${body}\n`;
  only(compare(doc("<!-- FILL: из карточки, раздел 7 -->"), doc("<!-- FILL: из карточки, section 7 -->")).map((e) => e.message), /untranslated: "из карточки/);
  only(compare(doc("<!-- FILL: из карточки, раздел 7 -->"), doc("<!-- FILL: from the card -->")).map((e) => e.message), /number "7" of the original/);
  assert.deepEqual(compare(doc("<!-- FILL: из карточки, раздел 7 -->"), doc("<!-- FILL: from the card, section 7 -->")), []);
  only(compare(doc("Схема: ![подпись](x.png)."), doc("A diagram: ![подпись](x.png).")).map((e) => e.message), /untranslated: "подпись/);
});

test("the fixed words of the log, as many as the original has", () => {
  only(broken("*Why:*", "*Because:*"), /fixed word "\*Why:\*" of the original/);
  some(broken("*Second amendment 2026-11-12:*", "*Amendment 2026-11-12:*"), /fixed word "\*Second amendment YYYY-MM-DD:\*" of the original/);
  assert.ok(vocabulary.length === table.length && table.every(([ru, en]) => ru && en));
});

test("the shape: an item split in two, a paragraph joined to another, a cell", () => {
  const list = broken("- the second item: the law", "- the second item.\n- the law");
  assert.ok(list.some((d) => /the shape differs from the original's/.test(d)), list.join("\n"));
  assert.ok(broken("\n\n— *Second amendment", " — *Second amendment").some((d) => d.includes("the shape differs")));
  assert.ok(broken("| module («модуль») | data, R02 |", "| module («модуль») | data |").some((d) => d.includes('"R02" of the original')));
});

test("a block of code keeps every line without Russian", () => {
  only(broken("flowchart LR", "flowchart TD"), /a line of code is not as in the original \(original:24\): "flowchart LR"/);
  only(broken("a[Module]", "a[Модуль]"), /untranslated in a diagram: "a\[Модуль\]/);
  // Outside a diagram, a line in Russian may stay as it is — the data of a module that explains in Russian.
  const yaml = (body) => `# T\n\n\`\`\`yaml\n${body}\n\`\`\`\n`;
  assert.deepEqual(compare(yaml('# Иллюстрация.\nstatement: "Найди"'), yaml('# An illustration.\nstatement: "Найди"')), []);
  only(broken("  a[Module] --> b[Graph]\n", "  a[Module] --> b[Graph]\n  b --> c\n"), /a block of code of 3 lines, not 2 as in the original/);
  only(broken("```mermaid", "```text"), /a block of code in text, not mermaid/);
});

test("the anchors of the headings pair in order, or not at all", () => {
  const map = anchorMap(RU, EN);
  assert.equal(map.get("1-назначение"), "1-purpose");
  assert.equal(map.get("документ"), "document");
  assert.equal(anchorMap(RU, EN.replace("## 2. Table", "### 2. Table")), null);
  assert.equal(unitsOf(EN).filter((u) => u.kind === "cell").length, 4);
});

test("relink: only an anchor into a renamed heading changes", () => {
  const anchorsOf = (file) => (file === "docs/decisions.md" ? new Map([["журнал-решений", "decision-log"]]) : null);
  assert.equal(relink("docs/a.md", "decisions.md#журнал-решений", anchorsOf), "decisions.md#decision-log");
  assert.equal(relink("docs/a.md", "decisions.md#%D0%B6%D1%83%D1%80%D0%BD%D0%B0%D0%BB-%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B9", anchorsOf), "decisions.md#decision-log");
  assert.equal(relink("docs/decisions.md", "#журнал-решений", anchorsOf), "#decision-log");
  assert.equal(relink("docs/a.md", "decisions.md#other", anchorsOf), "decisions.md#other");
  assert.equal(relink("docs/a.md", "decisions.md", anchorsOf), "decisions.md");
  assert.equal(relink("docs/a.md", "https://example.com/#журнал-решений", anchorsOf), "https://example.com/#журнал-решений");
});

test("split and join give the document back, and cut it only where they may", () => {
  const long = `# T\n\n${Array.from({ length: 40 }, (_, i) => `## ${i + 1}. Раздел\n\nТекст ${"слово ".repeat(40)}\n\n\`\`\`\n# не заголовок\n\`\`\`\n`).join("\n")}`;
  const pieces = split(long, 2000);
  assert.ok(pieces.length > 5);
  assert.equal(pieces.join(""), long);
  assert.equal(join(pieces, endsOf(pieces)), long);
  assert.ok(pieces.slice(1).every((p) => p.startsWith("## ")));
  // A table too long for a piece is cut between its rows, and joins with no blank line.
  const rows = `| A | B |\n|---|---|\n${Array.from({ length: 200 }, (_, i) => `| ${i} | ${"x".repeat(50)} |`).join("\n")}\n`;
  const cut = split(rows, 2000);
  assert.ok(cut.length > 2 && cut.slice(1).every((p) => p.startsWith("| ")));
  assert.equal(join(cut.map((p) => p.trimEnd()), endsOf(cut)), rows);
  assert.equal(join(["a\n", "b"]), "a\n\nb\n");
  assert.deepEqual(split(""), []);
});

// A repository in a temporary folder, with the Russian documents committed and the English ones
// in its working tree.
function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "translation-"));
  const run = (...args) => spawnSync(GIT, args, { cwd: root, encoding: "utf8" });
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "product.md"), RU);
  fs.writeFileSync(path.join(root, "docs", "decisions.md"), "# Журнал решений\n\n## R03\n\nЗапись.\n");
  fs.writeFileSync(path.join(root, "RUN.md"), "# План\n\nСм. [журнал](docs/decisions.md#журнал-решений) и [R03](docs/decisions.md#r03), [раздел](docs/product.md#1-назначение).\n");
  run("init", "-q");
  run("-c", "user.email=a@b", "-c", "user.name=t", "add", ".");
  run("-c", "user.email=a@b", "-c", "user.name=t", "commit", "-q", "-m", "ru");
  fs.writeFileSync(path.join(root, "docs", "product.md"), EN);
  fs.writeFileSync(path.join(root, "docs", "decisions.md"), "# Decision log\n\n## R03\n\nAn entry.\n");
  return root;
}

test("check and anchors in a repository: the original from the commit, links rewritten everywhere", () => {
  const root = repository();
  try {
    // Before the anchors are rewritten, the link into the renamed heading is expected with its new anchor.
    const before = check(root, "HEAD", ["docs/product.md"]).map((e) => e.message);
    assert.ok(before.some((m) => m.includes('link "decisions.md#decision-log" of the original')), before.join("\n"));
    // A title that names the old anchor too stays as it is: only the URL changes.
    fs.appendFileSync(path.join(root, "RUN.md"), '\n[Журнал](docs/decisions.md#журнал-решений "см. #журнал-решений").\n');
    const changed = rewriteAnchors(root, "HEAD", ["docs/product.md", "docs/decisions.md"]);
    assert.deepEqual(changed.map((c) => c.file).sort(), ["RUN.md", "docs/product.md"]);
    assert.equal(
      fs.readFileSync(path.join(root, "RUN.md"), "utf8"),
      '# План\n\nСм. [журнал](docs/decisions.md#decision-log) и [R03](docs/decisions.md#r03), [раздел](docs/product.md#1-purpose).\n\n[Журнал](docs/decisions.md#decision-log "см. #журнал-решений").\n',
    );
    assert.deepEqual(changed.find((c) => c.file === "RUN.md"), { file: "RUN.md", count: 3 });
    assert.deepEqual(check(root, "HEAD", ["docs/product.md", "docs/decisions.md"]), []);
    assert.deepEqual(check(root, "HEAD", ["docs/missing.md"]).map((e) => e.message), ["HEAD has no docs/missing.md"]);
    fs.writeFileSync(path.join(root, "docs", "decisions.md"), "# Decision log\n\n### R03\n\nAn entry.\n");
    assert.ok(check(root, "HEAD", ["docs/decisions.md"]).some((e) => e.message.includes("its headings are not those of the original")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a repository that moves to a tag of spec with translated documents rewrites its links into spec/", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "translation-repo-"));
  const run = (cwd, ...args) => {
    const r = spawnSync(GIT, ["-c", "user.email=a@b", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  try {
    const spec = path.join(root, "spec");
    fs.mkdirSync(path.join(spec, "docs"), { recursive: true });
    run(spec, "init", "-q");
    fs.writeFileSync(path.join(spec, "docs", "decisions.md"), "# Журнал решений\n\nЗаписи.\n");
    run(spec, "add", ".");
    run(spec, "commit", "-q", "-m", "ru");
    fs.writeFileSync(path.join(root, "RUN.md"), "# План\n\nСм. [журнал](spec/docs/decisions.md#журнал-решений).\n");
    run(root, "init", "-q");
    run(root, "add", "RUN.md", "spec");
    run(root, "commit", "-q", "-m", "pinned at the Russian spec");
    // The move: the submodule's working tree at a newer commit of spec, with the log in English.
    fs.writeFileSync(path.join(spec, "docs", "decisions.md"), "# Decision log\n\nEntries.\n");
    run(spec, "commit", "-q", "-am", "en");
    assert.deepEqual(rewriteAnchors(root, "HEAD", ["spec/docs/decisions.md"], ["RUN.md"]), [{ file: "RUN.md", count: 1 }]);
    assert.equal(fs.readFileSync(path.join(root, "RUN.md"), "utf8"), "# План\n\nСм. [журнал](spec/docs/decisions.md#decision-log).\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the sample of the blind reading: by the commit, a tenth at least, the same units in both", () => {
  const root = repository();
  try {
    const folder = path.join(root, "sample");
    const taken = sample(root, "HEAD", ["docs/product.md"], folder, { bytes: 200 });
    assert.ok(taken.length >= 1);
    assert.deepEqual(sample(root, "HEAD", ["docs/product.md"], path.join(root, "again"), { bytes: 200 }), taken);
    const { n, original, translation } = taken[0];
    assert.equal(fs.readFileSync(path.join(folder, `${n}.ru.md`), "utf8"), `${RU.split("\n").slice(original[0] - 1, original[1]).join("\n")}\n`);
    assert.equal(fs.readFileSync(path.join(folder, `${n}.en.md`), "utf8"), `${EN.split("\n").slice(translation[0] - 1, translation[1]).join("\n")}\n`);
    // The whole of a short document, when a tenth of it is less than one stretch.
    assert.equal(sample(root, "HEAD", ["docs/decisions.md"], path.join(root, "log")).length, 1);
    assert.throws(() => sample(root, "HEAD", ["docs/missing.md"], folder), /HEAD has no docs\/missing\.md/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the command line: check, anchors, pair, split and join, and what it refuses", () => {
  const root = repository();
  const node = (...args) => spawnSync(process.execPath, [MAIN, ...args], { cwd: root, encoding: "utf8" });
  try {
    const failing = node("check", "HEAD", "docs/product.md");
    assert.equal(failing.status, 1);
    assert.match(failing.stdout, /translation-check: \d+ differences?\n$/);
    assert.equal(node("anchors", "HEAD", "docs/product.md", "docs/decisions.md").status, 0);
    const ok = node("check", "HEAD", "docs/product.md", "docs/decisions.md");
    assert.equal(ok.stdout, "translation-check: ok\n");
    assert.equal(ok.status, 0);
    fs.writeFileSync(path.join(root, "ru.md"), RU);
    fs.writeFileSync(path.join(root, "en.md"), EN);
    assert.equal(node("pair", "ru.md", "en.md").status, 0);
    assert.equal(node("split", "ru.md", "pieces", "300").status, 0);
    assert.ok(fs.existsSync(path.join(root, "pieces", "002.md")));
    assert.equal(node("join", "pieces", "back.md").status, 0);
    assert.equal(fs.readFileSync(path.join(root, "back.md"), "utf8"), RU);
    assert.equal(node("split", "ru.md", "more").status, 0);
    // join takes how the pieces end from split's ends.json, beside the translations or the pieces.
    fs.mkdirSync(path.join(root, "translated"));
    fs.copyFileSync(path.join(root, "pieces", "001.md"), path.join(root, "translated", "001.md"));
    const unended = node("join", "translated", "x.md");
    assert.equal(unended.status, 2);
    assert.match(unended.stderr, /ends\.json is not there/);
    assert.equal(node("join", "translated", "x.md", "pieces").status, 0);
    // From a folder inside the repository, its files are named from there, and the root is its top.
    const inside = spawnSync(process.execPath, [MAIN, "check", "HEAD", "product.md"], { cwd: path.join(root, "docs"), encoding: "utf8" });
    assert.equal(inside.stdout, "translation-check: ok\n");
    const sampled = node("sample", "HEAD", "picked", "docs/product.md");
    assert.equal(sampled.status, 0);
    assert.match(sampled.stdout, /^1: docs\/product\.md, lines \d+–\d+ of the original, \d+–\d+ of the translation\n/);
    for (const args of [[], ["nothing"], ["check", "HEAD"], ["sample", "HEAD", "x"], ["pair", "ru.md"], ["split", "ru.md", "p", "0"], ["join", "pieces"]]) {
      assert.equal(node(...args).status, 2, args.join(" "));
    }
    const refused = node("check", "--output=x", "docs/product.md");
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /is not a commit, a tag or a branch/);
    assert.notEqual(node("check", "HEAD", "../outside.md").status, 0);
    assert.equal(main(["anchors", "HEAD", "docs/product.md"], root), 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
