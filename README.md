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

NovaTrail turns any subject into interactive lessons with an AI tutor, for children and adults alike. A subject comes as a module that anyone can author: a graph of skills, lessons, tasks, typical mistakes, and the kind of canvas the learner works on. The learner writes, draws, types, moves things or speaks. The AI reads the work and talks with the learner, but whether an answer is right is decided by a program against the task's key, never by the model. A learner model brings together the skills of every module, and an engine picks what comes next. NovaTrail succeeds [MathTrail](https://github.com/mathtrail), olympiad maths for primary school, which is now frozen.

spec is the shared source of truth of NovaTrail's repositories, and runs nothing itself: it holds the vocabulary, the documents and the decisions of the platform, the formats every component reads — the [module format](format/README.md) among them — and the [API contracts](contracts/README.md), and the rules every repository follows. Each of the other repositories — the components of [the architecture](docs/architecture.md), the official modules and the shared infrastructure — starts from its template, takes spec as a git submodule, pinned to a tag of its release, for the documents and the rules, and takes the files of that release in its code: the module format, its types and the code of the contracts. The repositories and how they depend on one another are in [docs/repositories.md](docs/repositories.md); the documents, the releases and how to contribute are in [docs/](docs/README.md).
