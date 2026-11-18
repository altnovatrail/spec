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
| `.github` | В42 | `f911aa1104f1` | T194 (В44), the author's word, not the recommendation: all in English — commits, pull requests and issues, a person's too; amendments to R22 and R14, COORDINATION row 2.6 for `.github` — T198 |
| `.github` | В43 | `4acd380e9e8e` | T194 (В45), option 1: Д134, Д195 and Д236 closed — done in every repository they named, checked on `main` 2026-11-17 |
| `api` | В82 | `32b3cd3e5cf1` | option 1: the 2026-11-17 amendment to R135; the descriptions of `attempt_id`, `package_digest` and `observation` and export 9 — T189, COORDINATION row 1.23; Д263 closes with it; `correction_id` in version 4 — Д267 |
| `api` | В83 | `2afbffa6b175` | T194 (В46), option (а) without its growth: a restore key by the prefix without the hash of `go.sum`, `mod` dropped on a partial hit, `build` and `lint` not touched — COORDINATION row 2.7 for `.github`, amendments to R41 and R49 .github, T198 |
| `app` | В69 | `e7ae2810b23f` | one answer with `canvas` В82, option 1: the second 2026-11-17 amendment to R36 and the 2026-11-17 amendment to R74; architecture 3.2; the types — T189; COORDINATION rows 1.23 and 6.37 |
| `app` | В71 | `fa75441ffd4a` | T194 (В48), option (a): the README of `draft/mockup/`, «Sizes», names 700 and 22–38 px as the template draws — T198 |
| `app` | В72 | `9da92a92a0ed` | T194 (В49), option (a): every country, `api`'s refusal the answer — architecture 3.1 and Д271, back to a method of `api` — T198 |
| `app` | В73 | `a576333b2d29` | T194 (В50), option (a) then (b) as one rule: an amendment to R78 — the packages raise the icon set together and on purpose, a row of COORDINATION.md each raise, Dependabot raises none; first `canvas` to 1.2.99 — T198, COORDINATION rows 5.20, 6.40 and 6.41 |
| `canvas` | В82 | `49a7284d0f7e` | as `app` В69; COORDINATION rows 1.23 and 5.19 |
| `canvas` | В86 | `5780f56f8aa3` | option 1: the third 2026-11-17 amendment to R148; the mockup — T189; COORDINATION rows 1.23, 5.19 and 6.18 |
| `infra` | В56 | `c3ccd2adfd58` | T194 (В55), option (a): COORDINATION row 6.26 closed, no row for E7 `infra` (Д240, Д249) — T198; Д239 closed by T194 |
| `infra` | В57 | `002552bf6b2a` | T194 (В56), option (a): rows 6.36, 6.39, 3.13 and 6.38 close, and Д152, once T78 `infra` is `[x]` in its archive — T198 |
| `learner-model` | В54 | `887ae8041541` | option (a), the author's answer of 2026-11-16: the 2026-11-17 amendment to R157 — rows 4.20 and 4.21 done in R103's order, `sim` v0.1.28 and `learner-model` v0.1.13 |
| `learner-model` | В55 | `6fb838e6b319` | nothing to record — T194 (В57): rows 4.20, 4.21 and 6.28 deleted by T187, `api` on v0.1.13, as `learner-model` В54 |
| `learner-model` | В56 | `6194ca215b70` | T194 (В58), option (a): `tokens-report` prints the context of each session's first 80 main calls, a column of `--row`; an amendment to R145 — T199 |
| `learner-model` | В57 | `eb211eb41758` | T194 (В59), option (a): a sentence of RULES.md, How we work — a long run in the background, waited for by its notification or a Monitor; an amendment to R143 — T198 |
| `sim` | В33 | `dc9e55f87f13` | option 1, with В31 and В32 (those two removed at source in c92c331): the 2026-11-17 amendment to R157; dpia 6.2, 7, 8 and 10.2, version 28, whose PDF the author signs (R147) |
| `tutor` | В89 | `8cc27f8ea1a3` | option (a), the author's answer of 2026-11-16: the 2026-11-17 amendment to R71; product 10 |
| `tutor` | В91 | `1f887c6a4fe3` | option (a), the author's answer of 2026-11-16: the fifth 2026-11-17 amendment to R149; dpia 8 |
| `tutor` | В92 | `eed7aecfd7d3` | option (a): the cache of the words' instructions in the Claude adapter, the words' model Opus 5.5 as it is, no decision changed; COORDINATION rows 5.17, 6.34 and 6.35; T167 tutor, v0.1.49, made the cache, and by T194 (В52) COORDINATION row 5.17 closes and row 6.35 checks the mean of `Price` by the share of hits, T198 |
| `tutor` | В93 | `9215a990cab7` | the author's word of 2026-11-17, not the recommendation: one paid run of Д18 `tutor` now — the fourth 2026-11-17 amendment to R07 and the 2026-11-17 amendment to R51; COORDINATION rows 5.18, 3.12, 6.38 and 6.39; the run, T166 tutor, found 24 px no worse — T194 (В53), by the branch decided beforehand: an amendment to R51, COORDINATION rows 5.18 and 3.12 deleted, T198 |
| `tutor` | В94 | `c7a2b1b71eba` | nothing to record: row 5.12 deleted by T187 (rule 4 of COORDINATION.md), `tutor` v0.1.46; the rung "full" — Д19 tutor, П-16 |
| `tutor` | В96 | `7e7495a8c10f` | T194 (В51), option (a), done: `api` T112 (R94 api, v0.1.64) logs `cache_write_tokens` and `cache_read_tokens`, deployed by `infra` T81; COORDINATION row 6.34 closed — T198 |
