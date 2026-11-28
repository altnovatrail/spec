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

## Table 1. Current epic — E26. Модуль олимпиадной математики: доработка

**Результат** — модуль `novatrail/olympiad-math` («Olympiad mathematics, grades 1–6») доработан по тому, что назовёт автор; `modules` стоит на свежем теге `spec`, и сессия не читает образцы людей в клонах `.epics` (Д14 `modules`); диктофон в окне наставника на iPad распознаёт речь с первого нажатия; браузерные тесты `app` ждут условие, а не фиксированное время.

**Основа** — на 2026-11-26, ветка `e26` в `spec`, `modules`, `api`, `app`, `canvas`, `tutor` (клоны `.epics/e26`, задача across repositories, R166); в проде spec v0.21.2, api v0.1.83, app v0.1.56, canvas v0.3.48, skill-map v0.1.27, modules v0.2.18, tutor v0.1.68 (развёртывание — PR `infra` #147); последний сделанный эпик — E25, [docs/plan/E25.md](docs/plan/E25.md).
- Модуль — `modules/olympiad-math/` в `modules` (`main` 01ee3a6), версия 0.3.0, формат 0.4: 775 задач — 753 из standalone и 22 шаблона из 39 (остальные 17 не переносятся по R22 `modules`), — 41 урок, 41 синтетический образец; `modules` на `spec` v0.19.20; долг `modules` — Д12 и Д14.
- Стенд берёт модули из выпуска `modules`, который закрепляет `modules.json` `api`, а не из клона `modules`: правка модуля видна на стенде только после выпуска `modules` и `modules.json` на него — или иного способа, который решает первая задача содержания модуля.

**Решено автором (2026-11-26):** что дорабатывать в модуле, автор назовёт позже — задачи содержания заводятся по его слову, следующими номерами; T248 — из `run/TASKS.md` в эпик, переход `modules` на тег — после неё; каждая законченная правка — коммит и пуш в ветку `e26`; pull requests, мержи, выпуски и пины — только `xrepo ship` после «да» автора; стенд — всегда `xrepo serve --ai`: модели в пределах $2 на сессию стенда и окно Debug, заглушка — только по слову автора; разбор входящих (правило 13) — в начале эпика, по слову автора, решение по каждой строке — у автора; вопросы и отчёты — по-русски.

| Status | ID | Task | Who | Plan | Depends on |
|---|---|---|---|---|---|
| [x] | T329 | `app`: диктофон в окне наставника на iPad слушает, но не даёт текста | я + Claude | да | — |
| [x] | T327 | `app`: браузерные тесты ждут условие, а не фиксированное время | Claude | — | — |
| [x] | T248 | `spec`: запрет чтения наборов оценки `modules` в клонах `.epics` | Claude | — | — |
| [x] | T328 | `modules`: переход на тег `spec` с T248, Д14 | Claude | — | T248 |
| [x] | T333 | `app`: диктофон в окне наставника на iPad снова висит на «Слушаю…» | я + Claude | да | — |
| [x] | T334 | `app`: диктофон на iPad после включения озвучки слышит звук без слов и висит | я + Claude | да | — |
| [x] | T335 | `app`: на iPad второе слушание после переоткрытия панели не получает звука и висит | я + Claude | — | — |
| [x] | T336 | `app`: переключатель окна Debug — диктовка до «Стоп» или до паузы, чтобы найти на iPad рабочий режим | я + Claude | — | — |
| [x] | T337 | `app`: третий способ диктовки — сначала голос говорит фразу, потом слушание до паузы, которое ничто не обрывает | я + Claude | — | — |
| [x] | T338 | `app`: новое нажатие микрофона убирает прежний надиктованный текст; поле наставника — в одну строку | я + Claude | — | — |
| [x] | T339 | `app`: «Ваши страницы» пусты после «Начать» на устройстве, где профиль ещё ничего не начинал | я + Claude | — | — |
| [x] | T340 | Макет: время наставника — кружок в правом верхнем углу Home с панелью, вместо строки в «Что дальше» | я + Claude | — | — |
| [x] | T341 | `app`: время наставника — кружок справа вверху и его панель по макету T340; строка из «Что дальше» убрана | я + Claude | — | T340 |
| [x] | T342 | `app`: диктовка без обходов ошибки WebKit на iPad и без её диагностики в окне Debug; защита от зависания остаётся | я + Claude | — | — |
| [x] | T343 | `app` и макет: на телефоне «Что значат отметки» — посередине под модулями | я + Claude | — | — |
| [x] | T344 | `canvas`: сетка листа с бумаги на телефоне — точки и клетки реже, точки тоньше | я + Claude | — | — |
| [x] | T345 | `app`: ряд решения задачи с бумаги на телефоне — в одну строку, «Следующая задача» при нехватке места — стрелкой | я + Claude | — | — |
| [x] | T346 | `app` и макет: шторки наставника и Debug на телефоне — до самого верха, ручку можно тянуть | я + Claude | — | — |
| [x] | T347 | `canvas`: меню инструментов (форма выделения, перо, ластик) не наезжают на нижний ряд с «Проверить» | я + Claude | — | — |
| [x] | T348 | `app`: левое меню настроек на iPad не дробит слов — ширина не меньше самого длинного слова строки | я + Claude | — | — |
| [x] | T350 | Макет: карточка модуля на Home — плитки урока и задач, окно навыка, страница уроков; Home без «Что дальше»; «Из файла» и «История» в «Задачах с моей бумаги» | я + Claude | да | — |
| [x] | T351 | `spec`: R176 — карточка модуля, навык задач модуля, «Решать» — задачи модуля, список уроков, урок по выбору ученика; контракты, экспорт 6, документы | Claude | да | T350 |
| [x] | T352 | `engine`: `LessonOrder` — порядок уроков модуля с группами; `ReasonLessonChosen` | Claude | — | T351 |
| [x] | T353 | `api`: навык задач модуля, «Решать» — задачи модуля, список уроков, урок по выбору ученика | Claude | — | T351, T352 |
| [x] | T354 | `app`: карточка модуля, окно навыка, страница уроков, Home без «Что дальше», «Из файла», «История» | я + Claude | — | T353 |
| [x] | T355 | `app`: в окне навыка выбранное — без чёрного подчёркивания | я + Claude | — | — |
| [x] | T356 | `app` и макет: на плитке задач нет кнопки «Вернуть выбор наставнику» | я + Claude | — | — |
| [x] | T357 | `app` и макет: окно навыка — шириной с плитку задач и открывается без прокрутки | я + Claude | — | — |
| [x] | T358 | Макет: задача олимпиадного модуля на стандартном листе, плашка навыка, варианты ответа на кальке; плитка урока закрыта | я + Claude | — | — |
| [x] | T359 | Макет: короткие эссе на стандартном листе; чистка старых экранов задачи | я + Claude | да | T358 |
| [x] | T360 | `spec`: все задачи модулей на листе задачи с бумаги — решения, документы, контракты, типы `canvas` | я + Claude | да | T359 |
| [x] | T361 | `canvas`: варианты ответа кнопками на кальке | Claude | — | T360 |
| [x] | T362 | `modules`: модуль 3-го класса удалён | Claude | — | T360 |
| [x] | T363 | `api`: взрослый режим на задаче модуля без свидетельства; чистка рабочей тетради, шагов и режима решения; `modules` без 3-го класса | Claude | да | T360, T362 |
| [x] | T364 | `app`: задача олимпиадного модуля на листе — от «Решать», плашка навыка, варианты, «Следующая задача» | я + Claude | да | T361, T363 |
| [x] | T365 | `app`: короткие эссе на листе | я + Claude | да | T364 |
| [x] | T366 | `app`: старый экран задачи удалён со всем кодом; плитка урока закрыта; рабочая тетрадь и режим решения убраны | Claude | — | T365 |
| [x] | T368 | Режим чтения почерка по умолчанию — `single`, без переменной тоже | я + Claude | — | — |
| [ ] | T367 | Гейты и выпуск партии T350–T366 по слову автора | я + Claude | — | T366 |

#### T367. Гейты и выпуск партии T350–T366

- **Цель:** всё сделанное с T350 — в проде.
- **Сделать:** по «да» автора: гейты `spec`, `canvas`, `modules`, `engine`, `api`, `app`; `xrepo ship e26` — `spec → canvas → modules → engine → api → app → infra` (проверить, что ship берёт `engine` и `modules`); `site-check`.
- **Как проверить:** зелёные гейты и CI, `site-check` нового тега `app`.
- **Разделы:** `/workspaces/.epics/e26/notes.md` — «Как выпускать».
