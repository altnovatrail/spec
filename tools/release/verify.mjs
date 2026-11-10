// release-verify: whether a file of a NovaTrail release is one R77 lets in — signed by whom, at
// whose call, on which branch and of which commit — where the file enters NovaTrail.
//
//   node tools/release/verify.mjs <repository> <tag> <file> [<bundle>]
//   node tools/release/verify.mjs --npm <lock file>
//
// The first checks a file of the release <tag> of <repository>, against its bundle, by default
// <file>.sigstore.json beside it. The second checks each package of @altnovatrail in an npm lock
// file: the archive from the registry, against the bundle of the release file of the same name,
// and the lock file's integrity against the bytes so checked (R37). `just release-verify` and
// `just release-verify-npm` run them, from the caller's directory.
//
// The bundle must hold for the file's bytes against Sigstore's trust root, which TUF reads afresh
// from Sigstore on every run: when it cannot be read, nothing is verified and the file is refused.
// Then the certificate's own fields, read from the certificate the bundle was verified with, are
// held to R77, and last what they name is held to GitHub, read through git with no token
// (github.mjs): the commit of the tag, and the release of .github that signed.
// - A file of any repository but spec is signed by the shared release.yml of .github, at the
//   commit S of a release of it, v* on its main and no older than MINIMUM, at the call of the
//   repository's own release.yml on main, of the commit of the tag.
// - A file of spec is signed by spec's own release.yml on main, whose certificate names the tip
//   of main as the run began rather than the commit of the tag. The file's content binds it to
//   its tag instead: the commit git archive writes into the header of format-<version>.tar.gz, of
//   admission-<version>.tar.gz, the admission table's (R96), of deployment-<version>.tar.gz, the
//   deployment configuration's (R85), of legal-<version>.tar.gz, the legal texts' (R130), and of
//   consent-age-<version>.tar.gz, the table of the age of digital consent's (R134), and of
//   export-<version>.tar.gz, the format of the export's (R135) —
//   each of which holds what its name says, as release-files writes it: a folder
//   <part>-<version>/ with LICENSE and <part>/, whose VERSION is that version —, and the version in
//   the
//   package.json of altnovatrail-spec-<version>.tgz and of altnovatrail-contracts-<version>.tgz,
//   the package of the contracts' code (R83).
//
// Prints a line for each file verified; a refusal is an error, with what was wanted and found.

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { bundleFromJSON } from "@sigstore/bundle";
import { DEFAULT_MIRROR_URL, getTrustedRoot } from "@sigstore/tuf";
import { Verifier, toSignedEntity, toTrustMaterial } from "@sigstore/verify";
import { GIT, TAR, isMain } from "../shared.mjs";
import { gitEnvironment, github } from "./github.mjs";
import { ORGANIZATION, REPOSITORIES } from "./repositories.mjs";
import { RELEASE_TAG } from "./version.mjs";

export const ISSUER = "https://token.actions.githubusercontent.com";
// The lowest release of .github whose shared release.yml signs a file that R77 lets in: from
// v0.1.6 it checks the caller's spec submodule and the sum of spec's script, and from v0.1.7
// spec's recipes run in a copy of the checkout. The minimum is its commit, not its name, and it
// must lie in the history of the commit that signed. Only an amendment to R77 raises it.
export const MINIMUM = Object.freeze({ tag: "v0.1.7", commit: "0acbf75e5c8362b649924bf1abdae973ce71085e" });

const SHARED = ".github";
const MAIN = "refs/heads/main";
const BUNDLE = "application/vnd.dev.sigstore.bundle.v0.3+json";
const SHA = /^[0-9a-f]{40}$/;
const ORGANIZATION_URI = `https://github.com/${ORGANIZATION.name}`;
// The normative parts with a version of their own, each one archive of git archive: the module
// format and the admission table (R96), by MAJOR.MINOR, and the deployment configuration (R85),
// the legal texts (R130), the table of the age of digital consent (R134) and the format of the
// export (R135), by an integer.
const PART_FILE = /^(?:(?:format|admission)-(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)|(?:deployment|legal|consent-age|export)-[1-9]\d*)\.tar\.gz$/;
// The npm packages of spec's release, by the name of their archive: the types of the format, and
// the code of the contracts.
const NPM_FILE = /^altnovatrail-(spec|contracts)-((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*))\.tgz$/;
const SCOPE = "@altnovatrail/";
// A package of @altnovatrail that is not named for the repository whose release carries it: the
// code of the contracts comes out in spec's (R83). Every other package is its repository's.
export const RELEASED_BY = Object.freeze({ "@altnovatrail/contracts": "spec" });
const REGISTRY = "https://registry.npmjs.org/";

// The fields of a Fulcio certificate that R77 holds a signature to, by Fulcio's names and OIDs.
// Not held: Build Trigger (…1.20), since a release runs by workflow_run and by workflow_dispatch
// alike, Run Invocation URI (…1.21) and Source Repository Visibility At Signing (…1.22), which
// say nothing about trust, and the deprecated …1.1 to …1.6.
const FULCIO = "1.3.6.1.4.1.57264.1.";
export const FIELDS = Object.freeze({
  issuer: { name: "Issuer", oid: `${FULCIO}8` },
  buildSignerURI: { name: "Build Signer URI", oid: `${FULCIO}9` },
  buildSignerDigest: { name: "Build Signer Digest", oid: `${FULCIO}10` },
  runnerEnvironment: { name: "Runner Environment", oid: `${FULCIO}11` },
  sourceRepositoryURI: { name: "Source Repository URI", oid: `${FULCIO}12` },
  sourceRepositoryDigest: { name: "Source Repository Digest", oid: `${FULCIO}13` },
  sourceRepositoryRef: { name: "Source Repository Ref", oid: `${FULCIO}14` },
  sourceRepositoryIdentifier: { name: "Source Repository Identifier", oid: `${FULCIO}15` },
  sourceRepositoryOwnerURI: { name: "Source Repository Owner URI", oid: `${FULCIO}16` },
  sourceRepositoryOwnerIdentifier: { name: "Source Repository Owner Identifier", oid: `${FULCIO}17` },
  buildConfigURI: { name: "Build Config URI", oid: `${FULCIO}18` },
  buildConfigDigest: { name: "Build Config Digest", oid: `${FULCIO}19` },
});

// Sigstore's trust root, read by TUF from Sigstore's mirror into a cache made for this run alone,
// from the root that comes with @sigstore/tuf: the keys of Fulcio, of the transparency logs and
// of the timestamp authority. Neither an old cache nor a copy kept here stands in for it.
export async function sigstoreRoot(options = {}) {
  const cachePath = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-tuf-"));
  try {
    return await getTrustedRoot({ ...options, cachePath });
  } catch (error) {
    throw new Error(`Sigstore's trust root could not be read by TUF from ${options.mirrorURL ?? DEFAULT_MIRROR_URL}, and without it nothing is verified: ${error.message}`);
  } finally {
    fs.rmSync(cachePath, { recursive: true, force: true });
  }
}

// The identity of the bundle's signature, once the bundle holds for the bytes against the trust
// root. A bundle v0.3 with one Fulcio certificate, as cosign writes it, and at least one RFC 3161
// timestamp: the verifier would count the time of the transparency log's entry as a timestamp
// too, and R77 names the timestamp apart. The verifier checks the certificate's chain to Fulcio
// and its SCT, the entry in the transparency log with its proof, each timestamp, and the
// signature of the bytes, by Sigstore's defaults: at least one of each.
export function verifySignature(bytes, bundleJSON, trustedRoot) {
  let bundle;
  try {
    bundle = bundleFromJSON(bundleJSON);
  } catch (error) {
    throw new Error(`the bundle is no Sigstore bundle: ${error.message}`);
  }
  if (bundle.mediaType !== BUNDLE) throw new Error(`the bundle is ${bundle.mediaType}, not ${BUNDLE}`);
  if (bundle.content.$case !== "messageSignature") throw new Error(`the bundle holds a ${bundle.content.$case}, not the signature of a file`);
  const material = bundle.verificationMaterial;
  if (material.content.$case !== "certificate") throw new Error(`the bundle holds a ${material.content.$case}, not one Fulcio certificate`);
  if (!material.timestampVerificationData?.rfc3161Timestamps?.length) throw new Error("the bundle holds no RFC 3161 timestamp");
  try {
    return new Verifier(toTrustMaterial(trustedRoot)).verify(toSignedEntity(bundle, bytes)).identity;
  } catch (error) {
    throw new Error(`the signature does not hold for the file: ${error.message}`);
  }
}

// The SAN and the fields R77 reads, from a verified identity: each field there once, its value a
// DER UTF8String, as Fulcio writes the fields from …1.8 on.
export function readIdentity(identity) {
  const san = identity?.subjectAlternativeName;
  if (typeof san !== "string") throw new Error("the certificate names no SAN");
  const fields = { san };
  for (const [key, { name, oid }] of Object.entries(FIELDS)) {
    const values = (identity.oids ?? []).filter((entry) => entry.oid?.id?.join(".") === oid);
    if (values.length !== 1) throw new Error(values.length ? `the certificate has ${name} (${oid}) ${values.length} times` : `the certificate has no ${name} (${oid})`);
    fields[key] = utf8String(values[0].value, `${name} (${oid})`);
  }
  return fields;
}

function utf8String(der, field) {
  const bad = new Error(`${field} is no DER UTF8String`);
  if (!der || der.length < 2 || der[0] !== 0x0c) throw bad;
  let length = der[1];
  let start = 2;
  if (length & 0x80) {
    const count = length & 0x7f;
    if (count < 1 || count > 2 || der.length < 2 + count) throw bad;
    length = 0;
    for (let i = 0; i < count; i++) length = length * 256 + der[2 + i];
    start = 2 + count;
  }
  if (start + length !== der.length) throw bad;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(der.subarray(start));
  } catch {
    throw bad;
  }
}

// The address of a repository's release.yml at a ref or commit, as the certificate names it.
const workflow = (repository, at) => `${ORGANIZATION_URI}/${repository}/.github/workflows/release.yml@${at}`;

function compare(fields, wanted) {
  for (const [key, value] of Object.entries(wanted)) {
    if (fields[key] !== value) {
      const field = key === "san" ? "the SAN" : `${FIELDS[key].name} (${FIELDS[key].oid})`;
      throw new Error(`${field} is ${JSON.stringify(fields[key])}, not ${JSON.stringify(value)}`);
    }
  }
}

// The repository and tag a file is checked as: a repository of the table, and a release's tag.
export function checkRelease(repository, tag) {
  if (!Object.hasOwn(REPOSITORIES, repository)) throw new Error(`'${repository}' is no repository of ${ORGANIZATION.name} with an ID in tools/release/repositories.mjs`);
  if (!RELEASE_TAG.test(tag)) throw new Error(`'${tag}' is no release tag, vMAJOR.MINOR.PATCH`);
}

// The fields a certificate must have, whatever GitHub says: who called, on which branch, where.
// For a file of spec, also who signed. For any other, who signed is the shared release.yml at a
// commit S, which the result names for GitHub to be asked about.
export function checkFields(fields, repository) {
  compare(fields, { issuer: ISSUER });
  const caller = {
    sourceRepositoryURI: `${ORGANIZATION_URI}/${repository}`,
    sourceRepositoryOwnerURI: ORGANIZATION_URI,
    sourceRepositoryIdentifier: REPOSITORIES[repository],
    sourceRepositoryOwnerIdentifier: ORGANIZATION.id,
    buildConfigURI: workflow(repository, MAIN),
    sourceRepositoryRef: MAIN,
    runnerEnvironment: "github-hosted",
  };
  if (repository === "spec") {
    compare(fields, { san: workflow("spec", MAIN), buildSignerURI: workflow("spec", MAIN), ...caller });
    return undefined;
  }
  const shared = workflow(SHARED, "");
  const signer = fields.san.startsWith(shared) ? fields.san.slice(shared.length) : "";
  if (!SHA.test(signer)) throw new Error(`the SAN is ${JSON.stringify(fields.san)}, not the shared release.yml of ${SHARED} at the SHA of a commit, ${shared}<SHA>`);
  compare(fields, { buildSignerURI: fields.san, buildSignerDigest: signer, ...caller });
  return signer;
}

// What the fields name, held to GitHub: the commit of the tag, and the release of .github that
// signed. Returns the names of that release's tags.
export function checkGitHub(fields, { repository, tag, signer }, { source, minimum = MINIMUM }) {
  const commit = source.tagCommit(repository, tag);
  if (!commit) throw new Error(`${repository} has no tag ${tag}`);
  for (const key of ["sourceRepositoryDigest", "buildConfigDigest"]) {
    if (fields[key] !== commit) throw new Error(`${FIELDS[key].name} (${FIELDS[key].oid}) is ${fields[key]}, and ${repository} ${tag} is ${commit}`);
  }
  const releases = source.releaseTags(SHARED).get(signer);
  if (!releases) throw new Error(`${signer}, which signed, is the commit of no release of ${SHARED}`);
  const named = `${SHARED} ${releases.join(", ")}`;
  if (!source.onMain(SHARED, signer)) throw new Error(`${named}, ${signer}, is not on the history of its main`);
  if (!source.isAncestor(SHARED, minimum.commit, signer)) throw new Error(`${named}, ${signer}, is older than ${minimum.tag}: ${minimum.commit} is not in its history`);
  return named;
}

// A file of spec, bound to its tag by what it holds (R77). A new kind of file names its binding
// in the task that brings it in, and until then it is refused.
export function checkSpecContent(name, bytes, tag, source) {
  if (PART_FILE.test(name)) {
    const archived = tarCommit(name, bytes);
    const commit = source.tagCommit("spec", tag);
    if (!commit) throw new Error(`spec has no tag ${tag}`);
    if (archived !== commit) throw new Error(`${name} is git archive's of ${archived}, and spec ${tag} is ${commit}`);
    checkPartArchive(name, bytes);
    return;
  }
  const npm = NPM_FILE.exec(name);
  if (npm) {
    // The name and the tag must agree, and the tag must be spec's: a signed archive whose release
    // never came out, its run stopped after signing, names a version no tag has.
    if (npm[2] !== tag.slice(1)) throw new Error(`${name} is no file of spec ${tag}, whose npm package is altnovatrail-${npm[1]}-${tag.slice(1)}.tgz`);
    // The package is the one its name says: the types of the format are no code of the contracts.
    const manifest = packageManifest(name, bytes);
    if (manifest.name !== `${SCOPE}${npm[1]}`) throw new Error(`the package.json of ${name} names the package ${JSON.stringify(manifest.name)}, not ${SCOPE}${npm[1]}`);
    if (manifest.version !== tag.slice(1)) throw new Error(`the package.json of ${name} has the version ${JSON.stringify(manifest.version)}, not ${tag.slice(1)}`);
    if (!source.tagCommit("spec", tag)) throw new Error(`spec has no tag ${tag}`);
    return;
  }
  throw new Error(`${name} is no file of spec's release that R77 binds to its tag: format-<version>.tar.gz, admission-<version>.tar.gz, deployment-<version>.tar.gz, legal-<version>.tar.gz, consent-age-<version>.tar.gz, export-<version>.tar.gz, altnovatrail-spec-<version>.tgz or altnovatrail-contracts-<version>.tgz`);
}

// A part's archive holds what its name says, as release-files writes it (tools/release/files.mjs
// and the justfile): one folder named as the file, <part>-<version>/, with LICENSE and the part's
// folder in it and nothing else, whose VERSION is the version the name gives. The format's archive
// of v0.5.6 by the admission table's name holds format-0.1/, and is refused.
export function checkPartArchive(name, bytes) {
  // A part's name is words of letters joined by hyphens, consent-age among them; its version starts
  // with a digit.
  const [, part, version] = /^([a-z]+(?:-[a-z]+)*)-([0-9].*)\.tar\.gz$/.exec(name);
  const folder = `${part}-${version}`;
  const listed = spawnSync(TAR, ["--quoting-style=literal", "-tzf", "-"], { input: bytes, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (listed.status !== 0) throw new Error(`${name} cannot be listed by tar: ${(listed.stderr || listed.error?.message || "").trim()}`);
  const entries = listed.stdout.split("\n").filter(Boolean);
  const outside = entries.find((entry) => !(entry === `${folder}/` || entry === `${folder}/LICENSE` || entry === `${folder}/${part}/` || entry.startsWith(`${folder}/${part}/`)));
  if (outside !== undefined) throw new Error(`${name} holds ${outside}, and the archive of ${part}/ that its name says holds ${folder}/LICENSE and ${folder}/${part}/ alone`);
  for (const wanted of [`${folder}/LICENSE`, `${folder}/${part}/VERSION`]) {
    if (!entries.includes(wanted)) throw new Error(`${name} holds no ${wanted}`);
  }
  const read = spawnSync(TAR, ["-xzOf", "-", `${folder}/${part}/VERSION`], { input: bytes, encoding: "utf8" });
  if (read.stdout !== `${version}\n`) throw new Error(`${name} holds ${folder}/${part}/VERSION ${JSON.stringify(read.stdout)}, and its name says ${version}`);
}

// The commit git archive writes into the archive's header, as git get-tar-commit-id reads it.
function tarCommit(name, bytes) {
  let tar;
  try {
    tar = zlib.gunzipSync(bytes);
  } catch (error) {
    throw new Error(`${name} is no gzip archive: ${error.message}`);
  }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-tar-"));
  let read;
  try {
    read = spawnSync(GIT, ["get-tar-commit-id"], { cwd: work, env: gitEnvironment(work), input: tar, encoding: "utf8" });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  const commit = read.stdout?.trim();
  if (read.status !== 0 || !SHA.test(commit)) throw new Error(`${name} names no commit in its header, as git archive writes it`);
  return commit;
}

// The package.json of an npm archive, read by tar to standard output alone.
function packageManifest(name, bytes) {
  const read = spawnSync(TAR, ["-xzOf", "-", "package/package.json"], { input: bytes, encoding: "utf8" });
  try {
    if (read.status !== 0) throw new Error((read.stderr || read.error?.message || "").trim());
    const manifest = JSON.parse(read.stdout);
    if (typeof manifest !== "object" || manifest === null) throw new Error("it holds no object");
    return manifest;
  } catch (error) {
    throw new Error(`the package.json of ${name} cannot be read: ${error.message}`);
  }
}

// A file of the release tag of repository, checked whole. Returns the line that says so.
export function verifyFile({ repository, tag, name, bytes, bundle }, { trustedRoot, source, minimum = MINIMUM }) {
  checkRelease(repository, tag);
  const fields = readIdentity(verifySignature(bytes, bundle, trustedRoot));
  const signer = checkFields(fields, repository);
  if (repository === "spec") {
    checkSpecContent(name, bytes, tag, source);
    return `${name}: spec ${tag}, signed by spec's release.yml`;
  }
  const release = checkGitHub(fields, { repository, tag, signer }, { source, minimum });
  return `${name}: ${repository} ${tag}, signed by the shared release.yml of ${release}`;
}

// The packages of @altnovatrail in an npm lock file, of lockfileVersion 2 or 3: under their own
// names, or under an alias, whose entry names the package. A link to a folder of the repository
// holds no release file and is only named. Each package must be a release of a repository of the
// table — its own, or the one RELEASED_BY names —, from the registry's address for it, with its
// integrity.
export function lockedPackages(text) {
  let lock;
  try {
    lock = JSON.parse(text);
  } catch (error) {
    throw new Error(`the lock file is no JSON: ${error.message}`);
  }
  const packages = lock?.packages;
  if (![2, 3].includes(lock?.lockfileVersion) || typeof packages !== "object" || packages === null || Array.isArray(packages)) {
    throw new Error("the lock file is not npm's, of lockfileVersion 2 or 3, with its packages");
  }
  const found = new Map();
  const linked = [];
  for (const [key, entry] of Object.entries(packages)) {
    const at = key.lastIndexOf("node_modules/");
    if (at < 0 || typeof entry !== "object" || entry === null) continue;
    const installed = key.slice(at + "node_modules/".length);
    const name = typeof entry.name === "string" ? entry.name : installed;
    const resolved = String(entry.resolved ?? "");
    if (![name, installed].some((given) => given.startsWith(SCOPE)) && !resolved.includes(`/${SCOPE}`)) continue;
    if (entry.link === true) {
      linked.push(key);
      continue;
    }
    if (!name.startsWith(SCOPE)) throw new Error(`${key} comes from ${resolved}, of ${SCOPE.slice(0, -1)}, as ${name}`);
    const short = name.slice(SCOPE.length);
    const repository = Object.hasOwn(RELEASED_BY, name) ? RELEASED_BY[name] : short;
    if (!Object.hasOwn(REPOSITORIES, repository)) throw new Error(`${key}: ${name} is no package of a repository of ${ORGANIZATION.name}`);
    const version = String(entry.version ?? "");
    if (!RELEASE_TAG.test(`v${version}`)) throw new Error(`${key}: ${name}@${version} is no release's version, MAJOR.MINOR.PATCH`);
    const wanted = `${REGISTRY}${name}/-/${short}-${version}.tgz`;
    if (resolved !== wanted) throw new Error(`${key} comes from ${JSON.stringify(resolved)}, not ${wanted}`);
    if (typeof entry.integrity !== "string") throw new Error(`${key} has no integrity`);
    const id = `${name}@${version} ${entry.integrity}`;
    if (!found.has(id)) found.set(id, { key, name, repository, archive: `altnovatrail-${short}-${version}.tgz`, version, resolved, integrity: entry.integrity });
  }
  return { packages: [...found.values()], linked };
}

// The lock file's sha512 integrity, each of them if there are several, against the bytes.
function checkIntegrity({ key, integrity }, bytes) {
  const wanted = integrity.split(/\s+/).filter((hash) => hash.startsWith("sha512-")).map((hash) => hash.split("?")[0]);
  if (!wanted.length) throw new Error(`${key} has no sha512 integrity`);
  const actual = `sha512-${crypto.createHash("sha512").update(bytes).digest("base64")}`;
  for (const hash of wanted) if (hash !== actual) throw new Error(`${key} has the integrity ${hash}, and the verified archive's is ${actual}`);
}

// A registry or a host that takes the connection and then stalls is a refusal, not a CI job that
// hangs until its own timeout.
const DOWNLOAD_TIMEOUT = 120_000;

async function download(fetch, url) {
  let response;
  try {
    response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
  } catch (error) {
    throw new Error(`${url} could not be fetched: ${error.message}`);
  }
  const answered = response.url || url;
  if (new URL(answered).protocol !== "https:") throw new Error(`${url} was answered from ${answered}, not over HTTPS`);
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// Each package of @altnovatrail in the lock file: its archive from the registry, verified as the
// release file of the same name, and the lock file's integrity held to the verified bytes. Then
// the integrity holds the version wherever npm installs it.
export async function verifyLock(text, { trust, source, fetch = globalThis.fetch, minimum = MINIMUM }) {
  const { packages, linked } = lockedPackages(text);
  const lines = linked.map((key) => `${key}: a link to a folder, no release file`);
  if (!packages.length) return [...lines, `no package of ${SCOPE.slice(0, -1)} to verify`];
  const trustedRoot = await trust();
  for (const locked of packages) {
    const name = locked.archive;
    const tag = `v${locked.version}`;
    const bytes = await download(fetch, locked.resolved);
    const bundleURL = `${ORGANIZATION_URI}/${locked.repository}/releases/download/${tag}/${name}.sigstore.json`;
    const bundle = parseJSON((await download(fetch, bundleURL)).toString("utf8"), bundleURL);
    const verified = verifyFile({ repository: locked.repository, tag, name, bytes, bundle }, { trustedRoot, source, minimum });
    checkIntegrity(locked, bytes);
    lines.push(`${locked.key}: ${verified}, and its integrity is the verified bytes'`);
  }
  return lines;
}

function parseJSON(text, file) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is no JSON: ${error.message}`);
  }
}

function read(file) {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    throw new Error(`${file} cannot be read: ${error.code ?? error.message}`);
  }
}

const USAGE = "usage: release-verify <repository> <tag> <file> [<bundle>] | release-verify --npm <lock file>";

// The command line, as the recipes pass it. Arguments and files are checked before anything goes
// to the network. Tests give the trust root, the GitHub and the fetch.
export async function main(args, { trust = sigstoreRoot, source, fetch = globalThis.fetch, minimum = MINIMUM } = {}) {
  const npm = args[0] === "--npm";
  if (npm ? args.length !== 2 : args.length < 3 || args.length > 4) throw Object.assign(new Error(USAGE), { usage: true });
  let run;
  if (npm) {
    const text = read(args[1]).toString("utf8");
    run = (github) => verifyLock(text, { trust, source: github, fetch, minimum });
  } else {
    const [repository, tag, file, bundleFile = `${file}.sigstore.json`] = args;
    checkRelease(repository, tag);
    const bytes = read(file);
    const bundle = parseJSON(read(bundleFile).toString("utf8"), bundleFile);
    run = async (github) => [verifyFile({ repository, tag, name: path.basename(file), bytes, bundle }, { trustedRoot: await trust(), source: github, minimum })];
  }
  const reader = source ?? github();
  try {
    return await run(reader);
  } finally {
    if (!source) reader.close();
  }
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (lines) => {
      for (const line of lines) console.log(line);
    },
    (error) => {
      console.error(error.usage ? error.message : `release-verify: ${error.message}`);
      process.exitCode = error.usage ? 2 : 1;
    },
  );
}
