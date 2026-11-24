---
paths:
  - ".github/**"
  - ".devcontainer/**"
  - "justfile"
  - "tools/release/**"
  - "tools/toolchain/**"
---

# CI, the release and the toolchain stage

## CI

CI (`.github/workflows/ci.yml`) runs the eleven checks — `docs-check`, `licenses-check`, `format-check`, `admission-check`, `deployment-check`, `legal-check`, `consent-age-check`, `export-check`, `go-check`, `types-check`, `contracts-check` — in the job "Checks" and the tests of `tools/` in "Tests (<k>/3)", `just coverage-part <k> 3`, in the `toolchain` stage; the required "Documents and tools" passes once all four have and `tools/coverage/untested.sh` finds each module of `tools/` in a report. `just coverage` runs them at once, with that guard, then `ci-test`; `just coverage-test` tests both. "Coverage" sends the three reports to Codecov by OIDC in one upload; Go's comes from "Go / coverage", and `codecov/patch` waits for both. Beside them run the shared checks — secrets, DCO, CodeQL, Scorecard and `go.yml`, the four `ci-` recipes as "Go / lint", "Go / test", "Go / vuln" and "Go / licenses" — from `.github`, pinned by SHA; RUN.md's rule on the analyzers' findings closes them before the next task.

## The release

A release of spec, and its tag, comes out by itself once CI passes on `main` (`.github/workflows/release.yml`): nobody tags by hand, and `just release-version` prints the version the next release takes, refusing a commit that gives the module format a new version in the line of the release before it, and so the admission table, the deployment configuration, the legal texts, the table of the age of digital consent and the format of the export. A task that touches `release.yml` or `tools/release/` runs `just release-version` too.

A release carries the files code takes from spec: `format-<version>.tar.gz`, the admission table's `admission-<version>.tar.gz`, the deployment configuration's `deployment-<version>.tar.gz`, the legal texts' `legal-<version>.tar.gz`, the table of the age of digital consent's `consent-age-<version>.tar.gz`, the format of the export's `export-<version>.tar.gz`, the npm package of the types for TypeScript, `altnovatrail-spec-<version>.tgz`, with the types of `<novatrail-canvas>` and the page of the workbook as JSON, `format/page.json` and its vectors, which `just types` writes under `types/page/`, and the npm package of the API contracts' code, `altnovatrail-contracts-<version>.tgz`; the release publishes both packages to npm by trusted publishing, with no token. `just release-files <commit> <folder> <tag>` builds them, and CI builds them on every pull request; each is signed with cosign and attested with the release. The same tag is the version of the Go module, and without its `v` the version of the npm packages; the release also tags its commit `contracts/<tag>`, the version of the Go module of the contracts.

Another repository releases through the same recipes, `just -f spec/justfile release-version` and `release-refusal`, rather than copies of them, and its runner runs them in its `toolchain` stage by `spec/tools/toolchain/toolchain.sh`, as spec's CI and release run every check.

## The toolchain stage

CI runs every check in the `toolchain` stage of `.devcontainer/Dockerfile`, by `tools/toolchain/toolchain.sh`, and the release in `toolchain-core` under it — Node, just, Go, buf —, by `TOOLCHAIN_STAGE`. A kind's lines end `toolchain`, never the core; the apt of the kind `typescript` reads the snapshot alone. With `TOOLCHAIN_IMAGE_FILE`, `toolchain.sh build` loads the stage from that file of `docker save`, which CI caches by the sha256 of the Dockerfile, or builds it and writes the file; a release never sets it. Its tests, with a fake docker: `just toolchain-test`. `just devcontainer-outdated` (`tools/toolchain/outdated.mjs`) names the pins of `.devcontainer/` and `repo-template/kinds.json` behind the Marketplace's latest stable version, and a `CLAUDE_CODE_VERSION` behind npm's `latest`; a raise ends with it at 0, and another repository runs it by `just -f spec/justfile`. Never in CI; its tests, without network, are in `just toolchain-test`. Another repository's license checks take spec's list and its check of an npm lock file so: `just -f spec/justfile licenses-allowed` and `licenses-check-repo`.

## The orchestrator's stage

`orchestrator`, the last stage of spec's Dockerfile, is `devcontainer` with the Docker client and the Dev Containers CLI; `.devcontainer/orchestrator/devcontainer.json` builds it with the host's socket, the ordinary configuration otherwise. It builds without `docker-gid` too, for the ordinary configuration on a host without buildx (sources 9.4). `just toolchain-test` holds all this; `orchestrator.yml`, on a change of `.devcontainer/`, builds it on amd64 and arm64, not required. `just new-repo` leaves it out of a copy.

## Verifying release files

A file of a NovaTrail release enters code or CI only through `just release-verify <repository> <tag> <file> [<bundle>]`, and the packages of `@altnovatrail` in an npm lock file through `just release-verify-npm <lock file>`. `tools/release/verify.mjs` verifies the file's cosign bundle by sigstore-js against Sigstore's trust root, which TUF reads afresh on every run, and holds every field of the certificate — who signed, by whose call, on what branch and from what commit — to what a NovaTrail release is signed with. What GitHub holds — the commit of the tag, the releases of `.github` and the history of its main — it reads through git, with no token, and the numeric IDs of the repositories are `tools/release/repositories.mjs`, where a new repository's ID goes. When Sigstore or GitHub cannot be read, the file is refused. Their tests, in `just release-version-test` and `just coverage`, verify files of real releases, `tools/release/test/fixtures/`, with no network. Another repository runs them the same way, `just -f spec/justfile release-verify` and `release-verify-npm`, in its `toolchain` stage.
