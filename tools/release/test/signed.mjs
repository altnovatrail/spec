// What the tests of release-verify share: files of real releases with their bundles, as the
// releases hold them, a copy of Sigstore's trust root to verify them by with no network, and
// GitHub as git read it, made up from what it held on 2026-11-01.
//
// fixtures/ holds, byte for byte:
// - spec-v0.5.6/: format-0.1.tar.gz and altnovatrail-spec-0.5.6.tgz of spec's release v0.5.6,
//   each with its bundle, signed by spec's own release.yml (R64, R73);
// - module-kit-v0.1.0/: LICENSE of module-kit's release v0.1.0, with its bundle, signed by the
//   shared release.yml of .github v0.1.4, below the minimum of R77;
// - tutor-v0.1.0/: SHA256SUMS of tutor's release v0.1.0, with its bundle, signed by the shared
//   release.yml of .github v0.1.11, above that minimum: the first release so signed, published
//   2026-11-01 and read 2026-11-02;
// - trusted_root.json: Sigstore's trust root, the target trusted_root.json that @sigstore/tuf
//   5.0.0 read from https://tuf-repo-cdn.sigstore.dev on 2026-11-01. The verifier holds each
//   certificate and key to the timestamps of the bundle, not to today, so the copy does not age;
// - tuf-root.json: the root of Sigstore's TUF repository that the same read ended at, version 16,
//   for a client to start from when it asks a mirror that does not answer.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TrustedRoot } from "@sigstore/protobuf-specs";

export const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export const trustedRoot = TrustedRoot.fromJSON(JSON.parse(fs.readFileSync(path.join(fixtures, "trusted_root.json"), "utf8")));

// A file of fixtures/ as release-verify takes it: its name, its bytes and its bundle.
export function fixture(file) {
  const at = path.join(fixtures, file);
  return { name: path.basename(at), bytes: fs.readFileSync(at), bundle: JSON.parse(fs.readFileSync(`${at}.sigstore.json`, "utf8")) };
}

// The commits of the tags, as git ls-remote read them on 2026-11-01, and tutor's and .github's
// v0.1.12 on 2026-11-02.
export const COMMITS = Object.freeze({
  spec: { "v0.5.5": "c143fa0d0189a63a2031391e731f89f0677c9e2e", "v0.5.6": "e6069ae5e0c16b8121285359c6cc97175e07ec73" },
  "module-kit": { "v0.1.0": "7e0144a61323be0875f5b4819d1708a581db94bc" },
  tutor: { "v0.1.0": "e4ed0772464758c03a160daf4644d1c0160e459a" },
  ".github": {
    "v0.1.3": "26f61993abadd564cce5e0498b31c686a61f9646",
    "v0.1.4": "11435dbe61d3d4885c9a8dd30686e8111e26cabb",
    "v0.1.7": "0acbf75e5c8362b649924bf1abdae973ce71085e",
    "v0.1.11": "c1b848779d9f1d73817ca078a7cba3664632f03b",
    "v0.1.12": "4225639bcd04f43ef58f95cabf9fdfd947cbcb07",
  },
});

// GitHub as release-verify asks it, from the tags of each repository and the commits on the main
// of .github, oldest first: every commit of a release tag of .github lies on its main.
export function gitHub({ tags = COMMITS, main = Object.values(COMMITS[".github"]) } = {}) {
  return {
    tagCommit: (repository, tag) => tags[repository]?.[tag],
    releaseTags: (repository) => new Map(Object.entries(tags[repository] ?? {}).map(([tag, commit]) => [commit, [tag]])),
    isAncestor: (repository, ancestor, commit) => main.includes(ancestor) && main.includes(commit) && main.indexOf(ancestor) <= main.indexOf(commit),
    onMain: (repository, commit) => main.includes(commit),
  };
}
