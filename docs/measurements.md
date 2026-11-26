# NovaTrail — measurements

> The results of the platform's measurements: what was measured, how, on what, and what numbers came out. The documents that describe how things are built — [architecture.md](architecture.md) and [repositories.md](repositories.md) — refer here and hold no numbers of measurements themselves. A measurement is cited by section, like any document: `measurements 1.3`, and from another repository `measurements 1.3 spec`.
>
> An external fact a measurement rests on is a record of [sources.md](sources.md). Claude Code's documentation is a link beside the claim, as sources.md says of a program's documentation.

## 1. Claude Code sessions

How the spending of Claude Code sessions in NovaTrail's repositories is measured, and what the tasks of epic E10 compare their numbers with. The figures here are only sums. There is no text of transcripts, neither here nor in the recipe's output: a transcript can hold anything the author typed.

### 1.1. The measurement

`just tokens-report` in `spec`, and in another repository `just -f spec/justfile tokens-report`, reads this machine's Claude Code transcripts for the git repository it was run from, and prints the numbers by session and in total. The code is `tools/tokens/`, the tests are `just tokens-test`, on synthetic transcripts.

- **Where the transcripts are.** A session is written to `<config>/projects/<folder>/<session>.jsonl`, its subagents to `<config>/projects/<folder>/<session>/subagents/agent-<id>.jsonl`. `<config>` is `$CLAUDE_CONFIG_DIR`; in the devcontainer it is `/home/vscode/.claude` on the volume `novatrail-claude`, and without the variable `~/.claude`.
  - `<folder>` is the path of the git root, with every character but a Latin letter and a digit replaced by "-": `/workspaces/spec` — `-workspaces-spec`, `/workspaces/.github` — `-workspaces--github`.
  - The sessions of the copies in `.repos/` start in `spec` and are counted under it.
  - A cloud session keeps its transcript not on this machine, and the recipe does not see it.
  - The flag `--project <folder>` sets the folder explicitly.
- **A call of the model** is a message of the model, once by its `id`: the transcript repeats the message and its `usage` in an entry for each block. The cache fields of the repeats are the same, while `output_tokens` grows, and the largest is taken. In `spec`'s transcripts before the start of the first measurement, 2026-11-11T03:59:01Z, there are 74,455 message entries, of them 32,465 calls, and in 6,330 the output differed.
  - API errors (the model `<synthetic>`) are not counted.
  - Subagents are counted under their session, but in a column of their own.
  - A call's context is the uncached input, the cache reads and the cache writes, for 5 minutes and for an hour; the cost is by the prices of section 1.2.
  - The cross-check is Claude Code's own estimate in the `cost-state` entries. For all of `spec`'s time until 2026-11-11T03:59:01Z it is $2,860.07 against $2,841.86 by the prices of section 1.2.
- **What entered between calls** — tool results, the author's words, reminders, attachments — is measured, not estimated by length.
  - The growth of context is a call's context minus the context of the previous call and its output. It is shared among what entered in proportion to characters.
  - The model's output is a group of its own.
  - An attachment is counted by what it rendered into the context (the field `rendered`). The snapshot of the system prompt is counted only at the start of a session, and entries with nothing rendered — deferred tools, a dropped reasoning — are not counted.
  - The start of a session, the start of a subagent and what a compaction left enter whole — as the context of the first call.
  - A session continued in a new transcript copies its history into it, and the earlier transcript has already counted it. What was copied is dropped, and the history enters whole, as the group "history of a resumed session". `spec`'s transcripts before that time have none.
- **"Carried"** is the tokens of what entered, multiplied by the number of calls of the same transcript in whose context it lies, until a compaction. This is what what entered costs through the cache: the spending grows with the length of the session, not with one reading.
  - The sum over the groups is almost equal to the sum of the contexts of all calls: for all of `spec`'s time, 7,638 million of 7,649 million.
  - The shortfall is where the growth is below zero, and in a `--since` window also what entered before its start.
- **Groups:**
  - by tool or kind;
  - by file:
    - for Read, Edit, Write, NotebookEdit, Grep and Glob, the path from the call; for Read, how many reads are partial (`offset`, `limit`, `pages`) is counted separately;
    - for Bash, the files the command names that exist on disk now, at most ten; the result is shared among them equally. A relative path is read from the folder that `cd` or `git -C` of the same command moved to before it, and otherwise from the root of the repository: every command of a session starts there. This is "the command names", not necessarily "reads": `git add RUN.md` also gives `RUN.md`;
  - by Bash program — the first word after `cd`, a subshell's parenthesis, assignments and `timeout` with its flags, and for `just`, `gh`, `git`, `npm`, `npx`, `node`, `go` and `buf` also the second, after the flags that come before it: `git -C .repos/app log` is `git log`.

  A path is printed from the root of the repository or from `~`. A session ID in a path is printed as `<session>`, the name of a file with output saved from the context as `*`.
- **The start of a session** is the median context of the first call and its makeup on average per session: the system prompt, the files CLAUDE.md, RULES.md and MEMORY.md, the list of skills, MCP instructions and other attachments. Their characters are converted into tokens by the ratio of characters to tokens of everything that entered between calls in the same period. The "rest" is what the transcript does not hold: the tool descriptions.
- **A session's first 80 main calls** are measured apart too: the context of a call among them, beside that of every main call. A session's context grows with its length, so the two apart tell a long task from heavier reading: a call keeps its place among its session's main calls when the window starts after the session did, and the calls before the window are not counted. A session continued in a new transcript goes on from the places of the calls it copied: the transcripts are read in the order their sessions began, by the first time each holds, so the one it copied from has given those calls their places first, when it copied only the tail after a compaction too.
- **What it does not see** — calls of `claude -p --no-session-persistence`: they have no transcript. graphify calls the model so (section 1.4).
- **What is printed** — only numbers, paths, the names of tools, attachments and programs, session IDs and the first task number `T…` from the author's first prompt. A program or second word that does not look like a name is printed as `other`.
- **Flags:**
  - `--since` and `--until` — an ISO 8601 date or time. A time without a zone is taken in UTC, `--until` is not included, and a date means the start of the day;
  - `--project` — the transcript folder of another project: a name under `<config>/projects`, which starts with "-" and is therefore written with "=" (`--project=-workspaces-app`). The recipe takes no path and reads nothing outside `<config>/projects`: SonarCloud takes a path from the command line for a directory traversal (S8707), and a name is enough. Paths are printed from the folder where most of its sessions started. Given several times, it reads the folders of several projects as one, each with the paths from its own folder;
  - `--top` — the length of the lists, 20 by default;
  - `--json` — the same numbers in JSON, for comparing baselines, with `classes` among them;
  - `--classes` — the table of section 1.14.2: the main calls of the orchestrator's executors, the sessions whose first prompt came by `claude -p` (`entrypoint: sdk-cli`), by what each did, by the class of the paths its tools named. A Bash command's paths are its words alone, as the files of the other repositories are not on this machine; its output and time are shared among its tools;
  - one of `--json`, `--row` and `--classes`.

### 1.2. The weights

The prices are [Anthropic's pricing page](https://platform.claude.com/docs/en/about-claude/pricing), read 2026-11-11. The rows of its table: "Claude Opus 5.5 | $4 / MTok | $5 / MTok | $8 / MTok | $0.20 / MTok | $20 / MTok" and "Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok". The columns are input, a cache write for 5 minutes, for an hour, a cache read and output. On the same page: "Cache hits and refreshes on Claude Opus 5.5 and Claude Sonnet 5.5 are priced at 0.05x the base input price".

- A long context does not change the price: "Claude 4.6 and later models (except Claude Haiku 5.5)… include the full 1M token context window at standard pricing".
- Fast mode has prices of its own, and the recipe counts a call in it as a call without a price. `spec`'s transcripts have none: every `speed` is `standard`.

The prices are in `tools/tokens/prices.mjs`; a new model or a new price is an edit both there and here. How spending goes into a subscription's limits, Anthropic does not publish (Т-39). So the measurement weighs a call by these prices, and on the trial of code map tools the weight is checked once against the share of the limit from `/usage`.

### 1.3. `spec`'s baseline

The sessions of E4 and E9 — from the start of 2026-11-09 to the start of the first session of the measurement, under the present rules and the present sizes of the documents:

```
just tokens-report --since 2026-11-09 --until 2026-11-11T03:59:01Z
```

| | Main | Subagents | Total |
|---|---|---|---|
| Calls | 2,344 | 3,682 | 6,026 |
| Cache reads, million | 1,044.39 | 389.51 | 1,433.91 |
| Cache writes, million — for 5 minutes / for an hour | 0 / 6.91 | 12.55 / 0 | 12.55 / 6.91 |
| Output, million | 2.34 | 0.96 | 3.30 |
| Uncached input | 5,000 | 7,388 | 12,388 |
| A call's context on average, thousand | 448.5 | 109.2 | 241.2 |
| Cost by API prices | $311.04 | $159.94 | $470.99 |

- **Sessions.** There are three, and 101 subagent transcripts; compactions — 9; the largest context — 966 thousand.
  - One session, `24cffd98`, led E4 and E9 almost wholly: 5,238 calls of 6,026, a context of 218.8 thousand on average.
  - The second, `62500adc`, began before the window: 738 calls in it, a context of 408.9 thousand.
  - The third, `15cc2763`, planned E10: 50 calls, a context of 108.6 thousand.

  The rule "one task is one session" did not hold in the window. This is the input of the analysis of section 1.5.
- **What the context carries**, as a share of the total "carried", 1,314 million:
  - Bash output — 36.7 %;
  - the model's own output — 29.2 %;
  - the starts of subagents — 9.6 %;
  - what compactions left — 6.9 %;
  - Read — 4.5 %;
  - the author's words — 1.9 %;
  - answers to questions to the author — 1.6 %;
  - the starts of sessions — 1.6 %.
- **Files**, by "carried", million, and how many times:
  - RUN.md through Bash — 48.4 (649);
  - output saved from the context and read by Read — 29.2 (46);
  - `docs/decisions.md` through Bash — 26.0 (531);
  - `docs/privacy.md` through Bash — 17.0 (290) and through Read — 10.5 (15);
  - COORDINATION.md through Bash — 15.4 (307);
  - the format text through Bash — 11.9 (138).

  The documents are read mostly by Bash commands, not by Read.
- **Bash programs**, by "carried", million: `sed` — 154.7, `grep` — 87.1, `cat` — 49.5, `node -e` — 24.6, `awk` — 23.6.
- **The start of a session.** Two sessions began in the window, and the median context of their first call is 49.3 thousand. On average per session:
  - the tool descriptions (rest) — 12.6 thousand;
  - CLAUDE.md — 10.2 thousand;
  - the list of skills — 8.4 thousand;
  - RULES.md — 5.2 thousand;
  - the system prompt — 4.9 thousand;
  - MCP instructions — 2.0 thousand;
  - MEMORY.md — 1.6 thousand.

  One token of what entered between calls is 2.05 characters.

**For all time**, for scale — `just tokens-report --until 2026-11-11T03:59:01Z`, since 2026-10-18:
- 81 sessions and 391 subagent transcripts, 32,465 calls: 15,033 main and 17,432 of subagents;
- cache reads — 7,526.45 million, writes — 72.52 million for 5 minutes and 49.86 million for an hour, output — 28.75 million;
- a call's context on average — 235.6 thousand: 356.4 thousand for the main ones, 131.4 thousand for subagents;
- the cost by API prices — $2,841.86;
- a session's median is 174 calls, and of the average context 185.8 thousand;
- the most is carried by Bash output (32.7 %), the model's output (27.5 %) and Read (14.0 %), and of the files by RUN.md, through Bash and Read, and `docs/decisions.md`.

Later measurements — the one after E10's changes, of each epic's archive and the monthly ones — are rows of the table of section 1.9, by the same recipe with `--row`; the baseline is its first row. What each change of E10 gave against this baseline is section 1.10.

### 1.4. Code map tools

The tools that give an agent a map of the code instead of reading files were examined from the primary sources and by a trial on `tutor` and `spec`. Everything was read 2026-11-11.

**From the primary sources:**

- **A language server in Claude Code** — the plugins `gopls-lsp` and `typescript-lsp` from `claude-plugins-official`.
  - What it gives ([Code intelligence](https://code.claude.com/docs/en/plugins/code-intelligence.md)): "gives Claude the live diagnostics and go-to-definition that your editor has… and finds definitions and references by symbol instead of by text search". The tool `LSP` — "jump to definitions, find references, report type errors and warnings" ([Tools reference](https://code.claude.com/docs/en/tools-reference.md)).
  - The server is installed separately: "It doesn't include the language server. Install the language server binary first".
  - Diagnostics after each edit go into the context by themselves: "each time Claude edits or writes a file the server handles, Claude gets the errors and warnings the server reports".
  - It does not work in a cloud session: "In cloud sessions, Claude Code doesn't start plugin language servers".
  - The page says nothing about saving tokens.
  - It reads no documents: only code that has a server.
  - The content goes nowhere but to the session's model.
  - gopls is BSD-3-Clause, and it is already in the devcontainer of the Go repositories. TypeScript needs `typescript-language-server`, an npm package.
- **The paper [arXiv 2608.13568](https://arxiv.org/abs/2608.13568)** — P. Xu, 29 June 2026, a preliminary study on Python and TypeScript repositories; Claude Opus 4.8, Sonnet 4.6 and Haiku 4.5.
  - The main finding: "The answer is conditional and usually negative. On symbol-named localization the LSP costs tokens (+6% to +118%) and the agent ignores it when free. On reference-completeness it buys precision but not token savings… it saves tokens only for the weakest model".
  - On renames across many files: "grep solves multi-file renames perfectly, a location-only LSP fails three-quarters of them by missing a call site".
- **Serena** ([oraios/serena `v2.1.0`](https://github.com/oraios/serena/blob/v2.1.0/README.md)) — an MCP server on top of language servers: "semantic code retrieval, editing, refactoring and debugging tools… operating at the symbol level".
  - More than 40 languages, among them Go, TypeScript and Markdown, but as language servers, not as reading of text.
  - The license ([LICENSE](https://github.com/oraios/serena/blob/v2.1.0/LICENSE)): "SolidLSP under the MIT License and the Serena application under GPL-3.0-or-later", so the package `serena-agent` as a whole is GPL-3.0-or-later. By the rule on licenses it is allowed only as a development tool that does not ship, and only as a named exception.
  - Python `>=3.11, <3.15`, installed with `uv tool install -p 3.13 serena-agent`. It downloads the language servers itself — "downloads or installs certain language server dependencies on demand", with pinned versions and a hash check ([security](https://github.com/oraios/serena/blob/v2.1.0/docs/02-usage/070_security.md)).
  - It writes `.serena/` into the repository (the project's settings and "memories") and `~/.serena/`.
  - By default the content stays on the machine; it counts tokens locally.
  - There are no numbers of savings.
- **graphify** ([Graphify-Labs/graphify `v0.9.106`](https://github.com/Graphify-Labs/graphify/blob/v0.9.106/README.md)) — a knowledge graph of the project: "maps your entire project (code, docs, PDFs, images, videos) into a knowledge graph you can query instead of grepping".
  - It parses code locally, with tree-sitter, about 40 languages, Go and TypeScript among them: "Code files: processed locally via tree-sitter. Nothing leaves your machine".
  - Documents are read by a model: "Docs, PDFs, images: sent to your AI assistant for semantic extraction (via the `/graphify` skill, using whatever model your IDE session runs)". Without the skill — through the `claude` CLI on a subscription, or with an API key of another provider.
  - On the cost of documents: "semantic extraction of docs, papers and images runs the model over every file, which can cost minutes and tens of thousands of tokens" ([skill.md](https://github.com/Graphify-Labs/graphify/blob/v0.9.106/graphify/skill.md)).
  - The license is Apache-2.0 ([LICENSE](https://github.com/Graphify-Labs/graphify/blob/v0.9.106/LICENSE)); Python `>=3.10,<3.15`, the PyPI package `graphifyy`.
  - It writes `graphify-out/` (the graph, a report, a cache). The command `graphify claude install` appends a section to CLAUDE.md and installs PreToolUse hooks on Bash, Grep, Read and Glob in `.claude/settings.json`. Updating is `graphify update` (code, without a model), `watch` and git hooks.
  - The project's own numbers: "71.5x fewer tokens per query" on a corpus of 52 files and "~1x" on a small library ([how-it-works](https://github.com/Graphify-Labs/graphify/blob/v0.9.106/docs/how-it-works.md)).
- **An embedding index** — [claude-context](https://github.com/zilliztech/claude-context), MIT, Node.js.
  - "Languages: TypeScript, JavaScript, Python, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, Markdown".
  - The embeddings are "OpenAI, VoyageAI, Ollama, Gemini", and the index lies in a Milvus or Zilliz Cloud vector database. So the repository's text goes to the embedding provider under its own key, unless Ollama is run locally.
  - The README has no numbers of savings. There is only the blog of Zilliz, a vendor of vector databases.
  - An independent study, [arXiv 2608.01507](https://arxiv.org/abs/2608.01507), 2 August 2026, on questions about a repository: "Semantic search answered 65.2% of questions correctly against 46.2% for deep agentic search, and it produced each correct answer at less than half the cost".
- **A packer** — [repomix](https://github.com/yamadashy/repomix), MIT, `v1.19.0`: the whole repository as one file. For an agent that reads as needed this is the opposite: such a file rides in the context whole.
- **Structural search** — [ast-grep](https://github.com/ast-grep/ast-grep), MIT, `0.51.2`, a Rust binary: search by the AST of code, not by Markdown. Its MCP server is marked "experimental".
- **A map in the manner of aider** — [aider](https://aider.chat/docs/repomap.html): "a concise map of your whole git repository that includes the most important classes and functions along with their types and call signatures", by default "1k tokens". aider itself has no MCP server, and the third-party RepoMapper, without versions, does not read Markdown.

The language server, Serena and graphify went into the trial. The embedding index did not: the text goes to the embedding provider, which is a new recipient of data that privacy does not name, and a key. The packer, ast-grep and the aider map did not go either: they either contradict reading as needed, or do not read documents, or are not ready.

**The trial** — 2026-11-11, 13:48–15:07 UTC. The tools:
- no tool;
- the gopls plugin, `--plugin-dir`, gopls 0.24.0 from the template's lock file;
- Serena `2.1.0`, an MCP server;
- graphify `0.9.106`: the graph in the clone and its hooks.

Each tool is in a clone of its own. `tutor` was taken at `main` 34584ba with the `spec` submodule, and `spec` on the E10 branch. 4 questions per repository, three times, each run a fresh session of `claude -p` on Opus 5.5, read-only. The answers were checked against a reference: by gopls (`references`, `call_hierarchy`, `implementation`) for `tutor` and by `git grep` for `spec`.
- The questions of `tutor`: which exported methods reach `admission.Table.Admit` and through which chain; who outside tests implements `provider.Model`; what an edit of the signature of `provider.Billed` would break; where `provider.CheckImages` is defined and who calls it.
- The questions of `spec`: which decision sets the production image; which files cite `privacy 5.3`; what a renumbering of `R81` would affect; what `legal.in-force-unchanged` checks.

| Tool | Runs | Correct answers | Cost of a run on average | Against "no tool" | Turns on average | Used the tool |
|---|---|---|---|---|---|---|
| `tutor`, no tool | 12 | 12 | $0.172 | — | 5.9 | — |
| `tutor`, LSP | 12 | 12 | $0.188 | +9 % | 7.3 | 9 calls of `LSP` |
| `tutor`, Serena | 12 | 12 | $0.164 | −5 % | 5.4 | never |
| `tutor`, graphify | 12 | 12 | $0.216 | +25 % | 6.5 | 14 calls of `graphify` |
| `spec`, no tool | 12 | 9 | $0.199 | — | 5.0 | — |
| `spec`, graphify | 12 | 10 | $0.262 | +32 % | 5.3 | 5 calls of `graphify` |

- **The cost** is the run's `total_cost_usd` by the prices of section 1.2. The spread of one question between repeats is up to 1.5×: for the question about the chain to `Admit` with no tool, from $0.22 to $0.33. A difference below ≈ 10 % is noise.
- **The incomplete answers** on `spec` are all on the first question: the answer left out the caveat of the decision on production images, "any other runtime only by an amendment".
- **The start of a session** is 37–43 thousand tokens in each branch. This is most of the context of a short question, and no tool reduces it.
- **Serena** connected: its two tools lay among the deferred ones, behind ToolSearch. But the agent never searched for them and answered through `grep`. Its −5 % is the noise of a branch that did not differ from "no tool".
- **graphify on `spec`.** The graph took 69 minutes to build: 7,696,533 tokens of input and 568,346 of output for Sonnet 5 through `claude -p` on the subscription. graphify gives no breakdown by cache, so by the prices of section 1.2 this is from ≈ $7 (all input from the cache) to ≈ $25 (all input a cache write). The graph is 38,650 nodes; it has to be rebuilt with every edit of the documents, and the model reads the changed files again. graphify calls `claude -p --no-session-persistence`, and these calls have no transcripts: `just tokens-report` does not see them.
- **graphify's hooks** (`graphify claude install`) write a section into the clone's CLAUDE.md and `.claude/settings.json`. Claude Code's shared settings did not change: `~/.claude/settings.json` and the list of plugins are the same before and after the trial.

**The conclusion:**
- **Code.** On the questions "where is it defined", "who calls it", "what would an edit break", every tool answered as correctly as `grep` and `Read`, but not more cheaply. LSP is +9 %, graphify +25 %, and the agent did not take Serena. This agrees with the paper arXiv 2608.13568. A language server also gives diagnostics after an edit, which the trial did not measure; that is an argument about the quality of edits, not about tokens.
- **Documents.** The language server and Serena do not read Russian text as text. graphify does, but its branch is a third more expensive, and the graph costs $7–25 and an hour to build at every large edit. The agent's answers to questions about the documents are almost all correct without a graph too.
- **Where the spending really is.** The trial lacked what is expensive in real work: a long session, where each read carries context into every following call (section 1.3). A short question costs $0.10–0.33, and its base is the start of the session. Savings are to be looked for in the start of a session, its length and the structure of the documents — sections 1.5 and 1.6 — not in a map of the code.
- **The recommendation for E10's decision:** take no code map tools. The gopls plugin can be turned on separately, for the diagnostics after an edit, but not as a saving; that is worth deciding in the course of work in a code repository, not in E10.

**The check of the weights** — by the share of the limit from `/usage` before and after the whole trial, as the author decided:
- the five-hour session limit — 21 % at 13:47 and 87 % at 15:08, that is +66 percentage points; the weekly one — 37 % and 48 %, +11 percentage points;
- for the same window all sessions of this machine weigh $46.48 by the prices of section 1.2: the trial $12.71, the sessions of `api`, `canvas`, `learner-model`, `modules` and `spec` $33.77. To this add the graphify pass, ≈ $7–25, which the transcripts do not see. In total ≈ $53–72;
- so 1 percentage point of the five-hour Max limit ≈ $0.8–1.1 by API prices, and 1 percentage point of the weekly one ≈ $5–6.5;
- The share of the limit counts everything the author did in Claude — "Your usage of all different Claude product surfaces (claude.ai, Claude Code, Claude Desktop) counts towards the same usage limit" (Т-39). The weight above is only this machine's sessions, so the conversion is an upper estimate of the price of a point. This is one point, not a check of proportionality. The measurement keeps API prices as the weight, and the conversion into shares of the limit is by these numbers.
- The breakdown of `/usage` for the day as of 2026-11-11 — for section 1.5: "95% of your usage came from subagent-heavy sessions", "84% of your usage was at >150k context", "82% of your usage was while 4+ sessions ran in parallel", "70% of your usage came from sessions active for 8+ hours".

### 1.5. How sessions work

Which changes to the way of work itself cut the sessions' context — by the numbers of section 1.3, by the transcripts of all 13 repositories of this machine, by the documentation of Claude Code and by two trials. The documentation was read 2026-11-11.

**Where the spending is.** In all 13 repositories the start of a session is 41–45 thousand tokens, and the average context of a call is 218–294 thousand, 5–7 times more. So the spending is set by what a session has gathered, not by what it started with. The analysis of the author's `/usage` for a day says the same: «84% of your usage was at >150k context», «70% of your usage came from sessions active for 8+ hours» (section 1.4). The documentation ([Manage costs](https://code.claude.com/docs/en/costs.md)): «Use `/clear` to start fresh when switching to unrelated work. Stale context wastes tokens on every subsequent message».

| Change | Saving | Risk — what the agent will stop seeing | How a check will notice it |
|---|---|---|---|
| One task is one session: a new session or `/clear` after a task | −51% of the context of the main sessions of E4 and E9 (1,051 → 513 million), −18% over all time | what the previous task held in its context and did not write into files; RULES.md already requires that context live in files | the task's «Сделано» and «Открыто»; `just inbox` |
| Auto-compaction earlier: `CLAUDE_CODE_AUTO_COMPACT_WINDOW` at 300–400 thousand instead of ≈ 967 thousand | −51% at 400 thousand (11 compactions), −61% at 300 thousand (18), −70% at 200 thousand (31) — on the same sample | details that the compaction summary will leave out; the `paths` rules loaded before the compaction | the task's review and checks; «Сделано» by the files, not by the session's memory |
| A thin CLAUDE.md: the checks of the parts in `.claude/rules/` with `paths` | −5,090 tokens on every call (44,350 → 39,264), ≈ 2% of the baseline's call context | a part's rule loads only when the session reads or edits a file of the part; an edit by a `node` or `sed` script will not load it; after a compaction it is gone | CI runs every check, and the merge waits for them; CLAUDE.md has a line saying where the rules are |
| The account's connectors and skills outside NovaTrail's tasks: `ENABLE_CLAUDEAI_MCP_SERVERS=false` or `disableClaudeAiConnectors` | ≈ 10 thousand tokens per call: the list of skills ≈ 8 thousand and the MCP instructions ≈ 2 thousand, ≈ 4% of a call's context | the claude.ai connectors are not needed in these repositories | none |
| A cheaper model for a subagent | none: Opus — $0.31–0.34, Sonnet — $0.21–0.42, Haiku — $0.27–0.35 for the same task | a cheap model makes mistakes: Haiku — 0 right of 3, Sonnet — 2 of 3, Opus — 3 of 3 | none |
| Procedures as skills of `.claude/skills/` | part of the thin CLAUDE.md. Inbox triage (rule 13) is needed by every task, and as a skill it saves nothing | — | — |
| A map of the repository in the rules | the search for "what is where" — `ls` and `find` — carries 0.65% of the baseline, Glob — 0 | — | — |
| Shorter output of the checks | the `just` recipes carry 0.1% and less: `docs-check` already prints a line, and long output is cut by the session with `tail` and `grep` | — | — |
| A shorter MEMORY.md | the whole index is 3.7 KB, ≈ 1.6 thousand tokens per call, ≈ 0.7%. The repetitions of the rules are small: "The author commits" retells RULES.md and adds to it | — | — |

**Trials** — 2026-11-11, `claude -p` on Opus 5.5 in a clone of `spec` on the E10 branch, reading only.
- **A thin CLAUDE.md.**
  - The Environment paragraph — 76% of CLAUDE.md, 18.8 of 24.9 KB — was cut by sentences into 11 rules of the parts with `paths`. CLAUDE.md became 9.9 KB.
  - An empty question, ×3: the context of the first call is 44,350 tokens with the full CLAUDE.md and 39,264 with the thin one.
  - The question "which checks does an edit of `legal/schemas/legal.schema.json` wait for", ×2: the answers are the same — `just legal-check`, `just types`, `just types-check`. But the rule did not load by itself: the session opened no files of `legal/`. It found it by the line of CLAUDE.md, through Glob and Read — 1–2 more turns.
  - The documentation ([Memory](https://code.claude.com/docs/en/memory.md)): «A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file», and compaction removes such a rule: «If a rule must persist across compaction, drop the `paths:` frontmatter or move it to the project-root CLAUDE.md» ([Context window](https://code.claude.com/docs/en/context-window.md)).
- **The subagent's model.**
  - The task: find the entries of `docs/decisions.md` where Starlark occurs. The answer is 12 entries; the session gives the search to a subagent whose model is set in `--agents`. ×3 per model.
  - Right: Opus — 3 of 3 in 18–24 s; Sonnet — 2 of 3 in 41–159 s; Haiku — 0 of 3 in 86–144 s.
  - A cheap model reads more and takes more turns, so it saves no money.
  - The documentation ([Subagents](https://code.claude.com/docs/en/sub-agents.md)): the model is taken from the call, from the `model` field, from `CLAUDE_CODE_SUBAGENT_MODEL` or from the main session. Explore and Plan «start without your CLAUDE.md files», and only the subagent's result returns to the parent.

**More from the documentation:**
- A model with a window of 1 million «compact[s] before the window fills, at about 967K tokens by default». The threshold is changed by `autoCompactWindow` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, from 100 thousand to 1 million ([Model configuration](https://code.claude.com/docs/en/model-config.md)).
- Bash output goes into the context up to `BASH_MAX_OUTPUT_LENGTH`, «default: 30000» characters ([Environment variables](https://code.claude.com/docs/en/env-vars.md)). Longer output goes to a file of the session, and its beginning, up to 2,000 characters, into the context ([Tools reference](https://code.claude.com/docs/en/tools-reference.md)).
- An import is no cheaper than text: «Imported files are expanded and loaded into context alongside the CLAUDE.md that references them» ([Memory](https://code.claude.com/docs/en/memory.md)).
- The list of skills loads only the descriptions, «full skill content only loads when invoked». `skillOverrides` does not turn off the skills of plugins ([Skills](https://code.claude.com/docs/en/skills.md)). The claude.ai connectors are turned off by `disableClaudeAiConnectors` and `ENABLE_CLAUDEAI_MCP_SERVERS=false` ([MCP](https://code.claude.com/docs/en/mcp.md)).

**How it was counted.** "One task is one session" and "compaction earlier" are models over the transcripts of `spec`'s main sessions over the baseline of section 1.3, with no new runs:
- a task's boundary is the author's prompt «Выполни задачу T…», «планируй T…» or «Разбери входящие»; after it the context falls to the start of the session and grows anew;
- compaction at the threshold keeps the start of the session and ≈ 20 thousand tokens of the summary.

The compaction calls themselves, one reading of the whole context each, are not counted. The two changes overlap, and their savings do not add up.

**Recommendation for E10's decision** — in order of saving:
1. One task is one session: a rule of RUN.md, and «Выполни задачу» in a new session or after `/clear`. The planning and the execution of one task are one session.
2. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` at about 400 thousand — in `containerEnv` of the template's devcontainer and of `spec`.
3. A thin CLAUDE.md with the rules of the parts by `paths` and a line saying where they are.
4. `ENABLE_CLAUDEAI_MCP_SERVERS=false` in the devcontainer — if the author does not need the claude.ai connectors in NovaTrail's repositories.
5. Do not: a cheap model for subagents, a map in the rules, a change to the output of the checks.

### 1.6. The structure of the documents

How to restructure the documents and the supporting files so that a session takes fewer tokens and loses nothing it needs for its work. The sample on the decision log and the "lossless" check are at the end of this section. The reader of `docs/` is a session of Claude Code: the author does not read them. The sources of the numbers:
- readings — `tokens-report --json` over the transcripts of all 13 repositories of this machine, for all time up to 2026-11-11;
- sizes — the files on `main` on 2026-11-11, through `gh api`;
- tokens — the count below.

**Counting tokens.** Each text went through `claude -p` on Opus 5.5 with no tools and with a system prompt of two words. Its tokens are the context of that run minus the context of the same run without the text, which is made at the start of each launch.
- The context of the empty run is 631, 642 and 645 tokens in three launches. The difference between them, up to 14 tokens, is the margin of error of one number.
- Counting through the API is free but needs a key, and the container has none: [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting), read 2026-11-11 — «Token counting is **free to use** but subject to requests per minute rate limits based on your usage tier», the request carries the header `x-api-key`. `claude -p` runs on the subscription and needs no key.
- The count and the translations cost ≈ $3.0 at the prices of section 1.2.

| Text | Characters per token | Bytes per token |
|---|---|---|
| Russian text of the documents — a decision entry, a card, a section of concepts, privacy, product | 2.20–2.50 | 3.2–3.9 |
| Russian text with tables and numbers — measurements 1.3, table 4 of RUN.md | 1.85–2.18 | 2.7–3.3 |
| English text — CLAUDE.md, RULES.md, translations | 2.68–2.99 | 2.7–3.0 |
| English text with schemas and code — a section of the [format text](../format/README.md) | 2.50 | 2.50 |

For the budgets of size in bytes, the lower bound of the text's own kind, so that a limit in bytes does not let through more tokens than intended: Russian text — 3.2 bytes per token, Russian tables and numbers — 2.7, English — 2.5. The ratio of 2.05 characters per token from section 1.3 belongs to everything that enters between calls, code and JSON included, not to the documents.

**Inventory**, KB on `main`:

| Repository | `docs/decisions.md` | `docs/architecture.md` | `docs/plan/` | RUN.md | CLAUDE.md | Total with README and the other `docs/` |
|---|---|---|---|---|---|---|
| `spec` | 1,705 | 228 | 1,581 | 185 | 24 | 4,524 |
| `.github` | 364 | 297 | 605 | 17 | 11 | 1,302 |
| `api` | 646 | 522 | 406 | 152 | 6 | 1,757 |
| `app` | 314 | 491 | 210 | 228 | 5 | 1,255 |
| `canvas` | 976 | 600 | 1,198 | 132 | 12 | 2,942 |
| `engine` | 280 | 217 | 340 | 44 | 7 | 894 |
| `infra` | 268 | 164 | 294 | 75 | 7 | 814 |
| `learner-model` | 372 | 278 | 376 | 84 | 8 | 1,130 |
| `module-kit` | 580 | 222 | 509 | 18 | 6 | 1,352 |
| `modules` | 434 | 230 | 549 | 29 | 8 | 1,258 |
| `sim` | 346 | 206 | 325 | 58 | 5 | 953 |
| `skill-map` | 168 | 71 | 199 | 23 | 5 | 475 |
| `tutor` | 772 | 791 | 1,337 | 37 | 10 | 3,090 |

The total is 21.24 MB, ≈ 6.5 million tokens. The decision logs are 7.05 MB, the epic archives 7.74 MB, `docs/architecture.md` 4.21 MB, RUN.md 1.06 MB. `spec` also has `docs/concepts.md` — 214 KB, `privacy` — 207, `repositories` — 152, `product` — 92, `dpia` — 57, COORDINATION.md — 59.

**How they are read** — the documents' share of what each repository "carried", %. It includes the Read readings and the Bash commands that name the file. The start of a session — CLAUDE.md and RULES.md — is not counted here: section 1.5 analysed it.

| Repository | Sessions | "Carried", million | Documents | RUN.md | `architecture` | Decision log | `spec`'s documents from the submodule |
|---|---|---|---|---|---|---|---|
| `spec` | 83 | 7,733 | 19.1 | 7.7 | 1.5 | 4.9 | — |
| `.github` | 14 | 1,985 | 8.1 | 2.3 | 2.9 | 2.6 | 0.3 |
| `api` | 19 | 2,488 | 13.1 | 4.6 | 4.0 | 2.6 | 1.9 |
| `app` | 11 | 1,486 | 14.4 | 4.1 | 4.7 | 1.9 | 3.6 |
| `canvas` | 29 | 5,283 | 11.3 | 5.1 | 2.9 | 2.3 | 0.9 |
| `engine` | 11 | 994 | 8.2 | 2.7 | 4.6 | 0.7 | 0.1 |
| `infra` | 4 | 873 | 5.0 | 2.7 | 1.4 | 0.3 | 0.4 |
| `learner-model` | 16 | 1,118 | 12.4 | 4.9 | 4.8 | 2.0 | 0.7 |
| `module-kit` | 28 | 1,613 | 12.6 | 6.2 | 3.5 | 2.2 | 0.6 |
| `modules` | 16 | 1,594 | 8.5 | 3.5 | 2.2 | 1.6 | 1.0 |
| `sim` | 8 | 1,015 | 7.7 | 2.2 | 4.0 | 1.4 | 0.1 |
| `skill-map` | 5 | 436 | 4.0 | 1.5 | 1.1 | 1.3 | 0.0 |
| `tutor` | 26 | 5,115 | 7.7 | 3.4 | 2.3 | 1.4 | 0.2 |

- **In total** 31,734 million were "carried", and the documents carried 12.2%: RUN.md — 4.9%, `architecture` — 2.7%, the decision logs — 2.6%, the other documents of `docs/` — 0.9%, `spec`'s documents from the submodule — 0.6%, the epic archives — 0.2%, COORDINATION.md — 0.2%. This is the ceiling that any restructuring of the documents can give.
- **How they are read.** `spec` reads its documents with Bash commands, and the other repositories through Read and almost always in part: RUN.md has 925 partial Read readings of 1,112, `architecture` 955 of 1,039, the log 905 of 994.
  - One reading brings on average 2.9 thousand tokens for RUN.md and the log and 4.1 thousand for `architecture`.
  - What it brought stays in the context for on average 101, 71 and 84 of the following calls. So a reading is expensive by the length of the session, not by the size of the file (section 1.5).
- **Gaps:**
  - Bash output where the file is not named — `grep -r` over `docs/` — is not counted for the document, so their share is a lower bound;
  - the report's JSON has no combination of "file and Bash program";
  - on the transcripts of `module-kit` the report fails (Д209), and its numbers were obtained with a copy of the recipe fixed in the scratchpad; the recipe itself was fixed later (section 1.9).

**Structure.**

- **RUN.md.** The bodies of the current epic's done tasks go to the archive only with the epic. Until then they are most of the file: in `app` — 79%, `api` — 67%, `canvas` — 56%, `infra` — 48%, `learner-model` — 36%, `spec` — 20%. In `spec` half of RUN.md is table 4: 68 thousand characters, 31 thousand tokens, and the executor's rules are another 6%.
- **`spec`'s decision log** is 142 entries and 1.11 million characters without the header:
  - the decision itself — 39%, "Why" — 14%, "Rejected" — 8%, "Consequence" — 5%, amendments — 34%;
  - 310 amendments in 101 entries, up to 17 in one;
  - "Superseded" — in one entry. The text in force of a decision is assembled from the entry and its amendments, and the session reads them all.
- **The repositories' `docs/architecture.md`** accumulates what does not describe how things are built:
  - the section "Sources" — quotes of external facts with a date — from 7% of the file in `spec` to 58% in `.github` and 53% in `infra`; in `canvas` — 40%;
  - `tutor` (524 thousand characters) also has the results of measurements — "Measurements of epic E4", 24%, and "Measurement of AI reading", 19%;
  - in the 13 files together this is 34% of the characters. Dated amendments in `tutor` and `canvas` — 93 and 88.
- **Repetitions between repositories** cost almost nothing: `spec`'s documents from the submodule carry 0.6% of the total and 0–3.6% per repository, the most in `app`. The retelling of RULES.md in CLAUDE.md is part of the start of a session (section 1.5), and CLAUDE.md and RULES.md read separately carry 0.1%.

| Change | Saving — the ceiling, a share of what all 13 "carried" | Risk | How a check will notice it |
|---|---|---|---|
| A done task's body goes to the epic's archive at once, and RUN.md keeps the row of table 1 and a sentence of the result with a link | ≤ 1.9%: RUN.md carries 4.9%, and the bodies of done tasks in the six analysed RUN.md files are 38% of the text, if each RUN.md is weighted by how much it carries; the heaviest is `spec`'s RUN.md, where they are 20% | the next task does not see the previous one's «Выяснилось». But «Открыто» already goes to tables 3 and 4 (rule 9 of RUN.md) | `docs-check` resolves links to the archive; the author reads RUN.md, and its structure is the author's to decide |
| `spec`'s table 4 goes to a file of its own, which a task reads by its number «Д» | ≤ 3.9% in `spec`, ≈ 1% of the total | a task will not notice a debt that concerns its change | the register «Д» in `tools/docs-check/config.mjs` gets the new file |
| A consolidation of the decisions in force beside the log: a decision with its amendments merged in and "Rejected" in one line; the log stays as history | ≈ 0.5–0.7% by the sample below: the logs carry 2.6% and `spec`'s log from the submodules another 0.25%, while the consolidation is 60% of the log and saves 17–24% of what the readings carry | the consolidation diverges from the log; what was rejected is lost and proposed again | the "lossless" check of the sample |
| "Sources" and the results of measurements move from `docs/architecture.md` to files of their own | ≤ 0.8%: `architecture` carries 2.7%, and 30.5% of it goes, if each file is weighted by how much it carries. "Sources" — from 7% in `spec` to 58% in `.github`; measurements — only in `tutor`, 43% | a claim comes apart from its source, while the bar of RULES.md requires it with its date | a link to the source's record, which `docs-check` resolves |
| A file per section for the large documents | little: the readings are partial anyway, and one `grep -n` finds a section | anchors and links to lines break. It needs changes to `documents`, `citations.mjs`, `sections.mjs` and `docs-check-repo` in all 13 | — |
| A log entry per file | little: an entry gets no shorter from it, and the reading is partial anyway | the same as with a file per section | — |
| A table of contents at the start of the log, which `docs-check` builds and checks | little: one `grep -n` by its number finds an entry anyway, and a table of contents of 142 lines itself lands in the context with every reading of the start | the table of contents lags behind the entries | a check in `docs-check` |
| A shorter card of a component in `spec`'s architecture, since the detail is in the repository | ≤ 0.6% | — | — |

**Language.** Six sections of different kinds and one table were translated into English — in full, with the same numbers, links and figures. The translations are in the session's scratchpad, not in the repository.

| Section | Characters, Russian | Tokens, Russian | Tokens, English | Difference |
|---|---|---|---|---|
| the entry on the contracts with its amendments | 32,897 | 14,921 | 13,324 | −10.7% |
| the entry on production images | 10,750 | 4,746 | 4,326 | −8.8% |
| the card of `tutor` in architecture | 9,740 | 4,305 | 3,973 | −7.7% |
| the section on the check in concepts | 12,117 | 5,250 | 4,508 | −14.1% |
| the section on providers' terms about age in privacy | 9,784 | 3,909 | 3,507 | −10.3% |
| the table of the product's open questions | 33,071 | 14,144 | 12,295 | −13.1% |
| measurements 1.3 | 3,117 | 1,688 | 1,449 | −14.2% |
| **total** | 111,476 | 48,963 | 43,382 | −11.4% |

- **Saving.** English is cheaper by 8–14%, not several times: Russian text has ≈ 2.3 characters per token, English ≈ 2.8, but a translation is longer than its original: by 2–20% of the characters for a section and by 10% in total.
  - Only `docs/` without the archives can be translated: RUN.md, the archives and COORDINATION.md stay in Russian. That is 12.2% less 4.9%, 0.2% and 0.2% — 6.9% of what was "carried", and the translation would save ≈ 0.8% of the total.
  - The price of the translation: 12.2 MB of `docs/` without the archives, ≈ 3.6 million tokens; model output of ≈ 3.2 million tokens, ≈ $65 at the prices of section 1.2, without checking and review.
- **Risk.** A translation changes the form: in the card of `tutor` it split long items into sub-items, and there were 60 lines instead of 30. Translating all the documents is an edit of every line of 13 repositories, and the "lossless" check of the sample below would have to be run on all of it.
- **What does not change.** The prefixes of the registers О-, П-, Т-, «Д» and «В» are Cyrillic in English text too. Quotes of Russian laws and sources stay in Russian. The author reads RUN.md, the reports and COORDINATION.md, and they stay in Russian.
- **The bar of RULES.md** ("The bar") holds for a reader that is an agent too: one term — one meaning, a source with its date, a gap — an open question, a decision with "why" and "rejected". Only the addressee of the first sentence changes — an engineer, a module author or a lawyer — and the structure is chosen for reading in parts. E10's decision settles this.

**Density** — over the seven sections above:
- quotes of sources — in the section on providers' terms about age they are 29%, in the entry on production images 12%, in the table of the product's open questions 8%, in the entry on the contracts 6%. The bar requires them, and they do not compress;
- links in parentheses — `(R83)`, `(concepts 10)` — 10–60 per section. They are short, and by them the session finds the rest;
- history and reasoning that are rarely needed are the amendments of the log, the bodies of done tasks, the results of measurements and "Sources" in `architecture`. These can be moved out of what is read every time;
- "Rejected" cannot be moved out: RULES.md forbids proposing what was rejected again without new facts, and the session needs to see it.

**The order of the restructuring:**
1. `spec`: RUN.md, and the consolidation of the log — if E10's decision takes it, though the sample below advises against it;
2. the template `repo-template/`: the rule of RUN.md about the bodies of done tasks and the budgets of size — so that a new repository starts that way already;
3. the repositories — by `spec`'s sample, in tasks of their own: each restructures its RUN.md, `docs/architecture.md` and log in a session of its own.

**Recommendation for E10's decision** — in order of saving:
1. A done task's body goes to the archive at once, in all repositories: ≤ 1.9%.
2. `spec`'s table 4 goes to a file of its own or gets shorter: ≤ 3.9% in `spec`, ≈ 1% of the total; the author decides.
3. "Sources" and the results of measurements move from `docs/architecture.md` to files of their own: ≤ 0.8%.
4. A consolidation of the decisions in force — the sample below measured ≈ 0.5–0.7% and advises against taking it for the saving.
5. Do not: the translation into English — −11% for the documents, ≈ 0.8% of the total, ≈ $65 and a risk of losses; the language of the documents stays. Do not do a file per section, an entry per file, a table of contents of the log or shorter cards either.

Together this is no more than ≈ 5.5% of what was "carried", and by the sample below for the consolidation ≈ 4.4%. "One task is one session" gives −51% (section 1.5), and the changes overlap: in a short session what was brought stays for fewer calls, so the documents' saving is smaller too. The restructuring of the documents is a saving of the second order, and the budgets of size hold the growth.

**Sample: a consolidation of the decisions in force**, 2026-11-11. The consolidation was made in a clone of `spec` on the E10 branch, in a temporary branch in the session's scratchpad, and does not go into the repository.

- **The slice** is the 15 entries of `spec`'s log with the most amendments and readings: on licenses, the samples page, the CI checks, `spec`'s release, UI packages as web components, their publication to npm, the format's version, the format's schemas, the README badges, a task's file, the answer slot's check, the trap catalogs, code taking `spec`'s releases, the cross-repository plan and the contracts.
  - That is 326,638 characters, 29.5% of the text of the entries, and 155 of the log's 363 amendments. The analysis of structure above counted 310: it did not count "Second amendment" and the like.
  - The readings were counted by the tool calls in the transcripts of all 13 repositories: those that name `spec`'s log and the number of the entry. Most often tasks look for an entry's amendments in it.
- **Structure.** The consolidation is the file `docs/decisions-current.md` beside the log. An entry of the consolidation is `### R44.`:
  - the heading in its wording in force;
  - the items of the rule in force, the amendments merged in, without the history and without "Why";
  - "*Rejected:*" — everything rejected that is still in force;
  - "*Where:*" — the sections of the documents;
  - "*Also:*" — the decisions that changed the entry without an amendment to it;
  - "*Log:*" — the number of amendments, the date of the last one and the fingerprint of the log's entry.

  The consolidation was written by five subagents, three entries each, from one brief.
- **Size** — in tokens, by the counting method above. The log's entries have 144,828, the consolidation 85,510, that is 59%. By entry — from 45% for the entry on the answer slot's check to 75% for the one on the cross-repository plan.
  - The text of a decision and the amendments compress almost equally — to ≈ 0.61 and ≈ 0.57: the arguments and the history go, and the rules stay.
  - For the whole log, ≈ 490 thousand tokens, the consolidation will come to ≈ 295 thousand, ≈ 60%. The analysis of structure expected 40–55%.

**Trial** — 2026-11-11, 17:06–17:14 UTC.
- 15 questions, one per entry. The answer to each is in an amendment, not at the start of the entry; the reference answer is by `git grep`.
- Two branches: the clone as it is — "log" — and the clone with the consolidation and a line in CLAUDE.md and RULES.md: read the consolidation, and the log when the arguments and the history are needed.
- Two repetitions each, each a `claude -p` on Opus 5.5, reading only. The price of a run was named by the pilot, and the author confirmed it.
- The answers were graded by a subagent blind, without the branch labels, by the required facts of the reference answer.

| Branch | Runs | Right / incomplete / wrong | Cost of a run | Turns | Context of the calls, thousand | Context growth per run, tokens | Characters of decisions read |
|---|---|---|---|---|---|---|---|
| log | 30 | 27 / 3 / 0 | $0.251 | 6.0 | 266 | 8,224 | 13,024 |
| consolidation | 30 | 27 / 2 / 1 | $0.209 | 3.9 | 173 | 6,265 | 10,754 |

- **The wrong answer** is an error of retelling: the session inverted the condition of `release-refusal`, though the consolidation says the same as the log. The two incomplete grades of the consolidation came from the rubric: it asked to name the former 60 minutes of the npm publication's job too, while the consolidation holds the 85 in force by the decision on code taking `spec`'s releases.
- **What the consolidation saves.**
  - First of all turns, −35%: the sessions do not have to look for the amendments through the entry.
  - Of the text of decisions read, only −17%: the session reads an entry of the consolidation whole, and the log in parts, by `grep`.
  - Context growth per run — −24%. This is what a long session carries to its end (section 1.5).
- **The log** was opened by 7 runs of 30 in the branch "consolidation" — for the history and the arguments.
- **The start of a session** — 42,226 tokens for "log" and 42,457 for "consolidation": the lines about the consolidation in CLAUDE.md and RULES.md added ≈ 0.2 thousand.
- **The pilot** — one run on the entries on the format's version and on the contracts in each branch — cost $0.45–0.61 per run: the cache was cold. In the trial the start of the session was already in the cache, and the 60 runs cost $13.81, not ≈ $32 as by the pilot.

**Saving on the whole.** The logs carry 2.6% of what the 13 repositories "carried", `spec`'s log from the submodules another 0.25%. By the trial, the consolidation saves 17–24% of this, by size no more than 40%. So ≈ 0.5–0.7% of the total and no more than 1.1%. The analysis of structure estimated 1.3–1.7%.

**Price.** The trial's runs, the pilot and the token count — $18.2 at the prices of section 1.2, the consolidation of the slice by subagents — ≈ $5. A consolidation of the whole log will cost ≈ $17, and each of its entries will have to be looked through in review. After that, every amendment pulls an edit of the consolidation's entry after it.

**"Lossless".** The prototype of the check is `tools/docs-check/current.mjs` in the clone's `docs-check`; `just docs-check` in the clone is green.
- **What is checked without a model:**
  - an entry of the consolidation is in the log and stands in its order; a full consolidation has every entry of the log;
  - the fingerprint is the first 8 characters of the sha256 of the log's entry, with the number of amendments and the date of the last one. Trial: a new amendment of the entry on the format's version in a copy of the log gave an error with the former and the new fingerprint, and the error holds until the consolidation's entry is rewritten;
  - the consolidation cites nothing that its log entry does not cite: the numbers R, О-, П-, Т-, «Д» and «В», the decisions of other repositories, the sections of documents. Trial: an extra link is an error;
  - an entry that rejects something has a line "*Rejected:*". Trial: without it, an error;
  - the consolidation's links, like those of any document, are resolved by the ordinary check of `docs-check`.
- **Links of other repositories.** The log stays, the numbers R are the same, the sections of the documents do not change. So another repository's citation of a decision of `spec` is resolved by `docs-check-repo`, as now. An entry of the consolidation is found by `grep -n '^### R44\.'`.
- **What only review checks:**
  - the meaning — that the consolidation says the same as the entry and its amendments. The check only lists which of the log's links the consolidation left out. In the slice there are 197 of them, and almost all are history: closed questions Т-, rows «В», done tasks;
  - what was rejected. The subagents left out 6 options about how tasks were planned and how to read the log itself. That is intended, but it is a judgement;
  - **changes from outside.** In 6 entries of 15 the text in force is set by another decision, and the entry itself has no amendment:
    - the decision on code taking `spec`'s releases raised `timeout-minutes` of the npm publication's job to 85;
    - the entry on UI packages as web components keeps the marks `marks` temporary until the contract of epic E3, while the decisions on the types of `<novatrail-canvas>` and on the contract `app` ↔ `api` have already merged them with `Mark` of the contract `novatrail.api.v1`; the decision on accessibility closed О-24 from the entry on UI packages;
    - the decision on essays closed П-20 from the entry on a task's file;
    - the entry on `spec`'s release caches the image of the `toolchain` stage which the entries on the CI checks and on licenses then held "is built on every run";
    - the decision on the export format added `spec.Export` to the embedding of the one on code taking `spec`'s releases.

    The fingerprint does not see this: the log's entry did not change. The consolidation names such decisions in a line "*Also:*"; the check accepts their links but prints them for review. Each such line is an amendment that the log lacks.

**Recommendation for E10's decision:** do not take the consolidation of the decisions in force as a means of saving.
- It is as right as the log — 27 of 30 in both branches — and 40% shorter.
- But it saves ≈ 0.5–0.7% of the total. That is less than the analysis of structure estimated and many times less than "one task is one session" (section 1.5).
- And keeping it means editing the consolidation with every amendment and checking the meaning in review: the check will not replace that.
- If the author takes the consolidation for clarity, then only in `spec`, with the prototype's check in `docs-check` and with the rule: a decision that changes another puts an amendment on it — then there are no "*Also:*" lines.
- Rejected: the consolidation instead of the log — the history and the arguments are needed, and a decision is never rewritten.

### 1.7. One task is one session: the hook and the settings

How the rule "one task is one session" keeps a session short and what this gave the start of a session. The documentation of Claude Code was read 2026-11-11; the version of Claude Code in the container is 2.1.280.

**The hook** is `UserPromptSubmit`, its code is [tools/session/](../tools/session/main.mjs), its tests are `just session-test`, on synthetic transcripts. `spec`'s `.claude/settings.json` calls it as `${CLAUDE_PROJECT_DIR}/tools/session/main.mjs`, and the template's from the submodule, `spec/tools/session/main.mjs`. It takes no packages from `node_modules`: another repository's `spec/` has none.
- **What it sees.** Claude Code gives the hook the prompt and the path of the transcript on stdin: «UserPromptSubmit hooks receive the `prompt` field containing the submitted text», and among the common fields `transcript_path`, «The transcript file is written asynchronously and may lag the in-memory conversation» ([Hooks](https://code.claude.com/docs/en/hooks.md)). So the hook relies neither on the prompt being in the transcript already nor on its not being there.
- **The start of a task** is a phrase that names it, anywhere in the prompt — «далее планируем T…» happens too: RUN.md's «Выполни задачу T…» and «планируй T…» in the forms the author writes — «выполни T…», «Планируем задачу T…», «планируй реализацию T…» — and «делай T…», «сделай T…», «делаем задачу T…», «выполняй T…», «реализуй задачу T…», «спланируй задачу T…», «начинай T…», «приступай к реализации T…» and «продолжай T…». The verb is a whole word, and the number comes right after it or after one word — «задачу», «задачи» or «реализацию» —, so `делай как в T24` only names a task. «продолжай» with the session's own task passes, as any phrase of it does, and with another's it is stopped. A number that goes on, `T6.1`, is no task's; a question mark right after the number, `делаем T42?`, and «не» before the phrase cancel it. `T07` and `T7` are one task. The phrase does not count in code, in guillemets «…», in an editor selection, in pasted text, in reminders, in the output of local commands and in the report of a background task — Claude Code gives that to the hook too and writes it as a record whose `origin` is not `human`: there the phrase is quoted, not said. That is how RUN.md and COORDINATION.md quote `Выполни задачу T01 из RUN.md`.
- **What it stops** is a prompt that starts a task when the session has already led another. The same task passes; prompts that start no task always pass, and for them the hook does not read the transcript. «Разбери входящие» names no task and passes too: the rule counts the triage as part of the session of the task it serves, before its planning or after, and the next task will be stopped by its own phrase.
- **How it stops** — the JSON `{"decision": "block", "reason": …}`: «`"block"` stops the prompt before it reaches Claude», and `reason` is «Shown to the user when `decision` is `"block"`. Not added to context» ([Hooks](https://code.claude.com/docs/en/hooks.md)). The reason names both tasks, the rule of RULES.md, How we work, and `/clear`. Claude Code writes the stopped prompt to the transcript as a `system` record, not as the author's prompt — so in the trial with `claude -p --resume` on 2026-11-11 — and it does not get in the way of the hook at the next prompt.
- **A new session.** `/clear` ends the session and starts a new one: `SessionEnd` has the reason `clear` — «Session cleared with `/clear` command» ([Hooks](https://code.claude.com/docs/en/hooks.md)), and the new one has a transcript of its own. Compaction does not end a session: the earlier prompts stay in the same transcript, and the hook sees them, while it does not read the compaction summary (`isCompactSummary`).
- **It fails open.** An input or a transcript that the hook could not read it does not stop: exit 0 with no output. For the first prompt of a session there is no transcript yet. If the hook's file itself is missing — the `spec` submodule was not fetched or stands at a tag without `tools/session/` — Claude Code cannot run it and shows a hook error on every prompt, but lets the prompt through: «a hook that can't start is a non-blocking error too» ([Hooks](https://code.claude.com/docs/en/hooks.md)).
- **Time.** The hook checks a prompt with a task's phrase against `spec`'s longest transcript, 79 MB, in 0.6 s, and one without the phrase in 0.1 s, without reading the transcript; «`UserPromptSubmit` hooks have a default timeout of 30 seconds» ([Hooks](https://code.claude.com/docs/en/hooks.md)). It parses only the lines of `user` records without tool results.
- **What it does not see.** A branch that the author rolled back (`/rewind`) — it stays in the transcript, and a task named in it counts: then only `/clear` helps. Nor does it tell another repository's task number from its own: in `spec` a phrase about a task of `api` without guillemets is a task too.
- **On past sessions.** Of the 447 transcripts of the main sessions of this machine, of all repositories, the hook would have stopped a prompt in 60. On 2026-11-15, of 522, it would have in 79 by the present phrases, and in 60 by the first ones.
- **The forms, by the transcripts.** The author's 3,717 prompts in those 522, on 2026-11-15, by their text before the first task number: «планируй» 248, «планируй задачу» 197, «делай» 157, «выполни задачу» 94, «планируем задачу» 66, «делай задачу» 17, «планируем» 12, «планируй реализацию» 9, «начинай» 4, «реализуй задачу» 3; «выполняй», «спланируй задачу», «делаем задачу» and «приступай к реализации» 2 each. The forms added to the first ones take 230 more prompts that start a task, in 100 sessions where the earlier ones saw none, and read one by one, none of them only names a task; no prompt the earlier phrases took ends in «?» after the number. They still start nothing: forms the author does not write — «сделаем», «начинаем», «спланируем» —, a word between the verb and the number — «делай последовательно задачи T…», «начинай планирование задачи T…», «приступай к T…» —, a typo — «деалй T…» — and a question — «можем делать T…?».

**The settings** — in `spec`'s `.claude/settings.json` and in the [template's](../repo-template/files/.claude/settings.json):
- `"autoCompactWindow": 400000` — «Set how full the context window gets before Claude Code compacts automatically… number of tokens, from `100000` to `1000000`» ([Settings reference](https://code.claude.com/docs/en/settings-reference.md)). A compaction window that the author set overrides it only for the same model in the same file: «A window you saved for a model with `/autocompact` takes precedence over this key in the same file for that model», and the variable `CLAUDE_CODE_AUTO_COMPACT_WINDOW` overrides the key ([Model configuration](https://code.claude.com/docs/en/model-config.md)).
- `"disableClaudeAiConnectors": true` — «A `true` in any settings file applies: a checked-in project `.claude/settings.json` can opt a repository out of those connectors» ([Settings reference](https://code.claude.com/docs/en/settings-reference.md)). Only those that Claude Code fetches itself — in the terminal, VS Code, JetBrains and the Agent SDK; a cloud session's connectors are delivered by its host, and the key does not turn them off: «Claude Code applies `disableClaudeAiConnectors` only to the connectors it fetches itself, not to the connectors a cloud host or the desktop app delivers» ([MCP](https://code.claude.com/docs/en/mcp.md)).
- The skills of the claude.ai account — `anthropic-skills:…` — cannot be turned off by a project key: the scope of `syncClaudeAiSkills` is «User, local, or managed… A repository can't turn it off for you» ([Settings reference](https://code.claude.com/docs/en/settings-reference.md)). By В31, `"syncClaudeAiSkills": false` stands in the container's `~/.claude/settings.json`, on the volume `novatrail-claude` — for all sessions of the container, but not for cloud ones. Claude Code moved the downloaded skills to `~/.claude/skills/.trash/`; on claude.ai they remained.

**Measurement of the start of a session** — `claude -p "Ответь одним словом: готово."` in a clone of `spec` at 9d979f0, ×3 before the change and ×3 after, Opus 5.5; the context of the first call by `just tokens-report --project`:
- **before:** 31,341, 34,077 and 31,341 tokens, median 31.3 thousand. In two sessions of three the claude.ai connectors were still connecting at the first call and did not enter the context; in the third they did — the MCP instructions, 1,380 characters on average per session, and the names of their deferred tools. The difference is 2,736 tokens;
- **after:** 31,308 tokens all three times, median 31.3 thousand; no connectors;
- **result:** the connectors cost ≈ 2.7 thousand tokens on every call once they had connected — ≈ 1% of the average context of a call, 218–294 thousand (section 1.5). The estimate of section 1.5, ≈ 10 thousand, also held the list of skills; of its 15,971 characters the account's skills are 9,546, ≈ 60%, and the connectors key does not turn them off;
- **the account's skills turned off** — the same run, ×1: the list of skills is 6,446 characters, there are no `anthropic-skills:…` skills in it, the context of the first call is 28,155 tokens, 3,153 less. Together with the connectors — ≈ 5.9 thousand tokens on every call, ≈ 2–3% of the average context of a call;
- what one session per task and compaction at 400 thousand give, the start of a session does not show: that is seen by the context of a call and the number of compactions over an epic, by the measurement after E10's changes (section 1.9).

### 1.8. A thin CLAUDE.md: the rules of the parts

How the checks of the parts left `spec`'s CLAUDE.md for rules of their own. The documentation of Claude Code was read 2026-11-11; the version of Claude Code in the container is 2.1.280.

**The rules.** The Environment paragraph of [CLAUDE.md](../CLAUDE.md) — 19.2 of 25.3 KB — was laid out by parts into 12 rules [.claude/rules/](../.claude/rules/format.md): `format`, `admission`, `deployment`, `legal`, `consent-age`, `export`, `contracts`, `go`, `types`, `ci` — CI, the release, the `toolchain` stage and `release-verify` —, `tools` and `new-repo`. The cut of the trial of section 1.5 — 11 rules — did not stay in the files; this one was made anew from the same sentences. The text of the rules is the sentences of the paragraph, and where the paragraph wrote "the same way" about a neighbouring part, the rule says it in its own words: each is read without the others. CLAUDE.md kept what every task needs: the container, `docs-check`, `inbox`, the settings and the hook, "CI runs every check, the tag comes out by itself", the sign-off of commits — and a line saying where each part's rule lies. CLAUDE.md became 9.1 KB.
- **When a rule loads:** «A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file. It also loads when Claude views a matching file with a Bash command that counts as a read, such as `cat` or `head` on a single file» ([Memory](https://code.claude.com/docs/en/memory.md)). An edit by a script does not load it, and compaction removes it until the session reads a file of the part again: «rules with `paths:` frontmatter load again on demand» ([Memory](https://code.claude.com/docs/en/memory.md)). So CLAUDE.md tells the session to read a part's rule before changing the part, and [AGENTS.md](../AGENTS.md) tells the same to an agent that does not load rules.
- **Broken front matter is not visible:** «If the YAML between the markers doesn't parse, Claude Code ignores the frontmatter and loads the rule as if it had no `paths`» ([Memory](https://code.claude.com/docs/en/memory.md)) — the rule silently loads into every session. So `docs-check` checks it.

**`docs-check`** — [tools/docs-check/rules.mjs](../tools/docs-check/rules.mjs) — reads a rule as a document — links, sections, numbers — without the front matter, by the lines of the file, and also checks: the front matter is there and is YAML; `paths` is a list of patterns or a comma-separated string, as Claude Code reads them; each pattern matches a file of the repository — of those git lists, any, not only `.md`, and in another repository also a file of its `spec/`; CLAUDE.md or `.claude/CLAUDE.md` links to the rule. A pattern is read as the documentation describes it: «`*.md` — `.md` files anywhere under the base directory», «`/*.md` — `.md` files directly in the base directory» ([Memory](https://code.claude.com/docs/en/memory.md)); a name with a leading dot — `.github/`, `.npmrc` — is taken by `*` and `**` like any other: in a trial, Claude Code wrote a rule with `paths` `legal/**` into the transcript as `"globs":["legal","tools/legal"]` — that is how the patterns of `.gitignore` are written, where a leading dot of a name is in no way special. This is a conclusion from the trial, not the documentation's words. Tests — `just docs-check-test`. In another repository `docs-check-repo` will check the same once it moves to a tag with this check.

**Other repositories' rules.** Claude Code also loads the rules from a subfolder's `.claude/rules/` on demand: «Rules files in a subdirectory's `.claude/rules/`» load on demand, and `claudeMdExcludes` keeps them out — «excludes a top-level CLAUDE.md and a rules directory» ([Memory](https://code.claude.com/docs/en/memory.md)). So the template's `.claude/settings.json` keeps out `"**/{{name}}/spec/.claude/rules/**"`, and `spec`'s `"**/.repos/**/.claude/rules/**"`. A trial on 2026-11-11 in a folder `probe` with a copy of the working tree in `spec/` and the template's settings: reading `spec/legal/VERSION` without this line loaded `spec/.claude/rules/legal.md`, and with it nothing. The repositories set up earlier lack the line — Д215 of RUN.md.

**The template.** The Environment of the [template's CLAUDE.md](../repo-template/files/CLAUDE.md): in a repository with parts, the checks of a part are its rule, and the section names each in one line. The template has no rules of its own: each repository has parts of its own.

**Measurement of the start of a session** — `claude -p "Ответь одним словом: готово."` in a clone of `spec` at 0c36f45, ×3 before the change and ×3 with the change, Opus 5.5; the context of the first call by `just tokens-report --project`:
- **before:** 40,396, 40,392 and 40,397 tokens, median 40.4 thousand; CLAUDE.md — 25,105 characters;
- **after:** 35,136, 35,133 and 35,135 tokens, median 35.1 thousand; CLAUDE.md — 8,983 characters;
- **result:** −5,261 tokens on every call, ≈ 13% of the start of a session and ≈ 2% of the average context of a call, 218–294 thousand (section 1.5) — as in the trial of section 1.5, −5,090;
- **the rule loads:** in the clone with the change, the question "read `legal/VERSION` and name the recipes that an edit of `legal/` waits for" — the Read of the file loaded `legal.md`, and the answer — `legal-check`, `types` and `types-check` — was taken from it;
- the start of a session before the change is 40.4 thousand, while in section 1.7, with the same question and the same version of Claude Code, it is 28.2 thousand. The characters of what the report sees in the transcript are almost as many — ≈ 56 thousand: the list of skills became half as long, 7,397 characters against 14,646, but the list of agents and the session's context were added. So what grew is what the transcript does not hold — the descriptions of the tools; from where is not found out. So before and after are measured on one day, as here;
- the nine runs — six of the measurement, the trial of the rule and two trials of other repositories' rules — cost $0.68 at API prices.

### 1.9. Keeping the savings

How what epic E10 saved is kept from growing back: budgets of size in `docs-check` on every pull request, a measurement at each epic's archive and once a month, and a new analysis by a threshold rather than by the calendar. Measured 2026-11-12.

**Budgets.** `docs-check` measures in bytes, in KB of 1,024: English text is at least 2.5 bytes a token and Russian tables 2.7 (section 1.6), and a limit in bytes needs neither a key of the API nor a network, and does not move when a tokenizer does. The limits are [tools/docs-check/budgets.json](../tools/docs-check/budgets.json): its block `spec` for spec, and its block `repository` for another NovaTrail repository, which is checked only once its root holds `docs-budgets.json` — what differs from that block, `{}` when nothing does. The key `entries` gives one entry of a log a limit of its own by its number, `{"R18": 56}`, as `sections` gives one to a section, and a number not in the log is an error. What is measured, the largest of each in `spec` on 2026-11-12, KB:

| What | The largest |
|---|---|
| CLAUDE.md / RULES.md | 10.2 / 12.8 |
| RUN.md / `DEBT.md` / COORDINATION.md | 70.3 / 116.5 / 60.0 |
| a rule of `.claude/rules/` | 5.4, `ci` |
| an entry of the decision log, with its amendments | 35.7, the entry on the contracts; the median is 6.5 |
| the own text under a heading of a document, numbered or not, to the next heading | 22.8, measurements 1.6; outside the registers and the glossary |
| the glossary / the open questions of privacy / those of repositories — the glossary and two registers | 74.9 / 60.8 / 59.2 |
| a row of a table of RUN.md / `DEBT.md` / COORDINATION.md | 2.1 / 3.2 / 2.7 |

- Each limit is the largest of its kind plus 10–20%, rounded; RUN.md has more, 96 KB, since a new epic brings the bodies of its tasks.
- `format/` and `legal/` have none: they are texts for people. Nor do the archives of `docs/plan/`: they are not read whole.
- On `spec` the check measures 579 things on 2026-11-12. A trial: CLAUDE.md with 2,500 bytes added gave «CLAUDE.md:1: 12,929 bytes, over its budget of 12 KB (12,288 bytes) — tools/docs-check/budgets.json».

**The measurement.** `just tokens-report --since … --until … --row` prints one row of the table below, its last column, a session's first 80 main calls, since 2026-11-18, and "—" in the rows before; a table of seven columns that has not taken it drops the cell and keeps the others in place; `--project` measures another repository's transcripts on this machine. It runs:
- at the archive of an epic, for the epic's window, in the repository whose epic it is;
- once a month, from `spec`, for each of the 13 repositories' folders of transcripts on this machine, from the window of the last row to the start of the session. `just inbox` prints the date when it has come, and it runs on the author's word or once every task of the current epic is done, so a monthly row may come later than its date.

| Project | Window, UTC | Sessions | Calls, main / subagents | Context of a call, k, main / subagents | Compactions | Cost at API prices | Context of a main call among its session's first 80, k |
|---|---|---|---|---|---|---|---|
| `-workspaces-spec` — the baseline, section 1.3 | 2026-11-09T00:00 … 2026-11-11T03:59 | 3 | 2,344 / 3,682 | 448.5 / 109.2 | 9 | $470.99 | — |
| `-workspaces-spec` — part 2 of E10: the reference until the rows after it | 2026-11-11T17:55 … 2026-11-12T14:27 | 9 | 1,238 / 1,676 | 183.2 / 90.4 | 1 | $156.88 | — |
| `-workspaces--github` | 2026-10-13T00:00 … 2026-11-12T14:27 | 14 | 4,196 / 2,565 | 397.5 / 124.0 | 10 | $739.31 | — |
| `-workspaces-api` | 2026-10-13T00:00 … 2026-11-12T14:27 | 23 | 6,109 / 4,741 | 371.4 / 104.4 | 17 | $954.57 | — |
| `-workspaces-app` | 2026-10-13T00:00 … 2026-11-12T14:27 | 18 | 3,375 / 5,492 | 337.8 / 143.5 | 14 | $673.90 | — |
| `-workspaces-canvas` | 2026-10-13T00:00 … 2026-11-12T14:27 | 37 | 12,565 / 7,897 | 369.1 / 114.8 | 99 | $2,040.66 | — |
| `-workspaces-engine` | 2026-10-13T00:00 … 2026-11-12T14:27 | 16 | 3,016 / 1,232 | 328.6 / 79.3 | 3 | $400.70 | — |
| `-workspaces-infra` | 2026-10-13T00:00 … 2026-11-12T14:27 | 6 | 2,175 / 1,714 | 354.7 / 80.0 | 6 | $321.70 | — |
| `-workspaces-learner-model` | 2026-10-13T00:00 … 2026-11-12T14:27 | 20 | 3,458 / 2,293 | 292.4 / 101.2 | 2 | $493.54 | — |
| `-workspaces-module-kit` | 2026-10-13T00:00 … 2026-11-12T14:27 | 29 | 4,374 / 1,969 | 326.5 / 98.4 | 0 | $573.80 | — |
| `-workspaces-modules` | 2026-10-13T00:00 … 2026-11-12T14:27 | 16 | 3,976 / 2,287 | 351.0 / 91.7 | 6 | $586.03 | — |
| `-workspaces-sim` | 2026-10-13T00:00 … 2026-11-12T14:27 | 10 | 3,275 / 1,195 | 325.5 / 79.5 | 6 | $397.59 | — |
| `-workspaces-skill-map` | 2026-10-13T00:00 … 2026-11-12T14:27 | 6 | 1,313 / 402 | 329.5 / 81.4 | 1 | $162.58 | — |
| `-workspaces-tutor` | 2026-10-13T00:00 … 2026-11-12T14:27 | 28 | 11,509 / 6,806 | 398.5 / 119.5 | 53 | $1,896.62 | — |
| `-workspaces-spec` — after the release of E10's edits: the reference | 2026-11-12T16:13 … 2026-11-13T21:07 | 9 | 1,062 / 485 | 189.7 / 102.1 | 2 | $92.76 | — |
| `-workspaces--github` — after row 7.2 | 2026-11-13T05:00 … 2026-11-13T21:07 | 1 | 136 / 25 | 191.4 / 74.7 | 0 | $9.73 | — |
| `-workspaces-api` — after row 7.3: the reference | 2026-11-13T13:43 … 2026-11-13T21:07 | 10 | 860 / 163 | 162.6 / 72.3 | 1 | $59.34 | — |
| `-workspaces-app` — after row 7.4 | 2026-11-13T04:29 … 2026-11-13T21:07 | 4 | 188 / 12 | 141.7 / 61.8 | 0 | $11.50 | — |
| `-workspaces-canvas` — after row 7.5 | 2026-11-12T22:47 … 2026-11-13T21:07 | 1 | 54 / 0 | 95.8 / — | 0 | $2.49 | — |
| `-workspaces-engine` — after row 7.6 | 2026-11-12T22:50 … 2026-11-13T21:07 | 3 | 92 / 0 | 99.9 / — | 0 | $7.53 | — |
| `-workspaces-infra` — after row 7.7: the reference | 2026-11-13T03:43 … 2026-11-13T21:07 | 9 | 748 / 200 | 178.4 / 65.6 | 0 | $65.36 | — |
| `-workspaces-learner-model` — before row 7.8, without E10's files | 2026-11-12T14:27 … 2026-11-13T21:03 | 9 | 612 / 83 | 176.1 / 70.3 | 0 | $44.22 | — |
| `-workspaces-module-kit` — after row 7.1 | 2026-11-13T04:35 … 2026-11-13T21:07 | 5 | 47 / 0 | 107.0 / — | 0 | $2.52 | — |
| `-workspaces-modules` — after row 7.9 | 2026-11-13T04:37 … 2026-11-13T21:07 | 1 | 8 / 0 | 46.6 / — | 0 | $0.35 | — |
| `-workspaces-sim` — after row 7.10 | 2026-11-13T05:35 … 2026-11-13T21:07 | 3 | 215 / 60 | 150.7 / 76.3 | 0 | $18.25 | — |
| `-workspaces-skill-map` — after row 7.11 | 2026-11-13T03:45 … 2026-11-13T21:07 | 1 | 35 / 0 | 101.4 / — | 0 | $2.12 | — |
| `-workspaces-tutor` — after row 7.12: the reference | 2026-11-13T15:36 … 2026-11-13T21:07 | 6 | 519 / 90 | 153.2 / 67.4 | 0 | $35.03 | — |
| `-workspaces-spec` — epic E10, at its archive | 2026-11-11T00:00 … 2026-11-13T21:57 | 26 | 3,385 / 2,804 | 210.9 / 90.0 | 4 | $371.88 | — |
| `-workspaces-spec` — epic E12, at its archive | 2026-11-14T00:00 … 2026-11-15T01:14 | 12 | 1,124 / 589 | 201.4 / 110.4 | 4 | $128.88 | — |
| `-workspaces-spec` — epic E14, at its archive | 2026-11-15T00:00 … 2026-11-16T18:54 | 19 | 2,404 / 4,177 | 187.8 / 124.7 | 2 | $348.33 | — |
| `-workspaces-spec` — epic E15, at its archive | 2026-11-17T00:00 … 2026-11-17T23:32 | 21 | 2,240 / 576 | 161.3 / 67.7 | 3 | $153.80 | — |
| `-workspaces-spec` — epic E16, at its archive | 2026-11-18T07:06 … 2026-11-18T17:14 | 20 | 1,366 / 868 | 141.6 / 71.4 | 1 | $120.27 | 107.3 |
| `-workspaces-spec` — epic E11, at its archive | 2026-11-18T18:24 … 2026-11-20T04:58 | 20 | 4,438 / 2,036 | 209.4 / 95.7 | 19 | $424.06 | 168.2 |
| `-workspaces-spec` — epic E18, at its archive | 2026-11-20T16:34 … 2026-11-21T20:27 | 10 | 1,882 / 773 | 194.8 / 86.4 | 6 | $171.67 | 162.4 |
| `-workspaces-spec` — epic E19, at its archive | 2026-11-21T21:02 … 2026-11-22T16:20 | 8 | 2,391 / 1,903 | 195.6 / 145.0 | 9 | $254.31 | 133.5 |
| `-workspaces-spec` — epic E20, at its archive | 2026-11-22T16:45 … 2026-11-23T00:41 | 13 | 1,006 / 216 | 151.2 / 132.6 | 2 | $67.56 | 109.7 |
| `-workspaces-spec` — epic E22, at its archive | 2026-11-23T01:26 … 2026-11-23T21:52 | 29 | 2,122 / 3,166 | 138.8 / 58.0 | 1 | $273.46 | 108.6 |
| `-workspaces-spec` — epic E23, at its archive | 2026-11-23T23:36 … 2026-11-24T06:48 | 11 | 1,277 / 1,064 | 197.0 / 163.0 | 7 | $147.33 | 127.8 |
| `-workspaces-spec` — epic E24, at its archive | 2026-11-25T00:00 … 2026-11-26T05:31 | 4 | 3,446 / 442 | 219.2 / 100.9 | 16 | $263.16 | 142.1 |
| `-workspaces-spec` — epic E25, at its archive | 2026-11-26T05:31 … 2026-11-26T18:24 | 4 | 1,016 / 40 | 198.2 / 98.9 | 3 | $66.56 | 117.3 |

- In `spec`, part 2 of E10 lowered the context of a main call from 448.5 to 183.2 thousand, −59%, and of a subagent's from 109.2 to 90.4. The windows differ in work: E4 and E9 against the edits of E10.
- The other 12 took E10's savings by the tasks of row 7 of [COORDINATION.md](../COORDINATION.md), all but `learner-model` by 2026-11-13. Their first rows are their "before", from 292.4 to 398.5 thousand for a main call.
- The rows after E10 are the sessions after the release of E10's edits in `spec`, and in another repository the sessions that started after its task's last session, to the start of the session that measured them. A row after E10 is the reference when it holds at least 300 main calls, as the threshold of a new analysis counts them: in `spec`, `api`, `infra` and `tutor`. `spec`'s holds the session of six tasks, an exception by the author's word; its eight sessions of one task are 169.5 thousand.
- The other eight have fewer: their reference is their first later row with at least 300 main calls, at the archive of an epic or a monthly measurement. A window with the task's own sessions is not a reference: the translation raises it — `canvas` 216.2 thousand with its task against 95.8 after it.
- `learner-model` has no reference yet: on 2026-11-13 its two tasks of row 7.8 are not done. Its row after E10 ends before the first of them and stays a measurement without E10's files; its reference is its first row of at least 300 main calls after the second. What each change gave is section 1.10.
- The row of epic E10 is its window from its first day to the start of the session that archived it, so that the triage at the archive is not in it. Its 210.9 thousand for a main call hold both the analysis of part 1 and the translation of part 2, and are 11% above `spec`'s reference, 189.7: under the threshold's 25%. The budgets file has had only its first commit, and the last check of the changelog is not a quarter old. No threshold is met, so no analysis is set.
- The row of epic E12 is its window from its first day, 2026-11-14, to the start of the session that archived it, 2026-11-15T01:14. Its 201.4 thousand for a main call are 6% above `spec`'s reference, 189.7: under the threshold's 25%. The budgets file has had one raise since the last analysis, `DEBT.md` from 128 to 132 KB, of the three the threshold counts, and the last check of the changelog is not a quarter old. No threshold is met, so no analysis is set.
- The row of epic E14 is its window from its first day, 2026-11-15, to the start of the session that archived it, 2026-11-16T18:54. Its first day holds the sessions of that day before the epic was planned too — the archive of E12, the move of RUN.md's tables into `run/` and the rewrite of the plan's files for the session —, and its first 74 minutes are also the end of E12's row, and the window holds a task on the speed of CI, run by the orchestrator in `spec`, and the orchestrator's own session of its pilot: from 2026-11-16T00:47 to 18:52, 897 main calls at 198.9 thousand a call, the largest 367.1, both compactions of the row, $51.36 against $600.08 of the 106 runs it led (section 1.13; Д258). The executors' sessions in the other repositories are not in it. Its 187.8 thousand for a main call are 1% below `spec`'s reference, 189.7. The budgets file has had two raises since the last analysis, `DEBT.md` and COORDINATION.md from 24 to 25 KB, of the three the threshold counts. A new file's first limit raises none: the files of `run/` got theirs in the move and the rewrite — `run/TASKS.md` its 48 KB in the rewrite —, and the rewrite lowered the others. The last check of the changelog is not a quarter old. No threshold is met, so no analysis is set.
- The row of epic E15 is its window from its first day, 2026-11-17, to the start of the session that archived it, 2026-11-17T23:32. The whole day ran in the orchestrator's run of COORDINATION.md, and the window holds its sessions in `spec`: 16 of its executors, the four tasks of E15 among them, and 3 of the orchestrator's own, 1,097 main calls for $74.36 (Д258); the other 2 are short sessions of the author outside it, 34 main calls for $1.98. The executors' sessions in the other repositories are not in it. Its 161.3 thousand for a main call are 15% below `spec`'s reference, 189.7. The budgets file has had a third raise since the last analysis, `dpia 1`, after `DEBT.md` and COORDINATION.md: the threshold is met, and its analysis is a task of its own, taken into epic E16. The last check of the changelog is not a quarter old.
- The analysis of that threshold is section 1.14, 2026-11-18. Of the four raises since E10, `DEBT.md` grew by rows of debt, which the rewrite of the plan's files then cut to 48 KB; COORDINATION.md, from 24 to 25 KB, by the rules of the orchestrator's run; RULES.md, from 14 to 15 KB, by a rule of how a session waits on a long run; and `dpia 1` by its review log, up to 1.2 KB a version retelling the decisions it cited. The rule that a text holds the current state, not its history, holds each of them: a row of debt and «Сделано» are one line, a decision is rewritten in its place, and the log's row of a version is one sentence with its pull request, which took `dpia 1` from 25.3 KB to 6.2 and under the default limit of a section, 24 KB, without a limit of its own. The context of a main call in `spec` on 2026-11-18 to 11:12, 168.3 thousand over 1,162 calls, is 11% below the reference, 189.7. What the analysis found beyond the log is in E16's tasks, so it puts no question to the author.
- The row of epic E16 is its window from the merge of E15's last task, 2026-11-18T07:06:43Z — E15's last two tasks and their sessions are in the window of section 1.14 —, to the start of the session that archived it, 2026-11-18T17:14. Its 141.6 thousand for a main call are 25% below `spec`'s reference, 189.7, and its 107.3 among the first 80 are 24% below 141.8. The budgets file has had no raise since the last analysis: E16 only lowered its limits. The last check of the changelog is not a quarter old. No threshold is met, so no analysis is set. What the rule gave is section 1.16.
- The row of epic E11 is its window from the merge of E16's archive, 2026-11-18T18:24:49Z, to the start of the session that archived it, 2026-11-20T04:58. Its tasks across repositories ran in the orchestrator's container, whose folder of transcripts is `spec`'s, so the window holds the code of five other repositories too. Its 209.4 thousand for a main call are 10% above `spec`'s reference, 189.7, and its 168.2 among the first 80 are 19% above 141.8: under the 25% of the first condition. The budgets file was raised three times since the last analysis — the entry on the task from the learner's paper in three tasks, the entry on the button of the solution too in the last of them —, so the second condition is met, and its analysis is a task outside an epic in `run/TASKS.md`. The last check of the changelog is not a quarter old.
- The row of epic E18 is its window from the merge of `spec` #209, 2026-11-20T16:34:48Z — the epic's base —, to the start of the session that archived it, 2026-11-21T20:27. Its first 12 calls end E11's session of its review and release, $0.64. Its task across repositories ran in the orchestrator's container, whose folder of transcripts is `spec`'s; the executors of the wave that moved the 12 repositories to a tag of `spec` and of a task of `infra` are in their repositories' folders. Its 194.8 thousand for a main call are 3% above `spec`'s reference, 189.7, and its 162.4 among the first 80 are 15% above 141.8: under the 25% of the first condition. The budgets file took one more raise, the first limit of 14 KB of the entry on the task across repositories, and dropped that of the entry on licenses; the second condition was met at E11 already, and its analysis is already a task in `run/TASKS.md`, so no new one is set. The last check of the changelog is not a quarter old. What the task across repositories gave against E11 is section 1.17.
- The row of epic E19 is its window from the merge of `spec` #213, 2026-11-21T21:02:46Z — the epic's base —, to the start of the session that archived it, 2026-11-22T16:20. The whole epic was one task across repositories in the orchestrator's container, whose folder of transcripts is `spec`'s: from the clone of spec in `.epics` the recipe is run with `--project=-workspaces-spec`, since the clone's own folder holds none; an executor stopped in `app`'s folder, $4.20, is not in it. Its 195.6 thousand for a main call are 3% above `spec`'s reference, 189.7, and its 133.5 among the first 80 are 6% below 141.8: under the 25% of the first condition. The budgets file took no raise; the second condition was met at E11 already, and its analysis is already a task in `run/TASKS.md`, so no new one is set. The last check of the changelog is not a quarter old.
- The row of epic E20 is its window from the merge of `spec` #214, 2026-11-22T16:45:16Z — the epic's base —, to the start of the session that archived it, 2026-11-23T00:40. As E19, it was one task across repositories in the orchestrator's container, measured with `--project=-workspaces-spec`. Its 151.2 thousand for a main call are 20% below `spec`'s reference, 189.7, and its 109.7 among the first 80 are 23% below 141.8. The budgets file took no raise; the second condition was met at E11 already, and its analysis is already a task in `run/TASKS.md`, so no new one is set. The last check of the changelog is not a quarter old.
- The row of epic E22 is its window from the merge of `spec` #215, 2026-11-23T01:26:31Z — the epic's base —, to the start of the session that archived it, 2026-11-23T21:52. Its first session, 71 main calls for $4.64, ends the archive of E20, and one, 183 main calls for $13.07, is a task outside the epic on the bar of tools of the mockup; the executors of the other 12 repositories' tasks are in their repositories' folders. Its 138.8 thousand for a main call are 27% below `spec`'s reference, 189.7, and its 108.6 among the first 80 are 23% below 141.8. The budgets file took no raise, only lowerings of the limits of the log's entries, which folding their amendments shortened; the second condition was met at E11 already, and its analysis is already a task in `run/TASKS.md`, so no new one is set. The last check of the changelog is not a quarter old. What the rule of citations gave is section 1.18.5.
- The row of epic E23 is its window from `spec` `main` at 022d5cb, 2026-11-23T23:36:04Z — the epic's base —, to the archive, 2026-11-24T06:48, measured with `--project=-workspaces-spec`. The window also holds the sessions of the tasks outside the epic that ran beside it in `spec`, on the records of `sources` and the tails of the pen, and the planning and the task across repositories in the orchestrator's container, whose folder of transcripts is `spec`'s; the executors of the other repositories are in their own folders. Its 197.0 thousand for a main call are 4% above `spec`'s reference, 189.7, below the threshold's 25%, and its 127.8 among the first 80 are 10% below 141.8: the excess is the length of the task across repositories in one session, with seven compactions. The budgets file took four raises of one limit each — three entries of the decision log and `run/DEBT.md` —, so the second condition is met again; its analysis is already a task in `run/TASKS.md`, so no new one is set. The last check of the changelog is not a quarter old.
- The row of epic E24 is its window from its first day, 2026-11-25T00:00Z, to the archive, 2026-11-26T05:31, measured with `--project=-workspaces-spec`. The whole epic was one task across repositories in the orchestrator's container, in long sessions compacted in place: 4 sessions for 3,446 main calls. Its 219.2 thousand for a main call are 16% above `spec`'s reference, 189.7, under the threshold's 25%.
- The row of epic E25 is its window from E24's archive, 2026-11-26T05:31Z, to its own, 2026-11-26T18:24, measured with `--project=-workspaces-spec`: one task across repositories in the orchestrator's container, its sessions compacted in place. Its 198.2 thousand for a main call are 4% above `spec`'s reference, 189.7, under the threshold's 25%.
- The monthly row of `module-kit` needs the fix of 2026-11-12: a path the user may not look at is not a file for the recipe, and the report is printed (`tools/tokens/report.mjs`, `fileCheck`).

**The threshold** of a new analysis: the context of a main call more than 25% above the repository's reference, over at least 300 main calls; or three raises of a budget since the last analysis, by `git log` of the budgets file; or a quarter since the last check of Claude Code's changelog. The analysis then becomes a task outside an epic in `run/TASKS.md`. A raise is a commit of a file of budgets that raises one limit or more; a repository's first `docs-budgets.json`, a limit held only until a translation and a lowering are not raises. The threshold counts every main call; an analysis by its first condition begins with the context of a session's first 80: at the reference or below it, the excess is the length of tasks, which the rules of RUN.md split, not what the sessions read. In `spec`, the window of the reference holds 141.8 thousand for a call among the first 80, read 2026-11-18.

Last analysis: E16, section 1.14, 2026-11-18.

Next measurement: by 2026-12-12.

Next check of Claude Code's changelog: by 2027-02-12.

### 1.10. After E10: what each change gave

The measurement after E10, 2026-11-13: `spec` against its baseline of section 1.3, and the other 12 against their rows "before" of section 1.9. The recipe is section 1.1. Every window ends at the start of this measurement's session, 2026-11-13T21:07. What the other repositories measured themselves comes from the «Сделано» of their tasks on GitHub, on `main` on 2026-11-13. A cloud session is not on this machine, and none is counted.

**`spec`** — the sessions after the release of E10's changes to `spec`, from the merge of pull request 135, `v0.16.0`, at 2026-11-12T16:13:24Z: `just tokens-report --since 2026-11-12T16:13:24Z --until 2026-11-13T21:07`.

| | Baseline, section 1.3 | After the release |
|---|---|---|
| Sessions | 3 | 9 |
| Calls, main / subagents | 2,344 / 3,682 | 1,062 / 485 |
| Context of a call, k, main / subagents | 448.5 / 109.2 | 189.7 / 102.1 |
| The largest context, k | 966.0 | 364.5 |
| Compactions | 9 | 2 |
| Cost at API prices, in all / per main call | $470.99 / $0.20 | $92.76 / $0.087 |
| The first call, median, k | 49.3 | 40.5 |

- **The sessions:** the end of the release and seven more, among them the answer to В32 — one task each — and one session of six tasks. That one was an exception the author allowed, and both compactions are in it. The recipe prints one session under another task's number: it takes the first task number of the author's first prompt.
- **One task against six:** the eight sessions of one task — 576 main calls, 169.5 thousand on average; the session of six — 486 calls, 213.8 thousand, +26%.

**The other repositories.** Each did its row 7 of [COORDINATION.md](../COORDINATION.md) by tasks of its own, and `learner-model` had not done it on 2026-11-13. "During" is the main call's context in the task's own sessions, as the task's «Сделано» wrote it; those were mostly sessions of translation. "After" is the sessions that started after the task's last session, by `--since` from the start of the first of them.

| Repository | Row 7 | Before, k, main / subagents | During, k, main | After: sessions, main calls | After, k, main / subagents |
|---|---|---|---|---|---|
| `.github` | 7.2, its E18 | 397.5 / 124.0 | 188.8 | 1, 136 | 191.4 / 74.7 |
| `api` | 7.3 | 371.4 / 104.4 | 173.9 | 10, 860 | 162.6 / 72.3 |
| `app` | 7.4 | 337.8 / 143.5 | 183.4 | 4, 188 | 141.7 / 61.8 |
| `canvas` | 7.5, its E13 | 369.1 / 114.8 | 222.8 | 1, 54 | 95.8 / — |
| `engine` | 7.6 | 328.6 / 79.3 | 186.6 | 3, 92 | 99.9 / — |
| `infra` | 7.7 | 354.7 / 80.0 | 190.5, 148.7 | 9, 748 | 178.4 / 65.6 |
| `module-kit` | 7.1 | 326.5 / 98.4 | 199.7 | 5, 47 | 107.0 / — |
| `modules` | 7.9 | 351.0 / 91.7 | 157.2 | 1, 8 | 46.6 / — |
| `sim` | 7.10 | 325.5 / 79.5 | 180.3 | 3, 215 | 150.7 / 76.3 |
| `skill-map` | 7.11 | 329.5 / 81.4 | 177.0 | 1, 35 | 101.4 / — |
| `tutor` | 7.12 | 398.5 / 119.5 | 202.4 | 6, 519 | 153.2 / 67.4 |
| the 11 together | | 364.8 / 112.6 | | 44, 2,902 | 158.9 / 69.4 |
| `learner-model` | 7.8 — not done | 292.4 / 101.2 | — | 2026-11-12T14:27 … 2026-11-13T21:03: 9, 612 | 176.1 / 70.3 |

- Where a row is the work of two parts, its «Сделано» gives two numbers.
- **The 11 together:** the main call's context −56%, a subagent's −38%; 1 compaction in 2,902 main calls against 215 in 55,883; at API prices $0.074 per main call, subagents with it, against $0.157.
- **What it cost:** the 11 tasks, by their «Сделано», ≈ $627 at API prices, most of it the translators and blind readers, from 0.9 million tokens of subagents (`skill-map`) to 3.5 million (`canvas`). At $0.083 less per main call they pay back over ≈ 7,600 main calls, a few days of work at the pace of the month before.

**What each change gave:**

| Change | What the measurement shows | Verdict |
|---|---|---|
| One task is one session and the hook | `spec` −58% for a main call, and the session of six tasks is +26% against the sessions of one. `learner-model` took none of E10's files by 2026-11-13 — no hook, no compaction key, its long CLAUDE.md, Russian `docs/` — but its sessions held one task each, and its main call fell from 292.4 to 176.1 thousand, −40%. Of E10 it had only the account's skills turned off, for the whole container (В31), ≈ 5 thousand per call. So most of the saving is the order of work that the author keeps, and the hook only catches a slip. In the 12 repositories with the hook it stopped one prompt, in `module-kit`. It does not count «делай T…» as the start of a task: a task of `sim` and one of `spec` began so, and another task's phrase would have passed in them | gave the most; keep; the phrases — a task of their own |
| Compaction at 400 thousand | Since 2026-11-12T14:27 the largest context of a main call is at most 367 thousand in every repository but `api`, whose 13 calls over 400 thousand, up to 406.6, are one session before its move. `learner-model`, which has no key, reached 361 thousand: its sessions are short. In `spec` compactions went from 9 to 2, both in the session of six tasks; in the 11, from 215 to 1. The share of what compactions left: 6.9% of what was carried, then 6.6% | keep: it bounds a long session when there is one |
| The claude.ai connectors and the account's skills turned off (В31) | MCP instructions: 84 entries, 0.46% of what was carried and 2.0 thousand at the start of a session, then none in `spec` and none in any repository after its task; in `learner-model` without the key, 15. The list of skills: 17,147 characters, then 7,397, 8.4 thousand tokens, then 3.4 | keep |
| A thin CLAUDE.md, the rules of the parts | CLAUDE.md: 10.2 thousand tokens in every call, then 4.8. RULES.md: 5.2, then 5.9, with E10's rules. The rules loaded 10 times: 9.0 thousand tokens, 0.47% of what was carried. The start of a session is 40.5 thousand against 49.3, although the descriptions of the tools — Claude Code's own, not in the transcript — grew from 12.6 to 16.8 thousand | keep |
| The bodies of done tasks in the archive, `DEBT.md` | RUN.md and `DEBT.md` bring 211 tokens per main call, against RUN.md's 257, −18%, with as many readings per call — 0.27 against 0.28. As a share of what was carried, they grew from 4.0% to 5.7%: the sessions became shorter, a reading did not | keep |
| "Sources" and the measurements in their own files | In `spec`, architecture brings 26 tokens per main call against 63, but `docs/sources.md` brings 51 more and `docs/measurements.md` 10, 87 together: three of the window's tasks wrote records of sources. No saving shows in the window | keep: a source as a record serves the bar, not only the tokens |
| `docs/` in English (`spec`'s and the tasks of row 7) | The transcripts cannot tell language from work: the recipe shares a call's growth among what entered by characters (section 1.1). The characters per token of what entered went from 2.05 to 2.20. The direct count is section 1.6, −11.4% of tokens for the same text. The translations made the repositories' `docs/` smaller in bytes: `canvas` 1.74 MB, then 1.33; `module-kit` 852 KB, then 657; `engine` 616, then 472; `infra` 516, then 410; `skill-map` 265, then 200 | keep |
| The plugin `gopls-lsp` — for diagnostics, not for savings | After the tasks, the five repositories of Go that took the plugin called the tool LSP 0 times. The tool is among the deferred tools in the last sessions of `sim` and `module-kit`, but not in those of `api`, `engine` and `tutor`. One attachment of diagnostics came, in `module-kit`; `api` made 83 edits of Go files and got none. `~/.claude/plugins/known_marketplaces.json`, on the volume all containers share, names the marketplace `novatrail` at `/workspaces/sim/spec/claude-plugins`, written 2026-11-13T04:52, a path only `sim`'s container has. That this is the cause is a guess, not verified | gave nothing yet — Д234 |
| Budgets and the measurement | `docs-budgets.json` stands in 11 repositories; a budget saves no tokens by itself, and the measurement is this one | keep |

**The plugin `gopls-lsp`, the trial of 2026-11-15** (Д234). The transcripts on this machine agree with the guess: the tool LSP is named in the last four sessions of `sim`, of 2026-11-14 and 2026-11-15, and in those of `module-kit` that ended by 2026-11-13T04:51, but not in the one that ended at 04:59, after the record went to `sim`'s path at 04:52; it is named in none of the last four of `api`, `engine` and `tutor`. `~/.claude/.claude.json` trusts only `/workspaces/sim` and `/workspaces/module-kit`. The trial: a copy of the kind `go` in a folder not trusted, gopls 0.24.0 from the template's lock file on `PATH`, Claude Code 2.1.280, `claude -p --output-format stream-json --verbose` on Haiku, a Write of a file with a type error and, from the second run, a Read of it, with the record `novatrail` of `/workspaces/sim/spec/claude-plugins` in place:
- the template's settings by `--settings` — the plugin is named in the init event, `tools` has no `LSP`, no diagnostics; the record is rewritten to the copy's path, and the next session gets `LSP` and the diagnostics;
- `CLAUDE_CODE_PLUGIN_DIRS` with the plugin's folder, no settings — the first session loads `gopls-lsp@inline`, has `LSP`, and after the Write gets "cannot use "x" (untyped string constant) as int value in return statement [IncompatibleAssign]"; `known_marketplaces.json` is not touched.

Three runs, $0.057 at API prices. The change: the loading of gopls, in `docs/decisions.md`.

**Where the spending is now** — in `spec`, as a share of what was carried after the release, 249 million:
- Bash output — 44.2%;
- the model's output — 18.9%;
- the starts of sessions — 12.0%, against 1.6% in the baseline. The start is 40.5 thousand of a 189.7 thousand average call. Of it: the descriptions of the tools — 16.8 thousand, RULES.md — 5.9, CLAUDE.md — 4.8, the system prompt — 4.5, the list of skills — 3.4, MEMORY.md — 2.0;
- Read — 7.8%;
- what compactions left — 6.6%;
- the starts of subagents — 6.4%.

Of the files, `docs/decisions.md` brings the most: 262 tokens per main call, against 305 in the baseline. This is the input of the next analysis, when the threshold for a new analysis calls it; it is not a task now.

### 1.11. The cost of a translation

What translating `docs/` cost in tokens of subagents, from the «Сделано» of the tasks, read 2026-11-13 on `main`: `spec`'s in the archive of E10, `sim`'s in its archive of E5 (the inbox triage at the end of E10; `tutor` В80).

| Task | Russian text | Translators, batches | Translators, million | A translator, million | All, million | Per MB, million |
|---|---|---|---|---|---|---|
| `spec` | 2.35 MB | 31, 40–120 KB | 3.71 | ≈ 0.12 | 4.4 | ≈ 1.9 |
| `sim`, the first task | 235 KB | 3, ≈ 49–93 KB | 0.68 | 0.19–0.26 | 0.81 | ≈ 3.4 |
| `sim`, the second task | 201 KB | 2, 92 and 109 KB | 0.32 | 0.15–0.17 | 0.38 | ≈ 1.9 |
| `sim`, the third task | 229 KB | 2, 118 and 116 KB | 0.40 | 0.19–0.21 | 0.46 | ≈ 2.0 |

- "All" adds the blind readers, 0.06–0.07 million each, and in `spec` the reconciliation of quotes.
- A translator costs about the same whatever its batch: each first reads the glossary, 75 KB, the rules of translation and its brief. So the cost follows the number of subagents. `sim`'s first task, estimated at 1.9 million per MB, paid 1.8 times as much with three translators for 235 KB; by subagents its estimate is ≈ 0.74 million. [tools/translation/README.md](../tools/translation/README.md) estimates by subagents.

### 1.12. The ceiling of a task's cost

What a session of Claude Code costs, for the orchestrator's ceiling of a task's cost. Measured 2026-11-15.
- **How.** The transcripts on this machine of the 13 repositories' folders, `-workspaces-*`, each session with its subagents. The cost is each call's usage at the prices of section 1.2, each message of the model counted once. The sessions are those that started from 2026-11-01 until 2026-11-15T22:00 UTC and cost more than $0.50.
- **All sessions**, 432:

  | Median | 75th percentile | 90th | 95th | The largest |
  |---|---|---|---|---|
  | $11.67 | $23.04 | $48.42 | $69.31 | $373.25 |

  17 cost more than $75, and 42 more than $50.
- **Since one task has been one session**, from 2026-11-12T14:27, the end of the window of the rows of E10 in section 1.9 (section 1.7), 202 sessions:

  | Median | 90th percentile | 95th | The largest |
  |---|---|---|---|
  | $8.83 | $22.70 | $26.70 | $93.62 |

  One cost more than $75. Before that, a session often held several tasks, and the largest sessions are of that time.
- **The ceiling.** $75 by default, about the 95th percentile of all sessions, as recommended; the rejected options were $50 and a ceiling given every time. `tools/orchestrator/runs.mjs` holds it as `DEFAULT_CEILING`, and `start --ceiling` gives another. The ceiling counts `total_cost_usd`, Claude Code's own estimate at the API's prices, which counts as section 1.2 does: on a subscription, it measures the share of the limit a task takes, not a bill.
- **A run of the orchestrator.** Its first real run, in `sim`'s container, 2026-11-15: a prompt that asked for one word and the status, Opus at effort `high`. It cost $0.2099: 2 tokens of input, 163 of output, 25,832 of a cache write — the start of a session. The `--resume` of the same session reported $0.2207 in all: $0.0108 more, 25,832 read from the cache, 292 written and 163 of output. The start of a session is the price of a run before it does anything.

### 1.13. The orchestrator's pilot, 2026-11-16

What the runs of the orchestrator cost, and how often they stopped for the author. Measured 2026-11-16.

**How it was measured.** The sample is every run from 2026-11-15T22:26 to 2026-11-16T17:55 UTC: 106 runs in 13 repositories, read from their folders on the volume `novatrail-claude`. Every run used Opus at effort `high`.
- *$* is `spent_usd` of `status`: the largest `total_cost_usd` that any attempt printed. That number is Claude Code's own estimate at the API's prices (section 1.12).
- *Turns* and *minutes* are `num_turns` and `duration_ms`, summed over every `result` of every attempt's stream. `status` gave only the last one then; it now sums them.
- *Wall* runs from the run's start to the last write to its streams, and includes the waits for the author and for checks.

**The totals.**
- 106 runs, with 121 attempts: the first, and each `resume`, with answers or after a failure. 15 runs had more than one.
- $600.08, 9,567 turns, 49.8 hours of running and 81.7 hours of wall. Up to 13 runs went at once, the waiting ones included.
- 92 runs ended with a pull request, for $592.98.
- 14 runs ended with none, for $7.10:
  - 10 runs of the night's work found no task free, for $4.37: median $0.45, at most $0.58;
  - 3 were the first trial runs of 2026-11-15, of `sim` and `learner-model`;
  - one failed, the run of `skill-map` at 11:09, for $2.08: the hook refused its resume, which named the number of the task its executor had taken instead, and a new run did its task.

| | Median | 90th percentile | 95th | The largest |
|---|---|---|---|---|
| $, all runs | 5.37 | 10.66 | 12.11 | 17.25 |
| $, runs with a pull request | 5.67 | 10.87 | 12.69 | 17.25 |
| Turns, runs with a pull request | 99 | 157 | 168 | 235 |
| Minutes, runs with a pull request | 25 | 60 | 75 | 117 |
| Wall, runs with a pull request | 28 | 75 | 152 | 641 |

**Against an interactive session.** No task of the pilot had been run in an interactive session, so there is no pair of the same task to compare. The comparison is with section 1.12: the sessions since one task has been one session cost median $8.83, 90th percentile $22.70, 95th $26.70.
- A run with a pull request cost about two thirds of that at the median and half at the tail.
- Part of the difference is in the tasks. The pilot's were mostly moves to a tag and changes of CI, and none was planned together with the author.
- No run reached the ceiling of $75. The largest, a run of `spec`, took 23% of it.

**The window of the subscription.** What a window of five hours holds is still not measured: the cost is a run's, not an hour's. The runs that started in the busiest five hours, from 02:35 UTC, spent $336.76, but over about eleven hours of their running. No limit of the subscription was reached in about twenty hours of runs and $600 at the API's prices (Д252). The transcripts of the executors' sessions time each message, so a later measurement can sum the cost by hour.

**Questions and pauses.**
- *The executors' questions:* 9, in 7 waits. A run of `sim` returned three at once, В26–В28. В13 of `skill-map`, В80 of `canvas`, В37 of `infra` and В50 of `engine` waited for the author's morning, В13 from 06:08 to 14:23 UTC.
- *The orchestrator's own questions:* 2, an uncommitted plan in `app`'s working copy and a red `main` of `modules`.
- *The author's word:* it changed the plan four times. That was wave 0 for every repository in batches of four, the night's rules, wave 7.14 at once, and the round of fairness, three decisions.
- *Rebuilds:* the author rebuilt a container after each merge that changed `.devcontainer/`. That was most repositories twice, after the move to v0.18.4 and after the stage `toolchain-core`. Each rebuild paused that repository alone, and at night it waited for the morning.
- *Not seen:* a limit and the ceiling.

**What is not counted.**
- The first attempt of `learner-model`'s run at 05:34 ran about ten hours of wall, most of it `sim`'s runs in its background. It was stopped by hand and printed no `result`; `stop` now does it and takes such an attempt's spend from its transcript. Its turns and minutes are not in the table, and its $ is counted only as far as the second attempt's total holds it.
- The orchestrator's own session, interactive in `spec`, is not counted here. The monthly measurement counts it with the others (section 1.9).

**The runs.** The time is the start, UTC, on 2026-11-16 unless it says 15. ¹ means no pull request.

| Run | Att. | $ | Turns | Min | Wall |
|---|---|---|---|---|---|
| `.github`, 02:39 | 1 | 6.07 | 94 | 17 | 17 |
| `.github`, 05:17 | 1 | 12.11 | 139 | 62 | 62 |
| `.github`, 06:22 | 1 | 12.69 | 146 | 57 | 57 |
| `.github`, 07:23 | 1 | 11.54 | 157 | 56 | 56 |
| `.github`, 08:22 | 1 | 10.96 | 165 | 58 | 58 |
| `.github`, 09:23 | 1 | 8.36 | 147 | 54 | 54 |
| `.github`, 10:21 | 1 | 10.66 | 161 | 43 | 43 |
| `.github`, 14:52 | 1 | 16.33 | 205 | 75 | 75 |
| `.github`, 14:23 | 1 | 3.95 | 78 | 17 | 17 |
| `api`, 16:11 | 1 | 6.01 | 118 | 14 | 14 |
| `api`, 07:24 | 1 | 4.95 | 122 | 22 | 26 |
| `api` ¹, 08:25 | 1 | 0.57 | 16 | 2 | 2 |
| `api`, 03:39 | 2 | 14.22 | 202 | 49 | 70 |
| `api`, 05:04 | 1 | 2.19 | 48 | 6 | 6 |
| `api`, 05:51 | 1 | 4.17 | 78 | 11 | 11 |
| `api`, 06:18 | 2 | 4.19 | 84 | 50 | 56 |
| `api`, 11:09 | 1 | 4.48 | 99 | 42 | 42 |
| `app`, 03:39 | 1 | 7.46 | 114 | 17 | 17 |
| `app`, 04:46 | 2 | 5.37 | 65 | 14 | 15 |
| `app`, 05:23 | 1 | 1.77 | 49 | 20 | 20 |
| `app`, 05:56 | 1 | 3.54 | 73 | 33 | 33 |
| `app` ¹, 06:42 | 1 | 0.47 | 12 | 1 | 1 |
| `app`, 11:09 | 1 | 3.37 | 82 | 46 | 46 |
| `app`, 17:55 | 1 | 0.83 | 21 | 8 | 8 |
| `app`, 16:08 | 1 | 3.88 | 88 | 19 | 19 |
| `app`, 16:37 | 1 | 5.39 | 102 | 33 | 33 |
| `canvas`, 02:59 | 1 | 9.50 | 145 | 25 | 25 |
| `canvas`, 04:15 | 1 | 2.36 | 46 | 6 | 6 |
| `canvas`, 05:16 | 1 | 10.87 | 184 | 117 | 117 |
| `canvas`, 11:09 | 1 | 9.92 | 168 | 23 | 37 |
| `canvas`, 16:48 | 1 | 8.84 | 145 | 41 | 41 |
| `canvas`, 07:56 | 2 | 10.31 | 159 | 57 | 433 |
| `engine`, 02:59 | 1 | 5.03 | 90 | 21 | 21 |
| `engine`, 04:15 | 1 | 4.30 | 62 | 11 | 11 |
| `engine`, 04:56 | 1 | 4.80 | 99 | 13 | 19 |
| `engine`, 05:40 | 1 | 3.57 | 69 | 29 | 29 |
| `engine`, 06:34 | 1 | 6.08 | 103 | 41 | 41 |
| `engine`, 11:09 | 1 | 6.41 | 106 | 32 | 32 |
| `engine`, 16:37 | 1 | 6.13 | 100 | 28 | 28 |
| `engine` ¹, 06:17 | 1 | 0.42 | 9 | 1 | 1 |
| `engine` ¹, 07:22 | 1 | 0.37 | 10 | 1 | 1 |
| `engine`, 11:53 | 2 | 1.28 | 25 | 6 | 152 |
| `infra`, 02:39 | 1 | 7.20 | 126 | 19 | 19 |
| `infra`, 03:16 | 1 | 6.01 | 80 | 19 | 19 |
| `infra`, 04:15 | 1 | 4.12 | 88 | 10 | 10 |
| `infra`, 05:16 | 1 | 5.52 | 81 | 51 | 51 |
| `infra`, 11:09 | 1 | 4.38 | 72 | 20 | 20 |
| `infra`, 16:11 | 1 | 8.13 | 121 | 22 | 24 |
| `infra`, 06:16 | 1 | 5.83 | 91 | 18 | 18 |
| `infra` ¹, 06:44 | 1 | 0.58 | 14 | 2 | 2 |
| `infra`, 11:42 | 2 | 10.30 | 141 | 33 | 186 |
| `learner-model` ¹, 15 23:01 | 1 | 0.21 | 2 | 0 | 0 |
| `learner-model`, 00:50 | 1 | 5.05 | 88 | 13 | 13 |
| `learner-model`, 01:24 | 1 | 5.39 | 64 | 23 | 23 |
| `learner-model`, 01:54 | 1 | 8.39 | 117 | 31 | 31 |
| `learner-model`, 02:35 | 1 | 9.72 | 140 | 76 | 76 |
| `learner-model`, 04:56 | 1 | 3.38 | 71 | 25 | 25 |
| `learner-model`, 05:34 | 2 | 14.62 | 46 | 29 | 641 |
| `learner-model`, 16:24 | 1 | 3.54 | 55 | 17 | 17 |
| `learner-model`, 16:55 | 1 | 9.85 | 141 | 32 | 32 |
| `module-kit`, 02:39 | 1 | 5.10 | 71 | 15 | 15 |
| `module-kit`, 03:15 | 1 | 4.69 | 82 | 19 | 19 |
| `module-kit`, 05:16 | 1 | 6.02 | 125 | 65 | 65 |
| `module-kit`, 11:09 | 1 | 6.97 | 106 | 34 | 42 |
| `module-kit`, 16:39 | 1 | 5.40 | 106 | 15 | 15 |
| `module-kit`, 06:31 | 1 | 5.31 | 113 | 50 | 50 |
| `module-kit` ¹, 07:30 | 1 | 0.28 | 7 | 1 | 1 |
| `modules`, 02:59 | 1 | 6.75 | 105 | 24 | 24 |
| `modules`, 04:48 | 1 | 3.94 | 72 | 12 | 12 |
| `modules`, 05:16 | 1 | 6.12 | 109 | 50 | 50 |
| `modules`, 11:09 | 1 | 5.97 | 90 | 27 | 27 |
| `modules`, 16:11 | 1 | 6.24 | 100 | 27 | 27 |
| `modules`, 06:13 | 1 | 2.97 | 66 | 60 | 60 |
| `modules`, 07:23 | 1 | 5.67 | 80 | 42 | 42 |
| `modules` ¹, 08:16 | 1 | 0.50 | 11 | 1 | 1 |
| `modules` ¹, 11:45 | 1 | 0.30 | 9 | 1 | 1 |
| `sim` ¹, 15 22:26 | 2 | 0.22 | 4 | 0 | 1 |
| `sim` ¹, 15 23:01 | 2 | 0.23 | 4 | 0 | 2 |
| `sim`, 00:50 | 1 | 6.62 | 108 | 17 | 17 |
| `sim`, 01:27 | 2 | 5.19 | 72 | 13 | 20 |
| `sim`, 02:03 | 1 | 5.07 | 113 | 16 | 22 |
| `sim`, 02:43 | 1 | 4.37 | 54 | 22 | 22 |
| `sim`, 03:17 | 2 | 3.84 | 60 | 9 | 26 |
| `sim`, 04:15 | 1 | 6.85 | 133 | 20 | 20 |
| `sim`, 05:16 | 1 | 11.10 | 160 | 67 | 67 |
| `sim`, 11:09 | 1 | 7.08 | 108 | 43 | 43 |
| `sim`, 16:45 | 1 | 6.08 | 103 | 34 | 34 |
| `sim` ¹, 06:34 | 1 | 0.50 | 14 | 2 | 2 |
| `sim`, 16:16 | 1 | 3.63 | 61 | 18 | 18 |
| `skill-map`, 02:39 | 1 | 6.59 | 93 | 17 | 17 |
| `skill-map`, 03:18 | 1 | 3.95 | 65 | 10 | 10 |
| `skill-map`, 04:15 | 1 | 2.95 | 66 | 19 | 19 |
| `skill-map`, 05:17 | 2 | 4.57 | 78 | 14 | 28 |
| `skill-map`, 06:04 | 2 | 3.26 | 59 | 23 | 516 |
| `skill-map` ¹, 11:09 | 2 | 2.08 | 37 | 8 | 9 |
| `skill-map`, 11:19 | 1 | 5.35 | 123 | 114 | 114 |
| `skill-map`, 16:55 | 1 | 7.68 | 130 | 34 | 34 |
| `spec`, 05:16 | 2 | 17.25 | 235 | 100 | 101 |
| `tutor`, 02:59 | 1 | 9.98 | 135 | 31 | 32 |
| `tutor`, 04:15 | 1 | 5.10 | 65 | 22 | 22 |
| `tutor`, 04:56 | 1 | 5.41 | 90 | 39 | 39 |
| `tutor`, 05:55 | 1 | 5.44 | 97 | 61 | 61 |
| `tutor`, 11:09 | 1 | 6.58 | 106 | 39 | 39 |
| `tutor`, 16:11 | 1 | 9.22 | 154 | 22 | 37 |
| `tutor`, 07:10 | 1 | 3.39 | 57 | 12 | 12 |
| `tutor` ¹, 07:33 | 1 | 0.36 | 8 | 1 | 1 |

### 1.14. Documents and comments: what a session needs, 2026-11-18

Which part of the documents and the code comments of the 13 repositories helps a session do its task, and which only costs tokens and time and makes the texts unreadable for the author. Measured 2026-11-18 on `main` of each repository, read-only, from clones in a temporary folder, and on the transcripts of the orchestrator's executors on the volume `novatrail-claude`. The commands are section 1.14.6. The answers to В60–В65, in `docs/plan/E15.md`, took every recommendation: the rule of section 1.14.5 is epic E16 of [run/EPICS.md](../run/EPICS.md), and the time of the tasks is a task of [run/TASKS.md](../run/TASKS.md), measured in section 1.15.

**The answer in short.**
- The documents cost the executors about a quarter of what they read and of what they write: 26% of the context their main calls carry and 23% of their output (section 1.14.2).
- Three tasks were traced by their transcripts (section 1.14.3). In two of them 40% and 70% of the documents read could have been avoided, and half to two thirds of the documents written: navigation, process, and the same fact written six to nine times.
- Removing that would save about 2–3 minutes and $0.51–0.85 of a session's 28.8 minutes and $5.72 with its subagents: 7–10% of the time, 9–15% of the cost.
- It is not why a task of E5 of `app` takes 45–110 minutes. Its longest task, the tutor's panel, spent about 5% of its time on documents and 64% on tools: tests, the comparison with the mockup, and waiting for CI.
- 10–100 times shorter holds for single texts, not for the whole. The status paragraph of `infra`, a chronicle of 1,171 characters, has no reader and can go. The decision of `infra` on the releases of `api` and `app`, 25.9 thousand characters, holds about one paragraph in force. Over all of it, the decision logs would shrink by about half and the comments by about 45%.

#### 1.14.1. What the repositories hold and what grows

Sizes in KB of 1,024 on `main`, 2026-11-18. "Docs" is `docs/` without the archives; "plan" is RUN.md and `run/`. The comment columns cover hand-written code, `.go`, `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs` and `.sh`, tests included and generated files excluded:
- *share* is comment lines among non-empty lines;
- *chars* is the mean length of a comment line;
- *R…* is the share of comment lines that cite a decision.

The log columns:
- *amendments* is the share of a decision log's bytes in its dated amendments;
- *tag moves* is the share in the entries that move the repository to a tag of `spec`, with their amendments.

| Repository | Docs | Decisions | Architecture | Archives | Plan | CLAUDE.md | Comments: share | chars | R… | Log: amendments | tag moves |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `.github` | 796 | 415 | 126 | 806 | 13 | 11 | 11% | 81 | 8% | 34% | 30% |
| `api` | 1,378 | 853 | 363 | 1,104 | 28 | 9 | 15% | 67 | 12% | 23% | 17% |
| `app` | 1,186 | 593 | 434 | 1,025 | 57 | 7 | 11% | 74 | 12% | 19% | 17% |
| `canvas` | 1,435 | 868 | 319 | 1,580 | 21 | 10 | 15% | 71 | 14% | 27% | 18% |
| `engine` | 641 | 329 | 176 | 594 | 17 | 9 | 14% | 81 | 6% | 41% | 31% |
| `infra` | 695 | 424 | 116 | 717 | 53 | 10 | 14% | 83 | 12% | 39% | 21% |
| `learner-model` | 753 | 470 | 184 | 716 | 30 | 8 | 15% | 76 | 3% | 21% | 24% |
| `module-kit` | 764 | 545 | 144 | 638 | 10 | 8 | 14% | 81 | 4% | 7% | 26% |
| `modules` | 629 | 408 | 168 | 684 | 14 | 9 | 9% | 82 | 7% | 24% | 31% |
| `sim` | 839 | 534 | 172 | 759 | 36 | 8 | 12% | 82 | 12% | 26% | 16% |
| `skill-map` | 298 | 206 | 54 | 295 | 14 | 8 | 14% | 72 | 13% | 13% | 38% |
| `spec` | 2,840 | 1,649 | 178 | 2,324 | 64 | 11 | 16% | 80 | 7% | 45% | 0% |
| `tutor` | 1,606 | 797 | 399 | 1,769 | 27 | 11 | 13% | 82 | 6% | 15% | 19% |
| All | 13,860 | 8,091 | 2,833 | 13,011 | 384 | 119 | 47,583 lines, 3.62 M characters, in 302,667 lines of code | | | | |

Notes on the table:
- The decision logs are 58% of the documents.
- In the documents, without the archives, there are 10,245 version numbers `vX.Y.Z`, 13,736 dates and 18,212 task numbers.
- In `spec` the tag moves are 0%: it moves to no tag.

**What grows with each task.** 213 commits reached the first parent of `main` in the 13 repositories from 2026-11-16 to the start of this measurement, almost all of them a task's pull request. Bytes added / removed, KB:

| Decisions | Other docs | Plan | Archives | Other `.md` | Code, tests and data |
|---|---|---|---|---|---|
| 1,180 / 167 | 1,313 / 718 | 672 / 662 | 1,710 / 23 | 396 / 537 | 2,459 / 828 |

- The documents grew by 3.1 MB net in two days and the code by 1.6 MB: an average task adds 4.8 KB to its decision log, 7.9 KB to its archive and 2.8 KB to its other documents.
- The plan stays level: its rule keeps it without history.
- The archives are not read whole, by the rules of RUN.md, and the sessions carry 1.5% of their context from them.
- What grows and is read is the decision log and the architecture.

#### 1.14.2. Where the executors' sessions spend

The sample has 246 sessions of the orchestrator's executors, `entrypoint: sdk-cli`, that started from 2026-11-16T00:00 to 2026-11-18T04:33 UTC, in all 13 folders. They made 21,103 main calls until its end, with 3,083 million tokens of context and 12.56 million of output. A session averages 28.8 minutes of wall time and 10.6 of the model's own, $4.90 at the API's prices (section 1.2), $3.88 of it input. Its subagents cost $0.83 more and are not attributed: the review and the searches it gives them. The sessions were not resumed into new transcripts, and they compacted 15 times. `tokens-report --classes` prints the table below, and the script of section 1.14.6 gives the same numbers.

How the calls are attributed:
- Each main call is attributed to what its tool calls did, the files they name read by their path: `docs/decisions.md`, `docs/architecture.md`, other `docs/`, RUN.md and `run/`, the archives, CLAUDE.md and the rules, README files.
- A Bash command's files are its words: the groups by file of `tokens-report` count a file only if it exists on this machine, and the other repositories are not checked out here (section 1.1), so `--classes` reads the words alone.
- What a result carried is measured as in section 1.1: the context it added, times the calls after it until a compaction. What a compaction left is carried whole, like the start, and counts in "git, gh, other shell", 1.7%, with the author's words, the reminders, the other tools and the reads of the session's own files, in `/tmp/` and among its transcripts.
- A call's output and its time, from the previous entry to its last block, are shared among its tool calls.

| What a call did | Context it carried | Output | Model time | Model minutes a session |
|---|---|---|---|---|
| read documents | 25.5% | 17.3% | 21.2% | 2.2 |
| git, gh, other shell | 19.9% | 18.6% | 24.3% | 2.6 |
| the start of the session | 18.1% | — | — | — |
| read code and data | 13.7% | 13.1% | 14.5% | 1.5 |
| write code and data | 1.5% | 21.3% | 16.4% | 1.7 |
| write documents | 0.7% | 23.0% | 18.9% | 2.0 |
| the status, the report to the author | — | 6.7% | 4.7% | 0.5 |

The documents read, by share of the context carried:

| Decisions | Several at once | Plan | Architecture | Archives | README | Other docs | Rules | Other `.md` |
|---|---|---|---|---|---|---|---|---|
| 6.5% | 6.1% | 5.0% | 2.4% | 1.4% | 1.3% | 1.3% | 0.8% | 0.6% |

- The session writes documents with as much output as code, 23.0% against 21.3%, and spends more of the model's time on them, 18.9% against 16.4%.
- Most of it, 13.8% of the output, is scripts of `node` and `sed` that edit several documents at once: the amendments, the archive and «Сделано».
- The start of a session holds CLAUDE.md and RULES.md, 22–26 KB.

#### 1.14.3. Three tasks by their transcripts

Each transcript was read whole: what the session read, whether a fact of it shaped a decision, a command, a line of code or a test, and what it wrote. What was read only to obey a rule of the process — RUN.md's rules, the rule of the part — is needed, though not fed into code, and is not counted avoidable. They are *the essay*, the task of `app` on the screen of the essay; *the panel*, the task of `app` on the tutor's panel, the longest task of E5; and *the raise*, the task of `infra` that raised `app` on the project `novatrail`, with two earlier raises of `infra` like it.

| | The essay, `app` | The panel, `app` | The raise, `infra` |
|---|---|---|---|
| Wall, minutes / main calls | 42.6 / 197 | 110.6 / 355 | 9.1 / 32 |
| Documents read, thousand characters | ≈150 | ≈150 | ≈41 |
| Of them, fed a decision, a command or code | ≈40 | ≈40 | ≈6.4 |
| Of them, avoidable: navigation, unused parts, reading to write more | ≈60, 40% | not estimated | ≈29, 70% |
| Documents written, output | 13% | 8%, ≈4.5 minutes | 31% |
| The same fact written in | 9 places | 6 places | 6 in the repository, 3 in git and GitHub |

**What paid off:**
- The task's body.
- The decisions in force it named: three of `app` and `spec`'s on a task with a rubric in the essay; `spec`'s on the interface mockup in the panel.
- The README of the mockup, `draft/mockup/README.md` spec.
- The rule of the part, which names the checks.
- In the raise, `deploy/production.json` and BREACH.md part 1.
- The precedent: the «Сделано» of an earlier task of `app` gave the essay its recipe of checks, and in the raise `git show` of the commit of an earlier raise was the most useful read, the template of all five edits.

**What did not:**
- RUN.md read whole for its rules: 15–23 thousand characters, carried by every later call.
- A grep of the bold lines of the decision log as an index: 19.6 thousand characters in the essay.
- The decision of `infra` on releases read whole in an earlier raise, 20.3 thousand characters, 10 of its 11 amendments being raises of a version.
- The architecture and the archive read only to write more of them.
- In the raise the status paragraph of `docs/architecture.md` `infra`: the session read 200 characters of it only to find where to append, took the versions from `deploy/production.json` and `gh release view`, and added 87 characters.
- That paragraph is 2,891 characters, of them a chronicle of 1,171 with 16 versions and 12 task numbers. 33 commits changed it, and 9 of the last 20 pull requests.

**What was written twice:**
- In the essay a decision of `app`, then amendments to two others that restate it, the architecture, «Сделано», the gist sentence, the commit, the pull request and the report.
- In the essay, the size budget of the architecture then took six edits and four runs of `docs-check`, to a net change of zero characters.
- In the raise an amendment to the decision of `infra` on releases, of 2,679 characters, and a body in `run/TASKS.md` of 3,444 restate the release, the list and the output of `deploy-check`. All five findings of its review were about the documents.

**The code comments of these tasks:**
- In the essay, 82 comment lines with 17 citations of decisions, most of them retelling the code. The header of `EssayScreen.tsx` is 12 lines.
- In the panel comments are 29% of the characters added, 45% outside the tests, and the header of `TaskLayout.tsx` is 2,141 characters that repeat a decision of `app`.
- Neither session looked up a decision by a number found in a comment. Every decision it read came from the task, the archive or another decision.

**Where the panel's time went.**
- The model: 39.3 minutes.
- Tools: 71.3 — tests 21.4, `just ci-*` 12.6, the comparison with the mockup 12.1, waiting for the checks of GitHub 19.1, the review 3.6, `docs-check` 0.5.
- A fix of SonarCloud's S6845 broke a check of axe at 320 px in CI that the local rerun did not cover, and cost 27 minutes.

#### 1.14.4. The classes of text

The comments were read in a sample: 8 comment blocks of each repository, 104 in all, chosen by the sha1 of "file:line" (section 1.14.6). Each block was classed by the code beside it:
- W, why: a reason, a constraint, a pitfall;
- D, what the code already says;
- C, the contract of an exported API;
- R, mostly a reference;
- H, history.

The counts: W 34% of the blocks, D 42%, C 22%, R 2%, H 0%. Over all the code, 3,398 of 20,726 blocks cite a decision, 16% (`repos.sh`, section 1.14.6). The sample's command takes a line that starts with `*` as a comment, and so a line of Go such as `*p = v`; each block was read with its code, and none of the 104 was code. Of eight references checked against their decisions:
- five name a constraint the code cannot show;
- one names the wrong part: a decision of `canvas` for what another says;
- one names the wrong entry: the decision of `api` on the owner profile for the twelve months of its decision on the database, in `internal/store/profiles.go:131`;
- one is decoration.

| Class | Examples | Verdict | Why |
|---|---|---|---|
| (a) Versions and statuses in the documents | the status paragraph of `docs/architecture.md` `infra`; 10,245 versions and 13,736 dates in the documents; the entries of tag moves, 0–38% of a log | hinders | Nobody reads the history: the session takes the current version from `deploy/*.json`, the submodule, `package.json` and the releases, and the history from git. Each deployment rewrites it, and 9 of 20 pull requests of `infra` did. |
| (b) Dated amendments to decisions | 7–45% of a log; the decision of `infra` on releases, 25.9 thousand characters, mostly raises | helps in what is in force, hinders as history | The session needs the text in force. It reads the whole entry to find it, and writes amendments that restate another entry, as RULES.md and `spec`'s decision on saving tokens require ("A decision that changes what another entry of the log says puts a dated amendment on that entry too"). |
| (c) References to decisions in comments | `(R25)` `canvas`; `A page of the section for adults (R29 and R68 in docs/decisions.md; section 3.10 of docs/architecture.md)…` `app` | a short anchor is neutral to helpful; a retelling of the code hinders | The sessions did not follow them; 5 of 8 hold a real constraint, and 2 are wrong, which no check sees. What D blocks retell, the code already says: 42% of the blocks. |
| (d) One fact in several documents | the decision, amendments to others, the architecture, «Сделано», the gist sentence, the commit, the pull request, the report | hinders | Six to nine copies a task, and each copy is read again by the review and by the next task. |
| (e) Texts the author reads | the bodies of tasks, the reports, README | helps, where short | They are the author's way into the work, and the status takes 6.7% of the output. «Сделано» and «Открыто» restate the pull request. |

#### 1.14.5. The rule proposed, what it gives, and the plan

**The rule** — one for the documents and the comments of every repository; its points are В60–В63:
1. Each fact has one home.
   - The current state lives where it is set, the history in git, the releases and the archives:
     - a version in `deploy/*.json`, the submodule, `package.json` or the `ARG` of the Dockerfile;
     - what a task did in its pull request.
   - A document names the file to look at, not the version, and keeps no chronicle (В60).
2. A decision is its text in force, with its why and what it rejected.
   - A change rewrites the entry in its place, and git keeps the old text; the commit says why.
   - A decision that changes another entry rewrites that entry too, instead of adding an amendment that restates it.
   - A tag move is a commit and a line of the README, not an entry (В61).
3. A comment says what the code and its names cannot: why, a constraint, a pitfall, the contract of an exported API.
   - It never retells the code, its history or its task.
   - Where the reason is a decision, the comment gives the constraint in one clause and ends with its number, `(R25)`, as an anchor for `grep`; it cites no section of a document (В62).
4. A done task writes one line of «Сделано» with its pull request, and what stays open as rows of its tables.
   - How it was checked is in the pull request.
   - The architecture describes the current design and cites a decision by its number, without retelling it (В63).

**What it gives.**
- Of a session's main calls, $4.90 and 28.8 minutes, the documents read are about $0.99 and 2.2 minutes of the model, and the documents written about $0.23 and 2.0 minutes (section 1.14.2).
- By the shares that served nothing in section 1.14.3:
  - reading: 40–70%, $0.40–0.69 and 0.9–1.5 minutes;
  - writing: 50–67%, $0.12–0.16 and 1.0–1.3 minutes.
- Together $0.51–0.85 and about 2–3 minutes a session: 9–15% of its $5.72 with the subagents, 7–10% of its time.
- The review checks fewer claims: in the raise, about 70% of its subagent's 7.4 thousand tokens of output went on the documents.
- The author can read a decision as one text.

**Risks — what a session stops knowing.**
- Why a decision changed, and when. Git keeps it (`git log -p`, `git log -L`), but a session reads it only if asked to.
- A precedent: the earlier task's «Сделано», which gave the essay its recipe. A short recipe in the rule of the part does that better.
- Rewriting an entry in place could lose what it rejected. The rule keeps "Rejected" in the entry.
- A number in a comment can be wrong (2 of 8). A check that every number cited in a comment names an entry of the log would catch the half that names no entry.
- `spec`'s decision on saving tokens rejected a consolidation of the decisions in force beside the log, by the sample of section 1.6: 60% of the size, 17–24% less read, 0.5–0.7% of what the sessions carried, and every amendment dragged an edit of the copy after it. Rewriting the entry in its place keeps no second copy.
  - The new facts: in the executors' sessions the logs carry 6.5% of the context, not 2.6%.
  - The amendments that restate another entry cost output and review.
  - The author cannot read the logs.
  - By the 17–24% less read of section 1.6, rule 2 alone saves 1.2–1.7% of the context, and more of the output: the amendments that restate go.
- The rewrite of the logs, 8.1 MB, is itself a large task. It is cheaper by entry, when a task touches one, than all at once.

**What it changes** (В64):
- RULES.md, How we work: "A decision is never rewritten", and the rule of amendments to other entries.
- The rule of `spec`'s decision on saving tokens that an entry and its amendments are its whole text in force.
- The plan's rule of no history extends from the plan to `docs/` and the comments.
- `docs-check` and `docs-check-repo`:
  - the limit of an entry, 40 KB, can fall to about 12;
  - a check that each `R…` cited in a comment of code names an entry;
  - the budgets of size go on as they are.
- `tokens-report` takes a grouping by class of path, which section 1.14.2 had to do by hand, so that the epic can measure before and after.

**The plan proposed** (В64).
- An epic in `run/EPICS.md`, E16.
  - First, `spec`: the rule as a decision, and RULES.md and `spec`'s decisions on saving tokens and on the plan amended; the checks; `tokens-report --classes`; and `spec`'s own documents.
  - The analysis of tokens by the threshold of the size budgets joins it: the log of versions in `docs/dpia.md`, its first candidate, is class (a).
  - Then a row of COORDINATION.md for each of the other 12 repositories, from one text, each with its move to the tag.
  - The measurement by section 1.14.6 at its archive.
- Not a part of it: the time of the executors' tasks, which is the loops of tests and CI (section 1.14.3) and a task of its own (В65), section 1.15.

#### 1.14.6. The commands

**The repositories** — in an empty folder, clones of the 13 at `main`, with the awk programs below and `repos.sh` beside them. `repos.sh` prints the rows of the first table of section 1.14.1, its row "All", and the totals of the comments; `growth.awk` gives the second table, one row a repository, and the awk after it their sum; the last command counts the versions, dates and task numbers:
```sh
for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do git clone -q https://github.com/altnovatrail/$r.git; done
bash repos.sh
for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do git -C $r log --first-parent --diff-merges=first-parent --since=2026-11-16 --until=2026-11-18T04:33 -p --format='@@C %H' origin/HEAD | awk -f growth.awk; done | awk '{n += $1; for (i = 2; i <= 7; i++) {split($i, x, "/"); a[i] += x[1]; d[i] += x[2]}} END {printf "%d", n; for (i = 2; i <= 7; i++) printf " %d/%d", a[i], d[i]; print ""}'
for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do find $r/docs -path '*/docs/plan' -prune -o -name '*.md' -type f -print | xargs cat; done | grep -oE '\bv[0-9]+\.[0-9]+\.[0-9]+\b|\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b|\bT[0-9]{2,3}\b' | sed -E 's/^v.*/version/; s/^20.*/date/; s/^T.*/task/' | sort | uniq -c
```

`repos.sh`:
```sh
# In a folder of clones of the 13 repositories at main: the sizes in KB, the comments of the code, the decision log.
kb() { cat "$@" 2>/dev/null | wc -c | awk '{printf "%d", $1/1024}'; }
for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do (cd $r
  docs=$(find docs -path docs/plan -prune -o -name '*.md' -type f -print | xargs cat | wc -c | awk '{printf "%d", $1/1024}')
  c=$(git ls-files -z '*.go' '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '*.sh' ':!:*.pb.go' ':!:*_pb.ts' ':!:*_pb.js' ':!:*connect.go' ':!:*connect.ts' | xargs -0 awk -f ../comments.awk |
    awk '{for (i = 1; i <= 8; i++) s[i] += $i} END {printf "%.0f%% | %.0f | %.0f%%", 100*s[2]/(s[1]+s[2]), s[3]/s[2], 100*s[5]/s[2]; printf "%d %d %d %d %d\n", s[1], s[2], s[3], s[4], s[8] > "/dev/stderr"}')
  d=$(awk -f ../decisions.awk docs/decisions.md | awk '{print $4 " | " $5}')
  echo "| \`$r\` | $docs | $(kb docs/decisions.md) | $(kb docs/architecture.md) | $(kb docs/plan/*.md) | $(kb RUN.md run/*.md) | $(kb CLAUDE.md) | $c | $d |"); done 2> totals.txt | tee rows.txt
awk -F' [|] ' '{for (i = 2; i <= 7; i++) s[i] += $i} END {printf "| All | %d | %d | %d | %d | %d | %d |\n", s[2], s[3], s[4], s[5], s[6], s[7]}' rows.txt
awk '{for (i = 1; i <= 5; i++) s[i] += $i} END {printf "code lines %d, comment lines %d, characters %d, blocks %d, blocks citing R… %d\n", s[1], s[2], s[3], s[4], s[5]}' totals.txt
```

`comments.awk` — a repository's code lines, comment lines, their characters, blocks, lines citing `R…`, `T…` and a section, and blocks citing `R…`; a line that starts with `*` counts only inside `/* … */`:
```awk
# Per repository: code lines, comment lines, their characters, blocks, and lines citing R…, T… and a section.
FNR==1 { gen=0; inb=0; inc=0 }
FNR<=5 && /Code generated|@generated/ { gen=1 }
gen { next }
/^[[:space:]]*$/ { inb=0; next }
{
  l=$0; sub(/^[[:space:]]+/, "", l)
  if (inc || l ~ /^(\/\/|\/\*)/ || (FILENAME ~ /\.sh$/ && l ~ /^#[^!]/)) {
    if (l ~ /^\/\*/) inc=1
    if (inc && l ~ /\*\//) inc=0
    cl++; cc+=length(l); if (!inb) { blocks++; inb=1 }
    if (l ~ /(^|[^A-Za-z0-9])R[0-9][0-9]+([^0-9]|$)/) rr++
    if (l ~ /(^|[^A-Za-z0-9])T[0-9][0-9]+([^0-9]|$)/) tt++
    if (l ~ /(section|architecture|decisions|product|privacy|concepts|repositories|measurements|format) [0-9]+(\.[0-9]+)?/) ss++
    if (rb == blocks) next
    if (l ~ /(^|[^A-Za-z0-9])R[0-9][0-9]+([^0-9]|$)/) { rblocks++; rb=blocks }
  } else { code++; inb=0 }
}
END { printf "%d %d %d %d %d %d %d %d\n", code, cl, cc, blocks, rr, tt, ss, rblocks }
```

`decisions.awk` — a log's entries, amendments, KB, and the shares of amendments and of tag moves:
```awk
# The bytes of a decision log by kind of paragraph: the entry's text, its amendments, the entries of a move to a tag of spec.
/^\*\*R[0-9]+\./ { e++; tag = ($0 ~ /^\*\*R[0-9]+\. (`[a-z.-]+` (stands|is|moves) (on|to) (the tag )?`?spec`? v|`spec` is at the tag|[^*]*(moves|stands) (to|on) (the tag )?`?spec`? v)/); k = "text" }
/^— \*/ { k = ($0 ~ /^— \*[^*]*[Aa]mendment/) ? "amend" : "text" }
/^#/ { k = "head" }
e { b[tag ? "tag" : k] += length($0) + 1 }
/^— \*[^*]*[Aa]mendment/ { n++ }
END { all = b["text"] + b["amend"] + b["tag"]; printf "%d %d %d %.0f%% %.0f%%\n", e, n, all/1024, 100*b["amend"]/all, 100*b["tag"]/all }
```

`growth.awk` — commits, then KB added/removed: decisions, other docs, plan, archives, other `.md`, code:
```awk
# Bytes added and removed by class of file, over the commits of main's first parent.
/^@@C / { n++; next }
/^diff --git / { f=$3; sub(/^a\//, "", f)
  c = (f=="docs/decisions.md") ? "dec" : (f ~ /^docs\/plan\//) ? "arch" : (f ~ /^(RUN\.md|run\/|COORDINATION\.md)/) ? "plan" : (f ~ /^docs\//) ? "docs" : (f ~ /\.md$/) ? "md" : "code"; next }
/^(\+\+\+|---) / { next }
/^\+/ { a[c]+=length($0)-1; next }
/^-/ { d[c]+=length($0)-1 }
END { printf "%d", n; split("dec docs plan arch md code", k, " "); for (i=1;i<=6;i++) printf " %d/%d", a[k[i]]/1024, d[k[i]]/1024; print "" }
```

**The sample of comments** — 8 blocks of each repository, by the sha1 of "file:line", printed with the six lines of code after each:
```sh
node - <<'JS'
const {execSync}=require('child_process'),fs=require('fs'),crypto=require('crypto');
for(const r of ['.github','api','app','canvas','engine','infra','learner-model','module-kit','modules','sim','skill-map','spec','tutor']){
 const files=execSync('git ls-files',{cwd:r}).toString().split('\n').filter(f=>/\.(go|ts|tsx|mjs|js)$/.test(f)&&!/(^|\/)(node_modules|vendor)\//.test(f)&&!/\.pb\.go$|_pb\.ts$/.test(f));
 const B=[];for(const f of files){const t=fs.readFileSync(r+'/'+f,'utf8');if(/Code generated|@generated/.test(t.split('\n').slice(0,10).join('\n')))continue;
  const L=t.split('\n'),c=s=>/^\s*(\/\/|\/\*|\*)/.test(s);for(let i=0;i<L.length;i++){if(!c(L[i]))continue;let j=i;while(j+1<L.length&&c(L[j+1]))j++;
  B.push({f,line:i+1,text:L.slice(i,j+1).map(s=>s.trim()).join('\n'),ctx:L.slice(j+1,j+7).join('\n'),k:crypto.createHash('sha1').update(f+':'+(i+1)).digest('hex')});i=j;}}
 B.sort((a,b)=>a.k<b.k?-1:1);for(const b of B.slice(0,8))console.log(`=== ${r}/${b.f}:${b.line} (${b.text.length} ch)\n${b.text}\n--- code:\n${b.ctx}\n`);}
JS
```

**The executors' sessions** — section 1.14.2: `tokens-report --classes` over the same folders, with the rows by kind under each group; the script `text-classes.mjs` gives the same, its rows by kind with `ALL=1`:
```sh
P=/home/vscode/.claude/projects; just tokens-report --since 2026-11-16 --until 2026-11-18T04:33 --classes $(ls -d $P/-workspaces-* | grep -v -- '--repos-' | xargs -n1 basename | sed 's/^/--project=/')
P=/home/vscode/.claude/projects; ALL=1 node text-classes.mjs 2026-11-16 2026-11-18T04:33 $(ls -d $P/-workspaces-* | grep -v -- '--repos-')
```

`text-classes.mjs`:
```js
// node text-classes.mjs <since> <until> <folder of transcripts>... — the main calls of the orchestrator's
// executors (entrypoint sdk-cli) whose session started in the window, until its end, by what each call did. Sums only.
import fs from 'node:fs';
const [since, until, ...dirs] = process.argv.slice(2);
const DOCS = /^(decisions|plan|architecture|docs other|archive|rules|readme|md other|several docs)$/;
const cls = (p) => {
  p = p.replace(/^\/workspaces\/[^/]+\//, '').replace(/^\.\//, '').replace(/^spec\//, '');
  if (p === 'docs/decisions.md') return 'decisions';
  if (p.startsWith('docs/plan/')) return 'archive';
  if (/^(RUN\.md|run\/|COORDINATION\.md)/.test(p)) return 'plan';
  if (p === 'docs/architecture.md') return 'architecture';
  if (/^docs\/.*\.md$/.test(p)) return 'docs other';
  if (/^(CLAUDE\.md|RULES\.md|AGENTS\.md|\.claude\/rules\/)/.test(p)) return 'rules';
  if (/(^|\/)README\.md$/.test(p)) return 'readme';
  return /\.md$/.test(p) ? 'md other' : 'code and data';
};
const PATH = /(?:^|[\s'"=(:<>])((?:\.{0,2}\/|[\w.-]+\/)*[\w.-]+\.(?:md|go|ts|tsx|mjs|js|cjs|json|ya?ml|proto|sh|css|html|txt)(?!\w)|(?:docs|run|src|internal|cmd|tools|format|contracts|deploy)\/[\w./-]+)/g;
const WRITE = /sed -i|perl -pi|(?<!=)>\s*[\w./-]+\.(md|go|ts|tsx|json|mjs|ya?ml)(?!\w)|\btee\b|writeFileSync|cat\s*>>?/;
function kind(b) {
  const i = b.input || {};
  if (['Read', 'Grep', 'Glob'].includes(b.name)) {
    const p = (i.file_path || i.path || '').replace(/^\/workspaces\/[^/]+\/?/, '').replace(/^spec\/?/, '');
    const c = p === '' || /^\/tmp\/|\.claude\/projects/.test(p) ? 'other' : { docs: 'docs other', 'docs/plan': 'archive', run: 'plan', '.claude/rules': 'rules' }[p.replace(/\/$/, '')] ?? cls(p);
    return c === 'other' ? 'other' : 'read ' + (DOCS.test(c) ? c : 'code and data');
  }
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(b.name)) return 'write ' + cls(i.file_path || i.notebook_path || '');
  if (b.name !== 'Bash') return b.name === 'StructuredOutput' ? 'status' : 'other';
  const cmd = i.command || '', named = [...cmd.matchAll(PATH)].map((m) => m[1]);
  const files = named.filter((f) => !f.startsWith('/tmp/') && !f.includes('.claude/projects'));
  const classes = [...new Set(files.map(cls))], docs = classes.filter((c) => DOCS.test(c)), write = WRITE.test(cmd);
  const prog = cmd.trim().replace(/^(cd [^&;]+&&\s*)+/, '');
  if (/^(git |gh )/.test(prog)) return 'git and gh';
  if (/^(just|npm|npx|go|buf)\b/.test(prog) && !write) return 'checks and builds';
  if (write && classes.includes('code and data')) return 'write code and data';
  if (docs.length) return (write ? 'write ' : 'read ') + (docs.length === 1 ? docs[0] : 'several docs');
  if (write) return named.some((f) => /^\/tmp\/.*\.md$/.test(f)) ? 'write md other' : 'write code and data';
  return classes.length ? 'read code and data' : 'other';
}
const group = (k) => (k === 'start' || k === 'status' ? k : /^(read|write) /.test(k) ? k.split(' ')[0] + (DOCS.test(k.slice(k.indexOf(' ') + 1)) ? ' docs' : ' code and data') : 'other');
const len = (c) => (typeof c === 'string' ? c.length : Array.isArray(c) ? c.reduce((s, x) => s + (x.text ? x.text.length : len(x.content)), 0) : 0);
const S = {}, add = (k, f, v) => ((S[k] ||= { carried: 0, output: 0, ms: 0 })[f] += v);
let sessions = 0, calls = 0, context = 0, output = 0, wall = 0, usd = 0, subUsd = 0;
for (const dir of dirs) for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
  const lines = fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
  const first = lines.find((e) => e.type === 'user' && !e.isSidechain);
  if (first?.entrypoint !== 'sdk-cli' || !(first.timestamp >= since && first.timestamp < until)) continue;
  const list = [], ids = new Map(), kinds = new Map(), bounds = [];
  let pending = [], prev = Date.parse(first.timestamp), cost;
  for (const e of lines) {
    if (e.timestamp >= until) break;
    if (e.type === 'cost-state') cost = e;
    if (e.isSidechain || !e.type) continue;
    if (e.type === 'system' && e.subtype === 'compact_boundary') bounds.push(list.length);
    const t = Date.parse(e.timestamp || '') || prev;
    if (e.type === 'assistant' && e.message?.model !== '<synthetic>') {
      const m = e.message, u = m.usage || {};
      let c = ids.get(m.id);
      if (!c) ids.set(m.id, (c = { start: prev, context: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), output: 0, kinds: [], before: pending })), list.push(c), (pending = []);
      c.end = t; c.output = Math.max(c.output, u.output_tokens || 0); c.usd = ((u.input_tokens || 0) * 4 + (u.cache_read_input_tokens || 0) * 0.2 + (u.cache_creation?.ephemeral_1h_input_tokens || 0) * 8 + (u.cache_creation?.ephemeral_5m_input_tokens || 0) * 5) / 1e6;
      for (const b of m.content || []) if (b.type === 'tool_use') { const k = kind(b); c.kinds.push(k); kinds.set(b.id, k); }
    } else if (e.type === 'user' && Array.isArray(e.message?.content)) {
      for (const b of e.message.content) if (b.type === 'tool_result') pending.push([len(b.content), kinds.get(b.tool_use_id) || 'other']);
    } else if (e.type === 'user' || e.type === 'attachment') pending.push([len(e.message?.content || e.rendered || ''), 'other']);
    prev = t;
  }
  sessions++; wall += cost?.totalDuration || 0;
  const sub = `${dir}/${f.slice(0, -6)}/subagents`, seen = new Map();
  for (const g of fs.existsSync(sub) ? fs.readdirSync(sub).filter((g) => g.endsWith('.jsonl')) : [])
    for (const l of fs.readFileSync(`${sub}/${g}`, 'utf8').split('\n')) {
      let e; try { e = JSON.parse(l); } catch { continue; }
      const u = e.message?.usage;
      if (e.type !== 'assistant' || !u || e.timestamp >= until) continue;
      if (!seen.has(e.message.id)) subUsd += ((u.input_tokens || 0) * 4 + (u.cache_read_input_tokens || 0) * 0.2 + (u.cache_creation?.ephemeral_1h_input_tokens || 0) * 8 + (u.cache_creation?.ephemeral_5m_input_tokens || 0) * 5) / 1e6;
      seen.set(e.message.id, Math.max(seen.get(e.message.id) || 0, u.output_tokens || 0));
    }
  for (const o of seen.values()) subUsd += (o * 20) / 1e6;
  // A result rides until the next compaction; what a compaction left is carried whole.
  const end = (i) => bounds.find((b) => b > i) ?? list.length;
  list.forEach((c, i) => {
    calls++; context += c.context; output += c.output; usd += c.usd + (c.output * 20) / 1e6;
    if (i === 0) add('start', 'carried', c.context * end(0));
    else if (bounds.includes(i)) add('after a compaction', 'carried', c.context * (end(i) - i));
    const ks = c.kinds.length ? c.kinds : ['other'];
    for (const k of ks) { add(k, 'output', c.output / ks.length); add(k, 'ms', (c.end - c.start) / ks.length); }
    const growth = i ? c.context - list[i - 1].context - list[i - 1].output : 0, chars = c.before.reduce((s, [x]) => s + x, 0);
    if (growth > 0 && chars > 0) for (const [x, k] of c.before) add(k, 'carried', ((growth * x) / chars) * (end(i) - i));
  });
}
const G = {};
for (const k in S) for (const f in S[k]) ((G[group(k)] ||= { carried: 0, output: 0, ms: 0 })[f] += S[k][f]);
const ms = Object.values(S).reduce((s, x) => s + x.ms, 0);
console.log(`${sessions} sessions, ${calls} main calls, ${(context / 1e6).toFixed(0)}M tokens of context, ${(output / 1e6).toFixed(2)}M output; wall ${(wall / 6e4 / sessions).toFixed(1)}, model ${(ms / 6e4 / sessions).toFixed(1)} min a session; $${(usd / sessions).toFixed(2)} a session at API prices, $${((usd - (output * 20) / 1e6) / sessions).toFixed(2)} of it input; subagents $${(subUsd / sessions).toFixed(2)} more`);
const row = (k, x) => console.log(`| ${k} | ${((100 * x.carried) / context).toFixed(1)}% | ${((100 * x.output) / output).toFixed(1)}% | ${((100 * x.ms) / ms).toFixed(1)}% | ${(x.ms / 6e4 / sessions).toFixed(1)} |`);
console.log('| What a call did | Context it carried | Output | Model time | Model minutes a session |');
for (const k of Object.keys(G).sort((a, b) => G[b].carried - G[a].carried)) row(k, G[k]);
if (process.env.ALL) for (const k of Object.keys(S).sort((a, b) => S[b].carried - S[a].carried)) row('  ' + k, S[k]);
```

### 1.15. The time of the executors' tasks, 2026-11-18

Where the time of the orchestrator's executors goes besides the model — the loops of tests and CI, the cores of the container, the waits on long runs — and what would shorten it. Measured 2026-11-18 on the volume `novatrail-claude`, read-only: the transcripts of the executors, the runs of `tools/orchestrator` and the sampler of CPU of the epic `coord-2026-11-16`; and on the GitHub API, read-only. Nothing was changed in any repository. The commands are section 1.15.6. The orchestrator's choices on В66–В68, each by the recommendation and before the author's check, are a decision of `spec`'s log.

**The sample.** Every session of an executor, `entrypoint: sdk-cli`, that started from 2026-11-16T00:00 to 2026-11-18T05:30 UTC, read until 05:30: 230 sessions of 3 minutes or more, 116.7 hours. One task of `learner-model` is left out: 694 minutes, most of them runs of `sim` (section 1.13).
- *Active time* is the session's wall time without its gaps of more than 15 minutes with no tool call outstanding: those are waits for a resume, not the model.
- A stretch with a tool call outstanding goes to the call's class, shared when calls overlap; the rest is *the model*. The class comes from the command, `RULES` of `durations.mjs`. A loop that waits on a command the session put into the background takes the class of that command.

**The answer in short.**
- A task takes 30.4 minutes of active time: the model 13.9, the wait on GitHub's checks 7.7, the review 2.8, the local checks 3.7, the task's own long runs 1.5, the rest 1.0 (section 1.15.1).
- The checks of GitHub are the largest part after the model, a quarter of the time. About 3.2 minutes of a task's 7.7 are rounds after the first. The bookkeeping — «Сделано», the archive, the mark — started 40 of 150 such rounds; the fixes of the review started 39 (section 1.15.2).
- The local checks are 12% of the time, and 21% in `app`. The cores are not what limits a task. The container of `app` sat under one core in 79% of its samples, because it waited on the model or on GitHub. During `just ci` it took 5.9 cores on average, 15.4 at most (section 1.15.3).
- Under `claude -p --json-schema` a wait in the background often lost its result. Until the orchestrator asked for the wait in the foreground, 59 of 301 attempts ended with a background command stopped after their last status, 49 of them a wait on CI. With that word, 0 of 17 did (section 1.15.4).
- What the changes give, by what was measured: about 1.1 minutes of a task's 30, up to 2 in `app`, a round of CI in the tasks whose fix only CI checked, and the end of the lost waits. The rest is the model and the first round of CI (section 1.15.5).

#### 1.15.1. Where a task's time goes

Minutes a session, by repository:
- *CI* is every call that waits on or reads the checks of GitHub, SonarCloud's and codecov's included;
- *review* is `/code-review`, with the few subagents, 0.1% of the time;
- *local* is the local checks: tests, `just ci*`, `mockup-compare`, the checks of documents, lint, types and builds;
- *own runs* is a task's own long runs, such as `sim`'s and `tutor-eval`'s.

| Repository | Sessions | Active | Model | CI | Review | Local | Own runs | Rest |
|---|---|---|---|---|---|---|---|---|
| `.github` | 17 | 38.6 | 17.2 | 8.3 | 2.9 | 6.6 | 1.8 | 1.7 |
| `api` | 20 | 25.7 | 10.4 | 6.5 | 2.3 | 3.9 | 1.4 | 1.1 |
| `app` | 35 | 39.4 | 18.2 | 8.3 | 2.5 | 8.4 | 1.2 | 0.6 |
| `canvas` | 14 | 39.5 | 21.1 | 11.7 | 2.7 | 3.2 | 0.1 | 0.5 |
| `engine` | 11 | 20.4 | 8.1 | 7.1 | 2.2 | 1.3 | 1.3 | 0.5 |
| `infra` | 27 | 23.9 | 12.9 | 5.1 | 2.4 | 2.1 | 0.0 | 1.3 |
| `learner-model` | 14 | 28.0 | 13.3 | 6.2 | 2.6 | 1.8 | 3.1 | 0.9 |
| `module-kit` | 11 | 29.5 | 10.5 | 7.4 | 2.1 | 4.1 | 4.1 | 1.2 |
| `modules` | 10 | 31.3 | 10.3 | 7.3 | 4.6 | 2.6 | 5.1 | 1.5 |
| `sim` | 15 | 29.1 | 12.9 | 9.0 | 2.9 | 2.1 | 0.6 | 1.7 |
| `skill-map` | 13 | 27.5 | 10.8 | 13.2 | 1.9 | 1.1 | 0.1 | 0.5 |
| `spec` | 22 | 28.8 | 13.6 | 7.2 | 3.9 | 2.3 | 0.3 | 1.5 |
| `tutor` | 21 | 27.5 | 13.2 | 5.4 | 3.1 | 2.1 | 3.1 | 0.6 |
| All | 230 | 30.4 | 13.9 | 7.7 | 2.8 | 3.7 | 1.5 | 1.0 |

- Over all of it: the model 45.5%, CI 25.1%, the review 9.0%, tests 5.3%, own runs 4.9%, `just ci*` 3.2%, other shell 2.8%, the checks of documents 1.9%, `mockup-compare` 1.1%.
- The tutor's panel, `app`, by the same classes: 110.6 minutes — the model 40.6, tests 20.0, CI 19.2, `mockup-compare` 13.9, `just ci*` 12.6, the review 3.6. Section 1.14.3 counted it by hand: the model 39.3, tests 21.4, CI 19.1, the mockup 12.1.

#### 1.15.2. CI: the rounds and their causes

Every pull request of the 13 repositories merged from 2026-11-16T00:00 to 2026-11-18T05:30 UTC, but Dependabot's, by the GitHub API:
- *runs* is the runs of the workflow CI on its branch, one for each push;
- *CI* is the minutes of the last commit's longest run of CI;
- *all checks* runs from that commit's first check to its last check or status, codecov's and SonarCloud's included.

| Repository | Pull requests | Runs a pull request | CI, median | All checks, median |
|---|---|---|---|---|
| `.github` | 18 | 1.2 | 1.9 | 2.5 |
| `api` | 20 | 1.4 | 5.8 | 6.8 |
| `app` | 34 | 2.2 | 4.1 | 5.0 |
| `canvas` | 15 | 1.6 | 3.0 | 9.1 |
| `engine` | 11 | 1.8 | 6.5 | 6.4 |
| `infra` | 36 | 1.4 | 3.0 | 3.0 |
| `learner-model` | 15 | 1.4 | 7.3 | 7.2 |
| `module-kit` | 10 | 1.6 | 3.5 | 4.7 |
| `modules` | 10 | 1.5 | 6.0 | 6.3 |
| `sim` | 15 | 1.6 | 8.4 | 8.3 |
| `skill-map` | 12 | 1.6 | 4.0 | 5.5 |
| `spec` | 25 | 1.9 | 3.0 | 3.8 |
| `tutor` | 21 | 1.2 | 3.6 | 4.2 |
| All | 242 | 1.6 | 4.2 | 5.3 |

Every CI of a pull request cancels its older run on a new push: `concurrency` with `cancel-in-progress` in `.github/workflows/ci.yml` of each repository on `main`, `self-ci.yml` in `.github`.

**Why another round.** The executors pushed 150 times after their pull request was opened. Each push is classed by its commit's message, and its minutes are the time of the class CI of section 1.15.1 until its next push, in the same 230 sessions:

| Cause, by the message | Pushes | Minutes of CI waited after them |
|---|---|---|
| a fix of the task's code — after CI, SonarCloud or the review, which the message does not tell | 50 | 217 |
| the review: "Fix the review", `Close the review of T68` | 39 | 215 |
| the bookkeeping: «Сделано», the archive, the mark, the answers — `Mark T82 done, move its body to the archive of E5` | 40, in 38 sessions | 251 |
| the same message again: an amend, or a second push | 10 | 33 |
| coverage or tests | 6 | 18 |
| SonarCloud or CodeQL | 5 | 13 |
| All | 150 | 747 |

- 747 minutes are 3.2 of a task's 7.7 minutes of CI. The first round, 4.5 minutes, is how fast CI is (sections 3.1 and 3.2).
- 145 sessions ran the review before their first push and 59 after it. With `cancel-in-progress` the order changes little: a review after the push overlaps CI, and its fix starts the next round when the fix would have started it anyway.
- The local rerun after a fix covers less than CI. In the tutor's panel, `app`, a fix of SonarCloud's S6845 broke a check of axe at 320 px, which only CI ran: 27 minutes (section 1.14.3). After an edit the executors of `app` ran tests at a median 0.8 cores (section 1.15.3), one file or one project, where CI runs three engines and the comparison with the mockup.

#### 1.15.3. The local checks and the cores

The container of `app`, `festive_shannon`, by the log `cpu-festive_shannon.log` of the epic's folder: a sample of its CPU about every 11 seconds, 100% a core — the samples reach 1,571% —, from 03:46:03 to 05:44:28 UTC on 2026-11-18. That is 644 samples, while three tasks of `app`, the tutor's panel among them, ran in it. Each sample is classed by what the session was doing at that moment.

| What the session did | Samples | Cores, mean | Median | The most |
|---|---|---|---|---|
| model or idle | 291 | 0.0 | 0.0 | 2.1 |
| ci wait | 119 | 0.0 | 0.0 | 0.2 |
| mockup | 69 | 4.8 | 5.9 | 9.0 |
| tests | 65 | 2.1 | 0.8 | 15.7 |
| just ci | 63 | 5.9 | 4.2 | 15.4 |
| review | 32 | 0.0 | 0.0 | 0.2 |
| lint, types, build | 2 | 2.5 | 2.5 | 3.9 |
| install | 1 | 0.2 | 0.2 | 0.2 |
| other shell | 1 | 0.3 | 0.3 | 0.3 |
| docs checks | 1 | 1.0 | 1.0 | 1.0 |

- Mean 1.33 cores of the host's 20, and 507 samples of 644, 79%, under one core. The container idles while the model works, while GitHub runs CI and while the review runs.
- `just ci` of `app` runs its recipes one after another: `ci: ci-lint ci-test ci-engines ci-vuln ci-licenses`. In CI they are jobs side by side. The steps of run 44241161972 of `app`'s CI on `main`, 2026-11-18, took 132 s `ci-test`, 285 s `ci-engines`, 15 s `ci-licenses`, and under 30 s each lint and vuln: 285 s of about 460.
  - just 1.58.0, the version of the image, runs a recipe's dependencies at once with `[parallel]` ([README](https://github.com/casey/just/blob/1.58.0/README.md#parallelism), at the tag 1.58.0).
  - A full run would be at most 38% shorter, less what the engines take from each other on the same cores. `just ci*` take 2.0 minutes a task of `app`, some of it single recipes, so it gives under 0.8 minutes a task of `app`.
- Tests: 2.1 cores on average and 0.8 at the median. The executor runs one file or one project after an edit, and one file is one worker of Vitest in one engine.
- The host is shared: up to 13 executors ran at once (section 1.13), and measurements 3.2 saw a load average of 58–104 on its 20 cores. More cores for one container would take them from another.

#### 1.15.4. Waiting under `claude -p`

An executor runs as `claude -p --output-format stream-json --json-schema`, with Claude Code 2.1.280.
- A turn that ends without the tool `StructuredOutput` gets the message "[structured-output-enforce] You MUST call the StructuredOutput tool to complete this request. Call this tool now.", as the transcripts below show. `ScheduleWakeup` answers "Next wakeup scheduled for 18:48:00 (in 1501s). Nothing more to do this turn — the harness re-invokes you when the wakeup fires or a task-notification arrives." (a task of `app`, 2026-11-17), and the message followed four seconds later.
- So a turn that ends to wait for a background command, a Monitor or a `ScheduleWakeup`, as RULES.md asks, is made to give its status at once. The status then says the checks are not finished.
  - In the transcripts: 121 forced statuses after such a wait, in 72 sessions.
  - Of 117 waits, 79 went on: 78 by the notification of the background work, the run kept open for it ([Run Claude Code programmatically](https://code.claude.com/docs/en/headless.md), "Background tasks at exit"), and one by the orchestrator's prompt. 38 ended there.
- In the streams of the runs, by the attempts that had ended by 06:30 UTC. A background command stopped shows as `{"type":"system","subtype":"task_updated",…,"patch":{"status":"killed",…}}` and then `"subtype":"task_notification",…,"status":"stopped"`, with no later turn; a notification that starts another turn leaves more than one `result`:

| Prompts | Attempts with a result | A background command stopped after the last result | Of them, a wait on CI | More than one result | Both |
|---|---|---|---|---|---|
| before the word to wait in the foreground | 301 | 59 | 49 | 52 | 13 |
| with it, from 2026-11-18T02:23 | 17 | 0 | 0 | 0 | 0 |

- The word is a paragraph of the orchestrator's prompt: long work runs in the foreground, under Bash's `timeout` of 600000 ms, the call repeated until it is done.
  - The ceiling of a foreground command is ten minutes by default, `BASH_MAX_TIMEOUT_MS` ([Tools reference](https://code.claude.com/docs/en/tools-reference.md)). A command that reaches its timeout moves to the background — "Command did not complete within its 600s timeout and was moved to the background", seen 2026-11-18 —, so a wait runs under `timeout 590` in its own command.
  - Each call of the wait is one main call, which reads the context from the cache. At the 146 thousand tokens of an average call (section 1.14.2) that is $0.03, so a task's 7.7 minutes of CI cost one or two such calls.
  - Against the task of `learner-model` left out of the sample, which waited by short loops in 76 calls, that is one call each ten minutes.
- What it changes:
  - The rule of long runs of `spec`'s log and of RULES.md holds for a session a person leads. A session of `claude -p` with a schema gives its status whenever a turn ends, and whether the run then waits for the background work is not up to it: 38 of 117 waits ended there.
  - `tools/orchestrator/executor.md` says none of it; the orchestrator's prompt does. In the contract, which the orchestrator gives every run, it would hold over RULES.md for the executor.
  - The orchestrator could also keep the tools away: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` takes `run_in_background` off Bash and the subagents, but Monitor still runs in the background ([Environment variables](https://code.claude.com/docs/en/env-vars.md)). Whether 2.1.280 honours it was not tried.

#### 1.15.5. The proposals and what they give

| Proposal | Minutes a task | What changes | Question |
|---|---|---|---|
| The executor waits in the foreground: `timeout 590` inside, Bash's `timeout` 600000 ms, repeated; never `run_in_background`, Monitor or `ScheduleWakeup` for a wait | 0 of time; the lost waits, 59 of 301 attempts, go | `executor.md`; two decisions of `spec`; one clause of RULES.md | В66 |
| The bookkeeping goes into the round of CI that is waited for: «Сделано», the archive and the mark committed before the wait, the pull request's number in them, and a push after a green CI only for what a check found | 1.1 on average; 6.6 in the 38 tasks that pushed it after | `executor.md` | В67 |
| After a fix that follows a finding of CI, SonarCloud or the review, the recipe of CI that covers the changed files, not one file | not measured; 27 in the tutor's panel | `executor.md` | В67 |
| `[parallel]` for `just ci` where its recipes are independent, as in `app` | under 0.8 in `app` | the justfiles of the repositories | В68 |

- Not proposed:
  - The order of the review and the push: with `cancel-in-progress` it changes little (section 1.15.2).
  - A shorter interval of polling: the executors poll every 20–30 s, so it would give seconds a round.
  - The executor not waiting on CI at all, leaving it to the orchestrator: a failure would then resume the session and write its context to the cache again, $0.7–1.2 at 146 thousand tokens and $5–8 a million (section 1.2), against $0.03 a call of the wait.
- What stays is the first round of CI, 4.5 minutes a task: the gates of `sim`, `engine` and `learner-model` and the tests of `api` (sections 3.1 and 3.2). No new estimate here.

#### 1.15.6. The commands

In a folder with the scripts below; `run.sh` prints the numbers of section 1.15. What it reads from the GitHub API, `prci.tsv` by `prci.sh` and the steps of a run of `app`'s CI, runs once, as its comments say. The transcripts are read only up to 05:30, and the runs only by the attempts that had ended by 06:30, so a later run gives the same numbers.

`run.sh`:
```sh
#!/bin/bash
# run.sh — the numbers of measurements 1.15 from the transcripts and the runs on the volume novatrail-claude.
cd "$(dirname "$0")"; S=2026-11-16; U=2026-11-18T05:30
P=/home/vscode/.claude/projects; D=$(ls -d $P/-workspaces-* | grep -v -- '--repos-')
node durations.mjs $S $U $D | grep -v -P '^learner-model\tT61\t' > s.tsv
node table.mjs s.tsv; node agg.mjs s.tsv | head -15; grep -P '^app\tT87\t' s.tsv | cut -f4,5
node forced.mjs $S $U $D; node order.mjs $S $U $D
PUSHES=1 node durations.mjs $S $U $D | grep -v -P '^learner-model\tT61\t' > why.tsv
awk -F'\t' '{m=$4; k = (m=="") ? "same message" : (m ~ /[Rr]eview/) ? "review" : (m ~ /Sonar|S[0-9][0-9][0-9][0-9]|CodeQL|duplicat/) ? "SonarCloud or CodeQL" : (m ~ /^(Mark|Move|Record|Name|Archive|Close)|archive|[Dd]one/) ? "bookkeeping" : (m ~ /[Cc]over|test/) ? "coverage or tests" : "other"; n[k]++; c[k]+=$5; if (!((k, $3) in seen)) { seen[k, $3]; s[k]++ } t++; tc+=$5} END {for (k in n) printf "%s: %d pushes in %d sessions, %.0f min of CI wait after them\n", k, n[k], s[k], c[k]; printf "all: %d pushes, %.0f min\n", t, tc}' why.tsv
node streams.mjs /home/vscode/.claude/novatrail-orchestrator/runs 20261118T063000Z
# How often the executors poll the checks, over all the transcripts of the folders.
for d in $D; do cat $d/*.jsonl; done | grep -oE 'gh pr checks [^"]{0,200}' | grep -oE -- '--interval [0-9]+|sleep [0-9]+' | sort | uniq -c | sort -rn | head -5
# Once, by the GitHub API: for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do ./prci.sh $r; done > prci.tsv
node prci-table.mjs prci.tsv
# Once, by the GitHub API: the steps of over 10 s of each job of app's run of CI 44241161972.
# gh api repos/altnovatrail/app/actions/runs/44241161972/jobs --jq '.jobs[] | [.name, ([.steps[] | select(((.completed_at|fromdateiso8601) - (.started_at|fromdateiso8601)) > 10) | "\(.name)=\((.completed_at|fromdateiso8601) - (.started_at|fromdateiso8601))s"] | join(", "))] | @tsv'
# The container of app: the samples of 03:46:03–05:44:28 UTC, and the three tasks of app that ran in it, the tutor's panel among them.
awk '$1 >= "03:46" && $1 <= "05:44:28"' $HOME/.claude/novatrail-orchestrator/epics/coord-2026-11-16/cpu-festive_shannon.log > cpu.log
node cpu.mjs cpu.log 2026-11-18 $P/-workspaces-app/{760b18b4-ed79-4cfe-a440-4c3fd8d8bea1,74ad0bae-b3f0-4dc0-9b95-b6cfaefcb927,41acb6b3-3868-4629-90d1-195ba5c554e9}.jsonl
awk '{v = $2 + 0; n++; s += v; if (v < 100) lo++; if (v > m) m = v} END {printf "%d samples, mean %.2f cores, %d under one core, the most %.0f%%\n", n, s/n/100, lo, m}' cpu.log
```

`durations.mjs`:
```js
// node durations.mjs <since> <until> <folder>... — the wall time of the orchestrator's executors (entrypoint sdk-cli)
// whose session started in the window, by what it waited on: the model, or a tool call by its class. Prints one TSV row
// a session — repo, task, start, active minutes, then minutes by class, forced statuses, of them after a background wait.
// With PUSHES=1 it prints instead each push after the session opened its pull request: repo, task, session, the first
// line of the commit message pushed, and the minutes of the class "ci wait" from that push to the next.
import fs from 'node:fs';
const [since, until, ...dirs] = process.argv.slice(2);
const IDLE = 15 * 60e3; // a gap with no tool outstanding longer than this is a wait for a resume, not the model
const RULES = [
  ['ci wait', /gh (pr checks|run (watch|view|list))|check-runs|\/statuses|\/status\b|codecov|sonarcloud|issues\/search|statusCheckRollup/],
  ['background wait', /^(until|while)\b|\bpgrep\b|\.output\b|^sleep\b|\bsleep [0-9]+; *(done|cat|tail)/],
  ['mockup', /mockup/],
  ['just ci', /\bjust (-f \S+ )?ci(-[\w-]+)?\b/],
  ['tests', /vitest|playwright|\bgo test\b|npm (run )?test|node --test|tests\/run\.sh|\bjust (-f \S+ )?(test|e2e)[\w-]*\b|\bbats\b/],
  ['docs checks', /docs-check|translation-check|legal-check|consent-age-check|export-check|admission-check/],
  ['lint, types, build', /\btsc\b|eslint|golangci|go vet|go build|npm run (build|lint|typecheck)|\bbuf (lint|generate|breaking|build)|staticcheck|\bjust (-f \S+ )?(lint|build|check|fmt|gen)[\w-]*\b/],
  ['install', /npm (ci|install)\b|go mod (download|tidy)/],
  ['git and gh', /^(git|gh) /],
];
const bgClass = new Map(); // a background command's ID -> the class of what it runs
const rule = (c, skip) => { for (const [k, re] of RULES) if (k !== skip && re.test(c)) return k; return 'other shell'; };
const klass = (u) => {
  if (u.name === 'Skill') return /review/.test(u.input?.skill || '') ? 'review' : 'other tools';
  if (u.name === 'Agent') return 'subagents';
  if (u.name !== 'Bash') return 'other tools';
  if (u.input?.run_in_background) return 'other tools';
  const c = (u.input?.command || '').replace(/^\s*(cd [^&;]+(&&|;)\s*)+/, '').replace(/^([A-Z_]+=\S* )+/, '').replace(/^timeout \d+ /, '');
  const k = rule(c);
  if (k !== 'background wait') return k;
  // A wait on a command of its own in the background: the class of that command, by its ID, else by what the wait names.
  const id = (c.match(/tasks\/(\w+)\.output/) || [])[1];
  if (id && bgClass.has(id)) return bgClass.get(id);
  const named = rule(c, 'background wait');
  return ['other shell', 'git and gh'].includes(named) ? 'own runs' : named;
};
const BG = (u) => u.input?.run_in_background || ['Monitor', 'ScheduleWakeup'].includes(u.name);
for (const dir of dirs) for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
  const L = fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
  const first = L.find((e) => e.type === 'user' && !e.isSidechain);
  if (first?.entrypoint !== 'sdk-cli' || !(first.timestamp >= since && first.timestamp < until)) continue;
  const q = L.find((e) => e.type === 'queue-operation' && e.content);
  const task = ((q?.content || JSON.stringify(first.message.content)).match(/T\d+/) || ['?'])[0];
  const repo = dir.replace(/.*-workspaces-/, '').replace(/^-github$/, '.github');
  const open = new Map(), spans = [], times = [];
  let forced = 0, forcedBg = 0, lastUses = [], pr = false, msg = '';
  const pushes = [];
  for (const e of L) {
    if (e.timestamp >= until) break;
    if (e.isSidechain || !e.timestamp || e.type === 'queue-operation') continue;
    const t = Date.parse(e.timestamp); times.push(t);
    if (e.type === 'assistant') for (const b of e.message?.content || []) if (b.type === 'tool_use') {
      open.set(b.id, { t, k: klass(b), u: b }); lastUses = [...lastUses.slice(-2), b];
      const c = b.name === 'Bash' ? b.input?.command || '' : '';
      const m = c.match(/git commit[\s\S]*?<<'?EOF'?\n([^\n]{0,110})/) || c.match(/git commit[^\n]*?-m\s+["']([^"'\n]{0,110})/);
      if (m) msg = m[1];
      if (/gh pr create/.test(c)) pr = true;
      else if (pr && /git push/.test(c) && !/--delete/.test(c)) pushes.push({ t, msg, ci: 0 }), (msg = '');
    }
    if (e.type === 'user' && Array.isArray(e.message?.content)) for (const b of e.message.content) if (b.type === 'tool_result' && open.has(b.tool_use_id)) { const o = open.get(b.tool_use_id);
      const bid = (JSON.stringify(b.content).match(/running in background with ID: (\w+)/) || [])[1];
      if (bid && o.u) { const c = (o.u.input.command || '').replace(/^\s*(cd [^&;]+(&&|;)\s*)+/, ''); const k = rule(c); bgClass.set(bid, ['other shell', 'git and gh', 'background wait'].includes(k) ? 'own runs' : k); } open.delete(b.tool_use_id); spans.push([o.t, t, o.k]); }
    if (e.type === 'user' && typeof e.message?.content === 'string' && e.message.content.startsWith('[structured-output-enforce]')) { forced++; if (lastUses.some(BG)) forcedBg++; }
  }
  const M = {}; let active = 0;
  for (let i = 1; i < times.length; i++) {
    const [a, b] = [times[i - 1], times[i]]; if (b <= a) continue;
    const on = spans.filter(([s, e]) => s <= a && e >= b);
    if (on.length) for (const [, , k] of on) {
      M[k] = (M[k] || 0) + (b - a) / on.length;
      const p = k === 'ci wait' && pushes.findLast((x) => x.t <= a);
      if (p) p.ci += (b - a) / on.length;
    }
    else if (b - a > IDLE) continue;
    else M.model = (M.model || 0) + (b - a);
    active += b - a;
  }
  if (process.env.PUSHES) { if (active >= 3 * 6e4) for (const p of pushes) console.log([repo, task, f.slice(0, 8), p.msg, (p.ci / 6e4).toFixed(1)].join('\t')); continue; }
  console.log([repo, task, first.timestamp.slice(0, 16), (active / 6e4).toFixed(1), JSON.stringify(Object.fromEntries(Object.entries(M).map(([k, v]) => [k, +(v / 6e4).toFixed(2)]))), forced, forcedBg].join('\t'));
}
```

`table.mjs`:
```js
// node table.mjs <sessions.tsv> — per repository, minutes a session: active, the model, CI, the review, the local checks, own runs, the rest.
import fs from 'node:fs';
const G = { model: ['model'], ci: ['ci wait'], review: ['review', 'subagents'], local: ['tests', 'just ci', 'mockup', 'docs checks', 'lint, types, build', 'install'], own: ['own runs'] };
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => l.split('\t')).filter((r) => +r[3] >= 3);
const by = {}; for (const r of rows) (by[r[0]] ||= []).push(r); by.All = rows;
for (const k of Object.keys(by).sort((a, b) => (a === 'All') - (b === 'All') || a.localeCompare(b))) {
  const v = by[k], n = v.length, act = v.reduce((s, r) => s + +r[3], 0) / n, sum = (ks) => v.reduce((s, r) => { const m = JSON.parse(r[4]); return s + ks.reduce((t, x) => t + (m[x] || 0), 0); }, 0) / n;
  const c = Object.fromEntries(Object.entries(G).map(([g, ks]) => [g, sum(ks)])), rest = act - Object.values(c).reduce((s, x) => s + x, 0);
  console.log(`| ${k === 'All' ? 'All' : '`' + k + '`'} | ${n} | ${act.toFixed(1)} | ${c.model.toFixed(1)} | ${c.ci.toFixed(1)} | ${c.review.toFixed(1)} | ${c.local.toFixed(1)} | ${c.own.toFixed(1)} | ${rest.toFixed(1)} |`);
}
```

`agg.mjs`:
```js
// node agg.mjs <sessions.tsv> [repo] — minutes by class: total, share, per session; the sessions of one repository with a repo.
import fs from 'node:fs';
const [file, repo] = process.argv.slice(2);
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => l.split('\t')).filter((r) => !repo || r[0] === repo).filter((r) => +r[3] >= 3);
const S = {}; let act = 0, forced = 0, forcedBg = 0, withF = 0;
for (const r of rows) { act += +r[3]; const m = JSON.parse(r[4]); for (const k in m) S[k] = (S[k] || 0) + m[k]; forced += +r[5]; forcedBg += +r[6]; if (+r[6]) withF++; }
console.log(`${rows.length} sessions of 3 min or more, ${(act / 60).toFixed(1)} h active, ${(act / rows.length).toFixed(1)} min a session; enforced statuses ${forced}, ${forcedBg} after a background wait, in ${withF} sessions`);
for (const k of Object.keys(S).sort((a, b) => S[b] - S[a])) console.log(`| ${k} | ${(S[k] / 60).toFixed(1)} | ${((100 * S[k]) / act).toFixed(1)}% | ${(S[k] / rows.length).toFixed(1)} |`);
```

`forced.mjs`:
```js
// node forced.mjs <since> <until> <folder>... — each forced status after a wait in the background (a background
// command, Monitor or ScheduleWakeup among the last three tool calls): whether the session was resumed after it,
// the minutes to that resume, and the first words of the resume's prompt.
import fs from 'node:fs';
const [since, until, ...dirs] = process.argv.slice(2);
const out = { events: 0, sessions: new Set(), resumed: 0, gaps: [], prompts: {} };
for (const dir of dirs) for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
  const L = fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
  const first = L.find((e) => e.type === 'user' && !e.isSidechain);
  if (first?.entrypoint !== 'sdk-cli' || !(first.timestamp >= since && first.timestamp < until)) continue;
  let last = [], pending = null, kind = '';
  for (const e of L) {
    if (e.timestamp >= until) break;
    if (e.isSidechain) continue;
    if (e.type === 'assistant') for (const b of e.message?.content || []) if (b.type === 'tool_use') last = [...last.slice(-2), b];
    const txt = typeof e.message?.content === 'string' ? e.message.content : '';
    if (e.type === 'user' && txt.startsWith('[structured-output-enforce]') && last.some((b) => b.input?.run_in_background || ['Monitor', 'ScheduleWakeup'].includes(b.name))) {
      out.events++; out.sessions.add(f); if (!pending) { pending = Date.parse(e.timestamp); kind = last.filter((b) => b.input?.run_in_background || ['Monitor', 'ScheduleWakeup'].includes(b.name)).map((b) => b.name === 'Bash' ? 'background Bash' : b.name).join('+'); }
    } else if (pending && e.type === 'queue-operation' && e.operation === 'enqueue') {
      out.resumed++; out.gaps.push((Date.parse(e.timestamp) - pending) / 6e4);
      const k = kind + ' -> ' + ((e.content || '').startsWith('<task-notification>') ? 'notification' : 'prompt: ' + (e.content || '').slice(0, 50).replace(/\s+/g, ' ')); out.prompts[k] = (out.prompts[k] || 0) + 1; pending = null;
    }
  }
  if (pending) { const k = kind + ' -> nothing: the run ended'; out.prompts[k] = (out.prompts[k] || 0) + 1; }
}
out.gaps.sort((a, b) => a - b);
console.log(`${out.events} forced statuses after a background wait, in ${out.sessions.size} sessions; ${out.resumed} resumes after one; minutes to the resume: median ${(out.gaps.length % 2 ? out.gaps[out.gaps.length >> 1] : (out.gaps[out.gaps.length / 2 - 1] + out.gaps[out.gaps.length / 2]) / 2).toFixed(0)}, sum ${out.gaps.reduce((s, x) => s + x, 0).toFixed(0)}`);
for (const [k, n] of Object.entries(out.prompts).sort((a, b) => b[1] - a[1])) console.log(`${n}\t${k}`);
```

`order.mjs`:
```js
// node order.mjs <since> <until> <folder>... — whether each executor's review ran before its first push or after it.
import fs from 'node:fs';
const [since, until, ...dirs] = process.argv.slice(2);
const C = {};
for (const dir of dirs) for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
  const L = fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
  const first = L.find((e) => e.type === 'user' && !e.isSidechain);
  if (first?.entrypoint !== 'sdk-cli' || !(first.timestamp >= since && first.timestamp < until)) continue;
  let push = null, review = null;
  for (const e of L) if (!(e.timestamp >= until) && !e.isSidechain && e.type === 'assistant') for (const b of e.message?.content || []) if (b.type === 'tool_use') {
    if (!push && b.name === 'Bash' && /git push/.test(b.input.command || '')) push = e.timestamp;
    if (!review && b.name === 'Skill' && /review/.test(b.input.skill || '')) review = e.timestamp;
  }
  const k = !review ? (push ? 'no review' : 'neither') : !push ? 'review, no push' : review < push ? 'review before the first push' : 'review after the first push';
  C[k] = (C[k] || 0) + 1;
}
console.log(C);
```

`streams.mjs`:
```js
// node streams.mjs <runs folder> <until, YYYYMMDDTHHMMSSZ> — the attempts of the orchestrator's runs started before it,
// by whether their prompt asked for the wait in the foreground: how many printed a result, how many had a background
// command stopped after their last result (of them, a wait on CI), how many printed more than one result, and how many
// did both; an
// attempt counts once its exit-<n> was written before the time.
import fs from 'node:fs';
const [dir, until] = process.argv.slice(2);
const end = Date.parse(until.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/, '$1-$2-$3T$4:$5:$6Z'));
const C = {};
for (const d of fs.readdirSync(dir)) {
  if (!(d.slice(-16) < until)) continue;
  const p = `${dir}/${d}/prompt-1.txt`;
  const k = fs.existsSync(p) && /переднем плане/.test(fs.readFileSync(p, 'utf8')) ? 'foreground' : 'before';
  for (const f of fs.readdirSync(`${dir}/${d}`).filter((f) => /^stream-\d+\.jsonl$/.test(f))) {
    const exit = `${dir}/${d}/exit-${f.match(/\d+/)[0]}`;
    if (!fs.existsSync(exit) || fs.statSync(exit).mtimeMs >= end) continue;
    const L = fs.readFileSync(`${dir}/${d}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
    let last = -1, n = 0; L.forEach((e, i) => { if (e.type === 'result') { last = i; n++; } });
    if (last < 0) continue;
    const c = (C[k] ||= { attempts: 0, stopped: 0, ci: 0, woken: 0, both: 0 }); c.attempts++;
    const st = L.slice(last + 1).filter((e) => e.subtype === 'task_notification' && e.status === 'stopped');
    if (st.length) c.stopped++; if (st.some((e) => /gh pr checks|gh run/.test(e.summary || ''))) c.ci++; if (n > 1) c.woken++; if (st.length && n > 1) c.both++;
  }
}
console.log(C);
```

`prci.sh`:
```sh
#!/bin/bash
# prci.sh <repo> — for each pull request of altnovatrail/<repo> merged from 2026-11-16, by the GitHub API: its number,
# the runs of the workflow CI on its branch (one a push), the minutes of the last from its start to its end, and the
# minutes from the last commit's first check to the last check or status of that commit (codecov, SonarCloud included).
r=$1
gh pr list -R altnovatrail/$r --state merged --search 'merged:2026-11-16T00:00:00Z..2026-11-18T05:30:00Z' --limit 100 --json number,headRefName,headRefOid,author --jq '.[] | select(.author.login != "app/dependabot") | [.number, .headRefName, .headRefOid] | @tsv' |
while IFS=$'\t' read -r n br sha; do
  runs=$(gh api "repos/altnovatrail/$r/actions/runs?branch=$br&event=pull_request&per_page=100" --jq '[.workflow_runs[] | select(.name=="CI")] | length')
  last=$(gh api "repos/altnovatrail/$r/actions/runs?head_sha=$sha&per_page=100" --jq '[.workflow_runs[] | select(.name=="CI") | ((.updated_at|fromdateiso8601) - (.run_started_at|fromdateiso8601))/60] | max // 0')
  span=$(gh api "repos/altnovatrail/$r/commits/$sha/check-runs?per_page=100" --jq '[.check_runs[] | select(.completed_at) | [(.started_at|fromdateiso8601), (.completed_at|fromdateiso8601)]] | [ (map(.[0])|min), (map(.[1])|max) ] | @tsv')
  st=$(gh api "repos/altnovatrail/$r/commits/$sha/statuses?per_page=100" --jq '[.[] | .updated_at|fromdateiso8601] | max // 0')
  echo "$span" | awk -v r=$r -v n=$n -v runs=$runs -v last=$last -v st=$st '{e=$2; if (st>e) e=st; printf "%s\t%s\t%d\t%.1f\t%.1f\n", r, n, runs, last, (e-$1)/60}'
done
```

`prci-table.mjs`:
```js
// node prci-table.mjs <prci.tsv> — per repository: pull requests, runs of CI a pull request, the medians of its last CI and of all its checks.
import fs from 'node:fs';
const L = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => l.split('\t'));
const med = (a) => { const v = [...a].sort((x, y) => x - y); return v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; }, by = {};
for (const r of L) (by[r[0]] ||= []).push(r);
by.All = L;
for (const [k, v] of Object.entries(by)) console.log(`| ${k === 'All' ? k : '`' + k + '`'} | ${v.length} | ${(v.reduce((s, r) => s + +r[2], 0) / v.length).toFixed(1)} | ${med(v.map((r) => +r[3])).toFixed(1)} | ${med(v.map((r) => +r[4])).toFixed(1)} |`);
```

`cpu.mjs`:
```js
// node cpu.mjs <cpu log> <date> <transcript>... — the CPU samples of a container (HH:MM:SS and docker stats' CPU%, one
// a line) joined with what the executor's session was doing at each: the class of the tool call outstanding, or the model.
import fs from 'node:fs';
const [log, date, ...files] = process.argv.slice(2);
const RULES = eval('[' + fs.readFileSync(new URL('./durations.mjs', import.meta.url), 'utf8').match(/const RULES = \[([\s\S]*?)\n\];/)[1] + ']');
const rule = (c) => { c = c.replace(/^\s*(cd [^&;]+(&&|;)\s*)+/, ''); for (const [k, re] of RULES) if (re.test(c)) return k; return 'other shell'; };
const spans = []; let lo = Infinity, hi = 0;
for (const f of files) {
  const open = new Map();
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (e.isSidechain || !e.timestamp) continue;
    const t = Date.parse(e.timestamp); lo = Math.min(lo, t); hi = Math.max(hi, t);
    if (e.type === 'assistant') for (const b of e.message?.content || []) if (b.type === 'tool_use') open.set(b.id, [t, b]);
    if (e.type === 'user' && Array.isArray(e.message?.content)) for (const b of e.message.content) if (b.type === 'tool_result' && open.has(b.tool_use_id)) {
      const [s, u] = open.get(b.tool_use_id);
      const k = u.name === 'Bash' ? (u.input.run_in_background ? 'background: ' + rule(u.input.command) : rule(u.input.command)) : u.name === 'Skill' ? 'review' : u.name;
      spans.push([s, t, k, (u.input.command || '').slice(0, 120)]);
    }
  }
}
const median = (v) => (v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2);
const S = {};
for (const line of fs.readFileSync(log, 'utf8').trim().split('\n')) {
  const [hms, pct] = line.trim().split(/\s+/); const t = Date.parse(`${date}T${hms}Z`), v = parseFloat(pct) / 100;
  if (t < lo || t > hi) { (S['outside the sessions'] ||= []).push(v); continue; }
  const on = spans.filter(([s, e, k]) => s <= t && e >= t && !k.startsWith('background'));
  const k = on.length ? on.map((x) => x[2]).sort().join('+') : 'model or idle';
  (S[k] ||= []).push(v);
}
for (const [k, v] of Object.entries(S).sort((a, b) => b[1].length - a[1].length)) {
  v.sort((a, b) => a - b);
  console.log(`| ${k} | ${v.length} | ${(v.reduce((s, x) => s + x, 0) / v.length).toFixed(1)} | ${median(v).toFixed(1)} | ${v[v.length - 1].toFixed(1)} |`);
}
```

#### 1.15.7. A batch on one branch, 2026-11-18

What a batch of tasks on one branch gave against a pull request for each task. The batch is six tasks of `spec` of E16, on the branch `e16-spec`: the first five each committed and pushed with no checks and no pull request, and the sixth ran every local check of the batch, `/code-review high` over it, opened pull request #202 and waited on its checks. Measured 2026-11-18 from the runs of `tools/orchestrator` on the volume `novatrail-claude`, each attempt's last `result` in its `stream-1.jsonl`, and from the GitHub API, read-only.

| Task | Minutes | Cost, $ | Turns |
|---|---|---|---|
| 1 | 3.7 | 1.32 | 29 |
| 2 | 5.9 | 6.82 | 32 |
| 3 | 7.8 | 6.43 | 26 |
| 4 | 5.1 | 4.76 | 38 |
| 5 | 5.9 | 4.13 | 37 |
| 6, with the batch's checks, review and pull request | 34.2 | 10.46 | 64 |
| The batch | 62.6 | 33.92 | 226 |

- Pull request #202, ten commits: one round of CI, its run 3.3 minutes, and all the checks of its last commit, `codecov/patch` and SonarCloud's among them, 4.0 minutes from the first to the last. A first run on the same commit was cancelled by the second at once. From the first task's start to the merge, 63.4 minutes.
- Against it: a run of E16 for a task with a pull request of its own, 20.8 minutes and $5.05 on average, by the orchestrator's count of 90 runs on 2026-11-18; a recount for this measurement of every attempt started from 2026-11-18T07:06:43Z that has a `result`, 87 of them, gives 21.7 minutes and $5.24. Both count attempts, so a task with a resume counts twice and its average is lower than a task's; each task of the batch ran in one attempt. Six such runs are about 125 minutes and $30.
- A task of section 1.15.1 is 30.4 minutes, of them 7.7 on GitHub's checks and 3.7 on the local checks: the batch pays them once.
- So the batch halved the time, 62.6 minutes against about 125, and did not lower the cost, $34 against about $30: the second and third tasks read the most code, and the sixth carried the review and the checks of all six.

The commands, in `~/.claude/novatrail-orchestrator/runs` of the orchestrator's volume, and `gh` in `spec`:
```sh
for r in spec-T21[2-7]-20261118T1*; do grep '"type":"result"' $r/stream-1.jsonl | tail -1 | jq -c '{cost: .total_cost_usd, ms: .duration_ms, turns: .num_turns}'; done
for r in *-20261118T*; do [[ ${r##*-} > 20261118T070643Z ]] || continue; for s in $r/stream-*.jsonl; do grep '"type":"result"' $s | tail -1 | jq -r '[.duration_ms, .total_cost_usd] | @tsv'; done; done | awk 'NF == 2 {n++; d += $1; c += $2} END {print n, d / n / 60000, c / n}'
gh run list --branch e16-spec --workflow CI --json databaseId,headSha,createdAt,updatedAt,conclusion
gh api repos/altnovatrail/spec/commits/c58ec092e82174aa12043d5033af4997686e9e38/check-runs --paginate --jq '.check_runs[] | [.name, .started_at, .completed_at, .conclusion] | @tsv'
```

### 1.16. After E16, 2026-11-18

What the rule of E16 gave against section 1.14. Measured 2026-11-18 on `main` of the 13 repositories, once every row of COORDINATION.md that carried the rule into a repository was done, by the commands of section 1.14.6 on fresh clones, and on the executors' transcripts after each repository moved to the tag of `spec` whose `docs-check` limits an entry to 12 KB.

**The repositories**, all 13, KB of 1,024, as in section 1.14.1:

| What | Before, section 1.14.1 | After | Change |
|---|---|---|---|
| Docs, without the archives | 13,860 | 13,220 | −4.6% |
| Decision logs | 8,091 | 7,994 | −1.2% |
| Architecture | 2,833 | 2,270 | −19.9% |
| Archives | 13,011 | 13,615 | +4.6% |
| Plan | 384 | 359 | −6.5% |
| CLAUDE.md | 119 | 117 | −1.7% |
| Comment lines / their characters | 47,583 / 3.62 M | 46,122 / 3.46 M | −3.1% / −4.4% |
| Comment blocks citing a decision | 3,398 of 20,726, 16% | 3,955 of 20,436, 19% | +3 points |
| Versions / dates / task numbers in the docs | 10,245 / 13,736 / 18,212 | 9,043 / 11,209 / 15,235 | −12% / −18% / −16% |

- The architecture fell in every repository: most in `canvas`, 319 → 218, `tutor`, 399 → 272, `modules`, 168 → 118, and `sim`, 172 → 121.
- The logs barely moved. By the rule of E16 an entry is rewritten when a task touches it, and E16 rewrote few of them. The amendments are still 4–43% of a log and the tag moves 0–32%.
  - `skill-map` alone rewrote its whole log: 206 → 109 KB, its amendments 13% → 4% and its tag moves 38% → 0%.
  - In `spec` the log is 1,649 → 1,608 KB, with 45% → 43% in amendments.
  - The rest shrinks as tasks touch it, and the next measurement shows how fast.
- The archives grew by E16's own bodies of tasks.
- The comments lost what retold the code and kept the anchors. That is why more blocks cite a decision, and `docs-check` now checks every such number.
- The code grew from 302,667 lines to 304,211.

**The sessions.** 86 sessions of the executors started after their repository's move to the tag: in `spec` after the merge that set its entry to 12 KB, 2026-11-18T09:30:19Z, and elsewhere from 10:24 to 10:45 UTC, all until 17:14. They made 4,841 main calls, fewer than the 100 sessions a comparison asks. Most of them are E16's own tasks, which read and wrote the documents in order to rewrite them:
- read documents: 26.1% of the context carried, against 25.5% before;
- write documents: 27.3% of the output, against 23.0%;
- cost: $2.97 a session, with $2.08 of subagents, against $4.90 and $0.83.

They do not measure the rule. The comparison with section 1.14.2 waits for at least 100 sessions after the moves, at the monthly measurement (Д275).

**The commands.**
- The repositories: section 1.14.6 as it stands.
- The sessions: `text-classes.mjs` of section 1.14.6, with the window opened per folder. Its first argument is the end, and each folder is `<folder>@<start>`. The start is the merge that brought `"entry": 12` into the folder's repository's `docs-budgets.json`, the first that `git log --first-parent --reverse -S'"entry": 12' -- docs-budgets.json` lists; for `spec`, which has no such file, it is the merge that set its entry to 12 KB, 2026-11-18T09:30:19Z.

### 1.17. A task across repositories with `xrepo`: E18 against E11, 2026-11-21

What a task across repositories with `xrepo` gave the first time: ten changes of `app`'s interface, each first a state of `draft/mockup` in `spec`, from `xrepo up` to `ship`, `down` and the deployment. The base is E11's tasks across repositories ([docs/plan/E11.md](plan/E11.md)). Measured 2026-11-21 by `just tokens-report` on `spec`'s folder of transcripts, which holds the orchestrator's sessions, by `gh` on the pull requests and their runs, and on the task's notes, `~/.claude/novatrail-orchestrator/epics/e18/notes.md`.

| What | E11 | E18, the first `xrepo` task |
|---|---|---|
| Sessions | 13 | 3 |
| The environment | a task of its own, by hand: $4.35, 52 minutes | `xrepo up`, no session of its own; `xrepo` itself — the two tasks that built it, $38.92, once |
| The work | 10 tasks of a feature in six repositories: $336.94, 918.6 M tokens of context — $33.69 and 91.9 M a task | 10 changes of `app` and its mockup: $81.03, 221.7 M — $8.10 and 22.2 M a change |
| The closing | a task of its own: a review of six repositories, six pull requests, their releases, $74.88, 224.5 M | the gate, `ship`, the deployment: $18.31, 57.7 M; no review across repositories |
| All the sessions | $425.80, 1,170.8 M | $99.34, 279.4 M |
| The deployment | a task of `infra` by an executor, $12.30; four pull requests | a task of `infra` by an executor, $2.78; two pull requests |
| Rounds of CI / pull requests of code | 9 / 6 | 8 / 3: `spec` #211 4, `app` #108 3, `spec` #212 1 |
| From the first pull request | to `app`'s release 2 h 10 min | to `app`'s release 3 h 35 min, to `spec`'s last 3 h 46 min, to the deployment 4 h 08 min; 1 h 49 min of it waiting for the author's answer |

- The costs are at the API's prices, by today's recipe. The base the plan named, $447.25, came from E11's review, by another count; the recipe gives $425.80 for the same 13 sessions.
- A unit is not the same: an E11 task was a feature across six repositories, an E18 change an interface edit of `app` and its mockup. The work's cost a change is the bound, not the saving; what `xrepo` saved outright is the environment, the closing and the rounds of `codecov/patch`.
- No round was `codecov/patch`'s: `patchcov` at the gate holds its rule. Every extra round was SonarCloud's or CodeQL's, which stay in CI: three of `spec` #211 on `xrepo`'s code, which no pull request had analysed — SonarCloud names one sink of a flow a round —, and two of `app` #108 on the legal sheet's `tabIndex` (S6845), the second ended by the author's new state of the mockup, which then took a pull request of its own, `spec` #212, since `spec` was released already. The two S8705 left on `main`, by `ship`'s and `patchcov`'s arguments, the epic's closing task fixed.
- After `pin` moved `app` to `spec` v0.19.5, its gate failed three times in 25 minutes: NOTICE named the contracts at 0.19.4, a test of `app` in WebKit read the title before the effect that sets it — flaky under the gate's load, outside the branch —, and `parts/deployment-1.tar.gz` was v0.19.4's. The epic's closing task makes `pin` raise NOTICE, the tag named without backticks and `parts/` from the release.
- `ship` left the deployment out: the epic had no clone of `infra`, and the author asked. The epic's closing task makes it stop for one.
- What the author did by hand, beyond the checks and the approvals of the mockup: in E11, the mockup's port forwarded by hand, and the host's clones left behind `main` after the push from them failed; in E18, three sessions of the task, each started with a prompt the last one wrote; the question of the deployment; `spec`'s folder switched to `main`, which stayed on the epic's branch after `down`, so the task's mark looked not done; the merge's word in the wave to the new tag of `spec`. The rebuilds of the containers were steps of the tasks that mounted `.epics` and ran the wave.
- E18's own tasks before it — the decisions, the mount of `.epics`, `xrepo` and the wave — cost $54.02 in `spec`'s sessions and $48.22 of the wave's twelve executors.

**The commands.**
- The cost and the context: `just tokens-report --since <start> --until <end> --json`, its `bySession`, main and subagents together. E11: 2026-11-18T23:30:00Z … 2026-11-20T23:59:00Z, the sessions of E11's tasks from its local environment on, that start before 16:40 on 2026-11-20; E18: the task's three sessions, its work to 2026-11-21T15:17:00Z, the author's «комить и пушь… все правки… закончены», and its closing from then to 20:27:00Z.
- The rounds: `gh run list -R altnovatrail/<repo> --branch e18 --json workflowName,event,createdAt,conclusion,headSha`, the runs of CI by `pull_request`, one a pushed head; `infra` by its branches, a run cancelled by a push ten seconds later not counted.
- The times: `gh pr view <n> --json createdAt,mergedAt` and `gh release list`; the author's wait, from the session's question to its answer in the task's transcript.

### 1.18. Citations in documents and comments, 2026-11-23

How often the documents and the code comments of the 13 repositories of `docs/repositories.md` cite, and what: the measurement "before" of the rule of citations, which its "after", section 1.18.5, and each repository's own task repeat by section 1.18.4. Measured 2026-11-23 on clones at `main`, read-only, in a temporary folder: `.github` faaa9bc, `api` 09df081, `app` c152d95, `canvas` bfe631e, `engine` 1c777a3, `infra` d50a538, `learner-model` 1cc6e53, `module-kit` b75a9d4, `modules` 998b660, `sim` b8ad7d4, `skill-map` 351262c, `spec` 876fc14, `tutor` 71e7336. What large projects do instead is sources 12.

A citation is a match of the pattern of the request that the rule answers, `\b(R[0-9]+( spec| [a-z-]+)?|(architecture|sources|measurements|repositories|privacy|product|concepts) [0-9]+(\.[0-9]+)*( spec)?|T[0-9]+)\b`. It counts what `docs-check` reads as a citation and task numbers, not Markdown links or `TODO`s; any `T` and digits count, an example in code too. Its `R[0-9]+( [a-z-]+)?` takes the next lowercase word, `R12 and` as much as `R12 api`: the kinds below read the suffix of a repository's name alone.

**The answer in short.**
- CLAUDE.md, the architecture and the decision log cite once in 26–55 words in every repository: 31, 39 and 38 over all 13. The sources and the measurements vary more, once in 28–234 words.
- 4,462 lines carry four citations or more; 679 parentheses outside the plan carry three or more.
- Task numbers are 27% of the citations, 15,764 of 59,297, and 14,731 of them stand outside RUN.md and `run/`.
- The logs hold 2,179 dated amendments and 859 tails "— *Consequence*".
- A comment of hand-written code cites a decision 19.1 times a 1,000 lines, a workflow 65 times; the standard library of Go 1.27.4 cites an issue 1.3 times a 1,000 lines.

#### 1.18.1. How dense, by document

Each cell is the citations of the file and the words a citation, the words split by white space. "Lines of 4+" counts the lines with four citations or more in `docs/` without the archives, CLAUDE.md, RUN.md and `run/`.

| Repository | CLAUDE.md | Architecture | Decisions | Sources | Measurements | Lines of 4+ |
|---|---|---|---|---|---|---|
| `.github` | 72 · 26 | 548 · 27 | 2,200 · 33 | 502 · 43 | 303 · 60 | 251 |
| `api` | 51 · 29 | 2,041 · 30 | 3,856 · 40 | 238 · 47 | 248 · 28 | 496 |
| `app` | 46 · 29 | 1,458 · 48 | 2,740 · 39 | 244 · 67 | 105 · 43 | 376 |
| `canvas` | 44 · 41 | 1,099 · 36 | 4,063 · 35 | 503 · 56 | 65 · 62 | 426 |
| `engine` | 51 · 29 | 578 · 45 | 1,481 · 39 | 229 · 50 | 84 · 130 | 214 |
| `infra` | 56 · 31 | 465 · 36 | 1,656 · 41 | 234 · 83 | 26 · 56 | 217 |
| `learner-model` | 48 · 30 | 547 · 55 | 2,355 · 36 | 164 · 53 | 120 · 61 | 272 |
| `module-kit` | 46 · 30 | 527 · 42 | 1,851 · 50 | 110 · 71 | 64 · 45 | 162 |
| `modules` | 53 · 28 | 447 · 45 | 1,644 · 43 | 128 · 43 | 68 · 45 | 178 |
| `sim` | 49 · 28 | 593 · 38 | 2,340 · 40 | 423 · 33 | 184 · 36 | 340 |
| `skill-map` | 40 · 34 | 255 · 35 | 458 · 41 | 50 · 73 | 36 · 69 | 64 |
| `spec` | 57 · 33 | 1,115 · 29 | 7,644 · 35 | 178 · 234 | 603 · 61 | 970 |
| `tutor` | 57 · 33 | 948 · 54 | 4,151 · 35 | 136 · 118 | 937 · 40 | 496 |
| All | 670 · 31 | 10,621 · 39 | 36,439 · 38 | 3,139 · 66 | 2,843 · 50 | 4,462 |
- In every repository the logs cite once in 33–50 words. The architecture of `.github`, `api` and `spec` is the densest, once in 27–30.
- `spec`'s `docs/decisions.md` alone holds 7,644 citations in 268,769 words, and 1,115 in the 31,873 of its architecture: the numbers of the plan of the epic.
- `spec` has 970 of the 4,462 lines of four and more.

#### 1.18.2. What is cited

Over `docs/` without the archives `docs/plan/`, CLAUDE.md, RUN.md and `run/`:
- *tasks* are `T…`, and *outside the plan* those not in RUN.md and `run/`;
- *own R…* are the repository's decisions, *R… spec* spec's, and *other R…* another repository's, MathTrail's `canvas-api` and `standalone` among them;
- *own architecture*, *sources* and *measurements* are sections of the repository's own documents; *other sections* are its other documents', and every section of spec's with the suffix;
- *amendments* are the paragraphs of the log that open "— *…Amendment <date>", the second to the fifth too; *consequences*, those that open "— *Consequence";
- *in parentheses* is the share of the characters inside a parenthesis on one line that holds a citation; *parentheses of 3+*, outside the plan, the parentheses that hold three citations or more.

| Repository | Tasks | outside the plan | Own R… | R… spec | Other R… | Own architecture | Sources | Measurements | Other sections | Amendments | Consequences | In parentheses | Parentheses of 3+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `.github` | 1,091 | 1,076 | 1,116 | 573 | 63 | 369 | 220 | 133 | 124 | 164 | 55 | 2.9% | 40 |
| `api` | 1,494 | 1,405 | 2,934 | 1,107 | 208 | 181 | 112 | 55 | 609 | 273 | 102 | 3.1% | 80 |
| `app` | 1,016 | 878 | 1,871 | 1,147 | 215 | 103 | 125 | 41 | 396 | 75 | 78 | 2.9% | 60 |
| `canvas` | 1,701 | 1,673 | 2,577 | 922 | 129 | 178 | 113 | 29 | 251 | 251 | 51 | 2.4% | 75 |
| `engine` | 825 | 783 | 611 | 475 | 206 | 69 | 80 | 23 | 249 | 91 | 30 | 3.3% | 33 |
| `infra` | 834 | 725 | 857 | 515 | 134 | 85 | 140 | 12 | 121 | 136 | 37 | 2.6% | 38 |
| `learner-model` | 1,057 | 1,003 | 1,177 | 622 | 194 | 75 | 40 | 32 | 248 | 107 | 48 | 2.7% | 42 |
| `module-kit` | 789 | 779 | 1,000 | 600 | 32 | 51 | 43 | 31 | 145 | 114 | 67 | 2.2% | 35 |
| `modules` | 655 | 630 | 875 | 573 | 42 | 99 | 73 | 22 | 164 | 94 | 41 | 2.5% | 31 |
| `sim` | 1,414 | 1,311 | 1,580 | 395 | 134 | 52 | 132 | 35 | 141 | 187 | 81 | 2.5% | 40 |
| `skill-map` | 108 | 91 | 351 | 273 | 18 | 8 | 29 | 6 | 115 | 4 | 12 | 3.2% | 13 |
| `spec` | 2,588 | 2,211 | 7,049 | 15 | 1,278 | 558 | 252 | 118 | 1,163 | 487 | 115 | 2.4% | 115 |
| `tutor` | 2,192 | 2,166 | 2,041 | 1,070 | 91 | 371 | 138 | 144 | 360 | 196 | 142 | 2.5% | 77 |
| All | 15,764 | 14,731 | 24,039 | 8,287 | 2,744 | 2,199 | 1,497 | 681 | 4,086 | 2,179 | 859 | 2.6% | 679 |
- In `spec` the paragraphs that open "— *Amendment" are 409, the count of the plan of the epic; with the second to the fifth and "Amendment … (T…)" they are 487.
- A parenthesis with a citation is 2.2–3.3% of a repository's characters.

#### 1.18.3. Code comments

Hand-written code — `.go`, `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs` and `.sh`, tests included — and the workflows of `.github/workflows/`, without generated files, `node_modules` and `testdata`. Lines are non-empty lines, comments included. A comment is a line of `//`, a block `/* … */`, a `#` of a shell script or a workflow, or the rest of a line after ` //` or ` #`. *R…* and *T…* count `R` and `T` with two or three digits in the comments.

| Repository | Lines | Comment lines | R… in comments | a 1,000 lines | T… in comments | Workflow lines | R… a 1,000 |
|---|---|---|---|---|---|---|---|
| `.github` | 9,254 | 1,508 | 263 | 28.4 | 0 | 3,524 | 57 |
| `api` | 60,541 | 8,994 | 1,493 | 24.7 | 0 | 213 | 113 |
| `app` | 71,349 | 7,606 | 1,362 | 19.1 | 0 | 192 | 78 |
| `canvas` | 50,563 | 7,691 | 1,536 | 30.4 | 0 | 770 | 53 |
| `engine` | 6,835 | 1,100 | 95 | 13.9 | 0 | 383 | 63 |
| `infra` | 7,458 | 1,055 | 164 | 22.0 | 0 | 457 | 42 |
| `learner-model` | 9,484 | 1,570 | 167 | 17.6 | 0 | 439 | 80 |
| `module-kit` | 26,920 | 3,548 | 347 | 12.9 | 0 | 340 | 53 |
| `modules` | 10,779 | 1,022 | 138 | 12.8 | 0 | 511 | 72 |
| `sim` | 19,879 | 2,471 | 380 | 19.1 | 0 | 467 | 73 |
| `skill-map` | 6,040 | 852 | 145 | 24.0 | 0 | 142 | 92 |
| `spec` | 45,445 | 7,014 | 636 | 14.0 | 13 | 1,327 | 72 |
| `tutor` | 70,861 | 9,692 | 814 | 11.5 | 2 | 296 | 108 |
| All | 395,408 | 54,123 | 7,540 | 19.1 | 15 | 9,061 | 65 |
- Go 1.27.4 of the devcontainer: 3,413 matches of `(golang\.org/issue/|go\.dev/issue/|[Ii]ssue #?)[0-9]+` in 6,828 files of `$(go env GOROOT)/src` outside `testdata`, 2,893,348 lines, 2,664,874 of them non-empty — 1.2 a 1,000 lines, 1.3 a 1,000 non-empty ones. The comments of NovaTrail cite a decision 15 times as often.
- Task numbers in comments are rare: 13 in `spec` and 2 in `tutor`.

**Against the request.**
- `.github`, "a citation every 25–35 words": its CLAUDE.md, 26, its architecture, 27, and its log, 33, agree; its sources, 43, and measurements, 60, are sparser.
- `.github`, "59 decision numbers a 1,000 lines of the workflows": 219 matches of `\bR[0-9]{2,3}\b` in 3,706 lines of `.github/workflows/*.yml`, code and empty lines included, is 59; in its comments and non-empty lines, 57.
- Go, "about 1.2 references to an issue a 1,000 lines": 1.2, by the same command.
- `spec`, "about 1,360 decision numbers in 156 thousand lines of comments": the files of code of `spec` hold 1,440 matches of `\bR[0-9]{2,3}\b` in 149,952 lines, generated code and its comments from `.proto` and the schemas included; its hand-written comments hold 636 in 45,445 non-empty lines. The request counted the generated files, which the rule leaves out, and every line, not the comments.

#### 1.18.4. The commands

In an empty folder, the 13 clones at `main` and `cite.mjs` beside them; the second command prints one line of JSON a repository, the third the two counts of Go:
```sh
for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do git clone -q https://github.com/altnovatrail/$r.git; done
for r in .github api app canvas engine infra learner-model module-kit modules sim skill-map spec tutor; do node cite.mjs $r; done > cite.jsonl
find $(go env GOROOT)/src -name '*.go' -not -path '*/testdata/*' | xargs cat | tee >(wc -l >&2) | grep -oE '(golang\.org/issue/|go\.dev/issue/|[Ii]ssue #?)[0-9]+' | wc -l
cat .github/.github/workflows/*.yml | wc -l; cat .github/.github/workflows/*.yml | grep -oE '\bR[0-9]{2,3}\b' | wc -l
```
The tables sum the lines of `cite.jsonl`: `files` gives section 1.18.1, citations and words; `kinds`, `tasksOutside`, `amendments`, `consequences`, `paren` — characters in parentheses with a citation and all characters — and `parens3` give 1.18.2; `code` and `workflows` give 1.18.3.

`cite.mjs`:
```js
// cite.mjs <repo> — the citations of one clone at main, as one JSON line.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const repo = process.argv[2];
const REPOS = ".github|api|app|canvas|engine|infra|learner-model|module-kit|modules|sim|skill-map|spec|tutor|canvas-api|standalone";
const CITE = /\b(R[0-9]+( spec| [a-z-]+)?|(architecture|sources|measurements|repositories|privacy|product|concepts) [0-9]+(\.[0-9]+)*( spec)?|T[0-9]+)\b/g;
const KIND = [
  ["task", /^T/],
  ["R spec", /^R[0-9]+ spec$/],
  ["R other", new RegExp(`^R[0-9]+ (${REPOS})$`)],
  ["R own", /^R/],
  ["architecture", /^architecture [0-9.]+$/],
  ["sources", /^sources [0-9.]+$/],
  ["measurements", /^measurements [0-9.]+$/],
  ["section spec", / spec$/],
  ["section own", /./],
];
// The request's pattern takes the next lowercase word after R…, "R12 and" too: the kind reads the decision's suffix alone.
const OWN = new RegExp(`^(R[0-9]+) (?!spec$|(?:${REPOS})$).*$`);
const kind = (c) => KIND.find(([, re]) => re.test(c.replace(OWN, "$1")))[0];
const read = (f) => (existsSync(`${repo}/${f}`) ? readFileSync(`${repo}/${f}`, "utf8") : "");
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const files = (...spec) => execFileSync("git", ["-C", repo, "ls-files", ...spec], { encoding: "utf8" }).split("\n").filter(Boolean);

const out = { repo, files: {}, kinds: {}, four: 0, paren: [0, 0], tasksOutside: 0, parens3: 0 };
for (const f of ["CLAUDE.md", "docs/architecture.md", "docs/decisions.md", "docs/sources.md", "docs/measurements.md"]) {
  const t = read(f);
  out.files[f] = [(t.match(CITE) || []).length, words(t)];
}
// Kinds, lines of four and more, and parentheses: docs/ without the archives, CLAUDE.md, RUN.md and run/.
const all = files("docs/*.md", "CLAUDE.md", "RUN.md", "run/*.md").filter((f) => !f.startsWith("docs/plan/"));
for (const f of all) {
  const t = read(f);
  for (const c of t.match(CITE) || []) out.kinds[kind(c)] = (out.kinds[kind(c)] || 0) + 1;
  for (const l of t.split("\n")) if ((l.match(CITE) || []).length >= 4) out.four++;
  out.paren[1] += t.length;
  const plan = f === "RUN.md" || f.startsWith("run/");
  if (!plan) out.tasksOutside += (t.match(CITE) || []).filter((c) => c.startsWith("T")).length;
  for (const p of t.match(/\([^()\n]*\)/g) || []) {
    const n = (p.match(CITE) || []).length;
    if (n) out.paren[0] += p.length;
    if (n > 2 && !plan) out.parens3++;
  }
}
const log = read("docs/decisions.md");
out.amendments = (log.match(/^— \*[^*]*[Aa]mendment [0-9]{4}-[0-9]{2}-[0-9]{2}/gm) || []).length;
out.consequences = (log.match(/^— \*Consequence/gm) || []).length;
// Comments of hand-written code and of the workflows: lines, comment lines, R… and T… in them.
const code = files("*.go", "*.ts", "*.tsx", "*.js", "*.mjs", "*.cjs", "*.sh", "*.yml", "*.yaml", ":!:*.pb.go", ":!:*_pb.ts", ":!:*_pb.js", ":!:*connect.go", ":!:*connect.ts", ":!:**/node_modules/**", ":!:**/testdata/**");
out.code = { lines: 0, comments: 0, R: 0, T: 0 };
out.workflows = { lines: 0, R: 0 };
for (const f of code) {
  const t = read(f);
  if (/Code generated|@generated/.test(t.split("\n").slice(0, 5).join("\n"))) continue;
  const hash = /\.(sh|ya?ml)$/.test(f);
  if (/\.ya?ml$/.test(f) && !f.startsWith(".github/workflows/") && !f.startsWith("workflows/")) continue;
  let inc = false;
  for (const raw of t.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    out.code.lines++;
    if (/^\.github\/workflows\//.test(f)) out.workflows.lines++;
    let c = "";
    if (inc || /^(\/\/|\/\*)/.test(l)) { if (l.startsWith("/*")) inc = true; if (inc && l.includes("*/")) inc = false; c = l; }
    else if (hash) c = l.match(/(^|\s)#(?!!)(.*)$/)?.[2] ?? "";
    else c = l.match(/\s\/\/(.*)$/)?.[1] ?? "";
    if (!c) continue;
    out.code.comments++;
    const r = (c.match(/(?<![A-Za-z0-9])R[0-9]{2,3}(?![0-9])/g) || []).length;
    out.code.R += r;
    out.code.T += (c.match(/(?<![A-Za-z0-9])T[0-9]{2,3}(?![0-9])/g) || []).length;
    if (/^\.github\/workflows\//.test(f)) out.workflows.R += r;
  }
}
console.log(JSON.stringify(out));
```

#### 1.18.5. After the rule, 2026-11-23

The same commands of section 1.18.4, on clones at `main` after the epic's tasks in every repository, each with `"citations": true` in its `docs-budgets.json` and its CI on `main` green: `.github` 715094a, `api` 8127c98, `app` 35c8680, `canvas` 71bceee, `engine` f984efe, `infra` 2b803be, `learner-model` 68dd38f, `module-kit` 305141c, `modules` 0dcf9e1, `sim` c8fa852, `skill-map` a7f58a3, `spec` 95c30b8, `tutor` 2cb2623; Go and its counts are those of section 1.18.3.

**The answer in short.**
- The citations of the documents and the plan fell from 59,297 to 7,421, by 87%: CLAUDE.md, the architecture and the log cite once in 287, 433 and 365 words over all 13, against 31, 39 and 38.
- Task numbers fell from 15,764 to 1,228, nearly all of them in RUN.md and `run/`; 21 stand outside the plan, all in `spec` and all examples in code or paths, which `docs-check` passes.
- No log holds a dated amendment, against 2,179, and no parenthesis outside the plan three citations or more, against 679; the lines of four and more fell from 4,462 to 291.
- The records of the outside world are cited more, not less: `sources` from 1,497 to 2,567, `measurements` from 681 to 796, where a claim once stood on a decision.
- A comment of hand-written code cites a decision 0.2 times a 1,000 lines, against 19.1, and a workflow none: the 63 `R…` and 17 `T…` left are all in `tools/docs-check/` of `spec`, the examples of what it finds, in inline code, and its tests. Outside `spec` no comment cites a decision or a task; Go cites an issue 1.3 times a 1,000 non-empty lines.

How dense, by document, as in section 1.18.1:

| Repository | CLAUDE.md | Architecture | Decisions | Sources | Measurements | Lines of 4+ |
|---|---|---|---|---|---|---|
| `.github` | 7 · 248 | 136 · 104 | 366 · 148 | 37 · 569 | 51 · 356 | 10 |
| `api` | 5 · 275 | 114 · 500 | 263 · 390 | 9 · 1267 | 26 · 267 | 18 |
| `app` | 5 · 250 | 104 · 636 | 224 · 419 | 10 · 1713 | 14 · 319 | 30 |
| `canvas` | 5 · 349 | 81 · 478 | 230 · 567 | 8 · 3539 | 7 · 576 | 16 |
| `engine` | 5 · 273 | 61 · 404 | 97 · 320 | 3 · 3729 | 28 · 384 | 9 |
| `infra` | 7 · 237 | 43 · 371 | 243 · 160 | 8 · 2370 | 5 · 291 | 27 |
| `learner-model` | 5 · 273 | 64 · 451 | 182 · 376 | 2 · 4211 | 17 · 438 | 14 |
| `module-kit` | 6 · 219 | 23 · 918 | 172 · 310 | 2 · 4011 | 6 · 550 | 5 |
| `modules` | 5 · 286 | 55 · 352 | 141 · 407 | 4 · 1368 | 16 · 192 | 12 |
| `sim` | 5 · 255 | 81 · 265 | 166 · 423 | 12 · 1161 | 9 · 739 | 40 |
| `skill-map` | 5 · 259 | 25 · 339 | 57 · 303 | 1 · 3629 | 10 · 248 | 7 |
| `spec` | 3 · 629 | 19 · 1597 | 474 · 474 | 32 · 1339 | 41 · 963 | 85 |
| `tutor` | 5 · 363 | 107 · 457 | 269 · 413 | 17 · 942 | 114 · 322 | 18 |
| All | 68 · 287 | 913 · 433 | 2,884 · 365 | 145 · 1423 | 344 · 421 | 291 |

What is cited, as in section 1.18.2:

| Repository | Tasks | outside the plan | Own R… | R… spec | Other R… | Own architecture | Sources | Measurements | Other sections | Amendments | Consequences | In parentheses | Parentheses of 3+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `.github` | 16 | 0 | 67 | 23 | 2 | 7 | 334 | 162 | 42 | 0 | 51 | 1.1% | 0 |
| `api` | 131 | 0 | 147 | 62 | 4 | 2 | 244 | 57 | 24 | 0 | 101 | 0.4% | 0 |
| `app` | 160 | 0 | 158 | 42 | 2 | 3 | 210 | 38 | 38 | 0 | 79 | 0.4% | 0 |
| `canvas` | 52 | 0 | 247 | 35 | 5 | 2 | 194 | 33 | 21 | 0 | 71 | 0.4% | 0 |
| `engine` | 63 | 0 | 51 | 40 | 6 | 1 | 123 | 32 | 13 | 0 | 31 | 0.5% | 0 |
| `infra` | 119 | 0 | 117 | 50 | 6 | 1 | 254 | 9 | 15 | 0 | 37 | 0.8% | 0 |
| `learner-model` | 57 | 0 | 120 | 13 | 7 | 0 | 170 | 49 | 14 | 0 | 48 | 0.5% | 0 |
| `module-kit` | 11 | 0 | 79 | 17 | 2 | 1 | 108 | 24 | 11 | 0 | 69 | 0.4% | 0 |
| `modules` | 23 | 0 | 88 | 12 | 0 | 2 | 138 | 31 | 14 | 0 | 41 | 0.4% | 0 |
| `sim` | 156 | 0 | 208 | 53 | 4 | 1 | 151 | 35 | 18 | 0 | 77 | 0.5% | 0 |
| `skill-map` | 20 | 0 | 39 | 3 | 0 | 0 | 54 | 6 | 16 | 0 | 21 | 0.4% | 0 |
| `spec` | 340 | 21 | 498 | 4 | 31 | 14 | 416 | 125 | 48 | 0 | 160 | 0.4% | 0 |
| `tutor` | 80 | 0 | 195 | 53 | 3 | 5 | 171 | 195 | 24 | 0 | 139 | 0.3% | 0 |
| All | 1,228 | 21 | 2,014 | 407 | 72 | 39 | 2,567 | 796 | 298 | 0 | 925 | 0.5% | 0 |
- The decisions' numbers left are the headings of the logs' entries, their openings' next free number, and the plan: RUN.md and `run/` cite decisions and tasks by the rule, which leaves the plan out.
- The tails "— *Consequence*" are 925, against 859: folding an amendment into its entry kept the list of the files the decision's change edits, the one the rule keeps.

Code comments, as in section 1.18.3:

| Repository | Lines | Comment lines | R… in comments | a 1,000 lines | T… in comments | Workflow lines | R… a 1,000 |
|---|---|---|---|---|---|---|---|
| `.github` | 9,252 | 1,506 | 0 | 0.0 | 0 | 3,523 | 0 |
| `api` | 60,418 | 8,871 | 0 | 0.0 | 0 | 213 | 0 |
| `app` | 71,599 | 7,625 | 0 | 0.0 | 0 | 192 | 0 |
| `canvas` | 50,569 | 7,697 | 0 | 0.0 | 0 | 769 | 0 |
| `engine` | 6,833 | 1,098 | 0 | 0.0 | 0 | 383 | 0 |
| `infra` | 7,453 | 1,050 | 0 | 0.0 | 0 | 457 | 0 |
| `learner-model` | 9,485 | 1,571 | 0 | 0.0 | 0 | 437 | 0 |
| `module-kit` | 26,900 | 3,527 | 0 | 0.0 | 0 | 340 | 0 |
| `modules` | 10,776 | 1,019 | 0 | 0.0 | 0 | 508 | 0 |
| `sim` | 19,858 | 2,450 | 0 | 0.0 | 0 | 465 | 0 |
| `skill-map` | 6,037 | 849 | 0 | 0.0 | 0 | 142 | 0 |
| `spec` | 45,882 | 7,083 | 63 | 1.4 | 17 | 1,321 | 0 |
| `tutor` | 70,847 | 9,671 | 0 | 0.0 | 0 | 294 | 0 |
| All | 395,909 | 54,017 | 63 | 0.2 | 17 | 9,044 | 0 |

### 1.19. What `claude -p` prints in the orchestrator's runs, 2026-11-15 and 2026-11-23

Seen in Claude Code 2.1.280, in a scratch folder and by `docker exec` in `sim`'s container, for the orchestrator's launch of an executor, and again in 2.1.331 on 2026-11-23. What Claude Code's documentation says of the same is a link where a claim stands; these are what the runs showed.
- **Flags.** `claude --help` names `-p`, `--output-format`, `--verbose`, `--resume`, `--permission-mode` with `bypassPermissions`, `--model`, `--effort` "(low, medium, high, xhigh, max)", `--json-schema`, `--max-budget-usd`, `--append-system-prompt`, `--permission-prompts`, `--session-id <uuid>` — "Use a specific session ID for the conversation (must be a valid UUID)" — and `--system-prompt-snapshot <on|off>`: "Record the system prompt once per conversation and reuse it verbatim on every request and resume. on (the default)… every later request and resume sends the record as-is, even when a later launch passes different text, until the conversation is compacted". It names `--append-system-prompt-file` only in its text for `--bare`, not as an option of its own. `claude -p --output-format stream-json "hi"` answers "Error: When using --print, --output-format=stream-json requires --verbose", which no page of the documentation says.
- **The schema.** `--json-schema` with `"$schema": "https://json-schema.org/draft/2020-12/schema"` stops the run before any request: "Error: --json-schema is not a valid JSON Schema: no schema with key or ref "https://json-schema.org/draft/2020-12/schema"". With `"http://json-schema.org/draft-07/schema#"` it runs, and the model gives its output by a tool `StructuredOutput`.
- **The stream.** `-p --output-format stream-json --verbose` printed:
  - first `system` of subtype `init`, with `session_id` equal to the one `--session-id` gave, `model: "claude-opus-5-5"`, `permissionMode` and `claude_code_version`;
  - then a `rate_limit_event`: `"rate_limit_info":{"status":"allowed","resetsAt":1795352400,"rateLimitType":"seven_day","overageStatus":"rejected","overageDisabledReason":"org_level_disabled","isUsingOverage":false,…}`;
  - last a `result` of subtype `success` with `structured_output`, `total_cost_usd` and `modelUsage`.
- **The resume.** The `--resume` of that session printed `total_cost_usd` 0.2206944 against the first run's 0.209924, and in `modelUsage` 4 tokens of input and 326 of output against 2 and 163: the totals of the whole session.
- **The limit in transcripts.** The transcripts of interactive sessions of `modules` on this machine record a limit as a message of the model with `"error":"rate_limit"`, `"apiErrorStatus":429`, the text "You've hit your session limit · resets 9:20am (UTC)" or "You've hit your weekly limit · resets 7am (UTC)", and `"quotaLimits":{"status":"rejected","resetsAt":1794129600,…}`. 1794129600 is 2026-11-08T09:20:00Z, the time the text names. A limit reached in a run of `-p` was not seen.
- **The sign-in, 2026-11-23.** Claude Code 2.1.331 from npm, in a scratch folder of the orchestrator's container: `claude -p --model haiku --output-format stream-json --verbose --json-schema <status.schema.json> --session-id <uuid>` printed an `init` with `"apiKeySource":"none"` and `"claude_code_version":"2.1.331"` — the subscription's sign-in — and a `result` of subtype `success` with `structured_output` by the executor's schema.

## 2. The browsers of the kind `typescript`

### 2.1. WebKit and Firefox in the stage, 2026-11-13

What the stage of the kind `typescript` (`repo-template/kinds/typescript.Dockerfile`) costs and whether WebKit and Firefox run in it, measured 2026-11-13 in `spec`'s devcontainer — Ubuntu 24.04 of the base image of the stage `toolchain`, `amd64`, — without docker, which the container does not have. The revisions are those of Playwright's [`browsers.json`](https://github.com/microsoft/playwright/blob/v1.65.0/packages/playwright-core/browsers.json) at the tag v1.65.0 — WebKit 2388, `"browserVersion": "27.2"`, Firefox 1572, `"browserVersion": "159.0"` —, and the lists of packages its [`nativeDeps.ts`](https://github.com/microsoft/playwright/blob/v1.65.0/packages/playwright-core/src/server/registry/nativeDeps.ts), `ubuntu24.04-x64`, which `ubuntu24.04-arm64` takes too: `chromium` — 21 packages; `firefox` — 25; `webkit` — 52 lines, 51 packages, `libicu74` standing twice; together, each once, 69; beyond Chromium's 21 and the `libfontconfig1` and `libfreetype6` the stage already installs, WebKit and Firefox add 46; and the 12 of the list `tools`, fonts and `xvfb`.
- **The image.** The index `sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe` of `mcr.microsoft.com/playwright` names an image for `amd64` (`sha256:f6fe3cf9…`) and for `arm64` (`sha256:714043ec…`). The config of the `amd64` image says `ARG PLAYWRIGHT_VERSION=1.65.0` and `LABEL org.opencontainers.image.version=1.65.0`; its sixth layer, 119 MiB, holds `ms-playwright/firefox-1572/`, and its seventh, 107 MiB, `ms-playwright/webkit-2388/`, each with `INSTALLATION_COMPLETE`, as Playwright's [`Dockerfile.noble`](https://github.com/microsoft/playwright/blob/v1.65.0/utils/docker/Dockerfile.noble) installs each browser in a layer of its own under `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`. The `arm64` image has the same two folders in its sixth and seventh layers, 115 MiB and 104 MiB.
- **The system libraries.** The packages of the stage's `RUN`, from the snapshot `20261021T000000Z`, with `--no-install-recommends`, by the same commands, in two steps. First the libraries of the three engines with `libfontconfig1`, `libfreetype6` and `fonts-liberation`, 70: `apt-get` installed 330 packages — "Need to get 172 MB of archives", "638 MB of additional disk space". Then the other 8 fonts of the list `tools`: 11 packages, 30.9 MB and 90.4 MB. All 78 together: 341 packages, about 203 MB to download and 729 MB on disk. The 24 of Chromium alone, before this, `apt-get --assume-no` estimated in the same container at 61 packages, 50.3 MB and 216 MB. For `arm64`, a simulation from `https://snapshot.ubuntu.com/ubuntu/20261021T000000Z/` with an empty state of `dpkg` resolves every one of the 78.
- **The browsers.** The folders taken from the layers of the image: `firefox-1572` — 317 MiB on disk, `webkit-2388` — 278 MiB (`du -sh`); in the layers, compressed, 119 MiB and 107 MiB.
- **The run.** `playwright-core` 1.65.0 with `PLAYWRIGHT_BROWSERS_PATH` at those folders started both builds headless. A page served from `127.0.0.1` ran a module script, drew on a canvas — the pixel `255,0,0,255` —, laid out a paragraph in Liberation Sans and opened IndexedDB, in WebKit 27.2 and Firefox 159.0 alike; `Intl.DisplayNames` gave for English in Russian «Английский» in WebKit and «английский» in Firefox, as a task of `app` found. `ldd` found no missing library in any ELF file of the two folders. Chrome Headless Shell was not started: its revision did not change.
- **The fonts.** With `fonts-liberation` the only font, WebKit gave every inline element — a `<span>` in the default font, in `sans-serif`, `serif`, `monospace` and `system-ui`, an emoji, Japanese — a height of 0, while Firefox gave 14–19 px, as the row `app` В50 warned. With the 8 other fonts of `tools`, each was 17–20 px high in WebKit and 16–21 px in Firefox. `fc-match` then names WenQuanYi Zen Hei for `sans-serif`, `serif`, `monospace` and `system-ui`, not Liberation, and Noto Color Emoji for `emoji`: the default font changes for Chromium too.
- **Not measured.** The build of the stage by docker and its time, and the size of its entry in the GitHub Actions cache. On 2026-11-13 the entry `toolchain-Linux-X64-…` of `canvas` and `app`, with Chrome Headless Shell, takes 548–554 MiB, and that of `spec`, without a browser, 382 MiB (the GitHub API, `actions/caches` and `actions/cache/usage`); `canvas` keeps 18 such entries — of `main` and of pull requests, for three versions of its Dockerfile —, 9906 MiB of the 10 GB a repository has, and `app` 12, 6604 MiB. The new one is expected larger by about the compressed layers and archives, 226 MiB and 203 MB less 50 MB, — about 0.95 GB: an estimate, which the first build in the CI of a copy measures. At that size about ten entries fit in 10 GB instead of eighteen.

## 3. The speed of CI

### 3.1. The checks of every repository, 2026-11-15

Where the time of CI and of the releases goes in the 13 repositories of `altnovatrail`, measured 2026-11-15 from the GitHub API, read only: the last 60 completed runs of each repository, and of the workflows CI, Release, CodeQL, Emulators and Samples page the last 3 successful ones; the times of the jobs and of their steps from `actions/runs/<id>/jobs`, as medians of the 3; the causes from the logs of the jobs, by their timestamps. The local times are of `spec`'s devcontainer, 20 cores. Nothing was changed in any repository. The rows 7.13–7.25 of [COORDINATION.md](../COORDINATION.md) and the task that sped up CI rest on this section.

| Repository | CI, median | Slowest job | Where its time goes |
|---|---|---|---|
| `spec` | 8.1–10.6 min | Documents and tools, 556 s | the step Tests, 425 s: the tests of `tools/` — below |
| `api` | 10.3 min; Release 18.7 min | Image, 496 s; Go / test, 331 s | `release-files` twice, each cold, 169 s each, then `go build` cold again, 86 s; `-race` with an empty `GOCACHE`, the first package after 100–120 s, and an embedded PostgreSQL per package — account 111 s, learning 89 s; in the release, 282 calls of `gh release verify-asset` one after another, 633 s, and 141 of `cosign sign-blob`, about 1.4 s each — 141 files, most of them LICENSE and NOTICE |
| `tutor` | 7.2–8.2 min | Go / test, 413 s | the compile under `-race` 76 s; `cmd/tutor-eval` 273 s and `internal/evalsample` 166 s — locally 143 s and 69 s under `-race`, 11 s and 9 s without |
| `modules` | 7.1–7.3 min | Go / test, 322 s | `tools/port` 277.7 s — locally 184 s under `-race`, 19 s without; its 80 tests start no goroutine |
| `sim` | 8.3–10.7 min | Gate / amd64, 424 s; Go / targets, 317 s | the gate: 9 populations × 250 learners × 2 runs over `nproc` = 4 processes, about 380 s of running; the targets one after another — js/wasm 134 s, of it `internal/measure` 103 s |
| `engine` | 7.1–8.2 min | Gate, 424 s | the gate, as `sim`'s |
| `learner-model` | 7.7–8.8 min | Gate, 448 s; Go / arm64, 191 s | the gate; `-race` with `-covermode=atomic` — locally 70 s, each alone about 4 times the plain run |
| `app` | 4.5 min; Release 5.4 min | TypeScript / test, 278 s; Release "Work out the version", 391 s | two runs of Vitest one after the other — Chromium with coverage 88 s, WebKit and Firefox 120 s —, 10 958 warnings of React `act()` in the log; the release builds the whole stage, browsers and apt included, for `release-version` |
| `canvas` | 3 min; up to 14.4 min after a change of the Dockerfile; Emulators 13.4 min | Emulators, iPad 27, 712 s | WebDriverAgent built from source on each run, 170–270 s; a hang of about 170 s after the first tap on iOS 27; every job of CI building the image at once on a miss |
| `infra` | 3.6–4.2 min | OpenTofu, 228 s | `bootstrap-test` 145 s: 63 tests one after another, each `bootstrap.sh` through `spawnSync` |
| `module-kit` | 2.3–2.7 min | Go / test, 122 s | `-race -covermode=atomic` without parallel tests; 6 cross-builds one after another in Binaries |
| `skill-map` | 2.2–3.3 min | TypeScript / lint, 97 s | the image built in each job, 75–85 s |
| `.github` | 1.4–1.5 min | Workflows, 74 s | — |

- **The image of the stage `toolchain`.** Built: 25–36 s with Go alone, 75–85 s with Playwright's browsers. From the cache: the restore 2–15 s and `docker load` 13–36 s — with Go no faster than the build. The repositories on `.github` `v0.1.15` and `v0.1.21` — `api`, `engine`, `sim`, `tutor`, `modules`, `module-kit`, `skill-map` — build it in every job; `app`, `canvas` and `learner-model` take it from the cache. An entry takes 382 MiB with Go and 928 MiB with the browsers. `app` keeps 16 entries, 10 317 MiB, and `canvas` 12, 10 781 MiB, at the limit, "10 GB per repository" ([Dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching); sources 6.4): the same key is saved under three paths — `toolchain.tar` of `typescript.yml`, `novatrail-toolchain.tar` of `documents.yml`, `build/toolchain.tar` of `canvas`'s own workflows —, and by pull requests. `sim` keeps 54 entries `gate-*` of 55 MiB, 2 289 MiB: their key holds `gate.json`, with no `restore-keys`.
- **Downloads are small.** `go: downloading` — 29 lines in 1.7 s in `tutor`'s test job, 5 in 0.3 s in `modules`', about 6–7 s in `api`'s; `npm ci` of `spec`'s `tools/`, 230 packages, 5 s. The time goes into compiling with an empty `GOCACHE` — the container's home is `/tmp`, thrown away with each job — and into `-race`: `go vet` of `api` about 80 s, golangci-lint of `tutor` locally 36 s cold and 0.4 s warm, `go run ./cmd/tutor-eval` cold 57 s.
- **The Ubuntu snapshot.** `apt-get update --snapshot` fetches 67.6 MB, the indexes of the live archive and of the snapshot both; `snapshot.ubuntu.com` gave from 259 kB/s to 12.5 MB/s. The step of the build took 366.7 s in a release of `app` and 826 s in one of `canvas`, and "Work out the version" of `api` 81 s and 104 s in two runs of five, against 6–9 s.
- **`spec`'s tests.** The 59 files of `tools/*/test/` take about 9 CPU minutes: locally, 6 at a time, 86 s of wall time and 9 min 1 s of user time. The longest files: `admission-check` 83 s, `format-check` 63 s, `new-repo` 63 s, `contracts-check` 42 s. One `checkAdmission` of a trial copy takes 1.3–2.3 s and one `checkFormat` 1.3–2.1 s, most of it the parsing of the copy's Markdown by micromark, again in every case. In `spec`'s release, "Publish to npm" takes 269 s, of it 54 rounds of 10 s until npm serves the archive.
- **Not measured.** What any change would give: the savings in the rows of COORDINATION.md are estimates. The other architecture only in `sim`: its gate takes 327 s on `arm64` against 388 s on `amd64`. A job waited in the queue about 2 s.

### 3.2. What the changes for the speed of CI gave, 2026-11-16

What the changes for the speed of CI gave, measured 2026-11-16 in `spec`'s devcontainer, 20 cores, `amd64`, without docker. The host ran other containers at the same time, with a load average of 58–104, so the times are of one machine at one load, compared with each other, not with measurements 3.1.
- **The tests of `tools/`.** `node --test --test-concurrency=3 'tools/*/test/*.test.mjs'` — three files at a time, as on a runner of four processors —, `JUST` set as the recipes set it, once on `main` before the changes (commit 922886a) and once with it: 473 s of wall time, 939 s of user time and 126 s of system time, 1053 tests, before; 246 s, 508 s and 103 s, 1063 tests, with it — of which one, a check of the text of `typescript.Dockerfile` that 25 ms took, failed and was fixed after. The three parts, `--test-shard=<k>/3`, one after the other: 88 s, 132 s and 93 s of wall time, 154 s, 179 s and 154 s of user time; the second holds `contracts-check`, the first `format-check` and `new-repo`. `checkFormat` over spec itself, three times in one process: 3.1, 2.4 and 2.4 s before, 3.2, 1.0 and 0.9 s with the cache; `checkAdmission` before: 4.2, 2.7 and 2.8 s, and of the 9.7 s of the three runs `mdast-util-from-markdown` took 8.0 s by a profile of V8. In `format-check`, the parse of YAML — the examples and vectors — took more than that of Markdown, so `readModuleFile` is cached too.
- **The parts.** Node puts every third file into a part, in the order of their paths ([`--test-shard`](https://github.com/nodejs/node/blob/v24.21.0/doc/api/cli.md#--test-shard) of Node.js 24.21.0). With the 65 test files after the changes, the longest — `contracts-check` (`buf` and `go` in each case) and `format-check` — fall into parts 1 and 2 of three, and both into part 1 of two.
- **apt.** The `RUN` of `repo-template/kinds/typescript.Dockerfile` run as root as it is, but with the state of apt in a temporary folder, an empty state of dpkg and `install -s`. With the base image's `ubuntu.sources` and `--snapshot 20261021T000000Z`, as before: "Fetched 67.6 MB", 106 MB of lists, the files of `archive.ubuntu.com` and `security.ubuntu.com` among them. With the source of its own: "Fetched 33.6 MB", 53 MB of lists, and the same 431 packages at the same versions, from the same suites. With `APT::Architecture=arm64`, the same source: "Fetched 35.6 MB", and the 78 packages resolve, 427 with what they need, with no error.
- **CI.** The run 43817645422 of CI on pull request #163, the commit of the changes, read from the GitHub API: 3.5 minutes from its start to the end of "Coverage", against 8.1–10.6 of measurements 3.1. "Checks" took 177 s, of them 35 s the build of `toolchain` over `toolchain-core` from the Dockerfile — a miss of the cache, the Dockerfile being new — and 14 s `docs-check`; "Tests (1/3)", "(2/3)" and "(3/3)" took 104 s, 115 s and 122 s, of them 23–25 s the image, built too, and 66 s, 83 s and 87 s the step Tests, against 425 s for all of it; "Documents and tools" 11 s and "Coverage" 15 s, after "Checks". `codecov/patch` came from the one upload of the three reports and Go's.
- **Not measured.** The time of a release, and the build of the kind's stage by docker: the release of `spec` builds `toolchain-core` once the changes are on `main`, and the first copy of the kind `typescript` that takes the tag builds its stage (rows 7.22–7.24 of [COORDINATION.md](../COORDINATION.md)).

## 4. Tools and services, as seen

What a run of a tool or a service showed, where its documentation says nothing or something else. Each holds the program's version or the service's day, and a link to the code or the page it was read against.

### 4.1. Google: revoking a token and the link "Sign in with Google", 2026-11-12

Seen 2026-11-12, in the triage of `api`'s row В52.
- **CORS.** A POST to `https://oauth2.googleapis.com/revoke` with an `Origin` header and a token known to be wrong got 400 `invalid_token` with `access-control-allow-origin` equal to that origin. Google's [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow), "Token revocation", says the endpoint does not support CORS and has the code submit a form: the answer is not promised.
- **The link.** On `api`'s dev project, after `DeleteAccount` the user was gone at the sign-in service, but the project's connection stayed among the author's connected apps. Google's [help page on links with apps](https://support.google.com/accounts/answer/13533235) says that deleting a link stops automatic sign-in, and nothing of a user deleted at the sign-in service.

### 4.2. Google's "G": its file and how the engines draw it, 2026-11-21

Google's archive of its pre-approved buttons, [signin-assets.zip](https://developers.google.com/static/identity/images/signin-assets.zip), downloaded 2026-11-21: sha256 `ba884069e12093b06bcfd776915081254a7c95094b80d50be2c5dc6bac1c1da1`, its files dated 2026-04-15. Its SVG `Android + Web/SVG/Light/Theme=Light, Show text=No, Shape=Pill, Platform=Android+Web.svg` is the "G" in a white circle of 40 × 40 with the stroke `#747775`; the "G" itself is a mask whose fill is a `foreignObject` with a CSS `conic-gradient`. Without the circle's two paths and with the view box `10 10 20 20` it is the "G" alone, 20 × 20, drawn alike in Chromium, WebKit and Firefox as an `<img>`. What Google's rules allow of it is sources 4.8.

### 4.3. Docker's static archive and the archive of the Dev Containers CLI, 2026-11-15 and 2026-11-17

The sums that check both archives are the `ARG`s beside their versions in `.devcontainer/Dockerfile`; their licenses are sources 9.2 and 9.5.
- **Docker**, 2026-11-15. The folders `x86_64/` and `aarch64/` of [download.docker.com/linux/static/stable/](https://download.docker.com/linux/static/stable/) list archives alone, `docker-<version>.tgz` and `docker-rootless-extras-<version>.tgz`, and no file of checksums: `docker-29.9.3.tgz.sha256` and `SHA256SUMS` beside the archive answered 404. `docker-29.9.3.tgz` holds `docker/docker`, `dockerd`, `containerd`, `containerd-shim-runc-v2`, `ctr`, `runc`, `docker-init` and `docker-proxy`, and no file of licenses; 86 360 685 bytes for `x86_64`, 77 933 624 for `aarch64`. `docker/docker` of the first is an ELF file of 44 320 016 bytes with no program interpreter, a static binary. Docker's apt repository lists the package of the same client, `docker-ce-cli_29.9.3-1~ubuntu.24.04~noble_amd64.deb`, with its SHA256 in [`dists/noble/stable/binary-amd64/Packages`](https://download.docker.com/linux/ubuntu/dists/noble/stable/binary-amd64/Packages).
- **`@devcontainers/cli` 0.90.0**, 2026-11-17. Its [packument](https://registry.npmjs.org/@devcontainers/cli) lists the archive [`cli-0.90.0.tgz`](https://registry.npmjs.org/@devcontainers/cli/-/cli-0.90.0.tgz) with its `integrity`, `sha512-A4ceztBMlNzd1MUlQNel0dWxnkDlE83+WsgS4JOZfeBkbO0QUKEzBpd3UQ7Xqf7s0KzJaAj+Udnp4E8I3oqK3w==`, and a SHA-1 `shasum`, and no sha256; `"engines": {"node":">=20.0.0"}`, no `dependencies`. Downloaded over HTTPS, the archive's sha512 is that `integrity`. It holds eight files under `package/`: `devcontainer.js`, the one `bin`, `devcontainer`, which only requires `./dist/spec-node/devContainersSpecCLI.js`, the bundle; `scripts/updateUID.Dockerfile`, which the bundle reads beside itself; `package.json`, whose `scripts` hold no `preinstall`, `install` or `postinstall`; `LICENSE.txt`, `README.md`, `CHANGELOG.md` and `ThirdPartyNotices.txt`. The bundle is JavaScript alone, the same for every architecture, and `node devcontainer.js --version` prints `0.90.0`.

### 4.4. A container's git credential helper under `docker exec`, 2026-11-15

- In spec's devcontainer, `git config --show-origin --get-all credential.helper` names, in `/etc/gitconfig` and `~/.gitconfig`, a helper that runs `/tmp/vscode-remote-containers-<id>.js git-credential-helper` with VS Code's server, and the variable `REMOTE_CONTAINERS_IPC` is in the environment of its terminal: the helper reaches the window of VS Code, which a `docker exec` without that window has not.
- In `sim`'s container with no window of VS Code open, by `docker exec -u vscode`:
  - `printf 'protocol=https\nhost=github.com\n\n' | GIT_TERMINAL_PROMPT=0 git credential fill` answered "fatal: could not read Username for 'https://github.com': terminal prompts disabled".
  - With `GIT_CONFIG_COUNT=2`, `credential.helper` set first to an empty string and then to `!gh auth git-credential`, the same command answered the username and a password from `gh`, and `git ls-remote origin main` reached GitHub. `git config --get-all credential.helper` then lists VS Code's helper twice, the empty string and gh's: the empty string clears what comes before it.

### 4.5. Dev Containers on a host without buildx, 2026-11-15

Seen 2026-11-15 in the log of Dev Containers 0.469.0 (CLI 0.89.0) on the author's host, Docker 29.1.3 of Ubuntu's package `29.1.3-0ubuntu3~24.04.2`, opening spec's ordinary configuration with the Dockerfile that added the stage `orchestrator`: "docker: unknown command: docker buildx"; then `docker build -f …/Dockerfile-with-features … --target dev_containers_target_stage --build-arg _DEV_CONTAINERS_BASE_IMAGE=devcontainer …/.devcontainer`, the warning "DEPRECATED: The legacy builder is deprecated and will be removed in a future release. Install the buildx component to build images with BuildKit", and the legacy builder ran every stage in the file's order, "Step 31/42 : FROM devcontainer AS orchestrator" included, until "COPY failed: file not found in build context or excluded by .dockerignore: stat orchestrator/docker-gid: file does not exist". With buildx installed on the host, the same configuration opened.
- Why, by the code: devcontainers/cli at [`a190a3f`](https://github.com/devcontainers/cli/tree/a190a3f86fe20b582c25c4dcb7bbf5fdb739ab26), `src/spec-shutdown/dockerUtils.ts`, `dockerBuildKitVersion`, runs `docker buildx version` and returns nothing when it fails; `src/spec-node/singleContainer.ts` then builds with `docker build` rather than `args.push('buildx', 'build')`; `src/spec-node/containerFeatures.ts` appends to the Dockerfile "FROM $_DEV_CONTAINERS_BASE_IMAGE AS dev_containers_target_stage", with "overrideTarget: 'dev_containers_target_stage'". docker/cli at [`fdd4b8e`](https://github.com/docker/cli/blob/fdd4b8e5da335e1d0d83d29af5045f57280cd694/cmd/docker/builder.go), `cmd/docker/builder.go`, prints the warning, and only with `DOCKER_BUILDKIT=1` "ERROR: BuildKit is enabled but the buildx component is missing or broken".

### 4.6. The Dev Containers CLI in a helper container: a rebuild and a creation, 2026-11-17

Seen 2026-11-17, for the orchestrator's rebuild and creation of a container, on the author's host, Docker 29.1.3, from spec's orchestrator container. The CLI is `@devcontainers/cli` 0.90.0 of the stage `orchestrator`, run by `docker run --rm --network host` of that container's own image, with `/var/run/docker.sock` and the clone's folder of the host mounted at the same path, as the user `vscode`.
- `devcontainer up --workspace-folder <the clone of .github> --config <its .devcontainer/devcontainer.json> --remove-existing-container` printed "Running the initializeCommand from devcontainer.json...", ran `bash .devcontainer/host-network.sh` there, and built with "Start: Run: docker build -f /tmp/devcontainercli-vscode/container-features/0.90.0-…/Dockerfile-with-features", with the warning "DEPRECATED: The legacy builder is deprecated and will be removed in a future release. Install the buildx component to build images with BuildKit": the image has no buildx (`docker: unknown command: docker buildx`), as section 4.5 saw on a host without it. It removed the old container, `adoring_dirac`, and started `infallible_wilbur` from the image `vsc-github-<hash>-uid`, the name VS Code's had, in 15 s; its last line was `{"outcome":"success","containerId":"cca4430b2e67…",…}`. The new container has both labels, `devcontainer.local_folder` and `devcontainer.config_file`, with the same values, the volume `novatrail-claude`, the network `novatrail-github` with the alias `github`, and `claude --version` printed "2.1.280 (Claude Code)" in it.
- The same without `--remove-existing-container`, on a clone of `main` made by git in the helper in a folder of the host's `/tmp`, with spec as its submodule (`git clone --recurse-submodules`), started a container in 9 s, its `postStartCommand` run. The container, its two images, its volume `novatrail-vscode-extensions-<id>` and the clone were removed afterwards.
- With `--mount-workspace-git-root false` and git reading nothing of the clone's configuration: the rebuild took `infallible_wilbur` to `upbeat_hoover` in 2 s, its image built from the cache, its clone mounted at `/workspaces/.github` as before, and the listing of the clone's `.git/` the same before and after; the creation on a clone of the host's `/tmp` took 9 s, and its container, images, volume and clone were removed again.
- `docker top <container> -eo pid,args` lists a container's processes, `claude -p …` of an executor among them, with no program in the container. In every NovaTrail container, a window closed or open, the server of VS Code runs (`…/vscode-server/…/out/server-main.js`); a process of Dev Containers with `VSCODE_REMOTE_CONTAINERS_SESSION` in its environment was seen only in the container whose window was open, and no document of Dev Containers names it.

### 4.7. Codecov's `codecov/patch` and `patchcov`, 2026-11-21

How Codecov counts the coverage of a patch, which `tools/patchcov/` repeats, read 2026-11-20 and 2026-11-21 and checked against its checks.
- **The rule.** [About Code Coverage](https://docs.codecov.com/docs/about-code-coverage): "Coverage is the ratio of `hits / (sum of hit + partial + miss)`", a partial line one "not fully executed by the test suite". [codecov.yml Reference](https://docs.codecov.com/docs/codecovyml-reference): `coverage.precision` "Default: 2", `coverage.round` "Default: down", and `parsers.<lang>.partials_as_hits` "false by default". So 1381 of 1460 lines is 94.58, not 94.59.
- **The reading of reports**, by the source of [codecov/umbrella](https://github.com/codecov/umbrella), each file at the commit that last changed it:
  - [`apps/worker/services/report/languages/lcov.py`](https://github.com/codecov/umbrella/blob/8c98cb50/apps/worker/services/report/languages/lcov.py), 2025-11-24: `DA` gives a line its count; `elif method == "BRDA" and not JS:` with `JS = content[-3:] == ".js"`, and `if line_str == "1" and _file.name.endswith(".ts"): continue`; a branch counts `0 if taken in ("-", "0") else 1`; then the line of branches "instead of using `.append`/merge, this rather overwrites the line:", `_file[ln] = _line`, its coverage "taken/total";
  - [`apps/worker/services/report/languages/go.py`](https://github.com/codecov/umbrella/blob/de0a8097/apps/worker/services/report/languages/go.py), 2025-05-07: a block's first line gets `(region.start.column, None, region.hits)`, each line between `(0, None, region.hits)`, and its last line a segment only `if region.end.column > 2:`; one segment gives the line its count, several go through `combine_partials` and `partials_to_line`;
  - [`libs/shared/shared/utils/merge.py`](https://github.com/codecov/umbrella/blob/29a7ceec/libs/shared/shared/utils/merge.py), 2025-05-15: `branch_type` — "0 = hit", "1 = miss", "2 = partial"; `LineType.hit if b1 == b2 else LineType.miss if b1 == "0" else LineType.partial`.
- **The fixes of Go.** [codecov/codecov-cli](https://github.com/codecov/codecov-cli/blob/2f5121284e3c7c3c2b691a09cb0ea135d226f112/codecov_cli/services/upload/upload_collector.py) at `v11.3.2`, `_produce_file_fixes`: for `"*.go"`, the lines that match `^\s*$`, `^\s*\/\/.*$`, `^\s*[\{\}]\s*(\/\/.*)?$` and `^\s*func\s*[\{]\s*(\/\/.*)?$`, and with a reason `^\s*(\/\*|\*\/)\s*$`, are sent as fixes, which the service leaves out — umbrella's `fixes.py`, commit `7d10dc30`, 2024-09-11, with the lines between a block's start and its stop —; TypeScript has none.
- **The check.** Checked by `tools/patchcov/` against `codecov/patch` of five pull requests, by the reports of their artifacts: `app` #106 at `48183751`, 84.65%, and at `4698f4a3`, 94.58% — 1381 hits, 1 miss, 78 partials —; `api` #135, 97.03%; `tutor` #209, 94.26%, which takes the fixes of Go; `module-kit` #95, 98.76%.

## 5. The models of a task from paper

What a run of the models on a call of a task from paper showed, before the call's eval set measures it: the sheet, the request, each model and its effort, the time, the tokens and the cost.

### 5.1. The drawing of grown-up mode, 2026-11-24

A probe of the drawing before its prompt, outside the repositories: one system prompt, one tool `draw` with `tool_choice` `auto`, called by `curl` on the Messages API of Anthropic with the developer key. The tool took marks — an SVG path, a polyline, an ellipse, or a line of text that the probe's program drew in a hand — in the sheet's units, the ids to erase, and `say`, the words to the grown-up; the contract's act is ready strokes instead. The model got the picture of the sheet, 1200 × 900 units at 1 pixel to a unit, 4 units to a millimetre, and its strokes as JSON, each its id, who drew it and its points, thinned to at most 30 and rounded to whole units, with no time and no pressure. The sheet is synthetic, drawn by the probe's code as a learner's hand would: the axes with their ticks and labels and the graph of x·sin x + 1 from 0 to 3.5, 26 strokes.
- **Step 1**, the integral of the function from 0 to π, its solution written on the sheet: 4156 input tokens. Opus 5.5 at `high`, the probe's default, wrote the solution by parts and the answer 2π ≈ 6.28, correct, for $0.05; Haiku 5.5 at `high`, the same answer, correct, in 12 s for $0.002.
- **Step 2**, the area of that integral hatched on a 2 mm grid, the sheet holding Opus's solution of step 1 as 7 marks of the tutor beside the 26 strokes: 4733 input tokens.

  | Model · effort | `max_tokens` | Time | Output tokens | Cost | The drawing |
  |---|---|---|---|---|---|
  | Opus 5.5 · `high` | 32000 | 56 s | 6824 | $0.15 | precise: the grid ends on the curve and at x = π |
  | Sonnet 5.5 · `high` | 32000 | 35 s | 5369 | $0.06 | precise |
  | Haiku 5.5 · `high` | 32000 | — | 32000, all thinking | — | none: the answer stopped at `max_tokens` with no call of the tool |
  | Haiku 5.5 · `high` | 64000 | 177 s | 44142 | $0.023 | precise |
  | Haiku 5.5 · `medium` | 64000 | 102 s | 25218 | $0.013 | precise |
  | Haiku 5.5 · `low` | 64000 | 24 s | 5900 | $0.003 | vertical lines alone, no grid |

- **The words.** Every model called the tool once and said what it did in the language of the request, Russian, in the first person: Haiku at `high` in the feminine, the others in the masculine.
- **Not measured.** One sheet and one request of each step, one run of each, with no eval set: no share of acts gone wrong, and no other kind of act — writing over a line, striking out, erasing — beyond the solution of step 1.
