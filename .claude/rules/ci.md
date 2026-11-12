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

CI (`.github/workflows/ci.yml`) runs all eleven checks — `docs-check`, `licenses-check`, `format-check`, `admission-check`, `deployment-check`, `legal-check`, `consent-age-check`, `export-check`, `go-check`, `types-check` and `contracts-check` —, with the tests of `tools/`, in the `toolchain` stage on every pull request and on `main`; what it runs and what holds a merge is R30. The tests run as `just coverage` runs them, all at once with their coverage — those of `tools/`, then those of the Go modules by `ci-test` —, and a job of its own sends that of `tools/` to Codecov by OIDC, with no secret (R48); the coverage of the Go modules goes there the same way from "Go / coverage" of `go.yml`, and Codecov sets `codecov/patch` once both have come. Beside them run the checks every NovaTrail repository shares — secrets, DCO, CodeQL, Scorecard and, on the Go code, `go.yml`, which runs the four `ci-` recipes as "Go / lint", "Go / test", "Go / vuln" and "Go / licenses" (the 2026-11-01 amendment to R30) — from `.github`'s shared workflows, pinned to a release of it by SHA (R03 .github); rule 12 of RUN.md has their findings closed before the next task.

## The release

A release of spec, and its tag, comes out by itself once CI passes on `main` (`.github/workflows/release.yml`, R31): nobody tags by hand, and `just release-version` prints the version the next release takes, refusing a commit that gives the module format a new version in the line of the release before it (R44), and so the admission table (R96), the deployment configuration (R85), the legal texts (R130), the table of the age of digital consent (R134) and the format of the export (R135). A task that touches `release.yml` or `tools/release/` runs `just release-version` too (rule 6 of RUN.md).

From the line 0.3 on, a release carries the files code takes from spec (R64): `format-<version>.tar.gz`, from the line 0.8 on the admission table's `admission-<version>.tar.gz` (R96), from the line 0.11 on the deployment configuration's `deployment-<version>.tar.gz` (R85), from the line 0.13 on the legal texts' `legal-<version>.tar.gz` (R130), from the line 0.14 on the table of the age of digital consent's `consent-age-<version>.tar.gz` (R134) and the format of the export's `export-<version>.tar.gz` (R135), and from the line 0.4 on the npm package of the types for TypeScript, `altnovatrail-spec-<version>.tgz`, which from the line 0.5 on holds the types of `<novatrail-canvas>` too (R74), and from the line 0.10 on the page of the workbook as JSON, `format/page.json` and its vectors, which `just types` writes under `types/page/` (the 2026-11-09 amendments to R51 and R73), which the release also publishes to npm by trusted publishing, with no token (R37, R73), and from the line 0.7 on the npm package of the API contracts' code, `altnovatrail-contracts-<version>.tgz` (R83), which the release publishes to npm the same way. `just release-files <commit> <folder> <tag>` builds them, and CI builds them on every pull request; each is signed with cosign and attested with the release. The same tag is the version of the Go module, and without its `v` the version of the npm packages; from the line 0.7 on, the release also tags its commit `contracts/<tag>`, the version of the Go module of the contracts.

Another repository releases through the same recipes, `just -f spec/justfile release-version` and `release-refusal`, rather than copies of them, and its runner runs them in its `toolchain` stage by `spec/tools/toolchain/toolchain.sh`, as spec's CI and release run every check (R31).

## The toolchain stage

CI and the release run every check in the `toolchain` stage of `.devcontainer/Dockerfile`, by `tools/toolchain/toolchain.sh`. With `TOOLCHAIN_IMAGE_FILE` set to a path, `toolchain.sh build` loads the stage from that file of `docker save`, which CI keeps in the cache of GitHub Actions by the sha256 of the Dockerfile, and on a miss builds the stage and writes the file; a release never sets it (the amendments of 2026-11-09 to R31). Its tests, with a stand-in for docker, are `just toolchain-test`. Another repository's license checks take spec's list and spec's check of an npm lock file the same way: `just -f spec/justfile licenses-allowed` and `licenses-check-repo` (R39).

## Verifying release files

A file of a NovaTrail release enters code or CI only through `just release-verify <repository> <tag> <file> [<bundle>]`, and the packages of `@altnovatrail` in an npm lock file through `just release-verify-npm <lock file>` (R77). `tools/release/verify.mjs` verifies the file's cosign bundle by sigstore-js against Sigstore's trust root, which TUF reads afresh on every run, and holds the certificate's fields to R77. What GitHub holds — the commit of the tag, the releases of `.github` and the history of its main — it reads through git, with no token, and the numeric IDs of the repositories are `tools/release/repositories.mjs`, where a new repository's ID goes (repositories 2.2). When Sigstore or GitHub cannot be read, the file is refused. Their tests, in `just release-version-test` and `just coverage`, verify files of real releases, `tools/release/test/fixtures/`, with no network. Another repository runs them the same way, `just -f spec/justfile release-verify` and `release-verify-npm`, in its `toolchain` stage.
