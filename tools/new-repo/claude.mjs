// The copy's .claude/settings.json is the template's, with the keys its kind adds under "claude"
// in repo-template/kinds.json. A kind's plugins are loaded by its devcontainer (claudePlugins,
// devcontainer.mjs), not by a marketplace in these settings, and new-repo-check finds the folders
// it names.

import fs from "node:fs";
import path from "node:path";
import { PLUGIN_DIRS, WORKSPACE, parseJsonc } from "./devcontainer.mjs";

export const CLAUDE_SETTINGS = ".claude/settings.json";
const DEVCONTAINER = ".devcontainer/devcontainer.json";
const PLUGIN = ".claude-plugin/plugin.json";
// The marketplace an older tag of spec carries, which a copy may still pin, through which the go
// kind turned its plugin on.
const OLD_MARKETPLACE_NAME = "novatrail";
const OLD_MARKETPLACE = "claude-plugins/.claude-plugin/marketplace.json";

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

// The plugins of a copy's sessions come from its devcontainer, by CLAUDE_CODE_PLUGIN_DIRS in its
// containerEnv: every folder the variable names lies inside the container's workspace and holds a
// plugin.json that reads as JSON and names the plugin as the folder does. A copy on a tag of spec
// without the plugin, or a misspelt name, would otherwise leave its sessions without it, and nothing
// would say why. Its .claude/settings.json names no marketplace in a local folder and turns on no
// plugin of the marketplace novatrail, or of the plugins the variable loads: Claude Code records a
// marketplace in the ~/.claude that the containers share, by the path of one of them, and a key left
// would take novatrail from there. A spec that still has the marketplace has a template that
// writes those keys, and the message says so. A path into spec/ is read from
// `reference`: the submodule, or for a draft, which has none, spec's working tree. `container` is
// the text of the copy's devcontainer.json, undefined when it has none. Returns the commands of the
// language servers those plugins start, which the copy's image must have.
export function checkClaudePlugins(dir, reference, report, container) {
  const commands = [];
  const loaded = new Set();
  let env;
  if (container !== undefined) {
    try {
      env = parseJsonc(container)?.containerEnv;
    } catch {
      report(DEVCONTAINER, 0, "is not JSON with comments");
    }
  }
  const folders = env?.[PLUGIN_DIRS];
  for (const folder of folders === undefined ? [] : String(folders).split(":")) {
    const relative = folder.startsWith(`${WORKSPACE}/`) ? path.normalize(folder.slice(WORKSPACE.length + 1)) : null;
    if (folder === "") report(DEVCONTAINER, 0, `${PLUGIN_DIRS} holds an empty path: a ":" too many`);
    else if (relative === null) report(DEVCONTAINER, 0, `${PLUGIN_DIRS} names ${folder}, which does not start with ${WORKSPACE}/, the one path that is the container's own wherever it opens the repository`);
    else if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) report(DEVCONTAINER, 0, `${PLUGIN_DIRS} names ${folder}, which leads out of the workspace`);
    else {
      const where = relative === "spec" || relative.startsWith(`spec${path.sep}`) ? path.join(reference, path.relative("spec", relative)) : path.join(dir, relative);
      const manifest = readJson(path.join(where, PLUGIN));
      if (!manifest) report(DEVCONTAINER, 0, `${PLUGIN_DIRS} names ${folder}, which holds no ${PLUGIN} that reads as JSON`);
      else if (manifest.name !== path.basename(where)) report(DEVCONTAINER, 0, `${PLUGIN_DIRS} names ${folder}, whose ${PLUGIN} names the plugin ${JSON.stringify(manifest.name)}`);
      else {
        loaded.add(manifest.name);
        for (const server of Object.values(manifest.lspServers ?? {})) if (typeof server?.command === "string") commands.push(server.command);
      }
    }
  }

  const settings = readJson(path.join(dir, CLAUDE_SETTINGS));
  if (settings === null) report(CLAUDE_SETTINGS, 0, "is not JSON");
  // A spec that still has the marketplace writes these keys itself.
  const old = fs.existsSync(path.join(reference, OLD_MARKETPLACE)) ? `; the spec it pins is a tag whose template still writes it: take a newer tag of spec, whose devcontainer loads the plugins, and build the copy again` : "";
  const why = `Claude Code records a marketplace in the ~/.claude that the containers share, by the path of one of them, and the sessions of the others lose its plugins: load them by ${PLUGIN_DIRS} of ${DEVCONTAINER}${old}`;
  for (const [name, entry] of Object.entries(settings?.extraKnownMarketplaces ?? {})) {
    const source = entry?.source?.source;
    if (source === "directory" || source === "file") report(CLAUDE_SETTINGS, 0, `the marketplace ${name} is a local ${source}: ${why}`);
  }
  for (const [key, on] of Object.entries(settings?.enabledPlugins ?? {})) {
    const at = key.lastIndexOf("@");
    if (on !== true || at < 0) continue;
    if (key.slice(at + 1) === OLD_MARKETPLACE_NAME) report(CLAUDE_SETTINGS, 0, `${key} is turned on from the marketplace ${OLD_MARKETPLACE_NAME}, which spec no longer has: ${why}`);
    else if (loaded.has(key.slice(0, at))) report(CLAUDE_SETTINGS, 0, `${key} is turned on, and ${PLUGIN_DIRS} of ${DEVCONTAINER} loads ${key.slice(0, at)} already`);
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
