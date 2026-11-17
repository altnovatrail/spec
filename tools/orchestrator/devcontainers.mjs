// Rebuilding a repository's container, and creating the container a repository never had, by the
// Dev Containers CLI of the orchestrator's image (R158; RUN.md, T193). `devcontainer up` reads the
// configuration at the folder it is given and gives Docker the same path to mount (sources 9.5), and
// the orchestrator's container sees only spec's folder. So the CLI runs in a helper: a container of
// the orchestrator's own image, with the host's Docker and the clone's folder of the host at the
// same path, on the host's network, so that a repository's initializeCommand, which Dev Containers
// runs "on the host machine" (sources 9.4), reads the host's routes; it is removed once it ends.
// It labels the container as VS Code does, by the folder and the configuration (sources 9.3), so
// findContainer, a window of VS Code and a run's resume find the new one again.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DOCKER } from "../shared.mjs";
import { CONFIG_LABEL, FOLDER_LABEL, findContainer, inspect, nameOf, ownFolder, REPOSITORY } from "./containers.mjs";

// A repository the CLI may build: NovaTrail's own, on GitHub (R158). The socket is root on the host.
export const ORGANIZATION = "https://github.com/altnovatrail";
// How long a build may take before the orchestrator gives up on it.
export const UP_TIMEOUT_MS = 60 * 60 * 1000;

// What the helper runs, by sh: the mode, `rebuild` or `create`, the repository, the host's folder
// of its clone and the configuration. A clone that is not there yet is made from GitHub's main, with
// spec as its submodule. A clone of another origin is not built, and neither is one whose
// .devcontainer/ is not main's on GitHub — its working tree changed, or a branch not merged —, so
// what the CLI builds is what main names, and the author's working tree is never changed.
export const UP_SCRIPT = [
  "set -eu",
  'mode=$1; repo=$2; folder=$3; config=$4; url=$5/$repo.git',
  'if [ "$mode" = create ] && [ ! -e "$folder" ]; then git clone --quiet --recurse-submodules "$url" "$folder" >&2; fi',
  'origin=$(git -C "$folder" remote get-url origin 2>/dev/null || true)',
  'case "$origin" in "$url" | "${url%.git}") ;; *) echo "$folder is not a clone of $url: its origin is ${origin:-none}" >&2; exit 3 ;; esac',
  'git -C "$folder" fetch --quiet "$url" main',
  'if ! git -C "$folder" diff --quiet FETCH_HEAD -- .devcontainer || [ -n "$(git -C "$folder" status --porcelain -- .devcontainer)" ]; then echo "$folder: its .devcontainer/ is not that of main on GitHub" >&2; exit 4; fi',
  'echo "commit $(git -C "$folder" rev-parse HEAD) on $(git -C "$folder" rev-parse --abbrev-ref HEAD), main $(git -C "$folder" rev-parse FETCH_HEAD)" >&2',
  'if [ "$mode" = rebuild ]; then set -- --remove-existing-container; else set --; fi',
  'exec devcontainer up --workspace-folder "$folder" --config "$config" "$@"',
].join("\n");

// The long docker run of the helper: what it printed on stdout and its exit status, with what it
// said on stderr written to `log`.
export function runLong(args, { log, program = DOCKER, env = process.env, timeout = UP_TIMEOUT_MS } = {}) {
  const fd = fs.openSync(log, "a");
  try {
    const result = spawnSync(program, args, { encoding: "utf8", env, stdio: ["ignore", "pipe", fd], maxBuffer: 64 * 1024 * 1024, timeout });
    if (result.error) throw new Error(`docker ${args[0]}: ${result.error.message}`);
    return { status: result.status, stdout: result.stdout };
  } finally {
    fs.closeSync(fd);
  }
}

// The image of the orchestrator's own container, which holds the Dev Containers CLI (T192).
export function ownImage(docker, hostname) {
  const [self] = inspect([hostname], docker);
  if (!self?.Image) throw new Error(`this container, ${hostname}, has no image docker names`);
  return self.Image;
}

// The arguments of docker for the helper: the socket, the folder of the host at the same path —
// the clone's own, or for a clone still to make the folder that will hold it —, and the script.
export function helperArgs({ image, repo, mode, folder, config, mount, organization = ORGANIZATION }) {
  return [
    "run",
    "--rm",
    "--name",
    `novatrail-up-${repo}`,
    "--network",
    "host",
    "--user",
    "vscode",
    "--mount",
    "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock",
    "--mount",
    `type=bind,source=${mount},target=${mount}`,
    "--workdir",
    mount,
    image,
    "sh",
    "-c",
    UP_SCRIPT,
    "sh",
    mode,
    repo,
    folder,
    config,
    organization,
  ];
}

// The processes of a container named `claude`: a session of Claude Code, an executor's or one in a
// window, which a rebuild would cut off. docker top reads them on the host, whatever the image has.
export function sessionsIn(container, docker) {
  const lines = docker(["top", container.Id, "-eo", "pid,args"]).split("\n").slice(1).filter(Boolean);
  return lines.filter((line) => {
    const program = line.trim().split(/\s+/).slice(1, 3);
    return program.some((word, i) => path.posix.basename(word) === "claude" && (i === 0 || /(^|\/)node$/.test(program[0])));
  }).length;
}

// The last line of JSON the CLI printed: its outcome and the container's id.
function outcomeOfUp(stdout) {
  const line = stdout.trim().split("\n").reverse().find((l) => l.startsWith("{"));
  try {
    return line ? JSON.parse(line) : null;
  } catch {
    return null;
  }
}

// Runs the helper and reads what the CLI did; a failure names the log.
function up({ repo, mode, folder, config, mount }, deps) {
  const image = ownImage(deps.docker, deps.hostname);
  const dir = path.join(deps.home, "containers");
  fs.mkdirSync(dir, { recursive: true });
  const time = deps.now().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const log = path.join(dir, `${repo}-${mode}-${time}.log`);
  const { status, stdout } = deps.dockerLong(helperArgs({ image, repo, mode, folder, config, mount, organization: deps.organization }), { log });
  const outcome = outcomeOfUp(stdout);
  if (status !== 0 || outcome?.outcome !== "success" || !outcome.containerId) {
    throw new Error(`${mode} of ${repo} failed, exit ${status}${outcome?.message ? `: ${outcome.message}` : ""}; its log is ${log}`);
  }
  const [made] = inspect([outcome.containerId], deps.docker);
  return { id: made.Id, name: nameOf(made), log };
}

// Rebuilds a repository's container from its clone, by its own labels: the folder and the
// configuration. Not the orchestrator's own container, and not one in which a session of Claude Code
// runs — an executor's run, which ends before its merge, or the author's in a window.
export function rebuild(repo, { container = null, folder = null }, deps) {
  const found = findContainer(repo, { docker: deps.docker, container, folder, hostname: deps.hostname });
  const labels = found.Config?.Labels ?? {};
  const local = labels[FOLDER_LABEL];
  const config = labels[CONFIG_LABEL];
  if (found.Id.startsWith(deps.hostname)) {
    throw new Error(`${nameOf(found)} is the orchestrator's own container: the author rebuilds it`);
  }
  if (!config?.startsWith(`${local}/`)) throw new Error(`${nameOf(found)}: its configuration, ${config ?? "none"}, is not in its folder ${local}`);
  if (found.State?.Running) {
    const sessions = sessionsIn(found, deps.docker);
    if (sessions) throw new Error(`${nameOf(found)}: ${sessions} process(es) of Claude Code run in it; rebuild it once they have ended`);
  }
  const made = up({ repo: path.posix.basename(local), mode: "rebuild", folder: local, config, mount: local }, deps);
  return { repo: path.posix.basename(local), folder: local, config, from: { id: found.Id, name: nameOf(found) }, to: made };
}

// Creates the container of a repository that has none: its clone beside spec's on the host, or
// the folder named, cloned from GitHub's main when it is not there yet, by its default
// configuration. A repository with a container already is rebuilt instead.
export function create(repo, { folder = null }, deps) {
  if (!REPOSITORY.test(repo) || /^\.+$/.test(repo)) throw new Error(`not a repository's name: ${repo}`);
  if (folder !== null && (!path.posix.isAbsolute(folder) || path.posix.normalize(folder) !== folder || path.posix.basename(folder) !== repo)) {
    throw new Error(`--folder must be the absolute path of a clone named ${repo}`);
  }
  const local = folder ?? path.posix.join(path.posix.dirname(ownFolder(deps.docker, deps.hostname)), repo);
  const config = path.posix.join(local, ".devcontainer", "devcontainer.json");
  let existing = null;
  try {
    existing = findContainer(repo, { docker: deps.docker, folder: local });
  } catch (error) {
    if (!/^no container of /.test(error.message)) throw error;
  }
  if (existing) throw new Error(`${repo} has a container already, ${nameOf(existing)}: rebuild it`);
  const made = up({ repo, mode: "create", folder: local, config, mount: path.posix.dirname(local) }, deps);
  return { repo, folder: local, config, from: null, to: made };
}
