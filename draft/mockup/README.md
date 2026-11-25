# The interface mockup

The look of `app` and of the tool panel of `canvas`: every screen of the first slice with adults, from sign-in to the end of a lesson and through the paper flow of epic E11, and under "Later" the children's screens of epic E4 of `app` and the canvases of other authors of epic E5, each in two sizes — an iPad of 1194 × 834 CSS px in landscape and a phone of 390 × 844 in portrait —, and the steps of the sign-in on a computer of 1920 × 1080 too. The mockup is the look; the behaviour — what a screen does, what it sends and to whom — is the documents' and the decisions'. Where they differ, the documents win, and the table at the end names each difference and who changes it.

A session of `app` or `canvas` opens the mockup itself, from its `spec/` submodule, and compares its own screen with it by Playwright, without the author. This README is what it reads first: the files, how to open a state, the map of the screens, the two sizes and the rules between them, the style, the contrast and the differences.

## The files

The files of the claude.ai Design canvas [Take from my paper](https://claude.ai/artifact/Vt9G8W392cMTTMykiByrcb#play-15dd8cd198dd) as they are, with the phone, the lesson and the task of the first slice, and the paper flow as it will be after epic E11:

- `Main.dc.html` — every screen, with its prop `device`: `ipad`, `phone` or `desktop`. Its template is in `<x-dc>`, with the styles of its helmet; the data of the screens and the class `Component` are in the script after it, and what each screen draws is the values of its `renderVals`.
- `Phone.dc.html` — the phone's board: `Main.dc.html` with `device="phone"`.
- `Desktop.dc.html` — the computer's board, 1920 × 1080: `Main.dc.html` with `device="desktop"`, for the steps of the sign-in alone.
- `Paper.dc.html` — the photographed page of the paper flow, synthetic.
- `canvas.json` — the boards and the canvas's notes, in Russian: `howto` is the path through Play, and `t155` names what of the task screen of `app` the mockup does not draw, by the key of its string, and why.

The canvas is behind these files: the last publish to it did not go through (Д278). The debug button and window are on a canvas of their own, [NovaTrail · Debug panel](https://claude.ai/artifact/2rt34xc3FMdz5a3i1CJLKS#play-DebugPlay): `Main.dc.html` of here with its prop `debug` on, and boards that open it at a state by its prop `at`. Until a publish goes through, the newest sources are here, and a change of the look is made in these files, with `states.mjs` below.

The files of the canvas's own runtime, `support.js` and `artifact-type/`, are not here: they are not NovaTrail's, and their license is unknown. NovaTrail's own runtime, Apache-2.0, opens these files instead: [tools/mockup/](../../tools/mockup/runtime.mjs).

## How to open it

```
just mockup                                  # in spec
node spec/tools/mockup/serve.mjs             # in another NovaTrail repository; --port N, 8156 by default
```

The server listens on 127.0.0.1 alone, takes no package and serves `tools/mockup/` and `draft/mockup/` of the spec it is in, nothing else. Its page opens a state by its address:

```
http://127.0.0.1:8156/tools/mockup/?screen=home&device=phone
```

- `screen` is a state of the table below; without it the page lists every state, with a link for each device.
- `device` is `ipad`, the default, `phone`, or `desktop` for the steps of the sign-in, `signin` to `agree-ticked`; the page lists `desktop` only for them.
- The page draws the board — `Main.dc.html` for the iPad, `Phone.dc.html` for the phone, `Desktop.dc.html` for the computer —, brings it to the state by the taps a person would make, runs the mockup's pending timers at once and then sets `data-ready="true"` on `<html>`. A state or a device it does not know, or a computer for a state past the sign-in, sets `data-ready="error"`, with the reason in the page. From then on the page is the mockup in Play: it takes taps and pointers, and its timers run.

A snapshot by Playwright, for each state the screen being compared needs, in Chromium, WebKit and Firefox:

```js
const [w, h] = device === "phone" ? [390, 844] : device === "desktop" ? [1920, 1080] : [1194, 834];
const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
await page.goto(`http://127.0.0.1:8156/tools/mockup/?screen=${state}&device=${device}`);
await page.waitForSelector('html[data-ready="true"]'); // "error" names what failed
await page.locator("#frame").screenshot({ path: `mockup-${state}-${device}.png`, animations: "disabled" });
```

The helmets of `Main.dc.html` and `Paper.dc.html` link Caveat and Inter from Google Fonts; the runtime leaves out a link to another origin, so the page loads nothing from the network and draws with the next font of each list. Neither font is taken — `app` and `canvas` draw in the system font —, so a comparison reads the layout, the sizes and the colours, not the glyphs.

A state that shows what a timer of the mockup would end — `task-reading`, the work being read — holds the mockup's timers until the first tap or key, so that a snapshot cannot race them.

The runtime does what the sources use of the canvas's runtime, and nothing more: `{{path}}` in text and attributes, `<sc-if>`, `<sc-for>`, `<dc-import>`, `<helmet>`, and the class `DCLogic` with `setState` and the three callbacks. A tag `sc-*` or `dc-*` it does not know is an error, so that a newer source cannot draw silently wrong. `just mockup-test` draws every state on both devices under jsdom: each holds the text it shows, every `{{…}}` has its value, and nothing of the template is left; it also holds the table below to `states.mjs`, and the lines of the table of the template's parts to the template. spec's container has no browser, so the snapshots themselves are taken where Playwright is: in `app` and `canvas`.

## Screens and states

Each state is reached the way a person reaches it in Play, from the state before it, by the steps of [tools/mockup/states.mjs](../../tools/mockup/states.mjs). Its name is the `screen` of the address. "Under" says whose the screen is: the first slice, which epic E12 of `spec` drew for `app` and `canvas`, or what comes later — under the switch "Later · E4 app, E5" on "Who's learning?". The paper flow is in the first slice: the main feature of the app, open to every profile, as epic E11 builds it.

| State | What it shows | Under |
|---|---|---|
| `signin` | Sign-in: the sky of the trail to the spark, and on its dark card "Sign in with Google" — Google's own white button —, that accounts are for grown-ups alone, and "Privacy and legal information" | First slice |
| `signin-language` | Sign-in, its language: the pop-over of the pill "English", each language by its own name | First slice |
| `signin-signing` | Sign-in while Google's window is open | First slice |
| `invite` | The invite code, empty: four boxes of four characters, as `api`'s codes are sixteen | First slice |
| `invite-filled` | The invite code, accepted | First slice |
| `agree` | "I am 18 or older" and the Terms of Use and the Privacy Policy, each with its gist | First slice |
| `agree-ticked` | The same, ticked: "Create account" on | First slice |
| `wait` | Waiting on the sky, while the next step of the way in or "Who's learning?" is read: the stars, and the spark of the name pulsing in the middle — never a white page: the ground at once, the spark once the wait passes 0.3 s | First slice |
| `legal-privacy` | The gist of the Privacy Policy in force, and its next version | First slice |
| `legal-terms` | The gist of the Terms of Use in force | First slice |
| `owner` | The owner's profile after "Create account", empty: on the sky of "Who's learning?", the name at the top and a dark card — the heading, the avatar and its button, the name and the country, the hint and "Continue" | First slice |
| `owner-avatars` | The owner's profile, the avatars of the set | First slice |
| `owner-countries` | The owner's profile, the countries | First slice |
| `owner-filled` | The owner's profile, filled in | First slice |
| `wait-home` | Waiting on the page, while a learner's screen is read — home, a lesson, a task —: the page's grey, and the spark pulsing in the middle | First slice |
| `who` | "Who's learning?" on the sky: the name alone at the top and "Sign out" a pill of glass at the right; the owner's profile alone, a dark card with "Start", and "Add a learner" a glass card, disabled | First slice |
| `home` | Home, as app draws it: the places in a row at the top — Home, Subjects, the cognitive map shut with "Soon", and after a rule Grown-ups and Help —, and at the right the pills of the tutor, the notifications and the profile's menu; one card of "Next up", the lesson with the share of the tutor's time, beside "Tasks from my paper"; then a card for each connected module — its kind, how much is mastered, the skill map and Continue, a square for each skill, and under an adaptive one "The tutor chooses" —, and the legend | First slice |
| `home-loading` | Home while the subjects are read: the frame, "Next up" and "Tasks from my paper" stand, and the lesson, the quota and two modules' cards are grey shapes with a light sweeping across them | First slice |
| `home-help` | Home, the adult's Help, the last of the row of places | First slice |
| `home-switch` | Home, the profile's menu at the top right: whose profile, "Switch learner" and "Sign out" | First slice |
| `home-grownups` | Home, For grown-ups from the row of places: the hint mode — "Questions only" or "Show where" —, "This device" and "All settings"; "Sign out" is the profile's menu's alone | First slice |
| `home-bell` | Home, the notifications: "Nothing new yet" — nothing sends one | First slice |
| `home-tutor` | Home, the one tutor's panel opened from the pill at the top right, under the row of places: that the tutor is an AI and where it helps, "Continue · Number patterns" and "Take from my paper" as its buttons, and the field and the microphone — Home holds no work, so it speaks of none | First slice |
| `home-legend` | Home, what the marks mean: on the phone a sheet, on the iPad the legend that stands under the modules | First slice |
| `home-pages` | Home, "Your pages" by "Open camera": the profile's pages from paper on this device, newest first, each with its photo's thumbnail, its date and time and its number of tasks, and under them how many of the newest are kept, where and until when | First slice |
| `subjects` | Subjects, from the row of places: the connected modules, each with its skill map, and the check board "Tasks on a sheet" to connect | First slice |
| `solve-kept` | A page opened from "Your pages": its picked tasks with the work kept, and no verdict, which the device does not keep | First slice |
| `legal-access` | The page Accessibility, from Help | First slice |
| `map` | The skill map of olympiad maths, from Subjects: "Subjects" back, the module at the title, the legend, and the map in its frame | First slice |
| `map-modules` | The skill map, its module chosen in a pop-over at the title | First slice |
| `map-essays` | The skill map of short essays: every skill "Feedback by criteria" | First slice |
| `lesson` | A lesson, its explanation: a card to read, with "Read aloud" | First slice |
| `lesson-segments` | A lesson, its segments in a pop-over, from the line under its title | First slice |
| `example` | A worked example, before "Next" | First slice |
| `example-demo` | A worked example, all its parts shown | First slice |
| `task` | A task on a squared sheet, "Step by step": the tutor's panel open with step 1 | First slice |
| `task-steps` | A task, the list of its solving steps | First slice |
| `task-mode` | A task, the solving mode: "Step by step" or "On my own" | First slice |
| `task-pill` | A task, the panel closed: the step's pill above the row | First slice |
| `task-hint` | A task, a hint before a wrong answer: the givens, a technique, the leading question | First slice |
| `task-empty` | A task, Check without work: "Write an answer on the sheet" | First slice |
| `task-reading` | A task, the work being read | First slice |
| `task-not-yet` | A task, "Not yet" as a card, the tutor's mark beside the work | First slice |
| `task-rung` | A task, the rung in the panel, with "Report a problem" | First slice |
| `task-alt` | A task, "Explain differently": the rung in other words | First slice |
| `task-report` | A task, the form "Report a problem" | First slice |
| `task-correct` | A task, "Correct", the solution and "Continue" | First slice |
| `task-full` | A task, the tutor's sheet over the whole screen: the phone's grabber | First slice |
| `choice` | A task with a choice, its options behind "Choose an answer" | First slice |
| `choice-wrong` | A task with a choice, "Not yet" | First slice |
| `solution-ask` | "Show the solution", asked first | First slice |
| `quota` | The tutor's time used up: the quota's line, the task's own hints | First slice |
| `lesson-end` | "Lesson complete", "Next lesson", "Back to Home" | First slice |
| `workbook` | A task on a workbook page of six lines | First slice |
| `workbook-not-yet` | A workbook page, two lines "Not yet" | First slice |
| `workbook-shown` | A workbook page, the solution shown: the task is over | First slice |
| `essay` | An essay on a lined sheet, to a rubric | First slice |
| `essay-feedback` | An essay, its feedback | First slice |
| `essay-done` | An essay after "Done": the marks by the criteria, to an adult | First slice |
| `camera` | The camera of the paper flow, from "Take from my paper" | First slice |
| `pick` | The tasks the AI found on the photographed page, every one picked | First slice |
| `pick-finding` | The page while the AI finds its tasks: no frame yet, "Finding the tasks on the page…" in the middle of the top bar, by a spinner, Start shut, and a blue line sweeping the page down and up, its glow the same above it and below it | First slice |
| `pick-drag` | A frame being dragged round a task the AI missed, from one corner to the opposite: it follows the finger, back too, and looks as the frame it becomes | First slice |
| `pick-adjust` | A frame the AI found, Equation (2), moved left and up by its middle and made larger by its corner: every frame, found or drawn, has the corner at its bottom right, a drag of its middle moves it, and a tap still picks it or leaves it out; only a drawn frame has the cross | First slice |
| `pick-frame` | A task the AI missed, framed by hand: the rectangle dragged round it became a frame, with its cross and its corner | First slice |
| `pick-ask` | The tutor's panel on the page to pick from: its line on what it takes, the field with a request about the frames typed, and the microphone | First slice |
| `pick-asked` | The request sent: the left column's three equations found anew and picked, the learner's request and the program's line "Found 3 tasks" in the conversation, and Undo | First slice |
| `pick-none` | The AI found no task on the page: a card of cool white of its own just above the bar, which keeps its size — a dashed blue ring round a frame dragged from its corner, "No tasks found." and that a frame can be dragged round each task to solve —, the note lifted above it, Select all and Start shut | First slice |
| `pick-corner` | A corner of a frame tapped: the card above the bar in cool white, its dashed ring round two opposite corners, "Now tap the opposite corner of the task." | First slice |
| `pick-failed` | The finding failed: the card in a red tint, a red disc with "!", "No connection." and "Find the tasks again" at its end | First slice |
| `pick-outcome` | The AI could not find the tasks: the card in a red tint, "The tutor can’t answer right now." and that a frame can be dragged round each task | First slice |
| `pick-closed` | AI closed to the learner, the tasks found: the card in warm white, an orange ring with "!", "Without the AI a task from paper can’t be checked.", Start shut | First slice |
| `solve` | A picked task on a clean sheet that runs under the top bar, its crop as tracing paper, and above the crop its sign, "Photo of the task" | First slice |
| `solve-hand` | Hand chosen in the tool bar, and the sheet moved by it right of the page: the dots go on past the screen | First slice |
| `solve-select-modes` | Select tapped again in the tool bar: its menu of shapes, Lasso and Rectangle, the one in use marked | First slice |
| `solve-select-lasso` | Select: a dashed lasso drawn around the second of two lines on the sheet | First slice |
| `solve-selected` | What the lasso held almost wholly, of the layer it began on, in a dashed box, with Copy and Delete above it; a drag inside the box moves it | First slice |
| `solve-select-moved` | The selection moved by a drag inside its box, still selected; Undo puts it back | First slice |
| `solve-select-copied` | Copy: a copy of the selection just below it, selected in its place | First slice |
| `solve-select-rect` | A rectangle begun on the task: it takes the strokes on the tracing paper alone, not the sheet's under it | First slice |
| `solve-scale` | The tracing paper chosen by its grip: a frame and four corners, which scale it from the corner across, and under it the bar of scale — Smaller, the percentage, here 90%, which sets it back to 100%, Larger, Fit, and Recognise; a press on the sheet lets it go | First slice |
| `solve-recognising` | Recognise pressed: a light runs over the crop, the sign and the button say "Recognising…", and the button takes no press | First slice |
| `solve-text` | The statement read: its text in place of the photo, the sign "Recognised by AI", and the button Original, which gives the photo back | First slice |
| `solve-text-fraction` | The statement read on Equation (3), which the page prints with a fraction bar: the fraction built up, its numerator over its denominator, the letter in italics, as canvas draws the reading’s `\frac` | First slice |
| `solve-zoom` | Zoom in, in the tool bar after Clear, pressed twice: the sheet at 150 % about the middle of what is in sight, the ink and the tracing paper with it; at 200 % Zoom in is off | First slice |
| `solve-zoom-out` | Zoom out pressed twice: the sheet at 50 %, more of it in sight, and Zoom out off; a pinch of two fingers sets any zoom between 50 % and 200 % | First slice |
| `solve-lines` | The grid's button, last in the tool bar, tapped once: the dots give way to lines, and its icon to lines; next blank, then squares, then dots again | First slice |
| `solve-ask` | The one tutor's panel on a task from paper, as on every screen: its line that a question goes by text or voice, a question of two lines typed in the field, which grows with its lines up to five — Enter sends, Shift+Enter breaks the line —, the speaker in the head, Hint |
| `solve-asked` | The question sent: the learner's line, and the tutor's answer — a question that leads on, never the answer — with "Report a problem" |
| `solve-listening` | The microphone pressed: "Listening…" in the head and the wave in place of the field, and Stop |
| `solve-asking` | A question sent and its answer awaited: "Tutor is writing…", and in the field Stop, a white square on black, in place of Send |
| `solve-stopped` | Stop pressed: the request called off, the question gone from the conversation and back in the field, and under it "Stopped: your question is back in the field — change it and send it again." |
| `solve-dictated` | The speech as text in the field, "From your voice: read it, correct it, then send." under it, and Send; sent, it bears "Said" and its length |
| `solve-grown-pin` | The key of grown-up mode in the panel's head tapped: a dialog over the dimmed screen — the lock, "Grown-up mode", "Enter your PIN…", four dots, the keypad with Cancel and ⌫, and "The PIN is 5555 for now." |
| `solve-grown-wrong` | Four wrong digits: the dots cleared, and "Wrong PIN. Try again." in red |
| `solve-grown-on` | The PIN entered: the key filled in the head, the orange band "Grown-up mode · No limits, up to the full solution" with Turn off, the line "Grown-up mode on", and the field "Ask for anything…" |
| `solve-grown-written` | A line written by the learner, and "Finish the solution on the sheet" sent: the tutor writes the next lines under it on the sheet, stroke by stroke at the speed of a hand but all within 3 s, at once with reduced motion, while the head says "Writing on the sheet…", and says "Done" in a bubble marked "Grown-up mode" |
| `solve-grown-asking` | A request in grown-up mode awaited: "Writing on the sheet…" and Stop; an act already being drawn has no Stop: it takes 3 s at most |
| `solve-grown-struck` | "Cross out the second line in red" sent: a red stroke through the second line |
| `solve-grown-erased` | "Erase the second line" sent: the second line gone, its red stroke with it |
| `solve-grown-hatched` | "Hatch the second line with a 2 mm grid" sent: a blue grid over the second line, dozens of strokes drawn within the same 3 s, and Undo takes the grid back whole |
| `solve-grown-off` | Turn off pressed: the band gone, "Grown-up mode off: the tutor's limits are back", and the tutor's strokes left on the sheet |
| `solve-tasks` | The list of the picked tasks, the framed one among them | First slice |
| `solve-empty` | Check without work: "Write your solution first" | First slice |
| `solve-reading` | The work being read: the crop with the strokes on it, a blue line sweeping it across, its glow the same on both sides of it | First slice |
| `solve-not-yet` | "Not yet" as a card, the first rung in the tutor's panel, and the wavy line under the place of the mistake: the demo's profile has "Show where" on | First slice |
| `solve-correct` | "Correct", and "Next task" | First slice |
| `solve-all` | Every task of the page over: "New photo" | First slice |
| `pick-several` | A frame dragged by hand round two equations of the page at once | First slice |
| `solve-several` | Check of a frame of two tasks, each with a verdict of its own: "Not yet · 1 of 2 correct", and a tick or a cross on a white halo by each answer on the crop; a second Check, "Correct · 2 of 2" | First slice |
| `olympiad` | A problem of an olympiad book on its sheet: the answer is an option circled on the crop | First slice |
| `solve-circle` | Check with no option circled: "Circle an answer first" | First slice |
| `solve-nokey` | A task that could not be checked, "Couldn't check this one"; hints still work | First slice |
| `pick-debug` | The page photographed by an account with the right of the debug mode: the debug button above the tutor's, and its window's Models — the first model for every call, a second to read the work | An account with the right alone |
| `solve-debug-log` | A Check by an account with the right of the debug mode: the debug button above the tutor's, and its window's Log — each call, what the model returned, its cost, the session's total, and Export beside a Check; as admitted, the work read in two attempts, Haiku's unreadable and then Sonnet's, as each call asks the next model only when the one before did not do | An account with the right alone |
| `solve-debug-export` | A Check of the Log exported: its truth — for each task of the frame its statement, formula, key, value read and verdict, and a note — filled in from the calls for the developer to correct, and Save case, a file of `DebugCase` that `tutor-eval -paper` reads | An account with the right alone |
| `solve-debug-errors` | The window's Log as the app's log: what the app, `api`, the canvas and the camera said, newest first, with the AI's calls among them; "2 errors" tapped, the errors alone — a refusal of `api` with its trace, an uncaught error of the app with its stack —, and the red count on the tab | An account with the right alone |
| `solve-debug-filter` | The Log's filter: the levels — errors, warnings, info, debug — and the sources — the AI's calls, `api`, the canvas, the app —, each with its count, and "Show everything" | An account with the right alone |
| `solve-debug-perf` | The window's Performance: the frames a second, the worst frame of each half-second over the last 30 s, the main thread's busy time, what the canvas holds and paints, memory estimated from what the app holds, the device, Pause and Copy, and the switches "Show on the canvas" and "Flash what is repainted" | An account with the right alone |
| `solve-debug-hud` | "Show on the canvas" on and the window closed: a dark strip at the top left of the canvas with the frames, the busy time and the memory, which takes no touch | An account with the right alone |
| `later-who` | "Who's learning?" with the children Comet and Juniper, four narrower cards | Later · E4 app |
| `later-add` | "Add a learner": the steps of a parent's consent | Later · E4 app |
| `later-pin` | The owner's profile behind the PIN | Later · E4 app |
| `later-home` | A child's home | Later · E4 app |
| `later-help` | A child's Help, with the helplines | Later · E4 app |
| `later-grownups` | For grown-ups on a child's home, behind the PIN: past it, the child's hint mode and Pip's microphone | Later · E4 app |
| `later-pip` | Pip, a child's tutor, with its text field and microphone | Later · E4 app |
| `later-kinds` | The canvas kinds of other authors, under «…» in the top bar of a task from paper | Later · E5 |

A state shows its demo: the first Check of a task is "Not yet" and the second "Correct", so that a lesson and a page show every part. That is the mockup's convention, not behaviour: the program decides each verdict of a task of a module by the key, and the model's Check each verdict of a task from paper. On the demo's pages the AI finds five of the six equations and all six problems; one problem, the staircase, the mockup draws as unchecked.

### The template, part by part

Each part of the template opens with a comment `<!-- ============ … ============ -->` at its line of `Main.dc.html`; `just mockup-test` holds these lines to it. What a part draws on the phone is in the rules `.nt-phone` at the end of the helmet's styles.

| Line and part | What it draws |
|---|---|
| `Main.dc.html:409` — Surfaces | The sheet, two screens tall and three wide, the task's page at its left: for a task from paper dotted; in a lesson squared, lined or a workbook page, the module's; the number line and the geometry board of other authors |
| `Main.dc.html:473` — Camera | The camera's viewfinder |
| `Main.dc.html:515` — The photographed page | The page to pick tasks on: the tasks the AI found, the learner's frames with their cross and corner, and the frame being dragged |
| `Main.dc.html:558` — Ink on the screen | The learner's strokes, the eraser's targets, the tutor's marks: a lesson's box, the wavy line of "Show where" |
| `Main.dc.html:595` — Clean sheet | A task's crop over the sheet, the strokes on it, and the wavy line on it |
| `Main.dc.html:668` — Author canvases | The sandbox's chip |
| `Main.dc.html:676` — A lesson | The explanation's card, the statement above the canvas, the worked example's parts |
| `Main.dc.html:719` — Top bar | Back, the title and the line under it, the segments' pop-over, «…» of other authors' kinds under "Later", ‹ tasks ›; on the page to pick from what was found in the middle, "Remove all frames" and Retake; the solving mode |
| `Main.dc.html:811` — More canvas kinds | The pop-over of other authors' kinds, under "Later" |
| `Main.dc.html:841` — Tool rail | The tools of `canvas` as a vertical glass bar — Pen, Eraser, Select, which a second tap gives its shapes, Lasso and Rectangle, Hand, Undo, Clear, Zoom in and Zoom out, and on a task from paper the grid's button, round —, and above them the crop's show and hide |
| `Main.dc.html:903` — The tutor | One component on every screen where the tutor stands — Home, the page to pick from, a task from paper, a task of a module, Pip under "Later" —, set by `tutorKit` of the script: its context and which of its parts are on. The button at the right edge, and on Home the pill instead; the panel: the head with the quota and the speaker, the steps, the conversation, the context's buttons, the field with the microphone and Send |
| `Main.dc.html:1204` — A lesson | The row of actions, the step's pill, the options, the solution's confirmation, "Report a problem", "Lesson complete" |
| `Main.dc.html:1368` — Pick | What left the device, the cards of what the page says, Select all, Start |
| `Main.dc.html:1404` — Solve | The list of the tasks, the bar Hint · Check, the verdict as a card |
| `Main.dc.html:1481` — Debug | Only for an account with the right of the debug mode: the debug button beside the tutor's and its window, Models, Log and Performance, and Performance's strip on the canvas |
| `Main.dc.html:1797` — Sign-in | The sky, the language, and on the card the sign-in, the invite code, "I am 18 or older" and the texts |
| `Main.dc.html:1923` — The owner's profile | The name, the country, the avatar |
| `Main.dc.html:1987` — Who's learning | The profiles, "Add a learner", the PIN, the steps of a parent's consent, the demo's switch |
| `Main.dc.html:2084` — Home, Subjects and the skill map | The row of places, or the phone's tab bar, and the pills at the right — the tutor, the notifications, the profile's menu —, drawn by app's own elements and classes and the styles `.ph-home` of the helmet, app's theme; Home's "Next up" with the quota beside "Tasks from my paper", the modules' cards and the legend, and their shapes while read; Subjects; the skill map's frame and the sketch of what `skill-map` draws; and the pop-overs — For grown-ups with the hint mode and its PIN under "Later", Help, the profile's menu, the notifications, "Your pages", the legend, the module of the map |
| `Main.dc.html:2476` — Waiting | The ground of the screen to come — the sky or the page — and the spark pulsing in its middle |
| `Main.dc.html:2494` — A legal text | The gist of a text, or the page Accessibility |

## Two sizes, and the rules between them

The mockup is drawn in absolute CSS px for its two sizes, and the sign-in for a computer too; `app` and `canvas` lay their screens out by the rules below, from the width of the viewport, not from the kind of device (WCAG 1.4.10).

- **The phone's layout — a width below 600 CSS px.** It is the reference of 390 × 844: one column that scrolls; the row of places a tab bar at the bottom — Home, Subjects, Cognitive map, Grown-ups, Help —, each its icon over its caption, and the mark at the top left; the tool bar of `canvas` the same vertical glass bar at the left edge; the tutor a sheet from the bottom, at half the height with the task in view above it, its grabber taking it to the whole screen; a pop-over a sheet from the bottom with a close button, which a tap outside closes; «…» of other authors' kinds, under "Later", a button of the right bar; a legal text over the whole screen; the skill map's tiers from top to bottom; the statement of a task folded to one line.
- **The tablet's layout — 600 CSS px and wider.** It is the reference of 1194 × 834: on Home, Subjects and the skill map the row of places at the top left, beside the mark — from 72em each place its icon and caption, below 72em its icon alone but the current one, the same words as its tooltip —, and the tutor, the notifications and the profile's menu at the top right; on a canvas the top bar a glass pill at the top left, the tool bar at the left edge, the tutor's panel 400 px wide at the right, from under the top bar to 16 px from the bottom, and the sheet slides left while it is open, so that the task stays in view; pop-overs hang from the button that opens them.
- **An iPad in portrait, 834 × 1194,** is the tablet's layout. Home keeps its places in a column 834 wide: the cards of the modules two in a row instead of three, and "Take from my paper" under the next lesson; the tutor’s time keeps its width, 20em at most, as in landscape, and does not stretch across the card. Below 900 wide the sign-in leaves its trail out and its card stands in the middle: the trail and the card of 440 do not fit side by side. On a canvas the tutor's panel keeps its 400 px and the sheet slides under it. The top bar of the page to pick from — the name, what was found in the middle, "Remove all frames" and Retake — keeps one row: where its words do not fit, as in portrait and on a phone, the name and the two captions go together, back and the two buttons each their icon alone, and only where even the icons do not fit beside what was found do the buttons go below; `app` measures the row, not the width, since the captions of each language differ. The mockup draws the iPad in landscape, where the words fit, and the phone, where they do not.
- **A computer** is the tablet's layout. Home keeps the width of the reference, 1194 px at most, centred on the page's colour; the sign-in's sky fills the window, its trail and card keep the iPad's places in a middle of 1194 × 834, centred both ways, and its logo and language stand 24 below the window's top, at that middle's edges — the board `Desktop.dc.html`, 1920 × 1080; a canvas fills the window — the sheet is wider than any screen, and moves under the hand or the wheel —, with the bars at the same edges.
- **A phone in landscape** is the tablet's layout by its width; its height of 390 holds the tool bar, which scrolls inside its glass when it does not fit.
- **320 CSS px,** and a zoom of 400 % of 1280: the phone's layout reflows with no horizontal scroll of the page; only the sheet scrolls both ways, as WCAG 1.4.10 allows a two-dimensional layout. The vertical bar fits its width, and where its nine buttons of a task from paper are taller than the window, it scrolls inside its glass.
- Every target is at least 44 × 44 CSS px, the grabber 88 × 44 (WCAG 2.5.5).

## The style

**Colours.** The roles, by the colours of the template:

| Role | Colour |
|---|---|
| The page | `#F2F2F7` |
| The sky of the sign-in, of the owner's profile and of "Who's learning?" | `#0B0D2E` under four radial glows — `#5B5FE0`, `#0A6BD6`, `#B8325A`, `#E0901E` —, its stars and the trail's stops white at 0.3–0.9 and 0.14; the language's pill `#161A3D` at 0.4 with a ring of white at 0.4 |
| "Who's learning?" | "Sign out" `#FFFFFF` on glass of white at 0.12 with a ring at 0.25; a profile's card `#161A3D` with a ring of white at 0.14, the avatar's ring white at 0.16, the name `#FFFFFF`, whose profile white at 0.6, "Start" `#2B66F6` with white words; "Add a learner" glass of white at 0.12 with a ring at 0.25, its dashed circle white at 0.35 and its plus at 0.55, its name white at 0.8 while disabled and `#FFFFFF` once open, the line why white at 0.9; the focus ring white |
| The owner's profile | the card `#161A3D` with a ring of white at 0.12, its heading `#FFFFFF`; the avatar's ring white at 0.08; "Choose an avatar" and "Choose" `#8FB8FF`; the rows white at 0.07 with a ring and a line between them of white at 0.1, the labels `#FFFFFF`, the values white at 0.85, the placeholder at 0.55, the chevron at 0.4; the hint white at 0.55; "Continue" `#2B66F6` with white words, white at 0.12 with its words at 0.5 while disabled; a pop-over opaque white, as the sky would show through the light screens' glass |
| The sign-in's card | `#161A3D`, a ring of white at 0.12; on it text `#FFFFFF`, secondary text white at 0.8 and 0.72, "Privacy and legal information" white at 0.6; the line for grown-ups white at 0.1 with a ring at 0.18, its words at 0.88; a link and Back `#64A8FF`; a field or a box white at 0.08 with an edge of white at 0.5, `#64A8FF` 2 px for the one to fill; an unticked checkbox a ring of white at 0.55; a disabled button white at 0.12 with its words at 0.5; the tick of "Signed in with Google" `#30D158` |
| Google's button | Google's own, its light theme: `#FFFFFF`, a stroke of 1 px `#747775` inside, `#1F1F1F` text and the standard "G" (sources 4.8) |
| A card, a pop-over, the sheet | `#FFFFFF` |
| Text | `#1D1D1F` |
| Secondary text, captions, a close button | `#6E6E73` |
| The text of a segmented control | `#3A3A3C` |
| The accent: a primary button's fill, the selected tool, the focus ring | `#0071E3`, white text on it |
| The accent as text: a link, a selected option's word | `#0071E3` in the template; `#0066CC` for text, by the contrast below |
| "Correct", done | `#248A3D` |
| "Not yet", a mistake | `#C93400` |
| A hint | a fill `rgba(255,204,0,0.20)`, its caption `#9A5B00` |
| What comes next | `#A85A00`, beside a dot `#FF9F0A` |
| The tutor's words on the sheet | `#23308C` |
| The tutor's wavy mark of "Show where" | `#E8590C`, 2.4 px, under the place of the mistake |
| A frame the learner drew on the page | the accent's fill and ring of a found task, and a dashed white line inside |
| The skill states: mastered, time to review, in progress, ready to start, locked | `#34C759`, `#FF9F0A`, `#0A84FF`, `#B9D7FF`, `#E5E5EA` — on the skill map their fills, borders and words are `MAP_LOOK` of the script |
| A skill with a rubric | `#7A2EA8` on `#F7F0FC` |
| The grey fills of fields, chips and disabled buttons | `rgba(118,118,128,…)` at 0.08, 0.10, 0.12 and 0.16 |
| The tutor's mark | a gradient `#5E5CE6` → `#0A84FF`, white glyph |
| A message not yet read | a dot `#FF3B30` with a white ring |
| A tooltip | white on an opaque `#1D1D1F`, 12.5 px, radius 9: a translucent fill over the canvas would give a contrast that depends on the strokes beneath it, which axe cannot check. `canvas` draws its tooltip so, and `app` draws its own so with the look of the mockup |

**Glass.** The bars and the tutor's panel float over the sheet as glass: `.glass` of the helmet — `rgba(255,255,255,0.76)`, `backdrop-filter: blur(22px) saturate(180%)`, and a shadow `0 0 0 0.5px rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`. The tutor's panel is more opaque, `rgba(255,255,255,0.86)`, and on the phone 0.96; a sheet of the phone 0.98. Over the camera, `.glass-dark`: `rgba(44,44,46,0.58)`. Where `backdrop-filter` is not supported, the fill alone holds the contrast below.

**Radii.** Round buttons and the icon targets 22 (a target of 44); the top bar 24 (48 high); the tool bar 26 (52 wide); the tutor's panel and a sheet of the phone 28; cards 14–18; fields and small cards 12; a tooltip 9; marks and bars 2–4.

**Sizes.**
- An icon is 20 px in its target of 44, back 18; its lines 1.9 px, and 2.2 for arrows.
- The top bar: 48 high, 14 from the top, 16 from the left. The tool bar: 52 wide, 16 from the left, centred in height. The tutor's button: 56 round, 16 from the right, centred; on the phone, above the row. The debug button: the same, graphite with an orange glyph, 16 above the tutor's — on the page to pick from too, where the tutor is too, and hidden while the tutor's panel is open; its window is the tutor's panel, 400 wide.
- A primary button: 52 high, radius 14, 16 px semibold.
- Type: 14 px for the body; 11.5–13 for captions; 15–17 for emphasis; 22–38 for headings. Weight 700 for headings of every size, from 17 px — those of 22–38 px with a negative `letter-spacing` of −0.2 to −0.8 px —, for the headings of cards and for the digits of badges and steps, from 11 px; 400, 500 and 600 for the rest (`app` В71).

**The font** is the system font of `app`: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`, as the template's root has it. Caveat, with which the mockup writes the tutor's notes on the sheet and the example of "Show where", and Inter, the type of the photographed page, are not taken: the tutor's notes are in the system font until `app` settles a font of their own, a question its `docs/architecture.md` keeps open.

**Icons.** The mockup draws its icons as inline SVG; they show the place, the size and the weight, not the glyph. `app` and `canvas` draw icons of Material Symbols, Rounded — outlined, and filled for what is selected: the tools of `canvas` by the table of icon values in `docs/architecture.md`, the buttons of `app` in the closed list of buttons without a caption by its own choice, recorded in its `docs/architecture.md`.

**Buttons without a caption** are a closed list: back, close, ‹ ›, the tools of `canvas`, the speaker, Help, the tutor's button at the edge or in the bottom bar of the page to pick from, the phone's grabber and the buttons of the paper flow — the camera's "Take photo", flash and photos, the crop's grip "Move the task" and its show and hide atop the tools, a frame's "Remove the frame" and "Resize the frame", "Remove all frames" and Retake of the page to pick from where its top bar does not fit one row with its words, and "Ask", the tutor's button of the solving screen of a task from paper, where its bottom bar does not fit one row with its words. Each has its caption as its accessible name and a tooltip of the same words, on hover and on keyboard focus; the mockup gives the new ones no tooltip yet, and «Remove the frame» as the cross's, which `app` and `canvas` draw with one. «…» of other authors' kinds waits for epic E5. The mockup's tooltip is CSS alone (`.tip` of the helmet) and cannot be dismissed by Escape; `app` and `canvas` draw a tooltip of their own that can, as WCAG 1.4.13 asks. Every other button keeps its caption.

**Pop-overs, not panels.** A list or a choice stands behind a small button and opens over the screen: the segments of a lesson, the solving steps, the solving mode, the options of a choice, the tasks of a page, the sheets on the phone, the profile's menu, For grown-ups with the hint mode, the notifications, the module of the skill map, Help, the avatars, the countries. On the iPad it hangs from its button and grows from its corner (`.nt-pop`, 0.2 s); on the phone it is a sheet from the bottom. The screen keeps no static panel but the row of places, the tool bar and the tutor's panel.

**Motion.** Transitions of 0.15–0.35 s, on `cubic-bezier(.2,.8,.2,1)`; `prefers-reduced-motion: reduce` turns off every animation and transition (the helmet; WCAG 2.3.3).

## Contrast

The pairs of the mockup's colours by WCAG 2.2: 1.4.3 for text, 4.5:1, or 3:1 for text of 24 px, or 18.66 px bold; 1.4.11 for what identifies a control or a state, 3:1. The ratios are by the formula of WCAG's relative luminance; a translucent colour is laid over the colour it stands on. `app` and `canvas` take the replacements into their own colours: `app`'s theme is the mockup's style with these replacements.

| Pair | Where | Ratio | Holds | Instead |
|---|---|---|---|---|
| `#1D1D1F` on `#FFFFFF`, on `#F2F2F7` | text | 16.8, 15.1 | 1.4.3 | — |
| `#6E6E73` on `#FFFFFF`, on `#F2F2F7`, on glass | secondary text | 5.07, 4.54, 4.95 | 1.4.3 | — |
| `#6E6E73` on a grey fill of 0.12, on `#E5E5EA` | secondary text on a chip or a locked node | 4.41, 4.04 | no | `#636366` |
| `#3A3A3C` on `#FFFFFF` | a segmented control | 11.4 | 1.4.3 | — |
| `#0071E3` on `#FFFFFF`, on glass over white | a link, a word in the accent | 4.70, 4.70 | 1.4.3 | — |
| `#0071E3` on `#F2F2F7` | a link on the page | 4.21 | no | `#0066CC`, 4.99 |
| `#0071E3` on its own fill of 0.10–0.12 | the word of a selected option or tool | 4.10–3.98 | no for text; 1.4.11 for an icon | `#0066CC`, 4.86–4.72 |
| `#FFFFFF` on `#0071E3` | a primary button | 4.70 | 1.4.3 | — |
| `#FFFFFF` on `#248A3D` | the badge "Correct" | 4.40 | no, below 18.66 px bold | `#1E7A35`, 5.40 |
| `#FFFFFF` on `#C93400` | the badge "Not yet" | 5.28 | 1.4.3 | — |
| `#1E7A35` on `#EAF8EE`, `#B25000` on `#FFF4E5`, `#0058B8` on `#E8F1FE` and `#F3F8FF`, `#6E6E73` on `#F5F5F7`, `#7A2EA8` on `#F7F0FC` | the words of the skill map's nodes | 4.92, 4.78, 5.97 and 6.37, 4.66, 6.76 | 1.4.3 | — |
| `#9A5B00` on a hint's fill | the caption "Hint" | 4.96 | 1.4.3 | — |
| `#A85A00` on `#FFFFFF` | "Next up" | 5.09 | 1.4.3 | — |
| `#23308C` on `#FFFFFF` | the tutor's notes | 11.2 | 1.4.3 | — |
| `#8E8E93` on a grey fill of 0.16 | a disabled button | 2.69 | exempt: an inactive control | — |
| White at 0.8 on white at 0.12 over the sky | "Add a learner", disabled | 4.40 | exempt; but the line that says why it waits is read | the line at 0.9, above |
| `#E8590C` on `#FFFFFF`, on `#FCFCFD` | the wavy mark | 3.58, 3.50 | 1.4.11 | — |
| `#0071E3` on `#FFFFFF`, on `#F2F2F7` | the focus ring, 2 px | 4.70, 4.21 | 1.4.11 | — |
| `#34C759`, `#FF9F0A`, `#B9D7FF`, `#E5E5EA` on `#FFFFFF` | the segments of a module's bar and the legend's swatches | 2.22, 2.06, 1.48, 1.26 | no | `#30A14E`, `#C77700`, `#3D8BE0` for ready, `#8E8E93` for locked — 3.32, 3.46, 3.52, 3.26 — with a white gap of 2 px between segments; in progress `#0A84FF`, 3.65, stays — the mockup's bar and legend draw them. The words of the states stand beside the bar and in its accessible name |
| `#AEAEB2` on `#EAF1FB`; `#636366` on a grey fill of 0.12 over it | the cognitive map in the row of places, shut; its "Soon" | 1.95; 4.60 | exempt: an inactive control; 1.4.3 | — |
| `#FFFFFF` on `#1D1D1F`; `#0066CC` on the tab bar, white at 0.96 over `#F2F2F7` | the place now in the row of places; the tab bar's | 16.83; 5.52 | 1.4.3 | — |
| `#C7C7CC` on `#FFFFFF` | the ring of an unticked checkbox | 1.68 | no | `#8E8E93`, 3.26 |
| A grey fill of 0.10–0.12 on `#FFFFFF` | the edge of a text field | 1.13–1.15 | no | a border of 1 px `#8E8E93` |
| The borders of the skill map's nodes on their fills | `#FFD8A8` on `#FFF4E5` and the like | 1.24–1.29 | the node is told by its word and icon | `skill-map`'s own, by its rule |
| `#FFD60A` on `.glass-dark` over the camera | flash, "Auto" | 12.3 | 1.4.3 | — |
| White on a tooltip | the tooltips | 16.8 | 1.4.3 | — |
| `#FFFFFF`, white at 0.8, 0.72 and 0.6 on `#161A3D` | the sign-in's card: the heading, its text, the captions, "Privacy and legal information" | 16.8, 11.0, 9.19, 6.73 | 1.4.3 | — |
| White at 0.88 on white at 0.1 over `#161A3D` | the line for grown-ups on the sign-in's card | 10.1 | 1.4.3 | — |
| `#64A8FF` on `#161A3D` | a link and Back on the sign-in's card | 6.87 | 1.4.3 | — |
| `#FFFFFF` on `#161A3D` at 0.4 over each glow of the sky | the language's pill | 5.37 over `#E0901E`, 8.35 over `#5B5FE0` | 1.4.3 | — |
| `#0071E3` on `#161A3D` | a primary button's fill, the focus ring, on the sign-in's card | 3.58 | 1.4.11 | — |
| White at 0.5 on a field of white at 0.08 over `#161A3D`; white at 0.55 on `#161A3D` | the edge of a code box; the ring of an unticked checkbox | 5.74, 5.89 | 1.4.11 | — |
| `#1F1F1F` on `#FFFFFF`; `#FFFFFF` on `#161A3D` | Google's button: its words; its fill on the card | 16.5, 16.8 | 1.4.3, 1.4.11 | — |
| `#FFFFFF`, white at 0.85 and 0.55, `#8FB8FF` on the rows, white at 0.07 over `#161A3D`; white at 0.55 and `#8FB8FF` on `#161A3D`; `#FFFFFF` on `#2B66F6` | the owner's profile: the labels, the values, the placeholder, "Choose"; the hint, "Choose an avatar"; "Continue" | 13.9, 10.4, 5.29, 6.91; 5.88, 8.38; 4.85 | 1.4.3 | — |
| White at 0.1 on `#161A3D`; white at 0.4 on the rows | the ring of the rows, the edge of the name's field; the chevron | 1.33; 3.52 | no; 1.4.11 | the name's field a border of 1 px white at 0.5, 4.65 on the rows, as the sign-in's fields; the chevron — |
| `#FFFFFF` on white at 0.12 over the sky | "Sign out" on "Who's learning?" | 9.46 where the sky under it is brightest | 1.4.3 | — |
| `#FFFFFF`, white at 0.7 over the sky | the heading and the line under it on "Who's learning?" | 11.2, 6.91 | 1.4.3 | — |
| `#FFFFFF`, white at 0.6 on `#161A3D`; `#FFFFFF` on `#2B66F6` | a profile's card: the name, whose profile; "Start" | 16.8, 6.75; 4.85 | 1.4.3 | — : the design's `#2F6BFF` gives 4.499 |
| White at 0.9 on white at 0.12 over the sky | the line why "Add a learner" waits, or what it adds | 5.07 at the orange glow | 1.4.3 | — : the design's 0.55 gives 2.97 |
| White, 2 px, over the sky | the focus ring around a card of "Who's learning?" | 5.34 | 1.4.11 | — : `#0071E3` gives 1.14 at the orange glow |

## Where it differs from the documents

The mockup is the look; the documents keep the behaviour. What the mockup shows differently, and who brings it to the documents:

| The mockup | The documents | Who changes it |
|---|---|---|
| The sheet is three screens wide, whatever is written | The sheet goes past the task's page as far as the ink and the tracing paper and one view more, within 10000 × 14000 units | — : the mockup's width is a convenience of the drawing |
| The grid of a task from paper stays as turned while the mockup runs | `app` keeps it in its solving screen's state across the tasks of one visit, and a reload or a new visit brings back dots | — |
| Caveat and Inter | The system font of `app` | `app`, `canvas`: they keep the system font |
| Icons as inline SVG | Material Symbols, Rounded | `app`, `canvas` |
| Colours that fail the contrast above | WCAG 2.2 AA | `app` by its theme, `canvas` by its style properties; the table above |
| A tooltip of CSS alone, which Escape does not dismiss | A tooltip that can be dismissed (WCAG 1.4.13) | `app`, `canvas` |
| Two fixed sizes in absolute px | A layout from the width, down to 320 CSS px | `app`, `canvas`, by the rules of "Two sizes" above |
| The sheet moves by dragging, with no buttons "Up", "Down", "Left" and "Right" | The same, and 2.5.7 a declared nonconformance | `canvas` drops the buttons and declares it, `app` names it on its page Accessibility (Д242) |
| The demo's first Check "Not yet", the second "Correct" | The program decides each verdict of a task of a module by the key, and the model's Check each verdict of a task from paper | Nobody: a convention of the demo |
| The staircase of the demo, and `solve-nokey`: a word problem unchecked, its solution having no one answer | The Check judges a task of any form; "Couldn't check this one" is left for a Check that read nothing of a solution in any slot | `app` shows the state only then |
| `pick-debug`: a second model to read the work | One model chosen for every call of a task from paper: the Check is one call, of one model at a time | `app` |
| `solve-debug-export`: the truth holds each task's statement, formula and key | The truth is each answer's value read and its verdict | `app` |
| On a task with options, "Circle an answer first" on an empty sheet, and "No circled answer found" or "Two answers are circled" after the reading | `app` does not know whether a task from paper has options: an empty sheet is "Write your solution first", and the reasons `no_final_answer` and `several_final_answers` are "No answer found" and "More than one answer" | `app` |
| The task screen's states that the mockup does not draw — a task already over, the failures, the reasons of an unreadable answer, the lines of a hidden button | `app` draws them by the rules of style here | `app`; the canvas note `t155` names each by the key of its string |
| The texts' gists and versions written into the mockup, and five countries | The texts come from `api` (`LegalService`), and the countries are those the deployment accepts | `app` reads them; the mockup's are a sample |
| The "G" of Google's button drawn by paths of its own | `app` takes Google's own file of the "G", from the assets of its button, with its notice (sources 4.8) | `app` |
| Google's button in the system font | Google's rules give it Google Sans Medium (sources 4.8), and `app` has no fonts of its own | Nobody: the system font, with Google's colours and "G" |
| A tap on "Русский" in the sign-in's language only closes the pop-over | `app` shows its screens in the language chosen | Nobody: the mockup is in English |
| "Privacy and legal information" on the sign-in's card opens the gist of the Privacy Policy | It opens the list of the legal pages | Nobody: the mockup has no list of them |
| The skill map in the frame is a sketch | `skill-map` draws a module's map | `skill-map` |
| The notifications: a bell without a caption, and "Nothing new yet" | Nothing sends a notification, and the bell is outside the closed list of buttons without a caption | Open: the list takes it, or `app` captions it — the author's word |
| On the phone the profile's menu is its avatar alone | Outside the closed list of buttons without a caption: elsewhere the name stands beside it | Open, with the bell |
| The cognitive map in the row of places, shut, with "Soon" | The documents have no cognitive map | Nobody until it comes: `app` shows the place shut |
| Subjects: the catalog's descriptions and tags, and "Connect" on the check board | The catalog and what connects are `ModuleService`'s; a module's words come from its manifest | `app` draws them from the contract; the mockup's are a sample |
| The field and the microphone of the tutor's panel on Home and on a task of a module, and the answers there; the answer to a question and the speech in the field simulated everywhere | The field is on the page to pick from, for a request about the frames, and on a task from paper, for a question to the tutor by `AskTutor`; on Home and on a task of a module the panel's parts but the field are on, its line buttons. The microphone is an adult's alone, the browser's Web Speech API; a child's is off until П-5 | `app`: the one panel with its parts off there, and `AskTutor` and the browser's recognition behind the field |
| Pip's greeting "Hi, I'm Pip…", in the first person | Strings do not speak in the first person of AI | Epic E4 of `app` rewords it |
| What the tutor answers to a free question of Pip's field: the rung, the rung in other words, or a fixed text | The documents do not say | Epic E4 of `app` |
| The camera gives no reminder to keep names out of the photo | On the camera, before the photo, `app` reminds the learner to keep names out of it | `app`: the line on the camera's screen, under the viewfinder |
| The camera finds the page, "Page found · hold still", with a flash and "Auto", and a strip "DEMO PAGE" | `app`'s camera finds no page and has no flash: the first slice has no model on the device | `app` builds none of them; the strip is the mockup's own |
| A frame the AI found has no cross | Every frame's cross removes it, the AI's too | `app` |
| The demo page has fewer than 20 tasks, and no line says the limit | With 20 found, a line says that is the most at once, and with more than 20 picked, why Start is shut | `app` |
| A frame by hand is dragged alone | A rectangle dragged corner to corner, or two taps on opposite corners, which need no path (WCAG 2.5.1, 2.5.7) | `app` |
| The paper flow's buttons without a caption have no tooltip | A tooltip of the same words as the accessible name | `app` draws them, `canvas` the grip's and the button's |
| The crop over the sheet is fixed on the screen, in one place for every task | The tracing paper lies in sheet units, and each task has its own place, `TracingState.at` | `canvas` |
| "Hide the task" is a switch with `aria-pressed`, its name changing too | Its name tells the state, with no `aria-pressed`: the state is told once | `canvas` |
| Under "Later": the canvas kinds of other authors, under «…» in the top bar of a task from paper | Other authors' widgets come at stage 4, in a sandbox | Epic E5 |
| The demo's request is understood by its words — "left", "right", "each" —, and gives the tasks of the demo page | The finding gets the request as data, with the photo and the frames, and its answer is frames alone | Nobody: a convention of the demo |
| The tutor's field: Send and the microphone are icons alone | Neither is on the closed list of icons alone: `app` shows each with its caption, "Send" and the microphone's, "Voice comes later" while it is off in a child's profile | Nobody: `app` captions them |
| Grown-up mode on a task from paper: the key in the tutor's head, the PIN for grown-ups asked in a dialog — 5555 for now, until a page of all the settings sets it —, the tutor's limits lifted until Turn off or another task, and the tutor acting on the sheet as asked — writing the solution on, striking out, underlining or circling a line in red, hatching, erasing it —, each act strokes of its own, drawn within 3 s, that Undo takes back whole | The documents say the same; `app`, `api`, `tutor` and `canvas` do not have it yet | Open: `app`, `api`, `tutor` and `canvas` on e23fix |
| The tutor's panel on the screen of solving: "AI tutor · " with the task's name under its title, an opening line without the word "AI", "Explain differently" drawn and off, and a red dot on the tutor's button after a Check with the panel closed | The share of the quota under the title, as on a task of a module; "Explain differently" only while the rung has the right to it, as on a task of a module; no dot, as on a task of a module | `app` |
| The demo's switch "First slice" / "Later", and the DEMO "Tutor time used up" | Not part of the app | Nobody: the mockup's own |
| On the page to pick from and the solving screen of a task from paper, the tutor's button at the right edge and the debug button above it | Both stand in the bottom bar, by the author's variant 1b, `draft/Knopki-v-nizhnej-paneli-1b.html`: on the page to pick from, the tutor's icon and the debug button before the selection and Start; on the solving screen, the debug button and the tutor's "Ask" before Hint and Check, "Ask" its icon alone where the row does not fit with its words; the right edge free | `spec`: the mockup; `app` draws it already |
| The debug button and its window: the models chosen past the admission list, what each returned, the cost in dollars, and a Check exported as a case of `tutor-eval`; the button has no caption, outside the closed list | Only for an account with the right of the debug mode, on a local run and on the deployment | `spec`, `tutor`, `api`, `app` |
| The debug window's Log of the app — its lines, levels and sources, the filter, Copy —, and its Performance — frames, the main thread, the canvas, memory estimated, the strip on the canvas, the flash of what is repainted | The documents name neither: the debug window has the models and the AI's calls alone | `app` and `canvas`, once the author has taken the look |
