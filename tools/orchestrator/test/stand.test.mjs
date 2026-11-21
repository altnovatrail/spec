// The stand on the made-up world of world.mjs: its servers are the stand-in of just's HTTP servers,
// run by the fake docker here, each in a session of its own, as in a container.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { main } from "../main.mjs";
import { commandsOf, groupOf, isReady, LIMIT_USD, PORTS, readConfig, readPid, restarts, runStand, spentOf, watchedOf } from "../stand.mjs";
import { world, write } from "./world.mjs";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(w, argv) {
  w.h.out.length = 0;
  w.h.err.length = 0;
  const status = await main(argv, w.deps);
  return { status, out: w.h.out.map((l) => JSON.parse(l)), err: w.h.err.join("\n") };
}

const stateOf = (dir) => JSON.parse(fs.readFileSync(path.join(dir, ".stand", "state.json"), "utf8"));

async function until(check, ms = 20_000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("no change in time");
    await pause(50);
  }
}

test("a server's pid file, what restarts api, what it watches, what the models spent and what stand.json may ask", (t) => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync("/tmp"), "stand-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  write(dir, { "a.pid": "12:345\n", "b.pid": "12\n" });
  assert.deepEqual(readPid(path.join(dir, "a.pid")), { pid: 12, start: 345 });
  assert.equal(readPid(path.join(dir, "b.pid")), null);
  assert.equal(readPid(path.join(dir, "none.pid")), null);

  assert.ok(restarts("internal/server/routes.go"));
  assert.ok(restarts("migrations/0023.sql"));
  for (const file of ["docs/architecture.md", "README.md", ".git/index", "node_modules/x/y.js", "bin/api", "coverage/go.out"]) assert.ok(!restarts(file), file);
  assert.ok(!restarts("spec/admission/table.json", { inApi: true }));
  assert.ok(restarts("admission/table.json"));

  const epic = path.join(dir, "e1");
  write(epic, { "api/go.work": "go 1.27\n\nuse .\n\nreplace github.com/altnovatrail/tutor => ../tutor\nreplace github.com/altnovatrail/spec/contracts => ../spec/contracts\nreplace x => ../../outside\nreplace y => ./inside\n" });
  assert.deepEqual(watchedOf(epic), [path.join(epic, "api"), path.join(epic, "tutor"), path.join(epic, "spec")]);
  assert.deepEqual(watchedOf(path.join(dir, "none")), [path.join(dir, "none", "api")]);

  write(dir, { "api-1.log": '{"cost_micro_usd":1500000}\n{"msg":"x"}\n{"cost_micro_usd":250000,"billed":false}\n', "api-2.log": '{"cost_micro_usd":1}\n' });
  assert.equal(spentOf([path.join(dir, "api-1.log"), path.join(dir, "api-2.log"), path.join(dir, "gone.log")]), 1.750001);

  fs.mkdirSync(path.join(dir, "s"));
  fs.writeFileSync(path.join(dir, "s", "stand.json"), JSON.stringify({ ai: "yes", limit_usd: -1, ports: { app: 80, api: 9000, relay: "x" } }));
  assert.deepEqual(readConfig(path.join(dir, "s")), { ai: false, mockup: false, limit_usd: LIMIT_USD, ports: { app: PORTS.app, api: 9000, mockup: PORTS.mockup, relay: PORTS.app, mockup_relay: PORTS.mockup } });

  assert.deepEqual(commandsOf({ ai: true }).api, ["env", "API_DEV_APP_AI=1", "just", "dev-app"]);
  assert.deepEqual(commandsOf({ canvas: false }).app, ["just", "dev"]);
  assert.ok(isReady({ root: 200, deployment: 200, rpc: 401 }) && !isReady({ root: 200, deployment: 404, rpc: 401 }));
});

test("serve starts the stand, ready once its probe passes through the relay; a change of Go restarts api; stop ends it all", async (t) => {
  const w = await world(t);
  await run(w, ["xrepo", "up", "e1", "api", "app", "canvas"]);
  const dir = path.join(w.epics, "e1");
  const served = await run(w, ["xrepo", "serve"]);
  t.after(() => run(w, ["xrepo", "stop"]));
  assert.equal(served.status, 0, served.err);
  const ready = served.out[0];
  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.probe, { root: 200, deployment: 200, rpc: 401 });
  assert.equal(ready.url, `http://127.0.0.1:${w.ports.relay}`);
  assert.deepEqual(Object.keys(ready.servers).sort(), ["api", "app", "canvas"]);
  // canvas built first, and app on that canvas.
  assert.deepEqual(w.calls("just").map((c) => [path.basename(c.cwd), c.recipe]).filter(([, r]) => r !== "_install"), [["canvas", "build"], ["api", "dev-app"], ["app", "dev-canvas"]]);
  assert.equal(w.calls("just").find((c) => c.recipe === "dev-app").ai, null);

  // The servers run in sessions of their own: one group each.
  const docker = (args) => w.h.docker(args);
  for (const name of ["api", "app", "canvas"]) assert.equal(groupOf(docker, "10xapp", readPid(path.join(dir, ".stand", `${name}.pid`))), 1, name);
  // A pid passed to another process since is not the server's.
  assert.equal(groupOf(docker, "10xapp", { ...readPid(path.join(dir, ".stand", "api.pid")), start: 1 }), 0);

  const status = (await run(w, ["xrepo", "status"])).out[0].stand;
  assert.deepEqual([status.phase, status.alive], ["ready", true]);

  // A document changes nothing; Go restarts api, once for a burst.
  fs.writeFileSync(path.join(dir, "api", "docs", "README.md"), "# changed\n");
  fs.writeFileSync(path.join(dir, "api", "main.go"), "package main\n\n// one\n");
  fs.writeFileSync(path.join(dir, "api", "main.go"), "package main\n\n// two\n");
  await until(() => stateOf(dir).restarts === 1 && stateOf(dir).phase === "ready");
  const api = stateOf(dir).servers.api;
  assert.equal(api.logs.length, 2);
  assert.notEqual(api.pid, ready.servers.api.pid);
  await pause(2500);
  assert.equal(stateOf(dir).restarts, 1);

  // A second serve stops the first before it starts.
  const again = await run(w, ["xrepo", "serve"]);
  assert.equal(again.status, 0, again.err);
  assert.notEqual(again.out[0].pid, ready.pid);

  // A connection the browser keeps open, as Vite's websocket, does not hold the stand's end.
  const net = await import("node:net");
  const kept = net.connect(w.ports.relay, "127.0.0.1");
  await new Promise((r) => kept.once("connect", r));
  kept.on("error", () => {});
  const stopped = await run(w, ["xrepo", "stop"]);
  assert.equal(stopped.status, 0, stopped.err);
  assert.deepEqual([stopped.out[0].stand, stopped.out[0].left], ["stopped", []]);
  assert.equal(stateOf(dir).phase, "stopped");
  for (const name of ["api", "app", "canvas", "stand"]) assert.ok(!fs.existsSync(path.join(dir, ".stand", `${name}.pid`)), name);
  const old = again.out[0].servers;
  for (const name of ["api", "app", "canvas"]) assert.equal(groupOf(docker, "10xapp", old[name]), 0, name);
  assert.equal((await run(w, ["xrepo", "stop"])).out[0].stand, "none");
});

test("serve refuses a stand without app's deployment configuration, a port taken, and a stand whose server stops", async (t) => {
  const w = await world(t);
  await run(w, ["xrepo", "up", "e1", "api"]);
  assert.match((await run(w, ["xrepo", "serve"])).err, /the stand needs a clone of app: xrepo up e1 app/);
  fs.rmSync(path.join(w.work("app"), "deployment.local.json"));
  await run(w, ["xrepo", "up", "e1", "app"]);
  assert.match((await run(w, ["xrepo", "serve"])).err, /app has no deployment\.local\.json/);
  fs.writeFileSync(path.join(w.epics, "e1", "app", "deployment.local.json"), "{}\n");
  // Something else listens on api's port.
  const net = await import("node:net");
  const other = net.createServer().listen(w.ports.api, "127.0.0.1");
  await new Promise((r) => other.once("listening", r));
  const r = await run(w, ["xrepo", "serve"]);
  other.close();
  assert.equal(r.status, 1);
  assert.match(r.err, new RegExp(`the stand failed: port ${w.ports.api} is taken in api's container`));
  // app's server ends at its start.
  w.deps.env.XREPO_TEST_APP_FAIL = "1";
  const failed = await run(w, ["xrepo", "serve"]);
  assert.equal(failed.status, 1);
  assert.match(failed.err, /the stand failed: app stopped before it was ready; its log is .*\/\.stand\/app-.*\.log/);
  assert.match(fs.readFileSync(/its log is (\S+\/app-\S+\.log)/.exec(failed.err)[1], "utf8"), /vite: no such file/);
  // What the failed stand started, it stopped.
  assert.ok(!fs.existsSync(path.join(w.epics, "e1", ".stand", "api.pid")));
});

test("on the models the stand counts what api's calls cost, and stops api at its limit; it serves spec's mockup when asked", async (t) => {
  const w = await world(t);
  await run(w, ["xrepo", "up", "e1", "api", "app"]);
  const dir = path.join(w.epics, "e1");
  fs.writeFileSync(path.join(dir, ".stand", "stand.json"), JSON.stringify({ ai: true, mockup: true, limit_usd: 0.002, ports: w.ports }));
  // In this process: its stop comes before the world's folder goes.
  const stand = runStand(dir, { program: w.deps.dockerProgram, env: w.deps.env, hostname: "aaaa1111", countMs: 50, step: 50 });
  try {
    await stand.ready;
    assert.equal(w.calls("just").find((c) => c.recipe === "dev-app").ai, "1");
    // The mockup runs in spec's container, from its clone, behind a relay of its own.
    assert.equal(stand.state.mockup.port, w.ports.mockup_relay);
    assert.ok(w.h.dockerCalls().some((c) => c.includes("--detach") && c.includes("bbbb2222spec") && c.includes("tools/mockup/serve.mjs")));
    const { request } = await import("../stand.mjs");
    for (let i = 0; i < 100 && (await request(w.ports.mockup_relay, "GET", "/")) !== 200; i += 1) await pause(50);
    assert.equal(await request(w.ports.mockup_relay, "GET", "/"), 200);
    await until(() => stand.state.phase === "over-limit");
    assert.equal(stand.state.spent_usd, 0.003);
    assert.match(stand.state.error, /the models spent \$0\.003 of the stand's limit of \$0\.002: api is stopped/);
    await until(() => groupOf((a) => w.h.docker(a), "00xapi", stand.state.servers.api) === 0);
  } finally {
    await stand.stop();
  }
  assert.equal(stateOf(dir).phase, "over-limit");
  assert.equal(groupOf((a) => w.h.docker(a), "bbbb2222spec", stand.state.servers.mockup), 0);
});
