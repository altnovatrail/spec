// The new repository's devcontainer is spec's own, with a few edits: its own name and network,
// the VS Code extensions of its kind, and a start command for the spec submodule. Every edit
// expects to find its place a known number of times, so that a change to spec's devcontainer
// stops the recipe rather than producing a copy that is quietly wrong.

import fs from "node:fs";
import path from "node:path";

// The edits, given the copy's root, the repository's name and its kind's extensions.
export function editDevcontainer(root, name, extensions) {
  const dir = path.join(root, ".devcontainer");
  // Docker names may not start with a dot, and a container named after .github needs none.
  const id = `novatrail-${name.replace(/^\./, "")}`;
  const owner = `NovaTrail's ${name}`;

  edit(path.join(dir, "devcontainer.json"), (text) => {
    text = replace(text, "novatrail-spec", id, 2, "the container's name and network");
    text = replace(text, "the NovaTrail spec", owner, 1, "the opening comment");
    text = remove(text, /^(?:[ \t]*\/\/.*\n)*[ \t]*"git\.repositoryScanMaxDepth":.*\n/m, "the setting only spec needs");
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
  edit(path.join(dir, "Dockerfile"), (text) => replace(text, "the NovaTrail spec", owner, 1, "the opening comment"));

  // What VS Code reads must still be JSON once the comments are gone.
  parseJsonc(fs.readFileSync(path.join(dir, "devcontainer.json"), "utf8"));
}

function edit(file, change) {
  fs.writeFileSync(file, change(fs.readFileSync(file, "utf8")));
}

function replace(text, from, to, times, what) {
  const found = text.split(from).length - 1;
  if (found !== times) throw new Error(`${what}: expected "${from}" ${times} time(s) in spec's devcontainer, found ${found}`);
  return text.split(from).join(to);
}

function remove(text, pattern, what) {
  const found = text.match(new RegExp(pattern.source, `${pattern.flags}g`))?.length ?? 0;
  if (found !== 1) throw new Error(`${what}: expected it once in spec's devcontainer, found ${found}`);
  return text.replace(pattern, "");
}

// The kind's extensions go at the end of spec's list, after a comma on its last entry.
function addExtensions(text, extensions) {
  if (extensions.length === 0) return text;
  const list = /("extensions": \[\n)([\s\S]*?)(\n([ \t]*)\])/.exec(text);
  if (!list) throw new Error("the list of extensions: not found in spec's devcontainer");
  const [whole, head, body, tail, indent] = list;
  const lines = body.split("\n");
  const last = lines.findLastIndex((line) => line.trim() !== "" && !line.trim().startsWith("//"));
  if (last < 0) throw new Error("the list of extensions: empty in spec's devcontainer");
  lines[last] = lines[last].replace(/,?\s*$/, ",");
  const entries = extensions.map((e, i) => `${indent}    ${JSON.stringify(e)}${i < extensions.length - 1 ? "," : ""}`);
  const added = [`${indent}    // The extensions of this repository's kind.`, ...entries];
  return text.replace(whole, head + [...lines, ...added].join("\n") + tail);
}

// JSON with comments, as devcontainer.json is written: the comments go, then JSON.parse.
export function parseJsonc(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const end = endOfString(text, i);
      out += text.slice(i, end);
      i = end - 1;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 1;
    } else {
      out += c;
    }
  }
  return JSON.parse(out);
}

function endOfString(text, start) {
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === '"') return i + 1;
  }
  return text.length;
}
