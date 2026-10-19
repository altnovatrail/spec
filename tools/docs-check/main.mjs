// docs-check: the checks of the spec's documents.
//
//   node tools/docs-check/main.mjs [root]
//
// Reads every Markdown file under root (the repository by default) and checks that relative
// links lead somewhere, that cited sections exist, that the registers are numbered without
// gaps and every cited number exists, that no number is typed in the wrong script, and that
// every Mermaid diagram parses. Prints one line per error, file:line: message, and exits 1 if
// there are any.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { excluded } from "./config.mjs";
import { parseMarkdown } from "./markdown.mjs";
import { checkLinks } from "./links.mjs";
import { checkSections } from "./sections.mjs";
import { checkCitedNumbers, readRegisters } from "./registers.mjs";
import { findWrongScript } from "./citations.mjs";
import { checkDiagrams } from "./mermaid.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";

export async function check(root) {
  const errors = [];
  const report = (file, line, message) => errors.push({ file, line, message });

  const files = new Map();
  for (const file of markdownFiles(root)) {
    files.set(file, parseMarkdown(fs.readFileSync(path.join(root, file), "utf8")));
  }

  const stats = { files: files.size };
  stats.links = checkLinks(files, root, report);
  stats.sections = checkSections(files, report);
  const read = readRegisters(files, report);
  stats.numbers = checkCitedNumbers(files, read, report);
  // Only a number the register could hold: P-256 is a curve and T-34 a tank, not П-256 or Т-34.
  for (const [file, doc] of files) {
    for (const block of doc.blocks) {
      for (const wrong of findWrongScript(block)) {
        const register = read.get(wrong.prefix);
        if (!register || wrong.number < 1 || wrong.number > register.next) continue;
        report(file, block.lineAt(wrong.start), `${wrong.text}: a register number typed in the wrong script (R, О-, П-, Т-)`);
      }
    }
  }
  stats.diagrams = await checkDiagrams(files, report);

  errors.sort((a, b) => byCodeUnits(a.file, b.file) || a.line - b.line);
  return { errors, stats };
}

// Markdown files under root, as paths relative to it with forward slashes, in a stable order.
function markdownFiles(root) {
  const skip = (relative, name) => excluded.includes(name) || excluded.includes(relative);
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (skip(relative, entry.name)) continue;
      if (entry.isDirectory()) walk(relative);
      else if (entry.isFile() && entry.name.endsWith(".md")) found.push(relative);
    }
  };
  walk("");
  return found.sort(byCodeUnits);
}

if (isMain(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
  const { errors, stats } = await check(root);
  for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
  if (errors.length) {
    console.log(`docs-check: ${errors.length} error${errors.length === 1 ? "" : "s"}`);
    process.exitCode = 1;
  } else {
    console.log(
      `docs-check: ok — ${stats.files} files, ${stats.links} links, ${stats.sections} sections, ` +
        `${stats.numbers} numbers, ${stats.diagrams} diagrams`,
    );
  }
}
