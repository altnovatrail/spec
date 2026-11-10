// release-verify on files of real releases, with no network: what R77 lets in, and each way a
// file is refused — by its signature, its certificate's fields, GitHub, or what it holds.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";
import { FIELDS, ISSUER, MINIMUM, checkFields, checkPartArchive, checkRelease, checkSpecContent, main, readIdentity, sigstoreRoot, verifyFile, verifySignature } from "../verify.mjs";
import { COMMITS, fixture, fixtures, gitHub, trustedRoot } from "./signed.mjs";
import { TAR } from "../../shared.mjs";
import { justfile, recipe, root, scratchRepository } from "./repository.mjs";

const SHARED = "https://github.com/altnovatrail/.github/.github/workflows/release.yml@";
const V014 = COMMITS[".github"]["v0.1.4"];
const AT_V014 = { tag: "v0.1.4", commit: V014 };
const license = () => ({ repository: "module-kit", tag: "v0.1.0", ...fixture("module-kit-v0.1.0/LICENSE") });
const specFile = (file, tag = "v0.5.6") => ({ repository: "spec", tag, ...fixture(`spec-v0.5.6/${file}`) });
const checked = (file, options = {}) => verifyFile(file, { trustedRoot, source: gitHub(), ...options });

test("the files of spec v0.5.6 are let in, each bound to its tag by what it holds", () => {
  for (const file of ["format-0.1.tar.gz", "altnovatrail-spec-0.5.6.tgz"]) {
    assert.equal(checked(specFile(file)), `${file}: spec v0.5.6, signed by spec's release.yml`);
  }
});

test("the npm package of the contracts' code of spec v0.7.0 is let in, and held to its tag", () => {
  const contracts = { repository: "spec", tag: "v0.7.0", ...fixture("spec-v0.7.0/altnovatrail-contracts-0.7.0.tgz") };
  assert.equal(checked(contracts), "altnovatrail-contracts-0.7.0.tgz: spec v0.7.0, signed by spec's release.yml");
  assert.throws(() => checked({ ...contracts, tag: "v0.5.6" }), /altnovatrail-contracts-0\.7\.0\.tgz is no file of spec v0\.5\.6, whose npm package is altnovatrail-contracts-0\.5\.6\.tgz/);
});

test("tutor v0.1.0, signed by .github v0.1.11, is let in at the minimum R77 sets, refused by one above its signer, and held to its repository and tag", () => {
  const sums = { repository: "tutor", tag: "v0.1.0", ...fixture("tutor-v0.1.0/SHA256SUMS") };
  assert.equal(checked(sums), "SHA256SUMS: tutor v0.1.0, signed by the shared release.yml of .github v0.1.11");
  const V0111 = COMMITS[".github"]["v0.1.11"];
  assert.throws(() => checked(sums, { minimum: { tag: "v0.1.12", commit: COMMITS[".github"]["v0.1.12"] } }), new RegExp(`\\.github v0\\.1\\.11, ${V0111}, is older than v0\\.1\\.12`));
  // The same file is still held to its repository and its tag.
  assert.throws(() => checked({ ...sums, repository: "module-kit" }), /Source Repository URI \(1\.3\.6\.1\.4\.1\.57264\.1\.12\) is "https:\/\/github\.com\/altnovatrail\/tutor", not "https:\/\/github\.com\/altnovatrail\/module-kit"/);
  const moved = gitHub({ tags: { ...COMMITS, tutor: { "v0.1.0": COMMITS["module-kit"]["v0.1.0"] } } });
  assert.throws(() => checked(sums, { source: moved }), /Source Repository Digest \(1\.3\.6\.1\.4\.1\.57264\.1\.13\) is e4ed077\w+, and tutor v0\.1\.0 is 7e0144a/);
});

test("module-kit v0.1.0, signed by .github v0.1.4, is refused below the minimum, and let in by a minimum the test sets at v0.1.4", () => {
  assert.deepEqual(MINIMUM, { tag: "v0.1.7", commit: COMMITS[".github"]["v0.1.7"] });
  assert.throws(() => checked(license()), new RegExp(`\\.github v0\\.1\\.4, ${V014}, is older than v0\\.1\\.7: ${MINIMUM.commit} is not in its history`));
  assert.equal(checked(license(), { minimum: AT_V014 }), "LICENSE: module-kit v0.1.0, signed by the shared release.yml of .github v0.1.4");
  // A minimum older than the signer lets it in too; one newer does not.
  assert.match(checked(license(), { minimum: { tag: "v0.1.3", commit: COMMITS[".github"]["v0.1.3"] } }), /signed by the shared release\.yml of \.github v0\.1\.4$/);
  assert.throws(() => checked(license(), { minimum: { tag: "v0.1.11", commit: COMMITS[".github"]["v0.1.11"] } }), /is older than v0\.1\.11/);
});

test("a file checked as another repository's, or as signed by another workflow, is refused", () => {
  assert.throws(() => checked({ ...specFile("altnovatrail-spec-0.5.6.tgz"), repository: "module-kit" }), /the SAN is "https:\/\/github\.com\/altnovatrail\/spec\/\.github\/workflows\/release\.yml@refs\/heads\/main", not the shared release\.yml of \.github at the SHA of a commit/);
  assert.throws(() => checked({ ...license(), repository: "spec" }, { minimum: AT_V014 }), new RegExp(`the SAN is "${RegExp.escape(SHARED)}${V014}", not "https://github\\.com/altnovatrail/spec/`));
  assert.throws(() => checked({ ...license(), repository: "canvas" }, { minimum: AT_V014 }), /Source Repository URI \(1\.3\.6\.1\.4\.1\.57264\.1\.12\) is "https:\/\/github\.com\/altnovatrail\/module-kit", not "https:\/\/github\.com\/altnovatrail\/canvas"/);
});

test("a tag on another commit than the one signed, or no tag at all, is refused", () => {
  const moved = gitHub({ tags: { ...COMMITS, "module-kit": { "v0.1.0": COMMITS.spec["v0.5.6"] } } });
  assert.throws(() => checked(license(), { source: moved, minimum: AT_V014 }), /Source Repository Digest \(1\.3\.6\.1\.4\.1\.57264\.1\.13\) is 7e0144a\w+, and module-kit v0\.1\.0 is e6069ae/);
  assert.throws(() => checked({ ...license(), tag: "v0.1.1" }, { minimum: AT_V014 }), /module-kit has no tag v0\.1\.1/);
  assert.throws(() => checked(specFile("format-0.1.tar.gz", "v0.5.9")), /spec has no tag v0\.5\.9/);
});

test("a commit of .github that is no release of it, or not on its main, signs nothing that is let in", () => {
  const { "v0.1.4": _, ...others } = COMMITS[".github"];
  assert.throws(() => checked(license(), { source: gitHub({ tags: { ...COMMITS, ".github": others } }), minimum: AT_V014 }), new RegExp(`${V014}, which signed, is the commit of no release of \\.github`));
  assert.throws(() => checked(license(), { source: gitHub({ main: Object.values(others) }), minimum: AT_V014 }), /\.github v0\.1\.4, 11435db\w+, is not on the history of its main/);
});

test("the bytes, the bundle and the bundle's form are held", () => {
  const flipped = license();
  flipped.bytes = Buffer.from(flipped.bytes);
  flipped.bytes[0] ^= 1;
  assert.throws(() => checked(flipped, { minimum: AT_V014 }), /the signature does not hold for the file/);
  assert.throws(() => checked({ ...license(), bundle: specFile("format-0.1.tar.gz").bundle }), /the signature does not hold for the file/);
  const form = (change) => {
    const file = license();
    change(file.bundle);
    return () => checked(file, { minimum: AT_V014 });
  };
  for (const mediaType of ["application/vnd.dev.sigstore.bundle+json;version=0.2", "application/vnd.dev.sigstore.bundle.v0.4+json"]) {
    assert.throws(form((bundle) => (bundle.mediaType = mediaType)), new RegExp(`the bundle is ${RegExp.escape(mediaType)}, not application/vnd\\.dev\\.sigstore\\.bundle\\.v0\\.3\\+json`));
  }
  assert.throws(form((bundle) => {
    delete bundle.verificationMaterial.certificate;
    bundle.verificationMaterial.publicKey = { hint: "a key" };
  }), /the bundle holds a publicKey, not one Fulcio certificate/);
  assert.throws(form((bundle) => delete bundle.verificationMaterial.timestampVerificationData), /the bundle holds no RFC 3161 timestamp/);
  assert.throws(form((bundle) => (bundle.verificationMaterial.timestampVerificationData.rfc3161Timestamps = [])), /no RFC 3161 timestamp/);
  assert.throws(form((bundle) => {
    delete bundle.messageSignature;
    bundle.dsseEnvelope = { payload: "e30=", payloadType: "application/vnd.in-toto+json", signatures: [{ sig: "AA==", keyid: "" }] };
  }), /the bundle holds a dsseEnvelope, not the signature of a file/);
  assert.throws(() => checked({ ...license(), bundle: {} }), /the bundle is no Sigstore bundle/);
});

test("spec's files are bound to their tag by what they hold, and no other file of spec is let in", () => {
  assert.throws(() => checked(specFile("format-0.1.tar.gz", "v0.5.5")), /format-0\.1\.tar\.gz is git archive's of e6069ae\w+, and spec v0\.5\.5 is c143fa0/);
  // Renamed to the other tag's name, the archive still holds its own version.
  assert.throws(() => checked({ ...specFile("altnovatrail-spec-0.5.6.tgz", "v0.5.5"), name: "altnovatrail-spec-0.5.5.tgz" }), /the package\.json of altnovatrail-spec-0\.5\.5\.tgz has the version "0\.5\.6", not 0\.5\.5/);
  assert.throws(() => checked({ ...specFile("format-0.1.tar.gz"), name: "format.tar.gz" }), /format\.tar\.gz is no file of spec's release that R77 binds to its tag/);
  // The npm package's name and its tag agree, and the tag is spec's.
  assert.throws(() => checked({ ...specFile("altnovatrail-spec-0.5.6.tgz"), name: "altnovatrail-spec-0.4.0.tgz" }), /altnovatrail-spec-0\.4\.0\.tgz is no file of spec v0\.5\.6, whose npm package is altnovatrail-spec-0\.5\.6\.tgz/);
  const untagged = gitHub({ tags: { ...COMMITS, spec: {} } });
  assert.throws(() => checked(specFile("altnovatrail-spec-0.5.6.tgz"), { source: untagged }), /spec has no tag v0\.5\.6/);
  const source = gitHub();
  const tgz = specFile("altnovatrail-spec-0.5.6.tgz").bytes;
  assert.throws(() => checkSpecContent("format-0.1.tar.gz", Buffer.from("no gzip"), "v0.5.6", source), /format-0\.1\.tar\.gz is no gzip archive/);
  // npm pack writes no commit into the header: the archive is gzip, and tar, but no git archive.
  assert.throws(() => checkSpecContent("format-0.1.tar.gz", tgz, "v0.5.6", source), /names no commit in its header/);
  assert.throws(() => checkSpecContent("altnovatrail-spec-0.5.6.tgz", specFile("format-0.1.tar.gz").bytes, "v0.5.6", source), /the package\.json of altnovatrail-spec-0\.5\.6\.tgz cannot be read/);
  assert.throws(() => checkSpecContent("altnovatrail-spec-0.5.6.tgz", zlib.gzipSync(Buffer.alloc(1024)), "v0.5.6", source), /cannot be read/);
});

// An npm archive of the package and version given, as npm packs one: its package.json under package/.
function npmArchive(manifest) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-npm-archive-"));
  try {
    fs.mkdirSync(path.join(dir, "package"));
    fs.writeFileSync(path.join(dir, "package", "package.json"), JSON.stringify(manifest));
    const packed = spawnSync(TAR, ["-czf", path.join(dir, "a.tgz"), "-C", dir, "package"], { encoding: "utf8" });
    assert.equal(packed.status, 0, packed.stderr);
    return fs.readFileSync(path.join(dir, "a.tgz"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the archive of the contracts' code is bound to its tag as spec's other package, and each names its own package", () => {
  const source = gitHub();
  const contracts = npmArchive({ name: "@altnovatrail/contracts", version: "0.5.6" });
  checkSpecContent("altnovatrail-contracts-0.5.6.tgz", contracts, "v0.5.6", source);
  assert.throws(() => checkSpecContent("altnovatrail-contracts-0.4.0.tgz", contracts, "v0.5.6", source), /altnovatrail-contracts-0\.4\.0\.tgz is no file of spec v0\.5\.6, whose npm package is altnovatrail-contracts-0\.5\.6\.tgz/);
  assert.throws(() => checkSpecContent("altnovatrail-contracts-0.5.6.tgz", npmArchive({ name: "@altnovatrail/contracts", version: "0.5.5" }), "v0.5.6", source), /has the version "0\.5\.5", not 0\.5\.6/);
  // The types of the format are no code of the contracts, nor the other way round.
  assert.throws(() => checkSpecContent("altnovatrail-contracts-0.5.6.tgz", fixture("spec-v0.5.6/altnovatrail-spec-0.5.6.tgz").bytes, "v0.5.6", source), /the package\.json of altnovatrail-contracts-0\.5\.6\.tgz names the package "@altnovatrail\/spec", not @altnovatrail\/contracts/);
  assert.throws(() => checkSpecContent("altnovatrail-spec-0.5.6.tgz", contracts, "v0.5.6", source), /names the package "@altnovatrail\/contracts", not @altnovatrail\/spec/);
  assert.throws(() => checkSpecContent("altnovatrail-contracts-0.5.6.tgz", npmArchive([]), "v0.5.6", source), /names the package undefined/);
  assert.throws(() => checkSpecContent("altnovatrail-contracts-0.5.6.tgz", npmArchive(null), "v0.5.6", source), /cannot be read: it holds no object/);
  assert.throws(() => checkSpecContent("altnovatrail-contracts-0.5.6.tgz", contracts, "v0.5.6", gitHub({ tags: { ...COMMITS, spec: {} } })), /spec has no tag v0\.5\.6/);
  assert.throws(() => checkSpecContent("altnovatrail-other-0.5.6.tgz", contracts, "v0.5.6", source), /is no file of spec's release that R77 binds to its tag: format-<version>\.tar\.gz, admission-<version>\.tar\.gz, deployment-<version>\.tar\.gz, legal-<version>\.tar\.gz, altnovatrail-spec-<version>\.tgz or altnovatrail-contracts-<version>\.tgz/);
});

// A part's archive as release-files writes it, of a made-up spec whose commit v0.13.0 names:
// git archive of LICENSE and the part's folder, under <name without .tar.gz>/. files are the
// part's, by their paths from the root, and prefix the folder, when it is another.
function partArchive(name, files, prefix = name.slice(0, -".tar.gz".length)) {
  const { dir, git } = scratchRepository("release-verify-part-");
  try {
    fs.writeFileSync(path.join(dir, "LICENSE"), "Apache License\n");
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
    git("add", "--all");
    git("commit", "--quiet", "-m", "a release");
    const commit = git("rev-parse", "HEAD");
    const archive = path.join(dir, "archive.tar.gz");
    git("archive", "--format=tar.gz", `--prefix=${prefix}/`, "-o", archive, "HEAD", ...Object.keys(files).map((file) => file.split("/")[0]).filter((top, index, all) => all.indexOf(top) === index), "LICENSE");
    return { bytes: fs.readFileSync(archive), source: gitHub({ tags: { ...COMMITS, spec: { ...COMMITS.spec, "v0.13.0": commit } } }) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the archive of each part is bound to its tag as the format's is, by the commit in its header, and holds what its name says", () => {
  // Each part as release-files writes it: the admission table by MAJOR.MINOR, the deployment
  // configuration and the legal texts by an integer.
  for (const [name, part, version] of [
    ["admission-0.1.tar.gz", "admission", "0.1"],
    ["deployment-1.tar.gz", "deployment", "1"],
    ["deployment-12.tar.gz", "deployment", "12"],
    ["legal-1.tar.gz", "legal", "1"],
    ["legal-23.tar.gz", "legal", "23"],
  ]) {
    const { bytes, source } = partArchive(name, { [`${part}/VERSION`]: `${version}\n`, [`${part}/schemas/a.schema.json`]: "{}\n" });
    checkSpecContent(name, bytes, "v0.13.0", source);
    assert.throws(() => checkSpecContent(name, bytes, "v0.5.6", source), new RegExp(`${name.replaceAll(".", "\\.")} is git archive's of [0-9a-f]{40}, and spec v0\\.5\\.6 is e6069ae`), name);
    assert.throws(() => checkSpecContent(name, bytes, "v0.13.0", gitHub({ tags: { ...COMMITS, spec: {} } })), /spec has no tag v0\.13\.0/, name);
  }
  // git archive writes the commit into the header whatever the folder: the format's archive of
  // v0.5.6, by another part's name, is bound to v0.5.6, and holds format-0.1/, not that part.
  const format = specFile("format-0.1.tar.gz").bytes;
  const source = gitHub();
  for (const name of ["admission-0.1.tar.gz", "deployment-1.tar.gz", "legal-1.tar.gz", "format-0.2.tar.gz"]) {
    assert.throws(() => checkSpecContent(name, format, "v0.5.6", source), /holds format-0\.1\/, and the archive of [a-z]+\/ that its name says holds [a-z]+-[0-9.]+\/LICENSE and [a-z]+-[0-9.]+\/[a-z]+\/ alone/, name);
  }
  assert.throws(() => checkSpecContent("legal-1.tar.gz", format, "v0.5.5", source), /legal-1\.tar\.gz is git archive's of e6069ae\w+, and spec v0\.5\.5 is c143fa0/);
  // Its VERSION is the version its name says.
  const two = partArchive("legal-1.tar.gz", { "legal/VERSION": "2\n" });
  assert.throws(() => checkSpecContent("legal-1.tar.gz", two.bytes, "v0.13.0", two.source), /^Error: legal-1\.tar\.gz holds legal-1\/legal\/VERSION "2\\n", and its name says 1$/);
  // It holds VERSION and LICENSE, and nothing beside the part.
  const unversioned = partArchive("legal-1.tar.gz", { "legal/legal.yaml": "format: 1\n" });
  assert.throws(() => checkSpecContent("legal-1.tar.gz", unversioned.bytes, "v0.13.0", unversioned.source), /^Error: legal-1\.tar\.gz holds no legal-1\/legal\/VERSION$/);
  const beside = partArchive("legal-1.tar.gz", { "legal/VERSION": "1\n", "notes/a.txt": "a\n" });
  assert.throws(() => checkSpecContent("legal-1.tar.gz", beside.bytes, "v0.13.0", beside.source), /^Error: legal-1\.tar\.gz holds legal-1\/notes\/, and the archive of legal\/ that its name says/);
  const moved = partArchive("legal-1.tar.gz", { "legal/VERSION": "1\n" }, "legal");
  assert.throws(() => checkSpecContent("legal-1.tar.gz", moved.bytes, "v0.13.0", moved.source), /^Error: legal-1\.tar\.gz holds legal\/, and the archive/);
  assert.throws(() => checkSpecContent("admission-0.1.tar.gz", Buffer.from("no gzip"), "v0.5.6", source), /admission-0\.1\.tar\.gz is no gzip archive/);
  // What tar cannot list is no archive of a part, and an archive of nothing holds neither file.
  assert.throws(() => checkPartArchive("legal-1.tar.gz", Buffer.from("no gzip")), /^Error: legal-1\.tar\.gz cannot be listed by tar/);
  assert.throws(() => checkPartArchive("legal-1.tar.gz", zlib.gzipSync(Buffer.alloc(1024))), /^Error: legal-1\.tar\.gz holds no legal-1\/LICENSE$/);
  // A version is an integer from 1 for the deployment configuration and the legal texts, and
  // MAJOR.MINOR for the others.
  for (const name of ["admission-01.tar.gz", "deployment-0.tar.gz", "deployment-01.tar.gz", "deployment-1.0.tar.gz", "admission-1.tar.gz", "format-1.tar.gz", "legal-0.tar.gz", "legal-01.tar.gz", "legal-1.0.tar.gz", "legals-1.tar.gz"]) {
    assert.throws(() => checkSpecContent(name, format, "v0.5.6", source), /is no file of spec's release that R77 binds to its tag/, name);
  }
});

// The fields of the certificates of the fixtures, read once their bundles hold.
const licenseFields = () => readIdentity(verifySignature(license().bytes, license().bundle, trustedRoot));
const specFields = () => readIdentity(verifySignature(specFile("format-0.1.tar.gz").bytes, specFile("format-0.1.tar.gz").bundle, trustedRoot));

test("the certificate's fields are held to R77: who signed, at whose call, on which branch", () => {
  assert.equal(checkFields(licenseFields(), "module-kit"), V014);
  assert.equal(checkFields(specFields(), "spec"), undefined);
  const refused = (fields, repository, change, reason) => assert.throws(() => checkFields({ ...fields, ...change }, repository), reason, JSON.stringify(change));
  const kit = licenseFields();
  for (const san of [`${SHARED}refs/heads/main`, `${SHARED}v0.1.7`, `${SHARED}${V014.toUpperCase()}`, `${SHARED}${V014.slice(0, 7)}`, SHARED.replace("release.yml", "ci.yml") + V014, `https://github.com/altnovatrail/module-kit/.github/workflows/release.yml@${V014}`]) {
    refused(kit, "module-kit", { san }, /not the shared release\.yml of \.github at the SHA of a commit/);
  }
  refused(kit, "module-kit", { buildSignerURI: `${SHARED}${COMMITS[".github"]["v0.1.7"]}` }, /Build Signer URI \(1\.3\.6\.1\.4\.1\.57264\.1\.9\)/);
  refused(kit, "module-kit", { buildSignerDigest: COMMITS[".github"]["v0.1.7"] }, /Build Signer Digest \(1\.3\.6\.1\.4\.1\.57264\.1\.10\)/);
  refused(kit, "module-kit", { runnerEnvironment: "self-hosted" }, /Runner Environment .* is "self-hosted", not "github-hosted"/);
  refused(kit, "module-kit", { sourceRepositoryRef: "refs/heads/dev" }, /Source Repository Ref .* is "refs\/heads\/dev", not "refs\/heads\/main"/);
  refused(kit, "module-kit", { sourceRepositoryIdentifier: "1" }, /Source Repository Identifier .* is "1", not "1425817249"/);
  refused(kit, "module-kit", { sourceRepositoryOwnerURI: "https://github.com/someone" }, /Source Repository Owner URI/);
  refused(kit, "module-kit", { sourceRepositoryOwnerIdentifier: "1" }, /Source Repository Owner Identifier .* not "344507087"/);
  refused(kit, "module-kit", { buildConfigURI: "https://github.com/altnovatrail/module-kit/.github/workflows/probe.yml@refs/pull/33/merge" }, /Build Config URI/);
  refused(kit, "module-kit", { issuer: "https://accounts.example.com" }, /Issuer \(1\.3\.6\.1\.4\.1\.57264\.1\.8\) is "https:\/\/accounts\.example\.com", not "https:\/\/token\.actions\.githubusercontent\.com"/);
  const spec = specFields();
  refused(spec, "spec", { san: "https://github.com/altnovatrail/spec/.github/workflows/release.yml@refs/pull/33/merge" }, /the SAN is .*refs\/pull\/33\/merge", not .*refs\/heads\/main"/);
  refused(spec, "spec", { buildSignerURI: `${SHARED}${V014}` }, /Build Signer URI/);
  refused(spec, "spec", { issuer: "https://accounts.example.com" }, /Issuer/);
  refused(spec, "spec", { sourceRepositoryIdentifier: "1425817249" }, /Source Repository Identifier .* not "1424771727"/);
  assert.equal(ISSUER, spec.issuer);
});

test("each field is in the certificate once, as a DER UTF8String", () => {
  const identity = verifySignature(license().bytes, license().bundle, trustedRoot);
  const id = (oid) => oid.split(".").map(Number);
  const without = (oid) => ({ ...identity, oids: identity.oids.filter((entry) => entry.oid.id.join(".") !== oid) });
  const withValue = (oid, value) => ({ ...without(oid), oids: [...without(oid).oids, { oid: { id: id(oid) }, value }] });
  const oid = FIELDS.sourceRepositoryIdentifier.oid;
  assert.throws(() => readIdentity(without(oid)), /the certificate has no Source Repository Identifier \(1\.3\.6\.1\.4\.1\.57264\.1\.15\)/);
  assert.throws(() => readIdentity({ ...identity, oids: [...identity.oids, identity.oids.find((entry) => entry.oid.id.join(".") === oid)] }), /has Source Repository Identifier \(\S+\) 2 times/);
  assert.throws(() => readIdentity({ ...identity, subjectAlternativeName: undefined }), /the certificate names no SAN/);
  assert.throws(() => readIdentity(undefined), /names no SAN/);
  const utf8 = (bytes) => readIdentity(withValue(oid, Buffer.from(bytes))).sourceRepositoryIdentifier;
  assert.equal(utf8([0x0c, 3, 0x31, 0x32, 0x33]), "123");
  // The long form of a length, as a value of 128 bytes or more has it.
  assert.equal(utf8([0x0c, 0x81, 200, ...Buffer.alloc(200, 0x37)]), "7".repeat(200));
  assert.equal(utf8([0x0c, 0x82, 0x01, 0x00, ...Buffer.alloc(256, 0x38)]), "8".repeat(256));
  for (const bytes of [[0x04, 1, 0x31], [0x0c], [], [0x0c, 2, 0x31], [0x0c, 0x80], [0x0c, 0x83, 0, 0, 1, 0x31], [0x0c, 0x82, 0], [0x0c, 2, 0xc3, 0x28]]) {
    assert.throws(() => utf8(bytes), /Source Repository Identifier \(\S+\) is no DER UTF8String/, JSON.stringify(bytes));
  }
});

test("a file is checked as a release of a repository of the table", () => {
  checkRelease("module-kit", "v0.1.0");
  assert.throws(() => checkRelease("left-pad", "v0.1.0"), /'left-pad' is no repository of altnovatrail with an ID in tools\/release\/repositories\.mjs/);
  assert.throws(() => checkRelease("toString", "v0.1.0"), /no repository/);
  for (const tag of ["main", "v0.1", "0.1.0", "v0.1.0-rc.1", "refs/tags/v0.1.0", "*"]) assert.throws(() => checkRelease("spec", tag), /is no release tag, vMAJOR\.MINOR\.PATCH/, tag);
});

test("when Sigstore's trust root cannot be read, nothing is verified", async () => {
  // A mirror that does not answer, from Sigstore's TUF root: the client starts from it, and fails
  // only when it asks the mirror for what is newer.
  const rootPath = path.join(fixtures, "tuf-root.json");
  const unreachable = () => sigstoreRoot({ mirrorURL: "http://127.0.0.1:1", rootPath, retry: { retries: 0 }, timeout: 2000 });
  await assert.rejects(unreachable, /Sigstore's trust root could not be read by TUF from http:\/\/127\.0\.0\.1:1, and without it nothing is verified/);
  const file = path.join(fixtures, "spec-v0.5.6/format-0.1.tar.gz");
  await assert.rejects(main(["spec", "v0.5.6", file], { trust: unreachable, source: gitHub() }), /Sigstore's trust root could not be read/);
});

test("the command line: a file and its bundle, beside it or named", async () => {
  const trust = async () => trustedRoot;
  const file = path.join(fixtures, "spec-v0.5.6/format-0.1.tar.gz");
  assert.deepEqual(await main(["spec", "v0.5.6", file], { trust, source: gitHub() }), ["format-0.1.tar.gz: spec v0.5.6, signed by spec's release.yml"]);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "release-verify-cli-"));
  try {
    const moved = path.join(work, "format-0.1.tar.gz");
    fs.copyFileSync(file, moved);
    const bundle = path.join(work, "bundle.json");
    fs.copyFileSync(`${file}.sigstore.json`, bundle);
    assert.deepEqual(await main(["spec", "v0.5.6", moved, bundle], { trust, source: gitHub() }), ["format-0.1.tar.gz: spec v0.5.6, signed by spec's release.yml"]);
    await assert.rejects(main(["spec", "v0.5.6", moved], { trust, source: gitHub() }), /format-0\.1\.tar\.gz\.sigstore\.json cannot be read: ENOENT/);
    fs.writeFileSync(bundle, "{");
    await assert.rejects(main(["spec", "v0.5.6", moved, bundle], { trust, source: gitHub() }), /bundle\.json is no JSON/);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  for (const args of [[], ["spec", "v0.5.6"], ["spec", "v0.5.6", file, file, file], ["--npm"], ["--npm", file, file]]) {
    await assert.rejects(main(args, { trust }), (error) => error.usage && /^usage: release-verify/.test(error.message), JSON.stringify(args));
  }
  await assert.rejects(main(["nope", "v0.5.6", file], { trust }), /'nope' is no repository/);
});

test("the recipes run from the caller's directory, and refuse before they go to the network", () => {
  const { dir } = scratchRepository("release-verify-");
  try {
    fs.writeFileSync(path.join(dir, "file.bin"), "bytes");
    const run = (name, args) => recipe(dir, { name, justfileFlags: ["-f", justfile], args });
    for (const [name, args, reason] of [
      ["release-verify", ["nope", "v0.1.0", "file.bin"], /release-verify: 'nope' is no repository of altnovatrail/],
      ["release-verify", ["spec", "main", "file.bin"], /release-verify: 'main' is no release tag/],
      ["release-verify", ["spec", "v0.5.6", "no-such-file"], /release-verify: no-such-file cannot be read: ENOENT/],
      // The bundle is beside the file, in the caller's directory: the file is found there.
      ["release-verify", ["spec", "v0.5.6", "file.bin"], /release-verify: file\.bin\.sigstore\.json cannot be read: ENOENT/],
      ["release-verify", ["spec", "v0.5.6", "file.bin", "no-such-bundle"], /release-verify: no-such-bundle cannot be read/],
      ["release-verify-npm", ["no-such-lock.json"], /release-verify: no-such-lock\.json cannot be read/],
      ["release-verify-npm", ["file.bin"], /release-verify: the lock file is no JSON/],
    ]) {
      const refused = run(name, args);
      assert.equal(refused.status, 1, `${name} ${args.join(" ")}: ${refused.stdout}${refused.stderr}`);
      assert.match(refused.stderr, reason);
    }
    // A lock file with no package of @altnovatrail has nothing to verify, and asks nothing of the network.
    fs.writeFileSync(path.join(dir, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": {} } }));
    const nothing = run("release-verify-npm", ["package-lock.json"]);
    assert.equal(nothing.status, 0, nothing.stderr);
    assert.equal(nothing.stdout, "no package of @altnovatrail to verify\n");
    const usage = spawnSync(process.execPath, [path.join(root, "tools/release/verify.mjs"), "spec"], { encoding: "utf8" });
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /^usage: release-verify <repository> <tag> <file> \[<bundle>\]/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
