# RUN.md — work plan of spec

Plan of `spec` and of organization-wide work; the order of the other repositories' tasks is [COORDINATION.md](COORDINATION.md) (R76). Context: [product](docs/product.md), [architecture](docs/architecture.md), [repositories](docs/repositories.md), [privacy](docs/privacy.md), [decisions](docs/decisions.md). Other tables, each a file opening with its rules (R153): 2, epics for later — [run/EPICS.md](run/EPICS.md); 3, questions to the author — [run/QUESTIONS.md](run/QUESTIONS.md); 4, debt — [run/DEBT.md](run/DEBT.md); 5, rows of other repositories recorded — [run/INBOX.md](run/INBOX.md). Open tasks outside an epic — [run/TASKS.md](run/TASKS.md) (R155).

Language (R154): rules and tables in English, terse, for the session; the bodies of tasks in table 1 and in `run/TASKS.md` in Russian — the author writes and reviews them.

## Rules

A task starts with «Выполни задачу T01 из RUN.md» in a new session in the devcontainer. One task — one session (R143): the hook [tools/session/](tools/session/main.mjs) stops another task's phrase in the same session. An epic across repositories starts with «Сделай эпик E…» in spec's orchestrator container, `.devcontainer/orchestrator/`: the orchestrator runs each task as a fresh `claude -p` in its repository's container and merges its pull request (R156), by [its procedure](tools/orchestrator/README.md#сделай-эпик-e); the hook counts the epic as one task.

1. Do only the named task; touch other tasks' files only where it requires.
2. Read first: [CLAUDE.md](CLAUDE.md), the task — in table 1, or only its own body of `run/TASKS.md` (its opening says how) —, the sections it cites, `docs/decisions.md`.
   - Conflict with the documents or something missing — stop and ask; never guess.
   - A gap is an open question, the next free number by the register's opening: О- product 13, П- privacy 9, Т- repositories 8.
   - From `run/DEBT.md` and `run/QUESTIONS.md` take only the rows the task and its sections name and those `grep -n` finds by the paths and parts it changes (R143).
3. Devcontainer only (RULES.md, Hard rules, with its cloud-session exception): on the host stop before the first edit.
4. Outside this repository — creating or configuring repositories, pushing to them, organization settings, anything that costs money — only after a warning (what, where, cost) and the author's confirmation.
   - Exception, no confirmation: «Сделай эпик E…» (R156) — running the epic's tasks in their repositories' containers, the executors' pushes and pull requests, and their merge on green checks. Whatever else a task does outside its repository still needs confirmation, a question in the orchestrator's queue; usage bought beyond the subscription, never.
   - Exception, no confirmation: the task's checks by R146 — browser: Playwright in the devcontainer, custom-token sign-in on the dev project; AI: the `tutor` stub in `api` dev mode. A real AI call only where the task checks the model's words: dev key under the author's spend limit, within the task's ceiling, or with confirmation where it has none; «Сделано» names the provider, the calls and the cost. Nothing on devices: what only a device shows stays debt of the repository of those screens.
5. Facts on AI providers, laws, prices and other platforms — from the primary source, as a record of `docs/sources.md` (RULES.md, How we work).
6. End with green checks of the parts changed — their rule `.claude/rules/<part>.md` (CLAUDE.md, Environment) — and always `just docs-check`. Then `/code-review high`, one round: fix the findings, do not rerun. A small change may skip the review even if «Как проверить» names it.
7. Do not commit — here or in repositories an epic creates — unless the task or the author's word says so: the author commits after review. In an orchestrator's run the executor commits, pushes and opens the pull request by `tools/orchestrator/executor.md`, and the orchestrator merges it (R156).
8. End with a short report in Russian: what was done, files and repositories, how to check (commands), what the review found or why there was none, what is open.
9. When done: table 1 `[ ]` → `[x]`; append to the body «Сделано (дата)» — what was done, how checked — and «Открыто». A question for the author from «Открыто» is also a row of `run/QUESTIONS.md`; what is put off, a row of `run/DEBT.md`.
   - Then move the body verbatim, relative links fixed, to the epic archive `docs/plan/<epic>.md`, with a gist sentence — an unheaded list item at the start of the receiving section: «T129 — сделана 2026-11-11: <итог одной фразой>». Neither stays here (R153).
   - A task outside an epic leaves `run/TASKS.md` for the current epic's archive, section «Задачи вне эпика, сделанные за его время»; with no current epic, to the last done epic's archive, section «Задачи вне эпика, сделанные после него» (R19, amendments 2026-11-12 and 2026-11-13).
10. Language — RULES.md, Hard rules (R154); translating a document — [tools/translation/README.md](tools/translation/README.md).
11. A task larger than one review (≈ 30–60 minutes of reading): propose a split before starting.
12. Before a new task, close the findings on the previous one (allowed departure from rule 1): SonarCloud — [New Code](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec), after the merge; CodeQL and Scorecard — `gh api 'repos/altnovatrail/spec/code-scanning/alerts?state=open'`. Fix in code first; "false positive" is the last resort, with the reason in words; what stays open gets its reason in the log (shared ones — R33). Never skip silently. Report these fixes in a separate paragraph: the author commits them separately.
13. Inbox — on the author's word («Разбери входящие») or once the last task of the current epic is checked, not before each task (R81, second amendment 2026-11-12); an allowed departure from rule 1. Procedure — [run/INBOX.md](run/INBOX.md).

**Statuses:** `[ ]` not started; `[x]` done, the executor marks it; `[-]` not done — the author's decision, reason in the task; `[?]` deferred — the author's decision, reason and when to return in the task. A task that fails the author's review returns to `[ ]` with what to fix.

**Who:** «Claude» — the executor does it, the author reviews; «Claude, проверяю я» — texts the author reads line by line; «я + Claude» — the author does some steps: decisions, sign-ins, GitHub settings, confirmations by rule 4.

**Plan:** «да» — plan mode first: decisions missing from the documents, or larger than one review (rule 11); «—» — run at once.

**Task body** (Russian): «Цель», «Сделать», «Как проверить», «Разделы»; as needed «Не делать», «Решить при планировании», «Мой шаг», «Стоимость», «Риски»; from planning «Почему», «Решено автором (дата)», «Выяснилось при планировании»; when done «Сделано (дата)», «Открыто» (rule 9).

**Citations** — RULES.md, Citations. A task is cited by number: «T03», «RUN.md, T03»; one not here is in `run/TASKS.md` or an archive: `grep -n '^#### T03\.' RUN.md run/TASKS.md docs/plan/*.md`. Task numbers are global and never reused: take the one free when writing it down.

## Epics

- **Table 1** is the current epic: its tasks in detail, run one at a time.
- **Next epic.** Once table 1 is all checked: the inbox (rule 13); the author picks the next epic from `run/EPICS.md` and splits it with Claude in plan mode into tasks of one review each, into table 1 and this file.
- **A done epic** goes to `docs/plan/<epic>.md` (R59 canvas-api): bodies and gist sentences are there already (rule 9); move its description and table of tasks verbatim; questions and debt stay in `run/`; measure — `just tokens-report --since <first day of the epic> --row` — as a row of measurements 1.9 (R145); table 1 names it as the last done epic. Never read an archive whole: take the task cited.
- **DPIA** ([docs/dpia.md](docs/dpia.md), R129): a task that changes what it rests on — a kind of data or retention, a provider or processor, an AI capability or route, opening an age, a country or a feature to children — reviews it; its «Сделано» names the review, the DPIA's log the version. Also before the beta, before the public launch and at least yearly.
- **Token savings** (R145): the limits of `docs-check` — [tools/docs-check/budgets.json](tools/docs-check/budgets.json), a raise shows in review; measure at an epic's archive and monthly (`just inbox` reminds, rule 13); a task of analysis goes to `run/TASKS.md` by the threshold of R145, and its planning decides whether it needs an epic; baselines, dates, last analysis — measurements 1.9.

## Table 1. Current epic — E15. Оркестратор вдали от VS Code

**Результат** — эпик по «Сделай эпик E…» идёт, пока автор вдали от окна VS Code оркестратора: вопросы, ответы и новые поручения ходят через приложение Claude на телефоне — Remote Control сессии оркестратора, текстом или диктовкой; контейнер после мержа, менявшего `.devcontainer/`, оркестратор пересобирает сам и создаёт тот, которого не было.
- Решение, поправки к R156 и процедура: Remote Control — канал автора вне VS Code — T191.
- CLI Dev Containers в стадии `orchestrator` — T192.
- Пересборка и создание контейнера оркестратором — T193.
- Итог — T194.

**Основа** — на 2026-11-17; факты — sources 2.13, 2.14 и 9.5, пилот — measurements 1.13.
- **Пилот T171.** 4 из 9 вопросов ждали утра автора, В13 `skill-map` — с 06:08 до 14:23 UTC; большинство репозиториев дважды ждали пересборки руками, ночью — до утра.
- **Remote Control.** Сессию Claude Code, и в расширении VS Code (`/remote-control`), ведут из приложения Claude, вкладка Code, пока машина и процесс `claude` работают. Push на телефон — по `/config`: «Push when actions required» — разрешения и вопросы, «Push when Claude decides» — PushNotification; без Remote Control PushNotification — только уведомление на компьютере. AskUserQuestion держится открытым, пока на него не ответят (sources 2.13).
- **Работает (слово автора 2026-11-17).** Автор включил Remote Control в сессии оркестратора в VS Code, видит её в приложении Claude и отвечает оттуда: ответы на AskUserQuestion и свободный текст доходят; голос — диктовка приложения в той же сессии (sources 2.13).
- **Голос.** «In Claude Cowork and Claude Code, dictation is available but voice mode isn't» (sources 2.13): в сессии Claude Code — диктовка, ответ — текстом, вслух ничего не читается.
- **Dev Containers CLI** `@devcontainers/cli` 0.90.0 — MIT, без зависимостей. `devcontainer up --workspace-folder` ищет `devcontainer.json` по этому пути и тот же путь отдаёт Docker для монтирования: CLI должен видеть клон по пути хоста (sources 9.5). Контейнер находят по меткам `devcontainer.local_folder` и `devcontainer.config_file` (sources 9.3); контейнер оркестратора видит только свою папку spec.
- **Claude Code 2.1.280** — во всех образах.

**Решено автором (2026-11-17)** — ответы на развилки планирования через оркестратора (AskUserQuestion), слово после макета доски [CRM5eBZPCNGXgPYLNmanUE](https://claude.ai/artifact/CRM5eBZPCNGXgPYLNmanUE) и ответ на В41; E15 идёт до E11, пока `app` идёт эпиком E5:
- **Канал автора вне VS Code — Remote Control сессии оркестратора.** Ответ на В41: «всё уже работает в claude. ничего дополнительно делать не нужно». Вопросы — AskUserQuestion, как сейчас, с push на телефон; ответ и свободный текст — из приложения Claude, текстом или диктовкой; голос — диктовка приложения. Своего голосового слоя, правил «голосом сразу / с экрана» и задачи «голос без рук» эпик не строит.
  - Отвергнуто: доска-артефакт с базой, которую оркестратор опрашивает (ответы 1 и 2 развилок), и голос без рук через голосовой режим чата или мессенджер, читаемый машиной (слово 6), — Remote Control уже даёт вопросы, ответы и push, а доска, база и голосовой слой — лишний код и лишняя проба; Slack и подобные — ещё один сторонний сервис со своим входом и условиями.
- **Вопрос без ответа ждёт.** Стоит только его узел, граф идёт; решений автора никто не принимает за него (R156 как есть).
- **Слово автора вне VS Code.** Свободный текст из приложения — новое поручение («сделай параллельно ещё …»), смена приоритета, остановка узла — слово автора в сессии: оркестратор берёт его в граф, в `epic.json`, с ответом, что сделано.
- **Контейнеры.** Пересборку после мержа, менявшего `.devcontainer/`, и создание нового контейнера делает оркестратор сам: CLI Dev Containers в стадии `orchestrator`, папка хоста из меток контейнера, только репозитории NovaTrail и только после своего мержа с зелёным CI. «Where» R156 пересматривается: сокет — root на хосте.

**Выяснилось при планировании** (2026-11-17):
- В пилоте PushNotification до телефона не доходил: Remote Control не был включён (sources 2.13).
- `devcontainer up` нужен путь клона хоста там, где CLI работает.

**Нужно от автора:** держать Remote Control включённым в сессии оркестратора и push в `/config`; для T192 — пересобрать контейнер оркестратора.

**Развёрнут 2026-11-17** задачей T190, исполнителем оркестратора (R156), по слову автора.

| Статус | ID | Задача | Кто | План | Зависит от |
|---|---|---|---|---|---|
| [x] | T190 | Эпик E15: открыть и спланировать | Claude | — | — |
| [x] | T191 | Решение E15: Remote Control — канал автора, поправки к R156 | Claude, проверяю я | — | T190 |
| [x] | T192 | CLI Dev Containers в стадии `orchestrator` | я + Claude | — | T191 |
| [ ] | T193 | Пересборка и создание контейнера оркестратором | Claude | да | T192 |
| [ ] | T194 | Итог эпика E15 | Claude | — | T193 |

- **В контейнере оркестратора** — T193: сессия, которую автор открывает там («Выполни задачу T193 из RUN.md»), как T169–T171 и T175, а не исполнитель spec — ей нужен Docker. T192 меняет стадию — автор пересобирает контейнер оркестратора. T191 и T194 — по документам, их может вести исполнитель spec.
- Оркестратор этого прогона берёт изменения E15 только в своей следующей сессии, после `just orchestrator sync`.
- T192 после T191: стадия и команды ссылаются на решение; T193 после T192: команды зовут CLI стадии.

## Эпик E15. Оркестратор вдали от VS Code

#### T193. Пересборка и создание контейнера оркестратором

- **Цель:** после мержа, менявшего `.devcontainer/`, оркестратор пересобирает контейнер репозитория сам и создаёт контейнер, которого у репозитория не было, — только репозитории NovaTrail и только после своего мержа с зелёным CI; вопрос автору «Rebuild Container» уходит.
- **Где:** контейнер оркестратора, настоящий Docker.
- **Решить при планировании:** как CLI видит клон по пути хоста — вспомогательный контейнер с папкой хоста по тому же пути или папка клонов в контейнере оркестратора (sources 9.3, 9.5); путь — из метки `devcontainer.local_folder` контейнера, а для нового — папка рядом со spec на хосте, и кто клонирует; открытое окно VS Code репозитория; поправка к «Where» R156.
- **Сделать:** команды `tools/orchestrator` — пересборка и создание — с тестами; [README оркестратора](tools/orchestrator/README.md), раздел 5, шаг 7, и его раздел 7 — вместо вопроса автору; правило 4 RUN.md — исключение «Сделай эпик E…» называет пересборку и создание контейнеров (R158); запуск в пересобранном контейнере продолжается, как сейчас.
- **Как проверить:** пересборка контейнера одного репозитория и создание контейнера временного клона; тесты `tools/` — `just coverage`; `just docs-check`; `/code-review high`.
- **Разделы:** R156; sources 9.3, 9.5; [README оркестратора](tools/orchestrator/README.md), разделы 5, 7; T191, T192.

#### T194. Итог эпика E15

- **Цель:** E15 в архиве; что дал эпик — измерено; что дальше — названо.
- **Сделать:** по RUN.md, Epics: архив `docs/plan/E15.md`, замер `just tokens-report --since 2026-11-17 --row` — строкой measurements 1.9; входящие по правилу 13; сколько ждали вопросы и пересборки в прогонах после E15 против measurements 1.13 — если такие прогоны были; Д258 — пересмотр по его условию.
- **Как проверить:** `just docs-check`.
- **Разделы:** RUN.md, Epics; measurements 1.9, 1.13; Д258.
