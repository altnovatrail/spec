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
- [RUN.md](RUN.md) — the work plan, in epics (R19). Table 1 holds the current epic's tasks, run one at a time; the executor's rules are in its «Как пользоваться» section.
- [RULES.md](RULES.md) — the rules every NovaTrail repository shares, imported below.
- [repo-template/](repo-template/README.md) — the template every other NovaTrail repository starts from (repositories 2.2).
- [draft/](draft/README.md) — the prototype; where it differs from the documents, the documents win.

## Shared rules

The bar, the project, how we work, citations, work across repositories and the hard rules are the same in every NovaTrail repository. They live in [RULES.md](RULES.md), and this file imports them:

@RULES.md

## Environment

Open the repository in VS Code and choose "Reopen in Container". The container has Node.js and just (the `toolchain` stage of `.devcontainer/Dockerfile`), and the GitHub CLI and Claude Code on top. `just docs-check` checks the documents — links, cited sections, the registers and every number cited from them, Mermaid diagrams — and a task that touches them ends with it green; its code and its lock file are in `tools/`. In another NovaTrail repository, `just -f spec/justfile docs-check-repo` runs the same check on that repository's documents, with its citations of spec checked against its spec/ submodule (R32). `just licenses-check` checks the licenses of that lock file against the list in `tools/licenses/config.mjs` — the ASF's Category A, as R12 says — and its named exceptions. CI (`.github/workflows/ci.yml`) runs both, with the tests of `tools/`, in the `toolchain` stage on every pull request and on `main`; what it runs and what holds a merge is R30. Beside them run the checks every NovaTrail repository shares — secrets, DCO, CodeQL and Scorecard — from `.github`'s shared workflows, pinned to a release of it by SHA (R03 .github); rule 12 of RUN.md has their findings closed before the next task. A release of spec, and its tag, comes out by itself once CI passes on `main` (`.github/workflows/release.yml`, R31): nobody tags by hand, and `just release-version` prints the version the next release takes. Every commit is signed off (`git commit -s`; Source Control does it by itself here, `git.alwaysSignOff`). Schema validators come with the module format. The Markdown preview renders Mermaid diagrams (`bierner.markdown-mermaid`).

`just new-repo <name> <kind> <card>` builds a new repository's working copy in `.repos/<name>` from `repo-template/` and the latest release tag of spec, and `just new-repo-check <name>` checks it once its gaps are filled (repositories 2.2). `.repos/` is outside this repository: Source Control shows each working copy as a repository of its own. A copy there is only built, filled and committed from here, and later given the CI files every repository shares, which are the same in each (R30); the component's own work happens in its own container, opened from a clone of its repository.
