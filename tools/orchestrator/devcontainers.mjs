// Rebuilding a repository's container, and creating the container a repository never had, by the
// Dev Containers CLI of the orchestrator's image (R158). `devcontainer up` reads the configuration
// at the folder it is given and gives Docker the same path to mount, and the orchestrator's
// container sees only spec's folder and .epics. So the CLI runs in a helper: a container of the
// orchestrator's own image, with the host's Docker and the folder of the host that holds the clone at
// the same path, on the host's network, so that a repository's initializeCommand, which Dev
// Containers runs "on the host machine", reads the host's routes and makes .epics beside the clone on
// the host; it is removed once it ends. It labels the container as VS Code does, by the folder and
// the configuration, so findContainer, a window of VS Code and a run's resume find the new one again.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DOCKER } from "../shared.mjs";
import { CONFIG_LABEL, FOLDER_LABEL, findContainer, inspect, nameOf, ownFolder, REPOSITORY } from "./containers.mjs";

// A repository the CLI may build: NovaTrail's own, on GitHub (R158). The socket is root on the host.
export const ORGANIZATION = "https://github.com/altnovatrail";
export const UP_TIMEOUT_MS = 60 * 60 * 1000;

// What the helper runs, by sh: the mode, `rebuild` or `create`, the repository, the host's folder
// of its clone and the configuration. A clone that is not there yet is made from GitHub's main, with
// spec as its submodule. A clone of another origin is not built, and neither is one whose
// .devcontainer/ is not main's on GitHub — its working tree changed, or a branch not merged —, so
// what the CLI builds is what main names. Files the repository's .gitignore names are not looked
// at: spec's orchestrator/docker-gid is one, which its initializeCommand writes on the host.
//
// The helper holds the host's socket, and the clone's .git/ is writable from the repository's own
// container, which has none: so git never runs with the clone's configuration, whose hooks and
// fsmonitor would run here. Its origin is read from the file alone, main is a fresh clone in the
// helper's own folder, and the clone's .devcontainer/ is compared as that clone's work tree. The
// CLI does not look for a git root either: the folder is the clone. Nothing of the author's clone
// is written.
export const UP_SCRIPT = [
  "set -eu",
  'mode=$1; repo=$2; folder=$3; config=$4; url=$5/$repo.git; ssh=git@github.com:${url#https://github.com/}',
  'if [ "$mode" = create ] && [ ! -e "$folder" ]; then git clone --quiet --recurse-submodules "$url" "$folder" >&2; fi',
  'origin=$(git config --file "$folder/.git/config" --get remote.origin.url 2>/dev/null || true)',
  'case "$origin" in "$url" | "${url%.git}" | "$ssh" | "${ssh%.git}") ;; *) echo "$folder is not a clone of $url: its origin is ${origin:-none}" >&2; exit 3 ;; esac',
  'main=$(mktemp -d)',
  // The helper's /tmp may be the host's, when the clone lies there and its folder is mounted.
  'trap \'rm -rf "$main"\' EXIT',
  'git clone --quiet --no-checkout --depth 1 --branch main "$url" "$main" >&2',
  'git -C "$main" read-tree HEAD',
  'if ! git --git-dir="$main/.git" --work-tree="$folder" diff --quiet HEAD -- .devcontainer || [ -n "$(git --git-dir="$main/.git" --work-tree="$folder" status --porcelain --untracked-files=all -- .devcontainer)" ]; then echo "$folder: its .devcontainer/ is not that of main on GitHub" >&2; exit 4; fi',
  'echo "main $(git -C "$main" rev-parse HEAD): $folder has its .devcontainer/" >&2',
  'rm -rf "$main"',
  'if [ "$mode" = rebuild ]; then set -- --remove-existing-container; else set --; fi',
  'exec devcontainer up --workspace-folder "$folder" --config "$config" --mount-workspace-git-root false "$@"',
].join("\n");

// The long docker run of the helper: what it printed on stdout and its exit status, or that its
// time ran out, with what it said on stderr written to `log`.
export function runLong(args, { log, program = DOCKER, env = process.env, timeout = UP_TIMEOUT_MS } = {}) {
  const fd = fs.openSync(log, "a");
  try {
    const result = spawnSync(program, args, { encoding: "utf8", env, stdio: ["ignore", "pipe", fd], maxBuffer: 64 * 1024 * 1024, timeout });
    if (result.error?.code === "ETIMEDOUT") return { status: null, stdout: result.stdout ?? "", timedOut: true };
    if (result.error) throw new Error(`docker ${args[0]}: ${result.error.message}`);
    return { status: result.status, stdout: result.stdout };
  } finally {
    fs.closeSync(fd);
  }
}

// The image of the orchestrator's own container, which holds the Dev Containers CLI.
export function ownImage(docker, hostname) {
  const [self] = inspect([hostname], docker);
  if (!self?.Image) throw new Error(`this container, ${hostname}, has no image docker names`);
  return self.Image;
}

// One name per repository: one build of a repository at a time.
export function helperName(repo) {
  return `novatrail-up-${repo}`;
}

// The arguments of docker for the helper: the socket, the folder of the host that holds the clone at
// the same path, and the script.
export function helperArgs({ image, repo, mode, folder, config, mount, organization = ORGANIZATION }) {
  return [
    "run",
    "--rm",
    // The CLI is not the first process: a signal from docker, as at the time-out, ends it.
    "--init",
    "--name",
    helperName(repo),
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

// A failure names the log.
function up({ repo, mode, folder, config, mount }, deps) {
  const image = ownImage(deps.docker, deps.hostname);
  const dir = path.join(deps.home, "containers");
  fs.mkdirSync(dir, { recursive: true });
  const time = deps.now().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  // The name comes from a command line or a label, so the log is held to the folder of logs.
  const log = path.resolve(dir, `${repo}-${mode}-${time}.log`);
  if (!REPOSITORY.test(repo) || !log.startsWith(path.resolve(dir) + path.sep)) throw new Error(`not a repository's name: ${repo}`);
  const { status, stdout, timedOut } = deps.dockerLong(helperArgs({ image, repo, mode, folder, config, mount, organization: deps.organization }), { log });
  if (timedOut) {
    // docker's client is gone, and the helper may not be: it must not build on unseen.
    try {
      deps.docker(["rm", "--force", helperName(repo)]);
    } catch {
      // Gone already.
    }
    throw new Error(`${mode} of ${repo} took more than ${UP_TIMEOUT_MS / 60_000} minutes, and its helper is removed; its log is ${log}`);
  }
  const outcome = outcomeOfUp(stdout);
  if (status !== 0 || outcome?.outcome !== "success" || !outcome.containerId) {
    throw new Error(`${mode} of ${repo} failed, exit ${status}${outcome?.message ? `: ${outcome.message}` : ""}; its log is ${log}`);
  }
  const [made] = inspect([outcome.containerId], deps.docker);
  return { id: made.Id, name: nameOf(made), log };
}

// Rebuilds a repository's container from its clone, by its own labels. Never the orchestrator's own
// container, nor one in which a session of Claude Code runs — an executor's run, which ends before
// its merge, or the author's in a window.
export function rebuild(repo, { container = null, folder = null }, deps) {
  const found = findContainer(repo, { docker: deps.docker, container, folder, hostname: deps.hostname });
  const labels = found.Config?.Labels ?? {};
  const local = labels[FOLDER_LABEL];
  const config = labels[CONFIG_LABEL];
  if (found.Id.startsWith(deps.hostname)) {
    throw new Error(`${nameOf(found)} is the orchestrator's own container: the author rebuilds it`);
  }
  if (!config?.startsWith(`${local}/`) || path.posix.normalize(config) !== config) throw new Error(`${nameOf(found)}: its configuration, ${config ?? "none"}, is not in its folder ${local}`);
  // The CLI removes the container it finds by the labels, which need not be the one found here.
  const same = deps.docker(["ps", "--all", "--no-trunc", "--filter", `label=${FOLDER_LABEL}=${local}`, "--filter", `label=${CONFIG_LABEL}=${config}`, "--format", "{{.Names}}"]).split("\n").filter(Boolean);
  if (same.length > 1) throw new Error(`${same.length} containers of ${repo} have the labels of ${nameOf(found)}: ${same.join(", ")}; remove the old ones, then rebuild`);
  if (found.State?.Running) {
    const sessions = sessionsIn(found, deps.docker);
    if (sessions) throw new Error(`${nameOf(found)}: ${sessions} process(es) of Claude Code run in it; rebuild it once they have ended`);
  }
  // The folder that holds the clone, not the clone alone: with the clone alone, the mkdir of .epics in
  // its initializeCommand would make it, if at all, in the helper rather than on the host, and the
  // container's bind of .epics needs it there (R166).
  const made = up({ repo: path.posix.basename(local), mode: "rebuild", folder: local, config, mount: path.posix.dirname(local) }, deps);
  return { repo: path.posix.basename(local), folder: local, config, from: { id: found.Id, name: nameOf(found) }, to: made };
}

// Creates the container of a repository that has none: its clone beside spec's on the host, or
// the folder named, cloned from GitHub's main when it is not there yet, by its default
// configuration. A repository with a container already is refused: that one is rebuilt instead.
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
