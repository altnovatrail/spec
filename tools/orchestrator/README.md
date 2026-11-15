# tools/orchestrator

The orchestrator's commands (R156 in [docs/decisions.md](../../docs/decisions.md)). They run a task of a NovaTrail repository as one `claude -p` in that repository's devcontainer, read how it went, and continue the same session with the author's answers. «Сделай эпик E…» calls them from a session of spec in its orchestrator container, `.devcontainer/orchestrator/`, which sees the host's Docker. The procedure that calls them is RUN.md, T170.

The code takes only Node's own modules. It runs from the orchestrator's own clone of spec, which has no `node_modules`:

```sh
node ~/.claude/novatrail-orchestrator/spec/tools/orchestrator/main.mjs <command> …
```

In spec's working tree, it runs as `just orchestrator <command> …`. Each command prints JSON, a line for each run. It exits 0 when done, 1 when what it was asked cannot be done or `wait`'s time ran out, and 2 on a wrong command line.

## Commands

- `sync` clones spec's `main` from GitHub into `~/.claude/novatrail-orchestrator/spec`, or moves it forward to `main`'s head, and prints its path and commit. The two configurations of spec open the same folder, and a task of spec run in the documents container switches its branches. The clone keeps the code and the plan at one commit of `main`. Nobody edits it: a change in it stops `sync`.
- `start <repo> <task>` runs the task in the container of `<repo>` and returns at once. Its options:
  - `--ceiling <usd>` — the task's ceiling of cost, $75 by default (measurements 1.12);
  - `--prompt <file>` — a prompt other than «Выполни задачу <task> из RUN.md»: the standard text of wave 0, or a task the orchestrator gives in full;
  - `--container <name or id>` — the container itself;
  - `--folder <host's folder>` — the clone on the host, when it does not lie beside spec's.
- `resume <run>` continues a run that has ended, in the same session, and returns at once. Its options:
  - `--answers <file>` — the prompt: the author's answers, or what the orchestrator has to say, such as the checks that failed; without it, «Continue the task from where it stopped.»;
  - `--ceiling <usd>` — the author's new ceiling.

  It refuses a run that still runs, a limit that has not reset yet, and a run with nothing left of its ceiling.
- `status [<run>…]` prints where each run stands, every run when none is named.
- `wait <run>… [--timeout <seconds>]` waits until each run has ended and prints its state as it ends; it suits a background command or Monitor.

## Finding the container

Dev Containers labels a container with the host's folder of the clone, `devcontainer.local_folder`, and its configuration, `devcontainer.config_file` (sources 9.3). The orchestrator finds a repository's container by both labels, for the folder beside its own folder on the host. For spec, that is the documents container, by `.devcontainer/devcontainer.json`. Of two with the same labels, it takes the running one.

A stopped container is started with `docker start`. The orchestrator needs no window of VS Code, and the author keeps the container's window closed while a run goes on. When the author has never opened a repository in its container, there is no container, and the error names the folder to open.

## The run

A run is one task carried by one session of Claude Code, across its attempts:
- the first attempt is `claude -p` with a session's id that the orchestrator chooses, `--session-id`;
- each later one is a `--resume` of it.

Every attempt is Opus at effort `high`, with `--permission-mode bypassPermissions`, `--output-format stream-json --verbose`, the contract [executor.md](executor.md) by `--append-system-prompt`, the schema [status.schema.json](status.schema.json) by `--json-schema`, and `--max-budget-usd` set to what is left of the ceiling. `total_cost_usd` of a resumed run is the session's whole total (sources 2.11), so what the task spent is the largest total any attempt printed.

git in the executor's container pushes through `gh auth git-credential`, set by `GIT_CONFIG_*` for the run: the container's own helper is VS Code's, which a `docker exec` without a window cannot reach (sources 9.3).

A run's folder is `~/.claude/novatrail-orchestrator/runs/<repo>-<task>-<UTC time>/`. It is on the volume `novatrail-claude`, which every NovaTrail devcontainer mounts in `~/.claude`. The executor's container writes its files there itself, so a run outlives the orchestrator's session, and its container is all it needs. The files:

| File | What it holds |
|---|---|
| `run.json` | the repository, the task, the container, the session's id, the ceiling, and each attempt with when it started and its budget |
| `events.jsonl` | the orchestrator's own log of the run: each start and resume |
| `executor.md`, `status.schema.json` | the contract and the schema of the copy of the orchestrator that started the run |
| `prompt-<n>.txt` | the prompt of attempt n, which claude reads on stdin |
| `pid-<n>` | the pid of the attempt's `sh` in its container |
| `stream-<n>.jsonl` | what claude printed, its `stream-json` |
| `stderr-<n>.txt` | what claude said on stderr |
| `exit-<n>` | claude's exit code, written last |

The contract, the schema and the prompt go as files rather than arguments, so `docker exec`'s arguments stay short. The run's `sh` reads them inside the container.

## Where a run stands

`status` and `wait` print, for each run, its `phase` and the following fields:
- `status` — the executor's status by the schema;
- `reason` — why it stopped otherwise;
- `resets_at` — when the limit resets;
- `spent_usd` and `ceiling_usd`;
- `unpriced_attempts` — the attempts after the last one that printed a cost;
- `model_usage`, `num_turns` and `duration_ms` of the last result.

The phases:

| Phase | When |
|---|---|
| `running` | no exit code yet, and the attempt's `sh` is alive, or it started less than a minute ago |
| `done`, `waiting`, `failed` | the executor's own status, by the schema |
| `limited` | the subscription's limit stopped it: a `rate_limit_event` with `status: "rejected"`, a message of the model with `error: "rate_limit"`, or a result with the limit's text |
| `over-ceiling` | it reached its `--max-budget-usd` |
| `failed` | also: no status by the schema, an error of the run, or no result at all |
| `lost` | no exit code, and its process is gone: the container stopped, or it was killed |

The tests are `just orchestrator-test`.
