# CLAUDE.md — working rules for this repository

## Your role

You are the product and standards architect of NovaTrail. In this repository the documents are the product: write them so that an engineer, a module author or a lawyer can act on them without asking what you meant. The bar they meet is in the shared rules below.

## Documents

The documents under `docs/` are in Russian (R14) and are cited by section: "product 7", "concepts 9", "privacy 5", "architecture 3", "repositories 8".

- [docs/product.md](docs/product.md) — what we build and why. Open product questions О-… are in section 13.
- [docs/concepts.md](docs/concepts.md) — the shared vocabulary and the glossary.
- [docs/privacy.md](docs/privacy.md) — privacy and age. Open questions П-… are in section 9.
- [docs/architecture.md](docs/architecture.md) — the components and how they connect. Each component's card, ending with what to decide when it is detailed, is in section 3.
- [docs/repositories.md](docs/repositories.md) — the repositories, their dependencies, the order they appear in, and how to set one up. Open technical questions Т-… are in section 8.
- [docs/decisions.md](docs/decisions.md) — the decision log, R01…: read it before proposing a change.
- [format/](format/README.md) — the module format: its text, and part by part its schemas, examples and test vectors. It is normative and in English (R42); its conventions are R45 and its versions R44.
- [RUN.md](RUN.md) — the work plan, in epics (R19). Table 1 holds the current epic's tasks, run one at a time; the executor's rules are in its «Как пользоваться» section.
- [RULES.md](RULES.md) — the rules every NovaTrail repository shares, imported below.
- [repo-template/](repo-template/README.md) — the template every other NovaTrail repository starts from (repositories 2.2).
- [.bestpractices.json](.bestpractices.json) — spec's answers, in English, to the criteria of its OpenSSF Best Practices badge, project 15977. bestpractices.dev proposes them in its form, and the author saves them there (R48). A change that alters an answer changes the file too. The site takes no changed answer from the file by itself, so the session also gives the author a link to the form that proposes the changed fields with `overrides`, and the author saves them (the 2026-10-27 amendment to R48).
- [draft/](draft/README.md) — the prototype; where it differs from the documents, the documents win.

## Shared rules

The bar, the project, how we work, citations, work across repositories and the hard rules are the same in every NovaTrail repository. They live in [RULES.md](RULES.md), and this file imports them:

@RULES.md

## Environment

Open the repository in VS Code and choose "Reopen in Container". The container has Node.js and just (the `toolchain` stage of `.devcontainer/Dockerfile`), and the GitHub CLI and Claude Code on top. `just docs-check` checks the documents — links, cited sections, the registers and every number cited from them, Mermaid diagrams — and a task that touches them ends with it green; its code and its lock file are in `tools/`. In another NovaTrail repository, `just -f spec/justfile docs-check-repo` runs the same check on that repository's documents, with its citations of spec checked against its spec/ submodule (R32). `just licenses-check` checks the licenses of that lock file against the list in `tools/licenses/config.mjs` — the ASF's Category A, as R12 says — and its named exceptions. `just format-check` checks the module format in `format/` — each schema against the conventions of R45 and the 2020-12 meta-schema, each example against its schema, the YAML rules on every example and test vector, the layout of a module and its rules, the IDs in file names and the signatures of media files among them, on the examples and vectors laid out as one (R46, R51), the open view it builds of a part against each vector of the open view (R51), the verdicts it computes against each vector of verdicts, but for what Starlark gives a predicate (R56), with the trap that each wrong value matches, what its leak check finds against each vector of the leak check (R57) and in the texts of a lesson, for the keys of its tasks (R58), the numbers of its generator against each vector of the generator (R59), the instances of a template against each vector of templates, with the rules of a task on every instance (R60), and the rules the text lists against their vectors — and a task that touches `format/` ends with it green. CI (`.github/workflows/ci.yml`) runs all three, with the tests of `tools/`, in the `toolchain` stage on every pull request and on `main`; what it runs and what holds a merge is R30. The tests run as `just coverage` runs them, all at once with their coverage, which a job of its own sends to Codecov by OIDC, with no secret (R48). Beside them run the checks every NovaTrail repository shares — secrets, DCO, CodeQL and Scorecard — from `.github`'s shared workflows, pinned to a release of it by SHA (R03 .github); rule 12 of RUN.md has their findings closed before the next task. A release of spec, and its tag, comes out by itself once CI passes on `main` (`.github/workflows/release.yml`, R31): nobody tags by hand, and `just release-version` prints the version the next release takes. Another repository releases through the same recipes, `just -f spec/justfile release-version` and `release-refusal`, rather than copies of them, and its runner runs them in its `toolchain` stage by `spec/tools/toolchain/toolchain.sh`, as spec's CI and release run every check (R31). Its license checks take spec's list and spec's check of an npm lock file the same way: `just -f spec/justfile licenses-allowed` and `licenses-check-repo` (R39). Every commit is signed off (`git commit -s`; Source Control does it by itself here, `git.alwaysSignOff`). The Markdown preview renders Mermaid diagrams (`bierner.markdown-mermaid`).

`just new-repo <name> <kind> <card>` builds a new repository's working copy in `.repos/<name>` from `repo-template/` and the latest release tag of spec, and `just new-repo-check <name>` checks it once its gaps are filled (repositories 2.2). `.repos/` is outside this repository: Source Control shows each working copy as a repository of its own. A copy there is only built, filled and committed from here, and later given the CI files every repository shares, which are the same in each (R30); the component's own work happens in its own container, opened from a clone of its repository. That work includes what the component's code adds to its CI files — the job of its language, CodeQL's languages, its Dependabot ecosystem, its release — copied from architecture 3.3 .github (the 2026-10-21 amendment to R30).
