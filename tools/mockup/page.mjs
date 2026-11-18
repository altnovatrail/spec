// mockup: the page that opens one state of the interface mockup by its address:
//
//   /tools/mockup/?screen=home&device=phone
//
// screen is a state of states.mjs, and device is ipad — 1194 × 834 in landscape, the board
// Main.dc.html — or phone — 390 × 844 in portrait, the board Phone.dc.html. The page draws
// the board, brings it to the state, runs its pending timers, and then sets data-ready on <html>:
// "true", or "error" with the reason in the page. From there it is the mockup in Play, with its
// timers live — but for a state that shows what a timer would end, such as the work being read: its
// timers wait for the first tap or key, so that a snapshot cannot race them. Without screen it
// lists every state, with a link for each device (R148).

import { App } from "./runtime.mjs";
import { STATES, reach } from "./states.mjs";

export const BOARDS = { ipad: "Main", phone: "Phone" };

// The text of a source of draft/mockup/, beside this file's folder: tools/mockup/ → draft/mockup/.
export function sourceLoader(fetchFn, base) {
  return async (name) => {
    const url = new URL(`../../draft/mockup/${encodeURIComponent(name)}.dc.html`, base);
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`${url.pathname}: ${res.status}`);
    return res.text();
  };
}

// Opens what the address of win names; resolves when data-ready is set.
export async function start(win, { fetchFn = win.fetch.bind(win), base = import.meta.url } = {}) {
  const doc = win.document;
  const q = new URLSearchParams(win.location.search);
  const frame = doc.getElementById("frame");
  const screen = q.get("screen");
  try {
    if (!screen) return index(doc, frame);
    const device = q.get("device") || "ipad";
    if (!Object.hasOwn(BOARDS, device)) throw new Error(`no device ${device}: ipad or phone`);
    const state = STATES.find((s) => s.name === screen);
    if (!state) throw new Error(`no state ${screen}: open the page without ?screen= for the list`);
    doc.title = `${state.title} · ${device}`;
    const app = new App(doc, sourceLoader(fetchFn, base), { live: true });
    await app.mount(BOARDS[device], frame);
    app.settle();
    reach(app, app.find("Main")[0].comp, screen);
    if (state.settle === false) holdTimers(doc, app);
    doc.documentElement.dataset.ready = "true";
    return app;
  } catch (e) {
    frame.replaceChildren();
    const p = doc.createElement("p");
    p.className = "error";
    p.textContent = e.message;
    frame.append(p);
    doc.documentElement.dataset.ready = "error";
    return null;
  }
}

// Holds the app's timers until the first tap or key, which runs them.
function holdTimers(doc, app) {
  app.clock.hold = true;
  const release = () => {
    doc.removeEventListener("pointerdown", release, true);
    doc.removeEventListener("keydown", release, true);
    app.clock.hold = false;
    app.settle();
  };
  doc.addEventListener("pointerdown", release, true);
  doc.addEventListener("keydown", release, true);
}

// The list of the states, by the groups of states.mjs: first slice, and what comes later.
function index(doc, frame) {
  doc.title = "The interface mockup";
  const h = doc.createElement("h1");
  h.textContent = "The interface mockup";
  const list = doc.createElement("ul");
  list.className = "states";
  for (const s of STATES) {
    const li = doc.createElement("li");
    const name = doc.createElement("code");
    name.textContent = s.name;
    li.append(name, ` — ${s.title}${s.slice === "later" ? " (Later)" : ""}: `);
    for (const device of Object.keys(BOARDS)) {
      const a = doc.createElement("a");
      a.href = `?screen=${encodeURIComponent(s.name)}&device=${device}`;
      a.textContent = device;
      li.append(a, " ");
    }
    list.append(li);
  }
  frame.className = "index";
  frame.replaceChildren(h, list);
  doc.documentElement.dataset.ready = "true";
  return null;
}
