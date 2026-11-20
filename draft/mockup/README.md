# The interface mockup

The look of `app` and of the tool panel of `canvas` (R148): every screen of the first slice with adults, from sign-in to the end of a lesson and through the paper flow of epic E11, and under "Later" the children's screens of epic E4 of `app` and the canvases of other authors of epic E5, each in two sizes — an iPad of 1194 × 834 CSS px in landscape and a phone of 390 × 844 in portrait. The mockup is the look; the behaviour — what a screen does, what it sends and to whom — is the documents' and the decisions'. Where they differ, the documents win, and the table at the end names each difference and who changes it.

A session of `app` or `canvas` opens the mockup itself, from its `spec/` submodule, and compares its own screen with it by Playwright, without the author (R146; R148). This README is what it reads first: the files, how to open a state, the map of the screens, the two sizes and the rules between them, the style, the contrast and the differences.

## The files

The files of the claude.ai Design canvas [Take from my paper](https://claude.ai/artifact/Vt9G8W392cMTTMykiByrcb#play-15dd8cd198dd) as they are, with the phone of RUN.md, T154, and the lesson and the task of the first slice of RUN.md, T155, each approved by the author on 2026-11-14 by snapshots, and the paper flow as it will be after epic E11, RUN.md, T220:

- `Main.dc.html` — every screen, with its prop `device`: `ipad` or `phone` (R148). Its template is in `<x-dc>`, with the styles of its helmet; the data of the screens and the class `Component` are in the script after it, and what each screen draws is the values of its `renderVals`.
- `Phone.dc.html` — the phone's board: `Main.dc.html` with `device="phone"`.
- `Paper.dc.html` — the photographed page of the paper flow, synthetic.
- `canvas.json` — the boards and the canvas's notes, in Russian: `howto` is the path through Play, and `t155` names what of the task screen of `app` the mockup does not draw, by the key of its string, and why.

The canvas is behind these files: the account of the session that ran T220 could not read it, so T220's publish did not go through (Д278). The debug button and window of a local run, RUN.md, T233, are on a canvas of their own, [NovaTrail · Debug panel](https://claude.ai/artifact/2rt34xc3FMdz5a3i1CJLKS#play-DebugPlay), approved by the author on 2026-11-19: `Main.dc.html` of here with its prop `debug` on, and boards that open it at a state by its prop `at`. Until a publish goes through, the newest sources are here, and a change of the look is made in these files, with `states.mjs` below.

The files of the canvas's own runtime, `support.js` and `artifact-type/`, are not here: they are not NovaTrail's, and their license is unknown. NovaTrail's own runtime, Apache-2.0 (R12), opens these files instead: [tools/mockup/](../../tools/mockup/runtime.mjs).

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
- `device` is `ipad`, the default, or `phone`.
- The page draws the board — `Main.dc.html` for the iPad, `Phone.dc.html` for the phone —, brings it to the state by the taps a person would make, runs the mockup's pending timers at once and then sets `data-ready="true"` on `<html>`. A state or a device it does not know sets `data-ready="error"`, with the reason in the page. From then on the page is the mockup in Play: it takes taps and pointers, and its timers run.

A snapshot by Playwright, for each state the screen being compared needs, in Chromium, WebKit and Firefox:

```js
const [w, h] = device === "phone" ? [390, 844] : [1194, 834];
const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
await page.goto(`http://127.0.0.1:8156/tools/mockup/?screen=${state}&device=${device}`);
await page.waitForSelector('html[data-ready="true"]'); // "error" names what failed
await page.locator("#frame").screenshot({ path: `mockup-${state}-${device}.png`, animations: "disabled" });
```

The helmets of `Main.dc.html` and `Paper.dc.html` link Caveat and Inter from Google Fonts; the runtime leaves out a link to another origin, so the page loads nothing from the network and draws with the next font of each list. Neither font is taken (R148), so a comparison reads the layout, the sizes and the colours, not the glyphs.

A state that shows what a timer of the mockup would end — `task-reading`, the work being read — holds the mockup's timers until the first tap or key, so that a snapshot cannot race them.

The runtime does what the sources use of the canvas's runtime, and nothing more: `{{path}}` in text and attributes, `<sc-if>`, `<sc-for>`, `<dc-import>`, `<helmet>`, and the class `DCLogic` with `setState` and the three callbacks. A tag `sc-*` or `dc-*` it does not know is an error, so that a newer source cannot draw silently wrong. `just mockup-test` draws every state on both devices under jsdom: each holds the text it shows, every `{{…}}` has its value, and nothing of the template is left; it also holds the table below to `states.mjs`, and the lines of the table of the template's parts to the template. spec's container has no browser, so the snapshots themselves are taken where Playwright is: in `app` and `canvas`.

## Screens and states

Each state is reached the way a person reaches it in Play, from the state before it, by the steps of [tools/mockup/states.mjs](../../tools/mockup/states.mjs). Its name is the `screen` of the address. "Under" says whose the screen is: the first slice, which epic E12 of `spec` drew for `app` and `canvas`, or what comes later — under the switch "Later · E4 app, E5" on "Who's learning?" (R148). The paper flow is in the first slice since RUN.md, T220: the main feature of the app, open to every profile, as epic E11 builds it.

| State | What it shows | Under |
|---|---|---|
| `signin` | Sign-in: "Continue with Google", for grown-ups alone | First slice |
| `signin-signing` | Sign-in while Google's window is open | First slice |
| `invite` | The invite code, empty | First slice |
| `invite-filled` | The invite code, accepted | First slice |
| `agree` | "I am 18 or older" and the Terms of Use and the Privacy Policy, each with its gist | First slice |
| `agree-ticked` | The same, ticked: "Create account" on | First slice |
| `legal-privacy` | The gist of the Privacy Policy in force, and its next version | First slice |
| `legal-terms` | The gist of the Terms of Use in force | First slice |
| `owner` | The owner's profile after "Create account", empty | First slice |
| `owner-avatars` | The owner's profile, the avatars of the set | First slice |
| `owner-countries` | The owner's profile, the countries | First slice |
| `owner-filled` | The owner's profile, filled in | First slice |
| `who` | "Who's learning?": the owner's profile alone, "Add a learner" disabled | First slice |
| `home` | Home: the next lesson, the share of the tutor's time, "Take from my paper", the three modules with the states of their skills | First slice |
| `home-help` | Home, the adult's Help | First slice |
| `home-switch` | Home, the profile's menu: the hint mode — "Questions only" or "Show where" — and "Switch learner" | First slice |
| `home-legend` | Home, what the marks mean: on the phone a sheet, on the iPad the legend that stands under the modules | First slice |
| `legal-access` | The page Accessibility, from Help | First slice |
| `map` | The skill map of olympiad maths, in its frame | First slice |
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
| `lesson-end` | "Lesson complete", "Next lesson", "Back to My subjects" | First slice |
| `workbook` | A task on a workbook page of six lines | First slice |
| `workbook-not-yet` | A workbook page, two lines "Not yet" | First slice |
| `workbook-shown` | A workbook page, the solution shown: the task is over | First slice |
| `essay` | An essay on a lined sheet, to a rubric, with the reminder to write no names | First slice |
| `essay-feedback` | An essay, its feedback | First slice |
| `essay-done` | An essay after "Done": the marks by the criteria, to an adult | First slice |
| `camera` | The camera of the paper flow, from "Take from my paper" | First slice |
| `pick` | The tasks the AI found on the photographed page, every one picked | First slice |
| `pick-frame` | A task the AI missed, framed by hand: a loop drawn round it became a frame, with its cross and its corner | First slice |
| `pick-ask` | The tutor's panel on the page to pick from: its line on what it takes, the field with a request about the frames typed, the reminder to write no names, the microphone there and off | First slice (RUN.md, T236) |
| `pick-asked` | The request sent: the left column's three equations found anew and picked, the learner's request and the program's line "Found 3 tasks" in the conversation, and Undo | First slice (RUN.md, T236) |
| `solve` | A picked task on a clean sheet, its crop as tracing paper | First slice |
| `solve-tasks` | The list of the picked tasks, the framed one among them | First slice |
| `solve-empty` | Check without work: "Write your solution first" | First slice |
| `solve-reading` | The work being read: the crop with the strokes on it | First slice |
| `solve-not-yet` | "Not yet" as a card, the first rung in the tutor's panel, and the wavy line under the place of the mistake: the demo's profile has "Show where" on | First slice |
| `solve-correct` | "Correct", and "Next task" | First slice |
| `solve-all` | Every task of the page over: "New photo" | First slice |
| `pick-several` | A frame drawn by hand round two equations of the page at once | First slice (RUN.md, T235) |
| `solve-several` | Check of a frame of two tasks, each by its own key: "Not yet · 1 of 2 correct", and a tick or a cross on a white halo by each answer on the crop; a second Check, "Correct · 2 of 2" | First slice (RUN.md, T235) |
| `olympiad` | A problem of an olympiad book on its sheet: the answer is an option circled on the crop | First slice |
| `solve-circle` | Check with no option circled: "Circle an answer first" | First slice |
| `solve-nokey` | A task that could not be checked: the AI's solution gave no answer a program can compare, so it has no key; hints still work | First slice |
| `pick-debug` | The page photographed on a local run with `api`'s debug flag: the debug button above the tutor's, and its window's Models — the first model for every call, a second to read the work | Local run alone (RUN.md, T233) |
| `solve-debug-log` | A Check on a local run with the debug flag: the debug button above the tutor's, and its window's Log — each call, what the model returned, its cost, the session's total, and Export beside a Check; as admitted, the work read in two attempts, Haiku's unreadable and then Sonnet's (R164) | Local run alone (RUN.md, T233, T234) |
| `solve-debug-export` | A Check of the Log exported: its truth — for each task of the frame its statement, formula, key, value read and verdict, and a note — filled in from the calls for the developer to correct, and Save case, a file of `DebugCase` that `tutor-eval -paper` reads | Local run alone (RUN.md, T233) |
| `later-who` | "Who's learning?" with the children Comet and Juniper | Later · E4 app |
| `later-add` | "Add a learner": the steps of a parent's consent | Later · E4 app |
| `later-pin` | The owner's profile behind the PIN | Later · E4 app |
| `later-home` | A child's home | Later · E4 app |
| `later-help` | A child's Help, with the helplines | Later · E4 app |
| `later-pip` | Pip, a child's tutor, with its text field and microphone | Later · E4 app |
| `later-kinds` | The canvas kinds of other authors, under «…» in the top bar of a task from paper | Later · E5 |

A state shows its demo: the first Check of a task is "Not yet" and the second "Correct", so that a lesson and a page show every part. That is the mockup's convention, not behaviour: the program decides each verdict by the key (R03). On the demo's pages the AI finds five of the six equations and all six problems; one problem, the staircase, has no key — its solution gives no one answer.

### The template, part by part

Each part of the template opens with a comment `<!-- ============ … ============ -->` at its line of `Main.dc.html`; `just mockup-test` holds these lines to it. What a part draws on the phone is in the rules `.nt-phone` at the end of the helmet's styles.

| Line and part | What it draws |
|---|---|
| `Main.dc.html:162` — Surfaces | The sheet, two screens tall and as wide as the screen: for a task from paper dotted; in a lesson squared, lined or a workbook page, the module's; the number line and the geometry board of other authors |
| `Main.dc.html:226` — Camera | The camera's viewfinder |
| `Main.dc.html:268` — The photographed page | The page to pick tasks on: the tasks the AI found, the learner's frames with their cross and corner, and the loop being drawn |
| `Main.dc.html:306` — Ink on the screen | The learner's strokes, the eraser's targets, the tutor's marks: a lesson's box, the wavy line of "Show where" |
| `Main.dc.html:331` — Clean sheet | A task's crop over the sheet, the strokes on it, and the wavy line on it |
| `Main.dc.html:366` — Author canvases | The sandbox's chip |
| `Main.dc.html:374` — A lesson | The explanation's card, the statement above the canvas, the worked example's parts |
| `Main.dc.html:417` — Top bar | Back, the title and the line under it, the segments' pop-over, «…» of other authors' kinds under "Later", ‹ tasks ›, Retake, the solving mode |
| `Main.dc.html:494` — More canvas kinds | The pop-over of other authors' kinds, under "Later" |
| `Main.dc.html:524` — Tool rail | The tools of `canvas` as a vertical glass bar, and above them the crop's show and hide |
| `Main.dc.html:560` — The tutor | The tutor's button at the right edge and its panel: the head with the quota and the speaker, the steps, the conversation, Hint and "Explain differently", Pip's field and microphone |
| `Main.dc.html:811` — A lesson | The row of actions, the step's pill, the options, the solution's confirmation, "Report a problem", "Lesson complete" |
| `Main.dc.html:975` — Pick | What left the device, Select all, Start |
| `Main.dc.html:992` — Solve | The list of the tasks, the bar Hint · Check, the verdict as a card |
| `Main.dc.html:1069` — Debug | Only on a local run with `api`'s debug flag: the debug button beside the tutor's and its window, Models and Log (RUN.md, T233) |
| `Main.dc.html:1250` — Sign-in | Welcome, the invite code, "I am 18 or older" and the texts |
| `Main.dc.html:1356` — The owner's profile | The name, the country, the avatar |
| `Main.dc.html:1416` — Who's learning | The profiles, "Add a learner", the PIN, the steps of a parent's consent, the demo's switch |
| `Main.dc.html:1503` — Home | The next lesson, the quota, "Take from my paper", the module cards, the legend, Help, the profile's menu with the hint mode |
| `Main.dc.html:1698` — The skill map | The frame, and in it the sketch of what `skill-map` draws |
| `Main.dc.html:1735` — A legal text | The gist of a text, or the page Accessibility |

## Two sizes, and the rules between them

The mockup is drawn in absolute CSS px for its two sizes; `app` and `canvas` lay their screens out by the rules below, from the width of the viewport, not from the kind of device (R148; R90, WCAG 1.4.10).

- **The phone's layout — a width below 600 CSS px.** It is the reference of 390 × 844: one column that scrolls; the tool bar of `canvas` the same vertical glass bar at the left edge; the tutor a sheet from the bottom, at half the height with the task in view above it, its grabber taking it to the whole screen; a pop-over a sheet from the bottom with a close button, which a tap outside closes; «…» of other authors' kinds, under "Later", a button of the right bar; a legal text over the whole screen; the skill map's tiers from top to bottom; the statement of a task folded to one line.
- **The tablet's layout — 600 CSS px and wider.** It is the reference of 1194 × 834: the top bar a glass pill at the top left, the tool bar at the left edge, the tutor's panel 344 px wide at the right, from under the top bar to 16 px from the bottom, and the sheet slides left while it is open, so that the task stays in view; pop-overs hang from the button that opens them.
- **An iPad in portrait, 834 × 1194,** is the tablet's layout. Home keeps its places in a column 834 wide: the cards of the modules and of "Take from my paper" two in a row instead of four. On a canvas the tutor's panel keeps its 344 px and the sheet slides under it.
- **A computer** is the tablet's layout. Home and the sign-in keep the width of the reference, 1194 px at most, centred on the page's colour; a canvas fills the window — the sheet is wider than any screen, and moves under the hand or the wheel —, with the bars at the same edges.
- **A phone in landscape** is the tablet's layout by its width; its height of 390 holds the tool bar, which scrolls inside its glass when it does not fit.
- **320 CSS px,** and a zoom of 400 % of 1280: the phone's layout reflows with no horizontal scroll of the page; only the sheet scrolls both ways, as WCAG 1.4.10 allows a two-dimensional layout. The vertical bar of seven tools fits it (R90).
- Every target is at least 44 × 44 CSS px, the grabber 88 × 44 (R90).

## The style

**Colours.** The roles, by the colours of the template:

| Role | Colour |
|---|---|
| The page | `#F2F2F7`; the owner's profile and "Who's learning?" `#F5F5F7` |
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
| A tooltip | white on an opaque `#1D1D1F`, 12.5 px, radius 9: a translucent fill over the canvas would give a contrast that depends on the strokes beneath it, which axe cannot check. `canvas` draws its tooltip so (R84 canvas), and `app` draws its own so with the look of the mockup (R148) |

**Glass.** The bars and the tutor's panel float over the sheet as glass: `.glass` of the helmet — `rgba(255,255,255,0.76)`, `backdrop-filter: blur(22px) saturate(180%)`, and a shadow `0 0 0 0.5px rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`. The tutor's panel is more opaque, `rgba(255,255,255,0.86)`, and on the phone 0.96; a sheet of the phone 0.98. Over the camera, `.glass-dark`: `rgba(44,44,46,0.58)`. Where `backdrop-filter` is not supported, the fill alone holds the contrast below.

**Radii.** Round buttons and the icon targets 22 (a target of 44); the top bar 24 (48 high); the tool bar 26 (52 wide); the tutor's panel and a sheet of the phone 28; cards 14–18; fields and small cards 12; a tooltip 9; marks and bars 2–4.

**Sizes.**
- An icon is 20 px in its target of 44, back 18; its lines 1.9 px, and 2.2 for arrows.
- The top bar: 48 high, 14 from the top, 16 from the left. The tool bar: 52 wide, 16 from the left, centred in height. The tutor's button: 56 round, 16 from the right, centred; on the phone, above the row. The debug button of a local run (RUN.md, T233): the same, graphite with an orange glyph, 16 above the tutor's — on the page to pick from too, where the tutor is since RUN.md, T236, and hidden while the tutor's panel is open; its window is the tutor's panel, 400 wide.
- A primary button: 52 high, radius 14, 16 px semibold.
- Type: 14 px for the body; 11.5–13 for captions; 15–17 for emphasis; 22–38 for headings. Weight 700 for headings of every size, from 17 px — those of 22–38 px with a negative `letter-spacing` of −0.2 to −0.8 px —, for the headings of cards and for the digits of badges and steps, from 11 px; 400, 500 and 600 for the rest (`app` В71).

**The font** is the system font of `app` (R17 app): `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`, as the template's root has it. Caveat, with which the mockup writes the tutor's notes on the sheet and the example of "Show where", and Inter, the type of the photographed page, are not taken (R148): the tutor's notes are in the system font until a font of their own comes by architecture 3.9 app.

**Icons.** The mockup draws its icons as inline SVG; they show the place, the size and the weight, not the glyph. `app` and `canvas` draw icons of Material Symbols, Rounded — outlined, and filled for what is selected (R78): the tools of `canvas` by the table of architecture 6, the buttons of `app` in the closed list of R90 by its own choice, recorded in its `docs/architecture.md` (the 2026-11-14 amendment to R78).

**Buttons without a caption** are the closed list of R90: back, close, ‹ ›, the tools of `canvas`, the speaker, Help, the tutor's button, the phone's grabber and the buttons of the paper flow — the camera's "Take photo", flash and photos, the crop's grip "Move the task" and its show and hide atop the tools, a frame's "Remove the frame" and "Resize your frame". Each has its caption as its accessible name and a tooltip of the same words, on hover and on keyboard focus; the mockup gives the new ones no tooltip yet, and «Remove the frame» as the cross's, which `app` and `canvas` draw by R90. «…» of other authors' kinds waits for epic E5. The mockup's tooltip is CSS alone (`.tip` of the helmet) and cannot be dismissed by Escape; `app` and `canvas` draw a tooltip of their own that can, as WCAG 1.4.13 asks. Every other button keeps its caption.

**Pop-overs, not panels.** A list or a choice stands behind a small button and opens over the screen: the segments of a lesson, the solving steps, the solving mode, the options of a choice, the tasks of a page, the sheets on the phone, the profile's menu with the hint mode, Help, the avatars, the countries. On the iPad it hangs from its button and grows from its corner (`.nt-pop`, 0.2 s); on the phone it is a sheet from the bottom. The screen keeps no static panel but the tool bar and the tutor's panel.

**Motion.** Transitions of 0.15–0.35 s, on `cubic-bezier(.2,.8,.2,1)`; `prefers-reduced-motion: reduce` turns off every animation and transition (the helmet; R90, 2.3.3).

## Contrast

The pairs of the mockup's colours by WCAG 2.2: 1.4.3 for text, 4.5:1, or 3:1 for text of 24 px, or 18.66 px bold; 1.4.11 for what identifies a control or a state, 3:1 (R90). The ratios are by the formula of WCAG's relative luminance; a translucent colour is laid over the colour it stands on. `app` and `canvas` take the replacements into their own colours — `app` by the amendment to R17 app of its row of `COORDINATION.md` (RUN.md, T157).

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
| Text at an opacity of 0.5 | "Add a learner", disabled | 2.00 | exempt; but the line that says why it waits is read | the line at full opacity, `#6E6E73` |
| `#E8590C` on `#FFFFFF`, on `#FCFCFD` | the wavy mark | 3.58, 3.50 | 1.4.11 | — |
| `#0071E3` on `#FFFFFF`, on `#F2F2F7` | the focus ring, 2 px | 4.70, 4.21 | 1.4.11 | — |
| `#34C759`, `#FF9F0A`, `#B9D7FF`, `#E5E5EA` on `#FFFFFF` | the segments of a module's bar and the legend's swatches | 2.22, 2.06, 1.48, 1.26 | no | `#30A14E`, `#C77700`, `#3D8BE0` for ready, `#8E8E93` for locked — 3.32, 3.46, 3.52, 3.26 — with a white gap of 2 px between segments; in progress `#0A84FF`, 3.65, stays. The words of the states stand beside the bar and in its accessible name, as now |
| `#C7C7CC` on `#FFFFFF` | the ring of an unticked checkbox | 1.68 | no | `#8E8E93`, 3.26 |
| A grey fill of 0.10–0.12 on `#FFFFFF` | the edge of a text field | 1.13–1.15 | no | a border of 1 px `#8E8E93` |
| The borders of the skill map's nodes on their fills | `#FFD8A8` on `#FFF4E5` and the like | 1.24–1.29 | the node is told by its word and icon | `skill-map`'s own, by its rule |
| `#FFD60A` on `.glass-dark` over the camera | flash, "Auto" | 12.3 | 1.4.3 | — |
| White on a tooltip | the tooltips | 16.8 | 1.4.3 | — |

## Where it differs from the documents

The mockup is the look; the documents keep the behaviour (R148). What the mockup shows differently, and who brings it to the documents:

| The mockup | The documents | Who changes it |
|---|---|---|
| Caveat and Inter | The system font of `app` (R17 app; R148) | `app`, `canvas`: they keep the system font |
| Icons as inline SVG | Material Symbols, Rounded (R78) | `app`, `canvas` |
| Colours that fail the contrast above | WCAG 2.2 AA (R90) | `app` by the amendment to R17 app, `canvas` by its style properties; the table above |
| A tooltip of CSS alone, which Escape does not dismiss | A tooltip that can be dismissed (R90; WCAG 1.4.13) | `app`, `canvas` |
| Two fixed sizes in absolute px | A layout from the width, down to 320 CSS px (R90; R148) | `app`, `canvas`, by the rules of "Two sizes" above |
| The sheet moves by dragging, with no buttons "Up", "Down", "Left" and "Right" | The same, and 2.5.7 a declared nonconformance (R90) | `canvas` drops the buttons and declares it, `app` names it on its page Accessibility (RUN.md, Д242) |
| The demo's first Check "Not yet", the second "Correct" | The program decides each verdict by the key (R03) | Nobody: a convention of the demo |
| On a task with options, "Circle an answer first" on an empty sheet, and "No circled answer found" or "Two answers are circled" after the reading | `app` does not know whether a task from paper has options: an empty sheet is "Write your solution first", and the reasons `no_final_answer` and `several_final_answers` are "No answer found" and "More than one answer" (R162) | `app` |
| The task screen's states that the mockup does not draw — a task already over, the failures, the reasons of an unreadable answer, the lines of a hidden button | `app` draws them by the rules of style here (R148) | `app`; the canvas note `t155` names each by the key of its string |
| The texts' gists and versions written into the mockup, and five countries | The texts come from `api` (`LegalService`), and the countries are those the deployment accepts | `app` reads them; the mockup's are a sample |
| The skill map in the frame is a sketch | `skill-map` draws a module's map (architecture 3.3) | `skill-map` |
| Under "Later": Pip with a text field and a microphone, simulated | The conversation line of the first slice is buttons, but for the field of a request about the frames on the page to pick from (R165); voice input for children waits for П-5 (product 10; R82; О-6) | Epic E4 of `app` |
| Pip's greeting "Hi, I'm Pip…", in the first person | Strings do not speak in the first person of AI (R91) | Epic E4 of `app` rewords it |
| What the tutor answers to a free question of Pip's field: the rung, the rung in other words, or a fixed text | The documents do not say | Epic E4 of `app` |
| The camera gives no reminder to keep names out of the photo | Before the camera, `app` reminds the learner to keep names out of it (privacy 6; R127) | `app`: the line under "Open camera" on the card and on the camera's screen (R71 app) |
| The camera finds the page, "Page found · hold still", with a flash and "Auto", and a strip "DEMO PAGE" | `app`'s camera finds no page and has no flash: the first slice has no model on the device (R66) | `app` builds none of them (R71 app); the strip is the mockup's own |
| A frame the AI found has no cross | Every frame's cross removes it, the AI's too (R162), by the author's word of 2026-11-19 | `app` (R71 app) |
| The pick screen's top bar holds Retake alone | "Remove all frames" beside Retake, while there is a frame, clears the photo for the learner's own frames, by the author's word of 2026-11-19 | `app` (R71 app) |
| The demo page has fewer than 20 tasks, and no line says the limit | With 20 found, a line says that is the most at once, and with more than 20 picked, why Start is shut (R162) | `app` (R71 app) |
| A frame by hand is a loop alone | A loop, or two taps on opposite corners, which need no path (R90; WCAG 2.5.1, 2.5.7) | `app` (R71 app), by the author's answer (a) to В79, 2026-11-19 |
| The paper flow's buttons without a caption have no tooltip | R90: a tooltip of the same words as the accessible name | `app` draws them by R60 app, `canvas` the grip's and the button's by R84 canvas (R87 canvas) |
| The crop over the sheet is fixed on the screen, in one place for every task | The tracing paper lies in sheet units, and each task has its own place, `TracingState.at` (R162) | `canvas` (R87 canvas) |
| "Hide the task" is a switch with `aria-pressed`, its name changing too | Its name tells the state, with no `aria-pressed`: the state is told once | `canvas` (R87 canvas) |
| Under "Later": the canvas kinds of other authors, under «…» in the top bar of a task from paper | Other authors' widgets come at stage 4, in a sandbox (R16; product 10) | Epic E5 |
| The demo's request is understood by its words — "left", "right", "each" —, and gives the tasks of the demo page | The finding gets the request as data, with the photo and the frames, and its answer is frames alone (R165) | Nobody: a convention of the demo |
| The field of a request about the page: Send and the microphone are icons alone | Neither is on the closed list of icons alone (R90): `app` shows each with its caption, "Send" and "Voice comes later" (R74 app) | Nobody: `app` follows R90 |
| The tutor's panel on the screen of solving: "AI tutor · " with the task's name under its title, an opening line without the word "AI", "Explain differently" drawn and off, and a red dot on the tutor's button after a Check with the panel closed | The share of the quota under the title, as on a task of a module; first the line that the tutor is an AI; no "Explain differently" while a task from paper has no words of its own (R82); no dot, as on a task of a module (R148) | `app` (R75 app) |
| The demo's switch "First slice" / "Later", and the DEMO "Tutor time used up" | Not part of the app | Nobody: the mockup's own |
| The debug button and its window: the models chosen past the admission list, what each returned, the cost in dollars, and a Check exported as a case of `tutor-eval`; the button has no caption, outside R90's list | Only with `api`'s debug flag on a local run; no build or deployment for people has them (RUN.md, T233) | `spec`, `tutor`, `api`, `app` in RUN.md, T233 |
