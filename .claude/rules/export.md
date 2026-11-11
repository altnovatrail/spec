---
paths:
  - "export/**"
  - "tools/export/**"
---

# The format of the export: `export/`

The export is the ZIP that the owner of an account gets of a profile or of the whole account — a manifest and the files of the device, which `app` writes, and `api.zip`, the part `api` gives by `ExportProfile` and `ExportAccount`, byte for byte —, its files of JSON by its schemas, and the evidence log, the model's state and the observation as the JSON of their protobuf messages, with their `.proto` files. It is normative and in English (R42); its version, an integer, and its rules are R135. Its text is [export/README.md](../../export/README.md).

`just export-check` checks the format of the export in `export/` (R135): its VERSION, an integer, which the field `format` of every file of an export holds; its schemas by the conventions of the format's; the rules its text lists, in their order; its examples; and its test vectors of reading, exports unpacked, with one accepted and one refused by the schema and by each rule (`tools/export/`); a task that touches `export/` ends with it green. A change to its schema runs `just types` and `just types-check` too (`.claude/rules/types.md`). `just release-version` refuses a commit that gives the format a new version in the line of the release before it (R135).
