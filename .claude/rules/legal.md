---
paths:
  - "legal/**"
  - "tools/legal/**"
---

# The legal texts: `legal/`

Their text is [legal/README.md](../../legal/README.md); what it is, [CLAUDE.md](../../CLAUDE.md#documents) says.

`just legal-check` checks the legal texts in `legal/` (R130): its VERSION, an integer, which the field `format` of the passport holds; its schemas by the conventions of the format's; the rules its text lists, in their order; its examples; its test vectors of reading, whose cases it reads by the schema and then by the rules, as `api` and the build of the samples page read them (`tools/legal/`), with a part accepted and one refused by the schema and by each rule among them; and the part itself, `legal.yaml` and the files under `texts/`, read the same way against the part of the release before — the newest release tag in the history of HEAD, other than HEAD's own unless the working tree changes `legal/` (`tools/release/previous.mjs`, as `contracts-check` finds the release `buf breaking` compares with) —, so that a version in force stays as it was, byte for byte; a task that touches `legal/` ends with it green. A change to its schema runs `just types` and `just types-check` too (`.claude/rules/types.md`).

A self-hosted copy's operator checks its own folder — `VERSION`, `legal.yaml` and `texts/` — from its repository's root by `just -f spec/justfile legal-check-dir <folder>`, against this spec's schema and its rules but `legal.in-force-unchanged`. `just release-version` refuses a commit that gives the legal texts a new version in the line of the release before it (R130).
