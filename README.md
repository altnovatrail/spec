# spec
Official standards, schemas, and guidelines for NovaTrail, a universal open platform for adaptive learning, interactive lessons, and AI tutoring.

NovaTrail turns any subject into interactive lessons with an AI tutor, for children and adults alike. A subject comes as a module that anyone can author: a graph of skills, lessons, tasks, typical mistakes, and the kind of canvas the learner works on. The learner writes, draws, types, moves things or speaks. The AI reads the work and talks with the learner, but whether an answer is right is decided by a program against the task's key, never by the model. A learner model brings together the skills of every module, and an engine picks what comes next.

## Status

Early design. This repository holds the platform's first documents; the module format and the contracts between components come next. NovaTrail succeeds [MathTrail](https://github.com/mathtrail), olympiad maths for grades 1–6, which is now frozen.

## Repositories

Planned, all under [altnovatrail](https://github.com/altnovatrail):

| Repository | What it is |
|---|---|
| spec | this repository: the vocabulary, formats, contracts and platform documents |
| cognitive-model | the learner model: how well each skill is mastered, from the evidence of attempts |
| engine | picks the next lesson or task |
| sim | virtual learners that test the learner model and the engine |
| canvas-api | the backend: accounts, sessions, checks, the tutor, routes to AI |
| canvas-shell | the web app for learners and the adults beside them |
| map-ui | the learner's skill map |
| module-registry | the catalogue of modules: checks and publishing |
| dataset-pipeline | help for module authors: tagging, task variants, checks |
| module-template-ui | a starting point for a module's widgets |

Official modules live outside this repository; whether in one repository or in one each is still open. The order in which the repositories appear is in [docs/repositories.md](docs/repositories.md).

## Documents

The documents are in Russian.

- [docs/product.md](docs/product.md) — what we build and why: who it is for, the principles, the first slice, the roadmap and the open product questions.
- [docs/concepts.md](docs/concepts.md) — the shared vocabulary: module, skill, lesson, task, canvas, check, tutor, learner model and engine, with a glossary that names each term as code and schemas will.
- [docs/privacy.md](docs/privacy.md) — privacy and age: kinds of data, age categories, the two routes to AI, and what each AI provider's terms say about minors.
- [docs/repositories.md](docs/repositories.md) — how the platform is split into repositories: their roles, dependencies, data flows, order of appearance, and what is carried over from MathTrail.
- [docs/decisions.md](docs/decisions.md) — the decision log: what was decided, why, and what was rejected.
- [draft/](draft/README.md) — a clickable prototype of the learner's app, and where it differs from the documents.

## License

[Apache-2.0](LICENSE).
