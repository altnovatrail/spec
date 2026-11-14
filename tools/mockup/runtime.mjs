// mockup: the runtime of NovaTrail's own that opens the interface mockup's sources, the files
// *.dc.html of draft/mockup/, in a browser and under jsdom (RUN.md, T156; R148).
//
// The sources were written for the runtime of the claude.ai Design canvas, support.js, which is not
// NovaTrail's and whose license is unknown, so it is not in the repository. This file does what the
// sources use of it, and nothing more:
//   - a file holds <x-dc>, the template, with <helmet>, what goes into the document's head, and a
//     <script type="text/x-dc" data-dc-script>, a class Component that extends DCLogic, with the
//     props and their defaults in its data-props;
//   - the template interpolates {{path}} — a dotted path into the values renderVals() returns, or
//     true, false or a number — in text and attributes; an attribute that is one {{path}} takes the
//     value itself: a function for an event (onClick, onPointerDown…), a boolean for disabled or
//     aria-*;
//   - <sc-if value="{{path}}"> keeps its children while the value is truthy, <sc-for list="{{path}}"
//     as="name"> repeats them for each item, and <dc-import name="Paper" page="{{x}}"> draws another
//     file's component with those props; attributes hint-* are the canvas editor's and are dropped;
//   - DCLogic gives this.props, this.state, setState(patch), which merges at once and draws on the
//     next microtask, and calls componentDidMount, componentDidUpdate and componentWillUnmount.
// A tag sc-* or dc-* it does not know is an error, so that a newer source cannot draw silently wrong.
// The DOM is patched in place by the key of each template node, so an element keeps its identity —
// its pointer capture, an input's caret — from one drawing to the next. Timers go through a clock
// of the app: settle() runs those pending at once, for a snapshot, and they run live otherwise.
// It takes no package and touches no global but globalThis.__novatrailMockup, which the compiled
// classes read their DCLogic and their timers from.

const BOOLEAN = new Set(["disabled", "checked", "selected", "hidden", "readonly", "required", "multiple", "autofocus", "open"]);
const KNOWN = new Set(["sc-if", "sc-for", "dc-import"]);
const PATH = /^\{\{([^{}]*)\}\}$/;
const PART = /\{\{([^{}]*)\}\}/g;
const SOURCE_NAME = /^[A-Z][A-Za-z0-9]*$/;

// The pieces of a source file: the template, the helmet, the script and its props' defaults.
export function parseSource(text, name = "source") {
  const xdc = /<x-dc>([\s\S]*)<\/x-dc>/.exec(text);
  if (!xdc) throw new Error(`${name}: no <x-dc>`);
  const script = /<script type="text\/x-dc" data-dc-script(?: data-props='([^']*)')?>([\s\S]*?)<\/script>/.exec(text);
  if (!script) throw new Error(`${name}: no <script type="text/x-dc" data-dc-script>`);
  let template = xdc[1];
  let helmet = "";
  const head = /<helmet>([\s\S]*?)<\/helmet>/.exec(template);
  if (head) {
    helmet = head[1];
    template = template.slice(0, head.index) + template.slice(head.index + head[0].length);
  }
  const spec = script[1] ? JSON.parse(script[1]) : {};
  const defaults = {};
  for (const [key, value] of Object.entries(spec)) if (!key.startsWith("$") && value && "default" in value) defaults[key] = value.default;
  const imports = [...template.matchAll(/<dc-import\b[^>]*\bname="([^"]*)"/g)].map((m) => m[1]);
  return { name, template, helmet, code: script[2], defaults, preview: spec.$preview || null, imports: [...new Set(imports)] };
}

// The registry the compiled classes read from: DCLogic, and the clock of the app that runs now.
function registry() {
  globalThis.__novatrailMockup ??= { DCLogic, clock: null, classes: new Map() };
  return globalThis.__novatrailMockup;
}

// The base class of a source's Component.
export class DCLogic {
  constructor(props) {
    this.props = props || {};
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.__dc?.schedule();
  }
}

// The class Component of a script, compiled once per text as a module of its own: the script's
// free setTimeout and clearTimeout are the app's clock, which settle() can run at once.
export async function compile(code) {
  const reg = registry();
  if (reg.classes.has(code)) return reg.classes.get(code);
  const prelude =
    "const __rt = globalThis.__novatrailMockup;\n" +
    "const DCLogic = __rt.DCLogic;\n" +
    "const setTimeout = (fn, ms) => __rt.clock.set(fn, ms);\n" +
    "const clearTimeout = (id) => __rt.clock.clear(id);\n";
  const url = "data:text/javascript;charset=utf-8," + encodeURIComponent(prelude + code + "\nexport default Component;\n");
  const pending = import(url).then((module) => module.default);
  reg.classes.set(code, pending);
  return pending;
}

// The timers of an app. Live, each also runs by a timer of the window, unless the app holds them;
// settle() runs them early.
export class Clock {
  constructor(live = false) {
    this.live = live;
    this.now = 0;
    this.seq = 0;
    this.pending = new Map();
    this.hold = false;
  }

  set(fn, ms = 0) {
    const id = ++this.seq;
    this.pending.set(id, { fn, at: this.now + Math.max(0, Number(ms) || 0), id });
    if (this.live) globalThis.setTimeout(() => this.hold || this.run(id), ms);
    return id;
  }

  clear(id) {
    this.pending.delete(id);
  }

  run(id) {
    const timer = this.pending.get(id);
    if (!timer) return false;
    this.pending.delete(id);
    this.now = Math.max(this.now, timer.at);
    timer.fn();
    return true;
  }

  // Runs the timer due first; false when none is pending.
  next() {
    let first = null;
    for (const timer of this.pending.values()) if (!first || timer.at < first.at || (timer.at === first.at && timer.id < first.id)) first = timer;
    return first ? this.run(first.id) : false;
  }
}

// One {{…}}: a literal, or a path looked up from the innermost scope out. A path no scope has, or
// one whose value has not the name that follows, is noted in missing: the template asks for a value
// renderVals does not give.
function lookup(expr, scopes, missing) {
  const path = expr.trim();
  if (path === "true") return true;
  if (path === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
  const [first, ...rest] = path.split(".");
  for (let i = scopes.length - 1; i >= 0; i--) {
    if (scopes[i] && Object.hasOwn(scopes[i], first)) {
      let value = scopes[i][first];
      for (const name of rest) {
        if (value == null || !(name in Object(value))) {
          missing.add(path);
          return undefined;
        }
        value = value[name];
      }
      return value;
    }
  }
  missing.add(path);
  return undefined;
}

// A text or an attribute's value, split into its literal pieces and its {{…}}.
function pieces(text) {
  const whole = PATH.exec(text);
  if (whole) return { path: whole[1] };
  if (!text.includes("{{")) return { text };
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(PART)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ path: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return { parts };
}

function evaluate(p, scopes, missing) {
  if ("path" in p) return lookup(p.path, scopes, missing);
  if ("text" in p) return p.text;
  return p.parts.map((x) => (typeof x === "string" ? x : stringOf(lookup(x.path, scopes, missing)))).join("");
}

const stringOf = (v) => (v == null || typeof v === "function" ? "" : String(v));

// The template, parsed by the document it is drawn in, into nodes that know their key.
export function compileTemplate(doc, template, name = "source") {
  const holder = doc.createElement("template");
  holder.innerHTML = template;
  let id = 0;
  const walk = (node) => {
    const out = [];
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        out.push({ t: "text", key: "t" + id++, value: pieces(child.nodeValue) });
        continue;
      }
      if (child.nodeType !== 1) continue;
      const tag = child.localName;
      const attr = (n) => child.getAttribute(n);
      if ((tag.startsWith("sc-") || tag.startsWith("dc-")) && !KNOWN.has(tag)) throw new Error(`${name}: the runtime does not know <${tag}>`);
      const key = "n" + id++;
      if (tag === "sc-if") {
        out.push({ t: "if", key, value: pieces(attr("value") ?? ""), kids: walk(child) });
      } else if (tag === "sc-for") {
        out.push({ t: "for", key, list: pieces(attr("list") ?? ""), as: attr("as") || "item", kids: walk(child) });
      } else if (tag === "dc-import") {
        const props = [];
        for (const a of child.attributes) if (a.name !== "name" && !a.name.startsWith("hint-")) props.push({ name: a.name, value: pieces(a.value) });
        out.push({ t: "import", key, name: attr("name"), props });
      } else {
        const attrs = [];
        for (const a of child.attributes) if (!a.name.startsWith("hint-")) attrs.push({ name: a.name, value: pieces(a.value) });
        const content = tag === "template" ? child.content : child;
        out.push({ t: "el", key, tag, ns: child.namespaceURI, attrs, kids: walk(content) });
      }
    }
    return out;
  };
  return walk(holder.content);
}

// The nodes of one drawing, from the compiled template and the values of renderVals.
function expand(nodes, scopes, suffix, missing, out = []) {
  for (const n of nodes) {
    const key = n.key + suffix;
    if (n.t === "text") out.push({ t: "text", key, text: stringOf(evaluate(n.value, scopes, missing)) });
    else if (n.t === "if") {
      if (evaluate(n.value, scopes, missing)) expand(n.kids, scopes, suffix, missing, out);
    } else if (n.t === "for") {
      const list = evaluate(n.list, scopes, missing);
      (Array.isArray(list) ? list : []).forEach((item, i) => expand(n.kids, [...scopes, { [n.as]: item }], `${suffix}/${i}`, missing, out));
    } else if (n.t === "import") {
      const props = {};
      for (const p of n.props) props[p.name] = evaluate(p.value, scopes, missing);
      out.push({ t: "import", key, name: n.name, props });
    } else {
      const attrs = new Map();
      const on = new Map();
      let value;
      for (const a of n.attrs) {
        const v = evaluate(a.value, scopes, missing);
        if (a.name.startsWith("on")) {
          if (typeof v === "function") on.set(eventOf(n.tag, a.name.slice(2)), v);
        } else if (a.name === "value" && (n.tag === "input" || n.tag === "textarea")) value = stringOf(v);
        else {
          const s = attributeOf(a.name, v);
          if (s != null) attrs.set(a.name, s);
        }
      }
      out.push({ t: "el", key, tag: n.tag, ns: n.ns, attrs, on, value, kids: expand(n.kids, scopes, suffix, missing) });
    }
  }
  return out;
}

// onChange of a text field fires as it is typed in, as the canvas has it; any other event keeps its name.
const eventOf = (tag, name) => (name === "change" && (tag === "input" || tag === "textarea") ? "input" : name);

// An attribute's string, or null to leave it out: false and nothing leave out an attribute, but
// aria-* says "true" and "false", and a boolean attribute is there or not.
function attributeOf(name, v) {
  if (name.startsWith("aria-") && typeof v === "boolean") return String(v);
  if (v == null || v === false || typeof v === "function") return null;
  if (v === true) return BOOLEAN.has(name) ? "" : "true";
  return String(v);
}

// One drawn component: its instance of Component, the element it draws into, its imports.
class Instance {
  constructor(app, def, props, host) {
    this.app = app;
    this.def = def;
    this.host = host;
    this.mounted = false;
    this.seq = app.made++;
    this.comp = new def.Component({ ...def.defaults, ...props });
    this.comp.__dc = this;
    app.instances.push(this);
  }

  schedule() {
    this.app.schedule(this);
  }

  draw() {
    const scopes = [this.comp.renderVals()];
    this.app.patchChildren(this.host, expand(this.def.nodes, scopes, "", this.app.missing));
    const call = this.mounted ? "componentDidUpdate" : "componentDidMount";
    this.mounted = true;
    this.app.after.push(() => this.gone || this.comp[call]?.());
  }

  unmount() {
    this.gone = true;
    this.app.queue.delete(this);
    if (this.mounted) this.comp.componentWillUnmount?.();
    this.app.instances = this.app.instances.filter((i) => i !== this);
  }
}

// The mockup in one document: its sources by name, its clock and what it has drawn.
export class App {
  // load(name) gives the text of the source file <name>.dc.html.
  constructor(doc, load, { live = false } = {}) {
    this.doc = doc;
    this.load = load;
    this.clock = new Clock(live);
    this.defs = new Map();
    this.instances = [];
    this.made = 0;
    this.queue = new Set();
    this.after = [];
    this.missing = new Set();
    this.scheduled = false;
  }

  // A source and, before it is drawn, every source it imports; its helmet goes into the head once,
// but for its links to other origins — the fonts of Google, Caveat and Inter, which are not taken
// (R148): the mockup loads nothing from the network, and a snapshot does not wait on a font.
  async define(name) {
    if (!SOURCE_NAME.test(name)) throw new Error(`not a source's name: ${name}`);
    if (this.defs.has(name)) return this.defs.get(name);
    const src = parseSource(await this.load(name), name);
    const def = { ...src, Component: await compile(src.code), nodes: compileTemplate(this.doc, src.template, name) };
    this.defs.set(name, def);
    const head = this.doc.createElement("template");
    head.innerHTML = src.helmet;
    for (const node of head.content.childNodes) {
      if (node.nodeType === 1 && !external(node)) this.doc.head.appendChild(this.doc.importNode(node, true));
    }
    for (const dep of src.imports) await this.define(dep);
    return def;
  }

  // Draws the source name into host, with props, and settles it.
  async mount(name, host, props = {}) {
    const def = await this.define(name);
    registry().clock = this.clock;
    const inst = new Instance(this, def, props, host);
    this.drawNow(inst);
    return inst;
  }

  // The instances of a source, in the order they were made.
  find(name) {
    return this.instances.filter((i) => i.def.name === name);
  }

  schedule(inst) {
    this.queue.add(inst);
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this.flush());
  }

  drawNow(inst) {
    this.queue.add(inst);
    this.flush();
  }

  // Draws what is queued, an importing component before what it imports, then calls the components
// back; what they set is drawn in the same flush.
  flush() {
    this.scheduled = false;
    registry().clock = this.clock;
    for (let round = 0; this.queue.size || this.after.length; round++) {
      if (round > 100) {
        this.queue.clear();
        this.after = [];
        throw new Error("the mockup keeps setting its state as it draws");
      }
      const queued = [...this.queue].sort((a, b) => a.seq - b.seq);
      this.queue.clear();
      for (const inst of queued) if (!inst.gone) inst.draw();
      const after = this.after;
      this.after = [];
      for (const fn of after) fn();
    }
  }

  // Runs every pending timer at once, drawing after each: the state a snapshot shows.
  settle(limit = 500) {
    registry().clock = this.clock;
    this.flush();
    for (let n = 0; this.clock.next(); n++) {
      if (n >= limit) throw new Error("the mockup's timers keep coming");
      this.flush();
    }
  }

  patchChildren(parent, vnodes) {
    const old = new Map();
    for (const child of parent.childNodes) if (child.__dcKey != null) old.set(child.__dcKey, child);
    let ref = parent.firstChild;
    for (const v of vnodes) {
      let node = old.get(v.key);
      if (node && node.__dcKind !== kindOf(v)) node = null;
      if (node) old.delete(v.key);
      else node = this.create(v);
      this.update(node, v);
      if (node === ref) ref = ref.nextSibling;
      else parent.insertBefore(node, ref);
    }
    for (const node of old.values()) this.remove(node);
  }

  create(v) {
    let node;
    if (v.t === "text") node = this.doc.createTextNode("");
    else if (v.t === "import") {
      node = this.doc.createElement("dc-import");
      node.style.display = "contents";
    } else node = this.doc.createElementNS(v.ns, v.tag);
    node.__dcKey = v.key;
    node.__dcKind = kindOf(v);
    return node;
  }

  update(node, v) {
    if (v.t === "text") {
      if (node.nodeValue !== v.text) node.nodeValue = v.text;
      return;
    }
    if (v.t === "import") return this.updateImport(node, v);
    const before = node.__dcAttrs || new Map();
    for (const [name, value] of v.attrs) if (before.get(name) !== value) node.setAttribute(name, value);
    for (const name of before.keys()) if (!v.attrs.has(name)) node.removeAttribute(name);
    node.__dcAttrs = v.attrs;
    node.__dcOn ??= new Map();
    for (const type of v.on.keys()) {
      if (!node.__dcOn.has(type)) node.addEventListener(type, (e) => node.__dcOn.get(type)?.(e));
    }
    for (const type of node.__dcOn.keys()) if (!v.on.has(type)) node.__dcOn.set(type, null);
    for (const [type, fn] of v.on) node.__dcOn.set(type, fn);
    if (v.value !== undefined && node.value !== v.value) node.value = v.value;
    this.patchChildren(node, v.kids);
  }

  updateImport(node, v) {
    const def = this.defs.get(v.name);
    if (!def) throw new Error(`<dc-import name="${v.name}">: no such source`);
    if (!node.__dcInst) {
      node.__dcInst = new Instance(this, def, v.props, node);
      this.queue.add(node.__dcInst);
      return;
    }
    const inst = node.__dcInst;
    const props = { ...def.defaults, ...v.props };
    const changed = Object.keys({ ...props, ...inst.comp.props }).some((k) => props[k] !== inst.comp.props[k]);
    if (changed) {
      inst.comp.props = props;
      this.queue.add(inst);
    }
  }

  remove(node) {
    const unmount = (n) => {
      if (n.__dcInst) n.__dcInst.unmount();
      for (const child of n.childNodes) unmount(child);
    };
    unmount(node);
    node.remove();
  }
}

const external = (node) => node.localName === "link" && /^(https?:)?\/\//i.test(node.getAttribute("href") || "");

const kindOf = (v) => (v.t === "el" ? `${v.ns} ${v.tag}` : v.t === "import" ? `import ${v.name}` : "text");
