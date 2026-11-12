// The copy's .claude/settings.json is the template's, with the keys its kind adds under "claude"
// in repo-template/kinds.json: the go kind turns on gopls-lsp from spec's own marketplace,
// claude-plugins/, through the spec submodule (R143). new-repo adds the keys; new-repo-check
// finds the marketplace and the plugins the file turns on from it.

import fs from "node:fs";
import path from "node:path";

export const CLAUDE_SETTINGS = ".claude/settings.json";
const MARKETPLACE = ".claude-plugin/marketplace.json";
const PLUGIN = ".claude-plugin/plugin.json";

// The kind's keys go at the end of the template's file, one level in, after a comma on its last
// key, so the template's own lines stay as they are. A key the template already sets would be a
// second of the same name: the kind adds and does not override, as with the devcontainer's settings.
export function addClaudeSettings(dest, settings) {
  const keys = Object.keys(settings);
  if (keys.length === 0) return;
  const file = path.join(dest, CLAUDE_SETTINGS);
  const text = fs.readFileSync(file, "utf8");
  const own = JSON.parse(text);
  const both = keys.filter((key) => Object.hasOwn(own, key));
  if (both.length > 0) throw new Error(`the kind's claude: the template's ${CLAUDE_SETTINGS} already sets ${both.join(", ")}`);
  const end = text.lastIndexOf("}");
  const body = text.slice(0, end).trimEnd();
  const added = keys.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(settings[key], null, 2).replaceAll("\n", "\n  ")}`);
  fs.writeFileSync(file, `${body}${body.endsWith("{") ? "" : ","}\n${added.join(",\n")}\n${text.slice(end)}`);
}

// Every plugin the copy's settings turn on comes from a marketplace they name; every marketplace in a
// local folder must hold its list, and every plugin turned on from it must be listed there and lie
// where the list says, under its own name: a copy on a tag of spec without claude-plugins/, or a
// misspelt name, would otherwise leave its sessions without the plugin, and nothing would say why. A
// path into spec/ is read from `reference`: the submodule, or for a draft, which has none, spec's
// working tree. Returns the commands of the language servers those plugins start, which the
// copy's image must have.
export function checkClaudePlugins(dir, reference, report) {
  const commands = [];
  const settings = readJson(path.join(dir, CLAUDE_SETTINGS));
  if (settings === undefined) return commands;
  if (settings === null) {
    report(CLAUDE_SETTINGS, 0, "is not JSON");
    return commands;
  }
  const named = settings.extraKnownMarketplaces ?? {};
  const local = new Map();
  for (const [name, entry] of Object.entries(named)) {
    const { source, path: where } = entry?.source ?? {};
    if (source !== "directory" || typeof where !== "string") continue;
    const relative = path.normalize(where);
    const root = relative === "spec" || relative.startsWith(`spec${path.sep}`) ? path.join(reference, path.relative("spec", relative)) : path.resolve(dir, relative);
    const list = readJson(path.join(root, MARKETPLACE));
    if (!list) report(CLAUDE_SETTINGS, 0, `the marketplace ${name} is ${where}, which holds no ${MARKETPLACE} that reads as JSON`);
    else local.set(name, { root, plugins: Array.isArray(list.plugins) ? list.plugins : [] });
  }
  for (const [key, on] of Object.entries(settings.enabledPlugins ?? {})) {
    const at = key.lastIndexOf("@");
    if (on !== true) continue;
    if (at < 0 || !Object.hasOwn(named, key.slice(at + 1))) {
      report(CLAUDE_SETTINGS, 0, `${key} is turned on from a marketplace that extraKnownMarketplaces does not name`);
      continue;
    }
    const marketplace = local.get(key.slice(at + 1));
    if (!marketplace) continue;
    const plugin = key.slice(0, at);
    const listed = marketplace.plugins.find((p) => p?.name === plugin);
    const manifest = typeof listed?.source === "string" ? readJson(path.join(marketplace.root, listed.source, PLUGIN)) : undefined;
    if (!listed) report(CLAUDE_SETTINGS, 0, `${key} is turned on, and its marketplace lists no ${plugin}`);
    else if (!manifest) report(CLAUDE_SETTINGS, 0, `${key} is turned on, and its marketplace has no ${PLUGIN} at ${JSON.stringify(listed.source)} that reads as JSON`);
    else if (manifest.name !== plugin) report(CLAUDE_SETTINGS, 0, `${key} is turned on, and the ${PLUGIN} its marketplace lists is ${JSON.stringify(manifest.name)}`);
    else for (const server of Object.values(manifest.lspServers ?? {})) if (typeof server?.command === "string") commands.push(server.command);
  }
  return commands;
}

// A file's JSON; undefined when there is no file, null when it is not JSON.
function readJson(file) {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
