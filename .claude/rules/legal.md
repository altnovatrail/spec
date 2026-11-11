---
paths:
  - "legal/**"
  - "tools/legal/**"
---

# The legal texts: `legal/`

The legal texts of the platform — the privacy policy, the terms of use, the consents, the sets of texts of the samples page and the volunteer's form — are each a version of its own that never changes once in force, with the passport `legal.yaml` that names their versions, status and gist in the languages of the interface. They are normative and in English (R42); their version, an integer, and their rules are R130. Their text is [legal/README.md](../../legal/README.md).

`just legal-check` checks the legal texts in `legal/` (R130): its VERSION, an integer, which the field `format` of the passport holds; its schemas by the conventions of the format's; the rules its text lists, in their order; its examples; its test vectors of reading, whose cases it reads by the schema and then by the rules, as `api` and the build of the samples page read them (`tools/legal/`), with a part accepted and one refused by the schema and by each rule among them; and the part itself, `legal.yaml` and the files under `texts/`, read the same way against the part of the release before — the newest release tag in the history of HEAD, other than HEAD's own unless the working tree changes `legal/` (`tools/release/previous.mjs`, as `contracts-check` finds the release `buf breaking` compares with) —, so that a version in force stays as it was, byte for byte; a task that touches `legal/` ends with it green. A change to its schema runs `just types` and `just types-check` too (`.claude/rules/types.md`).

A self-hosted copy's operator checks its own folder — `VERSION`, `legal.yaml` and `texts/` — from its repository's root by `just -f spec/justfile legal-check-dir <folder>`, against this spec's schema and its rules but `legal.in-force-unchanged`. `just release-version` refuses a commit that gives the legal texts a new version in the line of the release before it (R130).
