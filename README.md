# spec

[![CI](https://github.com/altnovatrail/spec/actions/workflows/ci.yml/badge.svg)](https://github.com/altnovatrail/spec/actions/workflows/ci.yml)
[![Release](https://github.com/altnovatrail/spec/actions/workflows/release.yml/badge.svg)](https://github.com/altnovatrail/spec/actions/workflows/release.yml)
[![CodeQL](https://github.com/altnovatrail/spec/actions/workflows/codeql.yml/badge.svg)](https://github.com/altnovatrail/spec/actions/workflows/codeql.yml)
[![Latest release](https://img.shields.io/github/v/release/altnovatrail/spec)](https://github.com/altnovatrail/spec/releases/latest)
[![Coverage](https://codecov.io/gh/altnovatrail/spec/branch/main/graph/badge.svg)](https://codecov.io/gh/altnovatrail/spec)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15977/badge)](https://www.bestpractices.dev/projects/15977)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/altnovatrail/spec/badge)](https://scorecard.dev/viewer/?uri=github.com/altnovatrail/spec)
[![License](https://img.shields.io/github/license/altnovatrail/spec)](LICENSE)

[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_spec&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_spec&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_spec&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_spec&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_spec&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=altnovatrail_spec)

Official standards, schemas, and guidelines for NovaTrail, a universal open platform for adaptive learning, interactive lessons, and AI tutoring.

NovaTrail turns any subject into interactive lessons with an AI tutor, for children and adults alike. A subject comes as a module that anyone can author: a graph of skills, lessons, tasks, typical mistakes, and the kind of canvas the learner works on. The learner writes, draws, types, moves things or speaks. The AI reads the work and talks with the learner, but whether an answer is right is decided by a program against the task's key, never by the model. A learner model brings together the skills of every module, and an engine picks what comes next.

## Status

Early design. This repository holds the platform's documents and the module format, in [format/](format/README.md): version 0.1, its text, schemas, examples and test vectors, which comes out as files for code with the release v0.3.0 and is still to be tried on the modules of the first slice. The types of the format for Go and TypeScript come next, and the contracts between components after it. NovaTrail succeeds [MathTrail](https://github.com/mathtrail), olympiad maths for grades 1–6, which is now frozen.

## Repositories

All under [altnovatrail](https://github.com/altnovatrail). Created now, for stages 0–2:

| Repository | What it is |
|---|---|
| spec | this repository: the vocabulary, formats, contracts and platform documents |
| .github | the organization's profile, community files and shared CI workflows |
| modules | the official modules: olympiad maths, school maths for grade 3 and short essays in English |
| module-kit | the module format in code — validation, packages, open views, check kinds — and the authors' CLI |
| learner-model | the learner model: how well each skill is mastered, from the evidence of attempts |
| engine | picks the next lesson or task |
| sim | virtual learners that test the learner model and the engine |
| tutor | the AI side: reading the work, the tutor's words, routes to AI, eval; a library inside api |
| api | the backend and the platform's only service: accounts, attempts, checks, the learner model, the engine |
| canvas | the canvases the learner works on, and their layers |
| skill-map | the learner's skill map |
| app | the web app for learners and the adults beside them |
| infra | shared infrastructure: Terraform, domains, deployment, self-hosting |

Later: site (stage 3); module-registry, module-pipeline and widget-template (stage 4).

How the parts fit together is in [docs/architecture.md](docs/architecture.md). The order in which the repositories appear, and how to set one up, is in [docs/repositories.md](docs/repositories.md); every repository starts from the same template, [repo-template/](repo-template/README.md), and follows the same rules, [RULES.md](RULES.md).

## Releases

A release comes out by itself once the checks pass on `main`: the next patch of the current line, tagged `vX.Y.Z` with the release, and nobody tags by hand. The module format has a version of its own, and a change that gives it a new version always starts a new line (R44). Other repositories take its tag as the `spec` submodule, for the documents and rules, and their code takes the release's files. From the line 0.3 on, a release carries the module format as `format-<version>.tar.gz`, with its cosign bundle `format-<version>.tar.gz.sigstore.json` beside it, and Go code takes the same tag as the version of the Go module `github.com/altnovatrail/spec`, whose package holds the format as `spec.Format`, with the types of the format in the packages `types/formatv0` and `types/formatv0/open` (R72). Releases are immutable, so a tag stays on its commit and no file changes once it is out, and GitHub attests each one with its files. To check a release and a file of it:

```
gh release verify v0.3.0 -R altnovatrail/spec
gh release verify-asset v0.3.0 format-0.1.tar.gz -R altnovatrail/spec
```

## Documents

The documents are in Russian; the module format is in English and normative.

- [docs/product.md](docs/product.md) — what we build and why: who it is for, the principles, the first slice, the roadmap and the open product questions.
- [docs/concepts.md](docs/concepts.md) — the shared vocabulary: module, skill, lesson, task, canvas, check, tutor, learner model and engine, with a glossary that names each term as code and schemas will.
- [docs/privacy.md](docs/privacy.md) — privacy and age: kinds of data, age categories, the two routes to AI, and what each AI provider's terms say about minors.
- [docs/architecture.md](docs/architecture.md) — the platform's big parts and how they connect: the components, one overall diagram, the main flows, and how the interface is put together.
- [docs/repositories.md](docs/repositories.md) — how the platform is split into repositories: their roles, dependencies, how changes flow between them, the order they appear in, how to set one up, and what is carried over from MathTrail.
- [docs/decisions.md](docs/decisions.md) — the decision log: what was decided, why, and what was rejected.
- [format/](format/README.md) — the module format: what a module may and must contain and how the platform checks it. Its text, the schemas of the manifest, the skill graph, the trap and technique catalogs, the solving steps, the task, with the checks of the task's answer slots, its hints and its templates, and the lesson, the generator of randomness, the shared taxonomy of skills, the layout of a module, the package of a module — its canonical view and its inventory — and the module index, which names every published version of every module, are written, with their examples, the test vectors of the YAML rules, of a whole module, of the manifest, of the skill graph, of the trap catalog, of the task and of the lesson, and the test vectors of the open view, of verdicts, of the leak check, of the generator, of templates, of tiers, of packages and of the module index, and `just format-check` checks them; the other parts of a module come as they are written.
- [RUN.md](RUN.md) — the work plan, in epics: the current epic broken into small tasks, run and reviewed one at a time, and the epics that come later.
- [draft/](draft/README.md) — a clickable prototype of the learner's app, and where it differs from the documents.

## Contributing

Report a bug or propose a change in an [issue](https://github.com/altnovatrail/spec/issues), in English or Russian, and open one before a pull request unless the pull request fixes a typo or a broken link. How a change comes in, with every commit signed off, and what every change keeps to are in the organization's [CONTRIBUTING.md](https://github.com/altnovatrail/.github/blob/main/CONTRIBUTING.md); the rules every NovaTrail repository shares are in [RULES.md](RULES.md). Report a vulnerability privately, as the [security policy](https://github.com/altnovatrail/spec/security/policy) says, never in a public issue.

Work in the devcontainer: open the repository in VS Code and choose "Reopen in Container". It holds every tool at the version the repository pins. The checks are recipes of the [justfile](justfile), and `just --list` names each with its arguments:

- `just docs-check` checks the documents: links, cited sections, the registers and Mermaid diagrams;
- `just format-check` checks the module format in [format/](format/README.md): its schemas, examples and test vectors, and computes the verdicts and traps of the vectors of verdicts, what the leak check finds in the vectors of the leak check and in the lessons of a module, the numbers of the vectors of the generator, the instances of the vectors of templates, with the results of their solvers as the vectors give them, the tiers of the vectors of tiers, the package of each module of the vectors of packages — its canonical view, the listing of its device part, its inventory and their digests —, and the module index that each vector of the index builds of its release, or the rule of the index that refuses it;
- `just types-check` checks the Go types of the module format under `types/`: that they are what `just types` generates from the schemas, and that each value of `format/` that passes a schema is read by its type and written back as it was;
- `just go-check` checks the Go module code takes from a release: vet, tests, that it requires nothing, and its zip as the Go module proxy will build it;
- `just licenses-check` checks the licenses of the packages of `tools/`;
- `just release-version` prints the version the next release takes, and `just release-files HEAD <folder>` builds the files it carries;
- `just coverage` runs every test of `tools/` and writes their coverage to `coverage/lcov.info`.

A check prints a line for each problem it finds, `file:line: message` for the documents and the format, and exits with a non-zero status if it finds any. CI runs them all on every pull request and on `main`, and a pull request merges only when they pass. Another NovaTrail repository checks its own documents with `just -f spec/justfile docs-check-repo`. The environment and the checks are described in more detail in the Environment section of [CLAUDE.md](CLAUDE.md).

## License

[Apache-2.0](LICENSE).
