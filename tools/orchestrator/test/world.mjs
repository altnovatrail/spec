// A made-up world for xrepo, on the host of fakes.mjs: "GitHub" as folders of git repositories,
// .epics as a folder of its own, the containers of the repositories a task across repositories
// touches, and stand-ins for just, go, Vitest and tsc. Its just serves app and api as made-up HTTP
// servers on the ports the test gives, app proxying an RPC to api as app's Vite does; spec's
// origin packs its npm packages with a stand-in of its packer. None is a real repository, server
// or package.

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { git } from "../../shared.mjs";
import { container, host, HOST } from "./fakes.mjs";

// The stand-in of just: writes down each recipe it ran and where, and runs it.
const JUST = `#!/usr/bin/env node
const fs = require("node:fs");
const http = require("node:http");
const [recipe] = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_DOCKER + "/just.jsonl", JSON.stringify({ cwd: process.cwd(), recipe, ai: process.env.API_DEV_APP_AI ?? null }) + "\\n");
const program = (file, body) => { fs.writeFileSync(file, "#!/usr/bin/env node\\n" + body); fs.chmodSync(file, 0o755); };
const serve = (port, handle) => { http.createServer(handle).listen(port, "127.0.0.1", () => console.log("listening on " + port)); process.on("SIGINT", () => process.exit(0)); };
if (recipe === "_install") {
  fs.mkdirSync("node_modules/.bin", { recursive: true });
  program("node_modules/.bin/vitest", "console.log('vitest ' + JSON.stringify(process.argv.slice(2)));");
  program("node_modules/.bin/tsc", "console.log('tsc watching'); setInterval(() => {}, 1000); process.on('SIGINT', () => process.exit(0));");
  for (const name of ["spec", "contracts"]) fs.mkdirSync("node_modules/@altnovatrail/" + name, { recursive: true });
} else if (recipe === "build") {
  fs.mkdirSync("lib", { recursive: true });
} else if (recipe === "dev-app") {
  // A run on the models logs the cost of each call, as api does.
  if (process.env.API_DEV_APP_AI === "1") for (let i = 0; i < 2; i += 1) console.log(JSON.stringify({ msg: "ai call", cost_micro_usd: 1500, billed: true }));
  serve(Number(process.env.XREPO_TEST_API), (req, res) => { res.statusCode = req.url.startsWith("/novatrail.") ? 401 : 404; res.end(); });
} else if (recipe === "dev-canvas" || recipe === "dev") {
  if (process.env.XREPO_TEST_APP_FAIL) { console.log("vite: no such file"); process.exit(4); }
  serve(Number(process.env.XREPO_TEST_APP), (req, res) => {
    if (req.url.startsWith("/novatrail.")) {
      const out = http.request({ host: "127.0.0.1", port: Number(process.env.XREPO_TEST_API), method: req.method, path: req.url, headers: req.headers }, (r) => { res.statusCode = r.statusCode; r.pipe(res); });
      out.on("error", () => { res.statusCode = 502; res.end(); });
      req.pipe(out);
      return;
    }
    res.statusCode = req.url === "/" ? 200 : req.url === "/deployment.json" && fs.existsSync("deployment.local.json") ? 200 : 404;
    res.end();
  });
} else if (["docs-check", "_tools"].includes(recipe)) {
  console.log("just " + recipe);
} else process.exit(1);
`;

// The stand-in of go: writes down its arguments and where, and fails in a folder that holds FAIL.
const GO = `#!/usr/bin/env node
const fs = require("node:fs");
fs.appendFileSync(process.env.FAKE_DOCKER + "/go.jsonl", JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + "\\n");
console.log("go " + process.argv.slice(2).join(" "));
process.exit(fs.existsSync("FAIL") ? 3 : 0);
`;

// spec's packer, as tools/types/npm.mjs and tools/contracts/npm.mjs: an archive of a package
// folder that holds the version given and spec's tree.txt.
const packer = (name) => `import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const [root, version, dir] = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pack-"));
fs.mkdirSync(path.join(tmp, "package"));
fs.writeFileSync(path.join(tmp, "package", "package.json"), JSON.stringify({ name: "@altnovatrail/${name}", version }));
fs.copyFileSync(path.join(root, "tree.txt"), path.join(tmp, "package", "tree.txt"));
const file = path.join(dir, "altnovatrail-${name}-" + version + ".tgz");
execFileSync("tar", ["-czf", file, "-C", tmp, "package"]);
fs.rmSync(tmp, { recursive: true });
console.log(file);
`;

const requires = (list) => `require (\n${list.map((m) => `\tgithub.com/altnovatrail/${m}`).join("\n")}\n)\n`;

// The origins' files: Go modules that require each other, and the packages of app and canvas.
const ORIGINS = {
  spec: {
    "go.mod": "module github.com/altnovatrail/spec\n\ngo 1.27.4\n",
    "contracts/go.mod": "module github.com/altnovatrail/spec/contracts\n\ngo 1.27.5\n",
    "tree.txt": "first\n",
    // Reads its stdin, as the real one does: a writer of the pipe never meets a closed end.
    "tools/release/version.mjs": 'import fs from "node:fs";\nfs.readFileSync(0);\nconsole.log("version=v0.20.1");\nconsole.log("released=");\n',
    "tools/types/npm.mjs": packer("spec"),
    "tools/contracts/npm.mjs": packer("contracts"),
    // The mockup's server, as tools/mockup/serve.mjs: --port N.
    "tools/mockup/serve.mjs": 'import http from "node:http";\nhttp.createServer((q, r) => r.end("mockup")).listen(Number(process.argv[3]), "127.0.0.1");\n',
  },
  "module-kit": { "go.mod": `module github.com/altnovatrail/module-kit\n\ngo 1.27.0\n\n${requires(["spec v0.19.4", "spec/contracts v0.19.4"])}` },
  tutor: { "go.mod": `module github.com/altnovatrail/tutor\n\ngo 1.27.0\n\n${requires(["module-kit v0.3.16", "spec v0.19.4", "spec/contracts v0.19.4"])}` },
  api: {
    "go.mod": `module github.com/altnovatrail/api\n\ngo 1.27.4\n\n${requires(["engine v0.1.8", "module-kit v0.3.16 // indirect", "spec v0.19.4", "spec/contracts v0.19.4"])}\nrequire github.com/altnovatrail/tutor v0.1.59\n`,
    "main.go": "package main\n",
    "docs/README.md": "# api\n",
  },
  app: { ".gitignore": "/node_modules/\n/deployment.local.json\n", "package.json": JSON.stringify({ dependencies: { "@altnovatrail/canvas": "0.3.36", "@altnovatrail/contracts": "0.19.4" }, devDependencies: { "@altnovatrail/spec": "0.19.4" } }) },
  canvas: { ".gitignore": "/node_modules/\n/lib/\n", "package.json": JSON.stringify({ dependencies: { "@altnovatrail/spec": "0.19.4" } }) },
};

export function commit(dir, message) {
  git(dir, ["add", "-A"]);
  git(dir, ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "--quiet", "-m", message]);
  return git(dir, ["rev-parse", "HEAD"]).trim();
}

export function write(dir, files) {
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
}

// Ports nobody listens on, for the made-up servers and the relay.
export async function freePorts(n) {
  const servers = await Promise.all(Array.from({ length: n }, () => new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => resolve(s));
  })));
  const ports = servers.map((s) => s.address().port);
  await Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve))));
  return ports;
}

// The world: the host, its origins, .epics, the containers, and the overrides of main.mjs.
export async function world(t) {
  const h = host();
  t.after(h.done);
  const github = path.join(h.root, "github");
  const epics = path.join(h.root, "epics");
  for (const [repo, files] of Object.entries(ORIGINS)) {
    const dir = path.join(github, `${repo}.git`);
    fs.mkdirSync(dir, { recursive: true });
    git(dir, ["init", "--quiet", "--initial-branch=main"]);
    write(dir, files);
    commit(dir, `${repo}: first`);
  }
  fs.writeFileSync(path.join(h.bin, "just"), JUST, { mode: 0o755 });
  fs.writeFileSync(path.join(h.bin, "go"), GO, { mode: 0o755 });
  const work = (repo) => path.join(h.root, "workspaces", repo);
  h.edit((cs) => {
    for (const [i, repo] of ["api", "app", "canvas", "tutor", "module-kit"].entries()) {
      fs.mkdirSync(work(repo), { recursive: true });
      const mounts = [
        { Type: "bind", Source: `${HOST}/${repo}`, Destination: work(repo) },
        { Type: "volume", Name: "novatrail-claude", Destination: h.volume },
      ];
      cs.push(container(`${i}0x${repo}`, `${repo}_box`, `${HOST}/${repo}`, { running: true, mounts }));
    }
  });
  fs.writeFileSync(path.join(work("app"), "deployment.local.json"), "{}\n");
  const [api, app, relay, mockup, mockupRelay] = await freePorts(5);
  const ports = { api, app, relay, mockup, mockup_relay: mockupRelay };
  const deps = {
    ...h.deps,
    epics,
    organization: github,
    dockerProgram: path.join(h.bin, "docker"),
    env: { ...h.env, XREPO_TEST_API: String(api), XREPO_TEST_APP: String(app) },
    inherit: false,
    ports,
    interval: 50,
    standWait: 10,
    serverWait: 20,
    stopStep: 100,
  };
  const calls = (name) => {
    const file = path.join(h.root, "docker", `${name}.jsonl`);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  };
  return { h, github, epics, work, deps, ports, calls, origin: (repo) => path.join(github, `${repo}.git`) };
}

