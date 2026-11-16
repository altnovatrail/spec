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

## Table 1. Current epic — E14. Оркестратор: эпик по репозиториям сам

**Результат** — автор говорит в одной сессии «Сделай эпик E…», и оркестратор доводит эпик до конца без задач, запущенных руками: исполнители идут параллельно в контейнерах своих репозиториев, вопросы всех исполнителей стекаются к оркестратору, pull request мержатся после зелёных проверок.
- Решение и правила прогона записаны: журнал, RULES.md, правила RUN.md и COORDINATION.md, шаблон репозитория, записи источников — T167.
- У spec есть вторая конфигурация devcontainer с Docker хоста — T168.
- `tools/orchestrator` запускает задачу в контейнере её репозитория и продолжает её с ответами — T169.
- Процедура «Сделай эпик E…»: граф, волны, переход на последний тег spec первым, вопросы, мерж, лимиты, отчёт — T170.
- Пилот на строках 4.17 и 4.18 COORDINATION.md прошёл, и его стоимость измерена — T171.
- Итог и что дальше — T172.

**Основа** — на 2026-11-15; факты о Claude Code и подписке — по документации и страницам поддержки Anthropic, записи `docs/sources.md` делает T167.
- **Учётные данные общие.** Контейнер каждого репозитория монтирует тома `novatrail-claude` в `~/.claude` и `novatrail-gh` в `~/.config/gh` (`.devcontainer/devcontainer.json`): один вход в Claude и в gh служит всем, а транскрипты исполнителей лежат там, где их читает `just tokens-report --project=-workspaces-<repo>` (measurements 1.9).
- **Claude Code 2.1.280** — в образе каждого репозитория. Headless-запуск: `-p`, `--output-format stream-json --verbose`, `--resume <session_id>`, `--permission-mode bypassPermissions`, `--model`, `--effort high`, `--json-schema` — ответ в `structured_output`, `--max-budget-usd`, `--append-system-prompt`. Итог запуска несёт `session_id`, `total_cost_usd`, `modelUsage`, `subtype`; лимит — событие `rate_limit_event` со `status: rejected` и `resetsAt`. Хуки репозитория в `-p` работают; AskUserQuestion в `-p` нет.
- **Лимит подписки** — один на все сессии аккаунта, окно в 5 часов и недельный потолок; предела на число одновременных сессий в документации нет.
- **Отправка коммитов.** git контейнера отправляет через помощника VS Code, а при `docker exec` без открытого окна его нет — исполнителю нужен `gh auth git-credential`.
- **Мерж.** У `sim` и `learner-model` в ruleset `main` одобрений нужно 0, метод — merge, проверки строгие: ветку перед мержем обновляют.
- **Пилот.** `learner-model` — на `spec` v0.16.3, `sim` — на v0.17.3; переход `learner-model` приносит и R153–R155 (Д250). Текущий эпик `learner-model` E7 «Третий круг кандидатов модели» нацелен на круг по забыванию и суд `model-3`, который `sim` снял (R59 sim). Кандидат входит в суд `sim` по коммиту, `CANDIDATE_LEARNER_MODEL`; порядок выпуска — R103.
- **Чего нет.** Docker CLI и сокета в контейнере spec; нигде не записано, где клоны лежат на хосте, — контейнер находят по метке `devcontainer.local_folder` или по имени.

**Решено автором (2026-11-15)** при обсуждении эпика и при его планировании:
- **Где.** В spec — вторая конфигурация `.devcontainer/orchestrator/devcontainer.json` с сокетом Docker хоста; контейнер spec для задач по документам остаётся без него. Код — `tools/orchestrator/`.
  - Отвергнуто: сокет в обычный контейнер spec; отдельный репозиторий — поправка к R18, свой CI и теги, и оркестратор читал бы план spec в обход своего тега.
- **Исполнитель.** Задача — один запуск `claude -p "Выполни задачу Txx из RUN.md"` в контейнере её репозитория через `docker exec`; свежий запуск и есть `/clear` (R143). У исполнителя все права. Остановленный контейнер оркестратор стартует сам.
  - Отвергнуто: Remote Control и сообщения между сессиями — `/clear` в чужой сессии не набрать, конца задачи не видно; облачные сессии — без devcontainer; все репозитории в одном контейнере — у них разные тулчейны; Agent SDK — его лицензия — Commercial Terms Anthropic, а CLI уже стоит в каждом образе.
- **Мерж.** Каждый pull request оркестратор мержит сам, когда зелёные CI, `codecov/patch` и SonarCloud, без ревью автора.
  - Отвергнуто: ревью юридических текстов, DPIA и журнала решений; ревью каждого PR.
- **Вопросы.** Исполнитель не решает за автора: пишет вопрос в свою таблицу 3 и возвращает его оркестратору. Оркестратор собирает вопросы всех в одну очередь, ставит на паузу только ту часть графа, что их ждёт, задаёт их автору в своей сессии VS Code по одному, с вариантами и рекомендацией, и продолжает ту же сессию исполнителя с ответами. Мелкий технический вопрос внутри одного репозитория решает сам и называет в отчёте.
  - Отвергнуто: все вопросы — к автору; сам — всё, кроме журнала решений. Доска вопросов на claude.ai — позже, T172.
- **Планы.** Планы исполнителей и планы эпиков в репозиториях автор не утверждает: к нему идут только вопросы, а план — в отчёт и в описание PR.
  - Отвергнуто: утверждать каждый план; утверждать планы эпиков.
- **Последний тег spec — первым.** Развёртывая эпик, оркестратор первой волной переводит каждый репозиторий эпика на последний тег spec, если тот не на нём.
- **Параллельность** — без предела. Лимит подписки — пауза волны до сброса и продолжение прерванных запусков; докупку сверх подписки оркестратор не включает. Потолок стоимости задачи — по measurements 1, сверх — пауза и вопрос автору. Две попытки в той же сессии при красном CI или упавшем запуске, затем — к автору.
  - Отвергнуто: до трёх исполнителей; по одному.
- **Модель.** По умолчанию каждый запуск — и исполнителей, и самого оркестратора — Opus с effort high; иная модель или effort — по слову автора или по замеру.
- **Строка 4.17.** Круг справедливости — новый текущий эпик `learner-model`; T52–T55 его E7 — `[?]` по R59 sim, и E7 уходит в архив с T51.
  - Отвергнуто: переписать E7 под круг справедливости; оставить выбор сессии `learner-model`.

**Нужно от автора:** одобрить решение и поправки T167; открыть spec в конфигурации оркестратора — сокет Docker даёт контейнеру root на хосте (T168); держать контейнеры `learner-model` и `sim` созданными и не работать в их окнах VS Code, пока идёт пилот (T171); сказать, включена ли на подписке докупка; отвечать на вопросы оркестратора.

**Развёрнут в режиме планирования 2026-11-15** по слову автора («теперь планируй эпик E14»).

| Статус | ID | Задача | Кто | План | Зависит от |
|---|---|---|---|---|---|
| [x] | T167 | Решение об оркестраторе и правила прогона | Claude, проверяю я | — | — |
| [x] | T168 | Контейнер оркестратора | я + Claude | — | T167 |
| [x] | T169 | `tools/orchestrator`: запуск исполнителя | Claude | да | T168 |
| [x] | T170 | Процедура «Сделай эпик E…» | Claude, проверяю я | — | T169 |
| [x] | T171 | Пилот: строки 4.17 и 4.18 | я + Claude | — | T170 |
| [ ] | T172 | Итог эпика E14 | Claude | — | T171 |

- T168 идёт после T167: стадия и конфигурация ссылаются на решение.
- T169 идёт после T168: запуск проверяют в контейнере оркестратора на настоящем Docker.
- T170 идёт после T169: процедура зовёт его команды.
- T171 идёт после T170, когда T167–T170 смержены: релиз spec выходит сам (R31), и волна 0 пилота переводит репозитории на тег с ними.

## Эпик E14. Оркестратор

#### T172. Итог эпика E14

- **Цель:** эпик в архиве, его стоимость в measurements 1.9, отложенное записано.
- **Сделать:** архив `docs/plan/E14.md` (Epics); строка `just tokens-report --since 2026-11-15 --row`; в `run/EPICS.md` или `run/DEBT.md` — доска вопросов на claude.ai, `devcontainer up` для контейнеров, которых ещё нет, детерминированный цикл, если сессии оркестратора мало, — каждое с тем, что пилот о нём показал; куда идут Д253–Д256 — правки `tools/orchestrator` до следующего «Сделай эпик E…»: задачей вне эпика или в эпик `run/EPICS.md`; разбор входящих (правило 13).
- **Как проверить:** `just docs-check`.
- **Разделы:** R145, решение T167; measurements 1.9.
