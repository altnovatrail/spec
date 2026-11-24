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

#### T282. Записи `sources` для внешних фактов privacy, dpia, product, repositories, contracts и draft

- **Цель:** каждое утверждение о внешнем мире в `docs/privacy.md`, `docs/dpia.md`, `docs/product.md`, `docs/repositories.md`, `contracts/README.md` и `draft/` стоит на своём доказательстве по правилу T287: факт, который прогон не проверит, — на одной записи `sources`; поведение под тестом или замером — на них; документация или код на версии — на ссылке на месте; файлы NovaTrail и MathTrail — на git.
- **Почему:** T270, T271 и T275 сняли номера решений по строгому правилу ссылок; эти утверждения стояли только на номере решения, где лежала цитата, и теперь без записи — сессия не проверит факт по первоисточнику и не увидит, что он устарел.
- **Сделать:** для каждого — доказательство по правилу T287, смысл текстов не менять:
  - *записи* — законы, ICO, DPF, Usage Policies, Child Safety Guidance и прочие условия, политики и страницы без версии: многие, вероятно, уже есть в `docs/sources.md` — COPPA, законы штатов, WP260, Google Cloud, Firebase, — иначе новая из первоисточника с датой чтения и цитатой;
  - *ссылка на месте* с версией или коммитом — заголовок `X-Firebase-Client` и загрузка `apis.google.com` (код SDK Firebase на версии), Camo (документация GitHub, если у неё есть версия), размер изображения у Claude; *git* — значки и ранги standalone и MathTrail, критерий `sim` и чтение прежде сборки у canvas-api — ссылкой на репозиторий на коммите; где прогон не проверит и версии нет — запись;
  - число — запись `measurements`.
  Перечень:
  - privacy: заголовок `X-Firebase-Client` и загрузка `apis.google.com` SDK Firebase; сроки IP у Firebase Hosting и Auth; исключения и аудит Cloud Logging, Trace API и Cloud Scheduler; Gmail без договора обработчика; WP260 п. 13; COPPA §312.4(d), §312.5(b)(2)(ii), §312.5(c)(9), §312.6, §312.7; CGS §42-518 и §42-520; GBL §899-ff–ii; Arkansas Act 952; Texas §541.002(a)(3); Usage Policies OpenAI в редакции 2026-11-20 (sources 2.5 читал 2026-11-09); Child Safety Guidance for Developers Anthropic.
  - dpia: Кодекс ICO для сервиса из США, открытого детям Великобритании; цитата ICO о проверке возраста; механизмы передачи — DPF и UK Extension, SCC модуль 2 с UK Addendum, Databricks в списке DPF; страница Samaritans; страницы стандартов ICO 5, 9 и 12; числа справедливости `sim` и «1 of 560 boxes» риска 20.
  - product: ранги standalone по номерам — родители сочли имена бессмысленными (О-13, было R213 standalone): в `spec` ссылок на решения standalone нет; замер `tutor`, на котором стоит мера ложных тревог рубрики.
  - repositories: прокси Camo для значков README (цитата GitHub Docs — в журнале, не в `sources`); значки README MathTrail; критерий `sim` пишется до первого прогона кандидата (было R163 standalone); чтение прежде сборки у canvas-api.
  - contracts: стандартный размер изображения у Claude, от которого взяты пределы вырезок; провайдеры, чьи условия запрещают бенчмарки; GDPR ст. 7(3) и WCAG 2.2 3.3.1 и 3.3.3 — без записи.
  - draft: ранги MathTrail — те же, что в product; критерии WCAG 2.5.5, 1.4.10 и 2.3.3 в `draft/mockup/README.md` — к записи WCAG, если она их держит.
- **Как проверить:** `just docs-check`, временно с ключом `citations` — ошибок в двух файлах нет.
- **Когда:** после T287.
- **Разделы:** правило T287; privacy; dpia; product; repositories; sources 1; measurements 1; T270, T271, T275.

#### T292. Прогон строк 7.62–7.73 оркестратором

- **Цель:** 12 репозиториев пересмотрели `sources.md`, их PR смёржены, строки закрыты.
- **Когда:** после мержа пачки T287–T291 и тега; в контейнере оркестратора, `.devcontainer/orchestrator/`, не одновременно с задачей через репозитории E23 (T285) — у них общая папка `spec`.
- **Сделать:** процедура «Сделай эпик» на строках 7.62–7.73 вместо эпика (README оркестратора, пункт 4). Строки 7.50–7.61 закрыты (T291): узлы ничего не ждут, кроме пересборки контейнеров. Вопросы исполнителей — автору. Закрыть строки по правилу 4 COORDINATION.md; в отчёт — размеры `sources.md` до и после по репозиториям.
- **Как проверить:** строки закрыты; `[x]` задач на `main` каждого репозитория; `just docs-check`.
- **Разделы:** R156; [tools/orchestrator/README.md](../tools/orchestrator/README.md); T291.
