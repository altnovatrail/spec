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

#### T189. Разбор 2026-11-17, вторая часть: тип `exportPicture()`, описания выгрузки, заливка подсказки эталона

- **Цель:** то, что T188 записала решениями, есть в нормативных частях и эталоне `spec`: `CanvasElement` держит `exportPicture()`, выгрузка версии 3 описывает поправку уровня взрослым и наблюдение режима `single`, подсказка эталона — белым на непрозрачной `#1d1d1f`; новый тег выходит сам после мержа.
- **Почему:** RUN.md, правило 11 — вторая часть T188; строка 1.23 COORDINATION.md; R76.
- **Сделать:**
  - `types/canvas/index.d.ts`: метод `exportPicture(): Promise<Blob>` в `CanvasElement`; комментарий — PNG, всегда `Blob`, штрихи всей поверхности (лист или страница тетради), без условия, в пределе сохранённой работы ([текст контрактов](../contracts/README.md), раздел 15), размер и цвета — решение `canvas` (R83 canvas); `tools/types/canvas.check.ts` — метод у проверочного класса; `tools/types/npm/README.md` — назвать метод (вторая поправка 2026-11-17 к R36; поправка 2026-11-17 к R74).
  - `export/schemas/profile.schema.json`: описания `attempt_id` и `package_digest` записи журнала называют и поправку уровня взрослым — `level_set_by_adult`, ID поправки в `attempt_id`, пакет текущей версии модуля в `package_digest`, `wrong_key` её не отсекает (R89 api); описание `observation` — оба режима чтения (закрыть Д263). [Текст выгрузки](../export/README.md), раздел 9: аннотации, примеры и векторы правятся внутри версии, форма — нет (поправка 2026-11-17 к R135); `just release-version` это пропускает.
  - `draft/mockup/`: `.tip::after` в `Main.dc.html` — `#1d1d1f` вместо `rgba(29,29,31,0.92)`; README, «The style», — непрозрачная заливка и почему (axe над холстом, проверяемый контраст), строка контраста 13.4 → 16.8; в Д243 — холст claude.ai при публикации берёт ту же заливку (третья поправка 2026-11-17 к R148).
  - Строка 1.23 COORDINATION.md — удалить по правилу 4.
- **Как проверить:** `just docs-check`; проверки частей по их правилам — `.claude/rules/types.md`, `.claude/rules/export.md`; `just mockup-test`; `/code-review high`.
- **Разделы:** R36, R74, R135, R148; R83, R84 canvas; R89 api; Д243, Д263; T188.
