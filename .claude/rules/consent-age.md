---
paths:
  - "consent-age/**"
  - "tools/consent-age/**"
---

# The age of digital consent: `consent-age/`

Its text is [consent-age/README.md](../../consent-age/README.md); what it is, [CLAUDE.md](../../CLAUDE.md#documents) says.

`just consent-age-check` checks the table in `consent-age/`: its VERSION, an integer, which the field `format` of the table holds; its schemas by the conventions of the format's, with the 249 codes of ISO 3166-1 as the countries of the table's schema; the rules its text lists, in their order; its examples; its test vectors of reading, with a table accepted and one refused by the schema and by each rule, and of the category, which it computes as its text does, with every category and both answers to asking the age again among them (`tools/consent-age/`); and the table itself, against the table of the release before, found as `legal-check` finds it (`tools/release/previous.mjs`), so that an entry's age and day stay as they were; a task that touches `consent-age/` ends with it green. A change to its schema runs `just types` and `just types-check` too (`.claude/rules/types.md`). `just release-version` refuses a commit that gives the table a new version in the line of the release before it.
