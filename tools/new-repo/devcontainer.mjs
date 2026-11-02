// The new repository's devcontainer is spec's own, with a few edits: its own name and network,
// the VS Code extensions and settings of its kind and the lines its kind adds to the toolchain
// stage, a start command for the spec submodule, and the suffix "spec" on the decisions its
// Dockerfile cites. Every edit expects to find its place a known number of times, so that a
// change to spec's devcontainer stops the recipe rather than producing a copy that is quietly
// wrong.

import fs from "node:fs";
import path from "node:path";

// What a kind of repo-template/kinds.json may add to spec's devcontainer. A key it does not know
// stops the recipe, so that a misspelt one is not quietly left out of the copy.
const KIND_KEYS = ["extensions", "settings", "toolchain"];

// A kind, read from kinds.json in the template `template`: VS Code extensions, VS Code settings,
// and lines for the end of the Dockerfile's toolchain stage, from the file in kinds/ that
// "toolchain" names (R79). A tag before R79 wrote a kind as its list of extensions alone, and
// new-repo builds from the latest tag, so that form is read too.
export function readKind(template, name, kind) {
  const where = `kinds.json: ${name}`;
  if (Array.isArray(kind)) kind = { extensions: kind };
  if (kind === null || typeof kind !== "object") throw new Error(`${where}: a kind is an object of ${KIND_KEYS.join(", ")}`);
  const unknown = Object.keys(kind).filter((key) => !KIND_KEYS.includes(key));
  if (unknown.length > 0) throw new Error(`${where}: ${unknown.join(", ")} is not one of ${KIND_KEYS.join(", ")}`);
  const { extensions = [], settings = {}, toolchain = null } = kind;
  if (!Array.isArray(extensions) || !extensions.every((e) => typeof e === "string")) throw new Error(`${where}: extensions is a list of strings`);
  if (settings === null || typeof settings !== "object" || Array.isArray(settings)) throw new Error(`${where}: settings is an object`);
  return { extensions, settings, toolchain: toolchain === null ? null : readToolchain(template, where, toolchain) };
}

// The toolchain's lines come from a file in the template's kinds/, and only from there.
function readToolchain(template, where, file) {
  const kinds = path.join(template, "kinds");
  const full = typeof file === "string" && file !== "" ? path.resolve(template, file) : null;
  if (!full || path.dirname(full) !== kinds) throw new Error(`${where}: toolchain names a file in repo-template/kinds/, not ${JSON.stringify(file)}`);
  if (!fs.existsSync(full)) throw new Error(`${where}: toolchain names ${file}, which repo-template does not have`);
  return fs.readFileSync(full, "utf8");
}

// The edits, given the copy's root, the repository's name and its kind, as readKind gives it.
export function editDevcontainer(root, name, { extensions, settings, toolchain }) {
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
    suffixDecisions(addToolchain(replace(text, "the NovaTrail spec", owner, 1, "the opening comment"), toolchain)),
  );

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
