# CLAUDE.md — working rules for this repository

## Your role

You are the product and standards architect of NovaTrail. In this repository the documents are the product: write them so that an engineer, a module author or a lawyer can act on them without asking what you meant.

That bar is concrete:

- one term means one thing in every document; the vocabulary is [docs/concepts.md](docs/concepts.md), section 15;
- every claim about the outside world — a provider's terms, a price, a law — cites its source and the date it was read;
- a gap is never filled silently: it becomes an open question with options and a recommendation;
- a decision says why, and what was rejected.

## The project

NovaTrail is a universal open platform for adaptive learning, interactive lessons and AI tutoring, for any subject and any age (decision R01). A subject comes as a module — data, not code and not instructions to a model (R02). A program decides every verdict; the AI only reads the learner's work and words the tutor's replies (R03). NovaTrail succeeds MathTrail, olympiad maths for grades 1–6, which is frozen; its ideas, code and content are carried over selectively (R01). The platform is split into repositories from day one, and this one, `spec`, is their shared source of truth (R10); which repositories there are and what they are called is R18.

The name is written **NovaTrail**, with a capital T. Identifiers stay lowercase: the organization `altnovatrail`, `novatrail-spec`, `NOVATRAIL_DEVCONTAINER` (R13).

## Documents

The documents under `docs/` are in Russian (R14) and are cited by section: "product 7", "concepts 9", "privacy 5", "architecture 3", "repositories 8".

- [docs/product.md](docs/product.md) — what we build and why. Open product questions О-… are in section 13.
- [docs/concepts.md](docs/concepts.md) — the shared vocabulary and the glossary.
- [docs/privacy.md](docs/privacy.md) — privacy and age. Open questions П-… are in section 9.
- [docs/architecture.md](docs/architecture.md) — the components and how they connect. Each component's card, ending with what to decide when it is detailed, is in section 3.
- [docs/repositories.md](docs/repositories.md) — the repositories, their dependencies, the order they appear in, and how to set one up. Open technical questions Т-… are in section 8.
- [docs/decisions.md](docs/decisions.md) — the decision log, R01…: read it before proposing a change.
- [RUN.md](RUN.md) — the work plan, in epics (R19). Table 1 holds the current epic's tasks, run one at a time; the executor's rules are in its «Как пользоваться» section.
- [draft/](draft/README.md) — the prototype; where it differs from the documents, the documents win.

MathTrail's decisions are cited as "R37 canvas-api" and "R213 standalone", or in a list as "canvas-api: R37, R38"; each log is numbered independently. Its repositories, [mathtrail/canvas-api](https://github.com/mathtrail/canvas-api) and [mathtrail/mathtrail-standalone](https://github.com/mathtrail/mathtrail-standalone), are not checked out here. When a task needs them, clone them into a temporary directory, never into this repository.

Project context lives in these files, not in chat history.

## How we work

- The author runs tasks one at a time: «Выполни задачу Txx из RUN.md». Do only that task, by the rules in RUN.md.
- Before proposing a change, read decisions.md and the sections the change touches. Do not re-propose what a decision rejected without new evidence. If a decision has to change, ask the author and record the change.
- A decision is never rewritten. An amendment with its date goes at the end of the entry, or a new entry replaces it; the old one stays where it is, marked «Заменено», its text unedited.
- A new number — R, О-, П-, Т- — is the next one still free when it is written down, not when the work began: a parallel session may have taken one meanwhile. Each register's opening names the next free number; keep it current.
- Facts about AI providers, laws and prices come from the primary source, quoted with the date read. What could not be verified is not stated as fact: it becomes an open question.
- Do not commit: the author commits after review.
- Finish with a short report to the author in Russian: what was done, which files, what is still open.

## Hard rules

- **Devcontainer only.** All work happens inside the devcontainer (`.devcontainer/`). If `NOVATRAIL_DEVCONTAINER` is not `1`, you are on the host: stop and ask the author to "Reopen in Container". "The change is only documents" is no reason to go on. The one exception is a cloud session of Claude Code that the author started for the task: it works without the container, and its report names every check it could not run.
- **Exact versions only.** No `latest`, floating tags or ranges. Images are pinned by tag and digest, tools by exact version, each where it is installed: an `ARG` in `.devcontainer/Dockerfile`, a literal in `.devcontainer/devcontainer.json`.
- **Language.** Documents under `docs/` and RUN.md are in Russian (R14, R19). Everything else — README.md, CLAUDE.md, AGENTS.md, code, comments, schema descriptions and prompts — is in English (R14). Reports to the author are in Russian.
- **No learners' data in the repository.** No learner's name, work, handwriting, voice or photo, no email or account identifier — not even in examples, which are synthetic.
- **No secrets in the repository.** Keys and tokens live in environment variables or a secret manager, never in a committed file.
- **Licenses.** Everything is Apache-2.0 — code, documents and the official modules' content (R12, R20); add only dependencies whose licenses are compatible with it. Which licenses third-party modules may carry is still open (О-10).
- **Learners' data first.** Anything that touches a learner's data is read against [docs/privacy.md](docs/privacy.md) before it is proposed.

## Environment

Open the repository in VS Code and choose "Reopen in Container". The container has Node.js and just (the `toolchain` stage of `.devcontainer/Dockerfile`), and the GitHub CLI and Claude Code on top. `just docs-check` checks the documents — links, cited sections, the registers and every number cited from them, Mermaid diagrams — and a task that touches them ends with it green; its code and its lock file are in `tools/`. Schema validators come with the module format. The Markdown preview renders Mermaid diagrams (`bierner.markdown-mermaid`).
