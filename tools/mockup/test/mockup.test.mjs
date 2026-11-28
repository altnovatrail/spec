// The tests of the mockup's runtime, its states, its page and its server. They draw the sources of
// draft/mockup/ as they are, under jsdom: spec's container has no browser.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { App, Clock, compileTemplate, parseSource } from "../runtime.mjs";
import { STATES, chain, reach } from "../states.mjs";
import { BOARDS, devicesOf, start, sourceLoader } from "../page.mjs";
import { FOLDERS, ROOT, createServer, fileOf, main, portOf, servedFiles } from "../serve.mjs";

const SOURCES = path.join(ROOT, "draft", "mockup");
const README = path.join(SOURCES, "README.md");
const readSource = async (name) => fs.readFileSync(path.join(SOURCES, `${name}.dc.html`), "utf8");

const page = (html = "") => new JSDOM(`<!doctype html><html><head></head><body><div id="frame"></div>${html}</body></html>`, { url: "http://127.0.0.1/tools/mockup/" });

// A source of its own, written in the test: the template, the class and its props.
const source = (template, code, props = "{}") => `<x-dc>\n<helmet><style>.x{}</style></helmet>\n${template}\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props='${props}'>\n${code}\n</script>`;

async function mountOwn(files, name = "A", props = {}) {
  const dom = page();
  const doc = dom.window.document;
  const app = new App(doc, async (n) => {
    if (!Object.hasOwn(files, n)) throw new Error(`no ${n}`);
    return files[n];
  });
  const inst = await app.mount(name, doc.getElementById("frame"), props);
  return { dom, doc, app, inst, frame: doc.getElementById("frame") };
}

async function drawState(name, device) {
  const dom = page();
  const doc = dom.window.document;
  const app = new App(doc, readSource);
  await app.mount(BOARDS[device], doc.getElementById("frame"));
  app.settle();
  reach(app, app.find("Main")[0].comp, name);
  return { doc, app, frame: doc.getElementById("frame") };
}

// The names of the states in the table "Screens and states" of draft/mockup/README.md.
function readmeStates() {
  const text = fs.readFileSync(README, "utf8");
  const start = text.indexOf("## Screens and states");
  assert.ok(start >= 0, "the README has a section Screens and states");
  const section = text.slice(start, text.indexOf("\n## ", start + 1));
  return [...section.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
}

test("every state of the README is a state of states.mjs, and the other way round", () => {
  assert.deepEqual(readmeStates(), STATES.map((s) => s.name));
});

test("the lines of Main.dc.html the README cites open the parts it names", () => {
  const text = fs.readFileSync(README, "utf8");
  const lines = fs.readFileSync(path.join(SOURCES, "Main.dc.html"), "utf8").split("\n");
  const cited = [...text.matchAll(/`Main\.dc\.html:(\d+)` — ([^|\n]+?) \|/g)];
  assert.ok(cited.length > 10, "the README cites the parts of the template by line");
  for (const [, n, words] of cited) {
    const line = lines[Number(n) - 1] || "";
    assert.match(line, /<!-- =+ /, `line ${n} opens a part of the template`);
    const head = line.replace(/^\s*<!-- =+ /, "").replace(/ =+ -->\s*$/, "");
    assert.ok(head.startsWith(words.trim()), `line ${n} opens «${words.trim()}»: ${head}`);
  }
});

for (const device of Object.keys(BOARDS)) {
  test(`every state draws on the ${device}: what it shows, and nothing left of the template`, async (t) => {
    for (const state of STATES.filter((s) => devicesOf(s).includes(device))) {
      await t.test(state.name, async () => {
        const { app, frame } = await drawState(state.name, device);
        assert.deepEqual([...app.missing], [], "every {{…}} has its value");
        assert.ok(!frame.innerHTML.includes("{{"), "no {{ is left in the drawing");
        assert.ok(frame.textContent.replace(/\s+/g, " ").includes(state.shows), `it shows «${state.shows}»`);
        if (state.slice === "later") assert.equal(app.find("Main")[0].comp.state.slice, "later");
      });
    }
  });
}

test("the phone is Main.dc.html in Phone.dc.html, with its prop device", async () => {
  const { app, frame } = await drawState("home", "phone");
  const [main] = app.find("Main");
  assert.equal(main.comp.props.device, "phone");
  assert.equal(frame.querySelector("dc-import").style.display, "contents");
  assert.match(frame.innerHTML, /width: 390px/);
  const ipad = await drawState("home", "ipad");
  assert.equal(ipad.app.find("Main")[0].comp.props.device, "ipad", "the default of data-props");
});

test("a tap is the button's handler: Sign in with Google, then the invite code after its timer", async () => {
  const { app, frame, doc } = await drawState("signin", "ipad");
  const button = [...frame.querySelectorAll("button")].find((b) => b.textContent.includes("Sign in with Google"));
  button.dispatchEvent(new doc.defaultView.MouseEvent("click", { bubbles: true }));
  await Promise.resolve();
  assert.equal(app.find("Main")[0].comp.state.auth, "signing");
  app.settle();
  assert.match(frame.textContent, /Tap the boxes to paste the code/);
});

test("a chain of states starts at the first screen, and a state that is not there is an error", () => {
  assert.deepEqual(chain("home").map((s) => s.name), ["signin", "invite", "invite-filled", "agree", "agree-ticked", "owner", "owner-filled", "who", "home"]);
  assert.throws(() => chain("nowhere"), /no state nowhere/);
  for (const s of STATES) assert.ok(!s.from || STATES.some((x) => x.name === s.from), `${s.name}: from ${s.from}`);
  assert.equal(new Set(STATES.map((s) => s.name)).size, STATES.length, "the names are one each");
});

test("a source without its parts is an error that names it", () => {
  assert.throws(() => parseSource("<p></p>", "X"), /X: no <x-dc>/);
  assert.throws(() => parseSource("<x-dc></x-dc>", "X"), /X: no <script/);
  const src = parseSource(source('<dc-import name="B" hint-size="1px,1px"></dc-import>', "class Component {}", '{"page":{"default":"one"},"$preview":{"width":2}}'), "A");
  assert.deepEqual(src.defaults, { page: "one" });
  assert.deepEqual(src.preview, { width: 2 });
  assert.deepEqual(src.imports, ["B"]);
  assert.match(src.helmet, /\.x\{\}/);
  assert.ok(!src.template.includes("helmet"));
  const bare = parseSource('<x-dc><p></p></x-dc><script type="text/x-dc" data-dc-script>class Component {}</script>');
  assert.deepEqual(bare.defaults, {});
  assert.equal(bare.helmet, "");
});

test("a tag of the canvas the runtime does not know stops the drawing", () => {
  const doc = page().window.document;
  assert.throws(() => compileTemplate(doc, "<sc-else></sc-else>", "A"), /A: the runtime does not know <sc-else>/);
  assert.throws(() => compileTemplate(doc, "<div><dc-slot></dc-slot></div>"), /does not know <dc-slot>/);
});

test("values: text, attributes, booleans, aria-*, events, a field's value, sc-if and sc-for", async () => {
  const code = `class Component extends DCLogic {
    state = { on: true, n: 0, text: "hi", list: ["a", "b"] };
    renderVals() {
      const s = this.state;
      return { ...s, off: !s.on, nothing: null, fn: () => this.setState({ n: s.n + 1 }), type: (e) => this.setState({ text: e.target.value }),
        deep: { name: "deep" }, cls: s.on ? "on" : "", num: 2 };
    }
  }`;
  const tpl = `<div id="r" class="{{cls}}" data-n="{{n}}" data-t="{{on}}" data-f="{{off}}" aria-pressed="{{on}}" aria-checked="{{off}}" style="width: {{num}}px">
    <button id="b" onClick="{{fn}}" disabled="{{off}}" onKeyDown="{{nothing}}" onclick2="x">{{deep.name}} {{ true }} {{nothing}} {{fn}}</button>
    <input id="i" value="{{text}}" onChange="{{type}}">
    <sc-if value="{{on}}"><span id="if">shown</span></sc-if>
    <sc-for list="{{list}}" as="x"><i class="item">{{x}}</i></sc-for>
    <sc-for list="{{nothing}}" as="y"><b>never</b></sc-for>
    <svg viewBox="0 0 2 2"><path d="M0 0" /></svg>
  </div>`;
  const { frame, app, inst, doc } = await mountOwn({ A: source(tpl, code) });
  const r = frame.querySelector("#r");
  assert.equal(r.getAttribute("class"), "on");
  assert.equal(r.getAttribute("data-n"), "0");
  assert.equal(r.getAttribute("data-t"), "true");
  assert.equal(r.hasAttribute("data-f"), false, "false leaves an attribute out");
  assert.equal(r.getAttribute("aria-pressed"), "true");
  assert.equal(r.getAttribute("aria-checked"), "false", "aria-* says false");
  assert.equal(r.getAttribute("style"), "width: 2px");
  const b = frame.querySelector("#b");
  assert.equal(b.hasAttribute("disabled"), false);
  assert.equal(b.hasAttribute("onclick2"), false, "a literal on* is not a handler");
  assert.equal(b.textContent, "deep true  ");
  assert.equal(frame.querySelector("svg").namespaceURI, "http://www.w3.org/2000/svg");
  assert.equal(frame.querySelector("svg").getAttribute("viewBox"), "0 0 2 2");
  assert.deepEqual([...frame.querySelectorAll(".item")].map((e) => e.textContent), ["a", "b"]);
  assert.equal(frame.querySelector("b"), null);
  assert.ok(doc.head.querySelector("style"), "the helmet goes into the head");

  b.dispatchEvent(new doc.defaultView.MouseEvent("click"));
  app.flush();
  assert.equal(r.getAttribute("data-n"), "1");
  const input = frame.querySelector("#i");
  assert.equal(input.value, "hi");
  input.value = "typed";
  input.dispatchEvent(new doc.defaultView.Event("input"));
  app.flush();
  assert.equal(inst.comp.state.text, "typed", "onChange of a field fires as it is typed in");

  // An element keeps its identity when what comes before it goes, and loses a handler that goes.
  const item = frame.querySelectorAll(".item")[1];
  inst.comp.setState({ on: false, list: ["b2", "b"], fn: null });
  app.flush();
  assert.equal(frame.querySelector("#if"), null);
  assert.equal(frame.querySelectorAll(".item")[1], item);
  assert.equal(r.getAttribute("class"), "", "an empty string stays an attribute");
  assert.equal(b.hasAttribute("disabled"), true);
  assert.equal(r.getAttribute("aria-pressed"), "false");
  inst.comp.setState({ list: ["only"] });
  app.flush();
  assert.equal(frame.querySelectorAll(".item").length, 1);
  assert.deepEqual([...app.missing], []);
});

test("a path no value has is noted, and draws as nothing", async () => {
  const code = "class Component extends DCLogic { renderVals() { return { a: { b: 1, n: null }, s: 'xy' }; } }";
  const { frame, app } = await mountOwn({ A: source("<p>[{{nope.deep}}{{a.c}}{{a.n.x}}{{a.b}}{{s.length}}]</p><p title='{{also}}'></p>", code) });
  assert.equal(frame.querySelector("p").textContent, "[12]");
  assert.deepEqual([...app.missing].sort(), ["a.c", "a.n.x", "also", "nope.deep"]);
});

test("an import gets its props, is drawn again when they change, and is called back as it comes and goes", async () => {
  const B = source(
    `<b>{{label}}</b>`,
    `class Component extends DCLogic {
      componentDidMount() { globalThis.__log.push("mount " + this.props.page); }
      componentDidUpdate() { globalThis.__log.push("update " + this.props.page); }
      componentWillUnmount() { globalThis.__log.push("unmount"); }
      renderVals() { return { label: this.props.page + (this.props.bare ? "!" : "") }; }
    }`,
    '{"page":{"default":"one"}}',
  );
  const A = source(
    `<div><sc-if value="{{show}}"><dc-import name="B" page="{{page}}" bare="{{ true }}"></dc-import></sc-if><dc-import name="B" hint-size="1px,1px"></dc-import></div>`,
    `class Component extends DCLogic {
      state = { show: true, page: "two" };
      renderVals() { return this.state; }
    }`,
  );
  globalThis.__log = [];
  const { frame, app, inst } = await mountOwn({ A, B });
  assert.deepEqual([...frame.querySelectorAll("b")].map((e) => e.textContent), ["two!", "one"]);
  assert.equal(app.find("B").length, 2);
  inst.comp.setState({ page: "three" });
  app.flush();
  assert.deepEqual([...frame.querySelectorAll("b")].map((e) => e.textContent), ["three!", "one"]);
  inst.comp.setState({ show: false });
  app.flush();
  assert.equal(app.find("B").length, 1);
  assert.deepEqual(globalThis.__log, ["mount two", "mount one", "update three", "unmount"]);
  delete globalThis.__log;
});

test("an import of a source that is not loaded, and a name that is no source's, are errors", async () => {
  await assert.rejects(mountOwn({ A: source("<p></p>", "class Component extends DCLogic { renderVals() { return {}; } }") }, "../x"), /not a source's name: \.\.\/x/);
  const { app, inst } = await mountOwn({ A: source("<sc-if value='{{on}}'><dc-import name='C'></dc-import></sc-if>", "class Component extends DCLogic { state = { on: false }; renderVals() { return this.state; } }") });
  inst.comp.setState({ on: true });
  assert.throws(() => app.flush(), /<dc-import name="C">: no such source/);
});

test("a component that keeps setting its state as it draws, and timers that keep coming, stop with an error", async () => {
  const loop = await mountOwn({ A: source("<p></p>", "class Component extends DCLogic { state = { n: 0 }; componentDidUpdate() { this.setState({ n: this.state.n + 1 }); } renderVals() { return {}; } }") });
  loop.inst.comp.setState({ n: 1 });
  assert.throws(() => loop.app.flush(), /keeps setting its state/);
  const ticks = await mountOwn({ A: source("<p></p>", "class Component extends DCLogic { componentDidMount() { const t = () => setTimeout(t, 10); t(); } renderVals() { return {}; } }") });
  assert.throws(() => ticks.app.settle(20), /timers keep coming/);
});

test("an import made and gone before it is drawn is never drawn nor called back", async () => {
  globalThis.__log = [];
  const B = source("<b>b</b>", "class Component extends DCLogic { componentDidMount() { globalThis.__log.push('mount'); } componentWillUnmount() { globalThis.__log.push('unmount'); } renderVals() { return {}; } }");
  const A = source('<sc-if value="{{on}}"><dc-import name="B"></dc-import></sc-if>', "class Component extends DCLogic { state = { on: true }; componentDidMount() { this.setState({ on: false }); } renderVals() { return this.state; } }");
  const { frame, app } = await mountOwn({ A, B });
  app.flush();
  assert.equal(frame.querySelector("b"), null);
  assert.deepEqual(globalThis.__log, []);
  assert.equal(app.find("B").length, 0);
  delete globalThis.__log;
});

test("the clock runs the timer due first, forgets one cleared, and runs live ones by the window's timers", async () => {
  const clock = new Clock();
  const ran = [];
  clock.set(() => ran.push("b"), 20);
  const a = clock.set(() => ran.push("a"), 10);
  clock.set(() => ran.push("c"), 20);
  const gone = clock.set(() => ran.push("gone"), 5);
  clock.clear(gone);
  clock.set(() => ran.push("now"));
  while (clock.next());
  assert.deepEqual(ran, ["now", "a", "b", "c"]);
  assert.equal(clock.now, 20);
  assert.equal(clock.run(a), false, "a timer runs once");
  const live = new Clock(true);
  await new Promise((resolve) => live.set(resolve, 1));
  assert.equal(live.pending.size, 0);
  live.hold = true;
  let held = 0;
  live.set(() => held++, 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(held, 0, "a held timer waits");
  assert.equal(live.next(), true);
  assert.equal(held, 1);
});

test("the page opens a state by its address and says it is ready", async () => {
  const base = pathToFileURL(path.join(ROOT, "tools", "mockup", "page.mjs"));
  const fetchFn = async (url) => {
    const file = fileURLToPath(url);
    return fs.existsSync(file) ? { ok: true, text: async () => fs.readFileSync(file, "utf8") } : { ok: false, status: 404 };
  };
  const open = async (query, fetcher = fetchFn) => {
    const dom = new JSDOM('<!doctype html><html><head></head><body><div id="frame"></div></body></html>', { url: "http://127.0.0.1/tools/mockup/" + query });
    const app = await start(dom.window, { fetchFn: fetcher, base });
    return { doc: dom.window.document, app };
  };

  const phone = await open("?screen=home-legend&device=phone");
  assert.equal(phone.doc.documentElement.dataset.ready, "true");
  assert.equal(phone.doc.title, "Home, what the marks mean · phone");
  assert.equal(phone.app.find("Main")[0].comp.state.legendOpen, true);
  assert.equal(phone.app.clock.live, true, "from the state on, the timers run live");

  const ipad = await open("?screen=module-task");
  assert.equal(ipad.app.find("Main")[0].comp.props.device, "ipad", "the iPad by default");
  assert.equal(ipad.doc.head.querySelector('link[href*="googleapis"]'), null, "the fonts of Google are not loaded");
  assert.ok(ipad.doc.head.querySelector("style"), "the helmet's styles are");

  // The work being read: the timer that would end it waits for the first tap, which runs it.
  const reading = await open("?screen=module-task-reading&device=phone");
  const comp = reading.app.find("Main")[0].comp;
  assert.equal(comp.state.verdict.kind, "reading");
  assert.equal(reading.app.clock.hold, true);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(comp.state.verdict.kind, "reading", "the live timer did not end it");
  reading.doc.dispatchEvent(new reading.doc.defaultView.Event("keydown"));
  assert.equal(comp.state.verdict.kind, "no", "the first key runs it");
  assert.equal(reading.app.clock.hold, false);

  const list = await open("");
  assert.equal(list.doc.querySelectorAll(".states li").length, STATES.length);
  assert.equal(list.doc.querySelector(".states a").getAttribute("href"), "?screen=signin&device=ipad");
  assert.equal(list.doc.documentElement.dataset.ready, "true");

  for (const [query, reason] of [
    ["?screen=nowhere", /no state nowhere/],
    ["?screen=home&device=watch", /no device watch/],
    ["?screen=home&device=desktop", /no desktop for home/],
  ]) {
    const bad = await open(query);
    assert.equal(bad.doc.documentElement.dataset.ready, "error");
    assert.match(bad.doc.querySelector(".error").textContent, reason);
  }
  const missing = await open("?screen=home", async () => ({ ok: false, status: 404 }));
  assert.match(missing.doc.querySelector(".error").textContent, /\/draft\/mockup\/Main\.dc\.html: 404/);
});

test("the page's sources are beside it, in draft/mockup/", async () => {
  const seen = [];
  const load = sourceLoader(async (url) => (seen.push(url.href), { ok: true, text: async () => "x" }), "http://127.0.0.1/spec/tools/mockup/page.mjs");
  assert.equal(await load("Main"), "x");
  assert.deepEqual(seen, ["http://127.0.0.1/spec/draft/mockup/Main.dc.html"]);
});

test("the server gives the two folders alone, and / leads to the page", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const get = (p, method = "GET") =>
    new Promise((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port, path: p, method }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], location: res.headers.location, body }));
      });
      req.on("error", reject);
      req.end();
    });
  try {
    assert.deepEqual(await get("/?screen=home&device=phone").then((r) => [r.status, r.location]), [302, "/tools/mockup/?screen=home&device=phone"]);
    assert.equal((await get("/")).location, "/tools/mockup/");
    const index = await get("/tools/mockup/?screen=home");
    assert.equal(index.status, 200);
    assert.match(index.body, /import \{ start \} from "\.\/page\.mjs"/);
    assert.equal((await get("/tools/mockup/runtime.mjs")).type, "text/javascript; charset=utf-8");
    assert.equal((await get("/draft/mockup/Main.dc.html")).status, 200);
    assert.equal((await get("/draft/mockup/Main.dc.html", "HEAD")).body, "");
    for (const p of ["/docs/product.md", "/tools/mockup/../../docs/product.md", "/tools/mockup/%2e%2e/%2e%2e/RUN.md", "/draft/mockup/nope.html", "/tools/mockup/test/mockup.test.mjs.bak", "/draft/%E0%A4%A.html", "/draft/mockup/"]) {
      assert.equal((await get(p)).status, 404, p);
    }
    assert.equal((await get("/draft/mockup/Main.dc.html", "POST")).status, 404);
  } finally {
    server.close();
  }
});

test("a path out of the folders by a link is not served", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mockup-"));
  try {
    for (const f of FOLDERS) fs.mkdirSync(path.join(root, f), { recursive: true });
    fs.writeFileSync(path.join(root, "secret.html"), "no");
    fs.writeFileSync(path.join(root, "draft/mockup/a.html"), "yes");
    fs.symlinkSync(path.join(root, "secret.html"), path.join(root, "draft/mockup/link.html"));
    assert.equal(fileOf(root, "/draft/mockup/a.html"), fs.realpathSync(path.join(root, "draft/mockup/a.html")));
    assert.equal(fileOf(root, "/draft/mockup/link.html"), null);
    assert.equal(fileOf(root, "/draft/mockup/a.html%00.html"), null);
    assert.deepEqual([...servedFiles(root).keys()], ["/draft/mockup/a.html"]);
    fs.rmSync(path.join(root, "tools"), { recursive: true });
    assert.deepEqual([...servedFiles(root).keys()], ["/draft/mockup/a.html"], "a folder that is not there gives nothing");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the port is 8156, or --port", async () => {
  assert.equal(portOf([]), 8156);
  assert.equal(portOf(["--port", "9000"]), 9000);
  assert.equal(portOf(["--port=9001"]), 9001);
  assert.throws(() => portOf(["--port", "x"]), /not a port: x/);
  assert.throws(() => portOf(["--port"]), /not a port: undefined/);
  assert.throws(() => portOf(["--port="]), /not a port: $/);
  assert.throws(() => portOf(["--prot", "1"]), /not an argument of the mockup's server: --prot/);
  const said = [];
  const server = main(["--port", "0"], (line) => said.push(line));
  await new Promise((resolve) => server.on("listening", resolve));
  server.close();
  assert.match(said[0], /^The interface mockup: http:\/\/127\.0\.0\.1:\d+\/ /);
});

