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
4. A task is done when `[x]` on its repository's `main`. A row whose tasks are all done, or that is `[-]` by that repository's RUN.md, is deleted, and its number leaves «Зависит от». Numbers are not reused: each item names its next free one. In an open row, done tasks are numbers only, «сделаны T01–T05». `[?]` stays, with its reason. Rows closed by 2026-11-15, which older texts cite: `git show 6eb3243:COORDINATION.md`, section «Закрытые строки»; rows 7.13 and 7.15–7.25, closed by T171: `git show 5867a6c:COORDINATION.md`; rows 5.13, 6.19 and 6.23, closed by T172: `git show dc51e41:COORDINATION.md`. Rows 4.17 and 4.18 `[?]`, moved to run/DEBT.md as Д261 by the author 2026-11-16 (amendment to R157): `git show b99d983:COORDINATION.md`.
5. Name the next task from the first open row whose «Зависит от» is done: repository and task number; the phrase «Выполни задачу Txx из RUN.md»; where — the container of that repository's clone (CLAUDE.md, Environment), a `spec` task here; which other rows wait only on done ones — any order.
6. A task not yet in its repository (a code epic, a move to a tag): give its session a text in Russian — «Цель», «Сделать», «Как проверить», «Разделы», and in «Почему» R76 spec and the row number. That session records and numbers it; then write the number into the row.
7. Inside a repository its RUN.md wins — a task's number, title, internal dependency: fix the row here. A conflict of order between repositories is a question to the author: a row of [run/QUESTIONS.md](run/QUESTIONS.md).
8. Never run other repositories' tasks or edit their files (`.repos/` too; RULES.md, Across repositories), decide for the author — a new decision is a question with options and a recommendation —, or commit. This rule binds the coordinator alone (R156).
9. A new question across repositories goes to spec's register, next free number: О- (product 13), П- (privacy 9), Т- (repositories 8).
10. End with a short report in Russian: rows done, what is next and with what phrase, what waits for what. The file keeps no state.

**Statuses:** `[ ]` open; `[?]` deferred — the author's decision, reason and when to return in the row.

**Citations:** another repository's task — «T01 `module-kit`», its decision — «R03 api»; a `spec` task — «T48»; a row — «строка 3.3».

## Порядок

Цель — первый срез со взрослыми: на развёртывании строки 6.9 учатся взрослые — автор и взрослые из США по коду `api invite` — с телефона, планшета и компьютера: рукопись, уроки, движок и слова наставника под квотой ИИ платформы, по E3 `app`; пока учится только автор, ИИ платформы ему открывает строка 6.21 (R76 и её поправки 2026-11-12–2026-11-15; R149). Не входят: дети (T117, R147; Д240) и проверки на настоящих устройствах (R146).

Задачи внутри строки идут по RUN.md своего репозитория. В «Зависит от» — номера открытых строк; «—» — строка ждёт только сделанного.

**Пункт 1 — `spec`.** Следующая — 1.23.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 1.22 | `spec` | сделана T178 | метод контракта для поправки уровня взрослым: `ProgressService` — модуль профиля и полоса, соседняя с текущей, повтор её не меняет, право — владельца аккаунта; в прогрессе — что уровень поставил взрослый, и когда (R157; T173); релиз | — |

**Пункт 2 — `.github`.** Следующая — 2.6.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 2.5 | `.github` | задачи нет: по тексту T172 | составное действие (composite action) `.github` — образ `toolchain` и кеши Go из кеша и их сохранение на `main`, шаги job `arm64` общего `go.yml`, — которым пользуется и сам `go.yml`; вызывающий берёт его по SHA, и Dependabot двигает его в группе `shared-workflows`; релиз (строка `module-kit` В36) | — |

**Пункт 3 — `module-kit` и `modules`.** Следующая — 3.12.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 3.11 | `module-kit` | задачи нет: по тексту T172 | «Binaries / build» — на действии строки 2.5: копия шести шагов job `arm64` и страж, что держит её у закреплённого `go.yml` (R58, R61 module-kit), уходят, и pull request Dependabot группы `shared-workflows` проходит сам; поправка к R58 module-kit (строка `module-kit` В36) | 2.5 |

**Пункт 4 — `learner-model`, `engine` и `sim`.** Библиотеки меняются через гейт `sim`. Кругов суда по плану нет: суд `sim` разворачивает эпиком, когда библиотека приносит кандидата и называет его причину (R59 sim). Круг справедливости по классу кончился выходом: база не держит критерий (R58 sim), а суд — при 100 детях, в техническом долге, Д261; первого ребёнка ждут три правила, строки 4.20 и 4.21, — риск автор принял 2026-11-16 (R157; dpia 7 и 8). Следующая — 4.22.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 4.20 | `learner-model` | задачи нет: по тексту T173 и дополнению T178 | три правила R157 в модели: старт оценки нового ученика — на ширину полосы ниже полосы класса по шкале модуля, и ниже нижней полосы тоже: у R03 learner-model такого места нет, строка его добавляет; поправка взрослого — факт журнала свидетельств, двигает уровень модуля на полосу проще или сложнее за один шаг, а `Read` даёт полосу, в которой стоит уровень модуля, — для `level_band` и `SetModuleLevel` (T178); предохранитель — три неудачи подряд в модуле опускают уровень на полосу, что такое неудача — по свидетельствам модели; гейт `sim` без порчи `fair` (R57 sim); релиз | — |
| [ ] | 4.21 | `sim` | задачи нет: по тексту T173 | короткий прогон трёх правил против базы v0.1.8 и `engine` v0.1.6 по критерию, записанному до прогона: `M11.same` пятого класса к 50-му ответу выше 0,5525; ни одна ячейка не хуже по `fair` (R57 sim); ложные срабатывания предохранителя в ячейке третьего класса — не больше 5 % учеников; поправка взрослого — ячейкой, что `sim` выберет в критерии; числа — строкой «в реестр spec» для dpia 10.2 | 4.20 |

**Пункт 5 — `tutor` и `canvas`.** Идут раньше пунктов 3 и 4, как шёл их код (repositories 6). Следующая — 5.16.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 5.11 | `canvas` | задачи нет: её записывает сессия `canvas` по тексту T157, вне эпика или эпиком (третья поправка 2026-11-14 к R76; Д11 `canvas`); тег `spec` с T157 у `canvas` есть, `v0.18.4` (T117 `canvas`) | среда эталона в трёх движках (Д244); панель инструментов — вертикальная стеклянная полоса эталона: свойства стиля ставит `app`, раскладка — от ширины до 320 CSS px, доступность прежняя (R148; R28–R73 canvas); без «Up», «Down», «Left» и «Right», 2.5.7 — объявленное несоответствие (вторая поправка 2026-11-14 к R90; Д242); новое свойство стиля или атрибут — строкой «в реестр spec» (R36); снимки против эталона без автора (R146); релиз в npm | — |
| [ ] | 5.12 | `tutor` | задачи нет: её записывает эпиком сессия `tutor`, когда автор его откроет (строка `api` В72) | записи допуска на моделях Anthropic: `CallWorkbook` и `CallEssay` — `handwriting_reading` на промптах тетради и чтения сочинения, `CallRubric` — `rubric_assessment` на промпте оценки (R70); ступени `author` и `full` (R80 tutor), `adult`, ИИ платформы и свой ключ; ожидаемые токены каждого вида для `Price`; платные прогоны eval — шаг автора; релиз. До неё `ReadWorkbook`, `ReadEssay` и `AssessEssay` — `NotAdmitted`; нужна до модуля с тетрадью или сочинением в каталоге развёртывания (R150) | — |
| [ ] | 5.14 | `canvas` | задачи нет: по тексту T172 | картинка работы — метод элемента: PNG штрихов, что показывает поверхность листа или тетради, без условия, нарисованный так же, как лист и вырезка; для `StoredWork.picture` `PutWork` ([текст контрактов](contracts/README.md), раздел 15; architecture 3.2); метод — в соглашении элемента (R36); релиз в npm (строка `app` В66) | — |
| [ ] | 5.15 | `tutor` | задачи нет: по тексту T179, её делает текущий прогон оркестратора | режим чтения `single` (поправка 2026-11-17 к R68): в нём — один вызов чтения, Haiku 5.5 · `medium`, второй читатель допущенной пары, и одно наблюдение или исход вызова; `pair` — как сейчас; допуск — по записи пары, для одного читателя Haiku (R125 `tutor`); эссе — как было; релиз (строка `infra` В44) | — |

**Пункт 6 — `api`, `app`, `skill-map` и `infra`.** Следующая — 6.32.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 6.14 | `app` | E3 «Первый срез со взрослыми учениками»: T35–T52, T56–T60 и T62, сделаны T35–T46, T49, T50 и T57–T60, T51 и T56 — `[-]`, вошли в T57; вне эпика сделаны T53–T55 (строка 7.4), T61 и T63–T69 | сочинения T47 и тетрадь T48 — на заглушке с E13 `api` (закрытая строка 6.22), тетрадь в `just dev-app` — с ребёнком строки 6.25, на моделях — с релизом `tutor` строки 5.12 у `api`, без правки `app`; E3 их не ждёт: на сайте таких модулей нет (R150; строка `api` В72; вторая поправка 2026-11-15 к R76); отказ своего ключа с причиной предела — с T85 и T86 `api` (строки `app` В65, `api` В73; Д22 `app`), `access_returns` — после строки 6.27; работы на сервере, T62 — с релизом `canvas` строки 5.14 (строка `app` В66); итог — T52 | 5.14 — для T62, 6.25 — для T48, 6.27 — для `access_returns` |
| [ ] | 6.18 | `app` | задач нет: эпик «Интерфейс по эталону» записывает сессия `app` по тексту T157, место среди E3 и E4 `app` решает автор (третья поправка 2026-11-14 к R76; Д25 `app`) | тег `spec` с T157 у `app` есть, `v0.18.4`; среда эталона в трёх движках (Д244); экраны первого среза в стиле эталона на телефоне, планшете и компьютере, поведение прежнее (R148 и её поправки); поправка к R17 app — цвета эталона с заменами раздела «Contrast» его README; снимки эталона и своих экранов в трёх движках и двух размерах, сравнение без автора (R146); панель и 2.5.7 на странице «Accessibility» — с релизом `canvas` строки 5.11 (Д24 `app`); карточка модуля — на `./states` `skill-map` 0.1.11 или новее (T26 `skill-map`; architecture 3.3); экраны детей E4 `app` — по эталону | 5.11 — для панели и 2.5.7; остальное — нет |
| [ ] | 6.21 | `infra` | задачи нет: её записывает сессия `infra` вне эпика по тексту T158, `api` готов (R149; R29 infra) | ключ Anthropic платформы — секрет Secret Manager, том `API_ANTHROPIC_KEY_FILE` (R46 api), после лимита трат рабочей области, шага автора (Д11 `api`); факты `{"anthropic": {"data_processing_agreement": ["adult"], "minimal_retention": ["adult"]}}`; ступень — `API_ADMISSION_RUNG=author`; каталог — `API_CATALOG_MODULES=novatrail/olympiad-math,novatrail/check-board` (R150; R79 api); обе переменные — у службы и у задания `check`: `api check` перед миграциями отказывает на ID вне индекса (строка `api` В77); пара — `api` `v0.1.48` (T92) или новее и последний `app`; поправка к R25 infra; до выкладки других аккаунтов в базе нет, а найденный — автору на решение; затем автор решает задачи модуля доски на сайте | — |
| [ ] | 6.24 | `infra` | задачи нет: по тексту T159 | пара с `api` `v0.1.51` (T94 `api`) или новее — таблица 0.4, политика 4 и выгрузка 3 (R151), выкладка до 2026-11-28; факты без `minimal_retention`; коды `api invite` другим — затем и с 2026-11-28; их читают тоже в режиме `single` (вторая поправка 2026-11-17 к R68) | 6.21 |
| [ ] | 6.25 | `api` | задачи нет: её записывает сессия `api` (строка `api` В78) | `just dev-app` (R67 api) даёт серверу заглушки факты ребёнка, как `dev-check`, и заводит у `dev-app`, если его нет, синтетического ребёнка 9 лет с согласием, подтверждённым `api consents confirm`, и печатает его ID: тетрадь `novatrail/grade-3-math` — только до 13 лет (поправка 2026-11-15 к R66 api); без правки контракта и `modules` | — |
| [ ] | 6.26 | `infra` | E6 «Переход на `spec` 0.17 и ответы на вопросы E5»: T56–T63, сделаны T56, T57, T62 и T63 | правило жизненного цикла на `eval-set/samples/` (T58; Д239) — до первой ссылки eval-набора, а ссылке замера оно не нужно; журнал чтения секретов (T59; Д20 `infra`); три проверки на проекте (T60; Д21, Д22 `infra`); итог — T61 (строка `infra` В36) | — |
| [ ] | 6.27 | `api` | задачи нет: её записывает сессия `api` вне эпика (строка `api` В73) | `access_returns` в `OwnKeyLimit` по `Outcome.AccessReturns` `tutor` `v0.1.39` или новее (T151 `tutor`; sources 2.8): потолок тарифа — 00:00 UTC первого дня следующего месяца, свой предел владельца — без срока; поправка к R80 api; релиз | — |
| [ ] | 6.28 | `api` | задачи нет: по тексту T173 и дополнению T178 | поправка уровня взрослым, `SetModuleLevel` (T178): полоса — соседняя с полосой уровня, иначе `CAUSE_BAND_NOT_NEXT`; факт — модуль, поставленная полоса, время — в журнал свидетельств для `learner-model` строки 4.20, а в карту навыков — полосу уровня и когда её поставил взрослый, в прогресс — последнюю поправку каждого модуля; выгрузка и удаление — с журналом (R135); релиз | 1.22, 4.20 |
| [ ] | 6.29 | `app` | задачи нет: по тексту T173 и дополнению T178 | в разделе взрослых за PIN у уровня модуля — «Проще» и «Сложнее», шаг на полосу, соседнюю с `level_band` карты навыков, `SetModuleLevel` (T178); у ученика, по карте навыков, — «уровень поставил взрослый» с датой, у каждого ученика (R157; privacy 7) | 6.28 |
| [ ] | 6.30 | `api` | задачи нет: по тексту T179, её делает текущий прогон оркестратора | переменная `API_READING_MODE` — `pair` или `single`, без неё `pair`; читается при старте и проверяется `api check`; `single` при ступени `full` не отказ: допуск чтения — запись пары, читатель — Haiku (R125 `tutor`), и отказ ступени — отказ допуска, `model_not_admitted`, не конфигурации (вторая поправка 2026-11-17 к R68); в `single` — релиз `tutor` строки 5.15, одно наблюдение идёт в `module-kit` без `Join` (`observation.Verdicts`) и хранится, как сведённое (R86); поправка к R25 api; релиз | 5.15 |
| [ ] | 6.31 | `infra` | задачи нет: по тексту T179, её делает текущий прогон оркестратора | `API_READING_MODE=single` у службы и задания `check` на `novatrail`, пара с `api` из строки 6.30; поправка к R25 infra; выкладка (поправка 2026-11-17 к R68; строка `infra` В44) | 6.30 |

**Пункт 7 — все репозитории (E10; R143, R145; T123; скорость CI — T166, T171, measurements 3.1).** Вне порядка repositories 6, где седьмой — `site`: когда у него появятся строки, его пункт возьмёт номер 8 (поправка 2026-11-12 к R76). Открытых строк нет: строки скорости CI, 7.13–7.25, сделаны — 7.14 в T166, остальные в T171. Следующая — 7.26.
