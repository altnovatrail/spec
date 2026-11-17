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

**Результат** — эпик по «Сделай эпик E…» идёт, пока автор вдали от окна VS Code оркестратора: вопросы, ответы и новые поручения ходят через телефон, с экрана или голосом, и доходят до исполнителей сами; контейнер после мержа, менявшего `.devcontainer/`, оркестратор пересобирает сам и создаёт тот, которого не было.
- Опытом известно, что из Remote Control, диктовки, голоса, базы артефакта и машины держит сессию оркестратора — T191.
- Решение и поправки к R156 записаны — T192.
- Доска вопросов: ответ нажатием с телефона, оркестратор сам читает базу и продолжает прогон — T193.
- Слово автора вне VS Code — поручение, приоритет, остановка узла — в граф и `epic.json`, с ответом — T194.
- Голос без рук — там, где он держится, с подтверждением прочитанного назад, — или записано, где его нет — T195.
- CLI Dev Containers в стадии `orchestrator` — T196.
- Пересборка и создание контейнера оркестратором — T197.
- Итог — T198.

**Основа** — на 2026-11-17; факты — sources 2.13, 2.14 и 9.5, пилот — measurements 1.13.
- **Пилот T171.** 4 из 9 вопросов ждали утра автора, В13 `skill-map` — с 06:08 до 14:23 UTC; большинство репозиториев дважды ждали пересборки руками, ночью — до утра.
- **Remote Control.** Сессию Claude Code, и в расширении VS Code (`/remote-control`), ведут из приложения Claude, вкладка Code, пока машина и процесс `claude` работают. Push на телефон — по `/config`: «Push when actions required» — разрешения и вопросы, «Push when Claude decides» — PushNotification; без Remote Control PushNotification — только уведомление на компьютере. AskUserQuestion держится открытым, пока на него не ответят (sources 2.13).
- **Голос.** «In Claude Cowork and Claude Code, dictation is available but voice mode isn't» (sources 2.13): в сессии Claude Code — диктовка, ответ — текстом, вслух ничего не читается. Голосовой режим — в обычном чате приложения, без рук по умолчанию, с подключёнными инструментами; в CarPlay — по вторичным источникам, и запустить его можно только нажатием на значок. Машина читает вслух и принимает ответ голосом у мессенджеров: CarPlay — приложения с SiriKit, Android Auto — уведомления `MessagingStyle`; показывает ли она push приложения Claude, не сказано нигде.
- **Артефакт.** Страница статична, без бэкенда, `fetch` — только к своему источнику. База артефакта названа только в журнале изменений Claude Code, 2.1.268–2.1.321: документы, личное поддерево зрителя `data/users/`, правила доступа, предел размера; пишет ли в неё скрипт страницы — не сказано. Комментарий, посланный Claude («Send to Claude»), приходит в сессию сам — у артефакта, которым поделились в организации; наблюдение кончается после нескольких часов без активности. В `-p` артефакты по умолчанию выключены, включаются ли — не сказано: доску публикует и читает интерактивная сессия оркестратора. Граф прогона `coord-2026-11-16` — страница, которую сессия публикует заново, а не база (sources 2.14).
- **Каналы.** Telegram, Discord, iMessage — плагины Claude Code: research preview, Bun, `claude --channels` в CLI, бот стороннего сервиса; iMessage — только macOS (sources 2.14).
- **Dev Containers CLI** `@devcontainers/cli` 0.90.0 — MIT, без зависимостей. `devcontainer up --workspace-folder` ищет `devcontainer.json` по этому пути и тот же путь отдаёт Docker для монтирования: CLI должен видеть клон по пути хоста (sources 9.5). Контейнер находят по меткам `devcontainer.local_folder` и `devcontainer.config_file` (sources 9.3); контейнер оркестратора видит только свою папку spec.
- **Claude Code 2.1.280** — во всех образах; правки базы артефакта 2.1.284 (что видит зритель, `data/users/`), 2.1.316 и 2.1.319 — позже. Версия стоит до задачи, которая проверит `--bare` (Д251).

**Решено автором (2026-11-17)** — ответы на развилки планирования через оркестратора (AskUserQuestion) и слово после макета доски [CRM5eBZPCNGXgPYLNmanUE](https://claude.ai/artifact/CRM5eBZPCNGXgPYLNmanUE); E15 идёт до E11, пока `app` идёт эпиком E5:
- **Канал вопросов** — доска-артефакт на claude.ai с общей базой: вопросы с вариантами, ответ нажатием, с телефона; PushNotification зовёт к ней.
  - Отвергнуто: Slack и подобные каналы уведомлений и ответов (RUN.md, T190, «Сделать») — ещё один сторонний сервис со своим входом и условиями, когда доска — на том же claude.ai, где граф прогона.
- **Ответ доходит сам.** Оркестратор опрашивает базу доски, пишет файл ответов и возобновляет прогон, без слова автора в сессии.
- **Вопрос без ответа ждёт.** Стоит только его узел, граф идёт; решений автора никто не принимает за него (R156 как есть).
- **Слово автора вне VS Code.** Кроме ответов, автор пишет оркестратору свободным текстом — новое поручение («сделай параллельно ещё …»), смену приоритета, остановку узла; оркестратор берёт его как слово автора в сессии: в граф, в `epic.json`, с ответом, что сделано.
- **Голос, за рулём, без рук** — и поручения, и ответы. Вопрос с вариантами читается вслух, ответ — голосом, с подтверждением прочитанного назад до записи; ничего, что требует смотреть на экран. Диктовка в поле доски — не без рук, только запасной путь. Где без рук нельзя — так и записать. Ответ, который меняет деньги, право или данные учеников, — В41.
- **Главный канал.** Если в сессии Claude Code через Remote Control есть диктовка, главный канал — чат текстом или диктовкой, доска — дополнение для вопросов списком (наблюдение автора: «Dictate» и голосовой режим в чате claude.ai). Документация говорит, что диктовка в Claude Code есть; на телефоне это проверяет T191 первым делом.
- **Контейнеры.** Пересборку после мержа, менявшего `.devcontainer/`, и создание нового контейнера делает оркестратор сам: CLI Dev Containers в стадии `orchestrator`, папка хоста из меток контейнера, только репозитории NovaTrail и только после своего мержа с зелёным CI. «Where» R156 пересматривается: сокет — root на хосте.

**Выяснилось при планировании** (2026-11-17):
- Без рук через Remote Control нельзя: голосового режима в Claude Code нет. Читать вслух может голосовой режим чата — через подключённый инструмент, который видит очередь, — или машина, читающая мессенджер канала. Оба держатся ли — проверяет T191.
- В пилоте PushNotification до телефона не доходил: Remote Control не был включён (sources 2.13).
- Опрос базы — инструментом Artifact в интерактивной сессии, не кодом `tools/orchestrator`; комментарий, посланный Claude, приходит сам — другой путь обратно, если комментарии есть у частного артефакта и наблюдение доживает до утра.
- `devcontainer up` нужен путь клона хоста там, где CLI работает.

**Нужно от автора:** ответить на В41; для T191 и T195 — телефон с приложением Claude под тем же аккаунтом, машина с CarPlay или Android Auto, если есть; для T196 — пересобрать контейнер оркестратора; сторонний сервис, если T195 выберет канал-мессенджер, — подтверждение по правилу 4.

**Развёрнут 2026-11-17** задачей T190, исполнителем оркестратора (R156), по слову автора.

| Статус | ID | Задача | Кто | План | Зависит от |
|---|---|---|---|---|---|
| [ ] | T190 | Эпик E15: открыть и спланировать | Claude | — | — |
| [ ] | T191 | Проба: Remote Control, диктовка, голос, база артефакта | я + Claude | — | T190 |
| [ ] | T192 | Решение E15 и поправки к R156 | Claude, проверяю я | — | T191 |
| [ ] | T193 | Доска вопросов | Claude | да | T192 |
| [ ] | T194 | Слово автора вне VS Code | Claude | — | T193 |
| [ ] | T195 | Голос без рук | я + Claude | да | T193 |
| [ ] | T196 | CLI Dev Containers в стадии `orchestrator` | я + Claude | — | T192 |
| [ ] | T197 | Пересборка и создание контейнера оркестратором | Claude | да | T196 |
| [ ] | T198 | Итог эпика E15 | Claude | — | T194, T195, T197 |

- **В контейнере оркестратора** — T191, T193, T194, T195 и T197: сессия, которую автор открывает там («Выполни задачу T191 из RUN.md»), как T169–T171 и T175, а не исполнитель spec — им нужны Remote Control, инструмент Artifact или Docker, которых у `claude -p` в контейнере документов нет. T196 меняет стадию — автор пересобирает контейнер оркестратора. T192 и T198 — по документам, их может вести исполнитель spec.
- Оркестратор этого прогона берёт изменения E15 только в своей следующей сессии, после `just orchestrator sync`.
- T191 — первая: слово автора «проверить первым делом».
- T192 после T191 и В41: решение записывает и то, что показала проба, и границу голоса.
- T193 и T196 после T192: обе — по решению.
- T194 и T195 после T193: слово и голос пишут туда же, куда доска; T195 — и после В41.
- T197 после T196: команды зовут CLI стадии.

## Эпик E15. Оркестратор вдали от VS Code

#### T190. Эпик E15 «Оркестратор вдали от VS Code»: открыть и спланировать

- **Цель:** E15 из таблицы 2 (`run/EPICS.md`) — текущий эпик spec: его описание и задачи в таблице 1 RUN.md, по правилам RUN.md, с решениями планирования; первая задача эпика готова к запуску.
- **Почему:** слово автора 2026-11-17: пока `app` идёт эпиком E5, spec берёт E15. R156 и поправки; measurements 1.13 (пилот T171: вопросы ждали утра автора, пересборки контейнеров — вручную).
- **Сделать:** по строке E15 таблицы 2: (1) вопросы оркестратора там, где автор вне окна VS Code — выбрать на планировании (доска вопросов артефактом claude.ai с базой ответов, Slack и т. п.: вход, условия сервиса в sources, возвращаются ли ответы в сессию сами), PushNotification остаётся вызовом; (2) пересборка и создание контейнера оркестратором после мержа, менявшего `.devcontainer/`, — что для этого нужно (CLI Dev Containers в стадии `orchestrator`, папки клонов, пути хоста) и пересмотр «Where» R156 (сокет — root на хосте). Решения, где нужен автор, — вопросом с вариантами и рекомендацией (status waiting). Задачи — на одно ревью каждая.
- **Важно:** оркестратор этого прогона работает из своего клона spec и не берёт изменения E15 до своей следующей сессии (`just orchestrator sync`); задачи, которым нужен Docker (как T169–T171, T175), — помечены, их выполняет сессия в контейнере оркестратора, а не исполнитель spec.
- **Как проверить:** `just docs-check`; в RUN.md — E15 текущий, его задачи с «Зависит от».
- **Разделы:** таблица 2, E15; R156; measurements 1.13; Д253–Д258.
- **Ответы автора на развилки планирования (2026-11-17, через оркестратора, AskUserQuestion):** (1) канал вопросов — доска-артефакт на claude.ai с общей базой (как граф прогона): вопросы с вариантами, ответ — нажатием, с телефона; PushNotification зовёт к ней; (2) ответ доходит до исполнителя сам: оркестратор опрашивает базу доски, пишет файл ответов и возобновляет прогон, без слова автора в сессии; (3) пересборку контейнера после мержа, менявшего `.devcontainer/`, и создание нового делает оркестратор сам — CLI Dev Containers в стадии orchestrator, папка хоста из меток контейнера, только репозитории NovaTrail и только после своего мержа с зелёным CI; пересмотр «Where» R156; (4) вопрос без ответа — ждать: стоит только его узел, граф идёт, решений автора никто не принимает за него (R156 как есть). Записать их решениями планирования без повторного вопроса.
- **Ещё слово автора 2026-11-17 (после макета https://claude.ai/artifact/CRM5eBZPCNGXgPYLNmanUE):** (5) кроме ответов на вопросы, автор пишет оркестратору свободным текстом — новое поручение («сделай параллельно ещё …»), смену приоритета, остановку узла; оркестратор берёт его как слово автора в сессии: в граф, в epic.json, с ответом, что сделано; (6) **голосом, за рулём, без рук**: и поручения, и ответы на вопросы; вопрос с вариантами читается вслух, ответ — голосом, с подтверждением прочитанного назад до записи. На планировании — варианты по первоисточникам, с датой, в sources: голос в приложении Claude на телефоне с сессией через Remote Control Claude Code; голосовой ассистент телефона или машины (CarPlay / Android Auto), пишущий в базу доски; диктовка в поле доски — не без рук, только как запасной путь. Что из этого держит сессию оркестратора и доходит до неё само — проверить; где нельзя без рук — так и записать. Безопасность за рулём: ничего, что требует смотреть на экран; ответ, который меняет деньги, право или данные учеников, голосом не принимается без подтверждения дома — вопрос к автору на планировании.
- **Что уже выяснено о голосе (2026-11-17, документация Anthropic, перечитать в sources с датой):** Remote Control — сессию Claude Code можно вести из приложения Claude на iOS/Android, она идёт, пока машина включена; с Remote Control Claude шлёт push на телефон, «когда нужна decision» (code.claude.com/docs/en/remote-control.md, mobile.md); «answer Claude's questions» из приложения — сказано, но какие виды подсказок (AskUserQuestion, разрешения) — нет; **голосовой ввод и чтение вслух в этом режиме документация не упоминает**. Голос внутри артефакта — вероятно, нет: страница артефакта — фрейм другого источника, микрофон и speechSynthesis без разрешения родителя недоступны (не в документации Anthropic — проверить опытом). Значит, «без рук» — вопрос к планированию: проба Remote Control с голосом приложения Claude и с голосом ОС (CarPlay / Android Auto: чтение уведомлений и ответ голосом); если ничего не держит без рук — так и записать, а доска остаётся для ответов с экрана.
- **Наблюдение автора 2026-11-17:** в поле ввода чата claude.ai есть «Dictate» (диктовка) и кнопка голосового режима. Это обычный чат; есть ли то же в сессии Claude Code, открытой через Remote Control (приложение Claude, раздел Code), — проверить первым делом. Если есть — главный канал: чат текстом или диктовкой; доска — дополнение для вопросов списком.

#### T191. Проба: Remote Control, диктовка, голос, база артефакта

- **Цель:** опытом известно, что из каналов вне VS Code держит сессию оркестратора и доходит до неё само; первым — диктовка в сессии Claude Code через Remote Control (слово автора 2026-11-17).
- **Где:** контейнер оркестратора, интерактивная сессия в VS Code: Remote Control, инструмент Artifact и push на телефон есть только у неё (sources 2.13, 2.14).
- **Сделать:**
  - Remote Control: `/remote-control` в сессии; с телефона, вкладка Code, — есть ли диктовка и голосовой режим, диктовка по-русски; ответ на AskUserQuestion с телефона; push по «Push when actions required» и PushNotification по «Push when Claude decides» при заблокированном телефоне; что остаётся после сжатия контекста сессии.
  - Машина, если есть: показывает ли CarPlay или Android Auto push приложения Claude, читает ли вслух, принимает ли ответ голосом. Голосовой режим чата Claude: какой подключённый инструмент автора мог бы читать очередь и писать ответ туда, где его видит сессия, и читает ли он вопрос вслух.
  - База артефакта: пробная страница с базой; запись нажатием с телефона; чтение сессией инструментом Artifact и его задержка; кто видит запись зрителя; комментарий, посланный Claude, на своём частном артефакте и доживает ли наблюдение до утра; микрофон и `speechSynthesis` в странице на телефоне.
  - Версия: проба идёт на Claude Code 2.1.280; что из журнала изменений после неё нужно доске (2.1.284, 2.1.316, 2.1.319) и нужен ли подъём версии — с проверкой `--bare` по Д251 — записать.
  - Увиденное — пунктами «Seen 2026-11-…» в sources 2.13 и 2.14, прежний текст не правится.
- **Не делать:** бот Telegram и другие сторонние сервисы — только после подтверждения автора по правилу 4; на странице — ничего, кроме синтетических вопросов.
- **Мой шаг:** телефон с приложением Claude под тем же аккаунтом; машина, если есть.
- **Как проверить:** `just docs-check`.
- **Разделы:** sources 2.13, 2.14; R156; Д251; таблица 1, E15.

#### T192. Решение E15 и поправки к R156

- **Цель:** решения автора 2026-11-17, ответ на В41 и то, что показала проба T191, записаны в журнале; R156 говорит, как вопросы и слово автора ходят вне VS Code и кто пересобирает контейнеры.
- **Сделать:**
  - Новое решение — всё из «Решено автором» E15 и ответ на В41, с «Почему» и отвергнутым: главный канал, доска и её база, ответ, доходящий сам, ожидание без ответа, слово автора, голос и его граница, контейнеры.
  - Поправки той же датой к R156: «Questions» — каналы вне VS Code, рядом с AskUserQuestion; «Where» — CLI Dev Containers и то, что он видит на хосте, только репозитории NovaTrail и только после своего мержа с зелёным CI; отвергнутая «доска — позже» — её новая редакция; Remote Control для исполнителей остаётся отвергнутым, для канала автора — принят. И к поправке T170 — «a pull request that changed `.devcontainer/` waits for the author».
  - CLAUDE.md, Environment, строка оркестратора — если меняется её смысл.
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** R156; sources 2.13, 2.14, 9.3, 9.5; measurements 1.13; В41; T191.

#### T193. Доска вопросов

- **Цель:** вопросы очереди — на доске-артефакте с базой; автор отвечает нажатием с телефона, вариантом или своими словами; оркестратор сам читает ответ из базы, пишет файл ответов и возобновляет прогон, без слова в сессии (R156 по T192).
- **Где:** контейнер оркестратора: инструмент Artifact — только у интерактивной сессии (sources 2.14).
- **Сделать:**
  - Страница доски в `tools/orchestrator/` — вопросы с вариантами, рекомендованный первым, ответ нажатием или текстом, состояние вопроса — и строение её базы.
  - Код `tools/orchestrator` с тестами: `questions.json` → документы доски, ответ из базы → файл ответов по [README оркестратора](tools/orchestrator/README.md), раздел 6.
  - [README оркестратора](tools/orchestrator/README.md), раздел 6: публикация доски, PushNotification со ссылкой, опрос, файл ответов, `resume`; AskUserQuestion — когда автор у окна; вопрос без ответа ждёт.
- **Решить при планировании:** опрос по таймеру сессии или комментарий «Send to Claude»; один ответ не записывается дважды; ответ с доски и в окне на один вопрос; база недоступна; доска видна только автору.
- **Как проверить:** тесты `tools/` — `just coverage`; учебный граф в двух контейнерах: вопрос исполнителя → доска → ответ с телефона → `resume` без слова в сессии; `just docs-check`; `/code-review high`.
- **Разделы:** R156; [README оркестратора](tools/orchestrator/README.md), раздел 6; sources 2.14; T191, T192.

#### T194. Слово автора вне VS Code

- **Цель:** свободный текст автора с доски или из чата Remote Control — новое поручение, смена приоритета, остановка узла — оркестратор берёт как слово автора в сессии: в граф и `epic.json`, с ответом, что сделано.
- **Где:** контейнер оркестратора.
- **Сделать:**
  - Поле свободного текста на доске и его документ в базе; ответ оркестратора — там же.
  - [README оркестратора](tools/orchestrator/README.md), «Сделай эпик E…»: слово автора как событие графа — новый узел с текстом по его разделу 3, порядок узлов, `stop` узла по его разделу 7; что слово не даёт — шаг вне репозиториев, деньги — вопрос по правилу 4.
- **Как проверить:** учебный граф: поручение с телефона даёт узел, остановка — `stop`, ответ виден на доске; тесты `tools/`, если менялся код; `just docs-check`; `/code-review high`.
- **Разделы:** R156; [README оркестратора](tools/orchestrator/README.md), разделы 2–4, 6, 7; T193.

#### T195. Голос без рук

- **Цель:** поручения и ответы голосом за рулём — путём, который держится по пробе T191: вопрос читается вслух, ответ — голосом, прочитанное повторяется назад до записи, ничего не требует смотреть на экран; где без рук нельзя — так и записано, а доска остаётся для ответов с экрана.
- **Где:** контейнер оркестратора и машина автора.
- **Решить при планировании:** путь по T191 — голосовой режим чата Claude с инструментом, который пишет туда, где ответ видит оркестратор; канал-мессенджер Claude Code, который машина читает вслух (Telegram: бот, условия сервиса в sources, Bun в стадии `orchestrator`, `claude --channels` — сессия оркестратора в CLI, research preview); или ни один; граница по В41.
- **Сделать:** выбранный путь; [README оркестратора](tools/orchestrator/README.md), раздел 6; решение или поправка к нему, если путь меняет T192.
- **Мой шаг:** проба в машине; подтверждение стороннего сервиса по правилу 4.
- **Как проверить:** в машине: вопрос прочитан вслух, ответ голосом, подтверждение назад, ответ дошёл до исполнителя; `just docs-check`; `/code-review high`.
- **Разделы:** sources 2.13, 2.14; R156; В41; T191, T193.

#### T196. CLI Dev Containers в стадии `orchestrator`

- **Цель:** в стадии `orchestrator` — `@devcontainers/cli` точной версии, с проверкой целостности; CI собирает стадию.
- **Сделать:** `ARG` версии в `.devcontainer/Dockerfile`, установка из npm без скриптов и проверка архива (R34); лицензия MIT — категория A (R12), без исключения; `orchestrator.yml` собирает стадию; запись sources 9.5 — если версия другая.
- **Мой шаг:** пересобрать контейнер оркестратора.
- **Как проверить:** `devcontainer --version` в пересобранном контейнере; CI `orchestrator.yml`; проверки правила ci; `just docs-check`.
- **Разделы:** R12, R34, R156; sources 9.5; `.claude/rules/ci.md`; T168.

#### T197. Пересборка и создание контейнера оркестратором

- **Цель:** после мержа, менявшего `.devcontainer/`, оркестратор пересобирает контейнер репозитория сам и создаёт контейнер, которого у репозитория не было, — только репозитории NovaTrail и только после своего мержа с зелёным CI; вопрос автору «Rebuild Container» уходит.
- **Где:** контейнер оркестратора, настоящий Docker.
- **Решить при планировании:** как CLI видит клон по пути хоста — вспомогательный контейнер с папкой хоста по тому же пути или папка клонов в контейнере оркестратора (sources 9.3, 9.5); путь — из метки `devcontainer.local_folder` контейнера, а для нового — папка рядом со spec на хосте, и кто клонирует; открытое окно VS Code репозитория; поправка к «Where» R156.
- **Сделать:** команды `tools/orchestrator` — пересборка и создание — с тестами; [README оркестратора](tools/orchestrator/README.md), раздел 5, шаг 7, и его раздел 7 — вместо вопроса автору; запуск в пересобранном контейнере продолжается, как сейчас.
- **Как проверить:** пересборка контейнера одного репозитория и создание контейнера временного клона; тесты `tools/` — `just coverage`; `just docs-check`; `/code-review high`.
- **Разделы:** R156; sources 9.3, 9.5; [README оркестратора](tools/orchestrator/README.md), разделы 5, 7; T196.

#### T198. Итог эпика E15

- **Цель:** E15 в архиве; что дал эпик — измерено; что дальше — названо.
- **Сделать:** по RUN.md, Epics: архив `docs/plan/E15.md`, замер `just tokens-report --since 2026-11-17 --row` — строкой measurements 1.9; входящие по правилу 13; сколько ждали вопросы и пересборки в прогонах после E15 против measurements 1.13 — если такие прогоны были; Д258 — пересмотр по его условию.
- **Как проверить:** `just docs-check`.
- **Разделы:** RUN.md, Epics; measurements 1.9, 1.13; Д258.
