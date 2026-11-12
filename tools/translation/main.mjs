// translation-check: a translation of documents against their original at a commit (R143, the
// 2026-11-12 amendment). Runs in the repository it is run from — spec, or another NovaTrail
// repository as `just -f spec/justfile translation-check`.
//
//   node tools/translation/main.mjs check <ref> <file>…    each file against itself at <ref>
//   node tools/translation/main.mjs anchors <ref> <file>…  rewrites the links of the repository's
//                                                           Markdown files to the renamed anchors
//   node tools/translation/main.mjs pair <original> <translation>
//                                                           one piece against its translation
//   node tools/translation/main.mjs split <file> <folder> [<bytes>]
//                                                           cuts a document into pieces 001.md…
//   node tools/translation/main.mjs join <folder> <file> [<pieces>]
//                                                           joins the pieces of a folder into a file,
//                                                           ending each as split's ends.json says
//   node tools/translation/main.mjs sample <ref> <folder> <file>…
//                                                           the sample for the blind reading
//
// check prints one line per difference, file:line: message, and exits 1 if there are any. A link
// of the original into a document whose headings the translation renamed — the file itself, or
// another one translated since <ref> — is expected with the new anchor, which anchors writes.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { anchorMap, compare, parse, unitsOf } from "./compare.mjs";
import { endsOf, join, split } from "./pieces.mjs";
import { decode, isExternal, resolveLink } from "../docs-check/links.mjs";
import { git, inRepository, isMain } from "../shared.mjs";

const REF = /^[A-Za-z0-9][\w./^~@{}-]*$/;
// What is never read for links: other repositories' copies and the fixtures of the checks.
const SKIPPED = [".repos/", "node_modules/", "tools/docs-check/test/fixtures/", "tools/format-check/test/fixtures/", "tools/translation/test/"];

// The text of a file at a commit of the repository at root, or null when it has none there. A
// file of the spec/ submodule is read in the submodule, at the commit that <ref> pins it to: so a
// repository that moves to a tag of spec with translated documents rewrites its links into them
// by the commit before the move.
export function atRef(root, ref, file) {
  try {
    return git(root, ["show", `${ref}:./${file}`]);
  } catch {
    if (!file.startsWith("spec/")) return null;
    try {
      const pinned = git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}:./spec`]).trim();
      return git(path.join(root, "spec"), ["show", `${pinned}:./${file.slice("spec/".length)}`]);
    } catch {
      return null;
    }
  }
}

// From a target file to the map of its renamed anchors, or null: read once per file, lazily.
export function anchorsSince(root, ref) {
  const cache = new Map();
  return (file) => {
    if (!cache.has(file)) {
      const before = file.endsWith(".md") ? atRef(root, ref, file) : null;
      const now = before === null ? null : readOrNull(path.join(root, file));
      cache.set(file, before === null || now === null || before === now ? null : anchorMap(before, now));
    }
    return cache.get(file);
  };
}

const readOrNull = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);

// The URL a link of `file` should have now: the same, but for an anchor that was renamed.
export function relink(file, url, anchorsOf) {
  if (isExternal(url)) return url;
  const hash = url.indexOf("#");
  if (hash < 0) return url;
  const target = hash === 0 ? file : resolveLink(file, decode(url.slice(0, hash)));
  const renamed = target && anchorsOf(target)?.get(decode(url.slice(hash + 1)));
  return renamed === undefined || renamed === null ? url : `${url.slice(0, hash)}#${renamed}`;
}

export function check(root, ref, files) {
  const anchorsOf = anchorsSince(root, ref);
  const errors = [];
  for (const file of files) {
    const original = atRef(root, ref, file);
    if (original === null) {
      errors.push({ file, line: 0, message: `${ref} has no ${file}` });
      continue;
    }
    const translation = fs.readFileSync(path.join(root, file), "utf8");
    if (anchorMap(original, translation) === null) {
      errors.push({ file, line: 0, message: "its headings are not those of the original, so links to them cannot follow" });
    }
    for (const e of compare(original, translation, { link: (url) => relink(file, url, anchorsOf) })) errors.push({ file, ...e });
  }
  return errors;
}

// Rewrites, in every Markdown file of the repository, the links into `files` whose anchor a
// translation renamed since `ref`. Returns [{ file, count }] for the files it changed.
export function rewriteAnchors(root, ref, files, listed = listMarkdown(root)) {
  const anchorsOf = anchorsSince(root, ref);
  const translated = new Set(files);
  const changed = [];
  for (const file of listed) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const edits = [];
    const visit = (node) => {
      if ((node.type === "link" || node.type === "definition") && node.position) {
        const hash = node.url.indexOf("#");
        const target = hash < 0 || isExternal(node.url) ? null : hash === 0 ? file : resolveLink(file, decode(node.url.slice(0, hash)));
        if (target && translated.has(target)) {
          const url = relink(file, node.url, anchorsOf);
          if (url !== node.url) edits.push({ node, from: node.url.slice(hash), to: url.slice(hash) });
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(parse(source));
    if (!edits.length) continue;
    let text = source;
    let count = 0;
    // From the end, so that each offset still holds.
    for (const { node, from, to } of edits.sort((x, y) => y.node.position.start.offset - x.node.position.start.offset)) {
      const { start, end } = node.position;
      const slice = text.slice(start.offset, end.offset);
      // The URL as the source writes it, right after "](" or "]:" and before any title: mdast
      // takes only escapes and references out of it. One written otherwise is left for
      // docs-check to name.
      const destination = node.type === "definition" ? slice.indexOf("]:") : slice.lastIndexOf("](");
      const at = slice.indexOf(from, destination);
      if (destination < 0 || at < 0) continue;
      text = text.slice(0, start.offset) + slice.slice(0, at) + to + slice.slice(at + from.length) + text.slice(end.offset);
      count++;
    }
    if (count) {
      fs.writeFileSync(path.join(root, file), text);
      changed.push({ file, count });
    }
  }
  return changed;
}

// The sample of the blind reading: of each file, stretches of about `bytes` of the original, in
// an order that the commit's hash and the file's name decide, until a tenth of the original's bytes
// and at least one stretch are taken. Whoever translated does not choose them. Each goes to the
// folder as <n>.ru.md and <n>.en.md, the translation's stretch being the same units as the
// original's; returns [{ file, n, original: [from, to], translation: [from, to] }], by lines.
export function sample(root, ref, files, folder, { share = 0.1, bytes = 4000 } = {}) {
  const commit = git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
  const taken = [];
  fs.mkdirSync(folder, { recursive: true });
  for (const file of files) {
    const original = atRef(root, ref, file);
    if (original === null) throw new Error(`${ref} has no ${file}`);
    const translation = fs.readFileSync(path.join(root, file), "utf8");
    const [a, b] = [unitsOf(original), unitsOf(translation)];
    const linesA = original.split("\n");
    const linesB = translation.split("\n");
    let line = 1;
    const stretches = split(original, bytes).map((piece, index) => {
      const from = line;
      line += piece.split("\n").length - 1;
      return { index, from, to: line - 1, size: Buffer.byteLength(piece) };
    });
    const order = stretches
      .map((s) => ({ ...s, key: crypto.createHash("sha256").update(`${commit}\0${file}\0${s.index}`).digest("hex") }))
      .sort((x, y) => (x.key < y.key ? -1 : 1));
    let size = 0;
    for (const s of order) {
      if (size >= share * Buffer.byteLength(original) && taken.some((t) => t.file === file)) break;
      size += s.size;
      // The translation's lines: from the first unit in the stretch to the last, by index.
      const inside = a.map((u, i) => (u.line >= s.from && u.line <= s.to ? i : -1)).filter((i) => i >= 0);
      const first = b[inside[0]]?.line ?? 1;
      const next = b[inside.at(-1) + 1]?.line;
      const last = next === undefined ? linesB.length : next - 1;
      const n = taken.length + 1;
      fs.writeFileSync(path.join(folder, `${n}.ru.md`), `${linesA.slice(s.from - 1, s.to).join("\n")}\n`);
      fs.writeFileSync(path.join(folder, `${n}.en.md`), `${linesB.slice(first - 1, last).join("\n")}\n`);
      taken.push({ file, n, original: [s.from, s.to], translation: [first, last] });
    }
  }
  return taken;
}

function listMarkdown(root) {
  const listed = git(root, ["-c", "core.fsmonitor=false", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.md"]);
  // Files of the working tree, as docs-check lists them: not a link, which would be written through.
  return [...new Set(listed.split("\0"))].filter((f) => f && !SKIPPED.some((s) => f.startsWith(s)) && fs.lstatSync(path.join(root, f), { throwIfNoEntry: false })?.isFile());
}

function usage() {
  console.error("translation-check: check <ref> <file>…, anchors <ref> <file>…, sample <ref> <folder> <file>…, pair <original> <translation>, split <file> <folder> [<bytes>] or join <folder> <file> [<pieces>]");
  process.exit(2);
}

export function main(args, cwd = process.cwd()) {
  const [command, ...rest] = args;
  // The pieces are the session's working files, wherever it keeps them.
  if (command === "split") {
    if (rest.length < 2 || rest.length > 3 || (rest[2] !== undefined && !/^[1-9]\d*$/.test(rest[2]))) usage();
    const pieces = split(fs.readFileSync(path.resolve(cwd, rest[0]), "utf8"), rest[2] === undefined ? undefined : Number(rest[2]));
    fs.mkdirSync(rest[1], { recursive: true });
    pieces.forEach((p, i) => fs.writeFileSync(path.join(rest[1], `${String(i + 1).padStart(3, "0")}.md`), p));
    // How each piece ends, for join: a translation's trailing newlines are its writer's.
    fs.writeFileSync(path.join(rest[1], "ends.json"), `${JSON.stringify(endsOf(pieces))}\n`);
    console.log(`${rest[0]}: ${pieces.length} piece${pieces.length === 1 ? "" : "s"} in ${rest[1]}`);
    return 0;
  }
  if (command === "join") {
    if (rest.length < 2 || rest.length > 3) usage();
    const names = fs.readdirSync(rest[0]).filter((n) => /^\d{3}\.md$/.test(n)).sort();
    // How the original's pieces end, from split: in the folder of the translations or of the pieces.
    const endsFile = path.join(rest[2] ?? rest[0], "ends.json");
    if (!fs.existsSync(endsFile)) {
      console.error(`translation-check: ${endsFile} is not there: join the pieces with the ends.json that split wrote`);
      process.exit(2);
    }
    const ends = JSON.parse(fs.readFileSync(endsFile, "utf8"));
    fs.writeFileSync(rest[1], join(names.map((n) => fs.readFileSync(path.join(rest[0], n), "utf8")), ends));
    console.log(`${rest[1]}: ${names.length} piece${names.length === 1 ? "" : "s"} joined`);
    return 0;
  }
  if (command === "pair") {
    if (rest.length !== 2) usage();
    const [original, translation] = rest.map((f) => fs.readFileSync(path.resolve(cwd, f), "utf8"));
    return print(compare(original, translation).map((e) => ({ file: rest[1], ...e })));
  }
  if (!["check", "anchors", "sample"].includes(command) || rest.length < (command === "sample" ? 3 : 2)) usage();
  const [ref, ...given] = rest;
  const folder = command === "sample" ? given.shift() : null;
  if (!REF.test(ref)) {
    console.error(`translation-check: ${ref} is not a commit, a tag or a branch`);
    process.exit(2);
  }
  // The root is the repository's top level, wherever in it the command runs; each file, given
  // from where it runs, as a path relative to the root, which never leaves it.
  const root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const files = given.map((f) => path.relative(root, inRepository(path.resolve(cwd, f), root)).split(path.sep).join("/"));
  if (command === "sample") {
    for (const s of sample(root, ref, files, folder)) console.log(`${s.n}: ${s.file}, lines ${s.original.join("–")} of the original, ${s.translation.join("–")} of the translation`);
    return 0;
  }
  if (command === "anchors") {
    for (const { file, count } of rewriteAnchors(root, ref, files)) console.log(`${file}: ${count} link${count === 1 ? "" : "s"} to renamed anchors rewritten`);
    return 0;
  }
  return print(check(root, ref, files));
}

function print(errors) {
  for (const { file, line, message } of errors) console.log(`${file}:${line}: ${message}`);
  console.log(errors.length ? `translation-check: ${errors.length} difference${errors.length === 1 ? "" : "s"}` : "translation-check: ok");
  return errors.length ? 1 : 0;
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2));
