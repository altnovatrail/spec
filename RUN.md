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
   - A task outside an epic leaves `run/TASKS.md` for the current epic's archive, section «Задачи вне эпика, сделанные за его время»; with no current epic, to the last done epic's archive, section «Задачи вне эпика, сделанные после него» (R19, amendments 2026-11-12 and 2026-11-13).
10. Language — RULES.md, Hard rules (R154); translating a document — [tools/translation/README.md](tools/translation/README.md).
11. A task larger than one review (≈ 30–60 minutes of reading): propose a split before starting.
12. Before a new task, close the findings on the previous one (allowed departure from rule 1): SonarCloud — [New Code](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec), after the merge; CodeQL and Scorecard — `gh api 'repos/altnovatrail/spec/code-scanning/alerts?state=open'`. Fix in code first; "false positive" is the last resort, with the reason in words; what stays open gets its reason in the log (shared ones — R33). Never skip silently. Report these fixes in a separate paragraph: the author commits them separately.
13. Inbox — on the author's word («Разбери входящие») or once the last task of the current epic is checked, not before each task (R81, second amendment 2026-11-12); an allowed departure from rule 1. Procedure — [run/INBOX.md](run/INBOX.md).

**Statuses:** `[ ]` not started; `[x]` done, the executor marks it; `[-]` not done — the author's decision, reason in the task; `[?]` deferred — the author's decision, reason and when to return in the task. A task that fails the author's review returns to `[ ]` with what to fix.

**Who:** «Claude» — the executor does it, the author reviews; «Claude, проверяю я» — texts the author reads line by line; «я + Claude» — the author does some steps: decisions, sign-ins, GitHub settings, confirmations by rule 4.

**Plan:** «да» — plan mode first: decisions missing from the documents, or larger than one review (rule 11); «—» — run at once.

**Task body** (Russian): «Цель», «Сделать», «Как проверить», «Разделы»; as needed «Не делать», «Решить при планировании», «Мой шаг», «Стоимость», «Риски»; from planning «Почему», «Решено автором (дата)», «Выяснилось при планировании»; when done «Сделано (дата)» (rule 9).

**Citations** — RULES.md, Citations. A task is cited by number: «T03», «RUN.md, T03»; one not here is in `run/TASKS.md` or an archive: `grep -n '^#### T03\.' RUN.md run/TASKS.md docs/plan/*.md`. Task numbers are global and never reused: take the one free when writing it down.

## Epics

- **Table 1** is the current epic: its tasks in detail, run one at a time.
- **Next epic.** Once table 1 is all checked: the inbox (rule 13); the author picks the next epic from `run/EPICS.md` and splits it with Claude in plan mode into tasks of one review each, into table 1 and this file.
- **Grouping** (R159; RULES.md, How we work): the plan takes the grouping with the fewest pull requests; a pull request of its own only where a dependency needs it.
  - *A batch*: tasks of one repository in a row, none needing another's release — one branch `<epic>-<repo>`, as `e16-spec`. Where the executor commits (rule 7), a task is one commit with its bookkeeping, «Сделано» naming «ветка …», pushed, with no pull request and no checks. The last runs every local check of the batch's parts, `/code-review high` over the batch, opens one pull request, writes its number into every «Сделано», and waits on CI; the merge is a merge commit. The batch ends early at a task whose release another needs, one after which a container is rebuilt (`.devcontainer/`), or one waiting on the author. A single task has a branch of its own.
  - *A task across repositories* (R166): a task of table 1 that names its repositories, with no row of COORDINATION.md; one branch, the epic's name, in each, all the code there. One session in the orchestrator's container, `.devcontainer/orchestrator/`, works in the clones `.epics/<epic>/<repo>`, which every container mounts at `/workspaces/.epics`; the host's clones stay on `main`. `xrepo up <epic> <repos…>` makes the clones, `spec` among them, and wires them to that one `spec` and to each other outside git; `xrepo test` runs a repository's quick checks in its container (R156); `xrepo serve` is the stand of `api`, `app` and `canvas`, where the author checks the change by hand. Each finished change is committed and pushed — a branch's push runs no CI. Then `xrepo gate`: the full CI of each touched repository in its container, with the coverage of the changed lines (R48). After the author's «да», `xrepo ship`: the pull requests one at a time by dependency, `spec` first — merged on green checks, released, the dependents' pins moved to the release —, one round of CI each; `infra` last where the change reaches the deployment. `xrepo down` ends it. A design change is first a state of `draft/mockup`, approved by the author (R148). A task of one of those repositories runs beside it on the host's clone, but none of spec, whose folder the orchestrator's window opens; `xrepo sync` merges `main` into the epic's branch.
- **A done epic** goes to `docs/plan/<epic>.md` (R59 canvas-api): bodies and gist sentences are there already (rule 9); move its description and table of tasks verbatim; questions and debt stay in `run/`; measure — `just tokens-report --since <first day of the epic> --row` — as a row of measurements 1.9 (R145); table 1 names it as the last done epic. Never read an archive whole: take the task cited.
- **DPIA** ([docs/dpia.md](docs/dpia.md), R129): a task that changes what it rests on — a kind of data or retention, a provider or processor, an AI capability or route, opening an age, a country or a feature to children — reviews it; its «Сделано» names the review, the DPIA's log the version. Also before the beta, before the public launch and at least yearly.
- **Token savings** (R145): the limits of `docs-check` — [tools/docs-check/budgets.json](tools/docs-check/budgets.json), a raise shows in review; measure at an epic's archive and monthly (`just inbox` reminds, rule 13); a task of analysis goes to `run/TASKS.md` by the threshold of R145, and its planning decides whether it needs an epic; baselines, dates, last analysis — measurements 1.9.

## Table 1. Current epic — E18. Работа через несколько репозиториев: `.epics` и `xrepo`

Last done epic — E11, [docs/plan/E11.md](docs/plan/E11.md).

**Результат** — задача через несколько репозиториев идёт без ручной возни E11: клоны эпика лежат в папке хоста `.epics/<эпик>/<repo>`, которую все контейнеры видят по одному пути; команда `xrepo` поднимает клоны и связку, стенд api + app + canvas с автопересборкой, проверяет всё решение локально перед PR и ведёт PR, мерж и выпуски по зависимостям; подход обкатан на правках приложения, которые автор называет по ходу.
- Решения и правила — T241; монтирование `.epics` — T242; волна всех 12 репозиториев на новый тег — T243; `xrepo`: среда и стенд — T244, ворота и выпуск — T245; обкатка — задачи по слову автора; итог и замер против E11 — T246.

**Основа** — на 2026-11-20.
- `spec` `main` d5e9048, `v0.19.3`; `module-kit` `v0.3.16`, `tutor` `v0.1.59`, `canvas` `v0.3.36`, `api` `v0.1.72`, `app` `v0.1.42` — выпуски E11.
- E11 (R159, [docs/plan/E11.md](docs/plan/E11.md), T226 и T232): клоны на томе `novatrail-claude`, связка руками (`e11.sh`, `relay.mjs` — их тексты только в транскрипте T226, `~/.claude/projects/-workspaces-spec/28b30636-4d0d-4a10-ab18-afc894307cea.jsonl`), проверки по `docker exec`. Цена: $447.25 за T226–T232 и $12.30 исполнителя T91 `infra`; 9 раундов CI на 6 PR — вторые нашли SonarCloud S2871 в `spec` и `codecov/patch` в `canvas` (85.98%) и `app` (84.65%: Codecov считает частично покрытую строку промахом, локальный подсчёт — попаданием); 2 ч 10 мин от первого PR до выпуска `app`. Возня: подмодуль `spec` в пяти клонах после каждого коммита `spec`, npm-пакеты симлинками, ручная пересборка `canvas` и перезапуск `api`, 8 стражей пинов падают под связкой, push из клона хоста без учётных данных, выкладки в плане не было. Разбор — артефакт https://claude.ai/artifact/Hc4fgYbFEQE1AM8sWzZf3t.
- Проверено при планировании: push ветки без PR CI не запускает — `ci.yml` всех 12 репозиториев: `pull_request` и `push: branches: [main]`. Скрипта покрытия изменённых строк нет ни в одном репозитории. Кода мержа и ожидания выпусков в `tools/orchestrator` нет — это процедура [README оркестратора](tools/orchestrator/README.md), раздел 5.

**Решено автором (2026-11-20)** в разборе E11 и при планировании; где автор сказал «на твоё усмотрение» — выбор Claude по этому слову, автор может его изменить:
- **Горизонт.** Около 6 месяцев прототипирования работа через несколько репозиториев — основной способ; потом — 2–3 репозитория, затем микросервисы. Отвергнуто: монорепозиторий — его пришлось бы разбирать; раздельные репозитории (R10) остаются, `xrepo` — для любого их набора.
- **Папка эпиков на хосте.** `.epics` рядом с клонами, `/workspaces/.epics` в каждом контейнере; монтируется только она, её создаёт `initializeCommand`; клоны хоста остаются на `main`, параллельные задачи одного репозитория не трогают ветку эпика. Почему: полгода окупают разовую правку `.devcontainer/`; запись чужого клона и так возможна — том `~/.claude` монтируют все; сокет и так root на хосте (В42 R158 — довод снят); работа не рядом с учётными данными Claude; клоны видны на хосте и в окне любого репозитория. Отвергнуто: том `novatrail-claude`, как в E11; сами клоны хоста — ветка эпика сталкивается с параллельными задачами; `${localWorkspaceFolder}/..` — у постороннего монтирует лишнее; Compose — правка всех `.devcontainer/` и всё равно одно окно на контейнер; git worktrees — подмодуль `spec` (git: «NOT recommended to make multiple checkouts of a superproject»); единый workspace-контейнер на все клоны (R156, В70).
- **Сборка из кусков.** Один источник `spec` — его клон в `.epics`: Go — `go.work` `replace … => ../spec`; `app` и `canvas` — пакеты `spec` из этого клона без правки `package.json` и lock; подмодули выравниваются на воротах. `xrepo serve` — весь стенд, `canvas` в watch, `api` перезапускается при правке Go, relay портов по списку, готовность проверяет сама. Отвергнуто: стенд из боевых образов — до микросервисов.
- **Кто пишет код** — слово автора: «на усмотрение оркестратора… чтобы поправить 1 строчку кода [не] выгодно создавать субагента… Если требуется дописать большой кусок кода то пускай создаёт субагента».
- **Push** — слово автора: «пускай пушит после завершения каждого изменения в репозитории»; PR — только после ворот.
- **Выпуски** — согласие автора: после «да» `xrepo` ведёт PR → мерж на зелёных (R156) → ожидание файлов выпуска → пины зависимых по порядку зависимостей; PR параллельно не открываются (В71); выкладка `infra` — последний узел, если изменение до неё доходит.
- **Ворота** (выбор Claude): во время разработки — быстрые проверки тронутого (слово 2026-11-19); после ручной проверки автора — полный CI каждого тронутого репозитория в его контейнере со связкой, браузеры — движки его CI, покрытие изменённых строк по правилу Codecov с порогом репозитория (R48), стражи пинов — только списком в README эпика; SonarCloud — в CI.
- **Окно оркестратора** (выбор Claude): сессия и multi-root с уже закреплёнными расширениями; расширения языка туда не ставятся — контейнер с сокетом (R156); правки с подсказками языка — в окне репозитория на его клоне в `.epics`.
- **Задачи одного репозитория во время эпика** (выбор Claude): идут параллельно; `xrepo sync` вливает `main` в ветку эпика merge-коммитом; механический конфликт решает сессия, смысловой — вопрос автору.
- **Лимит трат на модели на стенде** (выбор Claude): $2 на сессию стенда, ключ разработчика; выше — вопрос автору.
- **Обкатка.** Правки автор называет по ходу; правки дизайна — сначала состояние макета `draft/mockup` и одобрение автора, потом код (ответы 2026-11-20).
- **Внедрение** — слово автора 2026-11-20 («Не логично ли сразу поправить devcontainer во всех репозиториях?»): `.epics` сразу во всех 12 репозиториях, волной T243 — эпик, задевший репозиторий без неё, не ждёт перехода на тег и пересборки посреди работы. Отвергнуто: только пять репозиториев E11, остальные — со своим следующим переходом на тег (выбор Claude при планировании).

**Порядок работы:**
- Ветка эпика `e18` — в каждом затронутом репозитории: `spec` и все 12 других — волна T243 задевает каждый —, от `main` 2026-11-20 (слово автора); каждая задача — коммит и push в неё, в том числе исполнители волны T243. PR `e18` → `main` — где нужен выпуск: `spec` после T242 (T243 ждёт тег) и после T245, остальные — в T243 и в задачах обкатки; ветка затем продолжается от свежего `main`. T243 — после выпуска T242, в контейнере оркестратора; T244 начинается после выпуска T242 и может идти параллельно T243.
- Обкатка — задачи через несколько репозиториев по `R166` (T241): каждая называет свои репозитории, `xrepo up` в начале, `ship` и `down` в конце; номер — свободный, когда автор называет правку.

**Нужно от автора:** прочитать тексты T241; пересобрать свой контейнер оркестратора и `spec` после T242; запустить T243; называть правки обкатки и проверять их на стенде; «да» перед `ship` каждой задачи.

**Развёрнут в режиме планирования 2026-11-20** по слову автора («планируем реализацию этого функционала. Заодно создай новый эпик»).

| Status | ID | Task | Who | Plan | Depends on |
|---|---|---|---|---|---|
| [x] | T241 | Решения: `R166`, R159, R156, R158; RULES.md, RUN.md, CLAUDE.md | Claude, проверяю я | — | — |
| [x] | T242 | Монтирование `.epics` в devcontainer `spec` и оркестратора | Claude | — | T241 |
| [x] | T243 | Волна: все 12 репозиториев на тег `spec` с `.epics`, пересборка | я + Claude | — | T242 |
| [x] | T244 | `xrepo`: среда и стенд — up, status, test, serve, stop, down | Claude | да | T242 |
| [ ] | T245 | `xrepo`: ворота и выпуск — sync, gate, push, pin, ship; покрытие изменённых строк | Claude | да | T244 |
| [ ] | T247 | Доработки интерфейса приложения — первая обкатка `xrepo` | я + Claude | да | T243, T245 |
| [ ] | T246 | Итог обкатки: замер против E11, поправки, архив | Claude | — | T247, обкатка |

- Задачи обкатки встают в таблицу перед T246 по слову автора, «я + Claude», план «да»; первая — T247.

#### T245. `xrepo`: ворота и выпуск — sync, gate, push, pin, ship; покрытие изменённых строк

- **Цель:** до PR всё решение проверено локально так, как проверит CI; PR, мерж и выпуски идут по зависимостям одной командой после «да» автора.
- **Сделать:**
  - `tools/patchcov/` и рецепт `patchcov` — покрытие изменённых строк от merge-base по `coverage/go.out` и `coverage/lcov.info`, частично покрытая строка — промах (формула Codecov — `docs/sources.md`), порог — из `.github/codecov.yml` репозитория; свои тесты.
  - `gate` — в контейнере каждого тронутого репозитория его рецепты `ci-*` (`app`, `canvas` — `just ci`; Go — `ci-lint ci-test ci-vuln ci-licenses` с `ALLOWED_LICENSES` из `just -f spec/justfile licenses-allowed`), браузеры — движки его CI, затем `patchcov`; разрешены только падения стражей из README; `spec` — `just docs-check` и проверки его частей.
  - `sync` — `main` в ветку эпика merge-коммитом; `push` — из клона в `.epics` через `GIT_ENV`; `pin <репозиторий>` — подмодуль, `go get`, `package.json` на вышедший выпуск, снять `go.work` и связку npm; `wait-release <репозиторий> <тег>` — `gh release`, npm, прокси Go `.info` 200.
  - `ship` — процедура README: после «да» — PR, проверки и SonarCloud по API ([tools/orchestrator/README.md](tools/orchestrator/README.md), раздел 5), мерж, `wait-release`, `pin` зависимых, их PR; узел `infra`, если изменение доходит до выкладки.
- **Как проверить:** тесты `tools/patchcov` и `just orchestrator-test`; `patchcov` на профиле `app` PR #106 даёт 84.65%, как Codecov; пробный `gate` на `module-kit` и `tutor`.
- **Разделы:** R48, R77, R156, R159, `R166`; [tools/orchestrator/README.md](tools/orchestrator/README.md), раздел 5.

#### T247. Доработки интерфейса приложения — первая обкатка `xrepo`

- **Цель:** правки интерфейса `app`, которые называет автор, — в `main` и в выпусках, сделанные по `R166` от `xrepo up` до `ship` и `down`; на них видно, как работает подход.
- **Сделать:** список правок — от автора при планировании, по одной или группами; на каждую правку дизайна — сначала состояние макета `draft/mockup` в клоне `spec` и одобрение автора (R148), потом код в `app` и, где нужно, в `canvas`, `api` и `spec`. Ход: `xrepo up e18 …` с теми репозиториями, что задевают правки; малое — главная сессия, большой кусок — субагент; push после каждого законченного изменения; проверка автора на стенде `xrepo serve`; `xrepo gate`; «да» автора; `xrepo ship`; `xrepo down`. Что мешало в ходе — заметки для T246.
- **Решить при планировании:** список правок и их репозитории; какие правки — через макет, а какие без изменения вида; одна задача или несколько.
- **Как проверить:** автор на стенде — каждая правка против одобренного макета; `xrepo gate` зелёный; каждый PR — один раунд CI.
- **Мой шаг:** назвать правки; одобрить макет; проверить на стенде; «да» перед `ship`.
- **Стоимость:** вызовы моделей на стенде — под лимитом $2 сессии стенда.
- **Разделы:** `R166`, R148, R159; [draft/mockup/README.md](draft/mockup/README.md); T244, T245.

#### T246. Итог обкатки: замер против E11, поправки, архив

- **Цель:** видно, что дал подход против E11, и `xrepo` с `R166` поправлены по найденному.
- **Сделать:** `just tokens-report` окна эпика — строка measurements 1.9 (R145), и рядом: стоимость и токены на правку, раунды CI на PR, время от первого PR до последнего выпуска, ручные действия автора вне проверок; база — E11 ($447.25 за T226–T232; 9 раундов на 6 PR; 2 ч 10 мин); поправки к `xrepo` и `R166`; архив эпика (Epics); входящие (правило 13).
- **Как проверить:** `just docs-check`.
- **Разделы:** R145, `R166`; measurements 1.9.
