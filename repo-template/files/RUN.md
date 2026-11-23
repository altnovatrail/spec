# RUN.md — work plan of {{name}}

What {{name}} does, does not do and has still to decide — [docs/architecture.md](docs/architecture.md); why — [docs/decisions.md](docs/decisions.md). The platform is in `spec/`, a submodule at tag {{spec_tag}}: the component's card — the one in `spec/docs/architecture.md` whose heading names `{{name}}`; the order of repositories — `spec/docs/repositories.md`; learners' data and law — `spec/docs/privacy.md`; the platform's decisions — `spec/docs/decisions.md`. Small tasks, one at a time, each reviewed by the author; only the current epic is in detail. The first epic details the component by its card: no code, it decides what to build. Other tables, each a file opening with its rules: 2, epics for later — [run/EPICS.md](run/EPICS.md); 3, questions to the author — [run/QUESTIONS.md](run/QUESTIONS.md); 4, debt — [run/DEBT.md](run/DEBT.md). Open tasks outside an epic — [run/TASKS.md](run/TASKS.md).

Language: rules and tables in English, terse, for the session; the bodies of tasks in table 1 and in `run/TASKS.md` in Russian — the author writes and reviews them.

## Rules

A task starts with «Выполни задачу T01 из RUN.md» in a new session in the devcontainer. One task — one session: the hook `UserPromptSubmit` of [.claude/settings.json](.claude/settings.json) — `spec/tools/session/` — stops «Выполни задачу T…» or «планируй T…» of another task in the same session and names `/clear`; the same task passes.

1. Do only the named task; touch other tasks' files only where it requires.
2. Read first: [CLAUDE.md](CLAUDE.md) with the rules it imports (RULES.md of `spec/`), the task — in table 1, or only its own body of `run/TASKS.md` (its opening says how) —, what it names — its own and spec's —, [docs/decisions.md](docs/decisions.md).
   - Conflict with the documents or something missing — stop and ask; never guess.
   - A gap in the component itself — a point of what is still to decide in [docs/architecture.md](docs/architecture.md). A gap across repositories — a row of [run/QUESTIONS.md](run/QUESTIONS.md) whose question opens with the mark «В реестр spec»: spec's session finds it on `main`, and it gets its О-, П- or Т- number once the author decides it there.
   - From `run/DEBT.md` and `run/QUESTIONS.md` take only the rows the task and its sections name and those `grep -n` finds by the paths and parts it changes.
3. **Devcontainer only.** If `NOVATRAIL_DEVCONTAINER` is not `1`, stop before the first edit and ask to reopen in the container; "only documents" is no reason to go on. If `spec/` is empty, ask for `git submodule update --init`. Exception: a cloud session the author started for the task runs the checks it can reach, and its report names each one that did not run.
4. Outside this repository — editing `spec` or other repositories, their settings, anything that costs money — only after a warning (what, where, cost) and the author's confirmation. `spec/` is read only here; a task of its own moves it to a new tag.
   - Exception, no confirmation: the task's checks — browser: Playwright in the devcontainer, custom-token sign-in of a stand-in user on the dev project; AI: the `tutor` stub in `api` dev mode. A real AI call only where the task checks the model's words: dev key under the author's spend limit at the provider, within the task's ceiling, or with confirmation where it has none; «Сделано» names the provider, the calls and the cost.
   - Nothing on devices: engines are Chromium, WebKit and Firefox in CI; what only a device shows — pen, device voices, VoiceOver and TalkBack, the home screen — stays a row of [run/DEBT.md](run/DEBT.md) until the author decides otherwise.
5. Facts on AI providers, laws, prices and other platforms — from the primary source, with quote and date read, as a record of [docs/sources.md](docs/sources.md). What is not confirmed is not stated: it becomes an open question.
6. End with the checks of what the task changed. Documents: `just -f spec/justfile docs-check-repo` — relative links lead to existing files and headings; the rule of citations of `spec/RULES.md` holds; each record of spec cited — `sources 2.3 spec` — and each О-, П-, Т- exists in `spec/` at its tag; own records exist, R numbers in the headings of the log have no gaps or repeats and the log's opening names the next free one; numbers В in [run/QUESTIONS.md](run/QUESTIONS.md) and Д in [run/DEBT.md](run/DEBT.md) do not repeat and the next free one is above each. If the tag of `spec` is older than this check, check the same by hand.

   Then `/code-review high`, one round: fix the findings, do not rerun. A small change may skip the review even if «Как проверить» names it.
7. Do not commit: the author commits after review. A run of spec's orchestrator, «Сделай эпик E…», is the author's word otherwise: its executor works by the contract `spec/tools/orchestrator/executor.md` — commits, pushes and opens the pull request, never merges.
8. End with a short report in Russian: what was done, files, how to check, what the review found or why there was none, what is open and what goes «в реестр spec».
9. When done: table 1 `[ ]` → `[x]`; append to the body «Сделано (дата)» — one line, what was done and its pull request, which says how it was checked; where the author commits after review, the report says it. What stays open is rows, not text: a question for the author, of [run/QUESTIONS.md](run/QUESTIONS.md); what is put off, of [run/DEBT.md](run/DEBT.md).
   - Then move the body verbatim, relative links fixed, to the epic archive `docs/plan/<epic>.md`, with a gist sentence — an unheaded list item at the start of the receiving section: «T01 — сделана <дата>: <итог одной фразой>». Neither stays here, and a search by heading finds one body, in the archive.
   - A task outside an epic leaves `run/TASKS.md` for the current epic's archive, section «Задачи вне эпика, сделанные за его время»; with no current epic, to the last done epic's archive, section «Задачи вне эпика, сделанные после него».
10. Language, by `spec/RULES.md`: this plan and `run/` in English, the bodies of tasks, the epic archives `docs/plan/` and the reports in Russian; `docs/` in English; README, CLAUDE.md, AGENTS.md, code, comments, schema descriptions, prompts and normative texts for authors in English; commit messages and a pull request's title and description in English and terse, for the session, never a copy of the report.
11. A task larger than one review (≈ 30–60 minutes of reading): propose a split before starting.
12. Before a new task, close the findings on the previous one, once SonarCloud, CodeQL and Scorecard run here; an allowed departure from rule 1. SonarCloud sees merged code: its verdict on the previous task is in [New Code](https://sonarcloud.io/summary/new_code?id=altnovatrail_{{name}}); CodeQL and Scorecard — the Security tab, `gh api 'repos/altnovatrail/{{name}}/code-scanning/alerts?state=open'`. Fix in code first; "false positive" is the last resort, with the reason in words; what a change cannot close stays open — shared reasons in spec's log, own ones in this log. Never skip silently. Report these fixes in a separate paragraph: the author commits them apart from the task.

**Statuses:** `[ ]` not started; `[x]` done, the executor marks it; `[-]` not done — the author's decision, reason in the task; `[?]` deferred — the author's decision, reason and when to return in the task. A task that fails the author's review returns to `[ ]` with what to fix.

**Who:** «Claude» — the executor does it, the author reviews; «Claude, проверяю я» — texts the author reads line by line; «я + Claude» — the author does some steps: decisions, sign-ins, GitHub settings, confirmations by rule 4.

**Plan:** «да» — plan mode first: decisions missing from the documents, or larger than one review (rule 11); «—» — run at once.

**Task body** (Russian): «Цель», «Сделать», «Как проверить», «Разделы»; as needed «Не делать», «Решить при планировании», «Мой шаг», «Стоимость», «Риски»; from planning «Почему», «Решено автором (дата)», «Выяснилось при планировании»; when done «Сделано (дата)» (rule 9).

**Citations** — by `spec/RULES.md`: a task's number and a dated line stand only here, in `run/` and in `docs/plan/`; outside them a text cites no decision and no section, and only a claim about the outside world cites its record — `sources 1.1`, spec's `sources 2.3 spec`. spec's open questions — «Т-22», «П-7», «О-2» — stand anywhere: the repository keeps no registers. A task — «T03», from another repository «T03 {{name}}»; one not here is in `run/TASKS.md` or an archive: `grep -n '^#### T03\.' RUN.md run/TASKS.md docs/plan/*.md`. Task numbers are global and never reused: take the one free when writing it down.

## Epics

- **Table 1** is the current epic: its tasks in detail, run one at a time.
- **Next epic.** Once table 1 is all checked, the author picks the next epic from [run/EPICS.md](run/EPICS.md) and splits it with Claude in plan mode into tasks of one review each, into table 1 and this file.
- **A done epic** goes to `docs/plan/<epic>.md`: bodies and gist sentences are there already (rule 9); move its description and table of tasks verbatim; questions and debt stay in `run/`; until the next epic, table 1 reads «Current epic — none» and names it as the last done epic; measure the epic's sessions — `just -f spec/justfile tokens-report --since <first day of the epic> --row` — as a row of the table of measurements of `docs/measurements.md`, which the first measurement starts, by the model of `spec/docs/measurements.md`; a new analysis once the measurement passes spec's threshold for one. Never read an archive whole: take the task cited.

## Table 1. Current epic — E1. Детализация

**Результат:**
- каждый пункт «Решить при детализации» из карточки в `spec/docs/architecture.md` решён: в [docs/decisions.md](docs/decisions.md) — запись с тем, почему и что отвергнуто, а решённое — в устройство [docs/architecture.md](docs/architecture.md);
- вопросы, которые выходят за этот репозиторий, переданы «в реестр spec» ([run/QUESTIONS.md](run/QUESTIONS.md));
- следующий эпик — первый код или ещё что-то — предложен в [run/EPICS.md](run/EPICS.md).

Кода в эпике нет.

<!-- FILL: строки таблицы. По задаче на пункт «Решить при детализации» карточки, в её порядке, с номерами T01, T02, …; пункты, которые порознь не решить, — одной задачей; задача сверх пунктов — только с причиной из карточки, например перенос того, на что карточка опирается; последняя — «Итог детализации». Кто — «Claude, проверяю я», если задача приносит решение; План — «да», если решения нет в документах. -->

| Статус | ID | Задача | Кто | План | Зависит от |
|---|---|---|---|---|---|

**Почему такой порядок.** <!-- FILL: что от чего зависит и почему задачи идут именно так. -->

## Epic E1. Детализация

**Почему эпик такой.** Репозиторий заведён раньше своего кода: детализация начинается с документов. Пункты «Решить при детализации» из карточки — то, с чего начинается работа здесь.

**Не входит:** код, CI и релизы — их порядок задаст следующий эпик.

<!-- FILL: тела задач, по одному на строку таблицы 1, по образцу:

#### T01. <пункт карточки>

- **Цель:** что будет решено.
- **Сделать:**
  - варианты — с источниками: что решено в spec и в MathTrail, словами; документация и статьи — записями docs/sources.md с датой прочтения;
  - рекомендация; решение автора — запись в docs/decisions.md;
  - пункт из того, что решить, в docs/architecture.md — решённым в устройство.
- **Решить при планировании:** что выбирает автор.
- **Как проверить:** что видно в документах после задачи.
- **Разделы:** карточка в spec; Т-…, П-…, О-…; свои разделы.

Последняя задача — «Итог детализации»: docs/architecture.md читается целиком, вопросы «в реестр spec» переданы, следующий эпик предложен в run/EPICS.md. -->
