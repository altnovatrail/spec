# RULES.md — the rules every NovaTrail repository shares

Every NovaTrail repository's CLAUDE.md imports this file: spec's as `@RULES.md`, every other repository's as `@spec/RULES.md`, from spec checked out as a git submodule at an exact tag (R21 spec). A repository's role and its own documents are in its CLAUDE.md; what follows holds in all of them. The file changes only in spec, and a repository takes the new version with a new tag of spec.

The file is read in every repository, so whatever it cites from spec carries the suffix "spec": "repositories 8 spec", "R14 spec". spec's documents are under `docs/` in spec itself and under `spec/docs/` everywhere else.

## The bar

The documents are what everyone acts on: write them so that an engineer, a module author or a lawyer can act on them without asking what you meant. That bar is concrete:

- one term means one thing in every document; the vocabulary is concepts 15 spec;
- every claim about the outside world — a provider's terms, a price, a law — cites its source and the date it was read;
- a gap is never filled silently: it becomes an open question with options and a recommendation;
- a decision says why, and what was rejected.

## The project

NovaTrail is a universal open platform for adaptive learning, interactive lessons and AI tutoring, for any subject and any age (decision R01 spec). A subject comes as a module — data, not code and not instructions to a model (R02 spec). A program decides every verdict; the AI only reads the learner's work and words the tutor's replies (R03 spec). NovaTrail succeeds MathTrail, olympiad maths for grades 1–6, which is frozen; its ideas, code and content are carried over selectively (R01 spec). The platform is split into repositories from day one, and `spec` is their shared source of truth (R10 spec); which repositories there are and what they are called is R18 spec.

The name is written **NovaTrail**, with a capital T. Identifiers stay lowercase: the organization `altnovatrail`, `novatrail-spec`, `NOVATRAIL_DEVCONTAINER` (R13 spec).

## How we work

- The author runs tasks one at a time: «Выполни задачу Txx из RUN.md». Do only that task, by the rules in RUN.md.
- Before proposing a change, read the repository's decision log, `docs/decisions.md`, and the sections the change touches. Do not re-propose what a decision rejected without new evidence. If a decision has to change, ask the author and record the change.
- A decision is never rewritten. An amendment with its date goes at the end of the entry, or a new entry replaces it; the old one stays where it is, marked «Заменено», its text unedited.
- A new number — R, О-, П-, Т- — is the next one still free when it is written down, not when the work began: a parallel session may have taken one meanwhile. Each register's opening names the next free number; keep it current.
- Facts about AI providers, laws and prices come from the primary source, quoted with the date read. What could not be verified is not stated as fact: it becomes an open question.
- Project context lives in the repository's files, not in chat history.
- Do not commit: the author commits after review.
- Finish with a short report to the author in Russian: what was done, which files, what is still open.

## Citations

- A document is cited by its name and section: "product 7", "architecture 3.5". A repository cites its own documents and decisions without a suffix. Any other repository cites spec's with the suffix "spec" — "architecture 3.8 spec", "R18 spec" — and another NovaTrail repository's decisions with that repository's name, "R03 api".
- The open questions О-, П- and Т- are spec's registers — product 13, privacy 9 and repositories 8 spec — so their numbers need no suffix anywhere. A repository other than spec keeps no register of open questions: what it has still to decide is listed in its `docs/architecture.md`.
- MathTrail's decisions are cited as "R37 canvas-api" and "R213 standalone", or in a list as "canvas-api: R37, R38"; each log is numbered independently. MathTrail's repositories, [mathtrail/canvas-api](https://github.com/mathtrail/canvas-api) and [mathtrail/mathtrail-standalone](https://github.com/mathtrail/mathtrail-standalone), are not checked out in any NovaTrail repository. When a task needs them, clone them into a temporary directory, never into the repository.

## Across repositories

`spec` is what every repository shares: the vocabulary, the formats and contracts, the platform's documents and decisions, and these rules. Outside spec it is read-only, at the tag the repository pins, and a session changes neither spec nor any other repository from where it works.

- Some things belong in spec: a question that concerns more than one repository, a decision that settles one of spec's open questions, and any change to a component's card in architecture 3 spec. Outside spec, the session writes such a thing into table 3 of its RUN.md, marked «в реестр spec», with its options and recommendation, and names it in its report. The author has it recorded in spec, and that is where it gets its number.
- A component's card in architecture 3 spec is the summary; the repository's own `docs/architecture.md` is the detail. When the detail changes what the card says — what the component does and does not do, its data, its links — the card changes too, by the same route.
- A repository moves to a newer tag of spec on purpose, in a task of its own, and records it as a decision.

## Hard rules

- **Devcontainer only.** All work happens inside the devcontainer (`.devcontainer/`). If `NOVATRAIL_DEVCONTAINER` is not `1`, you are on the host: stop and ask the author to "Reopen in Container". "The change is only documents" is no reason to go on. The one exception is a cloud session of Claude Code that the author started for the task: it works without the container, and its report names every check it could not run.
- **Exact versions only.** No `latest`, floating tags or ranges. Images are pinned by tag and digest, tools by exact version, each where it is installed: an `ARG` in `.devcontainer/Dockerfile`, a literal in `.devcontainer/devcontainer.json`.
- **Language.** Documents under `docs/` and RUN.md are in Russian (R14 spec, R19 spec). Everything else — README.md, CLAUDE.md, AGENTS.md, RULES.md, code, comments, schema descriptions and prompts — is in English (R14 spec). Reports to the author are in Russian.
- **No learners' data in the repository.** No learner's name, work, handwriting, voice or photo, no email or account identifier — not even in examples, which are synthetic.
- **No secrets in the repository.** Keys and tokens live in environment variables or a secret manager, never in a committed file.
- **Licenses.** Everything is Apache-2.0 — code, documents and the official modules' content (R12 spec, R20 spec). The one exception is the code of conduct in `.github`: it is the Contributor Covenant 2.1 with its placeholder for how to report filled in, and it keeps that text's license, CC BY 4.0, as the file says (R22 spec). Add only dependencies whose licenses are compatible with Apache-2.0. Which licenses third-party modules may carry is still open (О-10).
- **Learners' data first.** Anything that touches a learner's data is read against privacy spec before it is proposed.
