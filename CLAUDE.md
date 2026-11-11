# CLAUDE.md — working rules for this repository

## Your role

You are the product and standards architect of NovaTrail. In this repository the documents are the product: write them so that an engineer, a module author or a lawyer can act on them without asking what you meant. The bar they meet is in the shared rules below.

## Documents

The documents under `docs/` are in Russian (R14) and are cited by section: "product 7", "concepts 9", "privacy 5", "architecture 3", "repositories 8".

- [docs/product.md](docs/product.md) — what we build and why. Open product questions О-… are in section 13.
- [docs/concepts.md](docs/concepts.md) — the shared vocabulary and the glossary.
- [docs/privacy.md](docs/privacy.md) — privacy and age. Open questions П-… are in section 9.
- [docs/dpia.md](docs/dpia.md) — the data protection impact assessment, by the ICO's template: the processing, its necessity, the risks to children and the measures against them, and what must hold before the first child (R119, R129). It is cited by section, as `dpia 6`, and a task that changes what it rests on reviews it.
- [docs/architecture.md](docs/architecture.md) — the components and how they connect. Each component's card, ending with what to decide when it is detailed, is in section 3.
- [docs/repositories.md](docs/repositories.md) — the repositories, their dependencies, the order they appear in, and how to set one up. Open technical questions Т-… are in section 8.
- [docs/decisions.md](docs/decisions.md) — the decision log, R01…: read it before proposing a change.
- [format/](format/README.md) — the module format: its text, and part by part its schemas, examples and test vectors. It is normative and in English (R42); its conventions are R45 and its versions R44.
- [contracts/](contracts/README.md) — the API contracts: protobuf files by buf's rules, and the code buf generates from them. It is normative and in English (R42); its rules are R83.
- [admission/](admission/README.md) — the admission table: to which AI provider, on which route to AI, the work of a learner of each age category may go, and which capability of AI may serve each category. It is normative and in English (R42); its version and its rules are R96.
- [deployment/](deployment/README.md) — the format of the deployment configuration: the file `/deployment.json` that `app` reads at its start, with the origin of `api` and the parameters of the sign-in service, and the rules by which a reader accepts it. It is normative and in English (R42); its version, an integer, and its rules are R85.
- [legal/](legal/README.md) — the legal texts of the platform: the privacy policy, the terms of use, the consents, the sets of texts of the samples page and the volunteer's form, each a version of its own that never changes once in force, with the passport `legal.yaml` that names their versions, status and gist in the languages of the interface. It is normative and in English (R42); its version, an integer, and its rules are R130. `app` gets the texts from `api` (`LegalService`), and the samples page of `canvas` and the organizer of an eval set from a file of `spec`'s release.
- [consent-age/](consent-age/README.md) — the table of the age of digital consent: for each country of the EU and the EEA, the United Kingdom and the United States, the age from which a learner gives consent themselves, from the day it applies, with the law and its provision, a quote in the law's language, the source and the date it was read; a country outside the table has 18. `api` puts a learner of 13 to 17 in an age category by it, and asks the age again when a country raised it. It is normative and in English (R42); its version, an integer, and its rules are R134.
- [export/](export/README.md) — the format of the export: the ZIP that the owner of an account gets of a profile or of the whole account — a manifest and the files of the device, which `app` writes, and `api.zip`, the part `api` gives by `ExportProfile` and `ExportAccount`, byte for byte —, its files of JSON by its schemas, and the evidence log, the model's state and the observation as the JSON of their protobuf messages, with their `.proto` files. It is normative and in English (R42); its version, an integer, and its rules are R135.
- [RUN.md](RUN.md) — the work plan, in epics (R19). Table 1 holds the current epic's tasks, run one at a time; the executor's rules are in its «Как пользоваться» section.
- [COORDINATION.md](COORDINATION.md) — the cross-repository plan (R76), in Russian: in what order the other repositories' tasks run, by repositories 6, toward the first app, and which waits for which. Each row points to a task in that repository's RUN.md, where the task itself lives (R19). «Что дальше по COORDINATION.md?» in a session of spec runs its coordinator, by the rules in its «Как пользоваться» section: it reads the other repositories on GitHub and changes none of them.
- [RULES.md](RULES.md) — the rules every NovaTrail repository shares, imported below.
- [repo-template/](repo-template/README.md) — the template every other NovaTrail repository starts from (repositories 2.2).
- [.bestpractices.json](.bestpractices.json) — spec's answers, in English, to the criteria of its OpenSSF Best Practices badge, project 15977. bestpractices.dev proposes them in its form, and the author saves them there (R48). A change that alters an answer changes the file too. The site takes no changed answer from the file by itself, so the session also gives the author a link to the form that proposes the changed fields with `overrides`, and the author saves them (the 2026-10-27 amendment to R48).
- [draft/](draft/README.md) — the prototype; where it differs from the documents, the documents win.

## Shared rules

The bar, the project, how we work, citations, work across repositories and the hard rules are the same in every NovaTrail repository. They live in [RULES.md](RULES.md), and this file imports them:

@RULES.md

## Environment

Open the repository in VS Code and choose "Reopen in Container". The container has Node.js, Go, buf and just (the `toolchain` stage of `.devcontainer/Dockerfile`), and the GitHub CLI and Claude Code on top. `just --list` names every recipe.

- `just docs-check` checks the documents — links, cited sections, the registers and every number cited from them, Mermaid diagrams, and the rules of `.claude/rules/` — and a task that touches them ends with it green; its code and its lock file are in `tools/`. In another NovaTrail repository, `just -f spec/justfile docs-check-repo` runs the same check on that repository's documents, with its citations of spec checked against its spec/ submodule (R32).
- `just inbox` reads table 3 of every other NovaTrail repository's RUN.md on GitHub through `gh`, on main and in open pull requests, and lists the rows «в реестр spec» that table 5 of RUN.md does not hold yet, and those that have changed since table 5 recorded them, by the fingerprint it keeps of them: a task begins with it, by rule 13 of RUN.md (R81).
- `.claude/settings.json` compacts a session at 400 thousand tokens, fetches no claude.ai connector, and runs the hook `UserPromptSubmit` of `tools/session/`, which stops a prompt that starts another task than the one the session has led and names `/clear`: one task is one session (R143; repositories 9.7).
- **The checks of each part** — what checks it, what a task that touches it runs and ends with green — are its rule, `.claude/rules/<part>.md`. Claude Code loads a rule when the session reads or edits a file its `paths` match, not when a script edits one, and compaction drops it until such a file is read again (R143; repositories 9.8): before changing a part, read its rule. The rules and their parts: [format](.claude/rules/format.md) — `format/`; [admission](.claude/rules/admission.md) — `admission/`; [deployment](.claude/rules/deployment.md) — `deployment/`; [legal](.claude/rules/legal.md) — `legal/`; [consent-age](.claude/rules/consent-age.md) — `consent-age/`; [export](.claude/rules/export.md) — `export/`; [contracts](.claude/rules/contracts.md) — `contracts/`, `buf.yaml` and `buf.gen.yaml`; [go](.claude/rules/go.md) — Go code and the Go modules; [types](.claude/rules/types.md) — `types/` and every schema; [ci](.claude/rules/ci.md) — CI, the release, the `toolchain` stage and `release-verify`: `.github/`, `.devcontainer/`, the justfile, `tools/release/` and `tools/toolchain/`; [tools](.claude/rules/tools.md) — the code of `tools/`, its tests and licenses, `tokens-report` and the session hook; [new-repo](.claude/rules/new-repo.md) — `repo-template/` and `just new-repo`.
- CI runs every check on every pull request and on `main`, and a merge waits for them (R30). A release of spec and its tag come out by themselves once CI passes on `main`: nobody tags by hand (R31).
- Every commit is signed off (`git commit -s`; Source Control does it by itself here, `git.alwaysSignOff`). The Markdown preview renders Mermaid diagrams (`bierner.markdown-mermaid`).
