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


#### T240. Анализ по порогу R145: три повышения бюджетов за E11

- **Цель:** понять, почему за E11 бюджеты `docs-check` повышали трижды, и вернуть их — или принять новые пределы с причиной.
- **Почему:** порог R145 — бюджет поднят три раза после последнего анализа (T196): запись R162 — в T225 (13 КБ), T235 (16) и T230 (17), R82 — в T230 (15); после них — первый предел R166 в T245 (14); строка E11 в measurements 1.9 — 209.4 тыс. на основной вызов, на 10% выше эталона 189.7, 19 сжатий.
- **Сделать:** измерить R162 и R82 и что в них сверх R160 (пересказ, история, перечни); переписать на месте или разделить запись; если предел остаётся — причина в R145; сжатия E11 — по `tokens-report` сессий T227–T236 и T232: что читали целиком; итог — раздел measurements 1.9, «Last analysis».
- **Как проверить:** `just docs-check`; `just tokens-report --since 2026-11-18T18:24:49Z --until 2026-11-20T04:58 --classes`.
- **Разделы:** R145, R160, R162, R82; measurements 1.9, 1.14; `tools/docs-check/budgets.json`.

#### T248. Запрет чтения наборов оценки `modules` в клонах `.epics`

- **Цель:** сессия любого контейнера NovaTrail не читает `modules/*/eval/` клона `.epics/<эпик>/modules`, кроме `synthetic-*.json`, — как не читает их в клоне хоста по `.claude/settings.json` `modules` (поправка T61 к R04 `modules`).
- **Почему:** В41 `modules`, входящие T246, ответ автора 2026-11-21 — вариант (a): запрет `modules` задан относительно проекта, а клон в `.epics` читают по абсолютному пути из контейнера оркестратора и из контейнера любого другого репозитория (R166).
- **Сделать:** по документации Claude Code — запись `docs/sources.md`: абсолютный путь (`//`) в `permissions.deny`, есть ли исключение из запрета и что берёт верх; правило в `.claude/settings.json` `spec` и шаблона `repo-template/files/.claude/settings.json` — `Read(//workspaces/.epics/*/modules/modules/*/eval/*)` с исключением `synthetic-*.json`, если синтаксис его допускает, иначе — вопрос автору с вариантами; решение, которое держит настройки сессий, переписать на месте (R160); проба `claude -p` в контейнере оркестратора на выдуманном клоне — файл набора не читается, `synthetic-*.json` читается. Другие репозитории берут правило со своим следующим переходом на тег.
- **Как проверить:** `just new-repo-test`, `just session-test`, `just docs-check`.
- **Разделы:** R04 `modules`, R143, R166; `.claude/rules/new-repo.md`; В41 `modules`.
