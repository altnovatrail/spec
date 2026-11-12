---
paths:
  - "deployment/**"
  - "tools/deployment/**"
---

# The deployment configuration: `deployment/`

The format of the deployment configuration is the file `/deployment.json` that `app` reads at its start, with the origin of `api` and the parameters of the sign-in service, and the rules by which a reader accepts it. It is normative and in English (R42); its version, an integer, and its rules are R85. Its text is [deployment/README.md](../../deployment/README.md).

`just deployment-check` checks the format of the deployment configuration in `deployment/` (R85): its VERSION, an integer, which the field `format` of the file holds; its schemas by the conventions of the format's, but for the fields of the file, whose names stay in camelCase as R09 app has them; the rules its text lists, in their order; its examples; and its test vectors of reading, whose files it reads by the schema and then by the rules, as `app` and the rollout read them (`tools/deployment/`), with a file accepted and one refused by the schema and by each rule among them; a task that touches `deployment/` ends with it green. A change to its schema runs `just types` and `just types-check` too (`.claude/rules/types.md`). `just release-version` refuses a commit that gives the format a new version in the line of the release before it (R85).
