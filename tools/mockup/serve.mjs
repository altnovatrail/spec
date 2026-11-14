// mockup: serves the interface mockup on this machine, for a browser and for Playwright (RUN.md, T156):
//
//   node tools/mockup/serve.mjs [--port 8156]       in spec, as `just mockup`
//   node spec/tools/mockup/serve.mjs [--port 8156]  in another NovaTrail repository
//
// It listens on 127.0.0.1 alone and serves two folders of the spec it is in — tools/mockup/, the
// page and its runtime, and draft/mockup/, the sources —, and / leads to the page, /tools/mockup/.
// Nothing else of the repository is served. It takes only Node's own modules: spec/tools/ of
// another repository has no node_modules.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FOLDERS = ["tools/mockup/", "draft/mockup/"];
const TYPES = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

// The file of the spec at root that a request's path names, or null: only a file inside one of the
// folders, with a type of TYPES — by its path, before the file system is asked, and again by its
// real path, so that a link out of the folders is not followed.
export function fileOf(root, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  } catch {
    return null;
  }
  if (rel.endsWith("/")) rel += "index.html";
  if (rel.includes("\0") || !Object.hasOwn(TYPES, path.extname(rel))) return null;
  const full = path.resolve(root, rel);
  const within = (p, base) => FOLDERS.some((folder) => p.startsWith(path.resolve(base, folder) + path.sep));
  if (!within(full, root)) return null;
  let real;
  try {
    real = fs.realpathSync(full);
  } catch {
    return null;
  }
  return within(real, fs.realpathSync(root)) && fs.statSync(real).isFile() ? real : null;
}

export function createServer(root = ROOT) {
  return http.createServer((req, res) => {
    const [where, query] = req.url.split(/\?(.*)/s);
    if (where === "/") {
      res.writeHead(302, { location: "/tools/mockup/" + (query ? "?" + query : "") });
      res.end();
      return;
    }
    const file = req.method === "GET" || req.method === "HEAD" ? fileOf(root, req.url) : null;
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found\n");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)], "cache-control": "no-store", "x-content-type-options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : fs.readFileSync(file));
  });
}

// The port of the arguments — --port N or --port=N —, or 8156; any other argument is an error.
export function portOf(args) {
  let value = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port") value = args[++i];
    else if (args[i].startsWith("--port=")) value = args[i].slice("--port=".length);
    else throw new Error(`not an argument of the mockup's server: ${args[i]}; it takes --port N`);
  }
  if (value === null) return 8156;
  const port = Number(value);
  if (value === undefined || value === "" || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`--port: not a port: ${value}`);
  return port;
}

export function main(args = process.argv.slice(2), out = console.log) {
  const server = createServer();
  server.listen(portOf(args), "127.0.0.1", () => out(`The interface mockup: http://127.0.0.1:${server.address().port}/ (Ctrl+C stops it)`));
  return server;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
