// The new repository's devcontainer is spec's own, with a few edits: its own name and network,
// the VS Code extensions and settings of its kind, the lines its kind adds to the toolchain stage
// and to the devcontainer stage, with the files of its kind's folder beside the Dockerfile, a start command for the spec submodule, and the suffix "spec" on the decisions its
// Dockerfile cites. Every edit expects to find its place a known number of times, so that a
// change to spec's devcontainer stops the recipe rather than producing a copy that is quietly
// wrong.

import fs from "node:fs";
import path from "node:path";
import { walk } from "./copy.mjs";

// What a kind of repo-template/kinds.json may add to spec's devcontainer. A key it does not know
// stops the recipe, so that a misspelt one is not quietly left out of the copy.
const KIND_KEYS = ["extensions", "settings", "toolchain", "devcontainer"];

// A kind, read from kinds.json in the template `template`: VS Code extensions, VS Code settings,
// lines for the end of the Dockerfile's toolchain stage, from the file in kinds/ that "toolchain"
// names (R79), and from the folder in kinds/ that "devcontainer" names, lines for the devcontainer
// stage, its Dockerfile, and the files the image copies, the rest of it (R102). A tag before R79 wrote a kind as its list of extensions alone, and
// new-repo builds from the latest tag, so that form is read too.
export function readKind(template, name, kind) {
  const where = `kinds.json: ${name}`;
  if (Array.isArray(kind)) kind = { extensions: kind };
  if (kind === null || typeof kind !== "object") throw new Error(`${where}: a kind is an object of ${KIND_KEYS.join(", ")}`);
  const unknown = Object.keys(kind).filter((key) => !KIND_KEYS.includes(key));
  if (unknown.length > 0) throw new Error(`${where}: ${unknown.join(", ")} is not one of ${KIND_KEYS.join(", ")}`);
  const { extensions = [], settings = {}, toolchain = null, devcontainer = null } = kind;
  if (!Array.isArray(extensions) || !extensions.every((e) => typeof e === "string")) throw new Error(`${where}: extensions is a list of strings`);
  if (settings === null || typeof settings !== "object" || Array.isArray(settings)) throw new Error(`${where}: settings is an object`);
  return {
    extensions,
    settings,
    toolchain: toolchain === null ? null : readToolchain(template, where, toolchain),
    devcontainer: devcontainer === null ? null : readDevcontainerFolder(template, where, devcontainer),
  };
}

// The toolchain's lines come from a file in the template's kinds/, and only from there.
function readToolchain(template, where, file) {
  const kinds = path.join(template, "kinds");
  const full = typeof file === "string" && file !== "" ? path.resolve(template, file) : null;
  if (!full || path.dirname(full) !== kinds) throw new Error(`${where}: toolchain names a file in repo-template/kinds/, not ${JSON.stringify(file)}`);
  if (!fs.existsSync(full)) throw new Error(`${where}: toolchain names ${file}, which repo-template does not have`);
  return fs.readFileSync(full, "utf8");
}

// The devcontainer stage's lines and the files the image copies come from a folder in the
// template's kinds/, and only from there: its Dockerfile holds the lines, and every other file in
// it goes into the copy's .devcontainer/ at the same path, with its mode. { lines, files, entries },
// with files each { path, bytes, mode }, and entries the names at the folder's top, a folder's with
// a slash. A file the folder holds may not be one of spec's devcontainer, which the edits have
// already made the copy's own.
const KIND_DOCKERFILE = "Dockerfile";

function readDevcontainerFolder(template, where, folder) {
  const kinds = path.join(template, "kinds");
  const full = typeof folder === "string" && folder !== "" ? path.resolve(template, folder) : null;
  if (!full || path.dirname(full) !== kinds) throw new Error(`${where}: devcontainer names a folder in repo-template/kinds/, not ${JSON.stringify(folder)}`);
  if (!fs.statSync(full, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`${where}: devcontainer names ${folder}, which is no folder of repo-template`);
  const dockerfile = path.join(full, KIND_DOCKERFILE);
  if (!fs.existsSync(dockerfile)) throw new Error(`${where}: ${folder} has no ${KIND_DOCKERFILE}, the lines of the devcontainer stage`);
  const files = walk(full)
    .filter((file) => file !== KIND_DOCKERFILE)
    .map((file) => ({ path: file, bytes: fs.readFileSync(path.join(full, file)), mode: fs.statSync(path.join(full, file)).mode }));
  if (files.length === 0) throw new Error(`${where}: ${folder} holds its ${KIND_DOCKERFILE} alone: the files the image copies are its reason to be`);
  const entries = [...new Set(files.map((file) => (file.path.includes("/") ? `${file.path.split("/")[0]}/` : file.path)))];
  return { lines: fs.readFileSync(dockerfile, "utf8"), files, entries };
}

// The edits, given the copy's root, the repository's name and its kind, as readKind gives it.
export function editDevcontainer(root, name, { extensions, settings, toolchain, devcontainer = null }) {
  const dir = path.join(root, ".devcontainer");
  // Docker names may not start with a dot, and a container named after .github needs none.
  const id = `novatrail-${name.replace(/^\./, "")}`;
  const owner = `NovaTrail's ${name}`;

  edit(path.join(dir, "devcontainer.json"), (text) => {
    text = replace(text, "novatrail-spec", id, 2, "the container's name and network");
    text = replace(text, "the NovaTrail spec", owner, 1, "the opening comment");
    text = remove(text, /^(?:[ \t]*\/\/.*\n)*[ \t]*"git\.repositoryScanMaxDepth":.*\n/m, "the setting only spec needs");
    text = addSettings(text, settings);
    text = addExtensions(text, extensions);
    text = addContext(text, devcontainer);
    return replace(
      text,
      '    "customizations": {',
      [
        "    // spec is a submodule: a clone made without --recurse-submodules gets it here.",
        '    "postStartCommand": "test -e spec/RULES.md || git submodule update --init spec",',
        '    "customizations": {',
      ].join("\n"),
      1,
      "the place for the start command",
    );
  });
  edit(path.join(dir, "host-network.sh"), (text) => replace(text, '"novatrail-spec"', `"${id}"`, 1, "the network's name"));
  edit(path.join(dir, "Dockerfile"), (text) =>
    suffixDecisions(addDevcontainerLines(addToolchain(replace(text, "the NovaTrail spec", owner, 1, "the opening comment"), toolchain), devcontainer)),
  );
  for (const file of devcontainer?.files ?? []) {
    const target = path.join(dir, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // Written only where nothing is: a file spec's devcontainer has is refused as the write finds it.
    try {
      fs.writeFileSync(target, file.bytes, { mode: file.mode, flag: "wx" });
    } catch (error) {
      if (error.code === "EEXIST") throw new Error(`the kind's folder holds ${file.path}, which spec's devcontainer has: the kind adds files, and does not replace spec's`);
      throw error;
    }
  }

  // What VS Code reads must still be JSON once the comments are gone.
  parseJsonc(fs.readFileSync(path.join(dir, "devcontainer.json"), "utf8"));
}

function edit(file, change) {
  fs.writeFileSync(file, change(fs.readFileSync(file, "utf8")));
}

function replace(text, from, to, times, what) {
  const found = text.split(from).length - 1;
  if (found !== times) throw new Error(`${what}: expected ${JSON.stringify(from)} ${times} time(s) in spec's devcontainer, found ${found}`);
  return text.split(from).join(to);
}

function remove(text, pattern, what) {
  const found = text.match(new RegExp(pattern.source, `${pattern.flags}g`))?.length ?? 0;
  if (found !== 1) throw new Error(`${what}: expected it once in spec's devcontainer, found ${found}`);
  return text.replace(pattern, "");
}

// A decision the Dockerfile cites — "(R34)", "(R12, R34)" or "R34" in a sentence — is one of
// spec's: in the copy it reads "R34 spec", or it would name a decision of the repository's own
// log (RULES.md, Citations). Every citation gets the suffix, however it is written, so that a new
// one in spec's Dockerfile is not left behind.
function suffixDecisions(text) {
  const cited = /\bR\d+\b(?! spec\b)/g;
  const found = text.match(cited)?.length ?? 0;
  if (found === 0) throw new Error("the decisions the comments cite: none found in spec's Dockerfile");
  return text.replace(cited, "$& spec");
}

// The kind's lines go at the end of the toolchain stage, after everything spec's own stage does,
// so that what they run finds Node and Go: the checks run in that stage and need them too. The
// stage ends where the devcontainer stage begins, at its FROM, and the comments and blank lines
// right above that FROM are the devcontainer stage's heading, which stays with it.
const DEVCONTAINER_STAGE = "\nFROM toolchain AS devcontainer\n";

function addToolchain(text, lines) {
  if (lines === null) return text;
  replace(text, DEVCONTAINER_STAGE, DEVCONTAINER_STAGE, 1, "the start of the devcontainer stage");
  const at = text.indexOf(DEVCONTAINER_STAGE) + 1;
  const before = text.slice(0, at).split("\n");
  let end = before.length - 1;
  while (end > 0 && (before[end - 1] === "" || before[end - 1].startsWith("#"))) end -= 1;
  return `${before.slice(0, end).join("\n")}\n\n${lines.trimEnd()}\n${before.slice(end).join("\n")}${text.slice(at)}`;
}

// The kind's lines of the devcontainer stage go before the step of Claude Code, as root, before
// the image is left to the user vscode: what they install, such as gopls, goes where every user
// finds it. The comments right above that step are its own, and stay with it.
const CLAUDE_CODE = "\n# Claude Code comes from the registry at an exact version";

function addDevcontainerLines(text, devcontainer) {
  if (devcontainer === null) return text;
  replace(text, CLAUDE_CODE, CLAUDE_CODE, 1, "the step of Claude Code in the devcontainer stage");
  const at = text.indexOf(CLAUDE_CODE) + 1;
  return `${text.slice(0, at)}${devcontainer.lines.trimEnd()}\n\n${text.slice(at)}`;
}

// The image copies from its folder what the kind puts there, and the comment on its context says
// so, by name.
const CONTEXT = "        // The image copies nothing from the repository, so it is built from this folder alone.\n";

function addContext(text, devcontainer) {
  if (devcontainer === null) return text;
  const names = devcontainer.entries.join(", ");
  return replace(text, CONTEXT, `        // The image copies nothing from the repository but what its kind puts in this folder,\n        // ${names}, so it is built from this folder alone.\n`, 1, "the comment on the context");
}

// The version of gopls that a devcontainer's lock file names, and the one its Dockerfile's
// GOPLS_VERSION asks for, read as module-kit's ci-lint reads them: { lock, arg }, each null when
// it is not there. CI never builds the devcontainer stage, so only this holds them together.
export function goplsVersions(dir) {
  const read = (file) => (fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), "utf8") : "");
  const lock = read("gopls/go.mod").match(/^\s*(?:require\s+)?golang\.org\/x\/tools\/gopls\s+v(\S+)/m)?.[1] ?? null;
  const arg = read("Dockerfile").match(/^ARG GOPLS_VERSION=(\S+)$/m)?.[1] ?? null;
  return { lock, arg };
}

// The kind's extensions go at the end of spec's list, and its settings at the end of spec's: the
// closing brace of the settings is the one at the depth of their key, past any object inside.
const EXTENSIONS = /(?<head>"extensions": \[\n)(?<body>[\s\S]*?)(?<tail>\n(?<indent>[ \t]*)\])/;
const SETTINGS = /^(?<head>(?<indent>[ \t]*)"settings": \{\n)(?<body>[\s\S]*?)(?<tail>\n\k<indent>\})/m;

function addExtensions(text, extensions) {
  return append(text, EXTENSIONS, "extensions", extensions.map((e) => JSON.stringify(e)));
}

// A setting spec already has would be a second key of the same name: the kind does not override.
function addSettings(text, settings) {
  const own = parseJsonc(text).customizations?.vscode?.settings ?? {};
  const both = Object.keys(settings).filter((key) => Object.hasOwn(own, key));
  if (both.length > 0) throw new Error(`the settings: spec's devcontainer already sets ${both.join(", ")}`);
  return append(text, SETTINGS, "settings", Object.entries(settings).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value, null, 4)}`));
}

// Entries go after a comma on the last entry of spec's own, one level deeper than the key that
// opens the list, under a comment that says where they come from.
function append(text, pattern, what, entries) {
  if (entries.length === 0) return text;
  const all = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))];
  if (all.length !== 1) throw new Error(`the ${what}: expected once in spec's devcontainer, found ${all.length}`);
  const [found] = all;
  const { head, body, tail, indent } = found.groups;
  const lines = body.split("\n");
  const last = lines.findLastIndex((line) => line.trim() !== "" && !line.trim().startsWith("//"));
  if (last < 0) throw new Error(`the ${what}: empty in spec's devcontainer`);
  // The comma goes after the entry, before a comment that may end its line.
  const code = lines[last].slice(0, endOfCode(lines[last])).trimEnd();
  if (!code.endsWith(",")) lines[last] = `${code},${lines[last].slice(code.length)}`;
  const inner = `${indent}    `;
  const added = entries.map((e, i) => `${inner}${e.replaceAll("\n", `\n${inner}`)}${i < entries.length - 1 ? "," : ""}`);
  return text.replace(found[0], () => head + [...lines, `${inner}// The ${what} of this repository's kind.`, ...added].join("\n") + tail);
}

// JSON with comments, as devcontainer.json is written: the comments go, then JSON.parse.
export function parseJsonc(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const end = endOfString(text, i);
      out += text.slice(i, end);
      i = end;
    } else if (c === "/" && text[i + 1] === "/") {
      // A line comment becomes the line break it ends with.
      const end = text.indexOf("\n", i);
      out += "\n";
      i = end < 0 ? text.length : end + 1;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
    } else {
      out += c;
      i += 1;
    }
  }
  return JSON.parse(out);
}

// Where a line's JSON ends: at a line comment outside its strings, or at its end.
function endOfCode(line) {
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') i = endOfString(line, i);
    else if (line[i] === "/" && line[i + 1] === "/") return i;
    else i += 1;
  }
  return line.length;
}

// Where the string that opens at `start` ends, past its closing quote; an escape skips the
// character after the backslash.
function endOfString(text, start) {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === "\\") i += 2;
    else if (text[i] === '"') return i + 1;
    else i += 1;
  }
  return text.length;
}
