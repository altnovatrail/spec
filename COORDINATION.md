# COORDINATION.md — cross-repository plan of NovaTrail

The order of the other repositories' tasks toward the plan's goal, and which waits for which (R76). Tasks live in their repositories' RUN.md (R19); a row names them. An epic of tasks across repositories that spec plans, as E11, keeps them in spec's table 1, with no rows here; the author leads each, not «Сделай эпик E…» (R159). Items follow repositories 6. spec's own plan — [RUN.md](RUN.md). Rules in English, «Порядок» in Russian (R154).

## Rules

The coordinator — a session of `spec` started by «Что дальше по COORDINATION.md?» — reads the other repositories on GitHub, changes none of them, and tells the author which task to run, where and with what phrase. The orchestrator — «Сделай эпик E…» in spec's orchestrator container — runs the tasks and merges their pull requests itself (R156), by [tools/orchestrator/README.md](tools/orchestrator/README.md#сделай-эпик-e).

1. Read [CLAUDE.md](CLAUDE.md), this file, R76 and the decisions the open rows cite.
2. Devcontainer only (RUN.md rule 3).
3. Each open row's status — from GitHub, read only (`.repos/` lags):
   - RUN.md, `run/EPICS.md`: `gh api repos/altnovatrail/<repo>/contents/<file> -H "Accept: application/vnd.github.raw"`;
   - its `spec` tag: `gh api repos/altnovatrail/<repo>/contents/spec --jq .sha` against `gh api repos/altnovatrail/spec/tags`;
   - open pull requests: `gh pr list -R altnovatrail/<repo> --state open`;
   - unrecorded rows «в реестр spec»: `just inbox` (R81); spec triages them (RUN.md rule 13).
4. A task is done when `[x]` on its repository's `main`. A row whose tasks are all done, or `[-]`, is deleted and leaves «Зависит от»; closed rows are in git, `git log -p -S'| 6.18 |' -- COORDINATION.md`. Numbers are never reused: each item names its next free one. `[?]` stays, with its reason.
5. Next task: the first open row whose «Зависит от» is done — repository, task, «Выполни задачу Txx из RUN.md», its container (CLAUDE.md, Environment). Rows waiting only on done ones — any order.
6. A task not yet in its repository: give its session a text in Russian — «Цель», «Сделать», «Как проверить», «Разделы», «Почему» with R76 spec and the row. That session numbers it; write the number into the row.
7. Inside a repository its RUN.md wins: fix the row here. A conflict of order between repositories — a row of [run/QUESTIONS.md](run/QUESTIONS.md).
8. The coordinator never runs other repositories' tasks, edits their files (`.repos/` too), decides for the author — a new decision is a question with options and a recommendation —, or commits (R156).
9. A new question across repositories — spec's register, next free number: О- (product 13), П- (privacy 9), Т- (repositories 8).
10. End with a short report in Russian: rows done, what is next and with what phrase, what waits for what. The file keeps no state.

**Statuses:** `[ ]` open; `[?]` deferred — the author's decision, reason and when to return.

**Citations:** another repository's task — «T01 `module-kit`», its decision — «R03 api»; a `spec` task — «T48»; a row — «строка 3.3».

## Порядок

Цель — первый срез со взрослыми: на `novatrail` учатся автор и взрослые из США по коду `api invite`, с телефона, планшета и компьютера — рукопись, уроки, движок и слова наставника под квотой ИИ платформы, по E3 `app`, и задачи с бумаги ученика, по эпику E11 (RUN.md, таблица 1) (R149, R162). Не входят дети (R147; Д240) и проверки на настоящих устройствах (R146).

Задачи строки идут по RUN.md своего репозитория. «Зависит от» — номера открытых строк; «—» — ждёт только сделанного.

**Пункт 1 — `spec`.** Строк нет. Следующая — 1.24.

**Пункт 2 — `.github`.** Строк нет. Следующая — 2.8.

**Пункт 3 — `module-kit` и `modules`.** Следующая — 3.15.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 3.14 | `modules` | задачи нет | ссылки на гейт `sim` — на его `docs/README.md`: с ближайшей задачей, что трогает гейт, или с переходом на тег `sim` | — |

**Пункт 4 — `learner-model`, `engine` и `sim`.** Библиотеки меняются через гейт `sim` (R59 sim); справедливость по классу — R157, Д261. Следующая — 4.25.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 4.22 | `learner-model` | задачи нет | свои решения в комментариях `.proto` — `R10 learner-model` (R32), релизом | — |
| [ ] | 4.23 | `learner-model` | задачи нет | ссылки на гейт `sim` — на его `docs/README.md`: с ближайшей задачей, что трогает гейт, или с переходом на тег `sim` | — |
| [ ] | 4.24 | `engine` | задачи нет | ссылки на гейт `sim` — на его `docs/README.md`: с ближайшей задачей, что трогает гейт, или с переходом на тег `sim` | — |

**Пункт 5 — `tutor` и `canvas`.** Идут раньше пунктов 3 и 4 (repositories 6). Следующая — 5.24.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 5.21 | `canvas` | задачи нет | атрибут `statement-hidden`: элемент не рисует условие задачи (R161), релизом | — |

**Пункт 6 — `api`, `app`, `skill-map` и `infra`.** Следующая — 6.46.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 6.35 | `infra` | задачи нет | с 2026-11-24: доля попаданий кеша слов наставника в `ai_usage` по `cache_read_tokens` — в отчёт; держится ли среднее `Price` `tutor` — кеш окупается от ≈ 21 % (R131 tutor); далеко от 21 % — строка «в реестр spec» к `tutor`: пересчитать ожидаемые токены | — |
| [ ] | 6.42 | `api` | задачи нет | копии `.proto` `learner-model` — с его релиза | 4.22 |
| [ ] | 6.43 | `app` | задачи нет | условие задачи — карточкой над элементом по макету, с `statement-hidden` (architecture 3.1) | 5.21 |

**Пункт 7 — все репозитории.** Вне порядка repositories 6; `site` возьмёт пункт 8. Строки 7.62–7.73 — переход на тег `spec` с T287–T290 и пересмотр `docs/sources.md` по его правилу записей в каждом из 12 других репозиториев, по тексту T291 (правило 6): идут в любом порядке, каждая — в своём контейнере, после тега `spec` с T287–T290. Задача, которую правило 11 её RUN.md разделило, записывает остальные в `run/TASKS.md`, и строка ждёт всех. Следующая — 7.74.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 7.62 | `.github` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.63 | `modules` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.64 | `module-kit` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.65 | `learner-model` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.66 | `engine` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.67 | `sim` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.68 | `skill-map` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.69 | `api` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.70 | `tutor` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.71 | `canvas` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.72 | `app` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
| [ ] | 7.73 | `infra` | задачи нет | тег `spec` с T287–T290 или новее и `docs/sources.md` по правилу записей — по тексту T291 | — |
