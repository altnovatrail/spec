# QUESTIONS.md — questions to the author of spec

Table 3 of [RUN.md](../RUN.md): the author's open questions from tasks' «Открыто» (R153, R154).

- Never read whole: take the rows the task and its sections name — `grep -n '^| В35 ' run/QUESTIONS.md`.
- A row comes from a task's «Открыто» (RUN.md rule 9). Record the author's answer where it belongs — the task, a document or [DEBT.md](DEBT.md) — and delete the row.
- Rows «в реестр spec» of other repositories are triaged by RUN.md rule 13 into table 5, [INBOX.md](INBOX.md), not here.

## Table 3. Questions to the author

Numbers are not reused: next — В44.

| ID | Question | From | Options | Recommendation |
|---|---|---|---|---|
| В42 | Где оркестратор запускает CLI Dev Containers для пересборки и создания контейнера (T193; поправка к «Where» R156 и к R158)? `devcontainer up` нужен клон по пути хоста (sources 9.5), а контейнер оркестратора видит только папку spec | RUN.md, T193 | (1) вспомогательный контейнер: на время сборки оркестратор запускает `docker run --rm` своего же образа — сокет Docker, сеть хоста (для `initializeCommand` с MTU хоста), папка клона хоста по тому же пути, для нового клона — папка рядом со spec; в нём git клонирует `main` с GitHub и CLI собирает; конфигурация оркестратора не меняется, автору пересобирать нечего; проверено 2026-11-17: `.github` пересобран за 15 с, временный клон создан за 9 с; (2) смонтировать папку клонов хоста в контейнер оркестратора по тому же пути и звать CLI там — правка `.devcontainer/orchestrator/devcontainer.json` и пересборка его автором, контейнер оркестратора всегда видит и может менять все клоны, а проверить это в T193 нельзя; (3) не делать: пересборка остаётся вопросом автору | (1): работает уже сейчас и проверено; клоны видны только на время одной сборки, и сокет — тот же root на хосте, что у оркестратора |
| В43 | Окно VS Code, открытое на репозитории, когда оркестратор пересобирает его контейнер (T193; R158)? | RUN.md, T193 | (1) пересобирать, не ища окна: отказ — только когда в контейнере работает Claude Code (сессия исполнителя или сессия в окне, по `docker top`); окно без Claude теряет контейнер, автор открывает его снова «Reopen in Container», а правило «окна репозиториев эпика закрыты, пока он идёт» уже в README оркестратора; (2) искать окно по процессу Dev Containers с `VSCODE_REMOTE_CONTAINERS_SESSION` — признак нигде не описан, найден пробой 2026-11-17, — и при окне — вопрос автору, репозиторий ждёт; (3) перед каждой пересборкой — вопрос автору, закрыто ли окно | (1): сессию Claude Code `docker top` видит надёжно, а признак окна не документирован и может пропасть с новой версией Dev Containers |
