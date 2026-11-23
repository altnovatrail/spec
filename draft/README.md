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

- `Glavnaya-zagruzka.html`, 2026-11-22: Home while its subjects are read, the look of every loading state: the bars, "Next up" and the paper card stand as they will, and the next lesson, the quota and two subjects' cards are grey shapes with a light band sweeping across them. A single file, a bundle: open it in a browser.
- `Zadacha-masshtab.html`, 2026-11-22: the tracing paper of a task from paper chosen, with its frame, corners and bar — Smaller, the percent, Larger, Fit and Recognise —, the wait of «Распознаём…» and the statement as text, «Распознано ИИ», with Original back to the photo. A single file, a bundle: open it in a browser.
- `Vashi-stranicy-1a.html`, 2026-11-22: «Ваши страницы», the pages of the history on this device, each row with a thumbnail of its photo beside its date and its count of tasks. A single file, a bundle: open it in a browser.

- **The interface mockup**, whose look `app` and the tool panel of `canvas` follow, is the sources of the canvas below, in [mockup/](mockup/README.md). Its README is what a session of `app` or `canvas` reads: every screen and state by name, the two sizes and the rules between them, the style, the contrast of its colours and where it differs from the documents. `just mockup` — in another repository `node spec/tools/mockup/serve.mjs` — opens any state in a browser, `?screen=home&device=phone`, through NovaTrail's own runtime, so the private canvas is not needed.

- [Take from my paper](https://claude.ai/artifact/Vt9G8W392cMTTMykiByrcb#play-15dd8cd198dd), 2026-11-13, the link opens it in Play: an interactive iPad mockup of the paper flow, and since 2026-11-14 of sign-in and the home screen before it. It walks an adult's path of the first slice from sign-in to a lesson and through the paper flow as epic E11 builds it, and a switch on "Who's learning?" shows what comes later — "First slice", or "Later · E4 app, E5", with the children's screens and the canvases of other authors.
  - Two sizes. A second board, `Phone.dc.html`, shows a phone of 390 × 844 in portrait beside the iPad of 1194 × 834 in landscape: the same screens, states and steps, laid out for the phone — the same tool bar at the left, the tutor as a sheet from the bottom that its grabber takes to the whole screen, pop-overs as sheets from the bottom, home as one column with the legend behind "What the marks mean", the skill map from top to bottom. An iPad in portrait and a computer follow the rules of the README of `draft/mockup/`; the steps of the sign-in are drawn for a computer too, on a third board, `Desktop.dc.html`, 1920 × 1080. The canvas is behind the sources in [mockup/](mockup/README.md) until they are published to it (Д278): the newest sources are there.
  - Debug. The debug button and window of an account with the right of the debug mode — the models of the paper flow, what each returned, the cost — are on a canvas of their own, [NovaTrail · Debug panel](https://claude.ai/artifact/2rt34xc3FMdz5a3i1CJLKS#play-DebugPlay); in [mockup/](mockup/README.md) they are the states `pick-debug` and `solve-debug-log`.
  - Sign-in. Only a grown-up signs in, with Google and an invite code, states once that they are 18 or older and accepts the Terms of Use and the Privacy Policy, each shown as its gist — the `summary.en` of its version in force in [legal.yaml](../legal/legal.yaml), word for word — with the English text in force. A child never signs in.
  - The owner's profile, after "Create account", as `CreateOwnerProfile` has it: a made-up name, the country, and an avatar of the set, which may stay unchosen.
  - "Who's learning?": the account's profiles, with made-up names and avatars. In the first slice the account holds the owner's profile alone, which opens without the PIN: the PIN guards the owner's profile only on an account that also holds a child's, and "Add a learner" stands disabled with the line that a child's profile waits for a parent's consent. Under "Later", the children, the PIN and the steps of a parent's consent are the mockup of epic E4 of `app`.
  - Home: the next lesson the engine chose, with no reason given; the share of today's tutor help spent; the first slice's three modules with the five states of their skills, or the mark of a skill with a rubric, and a legend of them; on each module's card, Continue and "Skill map", which opens a frame where `skill-map` draws that module's map — since 2026-11-14, version 28 of the canvas, the link is on every card, not one above them; the adult's Help — the tutor is an AI and a program checks every answer, "Report a problem", the made-up name, and the pages Privacy Policy, Terms of Use and Accessibility. "Take from my paper" is open to every profile and opens the camera. Back on a canvas leads home.
  - A lesson opens on a sheet: back and the lesson's name at the top, the tools of `canvas` in a glass bar at the left — Pen, Eraser, Undo, Clear, Zoom in, Zoom out and Draw with finger —, and the tutor's button at the right edge. The sheet moves under the hand — two fingers, or one while Draw with finger is off, or the wheel —, with no buttons for it. Buttons without a visible caption are a closed list, each with a tooltip of its caption, and every target is at least 44 × 44.
  - To an adult the tutor is neutral, with no name and no fox: its panel at the side has Hint, "Explain differently" and the speaker of voicing, and no text field and no microphone — on a task from paper too.
  - The lesson and the task of the first slice, on both sizes, a lesson for each of the three modules, synthetic: an explanation, a worked example with "Next" and "Demo", tasks on a squared sheet, a lined sheet or a workbook page, and "Lesson complete". The solving steps stand at the top of the tutor's panel, the options of a choice behind a button of the row, "Show the solution" with its confirmation in the row, and an essay's feedback by a rubric ends with "Done". What of the task screen of `app` it does not draw, its note `t155` names.
  - Take from my paper, as epic E11 builds it: the main feature of the app, open to every profile. The camera, and the page: the AI finds the tasks on the whole photographed page, and every one starts picked; a task it missed the learner frames by hand — a rectangle dragged from one of its corners to the opposite with a finger or a pen becomes a frame, which its corner resizes and its cross removes. The photo stays on the device; the crop of a picked task, with the strokes on it, goes to be read at Check.
  - One way to solve, whatever shape the page has: each picked task is a canvas of its own, a clean sheet with the task's crop over its top, for a worksheet of equations, an olympiad page and a framed task alike. The sheet is dotted, with no choice of it: a choice of the sheet waits for the app's settings. The crop is transparent, with its print over what is drawn on the sheet, and it is tracing paper: a stroke begun on it stays over the task and moves with it, to mark up its text and pictures. Its grip drags it anywhere on the sheet, and a button at the side, atop the tools, shows or hides it.
  - One bar for every task — Hint and Check, and no "Show the solution": the app never solves a task from paper. There are no answer buttons: tasks from paper take any answer. The learner answers as on paper, circling an option on the task's tracing paper or writing the answer, and Check reads the work.
  - The verdict, by the key, says only whether the learner's answer fits it — "Correct" or "Not yet" —, and never names the right answer or the solution. The key of an equation is the solver's, from the statement the AI read; the key of any other task the AI derives, from its solution, and the verdict looks the same. When the solution gives no one answer a program can compare, the task cannot be checked, and hints still work; two options circled, or none, ask the learner for one answer. The demo's first Check of a task is "Not yet" and the second "Correct".
  - The hint mode is a setting of the profile, in its menu on home — for a child, set by a grown-up: with "Show where", after "Not yet" the tutor also underlines, with a wavy line, the place of the mistake in the learner's own strokes, on the sheet or on the tracing paper, and corrects nothing. For a new profile it is "Show where".
  - Under "Later": the canvas kinds of other authors, behind «…» in the top bar of a task from paper, for epic E5.
  - Pip, a child's tutor under "Later", behind a button at the right edge on every canvas: it belongs to the app, not to a canvas. The button opens a chat at the side, the page slides left to keep the task in view, and a cross closes the chat.
    - Pip helps by text and by voice. It speaks with a voice of the device, so that no remote synthesis gets its words, and a speaker button mutes it. The learner types or speaks to it, and a grown-up turns the microphone on in the profile.
    - Hint opens the chat with the hint, and "Explain differently" gives the same rung in other words. Pip never names the answer.
    - The verdict comes from the program: into the chat as a line while it is open, and as the card while it is closed. Pip says only what comes next, and a dot on its button marks a message not yet read.
    - The microphone is simulated. The documents give voice input to adults only until П-5 is decided (О-6), so a child would not have it yet. What the tutor answers to a free question the documents do not say: here it answers with the rung, the rung in other words, or a fixed text.

  It is a Design canvas on claude.ai, private to the author: open it to someone from its Share menu before giving them the link. From paper is an entry on its home screen, as in the documents. Tasks from paper are in the first slice, as its main feature, and the README of [mockup/](mockup/README.md) names each difference left and the task that closes it. Like the prototype, where it differs from the documents, the documents win.

## Where it differs from the documents

The right column says what the documents hold instead. The prototype's coach is the documents' tutor, and its buddy is the tutor's persona. Its topics are the documents' skills, and the steps or tiers of a topic map are tiers.

| The prototype | The documents |
|---|---|
| Called NovaTrail, but MathTrail in places | NovaTrail |
| The maths task: Pólya's steps and maths techniques in every task | Each module brings its own content, solving steps and techniques |
| An Answer box at the bottom of every page | The module sets, for each answer slot, where the answer goes: a zone, anywhere on the sheet, a widget's state, edits in the text, or typed |
| The coach reads the answer on a pause and may say "Not yet" | Open, product О-8. The recommendation: only an explicit check reads the work and gives a verdict. On a pause the tutor may at most remind the learner to check |
| A quick reply "Give me a hint" at any moment, before the first answer too | The hint ladder goes by the number of wrong answers, and the program picks the rung. What a hint on request gives before the first answer and between answers is open, product О-21. The recommendation: before the first answer — what the module gives the solving steps, with no AI and no reading of unsent work; after a wrong answer — the current rung, and "explain it differently" words it anew |
| "Show solution" ends the task as skipped, with no change to the rating | Open, product О-7. The recommendation records "solution seen" as not solved |
| Named ranks, from Meadow to Above the clouds | Open, product О-13: MathTrail dropped the names after parents found them meaningless |
| Topics locked to "grade 5+" | A skill opens by its prerequisites; age or grade only sets the starting point |
| Golang's packs are sequential: their modules go lesson by lesson in the author's order | The engine picks the next lesson or task by the learner model; the author's order holds inside a lesson and for skills without a deterministic check. An author sets the order of a whole module through the skill graph. A sequential module's graph is a chain, the engine follows it, and the app shows the module as sequential by its graph, as the rules on lessons of [the format text](../format/README.md) say |
| A module builds on other modules, by package name and version range | A module builds only on skills of the shared taxonomy, never on another module's IDs (Т-14) |
| Modules by other authors in the catalog — Short essays by Quill & Co among them — and a widget by another author in the lab | Who publishes modules is open, product О-9; the recommendation is official modules only at stages 1–3, and the first slice's essays module is official. Other authors' widgets come at stage 4, in an iframe sandbox |
| A lesson's header credits the canvas to the module's author: "canvas by Quill & Co" | Canvas kinds are platform code shared by all modules; a module only chooses the kind and sets it up |
| Short essays for grade 3 | In the first slice the essays module is for any age, a child or an adult, with the presentation style by age |
| A short essay ends with "I'm done", and nothing checks it | An essay gets feedback by the module author's rubric: feedback, not a verdict. Tasks with a key in the same module, such as picking the best first sentence, get a verdict |
| An essay about the child's own "best day" | What a module may ask a learner under 18 to write about is open, privacy П-20. The recommendation: invented or general topics, and a reminder not to write names |
| A chess board as a canvas of its own | Canvas kinds are platform code shared by all modules: a handwriting sheet, a workbook, a text, a sandbox, a creative canvas. The core knows no subject, so a chess board would be a module's widget on a sandbox |
| Golang lessons on a code editor: the learner's program runs, and the lines it prints decide the verdict | No canvas kind for code and no check kind that runs the learner's program. Open, product О-20. The recommendation: the verdict comes from the module author's tests, run on the server in a sandbox, not from the output of one run: the broken program prints different lines from run to run |
| A buddy and ranks for every learner | Presentation follows the learner's presentation style; for adults it is open (product О-13) |
| Tasks from paper come with their keys and move the rating | A task from paper gets its key from a solver or from the AI's solution, and its attempts move no rating |
| The profile is one file in the parent's Google Drive, and "nothing of the profile stays anywhere" once it is deleted | Where the learner model lives is open (privacy П-7). Deletion is described honestly, with backups and logs, the AI providers' included |
| A weekly summary by notification and email | An adult's contact data is kept to what sign-in and the subscription need |
| The eraser erases pixels | The eraser removes whole strokes: the tutor's marks are anchored to the learner's own strokes |
| The coach always reads an answer | When the reading is unsure, the learner is asked to rewrite or circle the answer, and that is never a mistake |
| Free and Plus plans | Two routes to AI: the platform's, by subscription, and an own key — the learner's or the account owner's — for free. Prices are open (О-14) |
| A child talks to the buddy by voice | Voice input for children is open (privacy П-5, product О-6) |
