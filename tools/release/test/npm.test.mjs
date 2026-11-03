// release-verify --npm: the packages of @altnovatrail in an npm lock file, each verified as its
// release's file, with the registry and GitHub made up from the files of real releases.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lockedPackages, main, verifyLock } from "../verify.mjs";
import { fixture, gitHub, trustedRoot } from "./signed.mjs";

const ARCHIVE = "https://registry.npmjs.org/@altnovatrail/spec/-/spec-0.5.6.tgz";
const BUNDLE = "https://github.com/altnovatrail/spec/releases/download/v0.5.6/altnovatrail-spec-0.5.6.tgz.sigstore.json";
// The integrity of @altnovatrail/spec@0.5.6 in the registry, as `npm view` read it on 2026-11-01:
// the archive in npm is the file of spec's release v0.5.6, byte for byte (R37, R73).
const INTEGRITY = "sha512-w0qfxwtUp1Qf5jDe1D6cD6V2nrAfPrvlCBRHU1Mnuiyu2mxS4aNWzpLzbG0XMbwdww6I/ZgcDTioXb9G4HdKqA==";
const RELEASED = fixture("spec-v0.5.6/altnovatrail-spec-0.5.6.tgz");

const lock = (packages, lockfileVersion = 3) => JSON.stringify({ name: "a-repository", lockfileVersion, packages: { "": { name: "a-repository" }, ...packages } });
const spec = { version: "0.5.6", resolved: ARCHIVE, integrity: INTEGRITY };

// The registry and the releases, as fetch answers them: what each address holds, or its status,
// and the address that answered.
function web(answers = {}) {
  const held = { [ARCHIVE]: RELEASED.bytes, [BUNDLE]: Buffer.from(JSON.stringify(RELEASED.bundle)), ...answers };
  const asked = [];
  const fetch = async (url, options) => {
    // Each download gives up after a time of its own rather than waiting on a stalled host.
    assert.ok(options.signal instanceof AbortSignal, url);
    asked.push(url);
    const answer = held[url];
    if (answer instanceof Error) throw answer;
    const { status = 200, body = answer, url: answered = url } = Buffer.isBuffer(answer) || answer === undefined ? { status: answer ? 200 : 404 } : answer;
    return { ok: status >= 200 && status < 300, status, url: answered, arrayBuffer: async () => Buffer.from(body ?? held[url] ?? "") };
  };
  return { fetch, asked };
}

const verified = (text, answers, options = {}) => verifyLock(text, { trust: async () => trustedRoot, source: gitHub(), fetch: web(answers).fetch, ...options });

test("each package of @altnovatrail is verified as its release's file, and its integrity held to the verified bytes", async () => {
  const { fetch, asked } = web();
  const lines = await verifyLock(
    lock({
      "node_modules/@altnovatrail/spec": spec,
      // The same version under an alias, which names the package, and again in a nested folder.
      "node_modules/types": { name: "@altnovatrail/spec", ...spec },
      "node_modules/x/node_modules/@altnovatrail/spec": spec,
      "node_modules/@altnovatrail/canvas": { resolved: "../canvas", link: true },
      "node_modules/left-pad": { version: "1.3.0", resolved: "https://registry.npmjs.org/left-pad/-/left-pad-1.3.0.tgz", integrity: "sha512-x" },
      "packages/canvas": { name: "@altnovatrail/canvas", version: "0.0.0" },
    }),
    { trust: async () => trustedRoot, source: gitHub(), fetch },
  );
  assert.deepEqual(lines, [
    "node_modules/@altnovatrail/canvas: a link to a folder, no release file",
    "node_modules/@altnovatrail/spec: altnovatrail-spec-0.5.6.tgz: spec v0.5.6, signed by spec's release.yml, and its integrity is the verified bytes'",
  ]);
  assert.deepEqual(asked, [ARCHIVE, BUNDLE]);
});

test("a lock file with no package of @altnovatrail asks nothing of Sigstore or the network", async () => {
  let trusted = false;
  const { fetch, asked } = web();
  const lines = await verifyLock(lock({ "node_modules/left-pad": { version: "1.3.0" } }), {
    trust: async () => {
      trusted = true;
    },
    source: gitHub(),
    fetch,
  });
  assert.deepEqual(lines, ["no package of @altnovatrail to verify"]);
  assert.equal(trusted, false);
  assert.deepEqual(asked, []);
  assert.deepEqual(lockedPackages(lock({}, 2)), { packages: [], linked: [] });
});

test("an integrity other than the verified bytes', or none of sha512, is refused", async () => {
  const other = "sha512-" + Buffer.alloc(64).toString("base64");
  await assert.rejects(verified(lock({ "node_modules/@altnovatrail/spec": { ...spec, integrity: other } })), /node_modules\/@altnovatrail\/spec has the integrity sha512-A+==, and the verified archive's is sha512-w0qfxwt/);
  await assert.rejects(verified(lock({ "node_modules/@altnovatrail/spec": { ...spec, integrity: `${INTEGRITY} ${other}` } })), /has the integrity sha512-AAAA/);
  await assert.rejects(verified(lock({ "node_modules/@altnovatrail/spec": { ...spec, integrity: "sha1-AAAA" } })), /node_modules\/@altnovatrail\/spec has no sha512 integrity/);
  assert.deepEqual(await verified(lock({ "node_modules/@altnovatrail/spec": { ...spec, integrity: `sha1-AAAA ${INTEGRITY}?x` } })), [
    "node_modules/@altnovatrail/spec: altnovatrail-spec-0.5.6.tgz: spec v0.5.6, signed by spec's release.yml, and its integrity is the verified bytes'",
  ]);
});

test("an archive from anywhere but the registry's address for its release is refused, before anything is fetched", () => {
  const refused = (entries, reason) => assert.throws(() => lockedPackages(lock(entries)), reason, JSON.stringify(entries));
  refused({ "node_modules/@altnovatrail/spec": { ...spec, resolved: "https://registry.example.com/@altnovatrail/spec/-/spec-0.5.6.tgz" } }, /comes from "https:\/\/registry\.example\.com\/@altnovatrail\/spec\/-\/spec-0\.5\.6\.tgz", not https:\/\/registry\.npmjs\.org\/@altnovatrail\/spec\/-\/spec-0\.5\.6\.tgz/);
  refused({ "node_modules/@altnovatrail/spec": { ...spec, resolved: "git+https://github.com/altnovatrail/spec.git#v0.5.6" } }, /comes from "git\+https/);
  refused({ "node_modules/@altnovatrail/spec": { ...spec, version: "0.5.6-rc.1" } }, /@altnovatrail\/spec@0\.5\.6-rc\.1 is no release's version/);
  refused({ "node_modules/@altnovatrail/spec": { version: "0.5.6", resolved: ARCHIVE } }, /node_modules\/@altnovatrail\/spec has no integrity/);
  refused({ "node_modules/@altnovatrail/left-pad": { ...spec } }, /@altnovatrail\/left-pad is no package of a repository of altnovatrail/);
  // An alias whose archive is of @altnovatrail, under a name that is not.
  refused({ "node_modules/types": { ...spec } }, /node_modules\/types comes from https:\/\/registry\.npmjs\.org\/@altnovatrail\/spec\/-\/spec-0\.5\.6\.tgz, of @altnovatrail, as types/);
});

test("@altnovatrail/contracts is spec's: its archive is verified against the bundle of the file of its name in spec's release", async () => {
  const resolved = "https://registry.npmjs.org/@altnovatrail/contracts/-/contracts-0.5.6.tgz";
  const bundle = "https://github.com/altnovatrail/spec/releases/download/v0.5.6/altnovatrail-contracts-0.5.6.tgz.sigstore.json";
  const contracts = { version: "0.5.6", resolved, integrity: INTEGRITY };
  const one = lock({ "node_modules/@altnovatrail/contracts": contracts });
  assert.deepEqual(lockedPackages(one).packages, [
    { key: "node_modules/@altnovatrail/contracts", name: "@altnovatrail/contracts", repository: "spec", archive: "altnovatrail-contracts-0.5.6.tgz", version: "0.5.6", resolved, integrity: INTEGRITY },
  ]);
  assert.throws(() => lockedPackages(lock({ "node_modules/@altnovatrail/contracts": { ...contracts, resolved: ARCHIVE } })), /comes from "https:\/\/registry\.npmjs\.org\/@altnovatrail\/spec\/-\/spec-0\.5\.6\.tgz", not https:\/\/registry\.npmjs\.org\/@altnovatrail\/contracts\/-\/contracts-0\.5\.6\.tgz/);
  // spec's other package, signed by the same release.yml, under the contracts' name: the signature
  // holds for its bytes, and its package.json gives it away.
  const { fetch, asked } = web({ [resolved]: RELEASED.bytes, [bundle]: Buffer.from(JSON.stringify(RELEASED.bundle)) });
  await assert.rejects(verifyLock(one, { trust: async () => trustedRoot, source: gitHub(), fetch }), /the package\.json of altnovatrail-contracts-0\.5\.6\.tgz names the package "@altnovatrail\/spec", not @altnovatrail\/contracts/);
  assert.deepEqual(asked, [resolved, bundle]);
});

test("a lock file that is not npm's, of lockfileVersion 2 or 3 with its packages, is refused rather than found empty", () => {
  for (const text of [JSON.stringify({ lockfileVersion: 1, dependencies: {} }), JSON.stringify({ lockfileVersion: 3 }), JSON.stringify({ lockfileVersion: 3, packages: [] }), "null", "[]"]) {
    assert.throws(() => lockedPackages(text), /the lock file is not npm's, of lockfileVersion 2 or 3, with its packages/, text);
  }
  assert.throws(() => lockedPackages("{"), /the lock file is no JSON/);
});

test("what the network answers is held: an error, a status, plain HTTP, a bundle that is no JSON", async () => {
  const one = lock({ "node_modules/@altnovatrail/spec": spec });
  await assert.rejects(verified(one, { [BUNDLE]: undefined }), new RegExp(`${RegExp.escape(BUNDLE)} answered HTTP 404`));
  await assert.rejects(verified(one, { [ARCHIVE]: { status: 500, body: Buffer.alloc(0) } }), /spec-0\.5\.6\.tgz answered HTTP 500/);
  await assert.rejects(verified(one, { [ARCHIVE]: new Error("getaddrinfo ENOTFOUND registry.npmjs.org") }), /spec-0\.5\.6\.tgz could not be fetched: getaddrinfo ENOTFOUND/);
  await assert.rejects(verified(one, { [ARCHIVE]: { body: RELEASED.bytes, url: "http://registry.npmjs.org/@altnovatrail/spec/-/spec-0.5.6.tgz" } }), /was answered from http:\/\/registry\.npmjs\.org\/.* not over HTTPS/);
  await assert.rejects(verified(one, { [BUNDLE]: Buffer.from("{") }), /altnovatrail-spec-0\.5\.6\.tgz\.sigstore\.json is no JSON/);
  // Another release's bytes under this version's address: the bundle does not hold for them.
  await assert.rejects(verified(one, { [ARCHIVE]: fixture("spec-v0.5.6/format-0.1.tar.gz").bytes }), /the signature does not hold for the file/);
});

test("the command line takes a lock file from the caller", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-npm-"));
  try {
    const file = path.join(work, "package-lock.json");
    fs.writeFileSync(file, lock({ "node_modules/@altnovatrail/spec": spec }));
    assert.deepEqual(await main(["--npm", file], { trust: async () => trustedRoot, source: gitHub(), fetch: web().fetch }), [
      "node_modules/@altnovatrail/spec: altnovatrail-spec-0.5.6.tgz: spec v0.5.6, signed by spec's release.yml, and its integrity is the verified bytes'",
    ]);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});
