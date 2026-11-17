# COORDINATION.md — cross-repository plan of NovaTrail

The order in which the other repositories' tasks lead to the plan's goal, and which waits for which (R76). Tasks live in their repositories' RUN.md (R19); a row names them. Items follow repositories 6. spec's own plan — [RUN.md](RUN.md). Language (R154): rules in English, «Порядок» in Russian.

## Rules

The coordinator is a session of `spec`, started by «Что дальше по COORDINATION.md?» in spec's devcontainer. It changes no other repository: it reads them on GitHub and tells the author which task to run, where and with what phrase. The orchestrator is the same role carried to the end, in spec's orchestrator container: started by «Сделай эпик E…», it runs the tasks itself and merges their pull requests (R156), by the procedure of [tools/orchestrator/README.md](tools/orchestrator/README.md#сделай-эпик-e).

1. Read [CLAUDE.md](CLAUDE.md), this file, R76 and the decisions the open rows cite.
2. Devcontainer only (RUN.md rule 3).
3. Each open row's status from GitHub, read only — the copies in `.repos/` lag:
   - RUN.md and `run/EPICS.md`: `gh api repos/altnovatrail/<repo>/contents/<file> -H "Accept: application/vnd.github.raw"`;
   - the tag of its `spec` submodule: `gh api repos/altnovatrail/<repo>/contents/spec --jq .sha` against `gh api repos/altnovatrail/spec/tags`;
   - open pull requests: `gh pr list -R altnovatrail/<repo> --state open`;
   - rows «в реестр spec» not recorded: `just inbox` (R81) — name them; spec's session triages them (RUN.md rule 13).
4. A task is done when `[x]` on its repository's `main`. A row whose tasks are all done, or that is `[-]` by that repository's RUN.md, is deleted, and its number leaves «Зависит от». Numbers are not reused: each item names its next free one. In an open row, done tasks are numbers only, «сделаны T01–T05». `[?]` stays, with its reason. Rows closed by 2026-11-15, which older texts cite: `git show 6eb3243:COORDINATION.md`, section «Закрытые строки»; rows 7.13 and 7.15–7.25, closed by T171: `git show 5867a6c:COORDINATION.md`; rows 5.13, 6.19 and 6.23, closed by T172: `git show dc51e41:COORDINATION.md`. Rows 4.17 and 4.18 `[?]`, moved to run/DEBT.md as Д261 by the author 2026-11-16 (amendment to R157): `git show b99d983:COORDINATION.md`. Rows 1.22, 3.11, 4.20, 4.21, 5.11, 5.12, 5.14–5.16, 6.14, 6.21, 6.24, 6.25 and 6.27–6.33, done by the orchestrator's run of 2026-11-16 — 2026-11-17 and closed by T187: `git show 7ec30fd:COORDINATION.md`.
5. Name the next task from the first open row whose «Зависит от» is done: repository and task number; the phrase «Выполни задачу Txx из RUN.md»; where — the container of that repository's clone (CLAUDE.md, Environment), a `spec` task here; which other rows wait only on done ones — any order.
6. A task not yet in its repository (a code epic, a move to a tag): give its session a text in Russian — «Цель», «Сделать», «Как проверить», «Разделы», and in «Почему» R76 spec and the row number. That session records and numbers it; then write the number into the row.
7. Inside a repository its RUN.md wins — a task's number, title, internal dependency: fix the row here. A conflict of order between repositories is a question to the author: a row of [run/QUESTIONS.md](run/QUESTIONS.md).
8. Never run other repositories' tasks or edit their files (`.repos/` too; RULES.md, Across repositories), decide for the author — a new decision is a question with options and a recommendation —, or commit. This rule binds the coordinator alone (R156).
9. A new question across repositories goes to spec's register, next free number: О- (product 13), П- (privacy 9), Т- (repositories 8).
10. End with a short report in Russian: rows done, what is next and with what phrase, what waits for what. The file keeps no state.

**Statuses:** `[ ]` open; `[?]` deferred — the author's decision, reason and when to return in the row.

**Citations:** another repository's task — «T01 `module-kit`», its decision — «R03 api»; a `spec` task — «T48»; a row — «строка 3.3».

## Порядок

Цель — первый срез со взрослыми: на развёртывании строки 6.9 учатся взрослые — автор и взрослые из США по коду `api invite` — с телефона, планшета и компьютера: рукопись, уроки, движок и слова наставника под квотой ИИ платформы, по E3 `app`; пока учится только автор, ИИ платформы ему открыт (T69 `infra`; R76 и её поправки 2026-11-12–2026-11-15; R149). Не входят: дети (T117, R147; Д240) и проверки на настоящих устройствах (R146).

Задачи внутри строки идут по RUN.md своего репозитория. В «Зависит от» — номера открытых строк; «—» — строка ждёт только сделанного.

**Пункт 1 — `spec`.** Открытых строк нет. Следующая — 1.23.

**Пункт 2 — `.github`.** Следующая — 2.6.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 2.5 | `.github` | T69 `.github` — на `main` ещё `[ ]`, хотя её pull request #138 смёржен и релиз `v0.1.32` вышел (его берёт T52 `module-kit`): строке осталась отметка `[x]` и архив E22 сессией `.github` | составное действие (composite action) `.github` — образ `toolchain` и кеши Go из кеша и их сохранение на `main`, шаги job `arm64` общего `go.yml`, — которым пользуется и сам `go.yml`; вызывающий берёт его по SHA, и Dependabot двигает его в группе `shared-workflows`; релиз (строка `module-kit` В36) | — |

**Пункт 3 — `module-kit` и `modules`.** Открытых строк нет. Следующая — 3.12.

**Пункт 4 — `learner-model`, `engine` и `sim`.** Библиотеки меняются через гейт `sim`. Кругов суда по плану нет: суд `sim` разворачивает эпиком, когда библиотека приносит кандидата и называет его причину (R59 sim). Круг справедливости по классу кончился выходом: база не держит критерий (R58 sim), а суд — при 100 детях, в техническом долге, Д261; три правила R157 — в модели (T68 `learner-model`) и прогнаны `sim` (T79 `sim`), риск автор принял 2026-11-16 (R157; dpia 7 и 8). Открытых строк нет. Следующая — 4.22.

**Пункт 5 — `tutor` и `canvas`.** Идут раньше пунктов 3 и 4, как шёл их код (repositories 6). Открытых строк нет. Следующая — 5.17.

**Пункт 6 — `api`, `app`, `skill-map` и `infra`.** Следующая — 6.34.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 6.18 | `app` | E5 «Интерфейс по эталону»: T75–T91, сделаны T75 и T88 (третья поправка 2026-11-14 к R76; Д25 `app`) | тег `spec` с T157 у `app` есть, `v0.18.4`; среда эталона в трёх движках (Д244); экраны первого среза в стиле эталона на телефоне, планшете и компьютере, поведение прежнее (R148 и её поправки), кроме слов наставника (ниже); поправка к R17 app — цвета эталона с заменами раздела «Contrast» его README; снимки эталона и своих экранов в трёх движках и двух размерах, сравнение без автора (R146); панель и 2.5.7 на странице «Accessibility» — с релизом `canvas` `v0.3.26` или новее (T121 `canvas`; Д24 `app`): цвета панели — `--novatrail-canvas-accent` и `--novatrail-canvas-glass`, отступ полосы, посередине которой стоит панель, — `--novatrail-canvas-top` (высота своей липкой шапки, если она есть), панель под листом наставника на телефоне прячет атрибут `tools-hidden`, а «Continue» примера стоит в слоте `actions` элемента (поправка 2026-11-17 к R36); карточка модуля — на `./states` `skill-map` 0.1.11 или новее (T26 `skill-map`; architecture 3.3); слова наставника — только при открытой панели: при скрытой «Проверить» даёт чтение и вердикт программы, без `GetRungWords` и `GetCorrectAnswerWords`, открытие панели один раз просит слова к последней отправке задачи на экране, если она дала «not yet» или «correct», панель не открывается вердиктом; `api` и `tutor` правило не задевает — `app` просто не зовёт методы (вторая поправка 2026-11-17 к R148; T182); экраны детей E4 `app` — по эталону | — |
| [ ] | 6.26 | `infra` | E6 «Переход на `spec` 0.17 и ответы на вопросы E5»: T56–T63, сделаны T56–T60, T62 и T63 | итог эпика — T61 (строка `infra` В36) | — |

**Пункт 7 — все репозитории (E10; R143, R145; T123; скорость CI — T166, T171, measurements 3.1).** Вне порядка repositories 6, где седьмой — `site`: когда у него появятся строки, его пункт возьмёт номер 8 (поправка 2026-11-12 к R76). Открытых строк нет: строки скорости CI, 7.13–7.25, сделаны — 7.14 в T166, остальные в T171. Следующая — 7.26.
