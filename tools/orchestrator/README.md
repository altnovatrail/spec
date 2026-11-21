# tools/orchestrator

The orchestrator's commands (R156 in [docs/decisions.md](../../docs/decisions.md)). They run a task of a NovaTrail repository as one `claude -p` in that repository's devcontainer, read how it went, and continue the same session with the author's answers. «Сделай эпик E…» calls them from a session of spec in its orchestrator container, `.devcontainer/orchestrator/`, which sees the host's Docker, by the procedure in [«Сделай эпик E…»](#сделай-эпик-e) below. A task across repositories runs here too, by [`xrepo`](#a-task-across-repositories-xrepo), its last section.

The code takes only Node's own modules. It runs from the orchestrator's own clone of spec, which has no `node_modules`:

```sh
node ~/.claude/novatrail-orchestrator/spec/tools/orchestrator/main.mjs <command> …
```

In spec's working tree, it runs as `just orchestrator <command> …`. Each command prints JSON, a line for each run. It exits 0 when done, 1 when what it was asked cannot be done or `wait`'s time ran out, and 2 on a wrong command line.

## Commands

- `sync` clones spec's `main` from GitHub into `~/.claude/novatrail-orchestrator/spec`, or moves it forward to `main`'s head, and prints its path and commit. The two configurations of spec open the same folder, and a task of spec run in the documents container switches its branches. The clone keeps the code and the plan at one commit of `main`. Nobody edits it: a change in it stops `sync`.
- `start <repo> <task>` runs the task in the container of `<repo>` and returns at once. Its options:
  - `--ceiling <usd>` — the task's ceiling of cost, $75 by default (measurements 1.12);
  - `--prompt <file>` — a prompt other than «Выполни задачу <task> из RUN.md»: the standard text of wave 0, or a task the orchestrator gives in full; the file lies in `~/.claude/novatrail-orchestrator/`, as `--answers`'s does;
  - `--container <name or id>` — the container itself, one of those `docker ps --all` lists;
  - `--folder <host's folder>` — the clone on the host, when it does not lie beside spec's: an absolute path whose last folder is named as the repository.

  A session of Claude Code writes these command lines, so docker and the files get none of their words as they are: the run's folder is named by the clone's folder and the task's number, a run is one of those in the runs' folder, and an error repeats no option's value.
- `resume <run>` continues a run that has ended, in the same session, and returns at once. Its options:
  - `--answers <file>` — the prompt: the author's answers, or what the orchestrator has to say, such as the checks that failed; without it, «Continue the task from where it stopped.»;
  - `--ceiling <usd>` — the author's new ceiling.

  It refuses a run that still runs, a limit that has not reset yet, and a run with nothing left of its ceiling. A container that docker no longer has — the author rebuilt it — is found again by its labels, as `start` found it, and the run goes on in the same session there.
- `stop <run>` stops the run's last attempt and returns once it has ended. `run.json`'s pid is the `sh` that wraps `claude`, and a signal to it would not reach `claude`: `stop` sends SIGTERM to `claude` and every process below it in the container, the commands it left in the background too, found by the parent of each in `/proc/<pid>/stat`. If any of them is still there after 30 seconds — `claude`, or a command that outlived it and that the container's first process took over —, it sends SIGKILL to what is left of them and to what is below the `sh` then. It names each process by its pid and its time of start, and signals a pid again only while its time of start is the same, so a pid passed to another process is never signalled. The `sh` writes the exit code, and `stop` returns once it has and the processes are gone, or after 10 more seconds. The attempt is recorded as stopped in `run.json` — when, by the orchestrator, by which signal last —, and `events.jsonl` names how many processes it signalled and how many outlived SIGKILL; it refuses a run that does not run.
- `status [<run>…]` prints where each run stands, every run when none is named.
- `wait <run>… [--timeout <seconds>]` waits until each run has ended and prints its state as it ends; it suits a background command or Monitor.
- `rebuild <repo>` rebuilds the repository's container and prints the container before and after, once the Dev Containers CLI has built it (R158). It takes `--container` and `--folder`, as `start` does. The container keeps its labels — the host's folder and the configuration —, so a window of VS Code, `resume` and `start` find the new one. It refuses:
  - the orchestrator's own container;
  - a container in which Claude Code runs — an executor or a session in a window, by `docker top`;
  - two containers or more with the same labels: the CLI removes the one it finds, which need not be the one named;
  - a clone whose origin is not `altnovatrail/<repo>` on GitHub, by HTTPS or SSH;
  - a clone whose `.devcontainer/` is not that of `main` on GitHub: changed in the working tree, or on a branch not merged. Files its `.gitignore` names are not looked at, as spec's `orchestrator/docker-gid`.

  git in the helper never runs with the clone's configuration, which the repository's own container can write: `main` is a fresh clone in the helper's own folder, and nothing of the clone is written.
- `create <repo>` makes the container of a repository that has none, from its clone beside spec's on the host, or the folder `--folder` names. A clone not there yet is cloned from `main` on GitHub, with spec as its submodule; one already there is used as it is, by the same checks as `rebuild`. A repository with a container is refused: rebuild it.

  Both run the CLI in a helper: `docker run --rm` of the orchestrator's own image, named `novatrail-up-<repo>`, with the host's socket, the host's network and the host's folder that holds the clone at the same path, where `create` clones a repository not there yet. The CLI needs the clone at the host's path, which the orchestrator's container does not see (sources 9.5). A repository's `initializeCommand` runs in the helper, as on the host: it reads the host's routes for its network's MTU and makes `.epics` beside the clone, which the container's bind needs on the host (R166; sources 9.7). The CLI's log is `~/.claude/novatrail-orchestrator/containers/<repo>-<rebuild or create>-<UTC time>.log`, which a failure names. A build may take up to an hour; then the helper is removed, and the error names the log. Seen on the host: sources 9.6.
- `next <repo>` prints the next free number of a task of the repository, one above the largest the repository's plan defines: on its `main`, at the head of each of its open pull requests and of each other branch, and in every number the orchestrator's runs of it have gone by, but those of the runs known to be done — by their files, the last attempt's status `done`. A number counts where the plan defines it — the first or second cell of a row of a table and a heading `#### T….` of RUN.md, `run/TASKS.md` and `docs/plan/*.md` —, not where it cites one. It reads GitHub by `gh api` and prints each source's largest beside `next`.

## Finding the container

Dev Containers labels a container with the host's folder of the clone, `devcontainer.local_folder`, and its configuration, `devcontainer.config_file` (sources 9.3). The orchestrator finds a repository's container by both labels, for the folder beside its own folder on the host. For spec, that is the documents container, by `.devcontainer/devcontainer.json`. Of two with the same labels, it takes the running one.

A stopped container is started with `docker start`. The orchestrator needs no window of VS Code, and the author keeps the container's window closed while a run goes on. When a repository has never had a container, the error names `create` and the folder (section 4).

## The run

A run is one task carried by one session of Claude Code, across its attempts:
- the first attempt is `claude -p` with a session's id that the orchestrator chooses, `--session-id`;
- each later one is a `--resume` of it.

Every attempt is Opus at effort `high`, with `--permission-mode bypassPermissions`, `--output-format stream-json --verbose`, the contract [executor.md](executor.md) by `--append-system-prompt`, the schema [status.schema.json](status.schema.json) by `--json-schema`, and `--max-budget-usd` set to what is left of the ceiling. `total_cost_usd` of a resumed run is the session's whole total (sources 2.11), so what the task spent is the largest total any attempt printed.

git in the executor's container pushes through `gh auth git-credential`, set by `GIT_CONFIG_*` for the run: the container's own helper is VS Code's, which a `docker exec` without a window cannot reach (sources 9.3).

Each attempt also gets `NOVATRAIL_RUN_TASKS`: every number the run has gone by, the one it started under and each its status named. The hook of `tools/session/` counts them as one task, so it does not refuse a resume whose prompt names the run's real number. A repository runs the hook from its `spec/` submodule, so this holds there only at a tag of spec that has it; at an older one, a resume prompt does not name the new number with a verb of a task, as «сделай T28».

The executor's status names the task's number, `task`. When it is not the run's — the executor wrote the task under the next free number, its own being taken —, the run takes it, keeps every number it has had in `labels`, and `next` and later prompts go by it. The run's id and folder keep the first.

A run's folder is `~/.claude/novatrail-orchestrator/runs/<repo>-<task>-<UTC time>/`. It is on the volume `novatrail-claude`, which every NovaTrail devcontainer mounts in `~/.claude`. The executor's container writes its files there itself, so a run outlives the orchestrator's session, and its container is all it needs. The files:

| File | What it holds |
|---|---|
| `run.json` | the repository, the task, and `labels`, every number it has gone by, the first first, once its status named another; the container, the session's id, the ceiling, and each attempt with when it started, its budget, its container, and `stopped` when `stop` ended it |
| `events.jsonl` | the orchestrator's own log of the run: each `start`, `resume` and `stop`, a `container` found again by its labels, and a `relabel` |
| `executor.md`, `status.schema.json` | the contract and the schema of the copy of the orchestrator that started the run |
| `prompt-<n>.txt` | the prompt of attempt n, which claude reads on stdin |
| `pid-<n>` | the pid of the attempt's `sh` in its container |
| `stream-<n>.jsonl` | what claude printed, its `stream-json` |
| `stderr-<n>.txt` | what claude said on stderr |
| `exit-<n>` | claude's exit code, written last |

The contract, the schema and the prompt go as files rather than arguments, so `docker exec`'s arguments stay short. The run's `sh` reads them inside the container.

## Where a run stands

`status` and `wait` print, for each run, its `phase` and the following fields:
- `task`, the number the run goes by, and `labels`, every number it has gone by, the first first;
- `container` — its name, after a rebuild the new one's;
- `status` — the executor's status by the schema;
- `reason` — why it stopped otherwise;
- `resets_at` — when the limit resets;
- `spent_usd` and `ceiling_usd`, and `spent_from`, where the spend came from:
  - `result` — the largest `total_cost_usd` any result printed, the session's whole total;
  - `transcript` — the session's transcript, larger: an attempt after the last result printed none, as one stopped or cut short. It is read again only when the size or the time of change of a file of it has changed. It is `~/.claude/projects/<the container's workdir, each character but a letter or a digit a dash>/<session>.jsonl` on the volume, with its subagents', and each message of the model counts once, by its id, at the prices of `tools/tokens/prices.mjs`;
  - `null` — neither;
- `unpriced_attempts` — the attempts after the last result that the transcript does not cover either: none was found, a call in it has no price, or it comes to no more than the results' total, and so does not show what they spent;
- `num_turns` and `duration_ms`, summed over every result of every attempt: a stream may hold several, as an executor that waits on CI in the background ends its turn and is woken again;
- `model_usage` of the last result.

The phases:

| Phase | When |
|---|---|
| `running` | no exit code yet, and the attempt's `sh` is alive, or it started less than a minute ago |
| `done`, `waiting`, `failed` | the executor's own status, by the schema |
| `limited` | the subscription's limit stopped it: a `rate_limit_event` with `status: "rejected"`, a message of the model with `error: "rate_limit"`, or a result with the limit's text |
| `over-ceiling` | it reached its `--max-budget-usd` |
| `failed` | also: no status by the schema, an error of the run, or no result at all |
| `lost` | no exit code, and its process is gone: the container stopped or was rebuilt, or it was killed |
| `stopped` | `stop` ended it |

The tests are `just orchestrator-test`.

## «Сделай эпик E…»

The procedure the orchestrator's session follows (R156). It is written for that session. `$O` below stands for `node ~/.claude/novatrail-orchestrator/spec/tools/orchestrator/main.mjs`, and `$E` for `~/.claude/novatrail-orchestrator/epics/<epic>/`, the epic's folder on the volume `novatrail-claude`.

### 1. Before the first run

1. The session is in the orchestrator's container: `NOVATRAIL_DEVCONTAINER` is `1`, and `docker ps` answers. In spec's documents container, stop: the author reopens spec in the configuration «NovaTrail orchestrator».
2. Remote Control is on, so that the author drives the session from the Claude app away from VS Code (R158): `/remote-control` in this session, and in `/config` «Push when actions required», for AskUserQuestion, and «Push when Claude decides», for PushNotification (sources 2.13). The session then shows in the app's Code tab while the host is on and this window's `claude` runs. The author turns them on, since the session runs no slash command of its own, and the session cannot see whether they are: in its first reply, before the first wave, it names the three in a line, for the author who has just typed the phrase in the window.
3. `$O sync` — the first time, when the clone is not there yet, `just orchestrator sync` from the working tree. Read the plan from the clone, not from the working tree: the working tree may be on any branch, and a task of spec run in the documents container switches it. Run `sync` again after each merge into spec.
4. The epic is the current epic of spec, table 1 of the clone's RUN.md, whose number the phrase names. An epic of `run/EPICS.md` is not split into tasks yet: stop, and tell the author to plan it first (RUN.md, Epics). A task of spec may run the procedure on the rows of «Порядок» it names instead of an epic; its epic's folder is then named after the task.
5. If `$E/epic.json` exists, an earlier session ran this epic: take the graph from it, and each run's state from `$O status <run>…`, then go on from section 4. A run outlives the session that started it.

### 2. The graph

Its nodes are tasks, each of one repository; an edge says which waits for which.

- **The epic's own tasks of spec** — table 1 of the clone's RUN.md: each open task is a node of `spec`, which runs in spec's documents container. Its «Зависит от» are its edges.
- **The rows of «Порядок»** that the epic's description and its tasks' bodies name. For each, read the repository's plan on `main` by rule 3 of [COORDINATION.md](../../COORDINATION.md): RUN.md, and `run/TASKS.md` where it exists. The row's open tasks are its nodes, `[ ]` alone: `[x]`, `[-]` and `[?]` are not run. Their order and dependencies inside the repository are its RUN.md's; between rows, the row's «Зависит от», for the part it names.
- **A task the repository does not have yet** — «задачи нет» in the row — is a node whose prompt gives its text (section 3). Where the row names a text — «по тексту T157» —, it is that text, from its task's body in spec, in table 1 or an archive. Where it names none, write it by rule 6 of COORDINATION.md: «Цель», «Сделать», «Как проверить», «Разделы», and in «Почему» R76 spec, R156 spec and the row's number. Where the row says the repository's session writes an epic — «записывает эпиком» —, the text is to record and plan that epic, and the node grows into the epic's tasks once it is merged (section 5).
- **One repository runs one task at a time** (R19): its next node starts when the one before is merged, or, in a batch, `pushed`: an edge to a node of the same batch is done once that node is `pushed`. Different repositories run in parallel, with no limit on how many.
- **A batch** (R159): a repository's nodes in a row, none needing another node's release, a rebuild of the container or the author's answer, run on one branch `<epic>-<repo>` with one pull request. The batch closes early at a node whose release another needs, one that changes `.devcontainer/`, or one that waits on the author; a single node is no batch. The last two show only once the node has run: a node of a batch that returns `waiting`, or whose pushed commit changes `.devcontainer/` (`git diff --name-only origin/main...origin/<branch>`), becomes the batch's last — its answers, or a `resume`, give it the last one's sentence of section 3 —, and the nodes after it make a new batch once its pull request is merged and the container rebuilt. Write each node's batch and branch into `$E/epic.json`.
- **A node that needs another repository's release** — a tag of `sim` for a judgement, a tag of `spec` with a task of the epic — waits for that release, not for the merge (R31).

Write the graph to `$E/epic.json` before the first run, and update it at each event: each node's repository, task, prompt's file, edges, batch and branch, run's id, attempts, pull request, merge commit and state — `waiting-deps`, `running`, `questions`, `pushed`, `merging`, `merged`, `released`, `done`, `with-author`, `stopped`. That file and the runs' folders are the epic's whole state: a compaction or a new session takes it from them.

### 3. Wave 0 and the prompts

**Wave 0.** For each repository of the graph but spec, compare the commit of its submodule, `gh api repos/altnovatrail/<repo>/contents/spec --jq .sha`, with the commit of spec's latest release, `gh api repos/altnovatrail/spec/releases/latest --jq .tag_name` and `gh api repos/altnovatrail/spec/commits/<tag> --jq .sha`. A repository not on it gets a node of wave 0 before all its others:
- its plan's open task of a move to a tag of spec, if it has one, to the latest tag (R156 decides the tag);
- otherwise the standard text [tasks/spec-tag.md](tasks/spec-tag.md), without its opening comment and with its fields filled in.

Wave 0 runs in parallel, a node in each repository behind.

**A batch's prompts.** A node of a batch runs with `--prompt`, which replaces the default: its file holds the node's prompt — «Выполни задачу Txx из RUN.md», or the text above for a task the repository does not have yet —, then which task of the batch it is: the first — «Создай ветку `<branch>` от свежего `main` и запушь её с `-u`»; a later one — «Возьми ветку `<branch>` с origin, `git pull --ff-only`; не перебазируй её на main»; each but the last — «Это задача пачки на ветке `<branch>` (R159 spec): один коммит со служебными записями, «Сделано» — «ветка <branch>», push, без проверок и pull request, статус done без pull_request»; the last — «Последняя задача пачки <tasks> на ветке `<branch>` (R159 spec): после своего коммита — все локальные проверки частей, что меняли коммиты пачки, и `/code-review high` по пачке, один pull request, его номер во все «Сделано» пачки, проверки pull request». The contract, `executor.md`, says what each means.

**The prompt** of a task the repository has is the default, «Выполни задачу Txx из RUN.md»: `start` gives it without `--prompt`. The repository's own task of wave 0 gets a prompt that names the tag, since R156 decides it rather than the task's body: «Выполни задачу Txx из RUN.md. Переход — на последний тег spec, <tag> (R156 spec), даже если тело называет другой.» A task it does not have yet gets its number when it starts, not when the graph is written: `$O next <repo>` then, which counts its `main`, its branches, those of its open pull requests among them, and the orchestrator's runs of it not known to be done. The number the executor's status names in `task` is the node's from then on, in `$E/epic.json` and in the run. Its prompt, a file of `$E` given by `--prompt`, is:

```text
Выполни задачу T<n> из RUN.md. Её ещё нет в этом репозитории: запиши её по тексту ниже в свой план, по его правилам, под номером T<n>, если он ещё свободен, а иначе под следующим свободным, и назови номер в отчёте; затем выполни её (правило 6 COORDINATION.md spec).

<the task's text>
```

### 4. Waves

1. Each node whose edges are done, whose repository runs nothing, and that waits on no question or pause: `$O start <repo> <task> [--prompt <file>]`. The ceiling is the default, $75 (measurements 1.12). A repository with no container — `start` says so — gets one first, once CI of its `main` is green, `gh run list -R altnovatrail/<repo> --branch main --limit 5 --json status,conclusion`: `$O create <repo>` in the background, Bash's `run_in_background`, then `start` (R158).
2. For each run started, a Monitor of `$O wait <run>`, with the longest `timeout_ms`: its one line is the run's state as it ends. On expiry with no line, the run still goes: arm it again. Never wait in the foreground.
3. When a line comes, act on its `phase`:

| Phase | What the orchestrator does |
|---|---|
| `done` | with a `pull_request`, section 5; with none, a node of a batch but its last — check that the batch's branch on GitHub holds its commit, mark the node `pushed`, and the batch's next node starts; any other, check that the task is `[x]` on its `main`, or that its report says why it needed no change, and mark the node done |
| `waiting` | its `questions` go to the queue (section 6); the rest of the graph goes on |
| `failed`, `lost` | an attempt (section 7): `resume` with what failed — the `failure`, or that the container stopped |
| `limited` | a pause (section 7) |
| `over-ceiling` | a question to the author (section 7) |
| `stopped` | the orchestrator's own `stop` (section 7): `resume` with the new word, unless the author stopped the node (section 6) |

Each event and what was done goes to `$E/epic.json` before the next.

### 5. The merge

The orchestrator merges each pull request itself, without the author's review (R156). Its title and description are in English, for the orchestrator and later sessions, and the executor's report, in Russian, is in its status, which the orchestrator's report carries in gist to the author (section 8; R14). The contract says so to every executor, so a repository at an older tag of spec needs nothing in its prompt; a run whose folder holds an older contract gets the rule in its answers. For pull request `<n>` of `altnovatrail/<repo>`:
1. `gh pr view <n> -R altnovatrail/<repo> --json number,state,isDraft,mergeStateStatus,files`. A draft is the task's own product — a candidate for a judgement — and is not merged: the node is done by its report; a draft whose report does not say why is a question to the author.
2. The checks: once `gh pr checks <n> -R altnovatrail/<repo> --json name` lists any — before, it exits 1 with «no checks reported», which is no failure —, `gh pr checks <n> -R altnovatrail/<repo> --watch --interval 60 > $E/checks-<repo>-<n>.txt` in the background, Bash's `run_in_background`, not a Monitor: it prints the whole table at each interval. It exits 0 once no check reported is pending and none failed, and 1 when one failed (sources 6.3). A check posted late is missed by it: after it exits 0, `gh pr checks <n> -R altnovatrail/<repo> --json name,bucket` must hold `codecov/patch` and SonarCloud's check, where the repository's earlier pull requests have them, each `pass`; one missing or pending — read it again in a minute. CI, `codecov/patch` and SonarCloud must pass.
3. SonarCloud's issues, which a green check can hide: `curl -s 'https://sonarcloud.io/api/issues/search?componentKeys=altnovatrail_<repo>&pullRequest=<n>&resolved=false'` — `total` must be 0 — and the gate, `api/qualitygates/project_status?projectKey=altnovatrail_<repo>&pullRequest=<n>` — `OK`. A repository with no project on SonarCloud has neither, and the report says so.
4. A check that failed for the infrastructure — a job cancelled with no step run since it got no runner, a service outside the repository that did not answer, as the archive of Ubuntu's snapshots — is no attempt: `gh run rerun <workflow run's id> -R altnovatrail/<repo> --failed`, once, then from step 2, unless the report says the executor already reran it; failing again, it is a question to the author. Any other failed check, or an issue, is an attempt (section 7): `resume <run> --answers <file>`, the file naming each check with its link and `gh run view <workflow run's id> -R altnovatrail/<repo> --log-failed`, cut to what failed, and each issue with its rule, file, line and message. Then from step 2.
5. `mergeStateStatus`, read again now, after the checks, by `gh pr view <n> -R altnovatrail/<repo> --json mergeStateStatus`: `BEHIND` — `gh pr update-branch <n> -R altnovatrail/<repo>`, then from step 2; `DIRTY` — an attempt: `resume` with the conflict with `main`; `BLOCKED` with every check green — a question to the author: the ruleset asks for what the orchestrator does not give.
6. `gh pr merge <n> -R altnovatrail/<repo> --merge`: never `--admin`, never a push to `main`, never a tag (R31).
7. After the merge:
   - CI of `main` on the merge commit: `gh run list -R altnovatrail/<repo> --branch main --commit <sha> --json status,conclusion`, until it lists runs and each has ended — an empty list right after the merge means GitHub has not made them yet; none after ten minutes is a question to the author. The repository's next node starts once it is green; red is a question to the author — the orchestrator mends no `main`.
   - The task, by the number its report names, is `[x]` on `main`; if not, `resume` the run to mark it — an attempt, unless the report said the task is marked only after its merge. The pull request of a batch merges each of its tasks: each is `[x]` on `main`, and each of its `pushed` nodes is merged.
   - If the pull request changed `.devcontainer/` — `gh pr diff <n> -R altnovatrail/<repo> --name-only` (sources 6.3) —, the container is rebuilt before the repository's next run: `docker start` rebuilds nothing. Once CI of `main` on the merge is green, `$O rebuild <repo>` in the background, Bash's `run_in_background`, which pauses that repository alone (R158). Refused because Claude Code runs in it: while a run of the orchestrator there has not ended, wait for it, then again; with none, a question to the author, who knows whose session it is. Any other failure is a question to the author, with the error and the log it names. A window of VS Code is not looked for: one open on the repository loses its container, and the author reopens it. A run that waits in it, such as one to mark its task after the merge, resumes in the rebuilt container (section 7).
   - A node waiting on this repository's release starts once a release holds the merge: `gh api repos/altnovatrail/<repo>/releases/latest --jq .tag_name`, then `gh api repos/altnovatrail/<repo>/compare/<sha>...<tag> --jq .status` is `identical` or `ahead`.
   - A merge into spec: `$O sync` again.
   - A node that recorded an epic of its repository: read its RUN.md on `main` again, and add the epic's open tasks to the graph as nodes of that repository.

### 6. Questions

1. The queue is `$E/questions.json`: each question with its run, repository, task, the row of table 3 that holds it, its options and its recommendation, and the answer once given. It pauses the node that asked it alone; the rest of the graph goes on.
2. A small technical question inside one repository, which no document reserves for the author, the orchestrator decides itself, by the recommendation unless the documents say otherwise, and names in its report as its own decision (R156). Anything else goes to the author: a decision the log does not hold, a gap in the documents, a change of a decision, a question «В реестр spec», a step outside the repositories, a ceiling, a red `main`. In doubt, the author.
3. When the queue has a question for the author and nothing else is in hand, PushNotification first — it reaches the phone only with Remote Control on (section 1), and is a notification on the computer alone without it (sources 2.13) —, under 200 characters: how many questions, and whose — «E15: 2 вопроса — sim T70, api T95». Then AskUserQuestion, one question per call, in Russian: the header — the repository and the task; the question — what is asked, with the row of table 3 that holds it; two to four options, the recommended first with «(рекомендую)» in its label, each with what it means.
4. Each answer goes to the run's file of answers in `$E`, in Russian, a line for each: «Ответ автора на вопрос строки <row>: <the option, or the author's own words, verbatim>.», and the file ends with «Запиши ответы по правилам своего RUN.md и продолжай задачу.» Once all of a run's questions are answered, and not before, `$O resume <run> --answers <file>` — once, with all of them — and a Monitor of its `wait`.
5. A question «В реестр spec» answered here is still a row of that repository's table 3: spec's inbox records it by rule 13 of RUN.md, with the answer given.
6. An answer may come from the window or from the Claude app, and is the same either way. A question with no answer waits, however long: only its node stands, and nobody decides it for the author (R158).
7. Free text the author sends from the app, typed or dictated, is the author's word in the session, as if typed in the window (R158): a new task — «сделай параллельно ещё …» — is a new node of the graph, by sections 2 and 3, its number from `$O next <repo>` when it starts where the repository has no such task yet; a change of order changes the nodes' edges; «стоп» of a node is its state `stopped`, never resumed until the author's next word on it: a run going is stopped by `$O stop <run>` (section 7), the node's questions leave the queue, and the nodes that wait on it stay, named in the report. Each goes to `$E/epic.json` at once, and the orchestrator answers in the session what it did. A word it cannot tell how to apply is a question back, by AskUserQuestion. The hook of `tools/session/` stops a phrase in this session that starts a task by its number right after the verb — «сделай T45», «выполни задачу T45» — and names `/clear`, which is not for this session (R156): a new task is said otherwise, «добавь T45 `api` в граф», «сделай параллельно ещё T45 в `api`».

### 7. Attempts, limits and the ceiling

- **Two attempts.** A failed or lost run, a red check, SonarCloud's issues, a conflict, a task not marked `[x]`: each is one `resume` in the same session, two at most for a node. The third goes to the author as a question: what failed each time, with options — another attempt with what to change, stop the node, or the author's own way. Answers, a limit's reset and a new ceiling are not attempts.
- **A limit.** A run `limited` pauses every start and resume until its `resets_at`: the subscription's limit is one for all sessions (sources 2.12). Wait in the background, `until [ "$(date -u +%s)" -ge "$(date -u -d '<resets_at>' +%s)" ]; do sleep 60; done`, then resume each limited run with «Лимит подписки сбросился: продолжай задачу с того места, где она остановилась.» With no `resets_at`, wait an hour. A reset more than five hours away is the weekly ceiling: PushNotification with the date, and the wait goes on. Usage bought beyond the subscription the orchestrator never turns on (R156). The orchestrator's own session stops at the limit too, and goes on after it, as an interactive session does (sources 2.11), from `$E/epic.json`.
- **The ceiling.** A run `over-ceiling` is a question to the author, with what it spent, what its report says is left, and options: a new ceiling, by its report — `$O resume <run> --ceiling <usd>` —, or stop the node.
- **Stopping a run** the author redirected: `$O stop <run>`, then `$O resume <run> --answers <file>` with the new word. The attempt is `stopped`, and what it spent comes from the session's transcript, `spent_from: "transcript"`. A stop is no attempt.
- **A rebuilt container** — by `rebuild` (section 5) or by the author — has a new id. `resume`, `stop` and `status` find it again by its labels and record it in `run.json` and `events.jsonl`, and the run goes on in the same session: the transcript is on the volume, under the same workdir. An attempt that was running in the old container is `lost`: `resume` it with «Контейнер пересобран: продолжай задачу с того места, где она остановилась.» Closing a repository's window of VS Code stops its container under a running executor, unless its `devcontainer.json` sets `shutdownAction` to `none` (sources 9.4), as spec's does (R156). Where it does not, the attempt is `lost`, and `resume` starts the container again.

### 8. The end

The epic ends when every node is done, stopped by the author, or waits on the author, with nothing else to run.
- The orchestrator edits no file of spec's working tree. Rows of «Порядок» whose tasks are all done are named in the report, and the epic's task of spec that closes it — or the task of spec that ran the procedure — deletes them by rule 4 of COORDINATION.md.
- PushNotification: the epic has ended, or waits on the author.
- The report, in Russian: for each repository, its tasks, pull requests and merges, the gist of each executor's report — what was done, what its review found, what is open —, and the cost of each run — `spent_usd`, `num_turns`, `duration_ms`; the questions, their answers, and what the orchestrator decided itself; pauses at the limit and attempts; the plans the executors wrote; what is still open, and the rows «в реестр spec» for spec's inbox (rule 13 of RUN.md).

## A task across repositories: `xrepo`

The commands of a task across repositories (R166), for the session the author leads in this container: `xrepo.mjs`, and the stand, `stand.mjs`. `$X` below stands for `just xrepo` in spec's working tree, or `node ~/.claude/novatrail-orchestrator/spec/tools/orchestrator/main.mjs xrepo`. Each command prints JSON; `test` prints the checks' output first. A command that names no epic takes the only folder of `/workspaces/.epics`; with more than one, `--epic <epic>`.

- `$X up <epic> [<repo>…]` makes `/workspaces/.epics/<epic>/<repo>` for each repository and spec, and renews what is there:
  - the clone is GitHub's, with its submodules; its branch `<epic>` is GitHub's where the epic pushed it, else a new one from `main`, pushed by nobody until a change is made; a clone there already is kept;
  - Go: in each clone with a `go.mod`, a `go.work` — `use .`, a `replace` for each module of NovaTrail it requires that has a clone in the epic, spec and `spec/contracts` always, its `go` line the newest of theirs —, kept out of git with `go.work.sum` by `.git/info/exclude`;
  - npm: where `package.json` names `@altnovatrail/spec` or `@altnovatrail/contracts`, `just _install` in the repository's container, then spec's packages laid over `node_modules`: packed from the clone of spec's working tree by its own packers, `tools/types/npm.mjs` and `tools/contracts/npm.mjs`, in spec's documents container, at the version its next release would take — or its own release's, for a commit released —, into `.stand/packages/<fingerprint>/`, and unpacked in the consumer's container. `package.json` and the lock file stay; `_install` runs `npm ci` only when they change, so it keeps the packages. Each package holds `.xrepo`, the fingerprint of spec's tree it came from — its commit, its diff and its files not tracked —, and is laid again only when the fingerprint changes;
  - app's `deployment.local.json`, out of git, copied from the host's clone in app's container;
  - `<epic>.code-workspace`, for the window's multi-root, and `README.md`: the clones, their wiring, the guards of pins that fail under it — the only failures the gate allows — and the commands. The session's notes go to `notes.md` beside it.
- `$X status` — each clone's branch, how far ahead of and behind `origin/<epic>` it is, its changed files, its `spec` submodule, its `go.work`, and whether each package of spec is `fresh`, `stale` or `none` against spec's tree now; and the stand's `state.json`, with whether its process lives.
- `$X test <repo> [<target>…]` — the quick checks in the repository's container (R156): Go's `go test -count=1`, of the packages named or `./...`; app and canvas — `just _install`, the packages renewed, `vitest run --project node`, without the tests that open browsers; spec — `just docs-check`, or `node --test` of the files named. A target is a package, a folder or a file of the clone, passed on as `./<target>` from its root, never an option. Exits 1 when the checks fail.
- `$X serve [--ai] [--limit <usd>] [--mockup]` starts the stand as a process of its own, detached, and returns once its probe has passed, or with why not; a stand that runs is stopped first. `--ai` puts api on the models by the developer key, `API_DEV_APP_AI=1`; `--limit` is the author's new limit, $2 by default (R166); `--mockup` serves spec's mockup from the clone of spec, in spec's documents container, behind a relay of its own on 127.0.0.1:8156 here. The stand waits for up to 15 minutes, and `serve` for 35. spec's packages are laid in app and canvas by `up`, `test` and `serve`, never while a stand runs: after a change of spec, `$X up <epic>` lays them, and Vite reloads.
- `$X stop` — SIGTERM to the stand's process, which stops its servers; then any server a stand that died left, by its pid's file.
- `$X sync` — in each clone, `main` from GitHub merged into the epic's branch by a merge commit, signed off — a branch with no commit of its own fast-forwarded, so the epic does not count it as changed —, then the wiring renewed. A conflict leaves its merge unfinished and names its files, and exits 1: the session resolves a mechanical one, and one of meaning is a question to the author (R166).
- `$X push` — each clone's branch `<epic>` pushed to GitHub where it is new or ahead, by gh's credentials here; a clone on another branch stops it before any push, and `main` is never pushed.
- `$X gate [<repo>…]` — the full CI of each clone the epic changed, those with commits beyond `origin/main` and spec, or of those named, in its own container, each recipe's log in `.stand/gate-<repo>-<recipe>-<UTC time>.log`:
  - a clone with changes not committed is refused, since CI checks a commit; the `spec` submodules are not looked at;
  - each `spec` submodule's working tree is put at the clone of spec's `HEAD`, and nothing is committed; once `pin` has pinned spec, at the commit the clone's own link names, as its CI checks it out;
  - the recipes of `GATES` in `gate.mjs`: `just ci` for app, canvas and the other TypeScript repositories; Go's `ci-lint ci-test ci-vuln ci-licenses`, with `ALLOWED_LICENSES` from `just licenses-allowed` of the clone of spec, and the repository's own jobs; for spec, `SPEC_GATE`, its recipes of `ci.yml`, which a test holds to that file. A repository with no known gate, as infra, is named in `unchecked`, and its CI is its pull request's. Each recipe runs under coreutils' `timeout` in the container, 90 minutes, so one past its time ends there with all it started;
  - the guards of pins, only while the clone has a `go.work`: the guard tests are skipped by `GOFLAGS=-skip=^(…)$`, so `ci-test` still writes its profile — `-skip` names no package, so a test of the same name in another package is skipped too —; a guard of `ci-lint` may fail only with its own message as the last line of the log, just's own line after it aside; `ci-licenses` may fail only on libraries without a LICENSE in modules the `go.work` replaces, as `spec/contracts`, whose LICENSE is at spec's root. Without a `go.work`, none: ship gates each such clone again without it;
  - then `patchcov` (`tools/patchcov/`), in the same container from the clone of spec: the changed lines from the merge-base with `origin/main` against the target of the repository's `.github/codecov.yml`, a partial line a miss (sources 11.5).

  `.stand/gate.json` keeps each repository's head and the head of the clone of spec it was gated with, its recipes, its skipped and allowed guards, its `patchcov` and whether it passed; exit 1 when anything failed.
- `$X pin <repo> [<tag>]` — each clone of the epic that depends on `<repo>`, by its `go.mod`, `package.json` or `spec` submodule, moved to the release `<tag>`, by default `releases/latest`: the submodule at the tag; `go get` and `go mod tidy` without the workspace; `npm install --save-exact`, then `release-verify-npm` of the lock file (R77); the lines of CLAUDE.md and RUN.md that name spec's tag before, and the justfile's `spec_tag`. Its `go.work` is written again without the released repository, removed when nothing is left to replace, and spec's packages of the clone are taken out of `node_modules`. Then a commit `Pin <repo> <tag>`, signed off. The release goes to `.stand/pinned.json`, which the wiring of `up` leaves out from then on.
- `$X wait-release <repo> <tag>` — until the release's files are there, up to 45 minutes: the release on GitHub, not a draft; each npm package of `NPM_OF` at its version and its archive; then each Go module's `.info` on the proxy, asked only once the release exists, since the proxy remembers a failure for about half an hour (R64).
- `$X ship` — after the author's «да», in the background, Bash's `run_in_background`. It takes only clones whose head passed the gate, each with its pull request's text `pr-<repo>.md` in the epic's folder — the first line the title, then the description, in English —, which the session writes. Then each repository in the order of its dependencies, spec first, infra last, one at a time (R166):
  1. pinned to the releases of those before it, and gated again without the wiring;
  2. pushed; its pull request opened, or the open one taken;
  3. its checks, read each minute for up to 90 minutes, by section 5 above: `codecov/patch` and SonarCloud's check, where the last merged pull request had them, may come up to 10 minutes after the rest; SonarCloud's issues and gate by its API, which stops it when it does not answer. A check that failed stops it, with its link and the end of `gh run view --log-failed` in `.stand/ship-<repo>-<n>-failed.json`; so do SonarCloud's issues, a check that never came and a head on GitHub that is not the clone's;
  4. `BEHIND` — `gh pr update-branch`, the clone brought forward, the checks again; `DIRTY` — a stop for `sync`; `BLOCKED` with every check green — a stop, a question to the author;
  5. `gh pr merge --merge`, never `--admin`; then the runs of `main` on the merge commit, red a stop; the release, where the Release run made one that holds the merge, by `wait-release`; after spec, the orchestrator's own clone moved forward by `sync`.

  `.stand/ship.json` holds where each repository stands, and `ship` again goes on from there: after a stop, the session fixes, reruns a failure of the infrastructure, or asks the author, then ships again. When api or app was released and the epic has a clone of infra, ship stops before infra until its committed `deploy/production.json` names each such release as its `release`: the session raises it — the tags and the sha256 of their files, by each release's `SHA256SUMS` —, commits it, and ships again; then infra's pull request. Exit 1 on a stop.
- `$X down` — `stop`; `README.md` and `notes*.md` copied to `~/.claude/novatrail-orchestrator/epics/<epic>/`; each clone removed once it is clean, has nothing stashed and its `HEAD` is in `main` on GitHub, kept otherwise with why; the folder removed with the last clone; each host's clone pulled, `--ff-only`, in its container, where it is on a clean `main`.

The stand:
- **Its servers**, each in its repository's container, on the epic's clones, by `docker exec --detach … setsid bash -lc`: canvas built by `just build`, then `tsc -p tsconfig.build.json --watch`; api by `just dev-app`; app by `just dev-canvas ../canvas`, or `just dev` with no clone of canvas. Each runs as the leader of a session and of its group, so one signal reaches every process it started: `stop` sends SIGINT, as Ctrl-C, then SIGKILL after 30 seconds. Its pid's file holds `<pid>:<start>`, the time of start from `/proc`, so a number passed to another process is never signalled.
- **The relay.** Vite listens on 127.0.0.1 in app's container, which publishes no port and shares no network with this one: the stand listens on 127.0.0.1:5173 here, and pipes each connection by `docker exec -i` into node in app's container, found again for each connection. VS Code forwards the port from this window to the author's browser, who opens exactly the address `serve` prints, http://127.0.0.1:5173: it is the origin of api that app's `deployment.local.json` names. Opened as `localhost:5173`, the page and api are two origins, and each RPC asks a preflight of 127.0.0.1:5173 — which, when another window forwards the same port, goes there and hangs: a white screen, or a catalog that never comes. Only this window forwards 5173.
- **Ready** only once its own probe passes through the relay: `/` 200, `/deployment.json` 200, and an RPC of api through app's proxy, `POST /novatrail.api.v1.AccountService/GetAccount` with no token, 401. Before it starts, a port 8080 of api's container or 5173 of app's that answers is refused: a server outside the stand holds it. A server that stops, or no probe passed in 15 minutes, fails the stand, which then stops what it started.
- **api restarted** two seconds after the last of a burst of changes, by `fs.watch` in this container, of api's clone and of each clone its `go.work` replaces a module with; not of `.git`, `node_modules`, `bin`, `coverage`, `lib`, `build`, `dist`, `docs`, `draft`, Markdown, and api's own submodule `spec`. Vite reloads app's changes, and tsc rebuilds canvas's.
- **The limit.** With `--ai`, the stand sums `cost_micro_usd` of every call of a model in api's logs of this session of the stand; at the limit it stops api, and its phase is `over-limit`. Above it, a question to the author, then `serve --ai --limit <usd>`.

Its files are in `/workspaces/.epics/<epic>/.stand/`, the same path in every container and on the host, and in no clone's git:

| File | What it holds |
|---|---|
| `stand.json` | what `serve` asked: `ai`, `mockup`, `limit_usd`, the ports |
| `state.json` | where the stand is: `phase` — `starting`, `ready`, `restarting`, `failed`, `over-limit`, `stopped` —, its pid, each server's repository, pid, time of start and logs, `restarts`, `spent_usd`, `mockup` — its port here, when served —, the last probe, `error` |
| `stand.pid`, `<server>.pid` | `<pid>:<start>` of the stand's process here, and of each server's group in its container |
| `<server>-<UTC time>.log`, `stand-…`, `canvas-build-…`, `<repo>-install-…` | a log of each start, never one written over: a process that still writes it would leave zeros |
| `packages/<fingerprint>/` | spec's packages of one tree of the clone |
| `gate.json` | the last gate of each repository: `epic`, spec's head, and for each its `head`, the `spec` it was gated with, `wired`, `recipes` with their status and log, `skipped`, `patchcov`, `pass`, `at` |
| `gate-<repo>-<recipe>-<UTC time>.log` | a log of each recipe of a gate |
| `pinned.json` | each repository pinned to its release by `pin`, and its tag |
| `ship.json` | the ship: its `order`, and for each repository its `phase` — `gated`, `pushed`, `checks`, `merged`, `done` —, the releases it was pinned to, its pull request, merge commit and tag |
| `ship-<repo>-<n>-failed.json` | the checks of pull request `<n>` that failed, with their links and the ends of their logs |

Every container can write the folder, so nothing in it names a program: the commands are the stand's own, and what it reads there is held to numbers and to paths inside the epic's folder. xrepo's own git runs here with no hooks and no fsmonitor, since every container can write a clone's `.git/config`; spec's packing runs in spec's documents container, and the unpacking in each consumer's, neither of which holds the socket.

The task's bookkeeping in spec — its mark, «Сделано» and the archive — is committed in the clone of spec before the gate, so it goes in spec's pull request; «Сделано» names the branch and `xrepo ship`, and the numbers of the pull requests are in the report to the author. What stays with CI alone: SonarCloud, Codecov's own upload, and a repository's jobs that need GitHub, as a release.

The tests are `just orchestrator-test`: `xrepo.test.mjs`, `stand.test.mjs`, `gate.test.mjs` and `ship.test.mjs`, on the made-up world of `test/world.mjs` and the made-up GitHub of `test/github.mjs`; `patchcov`'s are `just patchcov-test`.
