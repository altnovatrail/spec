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
5. Facts on AI providers, laws, prices and other platforms — from the primary source, as a record of `docs/sources.md` (RULES.md, How we work).
6. End with green checks of the parts changed — their rule `.claude/rules/<part>.md` (CLAUDE.md, Environment) — and always `just docs-check`. Then `/code-review high`, one round: fix the findings, do not rerun. A small change may skip the review even if «Как проверить» names it.
7. Do not commit — here or in repositories an epic creates — unless the task or the author's word says so: the author commits after review. In an orchestrator's run the executor commits, pushes and opens the pull request by `tools/orchestrator/executor.md`, and the orchestrator merges it (R156). A task across repositories commits and pushes each finished change to its branch, and opens its pull requests only by `xrepo ship` (R166).
8. End with a short report in Russian: what was done, files and repositories, how to check (commands), what the review found or why there was none, what is open.
9. When done: table 1 `[ ]` → `[x]`; append to the body «Сделано (дата)» — one line, what was done and its pull request, which says how it was checked; where the author commits after review, the report says it. What stays open is rows, not text: a question for the author, of `run/QUESTIONS.md`; what is put off, of `run/DEBT.md` (R160).
   - Then move the body verbatim, relative links fixed, to the epic archive `docs/plan/<epic>.md`, with a gist sentence — an unheaded list item at the start of the receiving section: «T129 — сделана 2026-11-11: <итог одной фразой>». Neither stays here (R153).
   - A task outside an epic leaves `run/TASKS.md` for the current epic's archive, section «Задачи вне эпика, сделанные за его время»; with no current epic, to the last done epic's archive, section «Задачи вне эпика, сделанные после него» (R19).
10. Language — RULES.md, Hard rules (R154); translating a document — [tools/translation/README.md](tools/translation/README.md).
11. A task larger than one review (≈ 30–60 minutes of reading): propose a split before starting.
12. Before a new task, close the findings on the previous one (allowed departure from rule 1): SonarCloud — [New Code](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec), after the merge; CodeQL and Scorecard — `gh api 'repos/altnovatrail/spec/code-scanning/alerts?state=open'`. Fix in code first; "false positive" is the last resort, with the reason in words; what stays open gets its reason in the log (shared ones — R33). Never skip silently. Report these fixes in a separate paragraph: the author commits them separately.
13. Inbox — on the author's word («Разбери входящие») or once the last task of the current epic is checked, not before each task (R81, second amendment 2026-11-12); an allowed departure from rule 1. Procedure — [run/INBOX.md](run/INBOX.md).

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

## Table 1. Current epic — E22. Ссылки, по которым идут

**Результат** — во всех репозиториях NovaTrail ссылка стоит только там, где читатель пойдёт по ней, чтобы действовать: одна на утверждение, к месту, где оно решено или записано; `docs-check` держит механическую часть правила.
- Основа — источники и замер «до» — T256; правило — T257; проверки `docs-check` и тег `spec` — T258; строки COORDINATION.md 7.38–7.49 с текстом задачи репозитория — T259.
- Свои тексты `spec`: журнал решений — T260–T267, остальные документы — T268–T272, комментарии кода — T273–T275; итог и замер «после» — T276.
- Строки 7.38–7.49 «Порядка» — задача каждого из 12 других репозиториев, по тексту T259; оркестратор запускает их после тега T258 (R156).

**Основа** — на 2026-11-23, `spec` `main` 9b8c29a; запрос автора, подготовленный в сессии `.github` в тот же день.
- `spec`: `docs/decisions.md` — 7 644 ссылки на 268 тыс. слов, из них 1 689 номеров задач; 409 датированных поправок, 115 хвостов «— *Consequence:*»; `docs/architecture.md` — 1 115 ссылок на 32 тыс. слов; в комментариях кода — около 1 360 номеров решений на 156 тыс. строк. Шаблон ссылок — из запроса: `\b(R[0-9]+( spec| [a-z-]+)?|(architecture|sources|measurements|repositories|privacy|product|concepts) [0-9]+(\.[0-9]+)*( spec)?|T[0-9]+)\b`.
- `.github` (замер его сессии): ссылка — каждые 25–35 слов; в workflow — 59 номеров решений на 1 000 строк, против около 1.2 ссылки на issue на 1 000 строк в стандартной библиотеке Go 1.27.4.
- measurements 1.14.4, строка (c): по номерам решений в комментариях сессии не ходили; 2 из 8 — неверны.
- Чужие практики — ядро Linux, Google, Chromium, Wikipedia, ADR, Claude Code, исследование ETH Zurich: текст несёт причину словами и стоит сам; история — в коммитах; ссылка — только туда, где цель держит нужное читателю (открытая ошибка, обход, спорный факт, необратимое решение). Записи — T256.

**Решено автором (2026-11-23)**, все четыре — по рекомендациям:
- **Правило — узкое**, новым решением (`R171`); R160 и R32 переписываются на месте и ссылаются на него.
  - Ссылка — только там, где читатель пойдёт по ней, чтобы действовать; одна на утверждение.
  - Внешний факт, который можно оспорить, — одна запись `sources` или `measurements`, не цепочка.
  - Решённый выбор, который выглядит изменяемым — ограничение, обход, выбор, где важны отвергнутые варианты, — номер решения, один раз.
  - Комментарий кода — причина словами, стоит без журнала; номер решения — только где важны отвергнутые варианты; плотность — как у больших кодовых баз, около одного на 1 000 строк.
  - Номеров задач и датированных поправок нет вне RUN.md, `run/` и `docs/plan/` — в `sources` и `measurements` тоже.
  - Нет ссылки на фразе, которая только описывает, и нет цепочки: место, на которое ссылаются, ссылается дальше само.
  - Отвергнуто: только `sources` и `measurements` — у обхода пропадает якорь, и `grep R33` не находит, что опирается на решение; прежнее правило с одним запретом номеров задач — цепочки и описательные ссылки остаются, а это основной шум.
- **`docs-check` — механика, по ключу.** Ошибка: номер задачи в документе вне RUN.md, `run/` и `docs/plan/`; датированная поправка в журнале; больше двух ссылок в одной скобке; номер задачи в комментарии кода. Включает ключ `"citations": true` в `docs-budgets.json` репозитория, как `comments` (R32): его ставит задача самого репозитория и видит красное ровно там, где правило нарушено, а волна 0 и другие переходы на тег не краснеют раньше неё; шаблон несёт ключ с начала. Нужна ли оставшаяся ссылка — суждение сессии и ревью. Отвергнуто: проверка сразу для всех с тегом — переход по любой строке «Порядка» краснел бы; без проверки — правило не держится после эпика.
- **Датированные поправки — свернуть все в этом эпике**, во всех журналах: запись — один действующий текст, отвергнутое и цитаты остаются; в описании PR — таблица «поправка → место», как в T204; противоречие, найденное при свёртке, — строка таблицы 3, не правка по догадке. Это отменяет отвергнутое R160 «переписать все журналы сразу» — новые основания: читаемость и замер `.github`; R160 переписывается на месте. Отвергнуто: оставить поправки и запретить только новые — в журналах остаются сотни поправок; свернуть только в `spec`.
- **Хвост «— *Consequence:*»** — список файлов и разделов, которые правит изменение решения: ссылка, по которой идут действовать; без номеров задач и мест, которые только описывают. Отвергнуто: убрать хвост — при узком правиле `grep` по номеру находит не всё, что на решении стоит; оставить как есть.

**Решено при планировании (2026-11-23)** — выбор планировщика, автор может изменить:
- E22 — следующий свободный номер эпика, текущий по слову автора «спланируй как эпик»; E21 остаётся первым в `run/EPICS.md`.
- **Вне правила** — то же, что вне R160: нормативные тексты для авторов (R42) — `format/`, `contracts/`, `admission/`, `deployment/`, `legal/`, `consent-age/`, `export/`; `.proto` и описания схем, из которых генерируется код; архивы `docs/plan/`. Задача, которая их меняет, пишет по правилу; проверка их не читает. `docs/sources.md` и `docs/measurements.md` — внутри: дата записи остаётся, номер задачи уходит, из заголовков тоже.
- **Строки «Д…» и «В…»** — ссылка на открытую работу, как `TODO(crbug.com/…)` у Chromium: разрешены.
- **Строки 7.38–7.49** пишет T259, после проверок T258, как T206 в E16; «задачи нет», «по тексту T259», «Зависит от» — «—»: узел строки ждёт тега `spec` с T258 ([tools/orchestrator/README.md](tools/orchestrator/README.md), раздел 2).
- **Пачки** (R159): T256–T259 — ветка `e22-spec`, один PR, на мерже выходит тег (R31); T260–T275 — ветка `e22-spec-2`, один PR; T276 — отдельно, после строк.

| Status | ID | Task | Who | Plan | Depends on |
|---|---|---|---|---|---|
| [x] | T256 | Основа: источники и замер ссылок «до» в 13 репозиториях | Claude | — | — |
| [x] | T257 | Правило ссылок: решение, RULES.md, R160, R32, шаблон | Claude | — | T256 |
| [x] | T258 | `docs-check`: четыре проверки по ключу `citations`; тег | Claude | — | T257 |
| [x] | T259 | Строки COORDINATION.md 7.38–7.49: ссылки в 12 репозиториях | Claude | — | T258 |
| [x] | T260 | Журнал `spec`, часть 1: Scope and product — Releases | Claude | — | T258 |
| [x] | T261 | Журнал `spec`, часть 2: The documents check — Status badges | Claude | — | T258 |
| [ ] | T262 | Журнал `spec`, часть 3: Skill graph — Module index | Claude | — | T258 |
| [ ] | T263 | Журнал `spec`, часть 4: Files of the `spec` release — Showing the solution | Claude | — | T258 |
| [ ] | T264 | Журнал `spec`, часть 5: Contracts — The AI admission table | Claude | — | T258 |
| [ ] | T265 | Журнал `spec`, часть 6: The contract `app` ↔ `api` — AI providers | Claude | — | T258 |
| [ ] | T266 | Журнал `spec`, часть 7: Samples, eval sets and essays — The look of the app | Claude | — | T258 |
| [ ] | T267 | Журнал `spec`, часть 8: AI on the deployment — конец | Claude | — | T258 |
| [ ] | T268 | Документы `spec`: architecture | Claude | — | T258 |
| [ ] | T269 | Документы `spec`: concepts | Claude | — | T258 |
| [ ] | T270 | Документы `spec`: privacy и dpia | Claude | — | T258 |
| [ ] | T271 | Документы `spec`: product, repositories, README, CLAUDE.md, правила частей, план | Claude | — | T258 |
| [ ] | T272 | Документы `spec`: sources и measurements | Claude | — | T258 |
| [ ] | T273 | Комментарии кода: `tools/orchestrator/`, `tools/docs-check/`, `tools/new-repo/`, `tools/session/` | Claude | — | T258 |
| [ ] | T274 | Комментарии кода: остальное `tools/` | Claude | — | T258 |
| [ ] | T275 | Комментарии CI и окружения; ключ `citations` в `spec` | Claude | — | T260–T274 |
| [ ] | T276 | Итог эпика E22: замер «после», архив | Claude | — | T275; строки 7.38–7.49 |

#### T262. Журнал `spec`, часть 3: Skill graph — Module index

- **Цель и Сделать:** как T260, для разделов от «Skill graph» до «Module index» (≈ 200 КБ).
- **Как проверить:** как T260.
- **Разделы:** T257, T260; R160.

#### T263. Журнал `spec`, часть 4: Files of the `spec` release — Showing the solution

- **Цель и Сделать:** как T260, для разделов от «Files of the `spec` release» до «Showing the solution and a hint on request» (≈ 205 КБ).
- **Как проверить:** как T260.
- **Разделы:** T257, T260; R160.

#### T264. Журнал `spec`, часть 5: Contracts — The AI admission table

- **Цель и Сделать:** как T260, для разделов от «Contracts: protobuf, buf and Connect» до «The AI admission table» (≈ 189 КБ).
- **Как проверить:** как T260.
- **Разделы:** T257, T260; R160.

#### T265. Журнал `spec`, часть 6: The contract `app` ↔ `api` — AI providers

- **Цель и Сделать:** как T260, для разделов от «The contract `app` ↔ `api`» до «AI providers» (≈ 218 КБ).
- **Как проверить:** как T260.
- **Разделы:** T257, T260; R160.

#### T266. Журнал `spec`, часть 7: Samples, eval sets and essays — The look of the app

- **Цель и Сделать:** как T260, для разделов от «Samples, eval sets and essays» до «The look of the app by the interface mockup» (≈ 176 КБ).
- **Как проверить:** как T260.
- **Разделы:** T257, T260; R160.

#### T267. Журнал `spec`, часть 8: AI on the deployment — конец

- **Цель и Сделать:** как T260, для разделов от «AI on the deployment» до конца журнала (≈ 137 КБ), с новым решением T257.
- **Как проверить:** как T260.
- **Разделы:** T257, T260; R160.

#### T268. Документы `spec`: architecture

- **Цель:** `docs/architecture.md` (183 КБ, 1 115 ссылок) — по правилу T257.
- **Сделать:** номера задач — убрать; цепочки — к одному месту; описательная фраза — без ссылки; решение — номером там, где выбор выглядит изменяемым; внешний факт — одна запись `sources`. Карточки architecture 3 смысла не меняют.
- **Как проверить:** `just docs-check`; временно с ключом — ошибок в файле нет.
- **Разделы:** T257; architecture.

#### T269. Документы `spec`: concepts

- **Цель и Сделать:** как T268, для `docs/concepts.md` (169 КБ, 751 ссылка); словарь concepts 15 — термины не меняются.
- **Как проверить:** как T268.
- **Разделы:** T257, T268; concepts.

#### T270. Документы `spec`: privacy и dpia

- **Цель и Сделать:** как T268, для `docs/privacy.md` (121 КБ) и `docs/dpia.md` (86 КБ). Правка только ссылок: то, на чём стоит DPIA, не меняется, и ревизии DPIA не нужно (R129); ссылки dpia 9 — источники DPIA — остаются.
- **Как проверить:** как T268.
- **Разделы:** T257, T268; privacy; dpia.

#### T271. Документы `spec`: product, repositories, README, CLAUDE.md, правила частей, план

- **Цель и Сделать:** как T268, для `docs/product.md`, `docs/repositories.md`, `docs/README.md`, CLAUDE.md, `.claude/rules/`, а в RUN.md, `run/` и COORDINATION.md — цепочки и описательные ссылки правил и вводных (номера задач там разрешены). Пределы `tools/docs-check/budgets.json` не поднимать.
- **Как проверить:** как T268.
- **Разделы:** T257, T268.

#### T272. Документы `spec`: sources и measurements

- **Цель:** `docs/sources.md` и `docs/measurements.md` — без номеров задач, в заголовках тоже, и без цепочек; дата записи и замера остаётся.
- **Сделать:** номер задачи — убрать или заменить тем, что читателю нужно: решением, которое на записи стоит, или ничем; цитаты источников не трогать; номера записей и разделов не меняются (sources 1).
- **Как проверить:** как T268.
- **Разделы:** T257; sources 1; measurements 1.

#### T273. Комментарии кода: `tools/orchestrator/`, `tools/docs-check/`, `tools/new-repo/`, `tools/session/`

- **Цель:** комментарии этих папок — по правилу T257: причина словами, номер решения — только где важны отвергнутые варианты; номеров задач нет.
- **Сделать:** каждый `(R…)` — по правилу: оставить, где он держит отвергнутое; иначе — причина словами в одну фразу или ничего, если комментарий пересказывает код (R160). Замер «до» и «после» на 1 000 строк — в «Сделано». Код не менять; README и `executor.md` оркестратора — как документы, по правилу.
- **Как проверить:** правило tools — тесты тронутых папок; `just docs-check`.
- **Разделы:** T257; R160; `.claude/rules/tools.md`.

#### T274. Комментарии кода: остальное `tools/`

- **Цель и Сделать:** как T273, для остальных папок `tools/`.
- **Как проверить:** как T273.
- **Разделы:** T257, T273.

#### T275. Комментарии CI и окружения; ключ `citations` в `spec`

- **Цель:** комментарии `.github/`, justfile, `.devcontainer/`, `spec.go` и кода `repo-template/` — по правилу T257; `"citations": true` в блоке `spec` `tools/docs-check/budgets.json`, `just docs-check` зелёный — последняя задача пачки T260–T275.
- **Сделать:** как T273; затем ключ; то, что ключ ещё находит в T260–T274, — исправить.
- **Как проверить:** проверки правила ci для тронутых файлов; `just new-repo-test`; `just docs-check`; `/code-review high` — по пачке T260–T275, с таблицами «поправка → место».
- **Разделы:** T257, T258, T273; `.claude/rules/ci.md`.

#### T276. Итог эпика E22: замер «после», архив

- **Цель:** правило ссылок — во всех 13 репозиториях, измерено до и после; эпик в архиве.
- **Сделать:** замер «после» — командами `measurements 1.18` на `main` 13 репозиториев, в тот же раздел; строка measurements 1.9 — `just tokens-report --since 2026-11-23 --row` (R145); строки 7.38–7.49, задачи которых сделаны, — удалить (правило 4 COORDINATION.md); архив `docs/plan/E22.md` (Epics); входящие (правило 13).
- **Как проверить:** `just docs-check`.
- **Разделы:** measurements 1.9; T256; R145; COORDINATION.md, правило 4.
