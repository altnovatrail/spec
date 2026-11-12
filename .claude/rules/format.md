---
paths:
  - "format/**"
  - "tools/format-check/**"
---

# The module format: `format/`

The module format is normative and in English (R42); its conventions are R45 and its versions R44. Its text is [format/README.md](../../format/README.md).

`just format-check` checks the module format in `format/` — each schema against the conventions of R45 and the 2020-12 meta-schema, each example against its schema, the YAML rules on every example and test vector, the layout of a module and its rules, the IDs in file names and the signatures of media files among them, on the examples and vectors laid out as one (R46, R51), the open view it builds of a part against each vector of the open view (R51), the verdicts it computes against each vector of verdicts, but for what Starlark gives a predicate (R56), with the trap that each wrong value matches, what its leak check finds against each vector of the leak check (R57) and in the texts of a lesson, for the keys of its tasks (R58), the numbers of its generator against each vector of the generator (R59), the instances of a template against each vector of templates, with the rules of a task on every instance and the results of its solver taken from the vector (R60, R61), the page of a workbook that `format/page.yaml` lays out against each vector of the page, and every task on a workbook against it (`task.workbook-page`; T88), the tiers against each vector of tiers and the package of a module — its canonical view, the listing of its device part, its inventory and their digests — against each vector of packages (R62), the module index that a release builds, or the rule of the index that refuses it, against each vector of the index (R63), the part of its version that a new version of a module raises, or the rule of versions that refuses it, against each vector of versions — the published versions laid out as modules, or as packages as files of an earlier version of the format (R89, R101) —, and the rules the text lists against their vectors — and a task that touches `format/` ends with it green.

With it, the types of the format: `just types-check`, and a change to a schema runs `just types` first (`.claude/rules/types.md`). `just release-version` refuses a commit that gives the module format a new version in the line of the release before it (R44).
