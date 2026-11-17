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

#### T181. Ответы автора на строки «в реестр spec» canvas В83–В85 (T121 canvas, строка 5.11) и app В68 (T47 app)

- **Цель:** записать в spec ответы автора 2026-11-17 на строки «в реестр spec» `canvas` В83, В84 и В85 (задача T121 `canvas`, строка 5.11 «Порядка»), все — по рекомендациям `canvas`, и на строку `app` В68 (задача T47 `app`, PR #74), по рекомендации `app`.
- **Почему:** R76, R156, R81; ответы автора 2026-11-17 в прогоне оркестратора; R148 (стеклянная панель), поправка 2026-11-14 к R90.
- **Ответы:**
  - В83 — «Два свойства и атрибут»: контракт `canvas` и `app` на свойства стиля `--novatrail-canvas-accent`, `--novatrail-canvas-glass`, новый смысл `--novatrail-canvas-top` (отступ полосы, посередине которой стоит панель) и булев атрибут `tools-hidden`, которым `app` прячет панель на телефоне под листом тьютора — имена как в коде `canvas`;
  - В84 — «Убрать строки, 2.5.7 — в app»: строки `up`, `down`, `left`, `right` уходят из таблиц architecture 6 — их кнопок больше нет; несоответствие WCAG 2.5.7 (лист тянут только перетаскиванием) объявляет страница «Доступность» `app`;
  - В85 — «Слот actions»: `canvas` даёт слот `actions` в ряду примера («Дальше», «Показать»), и `app` кладёт туда свою «Продолжить»; доступность ряда — у `canvas` (R148).
  - `app` В68 — (а): фразу «Do not write your name or the real name of anyone you know.» из условий пяти задач `english-essays` убирает следующая версия модуля (Д9 `modules`, Д152) — после того как релиз `app` с T47 выложен; до тех пор ученик видит её в условии (R127: напоминание перед каждой отправкой). Отметить в Д152 и в строке «Порядка» `modules`, если она есть, условие «после выкладки `app` с T47»;
- **Сделать:** прочитать строки В83–В85 в `run/QUESTIONS.md` `canvas` и В68 `app` на GitHub (ветка `t121-glass-bar` или `main`, если смержено); решение или поправки (к R148, R90, R36 и тем, что они задевают, по RULES.md); architecture 3.1–3.2 и 6; строки таблицы 5 `run/INBOX.md` с отпечатками по её правилам (как `just inbox`); строка 6.18 «Порядка», если её текст должен назвать свойства, атрибут и слот для `app`.
- **Как проверить:** `just docs-check` зелёный.
- **Разделы:** R36, R90, R148; architecture 3.1, 3.2, 6; run/INBOX.md; COORDINATION.md, строки 5.11 и 6.18.
