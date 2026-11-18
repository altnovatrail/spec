---
paths:
  - "admission/**"
  - "tools/admission/**"
---

# The admission table: `admission/`

Its text is [admission/README.md](../../admission/README.md); what it is, [CLAUDE.md](../../CLAUDE.md#documents) says.

`just admission-check` checks the admission table in `admission/` (R96): its schemas by the conventions of the format's, the table against its schema and its rules, the rows of privacy 5.3 and the decisions and sections it cites against spec's documents, its examples, and its test vectors, whose answers it computes as the admission function of `tutor` does (`tools/admission/`); a task that touches `admission/` ends with it green. A change to its schema runs `just types` and `just types-check` too (`.claude/rules/types.md`). `just release-version` refuses a commit that gives the table a new version in the line of the release before it (R96).
