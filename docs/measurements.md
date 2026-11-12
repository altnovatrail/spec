# NovaTrail — measurements

> The results of the platform's measurements: what was measured, how, on what, and what numbers came out. The documents that describe how things are built — [architecture.md](architecture.md) and [repositories.md](repositories.md) — refer here and hold no numbers of measurements themselves (R143). A measurement is cited by section, like any document: `measurements 1.3`, and from another repository `measurements 1.3 spec`.
>
> An external fact a measurement rests on is a record of [sources.md](sources.md). The quotes of Claude Code's documentation in section 1 moved together with the text of repositories 9, where they stood until T133, and stay with their measurements; new ones go into sources.md (RUN.md, T133).

## 1. Claude Code sessions

How the spending of Claude Code sessions in NovaTrail's repositories is measured, and what the tasks of epic E10 compare their numbers with (RUN.md, T118–T126, T128 and T129). The figures here are only sums. There is no text of transcripts, neither here nor in the recipe's output: a transcript can hold anything the author typed.

### 1.1. The measurement

`just tokens-report` in `spec`, and in another repository `just -f spec/justfile tokens-report`, reads this machine's Claude Code transcripts for the git repository it was run from, and prints the numbers by session and in total. The code is `tools/tokens/`, the tests are `just tokens-test`, on synthetic transcripts.

- **Where the transcripts are.** A session is written to `<config>/projects/<folder>/<session>.jsonl`, its subagents to `<config>/projects/<folder>/<session>/subagents/agent-<id>.jsonl`. `<config>` is `$CLAUDE_CONFIG_DIR`; in the devcontainer it is `/home/vscode/.claude` on the volume `novatrail-claude`, and without the variable `~/.claude`.
  - `<folder>` is the path of the git root, with every character but a Latin letter and a digit replaced by "-": `/workspaces/spec` — `-workspaces-spec`, `/workspaces/.github` — `-workspaces--github`.
  - The sessions of the copies in `.repos/` start in `spec` and are counted under it.
  - A cloud session keeps its transcript not on this machine, and the recipe does not see it.
  - The flag `--project <folder>` sets the folder explicitly.
- **A call of the model** is a message of the model, once by its `id`: the transcript repeats the message and its `usage` in an entry for each block. The cache fields of the repeats are the same, while `output_tokens` grows, and the largest is taken. In `spec`'s transcripts before the start of T118, 2026-11-11T03:59:01Z, there are 74,455 message entries, of them 32,465 calls, and in 6,330 the output differed.
  - API errors (the model `<synthetic>`) are not counted.
  - Subagents are counted under their session, but in a column of their own.
  - A call's context is the uncached input, the cache reads and the cache writes, for 5 minutes and for an hour; the cost is by the prices of section 1.2.
  - The cross-check is Claude Code's own estimate in the `cost-state` entries. For all of `spec`'s time until 2026-11-11T03:59:01Z it is $2,860.07 against $2,841.86 by the prices of section 1.2.
- **What entered between calls** — tool results, the author's words, reminders, attachments — is measured, not estimated by length.
  - The growth of context is a call's context minus the context of the previous call and its output. It is shared among what entered in proportion to characters.
  - The model's output is a group of its own.
  - An attachment is counted by what it rendered into the context (the field `rendered`). The snapshot of the system prompt is counted only at the start of a session, and entries with nothing rendered — deferred tools, a dropped reasoning — are not counted.
  - The start of a session, the start of a subagent and what a compaction left enter whole — as the context of the first call.
  - A session continued in a new transcript copies its history into it, and the earlier transcript has already counted it. What was copied is dropped, and the history enters whole, as the group "history of a resumed session". `spec`'s transcripts before T118 have none.
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
- **What it does not see** — calls of `claude -p --no-session-persistence`: they have no transcript. graphify calls the model so (section 1.4).
- **What is printed** — only numbers, paths, the names of tools, attachments and programs, session IDs and the first task number `T…` from the author's first prompt. A program or second word that does not look like a name is printed as `other`.
- **Flags:**
  - `--since` and `--until` — an ISO 8601 date or time. A time without a zone is taken in UTC, `--until` is not included, and a date means the start of the day;
  - `--project` — the transcript folder of another project: a name under `<config>/projects`, which starts with "-" and is therefore written with "=" (`--project=-workspaces-app`). The recipe takes no path and reads nothing outside `<config>/projects`: SonarCloud takes a path from the command line for a directory traversal (S8707), and a name is enough. Paths are printed from the folder where most of its sessions started;
  - `--top` — the length of the lists, 20 by default;
  - `--json` — the same numbers in JSON, for comparing baselines.

### 1.2. The weights

The prices are [Anthropic's pricing page](https://platform.claude.com/docs/en/about-claude/pricing), read 2026-11-11. The rows of its table: "Claude Opus 5.5 | $4 / MTok | $5 / MTok | $8 / MTok | $0.20 / MTok | $20 / MTok" and "Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok". The columns are input, a cache write for 5 minutes, for an hour, a cache read and output. On the same page: "Cache hits and refreshes on Claude Opus 5.5 and Claude Sonnet 5.5 are priced at 0.05x the base input price".

- A long context does not change the price: "Claude 4.6 and later models (except Claude Haiku 5.5)… include the full 1M token context window at standard pricing".
- Fast mode has prices of its own, and the recipe counts a call in it as a call without a price. `spec`'s transcripts have none: every `speed` is `standard`.

The prices are in `tools/tokens/prices.mjs`; a new model or a new price is an edit both there and here. How spending goes into a subscription's limits, Anthropic does not publish (Т-39). So the measurement weighs a call by these prices, and on the trial of T119 the weight is checked once against the share of the limit from `/usage` (R142).

### 1.3. `spec`'s baseline

The sessions of E4 and E9 — from the start of 2026-11-09 to the start of the first session of T118, under the present rules and the present sizes of the documents (decided by the author on 2026-11-11 in the planning of T118):

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

  The rule "one task is one session" did not hold in the window. This is the input of T120.
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

Later measurements — of T124, of each epic's archive and the monthly ones — are rows of the table of section 1.9, by the same recipe with `--row`; the baseline is its first row (R145).

### 1.4. Code map tools

The tools that give an agent a map of the code instead of reading files were examined from the primary sources and by a trial on `tutor` and `spec` (RUN.md, T119). Everything was read 2026-11-11.

**From the primary sources:**

- **A language server in Claude Code** — the plugins `gopls-lsp` and `typescript-lsp` from `claude-plugins-official`.
  - What it gives ([Code intelligence](https://code.claude.com/docs/en/plugins/code-intelligence.md)): "gives Claude the live diagnostics and go-to-definition that your editor has… and finds definitions and references by symbol instead of by text search". The tool `LSP` — "jump to definitions, find references, report type errors and warnings" ([Tools reference](https://code.claude.com/docs/en/tools-reference.md)).
  - The server is installed separately: "It doesn't include the language server. Install the language server binary first".
  - Diagnostics after each edit go into the context by themselves: "each time Claude edits or writes a file the server handles, Claude gets the errors and warnings the server reports".
  - It does not work in a cloud session: "In cloud sessions, Claude Code doesn't start plugin language servers".
  - The page says nothing about saving tokens.
  - It reads no documents: only code that has a server.
  - The content goes nowhere but to the session's model.
  - gopls is BSD-3-Clause, and it is already in the devcontainer of the Go repositories (R102). TypeScript needs `typescript-language-server`, an npm package.
- **The paper [arXiv 2608.13568](https://arxiv.org/abs/2608.13568)** — P. Xu, 29 June 2026, a preliminary study on Python and TypeScript repositories; Claude Opus 4.8, Sonnet 4.6 and Haiku 4.5.
  - The main finding: "The answer is conditional and usually negative. On symbol-named localization the LSP costs tokens (+6% to +118%) and the agent ignores it when free. On reference-completeness it buys precision but not token savings… it saves tokens only for the weakest model".
  - On renames across many files: "grep solves multi-file renames perfectly, a location-only LSP fails three-quarters of them by missing a call site".
- **Serena** ([oraios/serena `v2.1.0`](https://github.com/oraios/serena/blob/v2.1.0/README.md)) — an MCP server on top of language servers: "semantic code retrieval, editing, refactoring and debugging tools… operating at the symbol level".
  - More than 40 languages, among them Go, TypeScript and Markdown, but as language servers, not as reading of text.
  - The license ([LICENSE](https://github.com/oraios/serena/blob/v2.1.0/LICENSE)): "SolidLSP under the MIT License and the Serena application under GPL-3.0-or-later", so the package `serena-agent` as a whole is GPL-3.0-or-later. By R12 it is allowed only as a development tool that does not ship, and only as a named exception.
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
- The questions of `spec`: which decision sets the production image; which files cite privacy 5.3; what a renumbering of R81 would affect; what `legal.in-force-unchanged` checks.

| Tool | Runs | Correct answers | Cost of a run on average | Against "no tool" | Turns on average | Used the tool |
|---|---|---|---|---|---|---|
| `tutor`, no tool | 12 | 12 | $0.172 | — | 5.9 | — |
| `tutor`, LSP | 12 | 12 | $0.188 | +9 % | 7.3 | 9 calls of `LSP` |
| `tutor`, Serena | 12 | 12 | $0.164 | −5 % | 5.4 | never |
| `tutor`, graphify | 12 | 12 | $0.216 | +25 % | 6.5 | 14 calls of `graphify` |
| `spec`, no tool | 12 | 9 | $0.199 | — | 5.0 | — |
| `spec`, graphify | 12 | 10 | $0.262 | +32 % | 5.3 | 5 calls of `graphify` |

- **The cost** is the run's `total_cost_usd` by the prices of section 1.2. The spread of one question between repeats is up to 1.5×: for the question about the chain to `Admit` with no tool, from $0.22 to $0.33. A difference below ≈ 10 % is noise.
- **The incomplete answers** on `spec` are all on the first question: the answer left out R105's caveat "any other runtime only by an amendment".
- **The start of a session** is 37–43 thousand tokens in each branch. This is most of the context of a short question, and no tool reduces it.
- **Serena** connected: its two tools lay among the deferred ones, behind ToolSearch. But the agent never searched for them and answered through `grep`. Its −5 % is the noise of a branch that did not differ from "no tool".
- **graphify on `spec`.** The graph took 69 minutes to build: 7,696,533 tokens of input and 568,346 of output for Sonnet 5 through `claude -p` on the subscription. graphify gives no breakdown by cache, so by the prices of section 1.2 this is from ≈ $7 (all input from the cache) to ≈ $25 (all input a cache write). The graph is 38,650 nodes; it has to be rebuilt with every edit of the documents, and the model reads the changed files again. graphify calls `claude -p --no-session-persistence`, and these calls have no transcripts: `just tokens-report` does not see them.
- **graphify's hooks** (`graphify claude install`) write a section into the clone's CLAUDE.md and `.claude/settings.json`. Claude Code's shared settings did not change: `~/.claude/settings.json` and the list of plugins are the same before and after the trial.

**The conclusion:**
- **Code.** On the questions "where is it defined", "who calls it", "what would an edit break", every tool answered as correctly as `grep` and `Read`, but not more cheaply. LSP is +9 %, graphify +25 %, and the agent did not take Serena. This agrees with the paper arXiv 2608.13568. A language server also gives diagnostics after an edit, which the trial did not measure; that is an argument about the quality of edits, not about tokens.
- **Documents.** The language server and Serena do not read Russian text as text. graphify does, but its branch is a third more expensive, and the graph costs $7–25 and an hour to build at every large edit. The agent's answers to questions about the documents are almost all correct without a graph too.
- **Where the spending really is.** The trial lacked what is expensive in real work: a long session, where each read carries context into every following call (section 1.3). A short question costs $0.10–0.33, and its base is the start of the session. Savings are to be looked for in the start of a session, its length and the structure of the documents — T120 and T125 — not in a map of the code.
- **The recommendation for T121:** take no code map tools. The gopls plugin can be turned on separately, for the diagnostics after an edit, but not as a saving; that is worth deciding in the course of work in a code repository, not in E10.

**The check of the weights (R142)** — by the share of the limit from `/usage` before and after the whole trial, as the author decided:
- the five-hour session limit — 21 % at 13:47 and 87 % at 15:08, that is +66 percentage points; the weekly one — 37 % and 48 %, +11 percentage points;
- for the same window all sessions of this machine weigh $46.48 by the prices of section 1.2: the trial $12.71, the sessions of `api`, `canvas`, `learner-model`, `modules` and `spec` $33.77. To this add the graphify pass, ≈ $7–25, which the transcripts do not see. In total ≈ $53–72;
- so 1 percentage point of the five-hour Max limit ≈ $0.8–1.1 by API prices, and 1 percentage point of the weekly one ≈ $5–6.5;
- The share of the limit counts everything the author did in Claude — "Your usage of all different Claude product surfaces (claude.ai, Claude Code, Claude Desktop) counts towards the same usage limit" (Т-39). The weight above is only this machine's sessions, so the conversion is an upper estimate of the price of a point. This is one point, not a check of proportionality. R142 keeps API prices as the weight, and the conversion into shares of the limit is by these numbers.
- The breakdown of `/usage` for the day as of 2026-11-11 — for T120: "95% of your usage came from subagent-heavy sessions", "84% of your usage was at >150k context", "82% of your usage was while 4+ sessions ran in parallel", "70% of your usage came from sessions active for 8+ hours".

### 1.5. How sessions work

Which changes to the way of work itself cut the sessions' context — by the numbers of section 1.3, by the transcripts of all 13 repositories of this machine, by the documentation of Claude Code and by two trials (RUN.md, T120). The documentation was read 2026-11-11.

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

**Recommendation for T121** — in order of saving:
1. One task is one session: a rule of RUN.md, and «Выполни задачу» in a new session or after `/clear`. The planning and the execution of one task are one session.
2. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` at about 400 thousand — in `containerEnv` of the template's devcontainer and of `spec`.
3. A thin CLAUDE.md with the rules of the parts by `paths` and a line saying where they are.
4. `ENABLE_CLAUDEAI_MCP_SERVERS=false` in the devcontainer — if the author does not need the claude.ai connectors in NovaTrail's repositories.
5. Do not: a cheap model for subagents, a map in the rules, a change to the output of the checks.

### 1.6. The structure of the documents

How to restructure the documents and the supporting files so that a session takes fewer tokens and loses nothing it needs for its work (RUN.md, T125). The sample on the decision log and the "lossless" check are T128. The reader of `docs/` is a session of Claude Code: the author does not read them (the author's word of 2026-11-11, epic E10). The sources of the numbers:
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
| English text with schemas and code — the [format text](../format/README.md), section 5 | 2.50 | 2.50 |

For T126's budgets in bytes, the lower bound of the text's own kind, so that a limit in bytes does not let through more tokens than intended: Russian text — 3.2 bytes per token, Russian tables and numbers — 2.7, English — 2.5. The ratio of 2.05 characters per token from section 1.3 belongs to everything that enters between calls, code and JSON included, not to the documents.

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
  - on the transcripts of `module-kit` the report fails (Д209), and its numbers were obtained with a copy of the recipe fixed in the scratchpad; the recipe itself was fixed by T126 (section 1.9).

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
| A consolidation of the decisions in force beside the log: a decision with its amendments merged in and "Rejected" in one line; the log stays as history | ≈ 0.5–0.7% by the sample of T128, below: the logs carry 2.6% and `spec`'s log from the submodules another 0.25%, while the consolidation is 60% of the log and saves 17–24% of what the readings carry | the consolidation diverges from the log; what was rejected is lost and proposed again | the "lossless" check of T128 |
| "Sources" and the results of measurements move from `docs/architecture.md` to files of their own | ≤ 0.8%: `architecture` carries 2.7%, and 30.5% of it goes, if each file is weighted by how much it carries. "Sources" — from 7% in `spec` to 58% in `.github`; measurements — only in `tutor`, 43% | a claim comes apart from its source, while the bar of RULES.md requires it with its date | a link to the source's record, which `docs-check` resolves |
| A file per section for the large documents | little: the readings are partial anyway, and one `grep -n` finds a section | anchors and links to lines break. It needs changes to `documents`, `citations.mjs`, `sections.mjs` and `docs-check-repo` (R32) in all 13 | — |
| A log entry per file | little: an entry gets no shorter from it, and the reading is partial anyway | the same as with a file per section | — |
| A table of contents at the start of the log, which `docs-check` builds and checks | little: one `grep -n` by its number finds an entry anyway, and a table of contents of 142 lines itself lands in the context with every reading of the start | the table of contents lags behind the entries | a check in `docs-check` |
| A shorter card of architecture 3, since the detail is in the repository | ≤ 0.6% | — | — |

**Language.** Six sections of different kinds and one table were translated into English — in full, with the same numbers, links and figures. The translations are in the session's scratchpad, not in the repository.

| Section | Characters, Russian | Tokens, Russian | Tokens, English | Difference |
|---|---|---|---|---|
| the entry R83 with its amendments | 32,897 | 14,921 | 13,324 | −10.7% |
| the entry R105 | 10,750 | 4,746 | 4,326 | −8.8% |
| architecture 3.6 | 9,740 | 4,305 | 3,973 | −7.7% |
| concepts 9 | 12,117 | 5,250 | 4,508 | −14.1% |
| privacy 5.3 | 9,784 | 3,909 | 3,507 | −10.3% |
| product 13, the table | 33,071 | 14,144 | 12,295 | −13.1% |
| measurements 1.3 | 3,117 | 1,688 | 1,449 | −14.2% |
| **total** | 111,476 | 48,963 | 43,382 | −11.4% |

- **Saving.** English is cheaper by 8–14%, not several times: Russian text has ≈ 2.3 characters per token, English ≈ 2.8, but a translation is longer than its original: by 2–20% of the characters for a section and by 10% in total.
  - Only `docs/` without the archives can be translated: RUN.md, the archives and COORDINATION.md stay in Russian. That is 12.2% less 4.9%, 0.2% and 0.2% — 6.9% of what was "carried", and the translation would save ≈ 0.8% of the total.
  - The price of the translation: 12.2 MB of `docs/` without the archives, ≈ 3.6 million tokens; model output of ≈ 3.2 million tokens, ≈ $65 at the prices of section 1.2, without checking and review.
- **Risk.** A translation changes the form: in architecture 3.6 it split long items into sub-items, and there were 60 lines instead of 30. Translating all the documents is an edit of every line of 13 repositories, and the "lossless" check of T128 would have to be run on all of it.
- **What does not change.** The prefixes of the registers О-, П-, Т-, «Д» and «В» are Cyrillic in English text too. Quotes of Russian laws and sources stay in Russian. The author reads RUN.md, the reports and COORDINATION.md, and they stay in Russian.
- **The bar of RULES.md** ("The bar") holds for a reader that is an agent too: one term — one meaning, a source with its date, a gap — an open question, a decision with "why" and "rejected". Only the addressee of the first sentence changes — an engineer, a module author or a lawyer — and the structure is chosen for reading in parts. T121 decides this.

**Density** — over the seven sections above:
- quotes of sources — in privacy 5.3 they are 29%, in R105 12%, in product 13 8%, in R83 6%. The bar requires them, and they do not compress;
- links in parentheses — `(R83)`, `(concepts 10)` — 10–60 per section. They are short, and by them the session finds the rest;
- history and reasoning that are rarely needed are the amendments of the log, the bodies of done tasks, the results of measurements and "Sources" in `architecture`. These can be moved out of what is read every time;
- "Rejected" cannot be moved out: RULES.md forbids proposing what was rejected again without new facts, and the session needs to see it.

**The order of the restructuring:**
1. `spec`: RUN.md, and the consolidation of the log — if T121 takes it, though the sample of T128 advises against it;
2. the template `repo-template/`: the rule of RUN.md about the bodies of done tasks and the budgets of T126 — so that a new repository starts that way already (repositories 2.2);
3. the repositories — by `spec`'s sample, in tasks T123: each restructures its RUN.md, `docs/architecture.md` and log in a session of its own.

**Recommendation for T121** — in order of saving:
1. A done task's body goes to the archive at once, in all repositories: ≤ 1.9%.
2. `spec`'s table 4 goes to a file of its own or gets shorter: ≤ 3.9% in `spec`, ≈ 1% of the total; the author decides.
3. "Sources" and the results of measurements move from `docs/architecture.md` to files of their own: ≤ 0.8%.
4. A consolidation of the decisions in force — the sample of T128 measured ≈ 0.5–0.7% and advises against taking it for the saving.
5. Do not: the translation into English — −11% for the documents, ≈ 0.8% of the total, ≈ $65 and a risk of losses; R14 stays. Do not do a file per section, an entry per file, a table of contents of the log or shorter cards either.

Together this is no more than ≈ 5.5% of what was "carried", and by the sample of T128 for the consolidation ≈ 4.4%. "One task is one session" gives −51% (section 1.5), and the changes overlap: in a short session what was brought stays for fewer calls, so the documents' saving is smaller too. The restructuring of the documents is a saving of the second order, and the budgets of T126 hold the growth.

**Sample: a consolidation of the decisions in force** (RUN.md, T128), 2026-11-11. The consolidation was made in a clone of `spec` on the E10 branch, in a temporary branch in the session's scratchpad, and does not go into the repository.

- **The slice** is the 15 entries of `spec`'s log with the most amendments and readings: R12, R25, R30, R31, R36, R37, R44, R45, R48, R51, R56, R57, R64, R76, R83.
  - That is 326,638 characters, 29.5% of the text of the entries, and 155 of the log's 363 amendments. T125 counted 310: it did not count "Second amendment" and the like.
  - The readings were counted by the tool calls in the transcripts of all 13 repositories: those that name `spec`'s log and the number of the entry. Most often tasks look for an entry's amendments in it.
- **Structure.** The consolidation is the file `docs/decisions-current.md` beside the log. An entry of the consolidation is `### R44.`:
  - the heading in its wording in force;
  - the items of the rule in force, the amendments merged in, without the history and without "Why";
  - "*Rejected:*" — everything rejected that is still in force;
  - "*Where:*" — the sections of the documents;
  - "*Also:*" — the decisions that changed the entry without an amendment to it;
  - "*Log:*" — the number of amendments, the date of the last one and the fingerprint of the log's entry.

  The consolidation was written by five subagents, three entries each, from one brief.
- **Size** — in tokens, by the counting method above. The log's entries have 144,828, the consolidation 85,510, that is 59%. By entry — from 45% for R56 to 75% for R76.
  - The text of a decision and the amendments compress almost equally — to ≈ 0.61 and ≈ 0.57: the arguments and the history go, and the rules stay.
  - For the whole log, ≈ 490 thousand tokens, the consolidation will come to ≈ 295 thousand, ≈ 60%. T125 expected 40–55%.

**Trial** — 2026-11-11, 17:06–17:14 UTC.
- 15 questions, one per entry. The answer to each is in an amendment, not at the start of the entry; the reference answer is by `git grep`.
- Two branches: the clone as it is — "log" — and the clone with the consolidation and a line in CLAUDE.md and RULES.md: read the consolidation, and the log when the arguments and the history are needed.
- Two repetitions each, each a `claude -p` on Opus 5.5, reading only. The price of a run was named by the pilot, and the author confirmed it.
- The answers were graded by a subagent blind, without the branch labels, by the required facts of the reference answer.

| Branch | Runs | Right / incomplete / wrong | Cost of a run | Turns | Context of the calls, thousand | Context growth per run, tokens | Characters of decisions read |
|---|---|---|---|---|---|---|---|
| log | 30 | 27 / 3 / 0 | $0.251 | 6.0 | 266 | 8,224 | 13,024 |
| consolidation | 30 | 27 / 2 / 1 | $0.209 | 3.9 | 173 | 6,265 | 10,754 |

- **The wrong answer** is an error of retelling: the session inverted the condition of `release-refusal`, though the consolidation says the same as the log. The two incomplete grades of the consolidation came from the rubric: it asked to name the former 60 minutes of R37 too, while the consolidation holds the 85 in force by R64.
- **What the consolidation saves.**
  - First of all turns, −35%: the sessions do not have to look for the amendments through the entry.
  - Of the text of decisions read, only −17%: the session reads an entry of the consolidation whole, and the log in parts, by `grep`.
  - Context growth per run — −24%. This is what a long session carries to its end (section 1.5).
- **The log** was opened by 7 runs of 30 in the branch "consolidation" — for the history and the arguments.
- **The start of a session** — 42,226 tokens for "log" and 42,457 for "consolidation": the lines about the consolidation in CLAUDE.md and RULES.md added ≈ 0.2 thousand.
- **The pilot** — one run on R44 and R83 in each branch — cost $0.45–0.61 per run: the cache was cold. In the trial the start of the session was already in the cache, and the 60 runs cost $13.81, not ≈ $32 as by the pilot.

**Saving on the whole.** The logs carry 2.6% of what the 13 repositories "carried", `spec`'s log from the submodules another 0.25%. By the trial, the consolidation saves 17–24% of this, by size no more than 40%. So ≈ 0.5–0.7% of the total and no more than 1.1%. T125 estimated 1.3–1.7%.

**Price.** The trial's runs, the pilot and the token count — $18.2 at the prices of section 1.2, the consolidation of the slice by subagents — ≈ $5. A consolidation of the whole log will cost ≈ $17, and each of its entries will have to be looked through in review. After that, every amendment pulls an edit of the consolidation's entry after it.

**"Lossless".** The prototype of the check is `tools/docs-check/current.mjs` in the clone's `docs-check`; `just docs-check` in the clone is green.
- **What is checked without a model:**
  - an entry of the consolidation is in the log and stands in its order; a full consolidation has every entry of the log;
  - the fingerprint is the first 8 characters of the sha256 of the log's entry, with the number of amendments and the date of the last one. Trial: an amendment to R44 in a copy of the log gave an error with the former and the new fingerprint, and the error holds until the consolidation's entry is rewritten;
  - the consolidation cites nothing that its log entry does not cite: the numbers R, О-, П-, Т-, «Д» and «В», the decisions of other repositories, the sections of documents. Trial: an extra link is an error;
  - an entry that rejects something has a line "*Rejected:*". Trial: without it, an error;
  - the consolidation's links, like those of any document, are resolved by the ordinary check of `docs-check`.
- **Links of other repositories.** The log stays, the numbers R are the same, the sections of the documents do not change. So "R44 spec" is resolved by `docs-check-repo` (R32), as now. An entry of the consolidation is found by `grep -n '^### R44\.'`.
- **What only review checks:**
  - the meaning — that the consolidation says the same as the entry and its amendments. The check only lists which of the log's links the consolidation left out. In the slice there are 197 of them, and almost all are history: closed questions Т-, rows «В», done tasks;
  - what was rejected. The subagents left out 6 options about how tasks were planned and how to read the log itself. That is intended, but it is a judgement;
  - **changes from outside.** In 6 entries of 15 the text in force is set by another decision, and the entry itself has no amendment:
    - R64 raised `timeout-minutes` of the job of R37 to 85;
    - R36 keeps the marks `marks` temporary until the contract of epic E3, while R74 and R97 have already merged them with `Mark` of the contract `novatrail.api.v1`; R90 closed О-24 from R36;
    - R127 closed П-20 from R51;
    - R31 caches the image of the `toolchain` stage which by R30 and by the 2026-10-22 amendment to R12 "is built on every run";
    - R135 added `spec.Export` to the embedding of R64.

    The fingerprint does not see this: the log's entry did not change. The consolidation names such decisions in a line "*Also:*"; the check accepts their links but prints them for review. Each such line is an amendment that the log lacks.

**Recommendation for T121:** do not take the consolidation of the decisions in force as a means of saving.
- It is as right as the log — 27 of 30 in both branches — and 40% shorter.
- But it saves ≈ 0.5–0.7% of the total. That is less than T125's estimate and many times less than "one task is one session" (section 1.5).
- And keeping it means editing the consolidation with every amendment and checking the meaning in review: the check will not replace that.
- If the author takes the consolidation for clarity, then only in `spec`, with the prototype's check in `docs-check` and with the rule: a decision that changes another puts an amendment on it — then there are no "*Also:*" lines.
- Rejected: the consolidation instead of the log — the history and the arguments are needed, and a decision is never rewritten (RULES.md, How we work).

### 1.7. One task is one session: the hook and the settings

How R143 keeps a session short and what this gave the start of a session (RUN.md, T129). The documentation of Claude Code was read 2026-11-11; the version of Claude Code in the container is 2.1.280.

**The hook** is `UserPromptSubmit`, its code is [tools/session/](../tools/session/main.mjs), its tests are `just session-test`, on synthetic transcripts. `spec`'s `.claude/settings.json` calls it as `${CLAUDE_PROJECT_DIR}/tools/session/main.mjs`, and the template's from the submodule, `spec/tools/session/main.mjs` (R21). It takes no packages from `node_modules`: another repository's `spec/` has none.
- **What it sees.** Claude Code gives the hook the prompt and the path of the transcript on stdin: «UserPromptSubmit hooks receive the `prompt` field containing the submitted text», and among the common fields `transcript_path`, «The transcript file is written asynchronously and may lag the in-memory conversation» ([Hooks](https://code.claude.com/docs/en/hooks.md)). So the hook relies neither on the prompt being in the transcript already nor on its not being there.
- **The start of a task** is the phrase «Выполни задачу T…» or «планируй T…» in the forms the author writes — «выполни T…», «Планируем задачу T…», «планируй реализацию T…» — anywhere in the prompt: «далее планируем T…» happens too. One word may stand before the number — «задачу», «задачи» or «реализацию» — and «не» before the phrase cancels it. T07 and T7 are one task. The phrase does not count in code, in guillemets «…», in an editor selection, in pasted text, in reminders, in the output of local commands and in the report of a background task — Claude Code gives that to the hook too and writes it as a record whose `origin` is not `human`: there the phrase is quoted, not said. That is how RUN.md and COORDINATION.md quote «Выполни задачу T01 из RUN.md».
- **What it stops** is a prompt that starts a task when the session has already led another. The same task passes; prompts that start no task always pass, and for them the hook does not read the transcript. «Разбери входящие» names no task and passes too: R143 counts the triage as part of the session of the task it serves, before its planning or after, and the next task will be stopped by its own phrase.
- **How it stops** — the JSON `{"decision": "block", "reason": …}`: «`"block"` stops the prompt before it reaches Claude», and `reason` is «Shown to the user when `decision` is `"block"`. Not added to context» ([Hooks](https://code.claude.com/docs/en/hooks.md)). The reason names both tasks, the rule of RULES.md, How we work, and `/clear`. Claude Code writes the stopped prompt to the transcript as a `system` record, not as the author's prompt — so in the trial with `claude -p --resume` on 2026-11-11 — and it does not get in the way of the hook at the next prompt.
- **A new session.** `/clear` ends the session and starts a new one: `SessionEnd` has the reason `clear` — «Session cleared with `/clear` command» ([Hooks](https://code.claude.com/docs/en/hooks.md)), and the new one has a transcript of its own. Compaction does not end a session: the earlier prompts stay in the same transcript, and the hook sees them, while it does not read the compaction summary (`isCompactSummary`).
- **It fails open.** An input or a transcript that the hook could not read it does not stop: exit 0 with no output. For the first prompt of a session there is no transcript yet. If the hook's file itself is missing — the `spec` submodule was not fetched or stands at a tag without `tools/session/` — Claude Code cannot run it and shows a hook error on every prompt, but lets the prompt through: «a hook that can't start is a non-blocking error too» ([Hooks](https://code.claude.com/docs/en/hooks.md)).
- **Time.** The hook checks a prompt with a task's phrase against `spec`'s longest transcript, 79 MB, in 0.6 s, and one without the phrase in 0.1 s, without reading the transcript; «`UserPromptSubmit` hooks have a default timeout of 30 seconds» ([Hooks](https://code.claude.com/docs/en/hooks.md)). It parses only the lines of `user` records without tool results.
- **What it does not see.** A branch that the author rolled back (`/rewind`) — it stays in the transcript, and a task named in it counts: then only `/clear` helps. Nor does it tell another repository's task number from its own: in `spec` a phrase about a task of `api` without guillemets is a task too.
- **On past sessions.** Of the 447 transcripts of the main sessions of this machine, of all repositories, the hook would have stopped a prompt in 60.

**The settings** — in `spec`'s `.claude/settings.json` and in the [template's](../repo-template/files/.claude/settings.json):
- `"autoCompactWindow": 400000` — «Set how full the context window gets before Claude Code compacts automatically… number of tokens, from `100000` to `1000000`» ([Settings reference](https://code.claude.com/docs/en/settings-reference.md)). A compaction window that the author set overrides it only for the same model in the same file: «A window you saved for a model with `/autocompact` takes precedence over this key in the same file for that model», and the variable `CLAUDE_CODE_AUTO_COMPACT_WINDOW` overrides the key ([Model configuration](https://code.claude.com/docs/en/model-config.md)).
- `"disableClaudeAiConnectors": true` — «A `true` in any settings file applies: a checked-in project `.claude/settings.json` can opt a repository out of those connectors» ([Settings reference](https://code.claude.com/docs/en/settings-reference.md)). Only those that Claude Code fetches itself — in the terminal, VS Code, JetBrains and the Agent SDK; a cloud session's connectors are delivered by its host, and the key does not turn them off: «Claude Code applies `disableClaudeAiConnectors` only to the connectors it fetches itself, not to the connectors a cloud host or the desktop app delivers» ([MCP](https://code.claude.com/docs/en/mcp.md)).
- The skills of the claude.ai account — `anthropic-skills:…` — cannot be turned off by a project key: the scope of `syncClaudeAiSkills` is «User, local, or managed… A repository can't turn it off for you» ([Settings reference](https://code.claude.com/docs/en/settings-reference.md)). The author decided on 2026-11-11 (В31): `"syncClaudeAiSkills": false` stands in the container's `~/.claude/settings.json`, on the volume `novatrail-claude` — for all sessions of the container, but not for cloud ones. Claude Code moved the downloaded skills to `~/.claude/skills/.trash/`; on claude.ai they remained.

**Measurement of the start of a session** — `claude -p "Ответь одним словом: готово."` in a clone of `spec` at 9d979f0, ×3 before the change and ×3 after, Opus 5.5; the context of the first call by `just tokens-report --project`:
- **before:** 31,341, 34,077 and 31,341 tokens, median 31.3 thousand. In two sessions of three the claude.ai connectors were still connecting at the first call and did not enter the context; in the third they did — the MCP instructions, 1,380 characters on average per session, and the names of their deferred tools. The difference is 2,736 tokens;
- **after:** 31,308 tokens all three times, median 31.3 thousand; no connectors;
- **result:** the connectors cost ≈ 2.7 thousand tokens on every call once they had connected — ≈ 1% of the average context of a call, 218–294 thousand (section 1.5). The estimate of section 1.5, ≈ 10 thousand, also held the list of skills; of its 15,971 characters the account's skills are 9,546, ≈ 60%, and the connectors key does not turn them off;
- **the account's skills turned off** — the same run, ×1: the list of skills is 6,446 characters, there are no `anthropic-skills:…` skills in it, the context of the first call is 28,155 tokens, 3,153 less. Together with the connectors — ≈ 5.9 thousand tokens on every call, ≈ 2–3% of the average context of a call;
- what one session per task and compaction at 400 thousand give, the start of a session does not show: that is seen by the context of a call and the number of compactions over an epic, by the measurement after — T124.

### 1.8. A thin CLAUDE.md: the rules of the parts

How R143 removed the checks of the parts from `spec`'s CLAUDE.md (RUN.md, T130). The documentation of Claude Code was read 2026-11-11; the version of Claude Code in the container is 2.1.280.

**The rules.** The Environment paragraph of [CLAUDE.md](../CLAUDE.md) — 19.2 of 25.3 KB — was laid out by parts into 12 rules [.claude/rules/](../.claude/rules/format.md): `format`, `admission`, `deployment`, `legal`, `consent-age`, `export`, `contracts`, `go`, `types`, `ci` — CI, the release, the `toolchain` stage and `release-verify` —, `tools` and `new-repo`. The cut of T120's trial — 11 rules — did not stay in the files; this one was made anew from the same sentences. The text of the rules is the sentences of the paragraph, and where the paragraph wrote "the same way" about a neighbouring part, the rule says it in its own words: each is read without the others. CLAUDE.md kept what every task needs: the container, `docs-check`, `inbox`, the settings and the hook, "CI runs every check, the tag comes out by itself", the sign-off of commits — and a line saying where each part's rule lies. CLAUDE.md became 9.1 KB.
- **When a rule loads:** «A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file. It also loads when Claude views a matching file with a Bash command that counts as a read, such as `cat` or `head` on a single file» ([Memory](https://code.claude.com/docs/en/memory.md)). An edit by a script does not load it, and compaction removes it until the session reads a file of the part again: «rules with `paths:` frontmatter load again on demand» ([Memory](https://code.claude.com/docs/en/memory.md)). So CLAUDE.md tells the session to read a part's rule before changing the part, and [AGENTS.md](../AGENTS.md) tells the same to an agent that does not load rules.
- **Broken front matter is not visible:** «If the YAML between the markers doesn't parse, Claude Code ignores the frontmatter and loads the rule as if it had no `paths`» ([Memory](https://code.claude.com/docs/en/memory.md)) — the rule silently loads into every session. So `docs-check` checks it.

**`docs-check`** — [tools/docs-check/rules.mjs](../tools/docs-check/rules.mjs) — reads a rule as a document — links, sections, numbers — without the front matter, by the lines of the file, and also checks: the front matter is there and is YAML; `paths` is a list of patterns or a comma-separated string, as Claude Code reads them; each pattern matches a file of the repository — of those git lists, any, not only `.md`, and in another repository also a file of its `spec/`; CLAUDE.md or `.claude/CLAUDE.md` links to the rule. A pattern is read as the documentation describes it: «`*.md` — `.md` files anywhere under the base directory», «`/*.md` — `.md` files directly in the base directory» ([Memory](https://code.claude.com/docs/en/memory.md)); a name with a leading dot — `.github/`, `.npmrc` — is taken by `*` and `**` like any other: in a trial, Claude Code wrote a rule with `paths` `legal/**` into the transcript as `"globs":["legal","tools/legal"]` — that is how the patterns of `.gitignore` are written, where a leading dot of a name is in no way special. This is a conclusion from the trial, not the documentation's words. Tests — `just docs-check-test`. In another repository `docs-check-repo` will check the same once it moves to a tag with this check (T123).

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

How R145 keeps what epic E10 saved from growing back (RUN.md, T126): budgets of size in `docs-check` on every pull request, a measurement at each epic's archive and once a month, and a new analysis by a threshold rather than by the calendar. Measured 2026-11-12.

**Budgets.** `docs-check` measures in bytes, in KB of 1,024: English text is at least 2.5 bytes a token and Russian tables 2.7 (section 1.6), and a limit in bytes needs neither a key of the API nor a network, and does not move when a tokenizer does. The limits are [tools/docs-check/budgets.json](../tools/docs-check/budgets.json): its block `spec` for spec, and its block `repository` for another NovaTrail repository, which is checked only once its root holds `docs-budgets.json` — what differs from that block, `{}` when nothing does. What is measured, the largest of each in `spec` on 2026-11-12, KB:

| What | The largest |
|---|---|
| CLAUDE.md / RULES.md | 10.2 / 12.8 |
| RUN.md / `DEBT.md` / COORDINATION.md | 70.3 / 116.5 / 60.0 |
| a rule of `.claude/rules/` | 5.4, `ci` |
| an entry of the decision log, with its amendments | 35.7, R83; the median is 6.5 |
| the own text under a heading of a document, numbered or not, to the next heading | 22.8, measurements 1.6; outside the registers and the glossary |
| concepts 15 / privacy 9 / repositories 8 — the glossary and two registers | 74.9 / 60.8 / 59.2 |
| a row of a table of RUN.md / `DEBT.md` / COORDINATION.md | 2.1 / 3.2 / 2.7 |

- Each limit is the largest of its kind plus 10–20%, rounded; RUN.md has more, 96 KB, since a new epic brings the bodies of its tasks.
- `format/` and `legal/` have none: they are texts for people (R42). Nor do the archives of `docs/plan/`: they are not read whole.
- On `spec` the check measures 579 things on 2026-11-12. A trial: CLAUDE.md with 2,500 bytes added gave «CLAUDE.md:1: 12,929 bytes, over its budget of 12 KB (12,288 bytes) — tools/docs-check/budgets.json».

**The measurement.** `just tokens-report --since … --until … --row` prints one row of the table below; `--project` measures another repository's transcripts on this machine. It runs:
- at the archive of an epic, for the epic's window, in the repository whose epic it is (RUN.md, «Как устроен план: эпики»);
- once a month, from `spec`, for each of the 13 repositories' folders of transcripts on this machine, from the window of the last row to the start of the session. `just inbox` prints the date when it has come, and it runs on the author's word or once every task of the current epic is done (the second 2026-11-12 amendment to R81), so a monthly row may come later than its date.

| Project | Window, UTC | Sessions | Calls, main / subagents | Context of a call, k, main / subagents | Compactions | Cost at API prices |
|---|---|---|---|---|---|---|
| `-workspaces-spec` — the baseline, section 1.3 | 2026-11-09T00:00 … 2026-11-11T03:59 | 3 | 2,344 / 3,682 | 448.5 / 109.2 | 9 | $470.99 |
| `-workspaces-spec` — part 2 of E10, T129 to T126: the reference until T124 | 2026-11-11T17:55 … 2026-11-12T14:27 | 9 | 1,238 / 1,676 | 183.2 / 90.4 | 1 | $156.88 |
| `-workspaces--github` | 2026-10-13T00:00 … 2026-11-12T14:27 | 14 | 4,196 / 2,565 | 397.5 / 124.0 | 10 | $739.31 |
| `-workspaces-api` | 2026-10-13T00:00 … 2026-11-12T14:27 | 23 | 6,109 / 4,741 | 371.4 / 104.4 | 17 | $954.57 |
| `-workspaces-app` | 2026-10-13T00:00 … 2026-11-12T14:27 | 18 | 3,375 / 5,492 | 337.8 / 143.5 | 14 | $673.90 |
| `-workspaces-canvas` | 2026-10-13T00:00 … 2026-11-12T14:27 | 37 | 12,565 / 7,897 | 369.1 / 114.8 | 99 | $2,040.66 |
| `-workspaces-engine` | 2026-10-13T00:00 … 2026-11-12T14:27 | 16 | 3,016 / 1,232 | 328.6 / 79.3 | 3 | $400.70 |
| `-workspaces-infra` | 2026-10-13T00:00 … 2026-11-12T14:27 | 6 | 2,175 / 1,714 | 354.7 / 80.0 | 6 | $321.70 |
| `-workspaces-learner-model` | 2026-10-13T00:00 … 2026-11-12T14:27 | 20 | 3,458 / 2,293 | 292.4 / 101.2 | 2 | $493.54 |
| `-workspaces-module-kit` | 2026-10-13T00:00 … 2026-11-12T14:27 | 29 | 4,374 / 1,969 | 326.5 / 98.4 | 0 | $573.80 |
| `-workspaces-modules` | 2026-10-13T00:00 … 2026-11-12T14:27 | 16 | 3,976 / 2,287 | 351.0 / 91.7 | 6 | $586.03 |
| `-workspaces-sim` | 2026-10-13T00:00 … 2026-11-12T14:27 | 10 | 3,275 / 1,195 | 325.5 / 79.5 | 6 | $397.59 |
| `-workspaces-skill-map` | 2026-10-13T00:00 … 2026-11-12T14:27 | 6 | 1,313 / 402 | 329.5 / 81.4 | 1 | $162.58 |
| `-workspaces-tutor` | 2026-10-13T00:00 … 2026-11-12T14:27 | 28 | 11,509 / 6,806 | 398.5 / 119.5 | 53 | $1,896.62 |

- In `spec`, part 2 of E10 lowered the context of a main call from 448.5 to 183.2 thousand, −59%, and of a subagent's from 109.2 to 90.4. The windows differ in work: E4 and E9 against the edits of E10.
- The other 12 have not taken R143 yet (RUN.md, T123): their rows are their "before", from 292.4 to 398.5 thousand for a main call, and their reference is their measurement after, T124.
- The monthly row of `module-kit` needs the fix of 2026-11-12: a path the user may not look at is not a file for the recipe, and the report is printed (`tools/tokens/report.mjs`, `fileCheck`).

**The threshold** of a new analysis is R145: the context of a main call more than 25% above the repository's reference, over at least 300 main calls; or three raises of a budget since the last analysis, by `git log` of the budgets file; or a quarter since the last check of Claude Code's changelog. The analysis then becomes a task outside an epic in RUN.md.

Last analysis: E10, T118–T128, 2026-11-11.

Next measurement: by 2026-12-12.

Next check of Claude Code's changelog: by 2027-02-12.
