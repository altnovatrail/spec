// mockup: the named states of the interface mockup, which the page opens by its address —
// ?screen=<name>&device=ipad|phone — and the test draws, each on both devices.
//
// A state is reached the way the learner or the adult reaches it in Play: from the state named by
// from, by the steps of run, which call the handlers that renderVals of Main.dc.html gives its
// buttons — what a tap on the button does. A step that must not wait for a timer of the mockup sets
// the state itself. shows is a text the drawn state holds, so a state that no longer reaches its
// screen fails the test. The table "Screens and states" of draft/mockup/README.md lists the same
// names, and the test holds the two to each other.

export const OLYMPIAD = "Olympiad maths 1–6";

// What a step gets: the component of Main.dc.html, its values now, synthetic work on the sheet, and the app's
// clock for a step that must let a timer end — a Check — before the next one.
export function helpers(c, app) {
  const v = () => c.renderVals();
  return {
    c,
    v,
    settle: () => app && app.settle(),
    les: () => v().les,
    // A stroke of the pen on the sheet or page open now: synthetic, no learner's work.
    ink: (d = "M300 420 C330 400 360 440 390 420") => {
      const key = c.inkKey();
      const list = c.state.strokes[key] || [];
      c.setState({ strokes: { ...c.state.strokes, [key]: list.concat([{ d, tool: "pen", x: 300, y: 420, ts: 0, bb: [300, 400, 390, 440], closed: false }]) } });
    },
  };
}

// Two lines of a solution on the sheet, written by the demo's hand: synthetic, no learner's work.
function written(t) {
  const ph = t.c.phone(), x = ph ? 96 : 370, y = ph ? 230 : 250, H = ph ? 30 : 44;
  const lines = t.c.hand("2x + 5 = 20", x, y, H).concat(t.c.hand("2x = 15", x, y + H * 1.6, H));
  t.c.setState({ strokes: { ...t.c.state.strokes, [t.c.inkKey()]: lines } });
}
function boxOf(list) {
  const bs = list.map((st) => st.bb);
  return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
}
// A lasso round the second line, a little uneven, as a hand draws it.
function ring(t) {
  const ph = t.c.phone(), H = ph ? 30 : 44, list = t.c.state.strokes[t.c.inkKey()] || [];
  const b = boxOf(list.filter((st) => st.bb[1] > (ph ? 230 : 250) + H * 1.3));
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) / 2 + 26, ry = (b[3] - b[1]) / 2 + 22;
  return Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * 2 * Math.PI, w = 1 + 0.05 * Math.sin(3 * i);
    return [cx + rx * w * Math.cos(a), cy + ry * w * Math.sin(a)];
  });
}

const lesson = (name) => (t) => t.c.openLesson(name);
const cont = (t) => t.les().cont();

export const STATES = [
  // Sign-in, by invitation, of a grown-up alone.
  { name: "signin", title: "Sign-in", shows: "Sign in with Google", desktop: true, run: () => {} },
  { name: "signin-language", title: "Sign-in, the language", from: "signin", shows: "Русский", desktop: true, run: (t) => t.v().toggleLang() },
  { name: "signin-signing", title: "Sign-in, Google's window open", from: "signin", shows: "Accounts are for grown-ups", desktop: true, run: (t) => t.c.setState({ auth: "signing" }) },
  { name: "invite", title: "The invite code, empty", from: "signin", shows: "Tap the boxes to paste the code", desktop: true, run: (t) => t.v().signIn() },
  { name: "invite-filled", title: "The invite code, accepted", from: "invite", shows: "Code accepted", desktop: true, run: (t) => t.v().fillCode() },
  { name: "agree", title: "18 or older, and the texts", from: "invite-filled", shows: "I am 18 or older", desktop: true, run: (t) => t.v().codeNext() },
  { name: "agree-ticked", title: "18 or older, and the texts, ticked", from: "agree", shows: "Create account", desktop: true, run: (t) => (t.v().toggle18(), t.v().toggleTerms()) },
  { name: "wait", title: "Waiting on the sky", from: "signin", shows: "Loading", run: (t) => t.c.setState({ screen: "wait", waitOn: "sky" }) },
  { name: "legal-privacy", title: "The gist of the Privacy Policy", from: "agree", shows: "Privacy Policy", run: (t) => t.v().openPrivacy() },
  { name: "legal-terms", title: "The gist of the Terms of Use", from: "agree", shows: "Terms of Use", run: (t) => t.v().openTerms() },

  // The owner's profile, after "Create account" (CreateOwnerProfile).
  { name: "owner", title: "The owner's profile, empty", from: "agree-ticked", shows: "Choose an avatar", run: (t) => t.v().createAccount() },
  { name: "owner-avatars", title: "The owner's profile, the avatars", from: "owner", shows: "Comet", run: (t) => t.v().toggleAvatars() },
  { name: "owner-countries", title: "The owner's profile, the countries", from: "owner", shows: "New Zealand", run: (t) => t.v().toggleCountries() },
  {
    name: "owner-filled",
    title: "The owner's profile, filled in",
    from: "owner",
    shows: "United States",
    run: (t) => {
      t.c.setState({ ownerName: "Sam" });
      t.v().avatars[5].pick();
      t.v().countries[0].pick();
    },
  },

  // "Who's learning?" and home, in the first slice: the owner's profile alone.
  { name: "wait-home", title: "Waiting on the page", from: "signin", shows: "Loading", run: (t) => t.c.setState({ screen: "wait", waitOn: "page" }) },
  { name: "who", title: "Who's learning?", from: "owner-filled", shows: "Add a learner", run: (t) => t.v().ownerDone() },
  { name: "home", title: "Home", from: "who", shows: "The tutor picks the skill", run: (t) => t.v().profiles[0].pick() },
  { name: "home-loading", title: "Home, while it is read", from: "home", shows: "Tasks from my paper", run: (t) => t.c.setState({ homeLoading: true }) },
  { name: "home-switch", title: "Home, the profile's menu: who is learning, Settings, Help, Sign out", from: "home", shows: "Switch learner", run: (t) => t.v().hs.toggleAccount() },
  { name: "home-help", title: "Home, the adult's Help in the profile's menu", from: "home-switch", shows: "Report a problem", run: (t) => t.v().hs.openHelp() },
  { name: "settings", title: "Settings: the profiles, this device, the language, the own key, privacy; on the iPad the profile's page beside them", from: "home-switch", shows: "Privacy", run: (t) => t.v().hs.openSettings() },
  { name: "settings-profile", title: "Settings: a profile's page, a hint mode changed and Save lit", from: "settings", shows: "Questions only", run: (t) => { t.v().st.profiles[0].open(); t.v().st.page.groups[2].rows[0].go(); } },
  { name: "settings-unsaved", title: "Settings: leaving a profile's page with changes not saved — Save, Don't Save or Cancel", from: "settings-profile", shows: "Save changes?", run: (t) => t.v().st.close() },
  { name: "settings-device", title: "Settings: this device — its voice, what each profile keeps on it, and erasing it", from: "settings", shows: "Erase this", run: (t) => t.v().st.sideGroups[0].rows[0].open() },
  { name: "settings-key", title: "Settings: own AI key — the provider, the key, keeping it here, Connect, and what happens to it", from: "settings", shows: "About the key", run: (t) => t.v().st.sideGroups[0].rows[2].open() },
  { name: "settings-key-on", title: "Settings: own AI key connected — the provider and its last four, keeping it here, Replace and Remove", from: "settings-key", shows: "Replace the key", run: (t) => t.c.setState({ stKeyText: "sk-ant-api03", stKeyKeep: true, stKeyOn: true }) },
  { name: "home-bell", title: "Home, the notifications: the next version of the privacy policy, its day and the way to it", from: "home", shows: "Privacy Policy: version 3", run: (t) => t.v().hs.toggleBell() },
  { name: "home-bell-keep", title: "Home, the notifications while a profile keeps its works on the server: that it can be turned off before the day", from: "home", shows: "turn that off in Settings", run: (t) => (t.c.setState({ stSaved: { [t.c.profilesNow()[0].id]: { keep: true } } }), t.v().hs.toggleBell()) },
  { name: "home-bell-none", title: "Home, the notifications with nothing new", from: "home", shows: "Nothing new yet", run: (t) => (t.c.setState({ bellNone: true }), t.v().hs.toggleBell()) },
  { name: "home-quota", title: "Home, tutor time by its ring at the top right: a fifth used, green", from: "home", shows: "Plenty left today", run: (t) => (t.c.setState({ quotaPct: 20, quotaOut: false }), t.v().hs.toggleQuota()) },
  { name: "home-quota-fresh", title: "Home, tutor time with none used yet: the ring's sign instead of a number", from: "home", shows: "None used yet today", run: (t) => (t.c.setState({ quotaPct: 0, quotaOut: false }), t.v().hs.toggleQuota()) },
  { name: "home-quota-half", title: "Home, tutor time more than half used: yellow", from: "home", shows: "More than half used", run: (t) => (t.c.setState({ quotaPct: 65, quotaOut: false }), t.v().hs.toggleQuota()) },
  { name: "home-quota-low", title: "Home, tutor time almost used up: red", from: "home", shows: "Almost used up", run: (t) => (t.c.setState({ quotaPct: 85, quotaOut: false }), t.v().hs.toggleQuota()) },
  { name: "home-quota-out", title: "Home, tutor time used up: the full red ring's sign, and when it comes back", from: "home", shows: "Used up for today", run: (t) => (t.c.setState({ quotaPct: 100, quotaOut: true }), t.v().hs.toggleQuota()) },
  { name: "home-legend", title: "Home, what the marks mean", from: "home", shows: "Time to review", run: (t) => t.v().hs.toggleLegend() },
  { name: "home-pages", title: "Home, the pages from paper on this device", from: "home", shows: "on this device", run: (t) => t.v().hs.togglePages() },
  { name: "home-tasks", title: "Home, which tasks to solve: the tutor's choice or a skill of the learner's own", from: "home", shows: "Which tasks to solve?", run: (t) => t.v().mods[0].pickOpen() },
  { name: "home-tasks-own", title: "Home, a skill of the learner's own chosen for a module's tasks", from: "home-tasks", shows: "Tasks on this skill alone", run: (t) => t.v().mods[0].rec[1].pick() },
  { name: "lessons", title: "The module's lessons, from the row of its lesson on Home", from: "home", shows: "IN ANY ORDER", run: (t) => t.v().mods[0].lessons() },
  { name: "subjects", title: "Subjects, the catalog of this server", from: "home", shows: "Introductory block", run: (t) => t.v().hs.goSubjects() },
  { name: "subjects-about", title: "Subjects, About a module under its ⋯", from: "subjects", shows: "Apache-2.0", run: (t) => t.v().hs.catOn[0].about() },
  { name: "subjects-skills", title: "Subjects, every skill of a module by its tier", from: "subjects", shows: "TIER 4 · OLYMPIAD", run: (t) => t.v().hs.catOn[0].skills() },
  // The check board connected, and its tasks on the sheet of a task from paper: a proposal to the author, the statement the module's text.
  { name: "board-home", title: "Home with the check board connected: its card", from: "subjects", shows: "0 of 3 mastered", run: (t) => (t.v().hs.catOff[0].connect(), t.v().hs.nav[0].go()) },
  { name: "board", title: "A task of the check board on the sheet of a task from paper", from: "board-home", shows: "Task of the module", run: (t) => t.v().mods[2].open() },
  { name: "board-tasks", title: "The check board's tasks, from the counter", from: "board", shows: "Houses in a row", run: (t) => t.v().toggleTasks() },
  { name: "board-long", title: "A task of the check board whose statement is three lines", from: "board", shows: "2 albums and 5 notebooks", run: (t) => t.c.pickTask(2) },
  { name: "board-scale", title: "The statement chosen: its bar of scale, with no Recognise", from: "board-long", shows: "90%", run: (t) => t.c.setState({ tSel: true, tScale: 0.9 }) },
  { name: "board-ask", title: "The tutor's panel on a task of the check board", from: "board", shows: "by text or voice", run: (t) => t.v().openChat() },
  { name: "board-not-yet", title: "Not yet on a task of the check board, and the wavy mark", from: "board", shows: "Not yet", run: (t) => (t.ink(), t.v().check()) },
  { name: "board-correct", title: "Correct on a task of the check board, and Next task", from: "board-not-yet", shows: "Correct", run: (t) => t.v().check() },
  // A task of the olympiad module on the same sheet, from Solve on its card: one at a time, as the engine picks it, the skill at the right. A proposal to the author.
  { name: "module-task", title: "A task of the olympiad module on the sheet of a task from paper", from: "home", shows: "Each line in the picture is a match", run: (t) => t.v().mods[0].solve() },
  { name: "module-task-options", title: "A task of the olympiad module, its answer options opened on the tracing paper", from: "module-task", shows: "13", run: (t) => t.v().tr.open() },
  { name: "module-task-option-wrong", title: "A wrong option tapped: Not yet at once, the option orange and struck out", from: "module-task-options", shows: "You chose 12", run: (t) => t.v().tr.opts[0].pick() },
  { name: "module-task-option-correct", title: "The right option tapped: Correct, the option green with a tick, the others faded", from: "module-task-option-wrong", shows: "You chose 10", run: (t) => t.v().tr.opts[2].pick() },
  { name: "module-task-skill", title: "The skill pill: which tasks to solve", from: "module-task", shows: "Which tasks to solve?", run: (t) => t.v().skill.toggle() },
  { name: "module-task-own", title: "A skill of the learner's own chosen at the task", from: "module-task-skill", shows: "Matchstick puzzles", run: (t) => t.v().skill.m.groups[1].chips.find((c) => c.name === "Matchstick puzzles").pick() },
  { name: "module-task-hint", title: "Hint on a task of the olympiad module", from: "module-task", shows: "How many new ones", run: (t) => t.c.askHint() },
  { name: "module-task-not-yet", title: "Not yet on a task of the olympiad module", from: "module-task", shows: "Not yet", run: (t) => (t.ink(), t.v().check()) },
  { name: "module-task-correct", title: "Correct on a task of the olympiad module, and Next task", from: "module-task-not-yet", shows: "Correct", run: (t) => t.v().check() },
  {
    name: "module-task-reading",
    title: "A task of the olympiad module, the work being read",
    from: "module-task",
    shows: "Reading your work",
    settle: false,
    run: (t) => (t.ink(), t.v().check()),
  },
  {
    name: "module-task-reading-closer",
    title: "A task of the olympiad module, the work gone on to the next model: Looking more closely",
    from: "module-task",
    shows: "Looking more closely",
    settle: false,
    run: (t) => (t.ink(), t.v().check(), t.c.setState({ verdict: t.c.reading(2) })),
  },
  { name: "module-task-rung", title: "A task of the olympiad module, Not yet, the hint in the panel", from: "module-task-not-yet", shows: "Report a problem", run: (t) => t.c.openChat() },
  { name: "module-task-alt", title: "A task of the olympiad module, Explain differently", from: "module-task-rung", shows: "In other words", run: (t) => t.v().acts.find((a) => a.label === "Explain differently").go() },
  { name: "module-task-report", title: "A task of the olympiad module, Report a problem", from: "module-task-rung", shows: "Send", run: (t) => t.v().msgs.find((m) => m.report).doReport() },
  { name: "module-task-full", title: "A task of the olympiad module, the tutor's sheet over the whole screen", from: "module-task-rung", shows: "Report a problem", run: (t) => t.v().toggleTutorFull() },
  { name: "module-task-quota", title: "A task of the olympiad module, the tutor's time used up: Check reads no work", from: "module-task", shows: "the platform’s AI checks no work", run: (t) => (t.c.setState({ quotaOut: true }), t.ink(), t.v().check()) },
  { name: "module-choice", title: "A task with a choice: its options behind their button on the tracing paper", from: "module-task-correct", shows: "Answer options", run: (t) => t.v().next() },
  { name: "module-choice-empty", title: "Check with no option chosen", from: "module-choice", shows: "Choose an answer first", run: (t) => t.v().check() },
  { name: "module-choice-wrong", title: "A wrong option: Not yet", from: "module-choice", shows: "You chose December", run: (t) => (t.v().tr.open(), t.v().tr.opts[0].pick()) },
  { name: "module-choice-correct", title: "The right option: Correct", from: "module-choice-wrong", shows: "You chose January", run: (t) => t.v().tr.opts[1].pick() },
  { name: "module-long", title: "A task whose statement is three lines, with its picture", from: "module-choice-correct", shows: "How many dots are there in row 10", run: (t) => t.v().next() },
  // A short essay on the same sheet, lined, from Solve on its card: the topic on the tracing paper, feedback by the rubric, Done. A proposal to the author.
  { name: "essay-sheet", title: "A short essay on the sheet of a task from paper", from: "home", shows: "umbrella that can talk", run: (t) => t.v().mods[1].solve() },
  { name: "essay-sheet-feedback", title: "An essay on the sheet: Check, the feedback by the rubric", from: "essay-sheet", shows: "The feedback is in the tutor", run: (t) => (t.ink(), t.v().check()) },
  { name: "essay-sheet-panel", title: "An essay on the sheet: the feedback in the tutor's panel", from: "essay-sheet-feedback", shows: "cleared its throat", run: (t) => t.c.openChat() },
  { name: "essay-sheet-done", title: "An essay on the sheet: Done, the marks by the criteria", from: "essay-sheet-feedback", shows: "Not assessed", run: (t) => t.v().essayDone() },
  { name: "essay-sheet-next", title: "An essay on the sheet: the next essay", from: "essay-sheet-done", shows: "a day of your life", run: (t) => (t.c.closeChat(), t.v().next()) },
  { name: "solve-kept", title: "A page from the solving history, its work kept", from: "home-pages", shows: "1 / ", run: (t) => t.v().pages[0].open() },
  { name: "legal-access", title: "The page Accessibility", from: "home-help", shows: "WCAG 2.2", run: (t) => t.v().openAccess() },
  { name: "map", title: "The skill map of a module", from: "subjects", shows: "Enumeration", run: (t) => t.v().hs.catOn[0].map() },
  { name: "map-skill", title: "The skill map, a skill chosen: its chain lit", from: "map", shows: "BUILDS ON", run: (t) => t.v().hs.map.nodes.find((n) => n.name === "Enumeration").pick() },
  { name: "map-skill-locked", title: "The skill map, a locked skill chosen: what it waits for", from: "map", shows: "Opens once", run: (t) => t.v().hs.map.nodes.find((n) => n.name === "Weighing and pouring").pick() },
  { name: "map-modules", title: "The skill map, the module chosen", from: "map", shows: "Connected modules", run: (t) => t.v().hs.toggleMods() },
  { name: "map-essays", title: "The skill map of a module with a rubric", from: "subjects", shows: "Feedback by criteria", run: (t) => t.v().hs.catOn[1].map() },

  // A lesson of olympiad maths: the explanation and the worked example. Lessons are shut on Home while they are remade.
  { name: "lesson", title: "A lesson, the explanation", from: "home", shows: "Patterns that grow", run: lesson(OLYMPIAD) },
  { name: "lesson-segments", title: "A lesson, its segments", from: "lesson", shows: "Not open yet", run: (t) => t.les().toggleSegs() },
  { name: "example", title: "A worked example", from: "lesson", shows: "Squares of matches", run: cont },
  {
    name: "example-demo",
    title: "A worked example, its parts shown",
    from: "example",
    shows: "Answer: 19 matches.",
    run: (t) => {
      for (let i = 0; i < 4; i++) t.les().demoNext();
    },
  },
  {
    name: "lesson-end",
    title: "Lesson complete",
    from: "example-demo",
    shows: "Lesson complete",
    run: (t) => cont(t),
  },

  // Take from my paper, the main feature of the app, open to every profile: the camera, the tasks the AI
  // found on the page and one framed by hand, each picked task on a clean sheet under its crop, Check by the key.
  { name: "camera", title: "The camera of the paper flow", from: "home", shows: "Worksheet", run: (t) => t.v().openCamera() },
  { name: "pick", title: "The tasks the AI found on the page, every one picked", from: "camera", shows: "5 tasks found", run: (t) => t.v().capture() },
  // The page while the finding runs: no frame yet, a line sweeping it with its glow the same above and below.
  { name: "pick-file", title: "A page from a file of the device, from Home: the same page to pick the tasks on", from: "home", shows: "5 tasks found", run: (t) => t.v().openFile() },
  { name: "pick-finding", title: "The page while the AI finds its tasks", from: "pick", shows: "Finding the tasks on the page", run: (t) => t.c.setState({ finding: true, selected: [] }) },
  // A rectangle dragged round equation (6), which the AI missed: while the finger is down, and once it is up, the learner's frame.
  { name: "pick-drag", title: "A frame being dragged round a task", from: "pick", shows: "5 tasks found", run: (t) => t.c.setState({ liveBox: { x: 304, y: 592, w: 210, h: 58 }, liveLayer: "frame" }) },
  { name: "pick-adjust", title: "A frame the AI found, moved and resized by its corner", from: "pick", shows: "5 tasks found", run: (t) => t.c.setFrame(2, { x: 300, y: 142, w: 292, h: 224 }) },
  { name: "pick-frame", title: "A task framed by hand", from: "pick", shows: "framed by you", run: (t) => t.c.frameFrom([304, 592], [582, 650]) },
  // The learner's request about the page, to the tutor: the finding gives the frames anew, the program words the line.
  {
    name: "pick-ask",
    title: "The tutor on the page: a request about the frames",
    from: "pick",
    shows: "I only change the frames",
    run: (t) => (t.v().openChat(), t.c.setState({ draft: "Take only the left column, each example as its own task" })),
  },
  { name: "pick-asked", title: "The frames found anew by the request, and Undo", from: "pick-ask", shows: "Found 3 tasks", run: (t) => t.v().send() },
  { name: "pick-asking", title: "A request about the page sent, its frames awaited: Stop in place of Send", from: "pick-ask", shows: "Finding the tasks", settle: false, run: (t) => t.v().send() },
  { name: "pick-stopped", title: "Stopped: the request back in the field, the frames as they were", from: "pick-ask", shows: "Stopped: your question is back in the field", settle: false, run: (t) => (t.v().send(), t.v().stop()) },
  // The AI found no task on the page: the answer of the finding set empty, as Play has no page without tasks.
  { name: "pick-none", title: "No task found on the page: a card above the bar", from: "pick", shows: "No tasks found.", run: (t) => t.c.setState({ asked: { ...t.c.state.asked, [t.c.state.captured]: [] }, selected: [] }) },
  // What else the page says, each a card above the bar: Play has no tap of corners, no failure of the
  // finding and no closed AI, so each state sets what the page says itself.
  { name: "pick-corner", title: "A corner tapped: the card asks for the opposite one", from: "pick-none", shows: "Now tap the opposite corner of the task.", run: (t) => t.c.setState({ pageSays: "corner" }) },
  { name: "pick-failed", title: "The finding failed: the card in red, and Find the tasks again", from: "pick-none", shows: "Find the tasks again", run: (t) => t.c.setState({ pageSays: "failed" }) },
  { name: "pick-outcome", title: "The AI could not find the tasks: the card in red, and the way on", from: "pick-none", shows: "The tutor can’t answer right now.", run: (t) => t.c.setState({ pageSays: "outcome" }) },
  { name: "pick-closed", title: "AI closed to the learner: Start shut, the card in orange", from: "pick", shows: "Without the AI a task from paper can’t be checked.", run: (t) => t.c.setState({ pageSays: "closed" }) },
  {
    name: "solve",
    title: "A task from the page, on a clean sheet",
    from: "pick-frame",
    shows: "Equation (1) 1 / 4",
    run: (t) => {
      t.v().regions[1].toggle();
      t.v().regions[3].toggle();
      t.v().start();
    },
  },
  { name: "solve-hand", title: "Hand: the sheet moved right of the page", from: "solve", shows: "Equation (1) 1 / 4", run: (t) => (t.ink("M420 420 C500 380 580 460 660 420 M690 430 l60 -20"), t.c.setState({ tool: "hand" }), t.c.setView(1, 240, 0)) },
  // Select: a lasso or a rectangle takes the strokes of the layer it began on that it holds almost wholly, to move, scale, copy or delete.
  { name: "solve-select-modes", title: "Select tapped again: its shapes, Lasso and Rectangle", from: "solve", shows: "Rectangle", run: (t) => (t.v().toolSelect(), t.v().toolSelect()) },
  { name: "solve-select-lasso", title: "Select: a lasso drawn around the second line", from: "solve", shows: "Equation (1) 1 / 4", run: (t) => (written(t), t.v().toolSelect(), t.c.setState({ areaLive: { layer: "main", d: t.c.areaPath(ring(t)) } })) },
  { name: "solve-selected", title: "Selected: the box around the line, and Copy and Delete above it", from: "solve-select-lasso", shows: "Copy Delete", run: (t) => t.c.areaPick(t.c.inkKey(), "main", ring(t)) },
  { name: "solve-select-moved", title: "Selected and moved by a drag inside its box", from: "solve-selected", shows: "Copy Delete", run: (t) => t.c.areaShift(t.c.phone() ? 40 : 120, t.c.phone() ? 70 : 90) },
  { name: "solve-select-copied", title: "Copied: the copy beside it, and selected", from: "solve-selected", shows: "Copy Delete", run: (t) => t.v().area.copy() },
  // A corner of the box scales what is taken from the corner across: the top left stays, the bottom right is dragged.
  { name: "solve-select-scaling", title: "A corner of the box dragged: the line at 150%, the share in place of the menu", from: "solve-selected", shows: "150%", run: (t) => t.c.setState({ areaS: { f: 1.5, o: t.c.areaBB(t.c.state.area).slice(0, 2) } }) },
  { name: "solve-select-scaled", title: "Scaled up to 150%: the line larger, still selected", from: "solve-selected", shows: "Copy Delete", run: (t) => t.c.areaScale(1.5, t.c.areaBB(t.c.state.area).slice(0, 2)) },
  { name: "solve-select-shrunk", title: "Scaled down to 60%: the line smaller, still selected", from: "solve-selected", shows: "Copy Delete", run: (t) => t.c.areaScale(0.6, t.c.areaBB(t.c.state.area).slice(0, 2)) },
  { name: "solve-select-rect", title: "Rectangle on the task: it takes the strokes on the tracing paper alone", from: "solve", shows: "Copy Delete", run: (t) => {
    const key = t.c.clipKey(), on = t.c.hand("x = 5", t.c.phone() ? 196 : 270, t.c.phone() ? 20 : 26, t.c.phone() ? 26 : 34), b = boxOf(on);
    t.c.setState({ strokes: { ...t.c.state.strokes, [key]: on }, areaMode: "rect" });
    t.v().toolSelect();
    t.c.areaPick(key, "clip", t.c.areaPoly([[b[0] - 12, b[1] - 12], [b[2] + 12, b[3] + 12]]));
  } },
  // The tracing paper chosen by its grip, at 90%: its frame, corners and bar of scale; Recognise waits, then the statement as text.
  { name: "solve-scale", title: "The tracing paper chosen: its frame, corners and bar of scale", from: "solve", shows: "90%", run: (t) => t.c.setState({ tSel: true, tScale: 0.9 }) },
  { name: "solve-recognising", title: "Recognise pressed: the statement being read", from: "solve-scale", shows: "Recognising…", run: (t) => t.c.setState({ tMode: "busy" }) },
  { name: "solve-text", title: "The statement read, as text in place of the photo, and Original", from: "solve-scale", shows: "Recognised by AI", run: (t) => t.c.setState({ tMode: "text" }) },
  { name: "solve-text-fraction", title: "The statement read with a fraction: built up, as the page prints it", from: "solve-text", shows: "Recognised by AI", run: (t) => (t.c.pickTask(3), t.c.setState({ tSel: true, tScale: 0.9, tMode: "text" })) },
  // The sheet's zoom by the tool bar, about the middle of what is in sight: twice Zoom in, and twice Zoom out.
  { name: "solve-zoom", title: "Zoom in pressed twice: the sheet at 150 %", from: "solve", shows: "Equation (1) 1 / 4", run: (t) => (t.ink(), t.v().zoomIn(), t.v().zoomIn()) },
  { name: "solve-zoom-out", title: "Zoom out pressed twice: the sheet at 50 %, Zoom out off", from: "solve", shows: "Equation (1) 1 / 4", run: (t) => (t.ink(), t.v().zoomOut(), t.v().zoomOut()) },
  { name: "solve-lines", title: "The grid's button tapped once: the sheet in lines", from: "solve", shows: "Equation (1) 1 / 4", run: (t) => t.v().grid.next() },
  // The one tutor's panel on a task from paper: a question by text, its answer, and the microphone, whose speech becomes text in the field.
  { name: "solve-ask", title: "The tutor on a task from paper: a question typed", from: "solve", shows: "by text or voice", run: (t) => (t.v().openChat(), t.c.setState({ draft: "Why do we take 3 from both sides?\nAnd not 5 first?" })) },
  { name: "solve-asked", title: "The question sent, and the tutor's answer", from: "solve-ask", shows: "Which line of your work is it about?", run: (t) => t.v().send() },
  { name: "solve-listening", title: "The microphone listening", from: "solve", shows: "Listening", settle: false, run: (t) => (t.v().openChat(), t.v().micStart()) },
  { name: "solve-asking", title: "A question sent, its answer awaited: Stop in place of Send", from: "solve", shows: "three unknowns", settle: false, run: (t) => (t.v().openChat(), t.c.setState({ draft: "Write it as a system of three unknowns" }), t.v().send()) },
  { name: "solve-stopped", title: "Stopped: the question back in the field", from: "solve", shows: "Stopped: your question is back in the field", settle: false, run: (t) => (t.v().openChat(), t.c.setState({ draft: "Write it as a system of three unknowns" }), t.v().send(), t.v().stop()) },
  { name: "solve-dictated", title: "The speech as text in the field, to correct before Send", from: "solve-listening", shows: "From your voice", run: (t) => t.v().micStop() },
  // Grown-up mode: behind the grown-ups' PIN, which the account sets in its settings (the mockup's is 5555), the tutor's limits lifted on this task until it is turned off.
  { name: "solve-grown-pin", title: "Grown-up mode behind the grown-ups' PIN", from: "solve", shows: "Enter your PIN", run: (t) => (t.v().openChat(), t.v().grown.tap()) },
  { name: "solve-grown-wrong", title: "A wrong PIN: the dots cleared, and why", from: "solve-grown-pin", shows: "Wrong PIN", run: (t) => { for (const d of "1234") t.v().grown.keys.find((k) => k.label === d).go(); } },
  { name: "solve-grown-on", title: "Grown-up mode on: the band, and the field for anything", from: "solve-grown-pin", shows: "Grown-up mode on", run: (t) => { for (const d of "5555") t.v().grown.keys.find((k) => k.label === d).go(); } },
  { name: "solve-grown-written", title: "Asked in grown-up mode: the tutor goes on with the solution on the sheet", from: "solve-grown-on", shows: "the solution goes on", run: (t) => {
    const ph = t.c.phone();
    t.c.setState({ strokes: { ...t.c.state.strokes, [t.c.inkKey()]: t.c.hand("3x = 20 − 5 = 15", ph ? 24 : 370, ph ? 190 : 230, ph ? 30 : 44) }, draft: "Finish the solution on the sheet" });
    t.v().send();
  } },
  { name: "solve-grown-asking", title: "A request in grown-up mode awaited: Stop in place of Send", from: "solve-grown-on", shows: "Writing on the sheet", settle: false, run: (t) => (t.c.setState({ draft: "Write the whole solution" }), t.v().send()) },
  { name: "solve-grown-struck", title: "The second line struck out in red, as asked", from: "solve-grown-written", shows: "struck out in red", run: (t) => (t.c.setState({ draft: "Cross out the second line in red" }), t.v().send()) },
  { name: "solve-grown-erased", title: "The second line erased, as asked", from: "solve-grown-struck", shows: "line 2 erased", run: (t) => (t.c.setState({ draft: "Erase the second line" }), t.v().send()) },
  { name: "solve-grown-hatched", title: "The second line hatched with a 2 mm grid: many strokes within 3 s", from: "solve-grown-written", shows: "hatched with a 2 mm grid", run: (t) => (t.c.setState({ draft: "Hatch the second line with a 2 mm grid" }), t.v().send()) },
  { name: "solve-grown-off", title: "Grown-up mode turned off: the limits back, the tutor's strokes stay", from: "solve-grown-struck", shows: "Grown-up mode off", run: (t) => t.v().grown.off() },
  { name: "solve-tasks", title: "The list of the picked tasks", from: "solve", shows: "Framed by you", run: (t) => t.v().toggleTasks() },
  { name: "solve-empty", title: "Check without work", from: "solve", shows: "Write your solution first", run: (t) => t.v().check() },
  { name: "solve-reading", title: "The work being read", from: "solve", shows: "Reading your work", settle: false, run: (t) => (t.ink(), t.v().check()) },
  // The first model was not sure: the card says the work went on to the next one. A profile without the right of the
  // debug mode sees dots; one with it, the models' names.
  {
    name: "solve-reading-closer",
    title: "The work gone on to the next model, for a learner: Looking more closely, the dots of the models",
    from: "solve",
    shows: "Looking more closely",
    settle: false,
    run: (t) => (t.c.setState({ dbgFlag: false }), t.ink(), t.v().check(), t.c.setState({ verdict: t.c.reading(2) })),
  },
  {
    name: "solve-debug-reading-closer",
    title: "The work gone on to the next model, for an account with the right of the debug mode: the models by name",
    from: "solve",
    shows: "Sonnet",
    settle: false,
    run: (t) => (t.ink(), t.v().check(), t.c.setState({ verdict: t.c.reading(2) })),
  },
  { name: "solve-not-yet", title: "Not yet, and the tutor's wavy mark where the mistake is", from: "solve", shows: "Not yet", run: (t) => (t.ink(), t.v().check()) },
  { name: "solve-correct", title: "Correct", from: "solve-not-yet", shows: "Correct", run: (t) => t.v().check() },
  {
    name: "solve-all",
    title: "Every task of the page over",
    from: "pick",
    shows: "All 1 done",
    run: (t) => {
      t.v().selectAll();
      t.v().regions[0].toggle();
      t.v().start();
      t.ink();
      t.v().check();
      t.settle();
      t.v().check();
      t.settle();
      t.v().next();
    },
  },
  // A frame dragged round equations (1) and (3) at once: the reading of its statement lists both, and Check checks each.
  { name: "pick-several", title: "A frame dragged round two tasks", from: "pick", shows: "framed by you", run: (t) => t.c.frameFrom([16, 142], [304, 596]) },
  {
    name: "solve-several",
    title: "A frame of several tasks, each checked: the count, and a tick or a cross by each answer",
    from: "pick-several",
    shows: "Not yet · 1 of 2 correct",
    run: (t) => {
      t.v().selectAll();
      t.v().regions[5].toggle();
      t.v().start();
      t.ink();
      t.v().check();
    },
  },
  { name: "olympiad", title: "A problem of an olympiad book: an option is circled on the crop", from: "camera", shows: "Problem 1", run: (t) => (t.v().demoOl(), t.v().capture(), t.settle(), t.v().start()) },
  { name: "solve-circle", title: "Check with no option circled", from: "olympiad", shows: "Circle an answer first", run: (t) => t.v().check() },
  { name: "solve-nokey", title: "A task that could not be checked: no answer to compare", from: "olympiad", shows: "Couldn’t check this one", run: (t) => (t.v().taskRows[4].pick(), t.ink(), t.v().check()) },
  // Debug, only on a local run with api's debug flag: the models of the paper flow, their answers
  // and their cost.
  {
    name: "pick-debug",
    title: "Debug on a local run: the page photographed, the window's Models",
    from: "camera",
    shows: "First model — every call",
    run: (t) => {
      t.c.setState({ dbgFlag: true });
      t.v().capture();
      t.settle();
      t.v().dbg.toggle();
    },
  },
  {
    name: "solve-debug-log",
    title: "Debug on a local run: a Check, the window's Log",
    from: "pick-debug",
    shows: "attempt 2",
    run: (t) => {
      t.v().dbg.close();
      t.v().start();
      t.ink();
      t.v().check();
      t.settle();
      t.v().dbg.toggle();
      t.v().dbg.tabs[1].pick();
    },
  },
  {
    name: "solve-debug-export",
    title: "Debug on a local run: a Check exported as a case of tutor-eval",
    from: "solve-debug-log",
    shows: "Save case",
    run: (t) => t.v().dbg.groups[0].toggleExport(),
  },
  {
    name: "solve-debug-errors",
    title: "Debug on a local run: the Log of the app, its errors alone",
    from: "solve-debug-log",
    shows: "invalid_argument",
    run: (t) => t.v().dbg.onlyErrors(),
  },
  {
    name: "solve-debug-filter",
    title: "Debug on a local run: the filter of the Log, by level and source",
    from: "solve-debug-log",
    shows: "Show everything",
    run: (t) => t.v().dbg.toggleFilter(),
  },
  {
    name: "solve-debug-runs",
    title: "Debug on a local run: the Log's info in a row, folded into one row each",
    from: "solve-debug-log",
    shows: "7 info · Server · api, Camera",
    run: (t) => t.v().dbg.tabs[1].pick(),
  },
  {
    name: "solve-debug-run-open",
    title: "Debug on a local run: a run of info in the Log opened, its entries under it",
    from: "solve-debug-runs",
    shows: "AccountService/GetQuota · ok · 0.9 s",
    run: (t) =>
      t
        .v()
        .dbg.blocks.flatMap((b) => b.lines ?? [])
        .find((ln) => ln.id === "run-a2")
        .toggle(),
  },
  {
    name: "solve-debug-perf",
    title: "Debug on a local run: Performance — the frames, the main thread, the canvas, memory",
    from: "solve-debug-log",
    shows: "Frames a second",
    run: (t) => t.v().dbg.tabs[2].pick(),
  },
  {
    name: "solve-debug-hud",
    title: "Debug on a local run: Performance as a strip on the canvas, the window closed",
    from: "solve-debug-perf",
    shows: "fps",
    run: (t) => (t.v().dbg.pf.toggleHud(), t.v().dbg.close()),
  },

  // What comes later — the children and the canvases of other authors — under "Later".
  { name: "later-who", title: "Later: Who's learning?, with the children", slice: "later", from: "who", shows: "Juniper", run: (t) => t.v().sliceLater() },
  { name: "later-add", title: "Later: Add a learner, a parent's consent", slice: "later", from: "later-who", shows: "A parent’s consent", run: (t) => t.v().openAdd() },
  { name: "later-pin", title: "Later: the owner's PIN", slice: "later", from: "later-who", shows: "Enter your PIN", run: (t) => t.v().profiles.find((p) => p.owner).pick() },
  { name: "later-home", title: "Later: a child's home", slice: "later", from: "later-who", shows: "Tasks from my paper", run: (t) => t.v().profiles[0].pick() },
  { name: "later-switch", title: "Later: a child's profile menu, Settings behind the PIN", slice: "later", from: "later-home", shows: "Switch learner", run: (t) => t.v().hs.toggleAccount() },
  { name: "later-help", title: "Later: a child's Help in the profile's menu, outside the PIN", slice: "later", from: "later-switch", shows: "call a helpline", run: (t) => t.v().hs.openHelp() },
  { name: "later-grownups", title: "Later: Settings, the PIN inside the profile's menu", slice: "later", from: "later-switch", shows: "Enter the PIN", run: (t) => t.v().hs.openSettings() },
  { name: "later-settings", title: "Later: Settings past the PIN, a child's page", slice: "later", from: "later-grownups", shows: "Learner", run: (t) => { for (const k of "1234") t.v().hs.pinKeys.find((x) => x.label === k).go(); t.v().st.profiles.find((p) => p.name === t.v().me.name).open(); } },
  { name: "later-pip", title: "Later: Pip, a child's tutor", slice: "later", from: "later-home", shows: "Hi, I’m Pip", run: (t) => (t.v().openCamera(), t.v().capture(), t.settle(), t.v().start(), t.c.openChat()) },
  { name: "later-kinds", title: "Later: the canvas kinds of other authors", slice: "later", from: "later-home", shows: "Number line", run: (t) => (t.v().openCamera(), t.v().capture(), t.settle(), t.v().start(), t.v().toggleMore()) },
];

const BY_NAME = new Map(STATES.map((s) => [s.name, s]));

// The state's chain, from the first screen to it.
export function chain(name) {
  const out = [];
  for (let s = BY_NAME.get(name); s; s = s.from ? BY_NAME.get(s.from) : null) {
    if (out.includes(s)) throw new Error(`the states loop at ${s.name}`);
    out.unshift(s);
  }
  if (!out.length) throw new Error(`no state ${name}`);
  return out;
}

// Brings the app with its Main to the state name: each step of the chain, settled; the last one
// settled unless it says not to, so that a snapshot shows the state the step leaves.
export function reach(app, comp, name) {
  const t = helpers(comp, app);
  const steps = chain(name);
  steps.forEach((s, i) => {
    s.run(t);
    if (i < steps.length - 1 || s.settle !== false) app.settle();
    else app.flush();
  });
  return BY_NAME.get(name);
}
