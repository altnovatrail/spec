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

#### T330. Документы без русского текста: метка «для реестров spec» по-английски, цитаты spec — по-английски

- **Цель:** в `docs/` любого репозитория NovaTrail нет русского текста, который требуют правила `spec`: метка строки таблицы 3 для `spec` — английская, а записи `docs/sources.md`, цитирующие русский текст `spec`, — по-английски.
- **Почему:** В46 `.github`, разбор входящих 2026-11-26 — ответ автора: «русские цитаты не нужны, всё на английском» (вариант (a) с цитатами без исключения).
- **Сделать:**
  - английская метка, например «For spec's registers», вместо «В реестр spec» — RULES.md, шаблон (`repo-template/files/RUN.md`, `run/QUESTIONS.md`), RUN.md и `run/` `spec`, `tools/inbox/` (`MARK` и его тесты: на переходное время — обе метки, старая уходит, когда её не останется ни в одной таблице 3), решения, которые её называют;
  - запись `docs/sources.md`, цитирующая русский текст `spec` (COORDINATION.md «Порядок», старые решения, тела задач), — на нынешний английский текст `spec`, а где его нет — на английский пересказ, помеченный как пересказ; правило RULES.md о цитатах на языке источника — исключение для текстов NovaTrail;
  - другие репозитории берут правило своим следующим переходом на тег; `.github` — своей задачей по В46.
- **Как проверить:** `just inbox-test`, `just new-repo-test`, `just docs-check`; `just inbox` видит строки с обеими метками.
- **Разделы:** RULES.md — язык и метка; R81, R154; В46 `.github`.

#### T331. Шаблон вида `typescript`: Playwright 1.65.1

- **Цель:** `repo-template/kinds/typescript.Dockerfile` берёт браузеры из того же образа Playwright, что и пакет `playwright` репозиториев, и `new-repo-draft` на следующем теге не возвращает `canvas` к браузеру, которого его пакет не находит.
- **Почему:** В89 `canvas`, разбор входящих 2026-11-26 — ответ автора, вариант (a): `spec` поднимает образ шаблона.
- **Сделать:** образ `mcr.microsoft.com/playwright:v1.65.1-noble` с дайджестом из `.devcontainer/Dockerfile` `canvas` (`main` 988b8ca, сверить с реестром), `PLAYWRIGHT_HEADLESS_SHELL_REVISION` 1255 по `browsers.json` 1.65.1; WebKit 2388 и Firefox 1572 — проверить там же; README вида и решения, которые называют версию, — по правилу «назвать файл, а не значение».
- **Как проверить:** `just new-repo-test`, `just docs-check`; сборка стадии вида `typescript` — по CI `canvas`, в этом контейнере нет docker.
- **Разделы:** R12, R79; `.claude/rules/new-repo.md`; В89 `canvas`.

#### T332. `docs-check`: «раздел N» в архивах и пропуски номеров R

- **Цель:** удалённая запись `sources` или `measurements` и ушедшая запись журнала решений не ломают архивы `docs/plan/` других репозиториев, а журнал не держит заглушек.
- **Почему:** разбор входящих 2026-11-26 — ответы автора: В17 `skill-map`, вариант (a) — проверка, а не правка архивов; В59 `learner-model`, вариант (a) — номера R с пропусками.
- **Сделать:**
  - В17: в архиве «раздел N» без ссылки прямо перед ним, чья цель откатилась к `sources` или `measurements`, не проверяется — или берётся ссылка сразу после него (выбрать при работе, с тестом на строку `docs/plan/E3.md` `skill-map`);
  - В59: у регистра R `gaps: true`, номер ушедшей записи не выдаётся снова; архивы `docs/plan/` могут цитировать ушедший номер, как цитируют удалённую запись `sources`; `docs/`, RUN.md и `run/` — только существующие; правила RUN.md шаблона и решение о журнале — переписать на месте;
  - другие репозитории берут это переходом на тег; заглушки R `learner-model` (Д24 `learner-model`) — его задачей.
- **Как проверить:** `just docs-check-test`, `just docs-check`; `docs-check-repo` на клонах `skill-map` и `learner-model`.
- **Разделы:** `tools/docs-check/config.mjs`, `sections.mjs`; В17 `skill-map`, В59 `learner-model`.
