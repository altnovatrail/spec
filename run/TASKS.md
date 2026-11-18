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

- **Цель:** анализ расхода токенов `spec` по порогу R145 — третье повышение предела `tools/docs-check/budgets.json` с последнего анализа (E10, T118–T128, 2026-11-11): `DEBT.md` в T156, `COORDINATION.md` в T167, `dpia 1` в T195; четвёртое — `RULES.md` до 15 KB в T198 (поправка 2026-11-17 к R143). Планирование решает, нужен ли эпик (R145).
- **Почему:** порог R145, measurements 1.9. Журнал версий dpia 1 растёт на строку с каждой версией DPIA, по нескольку в день, и скоро снова перерастёт предел. Это первый кандидат анализа: свой раздел журналу или вынос старых строк из документа.
- **Сделать:** замер `just tokens-report` с последнего анализа; что растёт и почему; предложения с оценкой выгоды — решения автору.
- **Как проверить:** `just docs-check`; `/code-review high`, один круг.
- **Разделы:** R143, R145; measurements 1.9; T156, T167, T195.
