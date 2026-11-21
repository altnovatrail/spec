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

## Table 1. Current epic — E19. Правки приложения, главная и страница решения задач

**Результат** — правки `app`, которые автор называет по ходу, и новый дизайн двух экранов: главной (`home` макета) и решения задачи (`task` и его состояния — лист, панель инструментов `canvas`, панель тьютора) — в `main` и в выпусках, одной веткой `e19` во всех затронутых репозиториях и одним `ship` в конце эпика.
- Правки — T249 и задачи, которые автор добавляет по ходу; главная — T250; страница решения задач — T251; ворота, выпуск, итог и архив — T252.

**Основа** — на 2026-11-21: `spec` `main` 152d560, `v0.19.7`; `app` `v0.1.44`, `canvas` `v0.3.37`, `api` `v0.1.73`, `tutor` `v0.1.60`, `module-kit` `v0.3.17`. Вход, «Кто учится?», «Ваш профиль», код приглашения и окна правовых текстов уже нового дизайна — T247 ([docs/plan/E18.md](docs/plan/E18.md)); главная и экран задачи — ещё макета T155 и T239 ([draft/mockup/README.md](draft/mockup/README.md), Screens and states).

**Решено автором (2026-11-21):**
- Режим — задача через несколько репозиториев (R166): клоны `.epics/e19/<repo>`, ветка `e19` в каждом, сессия автора в контейнере оркестратора.
- **Один выпуск на эпик.** Ветка `e19` мержится только после всех задач эпика: задачи до T252 кончаются коммитом и push в `e19`, без ворот, «да» и `ship`; «Сделано» называет «ветка `e19`». Ворота, «да» автора и `xrepo ship` — один раз, в T252. Отвергнуто: `ship` в конце каждой задачи, как в E18, — PR и раунд CI на каждую правку.
- Задачи автор добавляет по ходу: каждая встаёт в таблицу перед T252, номер — свободный, когда автор её называет; «я + Claude», план «да».

**Порядок работы:**
- Первая задача делает `xrepo up e19 spec app` и добавляет репозитории, которые задевает (`canvas`, `api`); следующие — `xrepo up e19 <repo>` для новых, клон уже есть — остаётся (R166, The commands). Каждая задача — новая сессия в контейнере оркестратора (R143); что ей нужно от прежней — в клонах и в `.epics/e19/notes.md`.
- Учёт задачи — отметка, «Сделано», перенос тела в архив `docs/plan/E19.md` — в клоне `spec` в `.epics` (R166, Tasks of one repository during an epic); этот план — первый коммит ветки `e19` `spec`.
- Правка дизайна — сначала состояние макета `draft/mockup` в клоне `spec`, одобренное автором, потом код (R148); что код делает иначе макета, автор видит на стенде.
- Пока идёт эпик, задачи `spec` вне него (`run/TASKS.md`: T117, T240, T248) ждут его `ship`: окно оркестратора открывает папку `spec` (R166). Задачи других репозиториев идут рядом на клонах хоста; `xrepo sync` вливает их `main` в `e19`.

**Нужно от автора:** называть правки и новые задачи; дать дизайн главной и страницы решения задач и одобрить их состояния макета; проверять на стенде; «да» перед `ship` в T252.

**Развёрнут 2026-11-21** по слову автора («создай новый эпик и сразу разверни его задачи… будем делать в режиме xrepo… ветку смержим только после того как сделаем все задачи»).

| Status | ID | Task | Who | Plan | Depends on |
|---|---|---|---|---|---|
| [ ] | T249 | Исправления в приложении — первые правки автора | я + Claude | да | — |
| [ ] | T250 | Дизайн главной страницы | я + Claude | да | — |
| [ ] | T251 | Дизайн страницы решения задач | я + Claude | да | — |
| [ ] | T252 | Ворота, выпуск одним `ship`, итог и архив эпика | я + Claude | — | все задачи эпика |

- Новые задачи автора встают перед T252; T249–T251 друг от друга не зависят и идут в любом порядке.

#### T249. Исправления в приложении — первые правки автора

- **Цель:** правки `app`, которые называет автор, — в ветке `e19`, проверенные на стенде.
- **Сделать:** список правок — от автора при планировании. `xrepo up e19 spec app` и репозитории, которые правки задевают; правка вида — сначала состояние макета и одобрение автора (R148), потом код; малое — сама сессия, большой кусок — субагент (R166); быстрые проверки тронутого — `xrepo test`; проверка автора на стенде `xrepo serve`; коммит и push в `e19` после каждой законченной правки. Что мешало — в `.epics/e19/notes.md`, для T252.
- **Решить при планировании:** список правок и их репозитории; какие — через макет; одна задача или несколько (правило 11).
- **Решено автором (2026-11-21):**
  - Правка 1 — убрать с главной (`MySubjects` `app`) блок «Наставник — это ИИ»: заголовок, текст и кнопку «Как безопасно пользоваться наставником». R33 app — переписать на месте; раскрытие остаётся первым пузырём панели тьютора (R67 app) и в Help взрослого (R63 app), R123 — без изменений. Страница `#/tutor` остаётся без входа: куда его деть — строка `run/DEBT.md` `app`, решить позже (слово автора «убрать в тех долг и решить позже»); строка называет R123 — материалы о безопасном использовании всем ученикам.
- **Не делать:** ворота, PR и `ship` — они в T252.
- **Как проверить:** `xrepo test` тронутых репозиториев; автор на стенде — каждая правка; для правки вида — сравнение с одобренным состоянием макета; `just mockup-test` и `just docs-check` в клоне `spec`, где он тронут.
- **Мой шаг:** назвать правки; одобрить макет, где он нужен; проверить на стенде.
- **Стоимость:** модели на стенде — под лимитом $2 сессии стенда (R166).
- **Разделы:** R166, R148, R146; [draft/mockup/README.md](draft/mockup/README.md); T247.

#### T250. Дизайн главной страницы

- **Цель:** главная `app` — нового дизайна автора, в одном стиле со входом и «Кто учится?» T247, на iPad и телефоне.
- **Сделать:** дизайн — от автора; состояния макета `home`, `home-help`, `home-switch`, `home-legend`, `home-pages` — в клоне `spec`, на небе и в карточках T247, контраст WCAG AA в таблице README макета; одобрение автора по снимкам (R148); потом код `app`; что меняет поведение — по документам и решениям `app`, а где их нет — вопрос автору, не догадка (правило 2).
- **Решить при планировании:** откуда дизайн — канва claude.ai, картинка или HTML автора; какие из пяти состояний меняются; что из главной — следующий урок, доля времени тьютора, «С бумаги», модули и отметки навыков — остаётся, меняется или уходит, и решения `app`, которые это задевает.
- **Как проверить:** `just mockup-test` и `just docs-check` в клоне `spec`; браузерные тесты `app` — `xrepo test app --browser`; сравнение снимков `app` с состояниями макета Playwright на двух размерах (R146); автор на стенде.
- **Мой шаг:** дать дизайн; одобрить состояния макета; проверить на стенде.
- **Разделы:** R148, R166, R146; architecture 3.1; [draft/mockup/README.md](draft/mockup/README.md), Screens and states, The style, Contrast.

#### T251. Дизайн страницы решения задач

- **Цель:** экран решения задачи — лист `canvas`, его панель инструментов, панель тьютора, шаги и проверка — нового дизайна автора, на iPad и телефоне.
- **Сделать:** дизайн — от автора; состояния макета `task` … `task-full` — в клоне `spec`, одобренные автором по снимкам (R148); потом код — `app` (экран, панель тьютора) и `canvas` (лист, панель инструментов); что меняет поведение — по документам и решениям `app` и `canvas`, а где их нет — вопрос автору.
- **Решить при планировании:** откуда дизайн; какие состояния меняются и что в них остаётся из T155 и T239; что из этого — `canvas`, а что — `app`; одна задача или две — `app` и `canvas` (правило 11).
- **Как проверить:** `just mockup-test` и `just docs-check` в клоне `spec`; `xrepo test app --browser`, `xrepo test canvas --browser`; сравнение снимков с состояниями макета на двух размерах (R146); автор на стенде — задача модуля от листа до «Верно».
- **Мой шаг:** дать дизайн; одобрить состояния макета; проверить на стенде.
- **Стоимость:** модели на стенде — под лимитом $2 сессии стенда (R166).
- **Разделы:** R148, R166, R146, R165; architecture 3.1, 3.2; [draft/mockup/README.md](draft/mockup/README.md); T155, T239.

#### T252. Ворота, выпуск одним `ship`, итог и архив эпика

- **Цель:** вся ветка `e19` — в `main` и в выпусках, одним проходом `ship` после «да» автора; эпик в архиве.
- **Сделать:** `xrepo sync`; `xrepo gate` по всем тронутым клонам; «да» автора; `xrepo up e19 infra`, если вышли `api` или `app` (R166, The ship); `xrepo ship` — PR по зависимостям, `spec` первым, один раунд CI каждый; `xrepo down`. Затем по правилам RUN.md: замер `just tokens-report --since 2026-11-21 --row` — строка measurements 1.9; что мешало, из `.epics/e19/notes.md`, — поправки `xrepo` или R166 либо строки `run/DEBT.md`; описание и таблица эпика — в `docs/plan/E19.md`; входящие (правило 13).
- **Как проверить:** `xrepo gate` зелёный; каждый PR — один раунд CI; выпуски вышли, пины зависимых подняты; `just docs-check`.
- **Мой шаг:** «да» перед `ship`; правка `deploy/production.json` `infra`, где `ship` на ней остановится.
- **Разделы:** R166, R159, R145, R156; правила 9 и 13 этого файла, Epics.
