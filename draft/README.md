# The prototype

`CogniTrail Widget.html` is a clickable prototype of the learner's app on a tablet. The author made it before the platform was named NovaTrail, so it still says CogniTrail and, in places, MathTrail. All its content is olympiad maths for grade 3.

It is a single file: open it in a browser, with no server. Its settings pick the screen it starts on — setup, the four steps of a task, a wrong and a right answer, the solution, progress, the grown-ups' area, the paper flow, the topic map — and how the coach guides: step by step, or free solve.

It shows where the product is heading, not what it must be. Where it differs from the documents in [docs/](../docs/), the documents win.

## What it shows

- **The header.**
  - The learner's buddy — a fox, a robot, an owl, a cat, a dino, or one the child draws — with a voice and a speed to choose.
  - The learner's pseudonym and overall rank.
  - Grown-ups, behind a PIN.
- **Three ways in.**
  - *My subjects*: the next task, chosen by the engine.
  - *Task from my paper*: photograph a worksheet, pick the tasks found on it, and solve them one by one from a list sorted by topic.
  - *Topic map*: topics in three tiers — basics, rules, hard tasks — each with what it builds on, what it opens, and the learner's rank in it.
- **The page.**
  - A squared sheet with a pencil, a blue pencil, an eraser, undo and clear.
  - The task at the top, with a picture where it has one, and an Answer box at the bottom of the page.
  - A dotted starter sketch under the child's drawing, which the eraser never touches.
  - The coach's marks over the drawing: a dashed frame, numbered circles and a short handwritten note.
- **The coach's panel:** Pólya's four steps.
  1. Understand: tap what we know and what we need to find.
  2. Plan: a technique card, such as "03 Start with small numbers", and "Show me how to start".
  3. Solve: the answer is read on a pause or on "Check my answer"; hints come one at a time; "Show solution".
  4. Check: the steps of the check, and "Which technique helped?".
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

The documents are in Russian; the references below point to their sections and decisions. The prototype's coach is the documents' tutor.

| The prototype | The documents |
|---|---|
| Called CogniTrail, and MathTrail in places | NovaTrail (decision R13) |
| Maths only; Pólya's steps and maths techniques in every task | Each module brings its own content, solving steps and techniques (concepts 3, 7) |
| An Answer box at the bottom of every page | The module sets, for each answer slot, where the answer goes: a zone, anywhere on the sheet, a widget's state, edits in the text, or typed (concepts 6) |
| The coach reads the answer on a pause and may say "Not yet" | Open, product О-8. The recommendation: only an explicit check reads the work and gives a verdict. On a pause the tutor may at most remind the learner to check |
| "Show solution" ends the task as skipped, with no change to the rating | Open, product О-7. The recommendation records "solution seen" as not solved |
| Named ranks, from Meadow to Above the clouds | Open, product О-13: MathTrail dropped the names after parents found them meaningless (R213 standalone) |
| Topics locked to "grade 5+" | A skill opens by its prerequisites; age or grade only sets the starting point (concepts 4) |
| A buddy and ranks for every learner | Presentation follows the learner's presentation style; for adults it is open (product О-13) |
| The coach finds the tasks on the whole photo of a page | The learner or an adult marks the task on the photo, and only its crop goes to the AI (privacy 6, product О-11) |
| Tasks from paper come with their keys and move the rating | A task from paper has no verified key unless an adult enters one or a solver computes it. Without one there is no verdict and no change to the rating (concepts 9.4, product О-11) |
| The profile is one file in the parent's Google Drive, and "nothing of the profile stays anywhere" once it is deleted | Where the learner model lives is open (privacy П-7). Deletion is described honestly, with backups and logs, the AI providers' included (privacy 1) |
| A weekly summary by notification and email | An adult's contact data is kept to what sign-in and the subscription need (privacy 1) |
| The eraser erases pixels | The eraser removes whole strokes: the tutor's marks are anchored to the learner's own strokes (concepts 8) |
| The coach always reads an answer | When the reading is unsure, the learner is asked to rewrite or circle the answer, and that is never a mistake (concepts 9, R04) |
| Free and Plus plans | Two routes to AI: the platform's, by subscription, and an own key — the learner's or the account owner's — for free. Prices are open (product 9, О-14) |
| A child talks to the buddy by voice | Voice input for children is open (privacy П-5, product О-6) |
