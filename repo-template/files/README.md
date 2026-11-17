# {{name}}

[![CI](https://github.com/altnovatrail/{{name}}/actions/workflows/ci.yml/badge.svg)](https://github.com/altnovatrail/{{name}}/actions/workflows/ci.yml)
[![CodeQL](https://github.com/altnovatrail/{{name}}/actions/workflows/codeql.yml/badge.svg)](https://github.com/altnovatrail/{{name}}/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/altnovatrail/{{name}}/badge)](https://scorecard.dev/viewer/?uri=github.com/altnovatrail/{{name}})
[![License](https://img.shields.io/github/license/altnovatrail/{{name}})](LICENSE)

[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_{{name}}&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=altnovatrail_{{name}})
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_{{name}}&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=altnovatrail_{{name}})
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_{{name}}&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=altnovatrail_{{name}})
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_{{name}}&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=altnovatrail_{{name}})
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=altnovatrail_{{name}}&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=altnovatrail_{{name}})

<!-- FILL: what the component is and does, in two or three sentences, from its card, architecture {{card}} spec; in English. -->

A component of [NovaTrail](https://github.com/altnovatrail/spec), a universal open platform for adaptive learning, interactive lessons and AI tutoring. <!-- FILL: the stage it belongs to, from repositories 2.1 spec, as "It belongs to stage N, …" with the stage's name from product 11 spec. -->

## Documents

- [docs/architecture.md](docs/architecture.md) — the component: what it does and does not do, its data and links, and what is still to decide.
- [docs/decisions.md](docs/decisions.md) — the decision log: what was decided, why, and what was rejected.
- [RUN.md](RUN.md) — the work plan, in epics.
- `run/` — the plan's other tables: [the epics for later](run/EPICS.md), [the open questions](run/QUESTIONS.md), [the technical debt](run/DEBT.md) and [the tasks outside an epic](run/TASKS.md).

The working rules, for people and coding agents alike, are in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md). The platform's shared vocabulary, formats, contracts and decisions are in [spec](https://github.com/altnovatrail/spec), checked out here as a git submodule: clone this repository with `git clone --recurse-submodules`.
