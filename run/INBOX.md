# INBOX.md — rows of other repositories recorded in spec

Table 5 of [RUN.md](../RUN.md): the rows «в реестр spec» of other repositories' tables 3 that `spec` has recorded, and where the answer went. `just inbox` tells new from recorded by it and sees a recorded row change (R81, R153, R154).

- Read by the inbox triage only — on the author's word or once every task of the current epic is done (RUN.md rule 13).
- **Triage.** `just inbox` (needs `gh` signed in) reads other repositories' tables 3 on GitHub — `run/QUESTIONS.md`, or RUN.md until a repository moves to the layout of R153 — and prints the rows «в реестр spec» missing here, on `main` and "on the way" in open pull requests, and the rows here whose fingerprint on `main` changed.
  - A new row: record it as a decision, amendment, document change, open question or row of [DEBT.md](DEBT.md) — what the author has decided at once, the rest to the author with options and a recommendation. Then add it here with where the answer went.
  - A row "on the way" — only on the author's word: it may change before the merge.
  - A changed row: record what was added, the same way; write the fingerprint the recipe names (`—` until it names one). A row gone at its source — delete it here.
  - A triage larger than one review is a task of its own (RUN.md rule 11). Report its edits in a separate paragraph, as by rule 12.
  - A `due:` line is a date of measurements 1.9 (R145). Monthly measurement: measure all 13 repositories of this machine, `just tokens-report --project=… --since … --row`, from the end of the last row to the session's start, into measurements 1.9. Quarterly check of the Claude Code changelog: a task of analysis in [TASKS.md](TASKS.md). Then move the date and check the threshold of R145.
- Closed rows of COORDINATION.md, marked «(closed)» here: rule 4 of COORDINATION.md names the commit that still holds each.
- **Fingerprint:** the first 12 hexadecimal digits of the SHA-256 of all the cells of the rows a row of this table names, as the source's `main` holds them (2026-11-04 amendment to R81).

## Table 5. Rows of other repositories recorded in spec

| Repository | Rows | Fingerprint | Where the answer is |
|---|---|---|---|
| `.github` | В41 | `d4456a496679` | option 1: architecture 3.11, card `.github` — the composite action `toolchain` (R49 .github); COORDINATION row 2.5 closed, T69 and T72 `.github` done |
| `api` | В82 | `32b3cd3e5cf1` | option 1: the 2026-11-17 amendment to R135; the descriptions of `attempt_id`, `package_digest` and `observation` and export 9 — T189, COORDINATION row 1.23; Д263 closes with it; `correction_id` in version 4 — Д267 |
| `app` | В69 | `06d1aaf478e1` | one answer with `canvas` В82, option 1: the second 2026-11-17 amendment to R36 and the 2026-11-17 amendment to R74; architecture 3.2; the types — T189; COORDINATION rows 1.23 and 6.37 |
| `canvas` | В82 | `49a7284d0f7e` | as `app` В69; COORDINATION rows 1.23 and 5.19 |
| `canvas` | В86 | `5780f56f8aa3` | option 1: the third 2026-11-17 amendment to R148; the mockup — T189; COORDINATION rows 1.23, 5.19 and 6.18 |
| `infra` | В42, В44 | — | removed at source — В42 by T69 `infra`, В44 by T72 `infra`; В44 answered by the 2026-11-17 amendment to R68, the mode `single`; recorded on the author's word (T188), they leave at the next triage |
| `infra` | В49 | `d0458796c1fa` | option 1: privacy 4, «Logs», and architecture 3.11, the logs; `legal/` unchanged |
| `infra` | В51 | `c6c0d80248f4` | option (a): the 2026-11-17 amendment to R150; COORDINATION row 6.36; Д152 |
| `infra` | В52 | `d343f6d1e2e3` | option (a): the fifth 2026-11-17 amendment to R07; COORDINATION row 6.36 |
| `learner-model` | В54 | `887ae8041541` | option (a), the author's answer of 2026-11-16: the 2026-11-17 amendment to R157 — rows 4.20 and 4.21 done in R103's order, `sim` v0.1.28 and `learner-model` v0.1.13 |
| `sim` | В33 | `d2a441b49026` | option 1, with В31 and В32, removed at source in c92c331: the 2026-11-17 amendment to R157; dpia 6.2, 7, 8 and 10.2, version 28, whose PDF the author signs (R147) |
| `tutor` | В89 | `8cc27f8ea1a3` | option (a), the author's answer of 2026-11-16: the 2026-11-17 amendment to R71; product 10 |
| `tutor` | В91 | `1f887c6a4fe3` | option (a), the author's answer of 2026-11-16: the fifth 2026-11-17 amendment to R149; dpia 8 |
| `tutor` | В92 | `497d384c76bd` | option (a): the cache of the words' instructions in the Claude adapter, the words' model Opus 5.5 as it is, no decision changed; COORDINATION rows 5.17, 6.34 and 6.35 |
| `tutor` | В93 | `49561f549ec3` | the author's word of 2026-11-17, not the recommendation: one paid run of Д18 `tutor` now — the fourth 2026-11-17 amendment to R07 and the 2026-11-17 amendment to R51; COORDINATION rows 5.18, 3.12, 6.38 and 6.39 |
| `tutor` | В94 | `c7a2b1b71eba` | nothing to record: row 5.12 deleted by T187 (rule 4 of COORDINATION.md), `tutor` v0.1.46; the rung "full" — Д19 tutor, П-16 |
