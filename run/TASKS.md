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

#### T173. Справедливость модели до 100 детей: DPIA и строки трёх правил

- **Цель:** DPIA и privacy говорят то, что решил R157. Первого ребёнка ждут три правила, проверенные коротким прогоном `sim`, и принятый автором остаточный риск в dpia 7 с числами круга. У каждого правила есть строка COORDINATION.md в своём репозитории.
- **Сделать:**
  - dpia 7, 8 и 10.2 (пункт 10) и privacy 3.4:
    - условие dpia 8 — по R157;
    - итог круга E8 — по R42 learner-model и строке `learner-model` В53: выход, база не держит R55 sim, у пятого класса не выше 0,853 из 48 наборов;
    - правила — мерами против риска 7 в dpia 6.2;
    - повторная оценка — при 100 детях;
    - новая версия DPIA, пересмотр по R129.
  - Три правила — где живёт каждое, по карточкам architecture 3:
    - старт оценки снизу — `learner-model` или выбор пробной серии `engine` (строка `learner-model` В52);
    - поправка уровня взрослым — `app` и `api`, и что видит взрослый (privacy 7);
    - предохранитель после N неудач подряд — `learner-model` или `engine`.

    Числа — насколько ниже старт и чему равно N — решает автор, по вопросам с вариантами и рекомендацией.
  - Строки COORDINATION.md для правил — `learner-model`, `engine`, `api`, `app` — и для короткого прогона `sim`, который их проверяет. Там же — что значит «проверены».
  - Карточки architecture 3.8 и 3.9, и 3.1 с 3.3, если правило меняет `app` или `api`.
- **Мой шаг:** ответить на вопросы о месте правил и о числах; утвердить версию DPIA, принять в dpia 7 остаточный риск и подписать её PDF (R147).
- **Как проверить:** `just docs-check`; dpia 8 называет правила и риск, а не круг; у каждого правила есть строка COORDINATION.md; `/code-review high`.
- **Риски:** правило взрослого затрагивает данные ребёнка — сначала прочитать его против privacy (RULES.md, Hard rules).
- **Разделы:** R147, R157; dpia 6.2, 7, 8, 10.2; privacy 3.4, 7; architecture 3.8, 3.9; R40–R42 learner-model; R55, R58, R65 и R69 sim; строки `learner-model` В52 и В53.
