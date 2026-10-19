// What new-repo and new-repo-check share: the template's two marks, the files of a copy, and
// how a module tells that it runs as a script, which every tool takes from tools/shared.mjs.

import fs from "node:fs";
import path from "node:path";
import { byCodeUnits } from "../shared.mjs";
import { novatrailRepositories } from "../docs-check/config.mjs";

// The values the recipe fills in: one word in double braces, such as {{name}} or {{ name }}, as
// { whole, key, start }. Other double braces are not the template's and are left alone: the Go
// template {{ index … }} in host-network.sh, and a GitHub Actions expression such as
// ${{ github.ref }}. Found in one pass over the text, with no regular expression to backtrack in.
export function placeholders(text) {
  const found = [];
  let at = text.indexOf("{{");
  let end = -1;
  while (at >= 0) {
    // The nearest }} after this {{; it stays the nearest for every {{ before it.
    if (end < at + 2) end = text.indexOf("}}", at + 2);
    if (end < 0) break;
    const whole = text.slice(at, end + 2);
    const key = whole.slice(2, -2).trim();
    if (WORD.test(key) && text[at - 1] !== "$") {
      found.push({ whole, key, start: at });
      at = text.indexOf("{{", end + 2);
    } else {
      at = text.indexOf("{{", at + 1);
    }
  }
  return found;
}

// The text with each placeholder replaced by what fill returns for it.
export function fillPlaceholders(text, fill) {
  let out = "";
  let from = 0;
  for (const { whole, key, start } of placeholders(text)) {
    out += text.slice(from, start) + fill(whole, key);
    from = start + whole.length;
  }
  return out + text.slice(from);
}

const WORD = /^\w*$/;

// A repository's name as the list of NovaTrail's repositories writes it, or undefined: what the
// caller typed is only compared, so no path and no command is ever built from it.
export function knownRepository(given) {
  return novatrailRepositories.find((name) => name === given);
}

// A gap the recipe leaves for whoever fills the copy in from the component's card.
export const FILL = /<!--\s*FILL:/g;

// The files of a working copy, as paths relative to its root with forward slashes, in a stable
// order. Git's own directory and the spec submodule are not the copy's.
export function walk(root) {
  const found = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.name === ".git" || relative === "spec") continue;
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile()) found.push(relative);
    }
  };
  visit("");
  return found.sort(byCodeUnits);
}

export { isMain } from "../shared.mjs";
