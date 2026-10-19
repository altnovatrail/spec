# The prototype

`NovaTrail Widget.html` is a clickable prototype of the learner's app on a tablet. It replaced `CogniTrail Widget.html`, which the author made before the platform was named NovaTrail. The new one is called NovaTrail, but still says MathTrail in places: the window title, the maths topic map, the sample worksheet, the engine's version line and the grown-ups' area.

It is a single file: open it in a browser, with no server. It opens on *My subjects*, the learner's subjects and modules. Its settings pick another screen to start on — setup, the four steps of a task, a wrong and a right answer, the solution, progress, the grown-ups' area, the paper flow, the topic map — and how the coach guides: step by step, or free solve. The paper flow and the maths topic map have no button on the home screen: only the settings open them.

*My subjects* holds seven subjects, from school maths to Spanish, chess and Golang. The rest of the screens — the task with the coach's steps, paper, the topic map, progress — are olympiad maths for grade 3.

It shows where the product is heading, not what it must be. Where it differs from the documents in [docs/](../docs/), the documents win.

## What it shows

- **The header.**
  - The logo and the name lead home, to *My subjects*.
  - The learner's buddy — a fox, a robot, an owl, a cat, a dino, or one the child draws — with a voice and a speed to choose.
  - The learner's pseudonym and overall rank.
  - Grown-ups, behind a PIN.
- **My subjects**, the home screen.
  - Subjects on the left — Math, Physics, Spanish, Reading, Art, Chess and Golang — and "+ Add a subject".
  - A subject's modules, grouped into packs: "School program", "Olympiad" and "Drills" in Math; "Foundations", "Concurrency" and "Advanced" in Golang. A pack is marked *Sequential*, where the modules go lesson by lesson in the author's order, or *Adaptive*, where "the engine picks each next task from your progress". Golang's packs are sequential, all the others adaptive.
  - Each module with its mastery, what is new this week and what slipped, and a tile per skill: mastered, new this week, slipped, in progress, ready to start, not yet, not mapped yet.
  - "Next in Math": the next task, why it comes, and Start.
  - "+ Add a module" from "the NovaTrail catalog · made by teachers and authors": modules by the project and by other authors.
- **A module.**
  - Its author, package and version, such as `olympiad-k8@0.9.1`, and how many skills it has.
  - *Progress*: mastery and the past week; the modules it builds on, each with a version range such as `math-g3 ^1.5`, and the modules that use it. "Update" brings a module to the version needed, with its progress kept, and "+ Add" brings in one that is not on the map.
  - Next up, mastery in each topic, recent answers and how they were given — on the canvas, spoken, in code — strengths, what to develop, what is too early to judge, mistakes that repeat and what to do next.
  - *Topics*: the module's topic map in steps — "Step 1 · Basics", "Step 2 · Rules" and on; the Goroutines module names its own: Basics, Waiting, Many goroutines, Review. Each topic shows what it builds on and what it opens. Steps far from the chosen topic fold into one line.
  - A new module starts with a quick check on a free board: "No wrong answers — this just finds your start."
- **Lessons from My subjects.**
  - A lesson opens on the module's canvas, with the module's own steps, such as Read, Write, Run, Improve, and the buddy beside it. The canvases are:
    - a free board — olympiad maths, reading, drawing;
    - a workbook of ten examples — fractions, adding within 20, subtraction with borrowing, the table of 7;
    - a text — Spanish *ser* and *estar*: cross out, write above, tap a word to hear it;
    - a lab — a circuit bench, a widget by another author: batteries, a switch, a meter;
    - a chess board — find every check;
    - a code editor — Go, `main.go`: write, format, run and read the output; the verdict counts the lines printed, as in "✓ 3 of 3 lines".
  - The result: the topic's mastery before and after; for a new module, "Starting point found".
- **The maths task.**
  - A squared sheet with a pencil, a blue pencil, an eraser, undo and clear.
  - The task at the top, with a picture where it has one, and an Answer box at the bottom of the page.
  - A dotted starter sketch under the child's drawing, which the eraser never touches.
  - The coach's marks over the drawing: a dashed frame, numbered circles and a short handwritten note.
- **The coach's panel:** Pólya's four steps.
  1. Understand: tap what we know and what we need to find.
  2. Plan: a technique card, such as "03 Start with small numbers", and "Show me how to start".
  3. Solve: the answer is read on a pause or on "Check my answer"; hints come one at a time; "Show solution".
  4. Check: the steps of the check, and "Which technique helped?".
- **Task from my paper**, from the settings: photograph a worksheet, pick the tasks found on it, and solve them one by one from a list sorted by topic.
- **Topic map**, from the settings: maths topics in three tiers — basics, rules, hard tasks — each with what it builds on, what it opens, and the learner's rank in it. Tiers far from the chosen topic fold into one line.
- **Voice and talk.** The buddy reads tips aloud. A bar lets the learner say or type something to the buddy, with quick replies such as "Give me a hint".
- **Progress.**
  - Rank overall and per topic, over the past week.
  - Recent answers, mistakes that repeat, strengths and what to do next.
  - The last task, with its answers and solution.
- **Grown-ups.**
  - The plan: a free daily allowance of the coach's help, or Plus at $10 a month with five times more.
  - The coach's settings and a daily goal.
  - The profile, and where its data lives.

## Where it differs from the documents

The documents are in Russian; the references below point to their sections and decisions. The prototype's coach is the documents' tutor, and its buddy is the tutor's persona. Its topics are the documents' skills, and the steps or tiers of a topic map are tiers.

| The prototype | The documents |
|---|---|
| Called NovaTrail, but MathTrail in places | NovaTrail (decision R13) |
| The maths task: Pólya's steps and maths techniques in every task | Each module brings its own content, solving steps and techniques (concepts 3, 7) |
| An Answer box at the bottom of every page | The module sets, for each answer slot, where the answer goes: a zone, anywhere on the sheet, a widget's state, edits in the text, or typed (concepts 6) |
| The coach reads the answer on a pause and may say "Not yet" | Open, product О-8. The recommendation: only an explicit check reads the work and gives a verdict. On a pause the tutor may at most remind the learner to check |
| "Show solution" ends the task as skipped, with no change to the rating | Open, product О-7. The recommendation records "solution seen" as not solved |
| Named ranks, from Meadow to Above the clouds | Open, product О-13: MathTrail dropped the names after parents found them meaningless (R213 standalone) |
| Topics locked to "grade 5+" | A skill opens by its prerequisites; age or grade only sets the starting point (concepts 4) |
| Golang's packs are sequential: their modules go lesson by lesson in the author's order | The engine picks the next lesson or task by the learner model; the author's order holds inside a lesson and for skills without a deterministic check (concepts 4, 5, 12; R03). Whether an author can set the order of a whole module is open, product О-19. The recommendation: through the skill graph — a sequential module's graph is a chain, and the engine follows it |
| A module builds on other modules, by package name and version range | A module builds only on skills of the shared taxonomy, never on another module's IDs (concepts 3, 4; Т-14) |
| Modules by other authors in the catalog, and a widget by another author in the lab | Who publishes modules is open, product О-9; the recommendation is official modules only at stages 1–3. Other authors' widgets come at stage 4, in an iframe sandbox (R16, product 10) |
| A chess board as a canvas of its own | Canvas kinds are platform code shared by all modules: a handwriting sheet, a workbook, a text, a sandbox, a creative canvas. The core knows no subject, so a chess board would be a module's widget on a sandbox (R02, concepts 8) |
| Golang lessons on a code editor: the learner's program runs, and the lines it prints decide the verdict | No canvas kind for code and no check kind that runs the learner's program (concepts 8, 9.2). Open, product О-20. The recommendation: the verdict comes from the module author's tests, run on the server in a sandbox, not from the output of one run: the broken program prints different lines from run to run |
| A buddy and ranks for every learner | Presentation follows the learner's presentation style; for adults it is open (product О-13) |
| The coach finds the tasks on the whole photo of a page | The learner or an adult marks the task on the photo, and only its crop goes to the AI (privacy 6, product О-11) |
| Tasks from paper come with their keys and move the rating | A task from paper has no verified key unless an adult enters one or a solver computes it. Without one there is no verdict and no change to the rating (concepts 9.4, product О-11) |
| The profile is one file in the parent's Google Drive, and "nothing of the profile stays anywhere" once it is deleted | Where the learner model lives is open (privacy П-7). Deletion is described honestly, with backups and logs, the AI providers' included (privacy 1) |
| A weekly summary by notification and email | An adult's contact data is kept to what sign-in and the subscription need (privacy 1) |
| The eraser erases pixels | The eraser removes whole strokes: the tutor's marks are anchored to the learner's own strokes (concepts 8) |
| The coach always reads an answer | When the reading is unsure, the learner is asked to rewrite or circle the answer, and that is never a mistake (concepts 9, R04) |
| Free and Plus plans | Two routes to AI: the platform's, by subscription, and an own key — the learner's or the account owner's — for free. Prices are open (product 9, О-14) |
| A child talks to the buddy by voice | Voice input for children is open (privacy П-5, product О-6) |
