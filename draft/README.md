# The prototype

`NovaTrail Widget.html` is a clickable prototype of the learner's app on a tablet. It replaced `CogniTrail Widget.html`, which the author made before the platform was named NovaTrail. The new one is called NovaTrail, but still says MathTrail in places: the window title, the maths topic map, the sample worksheet, the engine's version line and the grown-ups' area.

It is a single file: open it in a browser, with no server. It opens on *My subjects*, the learner's subjects and modules. Its settings pick another screen to start on — setup, the four steps of a task, a wrong and a right answer, the solution, progress, the grown-ups' area, the paper flow, the topic map — and how the coach guides: step by step, or free solve. The paper flow and the maths topic map have no button on the home screen: only the settings open them.

*My subjects* holds seven subjects, from school maths to Spanish, chess and Golang. The rest of the screens — the task with the coach's steps, paper, the topic map, progress — are olympiad maths for grade 3.

It shows where the product is heading, not what it must be. Where it differs from the documents in [docs/](../docs/), the documents win.

Its design is outdated. The newest design is in the mockups below: for sign-in, the home screen and the flow of a task from paper, take the interface from [Take from my paper](https://claude.ai/artifact/Vt9G8W392cMTTMykiByrcb#play-15dd8cd198dd), not from this prototype.

## What it shows

- **The header.**
  - The logo and the name lead home, to *My subjects*.
  - The learner's buddy — a fox, a robot, an owl, a cat, a dino, or one the child draws — with a voice and a speed to choose.
  - The learner's pseudonym and overall rank.
  - Grown-ups, behind a PIN.
- **My subjects**, the home screen.
  - Subjects on the left — Math, Physics, Spanish, Writing, Art, Chess and Golang — and "+ Add a subject".
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
    - a free board — olympiad maths, short essays, drawing. An essay, such as "My best day", goes Plan, Write, Improve and ends with "I'm done";
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

## Mockups

Mockups made after the prototype, of one flow each:

- [Take from my paper](https://claude.ai/artifact/Vt9G8W392cMTTMykiByrcb#play-15dd8cd198dd), 2026-11-13, the link opens it in Play: an interactive iPad mockup of the paper flow, and since 2026-11-14 of sign-in and the home screen before it.
  - Sign-in. Only a grown-up signs in, with Google and an invite code, states once that they are 18 or older and accepts the Terms of Use and the Privacy Policy, each shown as its gist with the English text in force. A child never signs in.
  - "Who's learning?": the account's profiles, with made-up names and avatars. The grown-up's own profile opens with the PIN while children learn on the device, and adding a child starts with a parent's consent.
  - Home: the next lesson the engine chose, with no reason given; the entry "Take from my paper", which opens the camera; the first slice's three modules with their skill states; Help, and the line that the tutor is an AI. Back on a canvas leads home.
  - The canvas kinds in the top bar, with the kinds of other authors under «…».
  - The camera, and picking the tasks on the photo of the page.
  - One way to solve, whatever shape the page has: each picked task is a canvas of its own, a clean squared sheet with the task's crop over its top, for a worksheet of equations and an olympiad page alike. The crop is transparent, with its print over what is drawn on the sheet, and it is tracing paper: a stroke begun on it stays over the task and moves with it, to mark up its text and pictures. Its grip drags it anywhere on the sheet, and a button at the side, atop the tools, shows or hides it.
  - "Snap work" for work done on real paper. It only photographs and reads the learner's own work, and the letter they circled: it writes nothing and picks nothing for them.
  - One bar for every task — Hint, Snap work, Check — with no answer buttons: tasks from paper take any answer. The learner answers as on paper, circling an option on the task's tracing paper or writing the answer, and Check reads the work.
  - The verdict, by the key, says only whether the learner's answer fits it, and never names the right answer or the solution.
  - A hint mode that a grown-up sets, behind the profile button: with "Show where", after a wrong answer the tutor also underlines the place of the mistake in the learner's own work, and corrects nothing. The documents have no such setting of the profile yet.
  - Pip, the tutor, behind a button at the right edge on every canvas: it belongs to the app, not to a canvas. The button opens a chat at the side, the page slides left to keep the task in view, and a cross closes the chat.
    - Pip helps by text and by voice. It speaks with a voice of the device (privacy 6), and a speaker button mutes it. The learner types or speaks to it, and a grown-up turns the microphone on in the profile.
    - Hint opens the chat with the hint, and "Explain it differently" gives the same rung in other words (R82). Pip never names the answer.
    - The verdict comes from the program: into the chat as a line while it is open, and as the card while it is closed. Pip says only what comes next, and a dot on its button marks a message not yet read.
    - The microphone is simulated. The documents give voice input to adults only until П-5 is decided (О-6), so a child would not have it yet. What the tutor answers to a free question the documents do not say: here it answers with the rung, the rung in other words, or a fixed text.

  It is a Design canvas on claude.ai, private to the author: open it to someone from its Share menu before giving them the link. From paper is an entry on its home screen, as in the documents (product 4), and also one of the canvas kinds, which the documents do not have. The documents put tasks from paper at stage 5 and out of the first slice (product 10, 11); epic E11 of [RUN.md](../RUN.md) decides it. Like the prototype, where it differs from the documents, the documents win.

## Where it differs from the documents

The documents are in Russian; the references below point to their sections and decisions. The prototype's coach is the documents' tutor, and its buddy is the tutor's persona. Its topics are the documents' skills, and the steps or tiers of a topic map are tiers.

| The prototype | The documents |
|---|---|
| Called NovaTrail, but MathTrail in places | NovaTrail (decision R13) |
| The maths task: Pólya's steps and maths techniques in every task | Each module brings its own content, solving steps and techniques (concepts 3, 7) |
| An Answer box at the bottom of every page | The module sets, for each answer slot, where the answer goes: a zone, anywhere on the sheet, a widget's state, edits in the text, or typed (concepts 6) |
| The coach reads the answer on a pause and may say "Not yet" | Open, product О-8. The recommendation: only an explicit check reads the work and gives a verdict. On a pause the tutor may at most remind the learner to check |
| A quick reply "Give me a hint" at any moment, before the first answer too | The hint ladder goes by the number of wrong answers, and the program picks the rung (concepts 10, R03). What a hint on request gives before the first answer and between answers is open, product О-21. The recommendation: before the first answer — what the module gives the solving steps, with no AI and no reading of unsent work; after a wrong answer — the current rung, and "explain it differently" words it anew |
| "Show solution" ends the task as skipped, with no change to the rating | Open, product О-7. The recommendation records "solution seen" as not solved |
| Named ranks, from Meadow to Above the clouds | Open, product О-13: MathTrail dropped the names after parents found them meaningless (R213 standalone) |
| Topics locked to "grade 5+" | A skill opens by its prerequisites; age or grade only sets the starting point (concepts 4) |
| Golang's packs are sequential: their modules go lesson by lesson in the author's order | The engine picks the next lesson or task by the learner model; the author's order holds inside a lesson and for skills without a deterministic check (concepts 4, 5, 12; R03). Whether an author can set the order of a whole module was product О-19, and R58 decided it: through the skill graph. A sequential module's graph is a chain, the engine follows it, and the app shows the module as sequential by its graph ([the format text](../format/README.md), section 21) |
| A module builds on other modules, by package name and version range | A module builds only on skills of the shared taxonomy, never on another module's IDs (concepts 3, 4; Т-14) |
| Modules by other authors in the catalog — Short essays by Quill & Co among them — and a widget by another author in the lab | Who publishes modules is open, product О-9; the recommendation is official modules only at stages 1–3, and the first slice's essays module is official (R41). Other authors' widgets come at stage 4, in an iframe sandbox (R16, product 10) |
| A lesson's header credits the canvas to the module's author: "canvas by Quill & Co" | Canvas kinds are platform code shared by all modules; a module only chooses the kind and sets it up (concepts 8, R02) |
| Short essays for grade 3 | In the first slice the essays module is for any age, a child or an adult, with the presentation style by age (R41) |
| A short essay ends with "I'm done", and nothing checks it | An essay gets feedback by the module author's rubric: feedback, not a verdict (R04, R41). Tasks with a key in the same module, such as picking the best first sentence, get a verdict |
| An essay about the child's own "best day" | What a module may ask a learner under 18 to write about is open, privacy П-20. The recommendation: invented or general topics, and a reminder not to write names |
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
