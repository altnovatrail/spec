# spec

Official standards, schemas, and guidelines for NovaTrail, a universal open platform for adaptive learning, interactive lessons, and AI tutoring.

NovaTrail turns any subject into interactive lessons with an AI tutor, for children and adults alike. A subject comes as a module that anyone can author: a graph of skills, lessons, tasks, typical mistakes, and the kind of canvas the learner works on. The learner writes, draws, types, moves things or speaks. The AI reads the work and talks with the learner, but whether an answer is right is decided by a program against the task's key, never by the model. A learner model brings together the skills of every module, and an engine picks what comes next.

## Status

Early design. This repository holds the platform's first documents; the module format and the contracts between components come next. NovaTrail succeeds [MathTrail](https://github.com/mathtrail), olympiad maths for grades 1–6, which is now frozen.

## Repositories

All under [altnovatrail](https://github.com/altnovatrail). Created now, for stages 0–2:

| Repository | What it is |
|---|---|
| spec | this repository: the vocabulary, formats, contracts and platform documents |
| .github | the organization's profile, community files and shared CI workflows |
| modules | the official modules: olympiad maths and Spanish A1 |
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

A release comes out by itself once the checks pass on `main`: the next patch of the current line, tagged `vX.Y.Z` with the release, and nobody tags by hand. A release holds no files yet; other repositories take its tag as the `spec` submodule. Releases are immutable, so a tag stays on its commit, and GitHub attests each one. To check a release:

```
gh release verify v0.2.0 -R altnovatrail/spec
```

## Documents

The documents are in Russian.

- [docs/product.md](docs/product.md) — what we build and why: who it is for, the principles, the first slice, the roadmap and the open product questions.
- [docs/concepts.md](docs/concepts.md) — the shared vocabulary: module, skill, lesson, task, canvas, check, tutor, learner model and engine, with a glossary that names each term as code and schemas will.
- [docs/privacy.md](docs/privacy.md) — privacy and age: kinds of data, age categories, the two routes to AI, and what each AI provider's terms say about minors.
- [docs/architecture.md](docs/architecture.md) — the platform's big parts and how they connect: the components, one overall diagram, the main flows, and how the interface is put together.
- [docs/repositories.md](docs/repositories.md) — how the platform is split into repositories: their roles, dependencies, how changes flow between them, the order they appear in, how to set one up, and what is carried over from MathTrail.
- [docs/decisions.md](docs/decisions.md) — the decision log: what was decided, why, and what was rejected.
- [RUN.md](RUN.md) — the work plan, in epics: the current epic broken into small tasks, run and reviewed one at a time, and the epics that come later.
- [draft/](draft/README.md) — a clickable prototype of the learner's app, and where it differs from the documents.

## License

[Apache-2.0](LICENSE).
