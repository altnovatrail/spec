# RUN.md — work plan of spec

Plan of `spec` and of organization-wide work; the order of the other repositories' tasks is [COORDINATION.md](COORDINATION.md) (R76). Context: [product](docs/product.md), [architecture](docs/architecture.md), [repositories](docs/repositories.md), [privacy](docs/privacy.md), [decisions](docs/decisions.md). Other tables, each a file opening with its rules (R153): 2, epics for later — [run/EPICS.md](run/EPICS.md); 3, questions to the author — [run/QUESTIONS.md](run/QUESTIONS.md); 4, debt — [run/DEBT.md](run/DEBT.md); 5, rows of other repositories recorded — [run/INBOX.md](run/INBOX.md). Open tasks outside an epic — [run/TASKS.md](run/TASKS.md) (R155).

Language (R154): rules and tables in English, terse, for the session; the bodies of tasks in table 1 and in `run/TASKS.md` in Russian — the author writes and reviews them.

## Rules

A task starts with «Выполни задачу T01 из RUN.md» in a new session in the devcontainer. One task — one session (R143): the hook [tools/session/](tools/session/main.mjs) stops another task's phrase in the same session. An epic across repositories starts with «Сделай эпик E…» in spec's orchestrator container, `.devcontainer/orchestrator/`: the orchestrator runs each task as a fresh `claude -p` in its repository's container and merges its pull request (R156), by [its procedure](tools/orchestrator/README.md#сделай-эпик-e); the hook counts the epic as one task. A task across repositories runs there too, as one session the author leads, in the clones of `.epics` by `xrepo` (R166).

1. Do only the named task; touch other tasks' files only where it requires.
2. Read first: [CLAUDE.md](CLAUDE.md), the task — in table 1, or only its own body of `run/TASKS.md` (its opening says how) —, the sections it cites, `docs/decisions.md`.
   - Conflict with the documents or something missing — stop and ask; never guess.
   - A gap is an open question, the next free number by the register's opening: О- product 13, П- privacy 9, Т- repositories 8.
   - From `run/DEBT.md` and `run/QUESTIONS.md` take only the rows the task and its sections name and those `grep -n` finds by the paths and parts it changes (R143).
3. Devcontainer only (RULES.md, Hard rules, with its cloud-session exception): on the host stop before the first edit.
4. Outside this repository — creating or configuring repositories, pushing to them, organization settings, anything that costs money — only after a warning (what, where, cost) and the author's confirmation.
   - Exception, no confirmation: «Сделай эпик E…» (R156) — running the epic's tasks in their repositories' containers, the executors' pushes and pull requests, their merge on green checks, and rebuilding and creating the containers of NovaTrail's repositories (R158). Whatever else a task does outside its repository still needs confirmation, a question in the orchestrator's queue; usage bought beyond the subscription, never.
   - Exception, no confirmation: a task across repositories (R166) — its clones in `.epics`, its branch, edits, commits and pushes of each finished change to that branch, local checks, the gate and the stand, from the orchestrator's container; `xrepo serve --ai`, for the author's check by hand on the stand, calls the models by the developer key up to $2 a session of the stand, above it a question. Its pull requests, merges, releases and pins follow one «да» of the author for the task, by `xrepo ship`.
   - Exception, no confirmation: the task's checks by R146 — browser: Playwright in the devcontainer, custom-token sign-in on the dev project; AI: the `tutor` stub in `api` dev mode. A real AI call only where the task checks the model's words: dev key under the author's spend limit, within the task's ceiling, or with confirmation where it has none; «Сделано» names the provider, the calls and the cost. Nothing on devices: what only a device shows stays debt of the repository of those screens.
5. A fact no run checks — a law, terms, a price, a page with no version — from the primary source, as a record of `docs/sources.md`, kept by its first section; documentation or code at a version or commit — a link beside the claim; NovaTrail's and MathTrail's files — git at a commit (RULES.md, The bar).
6. End with green checks of the parts changed — their rule `.claude/rules/<part>.md` (CLAUDE.md, Environment) — and always `just docs-check`. Then `/code-review high`, one round: fix the findings, do not rerun. A small change may skip the review even if «Как проверить» names it.
7. Do not commit — here or in repositories an epic creates — unless the task or the author's word says so: the author commits after review. In an orchestrator's run the executor commits, pushes and opens the pull request by `tools/orchestrator/executor.md`, and the orchestrator merges it (R156). A task across repositories commits and pushes each finished change to its branch, and opens its pull requests only by `xrepo ship` (R166).
8. End with a short report in Russian: what was done, files and repositories, how to check (commands), what the review found or why there was none, what is open.
9. When done: table 1 `[ ]` → `[x]`; append to the body «Сделано (дата)» — one line, what was done and its pull request, which says how it was checked; where the author commits after review, the report says it. What stays open is rows, not text: a question for the author, of `run/QUESTIONS.md`; what is put off, of `run/DEBT.md` (R160).
   - Then move the body verbatim, relative links fixed, to the epic archive `docs/plan/<epic>.md`, with a gist sentence — an unheaded list item at the start of the receiving section: «T129 — сделана 2026-11-11: <итог одной фразой>». Neither stays here (R153).
   - A task outside an epic leaves `run/TASKS.md` for the current epic's archive, section «Задачи вне эпика, сделанные за его время»; with no current epic, to the last done epic's archive, section «Задачи вне эпика, сделанные после него» (R19).
10. Language — RULES.md, Hard rules (R154); translating a document — [tools/translation/README.md](tools/translation/README.md).
11. A task larger than one review (≈ 30–60 minutes of reading): propose a split before starting.
12. Before a new task, close the findings on the previous one (allowed departure from rule 1): SonarCloud — [New Code](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec), after the merge; CodeQL and Scorecard — `gh api 'repos/altnovatrail/spec/code-scanning/alerts?state=open'`. Fix in code first; "false positive" is the last resort, with the reason in words; what stays open gets its reason in the log (shared ones — R33). Never skip silently. Report these fixes in a separate paragraph: the author commits them separately.
13. Inbox — on the author's word («Разбери входящие») or once the last task of the current epic is checked, not before each task (R81); an allowed departure from rule 1. Procedure — [run/INBOX.md](run/INBOX.md).

**Statuses:** `[ ]` not started; `[x]` done, the executor marks it; `[-]` not done — the author's decision, reason in the task; `[?]` deferred — the author's decision, reason and when to return in the task. A task that fails the author's review returns to `[ ]` with what to fix.

**Who:** «Claude» — the executor does it, the author reviews; «Claude, проверяю я» — texts the author reads line by line; «я + Claude» — the author does some steps: decisions, sign-ins, GitHub settings, confirmations by rule 4.

**Plan:** «да» — plan mode first: decisions missing from the documents, or larger than one review (rule 11); «—» — run at once.

**Task body** (Russian): «Цель», «Сделать», «Как проверить», «Разделы»; as needed «Не делать», «Решить при планировании», «Мой шаг», «Стоимость», «Риски»; from planning «Почему», «Решено автором (дата)», «Выяснилось при планировании»; when done «Сделано (дата)» (rule 9).

**Citations** — RULES.md, Citations. A task's number stands only here, in `run/` and in `docs/plan/` (R171). A task is cited by number: «T03», «RUN.md, T03»; one not here is in `run/TASKS.md` or an archive: `grep -n '^#### T03\.' RUN.md run/TASKS.md docs/plan/*.md`. Task numbers are global and never reused: take the one free when writing it down.

## Epics

- **Table 1** is the current epic: its tasks in detail, run one at a time.
- **Next epic.** Once table 1 is all checked: the inbox (rule 13); the author picks the next epic from `run/EPICS.md` and splits it with Claude in plan mode into tasks of one review each, into table 1 and this file.
- **Grouping** (R159; RULES.md, How we work): the plan takes the grouping with the fewest pull requests; a pull request of its own only where a dependency needs it.
  - *A batch*: tasks of one repository in a row, none needing another's release — one branch `<epic>-<repo>`, as `e16-spec`. Where the executor commits (rule 7), a task is one commit with its bookkeeping, «Сделано» naming «ветка …», pushed, with no pull request and no checks. The last runs every local check of the batch's parts, `/code-review high` over the batch, opens one pull request, writes its number into every «Сделано», and waits on CI; the merge is a merge commit. The batch ends early at a task whose release another needs, one after which a container is rebuilt (`.devcontainer/`), or one waiting on the author. A single task has a branch of its own.
  - *A task across repositories* (R166): a task of table 1 that names its repositories, with no row of COORDINATION.md; one branch, the epic's name, in each, all the code there. One session in the orchestrator's container, `.devcontainer/orchestrator/`, works in the clones `.epics/<epic>/<repo>`, which every container mounts at `/workspaces/.epics`; the host's clones stay on `main`. `xrepo up <epic> <repos…>` makes the clones, `spec` among them, and wires them to that one `spec` and to each other outside git; `xrepo test` runs a repository's quick checks in its container (R156); `xrepo serve` is the stand of `api`, `app` and `canvas`, where the author checks the change by hand. Each finished change is committed and pushed — a branch's push runs no CI. Then `xrepo gate`: the full CI of each touched repository in its container, with the coverage of the changed lines (R48). After the author's «да», `xrepo ship`: the pull requests one at a time by dependency, `spec` first — merged on green checks, released, the dependents' pins moved to the release —, one round of CI each; `infra` last where the change reaches the deployment. `xrepo down` ends it. A design change is first a state of `draft/mockup`, approved by the author (R148). A task of one of those repositories runs beside it on the host's clone, but none of spec, whose folder the orchestrator's window opens; `xrepo sync` merges `main` into the epic's branch.
- **A done epic** goes to `docs/plan/<epic>.md` (R59 canvas-api): bodies and gist sentences are there already (rule 9); move its description and table of tasks verbatim; questions and debt stay in `run/`; measure — `just tokens-report --since <first day of the epic> --row` — as a row of measurements 1.9 (R145); table 1 names it as the last done epic. Never read an archive whole: take the task cited.
- **DPIA** ([docs/dpia.md](docs/dpia.md), R129): a task that changes what it rests on — a kind of data or retention, a provider or processor, an AI capability or route, opening an age, a country or a feature to children — reviews it; its «Сделано» names the review, the DPIA's log the version. Also before the beta, before the public launch and at least yearly.
- **Token savings** (R145): the limits of `docs-check` — [tools/docs-check/budgets.json](tools/docs-check/budgets.json), a raise shows in review; measure at an epic's archive and monthly (`just inbox` reminds, rule 13); a task of analysis goes to `run/TASKS.md` by the threshold of R145, and its planning decides whether it needs an epic; baselines, dates, last analysis — measurements 1.9.

## Table 1. Current epic — E24. Одна канва решения с точками расширения

**Результат** — задача модуля «Задачи на листе» (`novatrail/check-board`) решается на той же канве и том же экране, что задача с бумаги: точечный лист, панель инструментов, калька с условием, счётчик задач, нижняя панель Подсказка · Проверить, одна панель тьютора. Отличие одно: условие приходит от модуля текстом, а не фото с камеры — поэтому нет «Распознать» и «Оригинал». Канвы разных видов остаются, но у них один интерфейс элемента и точки расширения: откуда условие (вырезка фото или текст модуля), вид листа, инструменты, вердикт.

**Основа** — на 2026-11-25, ветка `e24` в `spec`, `canvas`, `app`, `api`, `tutor` (клоны `.epics/e24`).
- Сейчас у задачи модуля свой экран: условие — карточка `app` над `<novatrail-canvas>`, вид канвы задаёт модуль, ряд Подсказка · Показать решение · Проверить, панель тьютора сбоку со шагами (R148, R161). У задачи с бумаги — лист под кальки вырезки, сетку переключает ученик, «Распознать» читает условие в текст (R162, R169). Для «Задач на листе» (вид `handwriting_sheet`, одиннадцать задач без вариантов) различие ничем не оправдано.
- В ветке `e24` до задач уже сделаны и запушены правки UI и логики канвы: пометки на скопированных лассо штрихах, маска разговора под плашкой взрослого режима, подгонка дробей без колебаний, новая попытка решённой задачи с бумаги (R162), «Повторить» в панели `canvas` (R19 `canvas`). Их учёт — в отчёте T296.

**Решено автором (2026-11-25):** одна канва для «Задач на листе» и задач с бумаги; сначала макет, который автор проверяет руками.

| Status | ID | Task | Who | Plan | Depends on |
|---|---|---|---|---|---|
| [x] | T294 | Макет: «Задачи на листе» на канве задачи с бумаги | Claude, проверяю я | — | — |
| [ ] | T295 | Решения `spec`: одна канва решения, её интерфейс и точки расширения | Claude | да | T294 |
| [ ] | T296 | `canvas` и `app`: задача модуля на листе задачи с бумаги, across repositories | я + Claude | да | T295 |

#### T295. Решения `spec`: одна канва решения, её интерфейс и точки расширения

- **Цель:** документы говорят, что задача модуля с листом и задача с бумаги — один экран и один элемент канвы, и где у элемента точки расширения.
- **Сделать:** по одобренному макету T294 переписать R148 (экран задачи модуля), R161 (условие — карточка `app` или калька), при нужде R162 и R169; карточки `canvas` и `app` в `docs/architecture.md`; `types/canvas/index.d.ts` — источник условия (вырезка или текст модуля с картинкой), вид листа, что отключается (Распознать, Оригинал); `docs/concepts.md`; строка расхождения в README макета снимается. DPIA — проверить, что данных не прибавилось (работа модуля идёт в `SubmitWork`, как раньше).
- **Как проверить:** `just docs-check`, `just types-check`, `just mockup-test`.
- **Разделы:** R148, R161, R162, R169, R173, R174, R74; `docs/architecture.md` — карточки `canvas` и `app`.
- **Решить при планировании:**
  - какие задачи модулей идут на общий лист: только вид `handwriting_sheet` («Задачи на листе») или все листовые виды (клетка, линейка) олимпиадной и школьной математики; рекомендация — `handwriting_sheet` сейчас, остальные отдельной задачей после проверки на «Задачах на листе»; тетрадь, выбор ответа и эссе остаются своими видами канвы;
  - сетка: стартовую задаёт модуль, ученик переключает, как на бумаге (рекомендация), или вид модуля фиксирован, как сейчас;
  - «Показать решение» на задаче модуля и взрослый режим (R174): рекомендация — «Показать решение» оставить, взрослый режим только на бумаге;
  - задача внутри урока (сегменты, разобранный пример) — счётчик задач урока справа, сегменты — в заголовке;
  - вердикт не меняется: у задачи модуля — программа по ключу, у задачи с бумаги — модель (R162).

#### T296. `canvas` и `app`: задача модуля на листе задачи с бумаги, across repositories

- **Цель:** на стенде «Задачи на листе» решается на том же экране, что задача с бумаги, по решениям T295.
- **Сделать:** `canvas` — калька с текстом модуля (тот же путь, что текст после «Распознать»), точки расширения по `types/canvas`; `app` — задача модуля вида из T295 открывает экран решения `paper/Solve.tsx` (или общий компонент, выделенный из него), условие от модуля, Проверить через `SubmitWork`, панель тьютора одна; тесты в обоих. Учёт правок `e24`, сделанных до задач, — в «Сделано». Стенд, `xrepo gate`, `xrepo ship` после «да» автора.
- **Как проверить:** `just xrepo test canvas|app …` точечно; стенд http://127.0.0.1:5173 — «Задачи на листе» с главной; сравнение с макетом `board*` (R148).
- **Разделы:** R148, R161, R162, R166, R173; решения T295.
- **Решить при планировании:** разбить ли на `canvas` и `app`; что из `Solve.tsx` и `Task.tsx` становится общим.


