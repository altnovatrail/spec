# RUN.md — work plan of spec

Plan of `spec` and of organization-wide work; the order of the other repositories' tasks is [COORDINATION.md](COORDINATION.md) (R76). Context: [product](docs/product.md), [architecture](docs/architecture.md), [repositories](docs/repositories.md), [privacy](docs/privacy.md), [decisions](docs/decisions.md). Other tables, each a file opening with its rules (R153): 2, epics for later — [run/EPICS.md](run/EPICS.md); 3, questions to the author — [run/QUESTIONS.md](run/QUESTIONS.md); 4, debt — [run/DEBT.md](run/DEBT.md); 5, rows of other repositories recorded — [run/INBOX.md](run/INBOX.md). Open tasks outside an epic — [run/TASKS.md](run/TASKS.md) (R155).

Language (R154): rules and tables in English, terse, for the session; the bodies of tasks in table 1 and in `run/TASKS.md` in Russian — the author writes and reviews them.

## Rules

A task starts with «Выполни задачу T01 из RUN.md» in a new session in the devcontainer. One task — one session (R143): the hook [tools/session/](tools/session/main.mjs) stops another task's phrase in the same session. An epic across repositories starts with «Сделай эпик E…» in spec's orchestrator container, `.devcontainer/orchestrator/`: the orchestrator runs each task as a fresh `claude -p` in its repository's container and merges its pull request (R156), by [its procedure](tools/orchestrator/README.md#сделай-эпик-e); the hook counts the epic as one task. A task across repositories runs there too, as one session the author leads (R159).

1. Do only the named task; touch other tasks' files only where it requires.
2. Read first: [CLAUDE.md](CLAUDE.md), the task — in table 1, or only its own body of `run/TASKS.md` (its opening says how) —, the sections it cites, `docs/decisions.md`.
   - Conflict with the documents or something missing — stop and ask; never guess.
   - A gap is an open question, the next free number by the register's opening: О- product 13, П- privacy 9, Т- repositories 8.
   - From `run/DEBT.md` and `run/QUESTIONS.md` take only the rows the task and its sections name and those `grep -n` finds by the paths and parts it changes (R143).
3. Devcontainer only (RULES.md, Hard rules, with its cloud-session exception): on the host stop before the first edit.
4. Outside this repository — creating or configuring repositories, pushing to them, organization settings, anything that costs money — only after a warning (what, where, cost) and the author's confirmation.
   - Exception, no confirmation: «Сделай эпик E…» (R156) — running the epic's tasks in their repositories' containers, the executors' pushes and pull requests, their merge on green checks, and rebuilding and creating the containers of NovaTrail's repositories (R158). Whatever else a task does outside its repository still needs confirmation, a question in the orchestrator's queue; usage bought beyond the subscription, never.
   - Exception, no confirmation: a task across repositories (R159) — its branch, edits and local checks and servers in the clones of the repositories it names, from the orchestrator's container. Its pushes, pull requests and merges still need confirmation.
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
- **Grouping** (R159; RULES.md, How we work): the plan takes the grouping with the fewest pull requests; a pull request of its own only where a dependency needs it.
  - *A batch*: tasks of one repository in a row, none needing another's release — one branch `<epic>-<repo>`, as `e16-spec`. Where the executor commits (rule 7), a task is one commit with its bookkeeping, «Сделано» naming «ветка …», pushed, with no pull request and no checks. The last runs every local check of the batch's parts, `/code-review high` over the batch, opens one pull request, writes its number into every «Сделано», and waits on CI; the merge is a merge commit. The batch ends early at a task whose release another needs, one after which a container is rebuilt (`.devcontainer/`), or one waiting on the author. A single task has a branch of its own.
  - *A task across repositories* (R159): a task of table 1 that names its repositories, with no row of COORDINATION.md; one branch of one name in each, all the code there. One session in the orchestrator's container, `.devcontainer/orchestrator/`, writes in each and runs its checks by `docker exec` in its container (R156). Wired locally before any release — Go `replace` to the clone beside, npm by a path or `just dev-canvas`, the `spec` submodule at the branch's commit —, none of which reaches a pull request (R34, R77). Locally: each repository's unit tests and `just docs-check`; the end-to-end path is the author's check by hand on the local servers; `just walk`, `dev-check`, browsers and CI wait for the pull requests. Commits only after the author's check; then the pull requests by dependency, `spec` first: the dependency merged and released, the dependent's pins moved to the release, one round of CI each.
- **A done epic** goes to `docs/plan/<epic>.md` (R59 canvas-api): bodies and gist sentences are there already (rule 9); move its description and table of tasks verbatim; questions and debt stay in `run/`; measure — `just tokens-report --since <first day of the epic> --row` — as a row of measurements 1.9 (R145); table 1 names it as the last done epic. Never read an archive whole: take the task cited.
- **DPIA** ([docs/dpia.md](docs/dpia.md), R129): a task that changes what it rests on — a kind of data or retention, a provider or processor, an AI capability or route, opening an age, a country or a feature to children — reviews it; its «Сделано» names the review, the DPIA's log the version. Also before the beta, before the public launch and at least yearly.
- **Token savings** (R145): the limits of `docs-check` — [tools/docs-check/budgets.json](tools/docs-check/budgets.json), a raise shows in review; measure at an epic's archive and monthly (`just inbox` reminds, rule 13); a task of analysis goes to `run/TASKS.md` by the threshold of R145, and its planning decides whether it needs an epic; baselines, dates, last analysis — measurements 1.9.

## Table 1. Current epic — E11. Задача с моей бумаги

**Результат** — ученик фотографирует страницу своей книги, выбирает найденные задачи и решает каждую на своём листе под прозрачной обрезкой задачи; Check читает работу и выносит вердикт по ключу; интерфейс — как в макете «Take from my paper», одобренном автором. Это главная функция приложения, для всех профилей.
- Макет того, что получится после эпика, одобрен автором — T220.
- Решения и документы `spec`: журнал и product — T221; concepts и architecture — T222; privacy и DPIA — T223; политика конфиденциальности — T224; `admission/`, `contracts/`, типы `canvas`, `export/` — T225.
- Код в `module-kit`, `tutor`, `canvas`, `api` и `app`, на одной ветке `e11` в каждом, проверенный автором локально: среда — T226; камера и выбор задач — T227; экран решения — T228; проверка — T229; отладочный режим моделей — T233; три попытки моделей — T234; рамка с несколькими примерами — T235; просьба к ИИ, как разметить страницу, — T236; подсказки и «Show where» — T230; история и экспорт — T231.
- Ревью, коммиты, pull request во всех репозиториях, мерж и выпуск по зависимостям, архив — T232.

**Основа** — на 2026-11-18.
- **`spec`** `main` 2372aa7, `v0.18.44`. Макет `draft/mockup/` и холст claude.ai «Take from my paper» (версия 38) совпадают, кроме карточки «Take from my paper», открытой на холсте и в «First slice» ([draft/mockup/README.md](draft/mockup/README.md), «The files»). Перед планированием из макета ушли «Snap work», плашки «From your page» и «Solver key»; найденные задачи выбраны по умолчанию; Д243 закрыт.
- **`app`** `main` c434628, **`canvas`** a892613 (`v0.3.35`), **`tutor`** 563f2c6 (`v0.1.58`), **`api`** 855ced5 (`v0.1.71`), **`module-kit`** 0a22036; первые четыре на `spec` `v0.18.34`. Работы с бумагой нет нигде: у `canvas` нет слоя над листом, кроме демо, и только два вида канвы; `tutor` читает только обрезки канвы; в `contracts/` нет RPC задачи с бумаги, `Work` — только `SheetWork` и `WorkbookWork`; `admission/` не знает поиска задач, чтения условия и решения ИИ.
- **Где документы расходятся с решениями ниже:** задачи с бумаги — этап 5 (product 10, 11); вердикт только по ключу автора, решателя или взрослого (R03, R04, concepts 9.4); ИИ получает только обрезку задачи (privacy 6); выбор без ИИ (product 4); вид канвы выбирает модуль (concepts 8); метка тьютора — только рамка (concepts 8); настройки «Show where» нет (concepts 10).

**Порядок работы** — слово автора 2026-11-18, ответ на `В70` (b) и `В71` (a) таблицы 3, которые T221 записывает в RULES.md, R156, R159 и RUN.md, Epics:
- одна ветка `e11` в каждом затронутом репозитории — `spec`, `module-kit`, `tutor`, `canvas`, `api`, `app`; весь код там;
- репозитории связаны локально — Go `replace` на соседний клон, `canvas` в `app` по `just dev-canvas`, подмодуль `spec` на коммите ветки; ничего из этого не попадает в pull request (R34, R77);
- только юнит-тесты каждого репозитория и `just docs-check`; `just walk`, `dev-check`, браузеры и CI не запускаются до T232;
- автор проверяет руками локально: `api` — `just dev-app` на заглушке `tutor` или `just dev-ai` на моделях, `app` — `just dev` на `127.0.0.1:5173`;
- коммиты и pull request — только после ручной проверки автора, в T232, по одному кругу CI на pull request; мерж и выпуск по зависимостям, `spec` первым, зависимый переводит пины на выпуск;
- задачи кода T226–T232 идут в контейнере оркестратора `.devcontainer/orchestrator/` (R156): сессия пишет в клон каждого репозитория на общем томе — `~/.claude/novatrail-orchestrator/e11/`, его `README.md` (R159, *The clones*; T226) — и запускает его проверки, `api` и `app` — `docker exec` в их контейнерах; задачи `spec` T220–T225 — в контейнере `spec`;
- одна задача — одна сессия (R143); строк COORDINATION.md у E11 нет: задачи других репозиториев — здесь, каждая называет свои репозитории.

**Решено автором (2026-11-18)** при планировании эпика:
- **Для всех.** Задачи с бумаги — главная функция приложения и доступны всем профилям без ограничений: из этапа 5 — в первый срез, карточка на главной открыта. Отвергнуто: только взрослым; в E11 только `spec`, код — на этапе 5.
- **Тьютор — как в срезе.** У взрослого нейтральный: Hint, «Explain differently», озвучка; Pip приходит с детьми в E4 `app` и работает и в режиме бумаги. Поля ввода и микрофона в E11 нет: R82, О-6 и П-5 не меняются. Отвергнуто: свой текст тьютору; текст и голос.
- **Поиск задач.** Задачи на снимке всей страницы находит ИИ, и ученик может обвести задачу вручную; ручную рамку рисует макет T220. Значит, вся страница уходит ИИ: поправка privacy 6, пересмотр DPIA, новая способность в `admission/`. Отвергнуто: программа на устройстве без ИИ; только ручные рамки.
- **Ключ.** Для арифметики и уравнений с одним неизвестным — решатель: ИИ читает условие в формулу, программа вычисляет ответ. Для остальных задач ключ выводит ИИ, и его вердикт — обычные «Correct» и «Not yet», без пометки: поправка R03, R04 и concepts 9.4 для задач с бумаги. Отвергнуто: мнение ИИ с пометкой «может ошибаться» (рекомендация Claude); только подсказки, без вердикта; ключ взрослого и каталог — не в E11.
- **Обведённый вариант** читают как почерк: обрезку задачи со штрихами — два чтеца (R68), вердикт по ключу — программа; при сомнении — «обведи один вариант». Отвергнуто: кнопки вариантов.
- **«Show where»** — в E11, волнистой линией под местом первой ошибки в работе ученика, по рамке, которую `tutor` уже возвращает: новый вид метки тьютора в `canvas`; включает режим подсказок профиля. Отвергнуто: метка-рамка; без «Show where».
- **Лист — в точку, без выбора:** задача с бумаги решается на листе в точку (`GridKind` `canvas`); выбор вида листа — позже, в настройках приложения, не в этом эпике; канвы других авторов — эпик E5. Отвергнуто: переключатель листа на экране задачи; выбор в меню профиля (слово автора 2026-11-18).
- **Только история.** Фото страницы, обрезки и работа — на устройстве, в истории профиля и в экспорте; модель ученика и карта навыков не меняются (О-11; R06 и R08 learner-model). Отвергнуто: навыки задачи определяет ИИ.
- **Макет — первым** (T220): как будет после эпика; без одобрения автора эпик дальше не идёт.

**Решено при планировании (2026-11-18)** — рекомендации, которые T221 записывает, если автор не скажет иначе:
- ключ ИИ — из двух независимых решений; не совпали — «не удалось проверить», без вердикта, как два чтеца R68; пометки нет;
- «Show the solution» у задач с бумаги нет — ни с ключом решателя, ни с ключом ИИ: решение не показывается никогда (слово автора 2026-11-18; поправка к R82);
- решатель — детерминированная библиотека Go в `module-kit`, рядом с вердиктом (R61); `api` вызывает её, ключ остаётся на сервере (R05);
- «Show where» — настройка профиля в `api`; у ребёнка её ставит взрослый (с E4 `app`);
- «приложение ничего не делает за ученика» — поправкой к R05;
- фото страницы — только на устройстве, в хранилище профиля `app`; сервер не хранит ничего (R09).

**Нужно от автора:** прочитать тексты T221, T223, T224; проверить руками T226–T230 и T233–T236; лимит трат на настоящие модели в T229, T230 и T234–T236 (правило 4); подтвердить push и pull request в T232.

**Развёрнут в режиме планирования 2026-11-18** по слову автора («планируй реализацию эпика E11»).

| Статус | ID | Задача | Кто | План | Зависит от |
|---|---|---|---|---|---|
| [x] | T220 | Макет: как будет после E11 | я + Claude | — | — |
| [x] | T221 | Решения E11: журнал, product, порядок работы | Claude, проверяю я | — | T220 |
| [x] | T222 | concepts и architecture | Claude | — | T221 |
| [x] | T223 | privacy и DPIA | Claude, проверяю я | — | T221 |
| [x] | T224 | Политика конфиденциальности: новая версия | Claude, проверяю я | — | T223 |
| [x] | T225 | `admission/`, `contracts/`, типы `canvas`, `export/` | Claude | да | T222, T223 |
| [x] | T226 | Локальная среда: ветки `e11`, связка, запуск | я + Claude | — | T225 |
| [x] | T227 | Камера и выбор задач | я + Claude | да | T226 |
| [x] | T228 | Экран решения: калька и лист | я + Claude | да | T227 |
| [x] | T229 | Проверка: условие, ключ, чтение, вердикт | я + Claude | да | T228 |
| [x] | T233 | Отладочный режим: модели, их ответы и стоимость | я + Claude | да | T229 |
| [x] | T234 | Три попытки моделей: Haiku, Sonnet, Opus | я + Claude | да | T233 |
| [x] | T235 | Рамка с несколькими примерами | я + Claude | да | T234 |
| [ ] | T236 | Просьба к ИИ, как разметить страницу | я + Claude | да | T235 |
| [ ] | T230 | Подсказки и «Show where» | я + Claude | да | T233 |
| [ ] | T231 | История и экспорт | Claude | — | T229 |
| [ ] | T232 | Ревью, pull request, выпуск, архив | я + Claude | — | T220–T236 |

- T220 первой: макет — эталон, по которому пишутся документы и сверяется код.
- T221–T225 — коммиты на ветке `e11` `spec`, без pull request до T232. T226 начинает код; T227–T231 — вертикальные куски, каждый автор проверяет в браузере против макета.
- Push, pull request и мерж — только T232, с подтверждения автора (правило 4).

## Эпик E11. Задача с моей бумаги

#### T236. Просьба к ИИ, как разметить страницу

- **Цель:** ученик говорит ИИ своими словами, какие задачи на странице взять и как их разделить, и поиск задач размечает страницу заново по просьбе. Слово автора 2026-11-19 при проверке T234: на листе «Число „сбежало“» — 4 столбца по 12 примеров — ИИ не размечает примеры отдельными задачами; ученик должен мочь сказать, например, «возьми только первый столбец задач и разметь каждую задачу как отдельную», через помощника в боковой панели — кнопку тьютора на экране выбора задач.
- **Сделать:** на экране выбора задач — панель тьютора с полем просьбы; `FindTasks` с просьбой ученика и, при нужде, с рамками, которые уже стоят; новые рамки заменяют найденные, рамки, обведённые вручную, остаются. Репозитории: `spec` — решение, [текст контрактов](contracts/README.md), раздел 15, privacy и DPIA, политика, `admission/` при нужде; `tutor` — промпт поиска с просьбой ученика блоком данных, не инструкцией (R02), eval на заглушке; `api` — поле просьбы, проверки и квота; `app` — панель на экране выбора, макет `draft/mockup/`.
- **Решить при планировании:**
  - это меняет R162 — «There is no text field and no microphone» и отвергнутый там свой текст тьютору — и product 10, где свой текст — позже: слово автора 2026-11-19 — просьба своими словами; свободный текст только на экране выбора задач и только о разметке (рекомендация) или готовые просьбы кнопками — «каждый пример отдельно», «только столбец N», «только эта часть»;
  - свободный текст ребёнка — личные данные (имя в просьбе): напоминание, как у снимка (R127), длина, хранение — нигде, только в памяти запроса; П-5 и О-6 о голосе не меняются; DPIA — риск 2 и новый риск: просьба как инструкция модели, мера — блок данных и программа, проверяющая рамки (R03);
  - что ИИ получает: просьбу, снимок и текущие рамки, или только просьбу и снимок; одна попытка или каскад R164;
  - как ученик видит итог: рамки заново, «Отменить» к прежним;
  - связь с T235: поиск уже делит пример, который стоит сам по себе, на свою рамку, а рамка из нескольких задач проверяется по каждой задаче; просьба нужна для «только первый столбец» и для листа больше 20 примеров — поиск даёт первые 20.
- **Как проверить:** юнит-тесты `tutor`, `api`, `app`; автор на моделях в отладочном режиме — тот же лист и просьба «возьми только первый столбец и разметь каждую задачу как отдельную»: 12 рамок, по одной на пример.
- **Стоимость:** настоящие вызовы — только проверка автора, под лимит, который автор назовёт до запуска (правило 4).
- **Разделы:** T234, T235; R02, R03, R127, R162, R164; product 10; privacy 6; dpia 6; [contracts/README.md](contracts/README.md), раздел 15.

#### T230. Подсказки и «Show where»

- **Цель:** Hint и «Explain differently» у задачи с бумаги; волнистая линия под ошибкой при режиме подсказок.
- **Сделать:** `tutor` — слова для задач с бумаги; `canvas` — волнистая метка `WavyLineMark` (R74): светлая подложка, 3:1 над любой страницей, в дереве доступности с именем «Tutor's mark: where the mistake is»; `api` — лестница, `MARK_KIND_WAVY_LINE` только при `HINT_MODE_SHOW_WHERE`, `SetHintMode` и `hint_mode` профиля; `app` — настройка и метка.
- **Решить при планировании:** что даёт Hint до первой ошибки у задачи с бумаги — у неё нет модуля: ни приёма, ни наводящего вопроса, ни «дано и найти» — и запасной текст её ступеней (R82). Пока контракт даёт пустые техники и вопрос; если нужно другое — дополнение контракта в `spec` на ветке `e11`. У рамки из нескольких задач (T235) — о какой задаче Hint и линия: о первой неверной (рекомендация) или о каждой; слой меток задачи с бумаги и светлую подложку уже даёт метка `verdict` из T235.
- **Как проверить:** юнит-тесты; автор на заглушке и на моделях.
- **Стоимость:** как T229.
- **Разделы:** R82; concepts 10.

#### T231. История и экспорт

- **Цель:** задачи с бумаги — в истории профиля на устройстве и в экспорте; стираются с профилем.
- **Сделать:** `api` — экспорт версии 4 через `spec.Export`: `export_format_version` "4", `hint_mode` и `paper_attempts` без ключа в файле профиля — `key_sources` по задачам рамки (T235) —, `correction_id` у поправки уровня взрослым; `api` выходит первым (R135); `app` — хранилище работ с бумаги, файлы `paper/` экспорта версии 4, типы `@altnovatrail/spec/exportv4`.
- **Как проверить:** юнит-тесты `api`, `app`; автор видит историю и выгружает экспорт.
- **Разделы:** R135; privacy 4.1; [export/README.md](export/README.md), разделы 3–5.

#### T232. Ревью, pull request, выпуск, архив

- **Цель:** всё, что автор проверил, — в `main` каждого репозитория и в выпусках.
- **Сделать:** `/code-review high` в каждом репозитории, один круг; коммиты в клонах на томе, ветка — в клоны хоста по `README.md` тома (T226); номер pull request `spec` — в журнал версий DPIA, версия 31; связка заменена пинами; pull request — `spec` первым и его тег, затем `module-kit`, `tutor`, `canvas` и их выпуски, затем `api` и `app` с пинами на них; по одному кругу CI; мерж; разбор входящих (правило 13); архив эпика и замер (R145).
- **Как проверить:** зелёный CI каждого pull request; `just docs-check`.
- **Мой шаг:** подтвердить push и pull request (правило 4).
- **Разделы:** R159; RUN.md, Epics.
