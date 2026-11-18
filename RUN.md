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
   - Exception, no confirmation: «Сделай эпик E…» (R156) — running the epic's tasks in their repositories' containers, the executors' pushes and pull requests, their merge on green checks, and rebuilding and creating the containers of NovaTrail's repositories (R158). Whatever else a task does outside its repository still needs confirmation, a question in the orchestrator's queue; usage bought beyond the subscription, never.
   - Exception, no confirmation: the task's checks by R146 — browser: Playwright in the devcontainer, custom-token sign-in on the dev project; AI: the `tutor` stub in `api` dev mode. A real AI call only where the task checks the model's words: dev key under the author's spend limit, within the task's ceiling, or with confirmation where it has none; «Сделано» names the provider, the calls and the cost. Nothing on devices: what only a device shows stays debt of the repository of those screens.
5. Facts on AI providers, laws, prices and other platforms — from the primary source, as a record of `docs/sources.md` (RULES.md, How we work).
6. End with green checks of the parts changed — their rule `.claude/rules/<part>.md` (CLAUDE.md, Environment) — and always `just docs-check`. Then `/code-review high`, one round: fix the findings, do not rerun. A small change may skip the review even if «Как проверить» names it.
7. Do not commit — here or in repositories an epic creates — unless the task or the author's word says so: the author commits after review. In an orchestrator's run the executor commits, pushes and opens the pull request by `tools/orchestrator/executor.md`, and the orchestrator merges it (R156).
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
- **A done epic** goes to `docs/plan/<epic>.md` (R59 canvas-api): bodies and gist sentences are there already (rule 9); move its description and table of tasks verbatim; questions and debt stay in `run/`; measure — `just tokens-report --since <first day of the epic> --row` — as a row of measurements 1.9 (R145); table 1 names it as the last done epic. Never read an archive whole: take the task cited.
- **DPIA** ([docs/dpia.md](docs/dpia.md), R129): a task that changes what it rests on — a kind of data or retention, a provider or processor, an AI capability or route, opening an age, a country or a feature to children — reviews it; its «Сделано» names the review, the DPIA's log the version. Also before the beta, before the public launch and at least yearly.
- **Token savings** (R145): the limits of `docs-check` — [tools/docs-check/budgets.json](tools/docs-check/budgets.json), a raise shows in review; measure at an epic's archive and monthly (`just inbox` reminds, rule 13); a task of analysis goes to `run/TASKS.md` by the threshold of R145, and its planning decides whether it needs an epic; baselines, dates, last analysis — measurements 1.9.

## Table 1. Current epic — E16. Тексты без истории

**Результат** — одно правило стиля документов и комментариев кода во всех репозиториях NovaTrail, по ответам автора на В60–В63 (T200; measurements 1.14.5, «The rule»): текущее состояние — там, где оно задаётся, документ называет файл, а не версию, и хроник не ведёт; решение — действующий текст с «почему» и отвергнутым, изменение переписывает запись на месте; комментарий — только «почему», ограничение, ловушка или контракт, номер решения — якорем `(R25)` в конце; один факт — одно место. Выгода измерена до и после.
- Правило решением, поправки к RULES.md и R154 — T203; R143 и R145 переписаны по нему — T204.
- `docs-check`: запись до 12 КБ, `R…` в комментариях кода — T205; строки COORDINATION.md для 12 других репозиториев — T206.
- `tokens-report --classes` — T207.
- Документы `spec`: журнал версий `dpia 1` — T196, остальные — T208–T212; комментарии кода — T213–T217.
- Итог и замер после — T218.

**Основа** — на 2026-11-18; анализ — measurements 1.14, время задач исполнителей — measurements 1.15.
- Документы — 28% контекста сессии исполнителя и 23% её вывода; правило экономит ≈ 2–3 минуты и $0.56–0.92 сессии из 28.8 минуты и $5.51 (measurements 1.14.5).
- Журнал `spec` — 1.7 МБ, 159 записей: 44 больше 12 КБ, 20 больше 20 КБ; самая длинная — R76, 39 КБ; R143 — 28 КБ, R145 — 10 КБ. `RULES.md` — 14.4 КБ при пределе 15.
- Комментарии `tools/` — 5.7 тыс. строк, 470 КБ: `R…` — в 380 строках, `T…` — в 95; `.github/`, justfile, `.devcontainer/`, `spec.go` и `repo-template/` — ещё 106 КБ. Код `contracts/` и `types/` сгенерирован из `.proto` и схем.
- `docs/architecture.md` — 183 КБ, из них architecture 3 — 150; `docs/privacy.md` — 152, `docs/concepts.md` — 164, из них словарь concepts 15 — 79.
- Выводы T201: R159 и оговорка RULES.md, How we work, — исполнитель ждёт долгий прогон в переднем плане — уже на `main`; другие репозитории берут их с тегом E16 (T206). Д273 — локальные проверки, не тексты: остаётся строкой таблицы 4.

**Решено автором (2026-11-18)** — ответы на В60–В65 (T200), все по рекомендациям, и на развилки планирования через оркестратора (AskUserQuestion), записаны без повторного вопроса:
- **Порядок.** E16 — раньше E11, сразу после T201: текущий эпик, его строка ушла из `run/EPICS.md`, E11 там снова первая.
- **Другие репозитории.** Задачу E16 каждого из 12 других репозиториев оркестратор запускает сам — как только `spec` выпустит тег с правилом и проверками (после T205) и в этом репозитории закончится текущая задача; pull request мержит оркестратор после зелёных проверок (R156).
- **Правило** — В60–В63: текущее состояние — в `deploy/*.json`, подмодуле, `package.json`, `ARG` Dockerfile и релизах; изменение решения переписывает запись на месте и записи, которые оно меняет, git хранит старый текст, коммит — почему; переход на тег — коммит и строка README; старые записи переписываются, когда их касается задача; комментарий — без пересказа, истории, номеров задач и разделов, `docs-check-repo` проверяет, что номер называет запись; «Сделано» — строка с pull request, открытое — строки таблиц 3 и 4, отчёт автору остаётся.
- **T196** входит в E16 (В64): журнал версий `dpia 1` — класс (а) measurements 1.14.4.

**Решено при планировании (2026-11-18)** — технический выбор исполнителя, в рамках ответов:
- **Старые длинные записи.** Запись переписывается, когда её касается задача (В61), поэтому предел 12 КБ даёт каждой записи `spec` длиннее него свой предел в `entries` (R145), по её размеру; задача, переписавшая запись, снимает его. Отвергнуто: переписать в E16 весь журнал — 1.7 МБ одного `spec`, против В61.
- **Другой репозиторий не краснеет раньше своей задачи.** Предел 12 КБ и проверку `R…` в комментариях в репозитории включает его задача E16, ключом его `docs-budgets.json`, как R145 включал бюджеты файлом; блок `repository` держит 40 КБ, пока строки T206 не сделаны (T218), а шаблон несёт новое с начала. Иначе переход на тег по другой строке — 5.19 `canvas` — покраснел бы.
- **Вне E16** — тексты, которые правило не меняет: `docs/sources.md` и `docs/measurements.md` — записи с датой по своей природе; нормативные тексты для авторов (R42) — `format/`, `contracts/`, `admission/`, `deployment/`, `legal/`, `consent-age/`, `export/` —, их версии — содержание (R44); `.proto` и описания схем, из которых сгенерирован код; архивы `docs/plan/`. Задача, которая их меняет, пишет по правилу.
- **Замер.** «До» — measurements 1.14, окно 2026-11-16 — 2026-11-18T04:33; «после» — те же команды measurements 1.14.6 и `tokens-report --classes`, в T218. Строка E16 measurements 1.9 — с мержа T201, 2026-11-18T07:06:43Z: T200 и T201 — задачи E15, и их сессии — в окне «до».

**Развёрнут 2026-11-18** задачей T202, исполнителем оркестратора (R156), по слову автора.

| Статус | ID | Задача | Кто | План | Зависит от |
|---|---|---|---|---|---|
| [x] | T202 | Эпик E16: открыть и спланировать | Claude | — | — |
| [x] | T203 | Решение E16: тексты без истории; RULES.md, R154 | Claude | — | T202 |
| [ ] | T204 | R143 и R145 — переписать на месте | Claude | — | T203 |
| [ ] | T205 | `docs-check`: запись до 12 КБ, `R…` в комментариях кода | Claude | — | T204 |
| [ ] | T206 | Строки COORDINATION.md: правило E16 в 12 репозиториях | Claude | — | T205 |
| [ ] | T207 | `tokens-report --classes`; Д272 | Claude | — | T202 |
| [ ] | T196 | Анализ токенов по порогу R145: третье повышение бюджета | Claude | — | T203 |
| [ ] | T208 | Документы `spec`: product, repositories, README, CLAUDE.md, правила частей | Claude | — | T203 |
| [ ] | T209 | Документы `spec`: architecture 1, 2, 3.1–3.6 | Claude | — | T203 |
| [ ] | T210 | Документы `spec`: architecture 3.7–8 | Claude | — | T209 |
| [ ] | T211 | Документы `spec`: privacy | Claude | — | T203 |
| [ ] | T212 | Документы `spec`: concepts | Claude | — | T203 |
| [ ] | T213 | Комментарии кода: `tools/format-check/`, `tools/types/` | Claude | — | T205 |
| [ ] | T214 | Комментарии кода: `tools/contracts/`, `tools/release/`, `tools/docs-check/` | Claude | — | T205 |
| [ ] | T215 | Комментарии кода: `tools/orchestrator/` с README и `executor.md`, `tools/new-repo/`, `tools/legal/`, `tools/tokens/`, `tools/translation/` | Claude | — | T205 |
| [ ] | T216 | Комментарии кода: остальное `tools/` | Claude | — | T205 |
| [ ] | T217 | Комментарии CI и окружения: `.github/`, justfile, `.devcontainer/`, `spec.go`, `repo-template/` | Claude | — | T205 |
| [ ] | T218 | Итог эпика E16: замер после, архив | Claude | — | T196, T206–T217; строки T206 в COORDINATION.md |

- Порядок в `spec`: T203–T206 первыми — тег с правилом и проверками выходит раньше, и другие репозитории идут параллельно с документами `spec`. T207 зависит только от T202.
- T218 ждёт и строк COORDINATION.md, которые пишет T206: замер после и умолчания блока `repository` — когда все 12 репозиториев перешли на тег. Строка `[?]` среди них — умолчания строкой таблицы 4.
- Ни одной задаче E16 не нужен Docker: все их ведёт исполнитель `spec`.

## Эпик E16. Тексты без истории

#### T204. R143 и R145 — переписать на месте

- **Цель:** R143 (28 КБ) и R145 — каждая свой действующий текст, без поправок, по решению T203; правило 2026-11-12 «запись и её поправки — её текст в силе» и «an entry is never rewritten, so a long one cannot shrink» (поправка 2026-11-15 к R145) заменены им.
- **Сделать:**
  - Переписать обе записи на месте: что действует — текстом записи, «Почему» и отвергнутое — сохранить, отменённое — убрать (git хранит).
  - Таблица «поправка → место в новом тексте» — в описании pull request: ревью сверяет по ней, что ничего не потеряно.
  - Ссылки `spec` на поправки этих записей (`grep -rn 'amendment to R14[35]'`) — на запись; ссылки других репозиториев правит их задача E16 (T206).
  - Размер — до 12 КБ каждая; что не вошло — назвать в «Сделано».
- **Как проверить:** `just docs-check`; `/code-review high` с таблицей соответствия.
- **Разделы:** R143, R145; T203; measurements 1.14.5, «Risks».

#### T205. `docs-check`: запись до 12 КБ, `R…` в комментариях кода

- **Цель:** `docs-check` держит правило T203: запись журнала — до 12 КБ, а каждое `R…` в комментарии кода называет запись.
- **Сделать:**
  - `tools/docs-check/budgets.json`, блок `spec`: `entry` 40 → 12; записи длиннее — свой предел в `entries`, по размеру с округлением вверх до КБ (на 2026-11-18 — 44 из 159).
  - Проверка: `R…` в комментарии `.go`, `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.sh`, а `#` — и YAML, justfile и Dockerfile, кроме сгенерированного кода, называет запись своего журнала; `R… spec` в другом репозитории — журнала подмодуля; с суффиксом другого репозитория или MathTrail — не проверяется; пример в коде — не ссылка (R32).
  - `docs-check-repo`: то же, включается ключом `docs-budgets.json` репозитория — вместе с `entry` 12; блок `repository` держит 40 до T218; шаблон `repo-template/files/docs-budgets.json` — с ключом и 12.
  - Номера в комментариях `spec`, которых нет в журнале, — поправить.
  - R32 и R145 — на месте, по T203; CLAUDE.md, Environment, и `.claude/rules/tools.md` — что проверяет `docs-check`.
- **Как проверить:** тесты `tools/` — `just coverage`; проверки правила tools; `just new-repo-test`; `just docs-check`; `/code-review high`.
- **Разделы:** R32, R145; measurements 1.14.5; T203, T204; `.claude/rules/tools.md`.

#### T206. Строки COORDINATION.md: правило E16 в 12 репозиториях

- **Цель:** в «Порядке» — по строке на каждый из 12 других репозиториев, из одного текста задачи: переход на тег `spec` не старше T205 и правило T203 в своих документах и комментариях; оркестратор запускает каждую сам (Решено автором, таблица 1).
- **Сделать:**
  - Один текст задачи по правилу 6 COORDINATION.md — «Цель», «Сделать», «Как проверить», «Разделы», в «Почему» — R76 spec и номер строки:
    - переход на тег — коммит и строка README; RULES.md нового тега, с R159 spec;
    - ключ `docs-budgets.json` из T205, `entry` 12, свои записи длиннее — в `entries`; `docs-check-repo` зелёный;
    - правило 9 своего RUN.md — по T203;
    - документы — без хроник версий и статусов (пример — абзац «Status» `docs/architecture.md` `infra`), архитектура ссылается на решения номером; комментарии — по В62; ссылки на поправки R143 и R145 spec — на запись (T204);
    - больше одного ревью — делится по правилу 11 своего RUN.md, первая задача — переход на тег; строка называет все.
  - Строки — в пункт 7 «все репозитории» (третья поправка 2026-11-12 к R76), с 7.26 — следующего свободного номера; «Зависит от» — «—»: тег вышел.
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** COORDINATION.md, правила 4–6, пункт 7; R76 и её третья поправка 2026-11-12, R156; T203–T205.

#### T207. `tokens-report --classes`; Д272

- **Цель:** `tokens-report` делит основные вызовы исполнителей по классу пути, как `text-classes.mjs` measurements 1.14.6, — для замера до и после E16.
- **Сделать:**
  - Ключ `--classes`, и в `--json`: таблица measurements 1.14.2 — что делал вызов, перенесённый контекст, вывод, время модели; классы путей — те же.
  - Сверка: на окне 2026-11-16 — 2026-11-18T04:33 и тех же папках — числа measurements 1.14.2; команда — в measurements 1.14.6 рядом со скриптом.
  - Д272: место вызова среди первых 80, когда возобновлённая сессия копирует часть родителя, — с тестом; строку закрыть.
- **Как проверить:** тесты `tools/` — `just coverage`; проверки правила tools; `just docs-check`; `/code-review high`.
- **Разделы:** measurements 1.14.2, 1.14.6; R145; Д272; `.claude/rules/tools.md`.

#### T196. Анализ токенов по порогу R145: третье повышение бюджета

- **Цель:** анализ расхода токенов `spec` по порогу R145 — третье повышение предела `tools/docs-check/budgets.json` с последнего анализа (E10, T118–T128, 2026-11-11): `DEBT.md` в T156, `COORDINATION.md` в T167, `dpia 1` в T195; четвёртое — `RULES.md` до 15 KB в T198 (поправка 2026-11-17 к R143). Планирование решает, нужен ли эпик (R145).
- **Почему:** порог R145, measurements 1.9. Журнал версий dpia 1 растёт на строку с каждой версией DPIA, по нескольку в день, и скоро снова перерастёт предел. Это первый кандидат анализа: свой раздел журналу или вынос старых строк из документа.
- **Сделать:** замер `just tokens-report` с последнего анализа; что растёт и почему; предложения с оценкой выгоды — решения автору.
- **Как проверить:** `just docs-check`; `/code-review high`, один круг.
- **Разделы:** R143, R145; measurements 1.9; T156, T167, T195.
- **Решено автором (2026-11-18):** T196 входит в эпик E16 `run/EPICS.md` (ответ на В64, T200) и выполняется в его задаче `spec`: журнал версий `dpia 1` — класс (а) measurements 1.14.4.
- **Решено при планировании E16 (2026-11-18):** T196 — задача таблицы 1 E16, после T203; «Планирование решает, нужен ли эпик» решено — эпик E16, а предложения анализа, что не покрывают задачи E16, — вопросами автору строками таблицы 3. К анализу — журнал версий `dpia 1` по правилу T203: строка версии — номер, дата, что изменилось одной фразой и pull request, без пересказа решений. Журнал и подпись версии требует R129 (и R147), поэтому журнал остаётся; если правило T203 с R129 расходится — вопрос автору строкой таблицы 3, статус waiting. Предел `dpia 1` (28 КБ) — снизить по новому размеру.

#### T208. Документы `spec`: product, repositories, README, CLAUDE.md, правила частей

- **Цель:** `docs/product.md`, `docs/repositories.md`, `docs/README.md`, CLAUDE.md и `.claude/rules/` — по правилу T203: без хроник версий и статусов, факт — в одном месте, решение — номером.
- **Сделать:**
  - Классы (а) и (г) measurements 1.14.4: версия — файлом, где она задаётся; история — git и архивы; пересказ решения — его номер; дата и номер задачи — только где они содержание, не история.
  - Номера разделов, на которые ссылаются, не менять: `docs-check` проверяет ссылки.
  - Размер каждого файла до и после — в «Сделано»; пределы `budgets.json` не поднимать, снизить, где упали.
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** measurements 1.14.4, 1.14.5; T203; R145.

#### T209. Документы `spec`: architecture 1, 2, 3.1–3.6

- **Цель:** architecture 1, 2 и 3.1–3.6 (≈ 90 КБ) — по правилу T203: текущее устройство, решения — номером, без пересказа, поправок, хроник версий и статусов.
- **Сделать:** как T208; карточки компонентов — что делает и чего не делает, данные, связи — по смыслу не менять: это сводка для других репозиториев (RULES.md, Across repositories).
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** architecture 1–3.6; measurements 1.14.4; T203, T208.

#### T210. Документы `spec`: architecture 3.7–8

- **Цель:** как T209 — для architecture 3.7–3.13 и 4–8 (≈ 95 КБ).
- **Сделать:** как T209.
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** architecture 3.7–8; T209.

#### T211. Документы `spec`: privacy

- **Цель:** `docs/privacy.md` (152 КБ, из них реестр privacy 9 — 66) — по правилу T203.
- **Сделать:** как T208. Меры и основания по закону остаются со ссылками на записи `docs/sources.md`; в privacy 9 — открытые вопросы и их варианты, без истории закрытых. DPIA опирается на privacy 1–7: что меняется по смыслу, а не по форме, — пересмотр DPIA по R129.
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** privacy 1–9; R129; measurements 1.14.4; T203, T208.

#### T212. Документы `spec`: concepts

- **Цель:** `docs/concepts.md` (164 КБ, из них словарь concepts 15 — 79) — по правилу T203.
- **Сделать:** как T208; термины словаря не менять — их держат все документы (RULES.md, The bar).
- **Как проверить:** `just docs-check`; `/code-review high`.
- **Разделы:** concepts 1–16; measurements 1.14.4; T203, T208.

#### T213. Комментарии кода: `tools/format-check/`, `tools/types/`

- **Цель:** комментарии `tools/format-check/` и `tools/types/` (≈ 155 КБ) — по В62: только «почему», ограничение, ловушка или контракт экспортируемой функции; номер решения — якорем `(R25)` в конце; без пересказа кода, истории, номеров задач и разделов.
- **Сделать:** переписать комментарии; поведение кода не меняется, тесты — как были; объём комментариев до и после — `comments.awk` measurements 1.14.6.
- **Как проверить:** тесты `tools/` — `just coverage`; проверки правила tools; `just docs-check` с проверкой T205; `/code-review high`.
- **Разделы:** measurements 1.14.4, 1.14.6; T203, T205; `.claude/rules/tools.md`.

#### T214. Комментарии кода: `tools/contracts/`, `tools/release/`, `tools/docs-check/`

- **Цель:** как T213 — для `tools/contracts/`, `tools/release/` и `tools/docs-check/` (≈ 145 КБ).
- **Сделать:** как T213.
- **Как проверить:** как T213, и проверки правила ci — `tools/release/`.
- **Разделы:** T213; `.claude/rules/tools.md`, `.claude/rules/ci.md`.

#### T215. Комментарии кода: `tools/orchestrator/` с README и `executor.md`, `tools/new-repo/`, `tools/legal/`, `tools/tokens/`, `tools/translation/`

- **Цель:** как T213 — для этих папок (≈ 90 КБ комментариев); `tools/orchestrator/README.md` и `executor.md` (≈ 40 КБ) — по правилу T203: номера задач — только где они содержание.
- **Сделать:** как T213; `executor.md` — договор исполнителя: смысл не менять.
- **Как проверить:** как T213, и `just orchestrator-test`, `just new-repo-test`.
- **Разделы:** T213; R156, R159; `.claude/rules/tools.md`, `.claude/rules/new-repo.md`.

#### T216. Комментарии кода: остальное `tools/`

- **Цель:** как T213 — для `tools/mockup/`, `consent-age/`, `inbox/`, `session/`, `export/`, `licenses/`, `admission/`, `gomod/`, `toolchain/`, `deployment/`, `coverage/` и файлов в корне `tools/` (≈ 60 КБ).
- **Сделать:** как T213.
- **Как проверить:** как T213.
- **Разделы:** T213; `.claude/rules/tools.md`.

#### T217. Комментарии CI и окружения: `.github/`, justfile, `.devcontainer/`, `spec.go`, `repo-template/`

- **Цель:** как T213 — для `#` и `//` комментариев `.github/` (≈ 48 КБ), justfile (≈ 38), `.devcontainer/` (≈ 12), `spec.go` и `repo-template/` (≈ 8).
- **Сделать:** как T213; версии и дайджесты в `ARG` и `uses:` — не трогать: это и есть текущее состояние (R34); комментарий `spec.go` о версии — файлом, где она задаётся.
- **Как проверить:** проверки правила ci — линтеры workflow и justfile; `just new-repo-test`; `just docs-check` с проверкой T205; `/code-review high`.
- **Разделы:** T213; R34; `.claude/rules/ci.md`, `.claude/rules/new-repo.md`.

#### T218. Итог эпика E16: замер после, архив

- **Цель:** E16 в архиве; что дало правило — измерено против measurements 1.14.
- **Когда:** все строки T206 в COORDINATION.md сделаны, как и задачи `spec` E16.
- **Сделать:**
  - По RUN.md, Epics: архив `docs/plan/E16.md`; `just tokens-report --since 2026-11-18T07:06:43Z --row` — строкой measurements 1.9 (с мержа T201); входящие — по правилу 13.
  - Замер после — новым разделом measurements: команды measurements 1.14.6 на свежих клонах 13 репозиториев — размеры, комментарии, журналы — против 1.14.1; сессии исполнителей после перехода каждого репозитория на тег — `tokens-report --classes` против 1.14.2. Меньше 100 сессий после переходов — сравнение сессий строкой таблицы 4, к месячному замеру.
  - Блок `repository` `budgets.json` — `entry` 12 и проверка комментариев по умолчанию, ключ T205 — лишний (R145). Строка T206 `[?]` — это строкой таблицы 4.
- **Как проверить:** `just docs-check`; тесты `tools/` — `just coverage`, если тронут `docs-check`.
- **Разделы:** RUN.md, Epics; measurements 1.9, 1.14; R145; T205–T207.
