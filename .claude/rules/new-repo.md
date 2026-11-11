---
paths:
  - "repo-template/**"
  - "tools/new-repo/**"
---

# The template and new repositories

[repo-template/](../../repo-template/README.md) is the template every other NovaTrail repository starts from (repositories 2.2). `just new-repo <name> <kind> <card>` builds a new repository's working copy in `.repos/<name>` from `repo-template/` and the latest release tag of spec, and `just new-repo-check <name>` checks it once its gaps are filled (repositories 2.2). `.repos/` is outside this repository: Source Control shows each working copy as a repository of its own. A copy there is only built, filled and committed from here, and later given the CI files every repository shares, which are the same in each (R30); the component's own work happens in its own container, opened from a clone of its repository. That work includes what the component's code adds to its CI files — the job of its language, CodeQL's languages, its Dependabot ecosystem, its release — copied from architecture 3.3 .github (the 2026-10-21 amendment to R30).

A new repository's numeric ID goes into `tools/release/repositories.mjs` (`.claude/rules/ci.md`). The tests of the recipe are `just new-repo-test`.
