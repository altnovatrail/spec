# INBOX.md — rows of other repositories recorded in spec

Table 5 of [RUN.md](../RUN.md): the rows «в реестр spec» of other repositories' tables 3 that `spec` has recorded, and where the answer went. `just inbox` tells new from recorded by it and sees a recorded row change (R81, R153, R154).

- Read by the inbox triage only — on the author's word or once every task of the current epic is done (RUN.md rule 13).
- **Triage.** `just inbox` (needs `gh` signed in) reads other repositories' tables 3 on GitHub — `run/QUESTIONS.md`, or RUN.md until a repository moves to the layout of R153 — and prints the rows «в реестр spec» missing here, on `main` and "on the way" in open pull requests, and the rows here whose fingerprint on `main` changed.
  - A new row: record it as a decision, amendment, document change, open question or row of [DEBT.md](DEBT.md) — what the author has decided at once, the rest to the author with options and a recommendation. Then add it here with where the answer went.
  - A row "on the way" — only on the author's word: it may change before the merge.
  - A changed row: record what was added, the same way; write the fingerprint the recipe names (`—` until it names one). A row gone at its source — delete it here.
  - A triage larger than one review is a task of its own (RUN.md rule 11). Report its edits in a separate paragraph, as by rule 12.
  - A `due:` line is a date of measurements 1.9 (R145). Monthly measurement: measure all 13 repositories of this machine, `just tokens-report --project=… --since … --row`, from the end of the last row to the session's start, into measurements 1.9. Quarterly check of the Claude Code changelog: a task of analysis in [TASKS.md](TASKS.md). Then move the date and check the threshold of R145.
- Closed rows of COORDINATION.md, marked «(closed)» here: `git show 6eb3243:COORDINATION.md`, section «Закрытые строки».
- **Fingerprint:** the first 12 hexadecimal digits of the SHA-256 of all the cells of the rows a row of this table names, as the source's `main` holds them (2026-11-04 amendment to R81).

## Table 5. Rows of other repositories recorded in spec

| Repository | Rows | Fingerprint | Where the answer is |
|---|---|---|---|
| `.github` | В37 | `4d00f444967f` | T149 — second 2026-11-15 amendment to R143; measurements 1.7 |
| `.github` | В38 | `bc46602307ce` | T149 — 2026-11-15 amendment to R145; Д236 |
| `api` | В73 | `66f14a386ca0` | COORDINATION rows 5.13 and 6.22 (closed): `access_returns` — an `api` task after row 5.13; sources 2.8 |
| `api` | В77 | `bef02eff03d0` | COORDINATION rows 6.20 (closed) and 6.21 — `API_ADMISSION_RUNG`, `API_CATALOG_MODULES`, pair `api` `v0.1.48`; 2026-11-15 amendment to R76 |
| `api` | В78 | `40d016cbe27f` | COORDINATION row 6.25, option (a); row 6.14; 2026-11-15 amendment to R76 |
| `api` | В79 | `974837816a16` | option (a): second 2026-11-15 amendment to R82, 2026-11-15 amendments to R87 and R104; concepts 12; architecture 3.8 |
| `app` | В62 | `c65b0cefa0d7` | architecture 3.12; privacy 4, row «Logs»; COORDINATION row 6.14 |
| `app` | В63 | `172831a479cf` | COORDINATION row 6.16 (closed) |
| `app` | В65 | `d0f00ba64518` | `api` row В73: `own_key_limit` — T85 `api`, the return date — COORDINATION row 5.13; rows 6.13 (closed) and 6.14 |
| `engine` | В44 | `0b4d5733d830` | COORDINATION row 4.14 (closed) |
| `engine` | В45 | `ae38d14d0b13` | COORDINATION rows 4.14 (closed) and 4.19 (closed) |
| `engine` | В47 | `77d6867ef465` | COORDINATION row 4.19 (closed): no order of trials (R59 sim), nothing to record |
| `engine` | В49 | `14ce5f7be857` | COORDINATION row 4.19 (closed), option (a); 2026-11-15 amendment to R76 |
| `infra` | В36 | `1145af686e59` | COORDINATION rows 6.15 (closed) and 6.26, option (a); 2026-11-15 amendment to R76 |
| `learner-model` | В46 | `ac2b99a1334c` | COORDINATION rows 4.13 (closed), 4.15 (closed) and 4.16 (closed) |
| `learner-model` | В47 | `49595dcab7f6` | architecture 3.8 and concepts 11 |
| `learner-model` | В49 | `13dfb0e6d1d9` | COORDINATION row 7.8 (closed) |
| `learner-model` | В50 | `4eff276fb5be` | COORDINATION row 4.17; `sim` rows В16 and В24, R59 sim |
| `modules` | В40 | `48f8d58e80ac` | architecture 3.10 |
| `sim` | В15 | `f52cd5a8b9d9` | COORDINATION row 4.15 (closed) |
| `sim` | В16 | `9d2a1da19964` | COORDINATION rows 4.17 and 4.18; R59 sim |
| `sim` | В18 | `ee0369381801` | COORDINATION row 4.16 (closed) |
| `sim` | В19 | `1886df158d51` | COORDINATION rows 4.14 (closed) and 4.15 (closed) |
| `sim` | В20 | `0670f1de2597` | COORDINATION row 4.19 (closed) |
| `sim` | В21 | `91e57199ee3e` | 2026-11-15 amendment to R147; dpia 10.2, DPIA version 19; COORDINATION row 4.16 (closed) |
| `sim` | В22 | `284e30d5a4df` | 2026-11-15 amendment to R147; dpia 6.2, measure 7, and dpia 8; COORDINATION rows 4.17 and 4.18 |
| `sim` | В23 | `752109310518` | architecture 3.9 |
| `sim` | В24 | `1dfcfbb17ae4` | COORDINATION rows 4.17–4.19 (4.19 closed), item 4; R59 sim |
| `skill-map` | В9 | `91b6009e2a9c` | COORDINATION row 7.11 (closed) |
| `skill-map` | В10 | `b5ce90fa7789` | 2026-11-13 amendment to R19; Д235 |
| `tutor` | В79 | `0d6b22b7108f` | COORDINATION row 7.12 (closed); [repo-template/files/CLAUDE.md](../repo-template/files/CLAUDE.md), Environment; 2026-11-13 amendment to R19 |
| `tutor` | В80 | `8b4c92816494` | COORDINATION row 7.12 (closed); [tools/translation/README.md](../tools/translation/README.md); measurements 1.11; 2026-11-13 amendment to R145 |
| `tutor` | В81 | `43937f568736` | COORDINATION rows 5.9 (closed) and 6.13 (closed); Д222, Д223, Д225 |
| `tutor` | В83 | `70a1d451d540` | 2026-11-13 amendment to R146 |
| `tutor` | В84 | `5954d959dba4` | Д188 closed, Д214 narrowed to T84 `api` (with `api` row В75); the state of `tutor` in COORDINATION, section «Состояние» (closed) |
