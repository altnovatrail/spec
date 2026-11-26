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

## Table 1. Current epic — E25. Олимпиадная математика 1–6 и мелкие баги

**Результат** — модуль `novatrail/olympiad-math` («Olympiad mathematics, grades 1–6») лучше по тому, что автор находит, решая его на стенде; мелкие баги приложения, найденные по ходу, исправлены. Каждая находка — задача этой таблицы; правка вида — сначала состояние макета, которое смотрит автор (R148).

**Основа** — на 2026-11-26, ветка `e25` в `spec`, `api`, `app`, `canvas`, `tutor`, `modules` (клоны `.epics/e25`, задача across repositories, R166); в проде spec v0.21.1, api v0.1.82, app v0.1.55, canvas v0.3.47, skill-map v0.1.27, modules v0.2.18; последний сделанный эпик — E24, [docs/plan/E24.md](docs/plan/E24.md).
- Модуль — `modules/olympiad-math/` в `modules` (`main` 01ee3a6), версия 0.3.0, формат 0.4, полосы 1–2, 3–4 и 5–6 классов; перенос из MathTrail standalone — по таблице переноса в `docs/architecture.md` `modules`.
- Стенд берёт модули из выпуска `modules`, который закрепляет `modules.json` `api`, а не из клона `modules`: правка модуля видна на стенде только после выпуска `modules` и `modules.json` на него — или иного способа, который решает первая задача модуля.

**Решено автором (2026-11-26):** коммит и пуш — только по слову автора, без stash и reset; ship и прод — только после его «да»; модели — в пределах $2 на стенд; перезапуск стенда — без вопросов, пересборка контейнеров — по слову; проверки — точечно `xrepo test`, полный прогон — `xrepo gate`; перед правкой части — её решения в `docs/decisions.md`.

Задачи заводят по находкам на стенде и в проде и по выбору автора из открытого с E24. T318–T321 — из разбора алерта «api errors» 2026-11-26 и журнала отладки на iPad.

| Status | ID | Task | Who | Plan | Depends on |
|---|---|---|---|---|---|
| [ ] | T318 | `spec`, `api`, `app`: отказ «ещё идёт» не из класса 5xx, across repositories | я + Claude | да | — |
| [x] | T319 | Макет: смена модели в карточке «Reading your work» во время проверки | Claude, проверяю я | — | — |
| [ ] | T320 | `app`: почему повтор `SubmitWork` начался на 48-й секунде долгой проверки | Claude | да | — |
| [ ] | T321 | `app`: ожидаемые отказы и уведомление ResizeObserver в журнале отладки — не ошибки | Claude | — | — |
| [ ] | T322 | `spec`, `api`, `app`, `tutor`: смена модели в карточке проверки по макету T319, across repositories | я + Claude | да | T319 |
| [x] | T323 | Макет: карточка вердикта на телефоне на экранах решения задачи с бумаги — по центру | Claude, проверяю я | — | — |
| [ ] | T324 | `app`: карточка вердикта на телефоне на экранах бумаги по макету T323 | Claude | — | T323 |

#### T318. `spec`, `api`, `app`: отказ «ещё идёт» не из класса 5xx, across repositories

- **Цель:** алерт `infra` «api errors» (5xx в минуту в среднем за пять минут) срабатывает только на настоящие сбои, а не на штатный отказ повтору.
- **Выяснилось (2026-11-26, прод, ревизия `api-00025-tbz`):** проверка с бумаги (`SubmitWork`) с 14:50:37 UTC шла 80 с; `app` с 14:51:25 повторял её с тем же ключом идемпотентности восемь раз, `api` отвечал каждому `CAUSE_STILL_GOING` с кодом `unavailable` — HTTP 503, в журнале INFO; в 14:51:58 повтор получил готовый ответ. Метрика `run.googleapis.com/request_count` насчитала восемь 503 за минуту 14:51, алерт открылся в 14:57 и закрылся сам в 15:01. Строк WARNING и ERROR у `api` за 14:30–15:10 нет; журнал запросов Cloud Run `infra` не хранит (в нём IP), поэтому разбор шёл по метрике и `stdout` `api`.
- **Сделать:** код отказа «ещё идёт» — вне класса 5xx: `spec` — комментарий `CAUSE_STILL_GOING` в `contracts/novatrail/api/v1/cause.proto` и решения о ключах идемпотентности; `api` — `keyRefusal` в `internal/rpc/keyed.go`, таблица отказов в `docs/architecture.md`, решения `api` о ключах; `app` — разбор отказа и повтор по нему (`src/api/interceptors.ts`, `src/packages/files.ts`). `infra` не трогать: алерт остаётся на 5xx и по-прежнему видит 503 самого Cloud Run.
- **Решить при планировании:** какой код — `aborted` (HTTP 409, рекомендация: «повтори позже» без «сервис недоступен») или иной; совместимость: `app` в проде, ещё ждущий `unavailable`, при выкате `api` раньше `app` — порядок выпуска или приём обоих кодов в `app` на переходное время.
- **Как проверить:** `xrepo test api ./internal/rpc/...`, `xrepo test app` по `interceptors`; на стенде — долгая проверка и её повтор, в `.stand/api-*.log` у повторов новый код, у `app` — тот же вердикт без ошибки на экране.
- **Разделы:** решения `spec` и `api` о ключах идемпотентности; `docs/architecture.md` `api`, таблица отказов.

#### T322. `spec`, `api`, `app`, `tutor`: смена модели в карточке проверки по макету T319, across repositories

- **Цель:** пока идёт проверка, `app` показывает, что работа перешла к следующей модели, как в состояниях макета `solve-reading-closer`, `solve-debug-reading-closer` и `task-reading-closer`.
- **Сделать:** по плану — как `app` узнаёт о смене модели до ответа `SubmitWork` (сейчас вызов один и о моделях `app` узнаёт только из ответа); `tutor` — сообщение о следующей модели; `api` — отдать его `app`; `spec` — контракт, решения, типы; `app` — карточка и строка панели наставника по макету, имена моделей только аккаунту с правом отладки (R163).
- **Как проверить:** `xrepo test` точечно в каждом репозитории; стенд с `--ai` — долгая проверка с переходом к следующей модели, карточка как в макете; сравнение `app` с макетом по трём состояниям (R148).
- **Разделы:** R148, R163; макет T319; решения `spec` и `api` о проверке и `SubmitWork`.

#### T324. `app`: карточка вердикта на телефоне на экранах бумаги по макету T323

- **Цель:** `app` ставит карточку вердикта на телефоне на экранах бумаги так же, как макет T323.
- **Сделать:** `src/theme/theme.css` — отступ справа под круглую кнопку наставника только там, где она есть; экран бумаги (`src/paper/Solve.tsx`) — по центру с отступами как у нижнего ряда; браузерный тест места карточки на телефоне.
- **Как проверить:** `xrepo test app --browser` по `src/paper/`; сравнение с макетом по `task-*` не меняется; стенд — снимок на ширине телефона.
- **Разделы:** R148; решения `app` о карточке вердикта.

#### T320. `app`: почему повтор `SubmitWork` начался на 48-й секунде долгой проверки

- **Цель:** понять, почему `app` перестал ждать первый запрос проверки задолго до своего лимита, и исправить, если причина в `app`.
- **Выяснилось (2026-11-26, прод, iPad, Chrome на iPadOS):** первый `SubmitWork` пришёл в `api` в 14:50:37 UTC и кончился успешно в 14:51:57; повторы с тем же ключом — с 14:51:25 (≈ 48 с), хотя лимит `app` для `SubmitWork` — `PAPER_TIMEOUT_MS`, 90 с (`src/api/interceptors.ts`).
- **Сделать:** найти, что обрывает первый запрос: сеть, уход вкладки в фон на iPadOS, `fetch`/Connect-транспорт `app`, промежуточный узел до Cloud Run; воспроизвести на стенде долгую проверку; исправить в `app` или записать вопрос/долг, где причина вне его.
- **Решить при планировании:** как воспроизвести 50–80 с проверки на стенде в пределах $2 (заглушка `tutor` с задержкой или реальная модель).
- **Как проверить:** журнал отладки `app` (вкладка Log) на долгой проверке — у первого запроса видно, чем он кончился; `xrepo test app` точечно.
- **Разделы:** R163; `src/api/interceptors.ts`, `src/paper/Solve.tsx`.

#### T321. `app`: ожидаемые отказы и уведомление ResizeObserver в журнале отладки — не ошибки

- **Цель:** счётчик ошибок окна Debug считает только настоящие сбои.
- **Выяснилось (2026-11-26, прод, iPad):** `AttemptService/GetRungWords · failed_precondition · CAUSE_NO_MORE_WORDS` (с четвёртого неверного ответа новой ступени нет — по контракту; на экране `src/paper/Solve.tsx` молчит о нём, `QUIET`) и `ResizeObserver loop completed with undelivered notifications` (×2, безвредное уведомление браузера, `uncaught`) показаны красным и входят в «N errors».
- **Сделать:** `src/api/interceptors.ts` — отказ, которого экран ждёт, пишется уровнем ниже `error`; `src/debug/journal.ts` — уведомление ResizeObserver не ошибка; либо `app` не просит слова ступени после третьего неверного ответа — по планированию.
- **Как проверить:** `xrepo test app` по `debug/` и `api/`; на стенде — четыре неверных ответа подряд, окно Debug без красной строки.
- **Разделы:** R163.
