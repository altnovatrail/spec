---
paths:
  - "types/**"
  - "tools/types/**"
  - "**/schemas/**"
---

# The types of spec: `types/`

`just types-check` checks the types of spec, the packages `types/formatv0` and `types/formatv0/open`, `types/admissionv0` of the admission table, `types/deploymentv1` of the deployment configuration, `types/legalv3` of the passport of the legal texts, `types/consentagev1` of the table of the age of digital consent and `types/exportv5` of the files of an export, in Go and in TypeScript beside it, which `just types` generates from the schemas by `tools/types`. They must be what it generates, file for file. Each value of `format/`, `admission/`, `deployment/`, `legal/`, `consent-age/` and `export/` that passes a schema must be read by its Go type and written back as it was, by `tools/types/roundtrip`, a module of its own too. And `tsc` must take it as a value of its TypeScript type, from the npm package `@altnovatrail/spec` packed of the working tree; a task that changes a schema runs `just types` and ends with it green.

Beside them, `types/canvas/` holds the types of the element `<novatrail-canvas>`, the contract of `canvas` and `app`, which are written by hand and which `just types` leaves as they are. `tsc` takes them by `tools/types/canvas.check.ts`, with the DOM, from the same package, and holds the element's marks to the message `Mark` of the contract between `app` and `api`, `novatrail.api.v1`, from the npm package of the contracts' code built of the working tree.

`just types` also writes the page of the workbook as JSON, `format/page.json` and its vectors, under `types/page/`. The Go code of the types is checked by the Go recipes too: `.claude/rules/go.md`.
