# tools/orchestrator

The orchestrator's commands (R156 in [docs/decisions.md](../../docs/decisions.md)). They run a task of a NovaTrail repository as one `claude -p` in that repository's devcontainer, read how it went, and continue the same session with the author's answers. «Сделай эпик E…» calls them from a session of spec in its orchestrator container, `.devcontainer/orchestrator/`, which sees the host's Docker, by the procedure in [«Сделай эпик E…»](#сделай-эпик-e) below.

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
- `stop <run>` stops the run's last attempt and returns once it has ended (T175). `run.json`'s pid is the `sh` that wraps `claude`, and a signal to it would not reach `claude`: `stop` sends SIGTERM to `claude` and every process below it in the container, the commands it left in the background too, found by the parent of each in `/proc/<pid>/stat`. If any of them is still there after 30 seconds — `claude`, or a command that outlived it and that the container's first process took over —, it sends SIGKILL to what is left of them and to what is below the `sh` then. It names each process by its pid and its time of start, and signals a pid again only while its time of start is the same, so a pid passed to another process is never signalled. The `sh` writes the exit code, and `stop` returns once it has and the processes are gone, or after 10 more seconds. The attempt is recorded as stopped in `run.json` — when, by the orchestrator, by which signal last —, and `events.jsonl` names how many processes it signalled and how many outlived SIGKILL; it refuses a run that does not run.
- `status [<run>…]` prints where each run stands, every run when none is named.
- `wait <run>… [--timeout <seconds>]` waits until each run has ended and prints its state as it ends; it suits a background command or Monitor.
- `next <repo>` prints the next free number of a task of the repository, one above the largest the repository's plan defines (T175): on its `main`, at the head of each of its open pull requests and of each other branch, and in every number the orchestrator's runs of it have gone by, but those of the runs known to be done — by their files, the last attempt's status `done`. A number counts where the plan defines it — the first or second cell of a row of a table and a heading `#### T….` of RUN.md, `run/TASKS.md` and `docs/plan/*.md` —, not where it cites one. It reads GitHub by `gh api` and prints each source's largest beside `next`.

## Finding the container

Dev Containers labels a container with the host's folder of the clone, `devcontainer.local_folder`, and its configuration, `devcontainer.config_file` (sources 9.3). The orchestrator finds a repository's container by both labels, for the folder beside its own folder on the host. For spec, that is the documents container, by `.devcontainer/devcontainer.json`. Of two with the same labels, it takes the running one.

A stopped container is started with `docker start`. The orchestrator needs no window of VS Code, and the author keeps the container's window closed while a run goes on. When the author has never opened a repository in its container, there is no container, and the error names the folder to open.

## The run

A run is one task carried by one session of Claude Code, across its attempts:
- the first attempt is `claude -p` with a session's id that the orchestrator chooses, `--session-id`;
- each later one is a `--resume` of it.

Every attempt is Opus at effort `high`, with `--permission-mode bypassPermissions`, `--output-format stream-json --verbose`, the contract [executor.md](executor.md) by `--append-system-prompt`, the schema [status.schema.json](status.schema.json) by `--json-schema`, and `--max-budget-usd` set to what is left of the ceiling. `total_cost_usd` of a resumed run is the session's whole total (sources 2.11), so what the task spent is the largest total any attempt printed.

git in the executor's container pushes through `gh auth git-credential`, set by `GIT_CONFIG_*` for the run: the container's own helper is VS Code's, which a `docker exec` without a window cannot reach (sources 9.3).

Each attempt also gets `NOVATRAIL_RUN_TASKS`: every number the run has gone by, the one it started under and each its status named. The hook of `tools/session/` counts them as one task, so it does not refuse a resume whose prompt names the run's real number (T175). A repository runs the hook from its `spec/` submodule, so this holds there from its move to a tag of spec that has it. Until then, a resume prompt does not name the new number with a verb of a task — «сделай T28» —, as skill-map's T27 of T171 did.

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
  - `transcript` — the session's transcript, larger: an attempt after the last result printed none, as one stopped or cut short (T175). It is read again only when the size or the time of change of a file of it has changed. It is `~/.claude/projects/<the container's workdir, each character but a letter or a digit a dash>/<session>.jsonl` on the volume, with its subagents', and each message of the model counts once, by its id, at the prices of `tools/tokens/prices.mjs`;
  - `null` — neither;
- `unpriced_attempts` — the attempts after the last result that the transcript does not cover either: none was found, a call in it has no price, or it comes to no more than the results' total, and so does not show what they spent;
- `num_turns` and `duration_ms`, summed over every result of every attempt (T175): a stream may hold several, as an executor that waits on CI in the background ends its turn and is woken again;
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

The procedure the orchestrator's session follows (R156 and its amendment of T170). It is written for that session. `$O` below stands for `node ~/.claude/novatrail-orchestrator/spec/tools/orchestrator/main.mjs`, and `$E` for `~/.claude/novatrail-orchestrator/epics/<epic>/`, the epic's folder on the volume `novatrail-claude`.

### 1. Before the first run

1. The session is in the orchestrator's container: `NOVATRAIL_DEVCONTAINER` is `1`, and `docker ps` answers. In spec's documents container, stop: the author reopens spec in the configuration «NovaTrail orchestrator».
2. `$O sync` — the first time, when the clone is not there yet, `just orchestrator sync` from the working tree. Read the plan from the clone, not from the working tree: the working tree may be on any branch, and a task of spec run in the documents container switches it. Run `sync` again after each merge into spec.
3. The epic is the current epic of spec, table 1 of the clone's RUN.md, whose number the phrase names. An epic of `run/EPICS.md` is not split into tasks yet: stop, and tell the author to plan it first (RUN.md, Epics). A task of spec may run the procedure on the rows of «Порядок» it names instead of an epic, as T171 does; its epic's folder is then named after the task.
4. If `$E/epic.json` exists, an earlier session ran this epic: take the graph from it, and each run's state from `$O status <run>…`, then go on from section 4. A run outlives the session that started it.

### 2. The graph

Its nodes are tasks, each of one repository; an edge says which waits for which.

- **The epic's own tasks of spec** — table 1 of the clone's RUN.md: each open task is a node of `spec`, which runs in spec's documents container. Its «Зависит от» are its edges.
- **The rows of «Порядок»** that the epic's description and its tasks' bodies name. For each, read the repository's plan on `main` by rule 3 of [COORDINATION.md](../../COORDINATION.md): RUN.md, and `run/TASKS.md` where it exists. The row's open tasks are its nodes, `[ ]` alone: `[x]`, `[-]` and `[?]` are not run. Their order and dependencies inside the repository are its RUN.md's; between rows, the row's «Зависит от», for the part it names.
- **A task the repository does not have yet** — «задачи нет» in the row — is a node whose prompt gives its text (section 3). Where the row names a text — «по тексту T157» —, it is that text, from its task's body in spec, in table 1 or an archive. Where it names none, write it by rule 6 of COORDINATION.md: «Цель», «Сделать», «Как проверить», «Разделы», and in «Почему» R76 spec, R156 spec and the row's number. Where the row says the repository's session writes an epic — «записывает эпиком» —, the text is to record and plan that epic, and the node grows into the epic's tasks once it is merged (section 5).
- **One repository runs one task at a time** (the fifth 2026-11-15 amendment to R19): its next node starts when the one before is merged. Different repositories run in parallel, with no limit on how many.
- **A node that needs another repository's release** — a tag of `sim` for a judgement, a tag of `spec` with a task of the epic — waits for that release, not for the merge (the second 2026-11-15 amendment to R31).

Write the graph to `$E/epic.json` before the first run, and update it at each event: each node's repository, task, prompt's file, edges, run's id, attempts, pull request, merge commit and state — `waiting-deps`, `running`, `questions`, `merging`, `merged`, `released`, `done`, `with-author`, `stopped`. That file and the runs' folders are the epic's whole state: a compaction or a new session takes it from them.

### 3. Wave 0 and the prompts

**Wave 0.** For each repository of the graph but spec, compare the commit of its submodule, `gh api repos/altnovatrail/<repo>/contents/spec --jq .sha`, with the commit of spec's latest release, `gh api repos/altnovatrail/spec/releases/latest --jq .tag_name` and `gh api repos/altnovatrail/spec/commits/<tag> --jq .sha`. A repository not on it gets a node of wave 0 before all its others:
- its plan's open task of a move to a tag of spec, if it has one, to the latest tag (R156 decides the tag);
- otherwise the standard text [tasks/spec-tag.md](tasks/spec-tag.md), without its opening comment and with its fields filled in.

Wave 0 runs in parallel, a node in each repository behind.

**The prompt** of a task the repository has is the default, «Выполни задачу Txx из RUN.md»: `start` gives it without `--prompt`. The repository's own task of wave 0 gets a prompt that names the tag, since R156 decides it rather than the task's body: «Выполни задачу Txx из RUN.md. Переход — на последний тег spec, <tag> (R156 spec), даже если тело называет другой.» A task it does not have yet gets its number when it starts, not when the graph is written: `$O next <repo>` then, which counts its `main`, its branches, those of its open pull requests among them, and the orchestrator's runs of it not known to be done. The number the executor's status names in `task` is the node's from then on, in `$E/epic.json` and in the run. Its prompt, a file of `$E` given by `--prompt`, is:

```text
Выполни задачу T<n> из RUN.md. Её ещё нет в этом репозитории: запиши её по тексту ниже в свой план, по его правилам, под номером T<n>, если он ещё свободен, а иначе под следующим свободным, и назови номер в отчёте; затем выполни её (правило 6 COORDINATION.md spec).

<the task's text>
```

### 4. Waves

1. Each node whose edges are done, whose repository runs nothing, and that waits on no question or pause: `$O start <repo> <task> [--prompt <file>]`. The ceiling is the default, $75 (measurements 1.12).
2. For each run started, a Monitor of `$O wait <run>`, with the longest `timeout_ms`: its one line is the run's state as it ends. On expiry with no line, the run still goes: arm it again. Never wait in the foreground.
3. When a line comes, act on its `phase`:

| Phase | What the orchestrator does |
|---|---|
| `done` | with a `pull_request`, section 5; with none, check that the task is `[x]` on its `main`, or that its report says why it needed no change, and mark the node done |
| `waiting` | its `questions` go to the queue (section 6); the rest of the graph goes on |
| `failed`, `lost` | an attempt (section 7): `resume` with what failed — the `failure`, or that the container stopped |
| `limited` | a pause (section 7) |
| `over-ceiling` | a question to the author (section 7) |
| `stopped` | the orchestrator's own `stop` (section 7): `resume` with the new word |

Each event and what was done goes to `$E/epic.json` before the next.

### 5. The merge

The orchestrator merges each pull request itself, without the author's review (R156). Its title and description are in English, for the orchestrator and later sessions, and the executor's report, in Russian, is in its status, which the orchestrator's report carries in gist to the author (section 8; the 2026-11-17 amendment to R14). The contract says so to every executor, so a repository at an older tag of spec needs nothing in its prompt; a run whose folder holds an older contract gets the rule in its answers. For pull request `<n>` of `altnovatrail/<repo>`:
1. `gh pr view <n> -R altnovatrail/<repo> --json number,state,isDraft,mergeStateStatus,files`. A draft is the task's own product — a candidate for a judgement — and is not merged: the node is done by its report; a draft whose report does not say why is a question to the author.
2. The checks: once `gh pr checks <n> -R altnovatrail/<repo> --json name` lists any — before, it exits 1 with «no checks reported», which is no failure —, `gh pr checks <n> -R altnovatrail/<repo> --watch --interval 60 > $E/checks-<repo>-<n>.txt` in the background, Bash's `run_in_background`, not a Monitor: it prints the whole table at each interval. It exits 0 once no check reported is pending and none failed, and 1 when one failed (sources 6.3). A check posted late is missed by it: after it exits 0, `gh pr checks <n> -R altnovatrail/<repo> --json name,bucket` must hold `codecov/patch` and SonarCloud's check, where the repository's earlier pull requests have them, each `pass`; one missing or pending — read it again in a minute. CI, `codecov/patch` and SonarCloud must pass.
3. SonarCloud's issues, which a green check can hide: `curl -s 'https://sonarcloud.io/api/issues/search?componentKeys=altnovatrail_<repo>&pullRequest=<n>&resolved=false'` — `total` must be 0 — and the gate, `api/qualitygates/project_status?projectKey=altnovatrail_<repo>&pullRequest=<n>` — `OK`. A repository with no project on SonarCloud has neither, and the report says so.
4. A check that failed for the infrastructure — a job cancelled with no step run since it got no runner, a service outside the repository that did not answer, as the archive of Ubuntu's snapshots — is no attempt: `gh run rerun <workflow run's id> -R altnovatrail/<repo> --failed`, once, then from step 2, unless the report says the executor already reran it; failing again, it is a question to the author (RUN.md, T171). Any other failed check, or an issue, is an attempt (section 7): `resume <run> --answers <file>`, the file naming each check with its link and `gh run view <workflow run's id> -R altnovatrail/<repo> --log-failed`, cut to what failed, and each issue with its rule, file, line and message. Then from step 2.
5. `mergeStateStatus`, read again now, after the checks, by `gh pr view <n> -R altnovatrail/<repo> --json mergeStateStatus`: `BEHIND` — `gh pr update-branch <n> -R altnovatrail/<repo>`, then from step 2; `DIRTY` — an attempt: `resume` with the conflict with `main`; `BLOCKED` with every check green — a question to the author: the ruleset asks for what the orchestrator does not give.
6. `gh pr merge <n> -R altnovatrail/<repo> --merge`: never `--admin`, never a push to `main`, never a tag (the second 2026-11-15 amendment to R31).
7. After the merge:
   - CI of `main` on the merge commit: `gh run list -R altnovatrail/<repo> --branch main --commit <sha> --json status,conclusion`, until it lists runs and each has ended — an empty list right after the merge means GitHub has not made them yet; none after ten minutes is a question to the author. The repository's next node starts once it is green; red is a question to the author — the orchestrator mends no `main`.
   - The task, by the number its report names, is `[x]` on `main`; if not, `resume` the run to mark it — an attempt, unless the report said the task is marked only after its merge.
   - If the pull request changed `.devcontainer/` — `gh pr diff <n> -R altnovatrail/<repo> --name-only` (sources 6.3) —, the container is rebuilt before the repository's next run: `docker start` rebuilds nothing. A question to the author — rebuild it in VS Code, «Rebuild Container», and close its window —, which pauses that repository alone. A run that waits in it, such as one to mark its task after the merge, resumes in the rebuilt container (section 7).
   - A node waiting on this repository's release starts once a release holds the merge: `gh api repos/altnovatrail/<repo>/releases/latest --jq .tag_name`, then `gh api repos/altnovatrail/<repo>/compare/<sha>...<tag> --jq .status` is `identical` or `ahead`.
   - A merge into spec: `$O sync` again.
   - A node that recorded an epic of its repository: read its RUN.md on `main` again, and add the epic's open tasks to the graph as nodes of that repository.

### 6. Questions

1. The queue is `$E/questions.json`: each question with its run, repository, task, the row of table 3 that holds it, its options and its recommendation, and the answer once given. It pauses the node that asked it alone; the rest of the graph goes on.
2. A small technical question inside one repository, which no document reserves for the author, the orchestrator decides itself, by the recommendation unless the documents say otherwise, and names in its report as its own decision (R156). Anything else goes to the author: a decision the log does not hold, a gap in the documents, a change of a decision, a question «В реестр spec», a step outside the repositories, a ceiling, a red `main`. In doubt, the author.
3. When the queue has a question for the author and nothing else is in hand, PushNotification first, under 200 characters: how many questions, and whose — «E15: 2 вопроса — sim T70, api T95». Then AskUserQuestion, one question per call, in Russian: the header — the repository and the task; the question — what is asked, with the row of table 3 that holds it; two to four options, the recommended first with «(рекомендую)» in its label, each with what it means.
4. Each answer goes to the run's file of answers in `$E`, in Russian, a line for each: «Ответ автора на вопрос строки <row>: <the option, or the author's own words, verbatim>.», and the file ends with «Запиши ответы по правилам своего RUN.md и продолжай задачу.» Once all of a run's questions are answered, and not before, `$O resume <run> --answers <file>` — once, with all of them — and a Monitor of its `wait`.
5. A question «В реестр spec» answered here is still a row of that repository's table 3: spec's inbox records it by rule 13 of RUN.md, with the answer given.

### 7. Attempts, limits and the ceiling

- **Two attempts.** A failed or lost run, a red check, SonarCloud's issues, a conflict, a task not marked `[x]`: each is one `resume` in the same session, two at most for a node. The third goes to the author as a question: what failed each time, with options — another attempt with what to change, stop the node, or the author's own way. Answers, a limit's reset and a new ceiling are not attempts.
- **A limit.** A run `limited` pauses every start and resume until its `resets_at`: the subscription's limit is one for all sessions (sources 2.12). Wait in the background, `until [ "$(date -u +%s)" -ge "$(date -u -d '<resets_at>' +%s)" ]; do sleep 60; done`, then resume each limited run with «Лимит подписки сбросился: продолжай задачу с того места, где она остановилась.» With no `resets_at`, wait an hour. A reset more than five hours away is the weekly ceiling: PushNotification with the date, and the wait goes on. Usage bought beyond the subscription the orchestrator never turns on (R156). The orchestrator's own session stops at the limit too, and goes on after it, as an interactive session does (sources 2.11), from `$E/epic.json`.
- **The ceiling.** A run `over-ceiling` is a question to the author, with what it spent, what its report says is left, and options: a new ceiling, by its report — `$O resume <run> --ceiling <usd>` —, or stop the node.
- **Stopping a run** the author redirected: `$O stop <run>`, then `$O resume <run> --answers <file>` with the new word. The attempt is `stopped`, and what it spent comes from the session's transcript, `spent_from: "transcript"`. A stop is no attempt.
- **A rebuilt container** has a new id. `resume`, `stop` and `status` find it again by its labels and record it in `run.json` and `events.jsonl`, and the run goes on in the same session: the transcript is on the volume, under the same workdir. An attempt that was running in the old container is `lost`: `resume` it with «Контейнер пересобран: продолжай задачу с того места, где она остановилась.» Closing a repository's window of VS Code stops its container under a running executor, unless its `devcontainer.json` sets `shutdownAction` to `none` (sources 9.4), as spec's does since T175 and a repository's does from its move to a tag that has it (the 2026-11-16 amendment of T175 to R156). Until then the attempt is `lost`, and `resume` starts the container again.

### 8. The end

The epic ends when every node is done, or waits on the author with nothing else to run.
- The orchestrator edits no file of spec's working tree. Rows of «Порядок» whose tasks are all done are named in the report, and the epic's task of spec that closes it — or the task of spec that ran the procedure, as T171 — deletes them by rule 4 of COORDINATION.md.
- PushNotification: the epic has ended, or waits on the author.
- The report, in Russian: for each repository, its tasks, pull requests and merges, the gist of each executor's report — what was done, what its review found, what is open —, and the cost of each run — `spent_usd`, `num_turns`, `duration_ms`; the questions, their answers, and what the orchestrator decided itself; pauses at the limit and attempts; the plans the executors wrote; what is still open, and the rows «в реестр spec» for spec's inbox (rule 13 of RUN.md).
