<!--
The standard text of wave 0 of «Сделай эпик E…». The orchestrator fills in the fields in angle
brackets and gives the text as the task's prompt, after the line that names its number; the
executor records it in its plan and does it. The text is in Russian, as the bodies of tasks are.
Fields: <репозиторий>; <тег> — spec's latest release; <прежний тег> — the tag its submodule is on;
<эпик> — the epic of spec the run is for; <вид> — the repository's kind in
repo-template/kinds.json: docs, go or typescript; <карточка> — the number of the component's card among the components of spec's docs/architecture.md, such as 3.9.
-->
#### Переход на тег `spec` <тег>

- **Цель:** `<репозиторий>` стоит на последнем теге `spec`, <тег>, — его правила, план и документы по этому тегу, — и остальные задачи эпика <эпик> `spec` идут здесь на нём.
- **Почему:** волна 0 прогона «Сделай эпик E…»: оркестратор первым переводит каждый репозиторий эпика на последний тег `spec`; переход — задача и её коммит, не запись журнала. Задача вне эпика или в текущем эпике — по правилам этого RUN.md.
- **Сделать:**
  1. `gh release verify <тег> -R altnovatrail/spec`; подмодуль `spec/` — на <тег>; где репозиторий берёт модуль Go или пакет npm `spec` — та же версия, пакет npm — через `release-verify-npm`; тег — в строках CLAUDE.md и RUN.md, которые его называют; другой документ тега не называет, а называет подмодуль, и README.md раздела «Status» не держит.
  2. Что теги после <прежний тег> до <тег> несут этому репозиторию: `git -C spec log --oneline <прежний тег>..<тег>`; строки таблицы 4 `spec` с именем репозитория в обратных кавычках — `grep -n '`<репозиторий>`' spec/run/DEBT.md`; карточка компонента в `spec/docs/architecture.md`; `spec/RULES.md`. Что из них берёт эта задача, а что — задача своя, решает сессия; отложенное — строкой таблицы 4.
  3. Сначала — `just -f spec/justfile devcontainer-outdated`, его вывод — в отчёт: что репозиторий отставал. Затем заготовка `spec/repo-template/`: `just new-repo-draft <репозиторий> <вид> <карточка> <тег>` на клоне `spec` <тег> во временной папке. `.devcontainer/`, `.claude/`, CLAUDE.md, правила RUN.md и раскладка таблиц плана — по ней, где она изменилась, с отличиями, которые держат решения этого журнала.
  4. После шага 3 — `just -f spec/justfile devcontainer-outdated` снова: поднять всё, что она ещё называет, — свои расширения репозитория тоже, — пока она не выйдет с 0. Смена мажорной версии — сначала её changelog; ломает настройки `devcontainer.json` — последняя минорная старой мажорной, причина — в отчёт. `CLAUDE_CODE_VERSION` выше, чем у тега `spec`, — по строке Д251 `spec`: `headless.md` и changelog, и `claude -p` новой версии входит по подписке; иначе — версия тега `spec` и вопрос в таблице 3.
  5. Коммит перехода говорит, что тег принёс и что взято; записи журнала, которые тег меняет, переписываются на месте; строки таблиц 3 и 4, которые тег закрывает, закрываются.
  6. Переход больше одного ревью — разбить по правилу этого RUN.md о задаче больше одного ревью: эта задача — первая часть, остальные — следующими задачами, и назвать их в отчёте.
- **Как проверить:** `just -f spec/justfile docs-check-repo` на новом теге — зелёный; `just -f spec/justfile devcontainer-outdated` — 0; проверки частей, которые задача меняет, — по правилу этого RUN.md о проверках частей; `/code-review high`, один круг.
- **Мой шаг:** если задача меняет `.devcontainer/` — назвать это в отчёте: после мержа автор пересобирает контейнер, и оркестратор ждёт этого перед следующей задачей.
- **Разделы:** карточка компонента в `spec/docs/architecture.md`; `spec/RULES.md`; `spec/repo-template/`.
