<!--
The standard text of wave 0 of «Сделай эпик E…» (tools/orchestrator/README.md, section 3; R156). The
orchestrator fills in the fields in angle brackets and gives the text as the task's prompt, after
the line that names its number; the executor records it in its plan and does it. The text is in
Russian, as the bodies of tasks are (R154); it follows T56 of sim and the text of T123 of spec.
Fields: <репозиторий>; <тег> — spec's latest release; <прежний тег> — the tag its submodule is on;
<эпик> — the epic of spec the run is for; <вид> — the repository's kind in
repo-template/kinds.json: docs, go or typescript; <карточка> — the number of the component's card in architecture 3, such as 3.9.
-->
#### Переход на тег `spec` <тег>

- **Цель:** `<репозиторий>` стоит на последнем теге `spec`, <тег>, — его правила, план и документы по этому тегу, — и остальные задачи эпика <эпик> `spec` идут здесь на нём.
- **Почему:** R156 spec — волна 0 прогона «Сделай эпик E…»: оркестратор первым переводит каждый репозиторий эпика на последний тег `spec`; переход — задача и решение журнала (RULES.md spec, Across repositories). Задача вне эпика или в текущем эпике — по правилам этого RUN.md.
- **Сделать:**
  1. `gh release verify <тег> -R altnovatrail/spec`; подмодуль `spec/` — на <тег>; где репозиторий берёт модуль Go или пакет npm `spec` — та же версия, пакет npm — через `release-verify-npm` (R77 spec); тег — везде, где этот репозиторий его называет: CLAUDE.md, README, начало RUN.md, статус `docs/architecture.md`.
  2. Что теги после <прежний тег> до <тег> несут этому репозиторию: `git -C spec log --oneline <прежний тег>..<тег>`; строки таблицы 4 `spec` с именем репозитория в обратных кавычках — `grep -n '`<репозиторий>`' spec/run/DEBT.md`; карточка architecture <карточка> spec; RULES.md spec. Что из них берёт эта задача, а что — задача своя, решает сессия; отложенное — строкой таблицы 4.
  3. Заготовка `spec/repo-template/` (repositories 2.2 spec): `just new-repo-draft <репозиторий> <вид> <карточка> <тег>` на клоне `spec` <тег> во временной папке, как T56 `sim`. `.devcontainer/`, `.claude/`, CLAUDE.md, правила RUN.md и раскладка таблиц плана — по ней, где она изменилась, с отличиями, которые держат решения этого журнала.
  4. Решение журнала о переходе — что тег принёс и что взято —, поправки к записям, которые он меняет; строки таблиц 3 и 4, которые тег закрывает.
  5. Переход больше одного ревью — разбить по правилу 11: эта задача — первая часть, остальные — следующими задачами, и назвать их в отчёте.
- **Как проверить:** `just -f spec/justfile docs-check-repo` на новом теге — зелёный; проверки частей, которые задача меняет, — правило 6 этого RUN.md; `/code-review high`, один круг.
- **Мой шаг:** если задача меняет `.devcontainer/` — назвать это в отчёте: после мержа автор пересобирает контейнер, и оркестратор ждёт этого перед следующей задачей.
- **Разделы:** R156 spec, R76 spec; RULES.md spec; repositories 2.2 spec; карточка architecture <карточка> spec.
