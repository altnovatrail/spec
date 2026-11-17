// Where a task of a repository runs: the container of that repository's clone on the host, which
// Dev Containers created when the author opened the clone in VS Code, or the orchestrator's own
// rebuild or create by the Dev Containers CLI (R156, R158; sources 9.3).
//
// Dev Containers labels each container with the host's folder it was opened from,
// devcontainer.local_folder, and the configuration it was built by, devcontainer.config_file; spec's
// folder has two configurations, so both labels together find one. Docker names the container
// itself — busy_gauss, modest_lichterman —, so a name finds it only when given (RUN.md, T168). The
// clones lie side by side on the host, so a repository's folder is the one beside the folder of the
// orchestrator's own container, unless the author names it.

import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { DOCKER } from "../shared.mjs";

export const FOLDER_LABEL = "devcontainer.local_folder";
export const CONFIG_LABEL = "devcontainer.config_file";
// The volume of Claude Code's sign-in and transcripts, which every NovaTrail devcontainer mounts in
// ~/.claude, and where the orchestrator keeps its runs (README.md).
export const CLAUDE_VOLUME = "novatrail-claude";

// A repository's name, as GitHub has it: .github is one.
export const REPOSITORY = /^\.?[a-z0-9][a-z0-9._-]*$/;

// docker with its arguments: what it printed, or an error with what it said.
export function runDocker(args, { program = DOCKER, env = process.env } = {}) {
  const result = spawnSync(program, args, { encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  if (result.error) throw new Error(`docker ${args[0]}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`docker ${args.join(" ")}: ${String(result.stderr).trim()}`);
  return result.stdout;
}

// What docker inspect says of each container, or [] for none.
export function inspect(ids, docker) {
  return ids.length ? JSON.parse(docker(["inspect", "--type", "container", ...ids])) : [];
}

// The host's folder of the clone the orchestrator's own container was opened from: a container's
// hostname is its short id.
export function ownFolder(docker, hostname = os.hostname()) {
  const [self] = inspect([hostname], docker);
  const folder = self?.Config?.Labels?.[FOLDER_LABEL];
  if (!folder) throw new Error(`this container, ${hostname}, has no label ${FOLDER_LABEL}: run in spec's orchestrator container, or name the repository's folder with --folder`);
  return folder;
}

// The container of a repository, by the options the author may give: `container`, its name or id;
// or else `folder`, the host's folder of its clone, by default the one named `repo` beside the
// orchestrator's own. Of several with the same labels, the one running; none, or several running,
// is an error that says what to do. A name or a folder comes from a command line that a session of
// Claude Code writes, so docker gets neither as it is: a name is looked up among docker's own
// containers, and a folder is the repository's, an absolute path with no step back.
export function findContainer(repo, { docker, container = null, folder = null, hostname } = {}) {
  if (!REPOSITORY.test(repo) || /^\.+$/.test(repo)) throw new Error(`not a repository's name: ${repo}`);
  if (container) {
    const all = docker(["ps", "--all", "--no-trunc", "--format", "{{.ID}}"]).split("\n").filter(Boolean);
    const found = inspect(all, docker).find((c) => c.Id === container || c.Id.startsWith(container) || nameOf(c) === container);
    if (!found) throw new Error(`no container named ${container}`);
    const its = found.Config?.Labels?.[FOLDER_LABEL] ?? "";
    if (path.posix.basename(its) !== repo) throw new Error(`${nameOf(found)} is the container of ${its || "no clone"}, not of ${repo}`);
    return found;
  }
  if (folder !== null && (!path.posix.isAbsolute(folder) || path.posix.normalize(folder) !== folder || path.posix.basename(folder) !== repo)) {
    throw new Error(`--folder must be the absolute path of a clone named ${repo}`);
  }
  const local = folder ?? path.posix.join(path.posix.dirname(ownFolder(docker, hostname)), repo);
  const config = path.posix.join(local, ".devcontainer", "devcontainer.json");
  const ids = docker(["ps", "--all", "--no-trunc", "--filter", `label=${FOLDER_LABEL}=${local}`, "--filter", `label=${CONFIG_LABEL}=${config}`, "--format", "{{.ID}}"])
    .split("\n")
    .filter(Boolean);
  const found = inspect(ids, docker);
  if (found.length === 0) {
    throw new Error(`no container of ${repo} by ${FOLDER_LABEL}=${local}: create it, or open ${local} in VS Code and «Reopen in Container» once, then close its window`);
  }
  if (found.length === 1) return found[0];
  const running = found.filter((c) => c.State?.Running);
  if (running.length === 1) return running[0];
  throw new Error(`${found.length} containers of ${repo}, ${running.length} of them running: ${found.map(nameOf).join(", ")}; name one with --container`);
}

// A container's name, which docker inspect gives with a slash before it.
export function nameOf(container) {
  return String(container.Name ?? container.Id).replace(/^\//, "");
}

// Where the run goes in a container: the folder its clone is mounted at, the folder of its own
// labels, and where it mounts the volume of Claude Code. A container without that volume cannot
// share the run's files with the orchestrator, nor sign in to Claude.
export function placeOf(container) {
  const folder = container.Config?.Labels?.[FOLDER_LABEL];
  const mounts = container.Mounts ?? [];
  const clone = mounts.find((m) => m.Type === "bind" && m.Source === folder);
  if (!clone) throw new Error(`${nameOf(container)}: no folder of the host's clone mounted (${FOLDER_LABEL}=${folder ?? "none"})`);
  const claude = mounts.find((m) => m.Type === "volume" && m.Name === CLAUDE_VOLUME);
  if (!claude) throw new Error(`${nameOf(container)}: the volume ${CLAUDE_VOLUME} is not mounted; rebuild the container from its .devcontainer/devcontainer.json`);
  return { id: container.Id, name: nameOf(container), folder, workdir: clone.Destination, claude: claude.Destination };
}

// Starts a stopped container and waits until docker says it runs, `tries` times `pause` apart.
export function ensureRunning(container, { docker, sleep, tries = 30, pause = 1000 }) {
  if (container.State?.Running) return container;
  docker(["start", container.Id]);
  for (let i = 0; i < tries; i += 1) {
    const [now] = inspect([container.Id], docker);
    if (now?.State?.Running) return now;
    sleep(pause);
  }
  throw new Error(`${nameOf(container)}: started, but not running after ${(tries * pause) / 1000} s`);
}
