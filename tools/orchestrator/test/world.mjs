// A made-up world for xrepo, on the host of fakes.mjs: "GitHub" as folders of git repositories,
// .epics as a folder of its own, the containers of the repositories a task across repositories
// touches, and stand-ins for just, go, Vitest and tsc. Its just serves app and api as made-up HTTP
// servers on the ports the test gives, app proxying an RPC to api as app's Vite does; spec's
// origin packs its npm packages with a stand-in of its packer. None is a real repository, server
// or package.

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { git } from "../../shared.mjs";
import { container, host, HOST } from "./fakes.mjs";

// The stand-in of just: writes down each recipe it ran and where, and runs it. A recipe of a gate
// passes, or does what XREPO_TEST_GATE says of "<repo>:<recipe>": "fail"; "pin", ci-lint's check of
// the pin of spec, which fails with or without a go.work; "guard", a guard of ci-test, unless
// GOFLAGS skips it; "licenses", go-licenses with no LICENSE in spec/contracts, and
// "licenses-other", with a license not allowed too; "release-licenses", ci-lint's step of that
// name on spec/contracts with no LICENSE, and "release-licenses-other", on a module go.work does
// not replace. ci-test, coverage and ci write a report of every file git tracks, each line
// hit, or missed where "<repo>:cover" is "miss".
const JUST = `#!/usr/bin/env node
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
let argv = process.argv.slice(2);
if (argv[0] === "-f") argv = argv.slice(2);
const [recipe] = argv;
const repo = path.basename(process.cwd());
fs.appendFileSync(process.env.FAKE_DOCKER + "/just.jsonl", JSON.stringify({ cwd: process.cwd(), recipe, ai: process.env.API_DEV_APP_AI ?? null, goflags: process.env.GOFLAGS ?? null, allowed: process.env.ALLOWED_LICENSES ?? null }) + "\\n");
const gate = JSON.parse(process.env.XREPO_TEST_GATE || "{}");
const report = () => {
  const count = gate[repo + ":cover"] === "miss" ? 0 : 1;
  const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\\n").filter(Boolean);
  const size = (f) => fs.readFileSync(f, "utf8").split("\\n").length;
  fs.mkdirSync("coverage", { recursive: true });
  const go = files.filter((f) => f.endsWith(".go")).map((f) => "github.com/altnovatrail/" + repo + "/" + f + ":1.1," + size(f) + ".10 1 " + count);
  if (go.length) fs.writeFileSync("coverage/go.out", "mode: set\\n" + go.join("\\n") + "\\n");
  const js = files.filter((f) => /\\.(ts|mjs)$/.test(f)).map((f) => "SF:" + f + "\\n" + Array.from({ length: size(f) }, (_, i) => "DA:" + (i + 1) + "," + count).join("\\n") + "\\nend_of_record");
  if (js.length) fs.writeFileSync("coverage/lcov.info", js.join("\\n") + "\\n");
};
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
} else if (recipe === "_tools" || recipe === "release-verify-npm" || recipe === "release-verify") {
  console.log("just " + recipe);
} else if (recipe === "licenses-allowed") {
  console.log("MIT\\nApache-2.0");
} else if (/^(ci|ci-.+|.+-check|coverage)$/.test(recipe)) {
  const how = gate[repo + ":" + recipe];
  if (["ci-test", "coverage", "ci"].includes(recipe)) report();
  // As just, which says a recipe failed after all the recipe said.
  const fail = (...lines) => { for (const l of lines) console.error(l); console.error("error: recipe \\x60" + recipe + "\\x60 failed with exit code 1"); process.exit(1); };
  if (how === "pin") fail("ci-lint: the submodule spec/ is at abc, while go.mod requires github.com/altnovatrail/spec v0.19.4; move them to one tag together (R64 spec; R20)");
  if (how === "guard" && fs.existsSync("go.work") && !(process.env.GOFLAGS || "").includes("TestSpecVersion")) fail("--- FAIL: TestSpecVersion");
  if (how === "licenses") fail("W1121 library.go:141] contains non-Go code", "Did not find license for library 'github.com/altnovatrail/spec/contracts/novatrail/api/v1'.", "exit status 1");
  if (how === "licenses-other") fail("Did not find license for library 'github.com/altnovatrail/spec/contracts/novatrail/api/v1'.", "Not allowed license GPL-3.0 found for library github.com/x/y", "exit status 1");
  const noLicense = (m) => fail("release-licenses: " + m + " has no LICENSE, LICENSE.txt, LICENSE.md or COPYING", "error: recipe \x60release-licenses\x60 failed with exit code 1");
  if (how === "release-licenses") noLicense("github.com/altnovatrail/spec/contracts");
  if (how === "release-licenses-other") noLicense("github.com/x/y");
  if (how === "fail") fail(recipe + " failed");
  console.log("just " + recipe);
} else process.exit(1);
`;

// The stand-in of go: writes down its arguments and where, and fails in a folder that holds FAIL;
// go get raises go.mod's requirements to the versions named.
const GO = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_DOCKER + "/go.jsonl", JSON.stringify({ cwd: process.cwd(), args, ...(process.env.GOWORK ? { gowork: process.env.GOWORK } : {}) }) + "\\n");
if (args[0] === "get") {
  let mod = fs.readFileSync("go.mod", "utf8");
  for (const a of args.slice(1)) { const [m, v] = a.split("@"); mod = mod.replace(new RegExp("(^|\\\\s)" + m.replace(/[.]/g, "\\\\.") + " v\\\\S+", "m"), "$1" + m + " " + v); }
  fs.writeFileSync("go.mod", mod);
}
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

// The stand-in of npm: npm install raises package.json's packages to the versions named, exactly,
// and writes them to the lock file, which keeps what else it held.
const NPM = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_DOCKER + "/npm.jsonl", JSON.stringify({ cwd: process.cwd(), args }) + "\\n");
const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = fs.existsSync("package-lock.json") ? JSON.parse(fs.readFileSync("package-lock.json", "utf8")) : { lockfileVersion: 3, packages: {} };
for (const a of args.filter((x) => !x.startsWith("-") && x !== "install")) {
  const at = a.lastIndexOf("@");
  const [name, version] = [a.slice(0, at), a.slice(at + 1)];
  for (const k of ["dependencies", "devDependencies"]) if (manifest[k] && manifest[k][name]) manifest[k][name] = version;
  lock.packages["node_modules/" + name] = { version };
}
fs.writeFileSync("package.json", JSON.stringify(manifest));
fs.writeFileSync("package-lock.json", JSON.stringify(lock));
`;

const CODECOV = "coverage:\n  status:\n    patch:\n      default:\n        target: 90%\n";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, "..", "..");
// spec's real patchcov, which the gate runs from the clone of spec.
const PATCHCOV = Object.fromEntries(["patchcov/main.mjs", "patchcov/patchcov.mjs", "shared.mjs"].map((f) => [`tools/${f}`, fs.readFileSync(path.join(TOOLS, f), "utf8")]));

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
    ...PATCHCOV,
  },
  "module-kit": { "go.mod": `module github.com/altnovatrail/module-kit\n\ngo 1.27.0\n\n${requires(["spec v0.19.4", "spec/contracts v0.19.4"])}`, "CLAUDE.md": "# module-kit\n\n- `spec/` — spec at `v0.19.4`.\n- An example: `v0.19.4`.\n" },
  tutor: { "go.mod": `module github.com/altnovatrail/tutor\n\ngo 1.27.0\n\n${requires(["module-kit v0.3.16", "spec v0.19.4", "spec/contracts v0.19.4"])}` },
  infra: { "README.md": "# infra\n" },
  api: {
    "go.mod": `module github.com/altnovatrail/api\n\ngo 1.27.4\n\n${requires(["engine v0.1.8", "module-kit v0.3.16 // indirect", "spec v0.19.4", "spec/contracts v0.19.4"])}\nrequire github.com/altnovatrail/tutor v0.1.59\n`,
    "main.go": "package main\n",
    "docs/README.md": "# api\n",
  },
  app: {
    ".gitignore": "/node_modules/\n/deployment.local.json\n/coverage/\n",
    justfile: 'spec_tag := "v0.19.4"\n',
    NOTICE: "@altnovatrail/canvas 0.3.36 — Apache-2.0\n@altnovatrail/contracts 0.19.4 — Apache-2.0\n@altnovatrail/spec 0.19.0 — Apache-2.0\n@altnovatrail/spec 0.19.4 — Apache-2.0\n",
    "RUN.md": "# app\n\nspec at tag v0.19.4, `v0.19.4`; tag v0.19.40 is another; moved to spec v0.19.4 by T1, [notes](https://github.com/altnovatrail/spec/releases/tag/v0.19.4).\n",
    // canvas holds contracts 0.19.4 of its own, which keeps its line of NOTICE.
    "package-lock.json": JSON.stringify({ lockfileVersion: 3, packages: { "node_modules/@altnovatrail/canvas/node_modules/@altnovatrail/contracts": { version: "0.19.4" } } }),
    "parts/deployment-1.tar.gz": "spec v0.19.4\n",
    "parts/deployment-1.tar.gz.sigstore.json": "{}\n",
    "package.json": JSON.stringify({ dependencies: { "@altnovatrail/canvas": "0.3.36", "@altnovatrail/contracts": "0.19.4" }, devDependencies: { "@altnovatrail/spec": "0.19.4" } }),
  },
  canvas: { ".gitignore": "/node_modules/\n/lib/\n/coverage/\n", "package.json": JSON.stringify({ dependencies: { "@altnovatrail/spec": "0.19.4" } }) },
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
    write(dir, { ".gitignore": "/coverage/\n", ...(repo === "infra" ? {} : { ".github/codecov.yml": CODECOV }), ...files });
    commit(dir, `${repo}: first`);
  }
  fs.writeFileSync(path.join(h.bin, "just"), JUST, { mode: 0o755 });
  fs.writeFileSync(path.join(h.bin, "go"), GO, { mode: 0o755 });
  fs.writeFileSync(path.join(h.bin, "npm"), NPM, { mode: 0o755 });
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

