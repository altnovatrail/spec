---
paths:
  - "format/**"
  - "tools/format-check/**"
---

# The module format: `format/`

Its text is [format/README.md](../../format/README.md); what it is, [CLAUDE.md](../../CLAUDE.md#documents) says.

`just format-check` checks the module format in `format/` — each schema against the conventions of `format/README.md` and the 2020-12 meta-schema, each example against its schema, the YAML rules on every example and test vector, the layout of a module and its rules, the IDs in file names and the signatures of media files among them, on the examples and vectors laid out as one, the open view it builds of a part against each vector of the open view, the verdicts it computes against each vector of verdicts, but for what Starlark gives a predicate, with the trap that each wrong value matches, what its leak check finds against each vector of the leak check and in the texts of a lesson, for the keys of its tasks, the numbers of its generator against each vector of the generator, the instances of a template against each vector of templates, with the rules of a task on every instance and the results of its solver taken from the vector, the page of a workbook that `format/page.yaml` lays out against each vector of the page, and every task on a workbook against it (`task.workbook-page`), the tiers against each vector of tiers and the package of a module — its canonical view, the listing of its device part, its inventory and their digests — against each vector of packages, the module index that a release builds, or the rule of the index that refuses it, against each vector of the index, the part of its version that a new version of a module raises, or the rule of versions that refuses it, against each vector of versions — the published versions laid out as modules, or as packages as files of an earlier version of the format —, and the rules the text lists against their vectors — and a task that touches `format/` ends with it green.

With it, the types of the format: `just types-check`, and a change to a schema runs `just types` first (`.claude/rules/types.md`). `just release-version` refuses a commit that gives the module format a new version in the line of the release before it.
