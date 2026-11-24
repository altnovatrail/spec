// The check of a devcontainer's pins, on made-up repositories and made-up answers of the VS Code
// Marketplace and npm: no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MARKETPLACE,
  NPM_DIST_TAGS,
  claudeCodeOf,
  compareVersions,
  latestStable,
  main,
  marketplaceLatest,
  pinsOf,
  report,
} from "../outdated.mjs";

const PRE = { key: "Microsoft.VisualStudio.Code.PreRelease", value: "true" };

function repository(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "outdated-"));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

const devcontainer = (extensions) => `// A devcontainer, with comments as it is written.
{
    "name": "x", // its name
    /* the editor */
    "customizations": { "vscode": { "extensions": ${JSON.stringify(extensions)} } }
}
`;

const extension = (id, versions) => {
  const [publisherName, extensionName] = id.split(".");
  return { publisher: { publisherName }, extensionName, versions };
};

// A fetch that answers the Marketplace and npm from what it is given, and records the requests.
function fakeFetch(extensions, tags = { latest: "2.1.331", stable: "2.1.325" }) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    const body = url === MARKETPLACE ? { results: [{ extensions }] } : url === NPM_DIST_TAGS ? tags : null;
    if (body === null) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => body };
  };
  return { fetchImpl, requests };
}

const sink = () => {
  const chunks = [];
  return { write: (s) => chunks.push(s), text: () => chunks.join("") };
};

test("versions compare part by part as numbers", () => {
  assert.equal(compareVersions("2.1.280", "2.1.331"), -1);
  assert.equal(compareVersions("26.1117.41037", "26.1007.21434"), 1);
  assert.equal(compareVersions("1.10.0", "1.9.1"), 1);
  assert.equal(compareVersions("2.0", "2.0.0"), 0);
  assert.equal(compareVersions("1.0.0-beta", "1.0.0-alpha"), 1);
});

test("the latest stable version leaves the pre-releases out, and a version of several platforms counts once and only with this one", () => {
  const versions = [
    { version: "2.1.2026112008", properties: [PRE] },
    { version: "2.1.0", targetPlatform: "darwin-arm64" },
    { version: "2.0.0", targetPlatform: "linux-x64", properties: [] },
    { version: "2.0.0", targetPlatform: "linux-arm64" },
    { version: "1.25.0", properties: [{ key: PRE.key, value: "false" }] },
    { version: "1.9.1", targetPlatform: "universal" },
  ];
  assert.equal(latestStable({ versions }, "linux-x64"), "2.0.0");
  assert.equal(latestStable({ versions }, "darwin-arm64"), "2.1.0");
  assert.equal(latestStable({ versions: versions.slice(4) }, "linux-arm64"), "1.25.0");
  assert.equal(latestStable({ versions: [{ version: "3.0.0", properties: [PRE] }] }), null);
});

test("the pins come from every devcontainer.json under .devcontainer/ and from the kinds of repo-template", () => {
  const root = repository({
    ".devcontainer/devcontainer.json": devcontainer(["Anthropic.claude-code@2.1.280", "redhat.vscode-yaml@1.24.0"]),
    ".devcontainer/orchestrator/devcontainer.json": devcontainer(["anthropic.claude-code@2.1.280"]),
    ".devcontainer/empty/README.md": "a folder with no configuration",
    "repo-template/kinds.json": JSON.stringify({ docs: {}, go: { extensions: ["golang.go"] }, typescript: ["biomejs.biome@3.8.1"] }),
    ".devcontainer/Dockerfile": "FROM x\n# Claude Code CLI.\nARG CLAUDE_CODE_VERSION=2.1.280\nRUN true\n",
  });
  assert.deepEqual(pinsOf(root), [
    { id: "anthropic.claude-code", version: "2.1.280", where: ".devcontainer/devcontainer.json" },
    { id: "redhat.vscode-yaml", version: "1.24.0", where: ".devcontainer/devcontainer.json" },
    { id: "anthropic.claude-code", version: "2.1.280", where: path.join(".devcontainer", "orchestrator", "devcontainer.json") },
    { id: "golang.go", version: null, where: "repo-template/kinds.json (go)" },
    { id: "biomejs.biome", version: "3.8.1", where: "repo-template/kinds.json (typescript)" },
  ]);
  assert.equal(claudeCodeOf(root), "2.1.280");
  assert.equal(claudeCodeOf(repository({ ".devcontainer/devcontainer.json": devcontainer([]) })), null);
});

test("the Marketplace is asked once, by filter 7 and flags 19, and an id it does not know is null", async () => {
  const { fetchImpl, requests } = fakeFetch([extension("RedHat.vscode-yaml", [{ version: "2.0.0" }])]);
  const latest = await marketplaceLatest(["redhat.vscode-yaml", "nobody.nothing"], fetchImpl, "linux-x64");
  assert.deepEqual([...latest], [["redhat.vscode-yaml", "2.0.0"], ["nobody.nothing", null]]);
  assert.equal(requests.length, 1);
  const { init } = requests[0];
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Accept, "application/json;api-version=7.2-preview.1");
  const body = JSON.parse(init.body);
  assert.equal(body.flags, 19);
  assert.deepEqual(body.filters[0].criteria, [
    { filterType: 7, value: "redhat.vscode-yaml" },
    { filterType: 7, value: "nobody.nothing" },
  ]);
});

test("the report marks what is behind, a change of the major version, a pin not exact, and Claude Code apart from its extension", () => {
  const pins = [
    { id: "anthropic.claude-code", version: "2.1.331", where: "a" },
    { id: "anthropic.claude-code", version: "2.1.331", where: "b" },
    { id: "redhat.vscode-yaml", version: "1.24.0", where: "a" },
    { id: "golang.go", version: null, where: "k" },
    { id: "nobody.nothing", version: "1.0.0", where: "a" },
  ];
  const latest = new Map([
    ["anthropic.claude-code", "2.1.331"],
    ["redhat.vscode-yaml", "2.0.0"],
    ["golang.go", "0.58.0"],
    ["nobody.nothing", null],
  ]);
  const { rows, behind } = report(pins, latest, { pinned: "2.1.280", latest: "2.1.331" });
  assert.equal(behind, true);
  assert.deepEqual(
    rows.map((r) => [r.name, r.note, r.where]),
    [
      ["anthropic.claude-code", "", "a, b"],
      ["redhat.vscode-yaml", "outdated, major 1 → 2", "a"],
      ["golang.go", "no exact version", "k"],
      ["nobody.nothing", "not in the Marketplace", "a"],
      ["CLAUDE_CODE_VERSION (npm latest)", "outdated, not the version of anthropic.claude-code", ".devcontainer/Dockerfile"],
    ],
  );
  const current = report(pins.slice(0, 2), latest, { pinned: "2.1.331", latest: "2.1.331" });
  assert.equal(current.behind, false);
});

test("main exits 1 and prints the table when something is behind, 0 when nothing is", async () => {
  const files = (claude, yaml) => ({
    ".devcontainer/devcontainer.json": devcontainer([`anthropic.claude-code@${claude}`, `redhat.vscode-yaml@${yaml}`]),
    ".devcontainer/Dockerfile": `ARG CLAUDE_CODE_VERSION=${claude}\n`,
  });
  const market = [
    extension("anthropic.claude-code", [{ version: "2.1.331", targetPlatform: "linux-x64" }, { version: "2.1.331", targetPlatform: "linux-arm64" }]),
    extension("redhat.vscode-yaml", [{ version: "2.1.2026112008", properties: [PRE] }, { version: "2.0.0" }]),
  ];
  const out = sink();
  assert.equal(await main(repository(files("2.1.280", "1.24.0")), fakeFetch(market).fetchImpl, out, sink(), "linux-x64"), 1);
  assert.match(out.text(), /^redhat\.vscode-yaml +1\.24\.0 +2\.0\.0 +outdated, major 1 → 2 +\.devcontainer\/devcontainer\.json$/m);
  assert.match(out.text(), /^CLAUDE_CODE_VERSION \(npm latest\) +2\.1\.280 +2\.1\.331 +outdated/m);
  const fresh = sink();
  assert.equal(await main(repository(files("2.1.331", "2.0.0")), fakeFetch(market).fetchImpl, fresh, sink(), "linux-arm64"), 0);
  assert.match(fresh.text(), /Everything is at its latest version/);
});

test("main exits 2 and checks nothing when the Marketplace or npm cannot be read, and 1 where there is nothing to check", async () => {
  const root = repository({
    ".devcontainer/devcontainer.json": devcontainer(["redhat.vscode-yaml@2.0.0"]),
    ".devcontainer/Dockerfile": "ARG CLAUDE_CODE_VERSION=2.1.331\n",
  });
  const down = async () => {
    throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
  };
  const err = sink();
  const out = sink();
  assert.equal(await main(root, down, out, err), 2);
  assert.match(err.text(), /could not read the VS Code Marketplace: ENOTFOUND; nothing was checked/);
  assert.equal(out.text(), "");

  const noTag = fakeFetch([extension("redhat.vscode-yaml", [{ version: "2.0.0" }])], { stable: "2.1.325" });
  const err2 = sink();
  assert.equal(await main(root, noTag.fetchImpl, sink(), err2), 2);
  assert.match(err2.text(), /npm: no dist-tag latest/);

  const refused = async () => ({ ok: false, status: 503 });
  const err3 = sink();
  assert.equal(await main(root, refused, sink(), err3), 2);
  assert.match(err3.text(), /HTTP 503/);

  const notJson = async () => ({ ok: true, status: 200, json: async () => JSON.parse("<html>") });
  const err4 = sink();
  assert.equal(await main(root, notJson, sink(), err4), 2);
  assert.match(err4.text(), /the answer is not JSON/);

  const broken = repository({ ".devcontainer/devcontainer.json": "{ \"customizations\": " });
  const err6 = sink();
  assert.equal(await main(broken, down, sink(), err6), 2);
  assert.match(err6.text(), /could not read \.devcontainer\/devcontainer\.json: /);

  const err5 = sink();
  assert.equal(await main(repository({ "README.md": "" }), down, sink(), err5), 1);
  assert.match(err5.text(), /no \.devcontainer\/devcontainer\.json/);
});
