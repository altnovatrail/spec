# COORDINATION.md — cross-repository plan of NovaTrail

The order in which the other repositories' tasks lead to the plan's goal, and which waits for which (R76). Tasks live in their repositories' RUN.md (R19); a row names them. Items follow repositories 6. spec's own plan — [RUN.md](RUN.md). Language (R154): rules in English, «Порядок» in Russian.

## Rules

The coordinator is a session of `spec`, started by «Что дальше по COORDINATION.md?» in spec's devcontainer. It changes no other repository: it reads them on GitHub and tells the author which task to run, where and with what phrase.

1. Read [CLAUDE.md](CLAUDE.md), this file, R76 and the decisions the open rows cite.
2. Devcontainer only (RUN.md rule 3).
3. Each open row's status from GitHub, read only — the copies in `.repos/` lag:
   - RUN.md and `run/EPICS.md`: `gh api repos/altnovatrail/<repo>/contents/<file> -H "Accept: application/vnd.github.raw"`;
   - the tag of its `spec` submodule: `gh api repos/altnovatrail/<repo>/contents/spec --jq .sha` against `gh api repos/altnovatrail/spec/tags`;
   - open pull requests: `gh pr list -R altnovatrail/<repo> --state open`;
   - rows «в реестр spec» not recorded: `just inbox` (R81) — name them; spec's session triages them (RUN.md rule 13).
4. A task is done when `[x]` on its repository's `main`. A row whose tasks are all done, or that is `[-]` by that repository's RUN.md, is deleted, and its number leaves «Зависит от». Numbers are not reused: each item names its next free one. In an open row, done tasks are numbers only, «сделаны T01–T05». `[?]` stays, with its reason. Rows closed by 2026-11-15, which older texts cite: `git show 6eb3243:COORDINATION.md`, section «Закрытые строки».
5. Name the next task from the first open row whose «Зависит от» is done: repository and task number; the phrase «Выполни задачу Txx из RUN.md»; where — the container of that repository's clone (CLAUDE.md, Environment), a `spec` task here; which other rows wait only on done ones — any order.
6. A task not yet in its repository (a code epic, a move to a tag): give its session a text in Russian — «Цель», «Сделать», «Как проверить», «Разделы», and in «Почему» R76 spec and the row number. That session records and numbers it; then write the number into the row.
7. Inside a repository its RUN.md wins — a task's number, title, internal dependency: fix the row here. A conflict of order between repositories is a question to the author: a row of [run/QUESTIONS.md](run/QUESTIONS.md).
8. Never run other repositories' tasks or edit their files (`.repos/` too; RULES.md, Across repositories), decide for the author — a new decision is a question with options and a recommendation —, or commit.
9. A new question across repositories goes to spec's register, next free number: О- (product 13), П- (privacy 9), Т- (repositories 8).
10. End with a short report in Russian: rows done, what is next and with what phrase, what waits for what. The file keeps no state.

**Statuses:** `[ ]` open; `[?]` deferred — the author's decision, reason and when to return in the row.

**Citations:** another repository's task — «T01 `module-kit`», its decision — «R03 api»; a `spec` task — «T48»; a row — «строка 3.3».

## Порядок

Цель — первый срез со взрослыми: на развёртывании строки 6.9 учатся взрослые — автор и взрослые из США по коду `api invite` — с телефона, планшета и компьютера: рукопись, уроки, движок и слова наставника под квотой ИИ платформы, по E3 `app`; пока учится только автор, ИИ платформы ему открывает строка 6.21 (R76 и её поправки 2026-11-12–2026-11-15; R149). Не входят: дети (T117, R147; Д240) и проверки на настоящих устройствах (R146).

Задачи внутри строки идут по RUN.md своего репозитория. В «Зависит от» — номера открытых строк; «—» — строка ждёт только сделанного.

**Пункт 1 — `spec`.** Открытых строк нет; следующая — 1.22.

**Пункт 2 — `.github`.** Открытых строк нет; следующая — 2.5.

**Пункт 3 — `module-kit` и `modules`.** Открытых строк нет; следующая — 3.11.

**Пункт 4 — `learner-model`, `engine` и `sim`.** Библиотеки меняются через гейт `sim`. Кругов суда по плану нет: суд `sim` разворачивает эпиком, когда библиотека приносит кандидата и называет его причину (R59 sim). Первый — круг справедливости по классу, строки 4.17 и 4.18: база не держит критерий (R58 sim), а его ждёт первый ребёнок (dpia 8). Следующая — 4.20.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 4.17 | `learner-model` | круга нет: его записывает эпиком сессия `learner-model` (строка `sim` В24), а место в E7 «Третий круг кандидатов модели» (сделана T51; T52–T55) решает автор | круг справедливости по классу (R58 sim; поправка 2026-11-15 к R147): почему со старта на 2,5 выше правды модель сходит к ней за 83 ответа, а снизу поднимается за 33; кандидаты, что поднимают `M11.same` у `D-grade5` и `D-grade1` к 0,90 при критерии модели как есть, — и иной старт по классу (concepts 11; R51), тогда строкой «в реестр spec»; суд — строка 4.18; итог — строкой «в реестр spec» для dpia 10.2 и dpia 8. Суда `model-3` в очереди `sim` нет (R59 sim): T54 ждёт причины, а не очереди — кандидаты с причиной или выход (строки `learner-model` В50, `sim` В16) | 4.18 — для суда |
| [ ] | 4.18 | `sim` | E10 «Суд круга справедливости модели» таблицы 2: его разворачивает сессия `sim`, когда `learner-model` возьмёт круг строки 4.17 (R59 sim) | критерий до первого кандидата, как у `engine-lesson-1` (R49 sim): своя папка и отложенный набор (R52 sim), критерий модели как есть, цель — `M11.same` у `D-grade1` и `D-grade5` (строка `sim` В22, вариант (а)); тег `v0.1.20` или позже (поправка к R57 sim); суд и подтверждение — или выход; итог — строкой «в реестр spec» для dpia 10.2 | 4.17 — для суда; критерий — нет |

**Пункт 5 — `tutor` и `canvas`.** Идут раньше пунктов 3 и 4, как шёл их код (repositories 6). Следующая — 5.14.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 5.11 | `canvas` | задачи нет: её записывает сессия `canvas` по тексту T157, вне эпика или эпиком (третья поправка 2026-11-14 к R76) | переход на тег `spec` с T157; среда эталона в трёх движках (Д244); панель инструментов — вертикальная стеклянная полоса эталона: свойства стиля ставит `app`, раскладка — от ширины до 320 CSS px, доступность прежняя (R148; R28–R73 canvas); без «Up», «Down», «Left» и «Right», 2.5.7 — объявленное несоответствие (вторая поправка 2026-11-14 к R90; Д242); новое свойство стиля или атрибут — строкой «в реестр spec» (R36); снимки против эталона без автора (R146); релиз в npm | — |
| [ ] | 5.12 | `tutor` | задачи нет: её записывает эпиком сессия `tutor`, когда автор его откроет (строка `api` В72) | записи допуска на моделях Anthropic: `CallWorkbook` и `CallEssay` — `handwriting_reading` на промптах тетради и чтения сочинения, `CallRubric` — `rubric_assessment` на промпте оценки (R70); ступени `author` и `full` (R80 tutor), `adult`, ИИ платформы и свой ключ; ожидаемые токены каждого вида для `Price`; платные прогоны eval — шаг автора; релиз. До неё `ReadWorkbook`, `ReadEssay` и `AssessEssay` — `NotAdmitted`; нужна до модуля с тетрадью или сочинением в каталоге развёртывания (R150) | — |
| [ ] | 5.13 | `tutor` | задачи нет: её записывает сессия `tutor`, вне эпика (строка `api` В73) | срок возврата доступа своего ключа в `Outcome.Limit` у Anthropic (sources 2.8): потолок тарифа — 429 `enforced_spend_limit_reached` без `retry-after` — 00:00 UTC первого дня следующего месяца; свой предел владельца — 400 `invalid_request_error`, срок лишь в тексте сообщения — без срока, текст не разбирать; релиз; затем `api` ставит `access_returns` задачей, которую запишет его сессия (закрытая строка 6.22; строка `api` В73) | — |

**Пункт 6 — `api`, `app`, `skill-map` и `infra`.** Следующая — 6.27.

| Статус | № | Репозиторий | Задачи там | Что нужно | Зависит от |
|---|---|---|---|---|---|
| [ ] | 6.14 | `app` | E3 «Первый срез со взрослыми учениками»: T35–T52 и T56–T60, сделаны T35–T46, T49, T50 и T57–T60, T51 и T56 — `[-]`, вошли в T57; вне эпика сделаны T53–T55 (строка 7.4) и T61 | сочинения T47 и тетрадь T48 — на заглушке с E13 `api` (закрытая строка 6.22), тетрадь в `just dev-app` — с ребёнком строки 6.25, на моделях — с релизом `tutor` строки 5.12 у `api`, без правки `app`; E3 их не ждёт: на сайте таких модулей нет (R150; строка `api` В72; вторая поправка 2026-11-15 к R76); отказ своего ключа с причиной предела — с T85 и T86 `api` (строки `app` В65, `api` В73; Д22 `app`), `access_returns` — после строки 5.13; итог — T52; Д23 `app` устарел — «`ListOwnKeyProviders` пуст до П-16 (R72 api)», а со ступенью `author` в нём Anthropic: правит переход `app` на `api` `v0.1.48` или новее (закрытая строка 6.20) | 6.25 — для T48 |
| [ ] | 6.18 | `app` | задач нет: эпик «Интерфейс по эталону» записывает сессия `app` по тексту T157, место среди E3 и E4 `app` решает автор (третья поправка 2026-11-14 к R76) | переход на тег `spec` с T157 (Д25 `app`); среда эталона в трёх движках (Д244); экраны первого среза в стиле эталона на телефоне, планшете и компьютере, поведение прежнее (R148 и её поправки); поправка к R17 app — цвета эталона с заменами раздела «Contrast» его README; снимки эталона и своих экранов в трёх движках и двух размерах, сравнение без автора (R146); панель и 2.5.7 на странице «Accessibility» — с релизом `canvas` строки 5.11 (Д24 `app`); карточка модуля — на `./states` строки 6.19; экраны детей E4 `app` — по эталону | 5.11 — для панели и 2.5.7, 6.19 — для карточки; остальное — нет |
| [ ] | 6.19 | `skill-map` | задачи нет: её записывает сессия `skill-map` вне эпика по тексту T157 (третья поправка 2026-11-14 к R76) | переход на тег `spec` с T157; вторая точка входа `./states` — правило состояний R03 skill-map одной функцией (на входе граф, ответ `GetSkillMap` и время, на выходе состояния и метки навыков) поправкой к R08 skill-map, что держала ядро вне `exports`; `docs/architecture.md` `skill-map`: слова и значки семи значений — в таблицах architecture 6, их показывает и легенда карточки `app`; релиз в npm | — |
| [ ] | 6.21 | `infra` | задачи нет: её записывает сессия `infra` вне эпика по тексту T158, `api` готов (R149; R29 infra) | ключ Anthropic платформы — секрет Secret Manager, том `API_ANTHROPIC_KEY_FILE` (R46 api), после лимита трат рабочей области, шага автора (Д11 `api`); факты `{"anthropic": {"data_processing_agreement": ["adult"], "minimal_retention": ["adult"]}}`; ступень — `API_ADMISSION_RUNG=author`; каталог — `API_CATALOG_MODULES=novatrail/olympiad-math,novatrail/check-board` (R150; R79 api); обе переменные — у службы и у задания `check`: `api check` перед миграциями отказывает на ID вне индекса (строка `api` В77); пара — `api` `v0.1.48` (T92) или новее и последний `app`; поправка к R25 infra; до выкладки других аккаунтов в базе нет, а найденный — автору на решение; затем автор решает задачи модуля доски на сайте | — |
| [ ] | 6.23 | `api` | задачи нет: по тексту T159 | переход на тег `spec` с T159: таблица 0.4, политика 4 и выгрузка 3 (R151); выкладка до 2026-11-28; тем же переходом — поправка к R71 api: задачи модуля доски «not admitted» на развёртывании со ступенью `full`, а на `novatrail` ступень `author` (R149) | — |
| [ ] | 6.24 | `infra` | задачи нет: по тексту T159 | пара с `api` строки 6.23; факты без `minimal_retention`; коды `api invite` другим — затем и с 2026-11-28 | 6.21, 6.23 |
| [ ] | 6.25 | `api` | задачи нет: её записывает сессия `api` (строка `api` В78) | `just dev-app` (R67 api) даёт серверу заглушки факты ребёнка, как `dev-check`, и заводит у `dev-app`, если его нет, синтетического ребёнка 9 лет с согласием, подтверждённым `api consents confirm`, и печатает его ID: тетрадь `novatrail/grade-3-math` — только до 13 лет (поправка 2026-11-15 к R66 api); без правки контракта и `modules` | — |
| [ ] | 6.26 | `infra` | E6 «Переход на `spec` 0.17 и ответы на вопросы E5»: T56–T61 | переход на `spec` `v0.17.12` (T56); тексты по ответам на В24–В35 (T57); правило жизненного цикла на `eval-set/samples/` (T58; Д239) — до первой ссылки eval-набора, а ссылке замера оно не нужно; журнал чтения секретов (T59; Д20 `infra`); три проверки на проекте (T60; Д21, Д22 `infra`); итог — T61 (строка `infra` В36) | — |

**Пункт 7 — все репозитории (E10; R143, R145; T123).** Вне порядка repositories 6, где седьмой — `site`: когда у него появятся строки, его пункт возьмёт номер 8 (поправка 2026-11-12 к R76). Открытых строк нет; следующая — 7.13.
