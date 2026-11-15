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

#### T166. Скорость CI: стадия `toolchain-core`, apt из снимка и тесты `spec`

- **Цель:** релиз и проверки, которым не нужны браузеры, идут в лёгкой стадии `toolchain-core`; apt шаблона не читает живой архив Ubuntu; job «Documents and tools» `spec` идёт вдвое быстрее. Другие репозитории берут это тегом `spec` — строки 7.13–7.25 [COORDINATION.md](../COORDINATION.md).
- **Почему:** [measurements](../docs/measurements.md) 3.1:
  - релиз `app` строит всю стадию с браузерами и 341 пакетом apt ради `release-version`, и «Work out the version» идёт 391 с, у `canvas` — до 826 с;
  - `apt-get update --snapshot` тянет 67,6 МБ индексов живого архива и снимка, а `snapshot.ubuntu.com` отдаёт от 259 кБ/с;
  - шаг Tests `spec` идёт 425 с — около 9 процессорных минут, — и больше всего в нём `admission-check`, `format-check` и `new-repo`: каждый случай тестов заново разбирает Markdown документов копии.
  Строка 7.14; шестая поправка 2026-11-15 к R76; решение автора 2026-11-15.
- **Сделать:**
  - стадия `toolchain-core` — база, Node, just, Go и buf — в `.devcontainer/Dockerfile` `spec` и в Dockerfile видов [шаблона](../repo-template/README.md); `toolchain` строится над ней, devcontainer — над `toolchain`; `toolchain.sh build` выбирает стадию;
  - поправка к R31: релиз строит `toolchain-core` из Dockerfile, без кеша, а `toolchain` — только когда его рецептам нужны браузеры;
  - `repo-template/kinds/typescript.Dockerfile`: apt читает только снимок — свой источник снимка вместо `ubuntu.sources` базы; набор пакетов прежний (R40);
  - тесты `tools/`: разобранный документ — кешем в процессе по пути и хешу содержимого, у каждой проверки, что читает документы; `coverage` — частями через `node --test --test-shard` в 2–3 job, и каждый отчёт lcov — в Codecov (R48);
  - текст задачи `.github` для строки 7.13: что она берёт из тега этой задачи.
- **Решить при планировании:**
  - что входит в `toolchain-core`: что нужно `release-version` и `release-files` `spec` и каждого вида;
  - на сколько частей делить тесты;
  - нужен ли кеш разбора и `docs-check`.
- **Как проверить:**
  - `just docs-check` и `just coverage`;
  - проверки тронутых частей по их правилам: `ci`, `tools` и `new-repo`;
  - сборку стадий — CI pull request: docker в devcontainer нет;
  - `/code-review high`.
- **Разделы:** measurements 2.1, 3.1; R30, R31, R34, R40, R48, R76, R79.
