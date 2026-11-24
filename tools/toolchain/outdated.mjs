// outdated: which VS Code extensions a repository's devcontainer pins, and which Claude Code its
// image installs, have a newer stable release.
//
//   node tools/toolchain/outdated.mjs
//
// It reads the repository it is run from — spec by `just devcontainer-outdated`, another NovaTrail
// repository by `just -f spec/justfile devcontainer-outdated`: customizations.vscode.extensions
// of each .devcontainer/devcontainer.json and .devcontainer/*/devcontainer.json, the extensions
// of the kinds in repo-template/kinds.json where there is one, and ARG CLAUDE_CODE_VERSION of
// .devcontainer/Dockerfile. It asks the VS Code Marketplace for each extension's latest stable
// version that this container's platform can install, and npm for Claude Code's dist-tag latest,
// and prints a table. It exits 0 when nothing is behind, 1 when something is or a pin is not
// exact, and 2 when a file, the Marketplace or npm could not be read, since then it cannot tell. It takes only Node's own modules: spec/tools/ of another
// repository has no node_modules.

import fs from "node:fs";
import path from "node:path";
import { isMain } from "../shared.mjs";
import { parseJsonc, readKind } from "../new-repo/devcontainer.mjs";

export const MARKETPLACE = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
export const NPM_DIST_TAGS = "https://registry.npmjs.org/-/package/@anthropic-ai/claude-code/dist-tags";
export const CLAUDE_EXTENSION = "anthropic.claude-code";
// The query VS Code's own gallery service makes, by extensionGalleryManifestService.ts of
// microsoft/vscode at af98790: filter 7, an extension's publisher.name; flags 19, its versions,
// their files and their properties, where the property below marks a pre-release.
const FILTER_EXTENSION_NAME = 7;
const FLAGS = 0x1 | 0x2 | 0x10;
const PRE_RELEASE = "Microsoft.VisualStudio.Code.PreRelease";
const TIMEOUT_MS = 60_000;

// Each extension the repository pins, with the file that pins it: { id, version, where }. id is
// in lower case, as the Marketplace matches it; version is null for a pin without one. A file
// that does not parse is Unreadable, with its name.
export function pinsOf(root) {
  const parse = (file, how) => {
    try {
      return how(fs.readFileSync(file, "utf8"));
    } catch (error) {
      throw new Unreadable(`${path.relative(root, file)}: ${error.message}`);
    }
  };
  const pins = [];
  const add = (entries, where) => {
    for (const entry of entries ?? []) {
      const at = entry.lastIndexOf("@");
      const [id, version] = at > 0 ? [entry.slice(0, at), entry.slice(at + 1)] : [entry, null];
      pins.push({ id: id.toLowerCase(), version, where });
    }
  };
  const dir = path.join(root, ".devcontainer");
  const configs = [path.join(dir, "devcontainer.json")];
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entry.isDirectory()) configs.push(path.join(dir, entry.name, "devcontainer.json"));
    }
  }
  for (const file of configs) {
    if (!fs.existsSync(file)) continue;
    add(parse(file, parseJsonc).customizations?.vscode?.extensions, path.relative(root, file));
  }
  const kinds = path.join(root, "repo-template", "kinds.json");
  if (fs.existsSync(kinds)) {
    const template = path.dirname(kinds);
    for (const [kind, adds] of Object.entries(parse(kinds, JSON.parse))) {
      add(parse(kinds, () => readKind(template, kind, adds)).extensions, `repo-template/kinds.json (${kind})`);
    }
  }
  return pins;
}

// The Claude Code the image installs, ARG CLAUDE_CODE_VERSION, or null where the Dockerfile has none.
export function claudeCodeOf(root) {
  const file = path.join(root, ".devcontainer", "Dockerfile");
  if (!fs.existsSync(file)) return null;
  return /^ARG CLAUDE_CODE_VERSION=(\S+)$/m.exec(fs.readFileSync(file, "utf8"))?.[1] ?? null;
}

// Versions compared part by part as numbers, as 26.1117.41037 and 2.1.331 are written.
export function compareVersions(a, b) {
  const pa = a.split(/[.-]/);
  const pb = b.split(/[.-]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? "0";
    const y = pb[i] ?? "0";
    const nx = Number(x);
    const ny = Number(y);
    const d = Number.isInteger(nx) && Number.isInteger(ny) ? nx - ny : x < y ? -1 : x > y ? 1 : 0;
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

// The platform VS Code installs an extension for in this container, as the Marketplace names it.
export const PLATFORM = `linux-${process.arch}`;

// The latest stable version of one extension of the Marketplace's answer: the pre-releases left
// out, and a version counted once, when it is published for every platform or for this one — a
// version built for some platforms first gets its Linux builds later.
export function latestStable(extension, platform = PLATFORM) {
  const stable = new Set();
  for (const v of extension.versions ?? []) {
    if ((v.properties ?? []).some((p) => p.key === PRE_RELEASE && p.value === "true")) continue;
    if (v.targetPlatform && v.targetPlatform !== "universal" && v.targetPlatform !== platform) continue;
    stable.add(v.version);
  }
  return [...stable].sort(compareVersions).at(-1) ?? null;
}

async function getJson(fetchImpl, url, init, what) {
  let response;
  try {
    response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new Unreadable(`${what}: ${error.cause?.code ?? error.name}`);
  }
  if (!response.ok) throw new Unreadable(`${what}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new Unreadable(`${what}: the answer is not JSON`);
  }
}

export class Unreadable extends Error {}

// The latest stable version of each id, by one query of the Marketplace; null for an id it does not know.
export async function marketplaceLatest(ids, fetchImpl = fetch, platform = PLATFORM) {
  const body = {
    filters: [{ criteria: ids.map((value) => ({ filterType: FILTER_EXTENSION_NAME, value })), pageSize: ids.length }],
    flags: FLAGS,
  };
  const answer = await getJson(
    fetchImpl,
    MARKETPLACE,
    {
      method: "POST",
      headers: { Accept: "application/json;api-version=7.2-preview.1", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    "the VS Code Marketplace",
  );
  const latest = new Map(ids.map((id) => [id, null]));
  for (const extension of answer.results?.[0]?.extensions ?? []) {
    const id = `${extension.publisher?.publisherName}.${extension.extensionName}`.toLowerCase();
    if (latest.has(id)) latest.set(id, latestStable(extension, platform));
  }
  return latest;
}

// Claude Code's latest version on npm, the dist-tag latest.
export async function npmLatest(fetchImpl = fetch) {
  const tags = await getJson(fetchImpl, NPM_DIST_TAGS, { headers: { Accept: "application/json" } }, "npm");
  if (typeof tags.latest !== "string") throw new Unreadable("npm: no dist-tag latest");
  return tags.latest;
}

const major = (version) => version.split(".")[0];

// "outdated", with the change of the major version where there is one; "" for a pin not behind.
function behind(pinned, last) {
  if (compareVersions(pinned, last) >= 0) return "";
  return major(pinned) === major(last) ? "outdated" : `outdated, major ${major(pinned)} → ${major(last)}`;
}

// The rows of the table and whether anything is behind. A pin repeated with the same version in
// several files is one row that names them all.
export function report(pins, latest, claude) {
  const rows = [];
  let anyBehind = false;
  const grouped = new Map();
  for (const pin of pins) {
    const key = `${pin.id}@${pin.version}`;
    if (grouped.has(key)) grouped.get(key).where.push(pin.where);
    else grouped.set(key, { ...pin, where: [pin.where] });
  }
  for (const pin of grouped.values()) {
    const last = latest.get(pin.id) ?? null;
    let note;
    if (pin.version === null) note = "no exact version";
    else if (last === null) note = "not in the Marketplace";
    else note = behind(pin.version, last);
    if (note) anyBehind = true;
    rows.push({ name: pin.id, pinned: pin.version ?? "—", latest: last ?? "—", note, where: pin.where.join(", ") });
  }
  if (claude) {
    let note = behind(claude.pinned, claude.latest);
    // The image's Claude Code and the extension are one release: the Dockerfile's comment asks it.
    const other = pins.filter((p) => p.id === CLAUDE_EXTENSION && p.version !== claude.pinned);
    if (other.length > 0) note = [note, `not the version of ${CLAUDE_EXTENSION}`].filter(Boolean).join(", ");
    if (note) anyBehind = true;
    rows.push({ name: "CLAUDE_CODE_VERSION (npm latest)", pinned: claude.pinned, latest: claude.latest, note, where: ".devcontainer/Dockerfile" });
  }
  return { rows, behind: anyBehind };
}

export function table(rows) {
  const head = { name: "extension", pinned: "pinned", latest: "latest", note: "", where: "where" };
  const cols = ["name", "pinned", "latest", "note", "where"];
  const width = Object.fromEntries(cols.map((c) => [c, Math.max(...[head, ...rows].map((r) => r[c].length))]));
  return [head, ...rows].map((r) => cols.map((c) => r[c].padEnd(width[c])).join("  ").trimEnd()).join("\n");
}

// The check of the repository at root; the exit code.
export async function main(root = process.cwd(), fetchImpl = fetch, out = process.stdout, err = process.stderr, platform = PLATFORM) {
  let latest;
  let claude = null;
  let pins;
  try {
    pins = pinsOf(root);
    const pinnedClaude = claudeCodeOf(root);
    if (pins.length === 0 && pinnedClaude === null) {
      err.write("devcontainer-outdated: no .devcontainer/devcontainer.json with extensions and no CLAUDE_CODE_VERSION here\n");
      return 1;
    }
    const ids = [...new Set(pins.map((p) => p.id))];
    const [market, npm] = await Promise.all([
      ids.length > 0 ? marketplaceLatest(ids, fetchImpl, platform) : new Map(),
      pinnedClaude === null ? null : npmLatest(fetchImpl),
    ]);
    latest = market;
    if (npm !== null) claude = { pinned: pinnedClaude, latest: npm };
  } catch (error) {
    if (!(error instanceof Unreadable)) throw error;
    err.write(`devcontainer-outdated: could not read ${error.message}; nothing was checked\n`);
    return 2;
  }
  const { rows, behind } = report(pins, latest, claude);
  out.write(`${table(rows)}\n`);
  out.write(behind ? "\nSomething is behind or not exact: raise it to the latest version.\n" : "\nEverything is at its latest version.\n");
  return behind ? 1 : 0;
}

if (isMain(import.meta.url)) process.exitCode = await main();
