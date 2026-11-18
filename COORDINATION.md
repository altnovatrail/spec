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
4. A task is done when `[x]` on its repository's `main`. A row whose tasks are all done, or that is `[-]` by that repository's RUN.md, is deleted, and its number leaves «Зависит от». Numbers are not reused: each item names its next free one. In an open row, done tasks are numbers only, «сделаны T01–T05». `[?]` stays, with its reason. Rows closed by 2026-11-15, which older texts cite: `git show 6eb3243:COORDINATION.md`, section «Закрытые строки»; rows 7.13 and 7.15–7.25, closed by T171: `git show 5867a6c:COORDINATION.md`; rows 5.13, 6.19 and 6.23, closed by T172: `git show dc51e41:COORDINATION.md`. Rows 4.17 and 4.18 `[?]`, moved to run/DEBT.md as Д261 by the author 2026-11-16 (amendment to R157): `git show b99d983:COORDINATION.md`. Rows 1.22, 3.11, 4.20, 4.21, 5.11, 5.12, 5.14–5.16, 6.14, 6.21, 6.24, 6.25 and 6.27–6.33, done by the orchestrator's run of 2026-11-16 — 2026-11-17 and closed by T187: `git show 7ec30fd:COORDINATION.md`. Row 2.5, done by T69 and T72 `.github`, closed by T188: `git show dbefaee:COORDINATION.md`. Row 1.23, done and closed by T189: `git show 5752146:COORDINATION.md`. Rows 3.12, 5.17, 5.18, 6.26 and 6.34, done or not needed and closed by T198: `git show 4f48c28:COORDINATION.md`.
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

**Пункт 1 — `spec`.** Открытых строк нет. Следующая — 1.24.

**Пункт 2 — `.github`.** Следующая — 2.8.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 2.6 | `.github` | задачи нет | всё на английском, и у человека (вторая поправка 2026-11-17 к R14; поправка 2026-11-17 к R22; ответ автора на `.github` В42): `CONTRIBUTING.md` — «Write issues and pull requests in English», без «or Russian»; в шаблоне PR и обеих формах issues — «Write in English.» вместо «Write in English or Russian.»; поправка к своему решению о шаблонах; В42 — из таблицы 3 | — |
| [ ] | 2.7 | `.github` | задачи нет | кеши Go не холодные после смены `go.sum` (ответ автора на `api` В83; measurements 13 api): `.github/actions/toolchain` и задания `go.yml` при промахе точного ключа берут `restore-keys` по префиксу без хеша `go.sum`; при неточном попадании `mod` выбрасывается — модули качаются за секунды, — `build` и `lint` остаются как есть, старое Go обрезает сам; сохранение — под новым точным ключом, на `main`, как сейчас; тесты `go.yml` и действия; поправки к R41 и R49 .github — возражение о росте записей снято; релиз `.github`; репозитории берут его своим переходом на релиз `.github` | — |

**Пункт 3 — `module-kit` и `modules`.** Следующая — 3.14.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 3.13 | `modules` | сделана T81 | новая версия `english-essays` без «Do not write your name or the real name of anyone you know.» в пяти заданиях: `app` с T47 выложен на `novatrail` (Д152; поправка 2026-11-17 к R127; поправка 2026-11-17 к R150); индекс | — |

**Пункт 4 — `learner-model`, `engine` и `sim`.** Библиотеки меняются через гейт `sim`. Кругов суда по плану нет: суд `sim` разворачивает эпиком, когда библиотека приносит кандидата и называет его причину (R59 sim). Круг справедливости по классу кончился выходом: база не держит критерий (R58 sim), а суд — при 100 детях, в техническом долге, Д261; три правила R157 — в модели (T68 `learner-model`) и прогнаны `sim` (T79 `sim`), риск автор принял 2026-11-16, а одну проваленную проверку `fair` — 2026-11-17 (R157 и её поправка 2026-11-17; dpia 7 и 8). Открытых строк нет. Следующая — 4.22.

**Пункт 5 — `tutor` и `canvas`.** Идут раньше пунктов 3 и 4, как шёл их код (repositories 6). Следующая — 5.21.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 5.19 | `canvas` | задачи нет | переход на тег `spec` с T189: в `src/element/interface.check.ts` снять `@ts-expect-error` у `exportPicture()` и держать метод на соглашении; поправки к R83 canvas (метод в соглашении) и R84 canvas (эталон взял `#1d1d1f`); В82 и В86 — из таблицы 3 | — |
| [ ] | 5.20 | `canvas` | задачи нет | набор иконок — вместе с `skill-map` и `app`, по строке плана (поправка 2026-11-17 к R78; ответ автора на `app` В73): `@iconify-json/material-symbols` до 1.2.99, версии `skill-map`, — в своей ветке от `main`, `just icons`, иконки и `NOTICE` заново; PR Dependabot #134 закрыть; `ignore` набора в `.github/dependabot.yml`, комментарий — набор поднимает только строка COORDINATION.md; поправка к своему решению об иконках; релиз | — |

**Пункт 6 — `api`, `app`, `skill-map` и `infra`.** Следующая — 6.42.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 6.18 | `app` | E5 «Интерфейс по эталону»: T75–T91, сделаны T75 и T88 (третья поправка 2026-11-14 к R76; Д25 `app`) | тег `spec` с T157 у `app` есть, `v0.18.4`; среда эталона в трёх движках (Д244); экраны первого среза в стиле эталона на телефоне, планшете и компьютере, поведение прежнее (R148 и её поправки), кроме слов наставника (ниже); поправка к R17 app — цвета эталона с заменами раздела «Contrast» его README; снимки эталона и своих экранов в трёх движках и двух размерах, сравнение без автора (R146); панель и 2.5.7 на странице «Accessibility» — с релизом `canvas` `v0.3.26` или новее (T121 `canvas`; Д24 `app`): цвета панели — `--novatrail-canvas-accent` и `--novatrail-canvas-glass`, отступ полосы, посередине которой стоит панель, — `--novatrail-canvas-top` (высота своей липкой шапки, если она есть), панель под листом наставника на телефоне прячет атрибут `tools-hidden`, а «Continue» примера стоит в слоте `actions` элемента (поправка 2026-11-17 к R36); карточка модуля — на `./states` `skill-map` 0.1.11 или новее (T26 `skill-map`; architecture 3.3); слова наставника — только при открытой панели: при скрытой «Проверить» даёт чтение и вердикт программы, без `GetRungWords` и `GetCorrectAnswerWords`, открытие панели один раз просит слова к последней отправке задачи на экране, если она дала «not yet» или «correct», панель не открывается вердиктом; `api` и `tutor` правило не задевает — `app` просто не зовёт методы (вторая поправка 2026-11-17 к R148; T182); подсказки кнопок без подписи (T79 `app`) — белым на непрозрачной `#1d1d1f`, как у `canvas`, контраст — axe при наведении и фокусе (третья поправка 2026-11-17 к R148); эталон берёт эту заливку с T189, строка 1.23, и до её тега снимки подсказок сравниваются с поправкой, а не с эталоном; экраны детей E4 `app` — по эталону | — |
| [ ] | 6.35 | `infra` | задачи нет | с 2026-11-24, через неделю после выкладки `api` v0.1.64 (T81, 2026-11-17): доля попаданий кеша у слов наставника в `ai_usage` по `cache_read_tokens` — в отчёт — и сверка, держится ли среднее `Price` `tutor`: кеш окупается от ≈ 21 % попаданий (R131 tutor); если доля далеко от 21 % — строка «в реестр spec» к `tutor`, пересчитать ожидаемые токены (ответ автора на `tutor` В92) | — |
| [ ] | 6.36 | `infra` | T78 | `novatrail/english-essays` — в `api_catalog_modules`, путём фактов (поправка 2026-11-16 к R05 infra; поправка 2026-11-17 к R150), `api check` проходит; с переходом на тег `spec` с T188 — `SELF-HOSTING.md`, «Your list», ссылается на пятую поправку 2026-11-17 к R07 и называет срок 2027-01-17; В49, В51 и В52 — из таблицы 3; выложено 2026-11-17 (PR #114 `infra`): строки 6.36, 6.39, 3.13 и 6.38 и Д152 закрываются, когда T78 `[x]` и его тело — в архиве E6 на `main` `infra` (ответ автора на `infra` В57) | — |
| [ ] | 6.37 | `app` | задачи нет: после E5, строки 6.18 | переход на тег `spec` с T189: `ElementHoldsContract` (`src/canvas/jsx.ts`) держит `exportPicture()` по `CanvasElement`, без своего типа из `NovatrailCanvas`; комментарии `jsx.ts` и `src/works/picture.ts` — без «not yet in spec's types»; поправка к R15 app; В69 — из таблицы 3 | 6.18 |
| [ ] | 6.38 | `api` | сделана T110 | индекс `modules` с версией `english-essays` строки 3.13; релиз | 3.13 |
| [ ] | 6.39 | `infra` | T78 | выкладка `api` строки 6.38 на `novatrail` | 6.38 |
| [ ] | 6.40 | `skill-map` | задачи нет | `ignore` `@iconify-json/material-symbols` в `.github/dependabot.yml`, комментарий — набор поднимают вместе с `canvas` и `app` только строкой COORDINATION.md (поправка 2026-11-17 к R78); поправка к своему решению об иконках; набор — прежний 1.2.99 | — |
| [ ] | 6.41 | `app` | задачи нет | `canvas` строки 5.20 и последний `skill-map` (0.1.18 или новее) с набором `@iconify-json/material-symbols` 1.2.99, как у обоих (поправка 2026-11-17 к R78; `scripts/pins.ts`, R15 app); `ignore` набора в `dependabot.yml` уже есть; релиз | 5.20 |

**Пункт 7 — все репозитории (R160).** Вне порядка repositories 6, где седьмой — `site`: когда у него появятся строки, его пункт возьмёт номер 8 (поправка 2026-11-12 к R76). Строки 7.26–7.37 — правило E16 `spec` в каждом из 12 других репозиториев, из одного текста T206 (правило 6): тег `spec` с T205, `docs-budgets.json` с `entry` 12 и `comments`, план, документы и комментарии кода без истории; идут в любом порядке, каждая — как только в её репозитории кончится текущая задача (RUN.md, таблица 1, «Решено автором»). Задача, которую правило 11 её RUN.md разделило, записывает остальные в `run/TASKS.md`; после её мержа они — узлы того же репозитория, как задачи записанного эпика ([README оркестратора](tools/orchestrator/README.md), раздел 5), и строка ждёт всех. Следующая — 7.38.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 7.26 | `.github` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.27 | `module-kit` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.28 | `modules` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.29 | `learner-model` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.30 | `engine` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.31 | `sim` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.32 | `tutor` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.33 | `canvas` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.34 | `api` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.35 | `app` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206; с ней — строка 6.37 | — |
| [ ] | 7.36 | `skill-map` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206 | — |
| [ ] | 7.37 | `infra` | задачи нет | правило E16 по тексту строк 7.26–7.37 в T206; абзац «Status» `docs/architecture.md` — хроника, которую она убирает | — |
