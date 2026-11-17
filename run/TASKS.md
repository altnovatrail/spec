# TASKS.md — tasks outside an epic of spec

Open tasks outside the current epic, each as its body, in Russian (R154, R155).

- Never read whole: a session reads only its own task — `grep -n '^#### T' run/TASKS.md` lists them, `awk '/^#### T117\./{p=1;print;next} /^#### /{p=0} p' run/TASKS.md` gives one body.
- A new task outside an epic goes here as a body, its number the one free when it is written down (RUN.md, Citations). When done, the body leaves for the archive (RUN.md rule 9).

## Tasks outside an epic

#### T117. Набор `child-sample` — в силу

- **Цель:** набор `child-sample` — `child-sample-notice` и `child-sample-form` — в силе, и страница образцов `canvas` открывает сеансы детей, когда у оператора есть закрытый бакет для их образцов (R125; Д156).
- **Сделать:** вычитать тексты против R124–R126, R133 и R137–R141 — как T111 наборы для взрослых: «Who we are» и «Why we may» — ст. 6(1)(a) и 8, проверка, как у профиля ребёнка, — путь отзыва, почта на Gmail и запрос без данных ребёнка; снять пометки *Draft*; перевести тексты и набор в `in_force` с датой; DPIA — пересмотр по R129.
- **Когда:** после того как `infra` создаст бакет (Д156): до того тексты в силе описывали бы хранилище, которого нет (R141).
- **Мой шаг:** вычитать и утвердить.
- **Как проверить:** `just legal-check`; `just docs-check`; `/code-review high`.
- **Разделы:** privacy 4, 7; R124–R126, R133, R139, R141; Д156; T99, T111, T112.

#### T196. Анализ токенов по порогу R145: третье повышение бюджета

- **Цель:** анализ расхода токенов `spec` по порогу R145 — третье повышение предела `tools/docs-check/budgets.json` с последнего анализа (E10, T118–T128, 2026-11-11): `DEBT.md` в T156, `COORDINATION.md` в T167, `dpia 1` в T195. Планирование решает, нужен ли эпик (R145).
- **Почему:** порог R145, measurements 1.9. Журнал версий dpia 1 растёт на строку с каждой версией DPIA, по нескольку в день, и скоро снова перерастёт предел. Это первый кандидат анализа: свой раздел журналу или вынос старых строк из документа.
- **Сделать:** замер `just tokens-report` с последнего анализа; что растёт и почему; предложения с оценкой выгоды — решения автору.
- **Как проверить:** `just docs-check`; `/code-review high`, один круг.
- **Разделы:** R143, R145; measurements 1.9; T156, T167, T195.

#### T197. README — только описание компонента и его место в архитектуре

- **Цель:** README.md spec — только общее описание spec и его место среди репозиториев NovaTrail (что он делает, с кем связан, ссылка на `docs/`); заготовка `repo-template/` даёт такой же README каждому репозиторию. Ни одной команды, ни разделов «Releases», «Contributing», «Install», «Build and run» и им подобных.
- **Почему:** слово автора 2026-11-17, дословно: «давай вообще уберём все команды из readme.md — этот подход уже устарел. никто из программистов не будет запускать команды вручную. всё будут делать агенты. Давай в readme оставим просто общее описание компонента и его место в архитектуре приложения и всё». Раньше в тот же день: Contributing — «засунь его в docs в README.md»; подробности сборки и запуска — «в отдельном документе»; без нюансов вроде «The map's own words are in English and Russian» — языки меняются. Прогон всего «Порядка» COORDINATION.md оркестратором (R156; слово автора 2026-11-16).
- **Сделать:**
  - README.md: заголовок, бейджи, один-три абзаца — что это за компонент и зачем, — и его место в архитектуре: с какими компонентами он связан и как (одной фразой или коротким списком), ссылка на `docs/`. Больше ничего: ни команд, ни блоков кода, ни инструкций, ни статуса, версий, дат, чисел и языков.
  - «Repositories», «Releases», «Documents», «Contributing» — в `docs/README.md` или в существующие документы (repositories держит список репозиториев); что уже есть в `docs/`, CLAUDE.md, justfile или RUN.md — просто убрать из README.
  - Заготовка `repo-template/` (README заготовки в `files/` и `kinds/`, `docs/README.md` заготовки, если нужен, `just new-repo`, его тест) — по этому правилу.
  - Поправка 2026-11-17 к R21 (и к записям, которые держат разделы README), с «Почему» (слово автора) и «Отвергнуто» (README как руководство с командами).
  - `.bestpractices.json`: ответы, которые ссылаются на разделы README (сборка, участие, релизы), — на новое место; тогда ссылка автору на форму с `overrides` (CLAUDE.md).
  - Что ссылается на убранные разделы или якоря README (`grep -rn 'README' RUN.md run/ docs/ CLAUDE.md AGENTS.md .claude/ tools/ scripts/ .github/ 2>/dev/null`), проверки и тесты, которые требуют эти разделы, — на новое место.
  - Остальные репозитории делают свою часть в задачах этого же прогона: module-kit, learner-model, engine, tutor, canvas, app, api, skill-map; строки «Порядка» не нужно. sim, modules, infra и .github автор не назвал — их README эта волна не трогает.
- **Как проверить:** `just docs-check`; проверки частей, которые задача меняет (new-repo — `just new-repo-test`); `/code-review high`, один круг.
- **Разделы:** README.md, docs/; R21, R48; repositories 2.2, 2.3; `repo-template/`; `.bestpractices.json`.
