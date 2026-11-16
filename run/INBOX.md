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
| `.github` | В39 | `0bdd5bea10d9` | T176 `run/TASKS.md`: one sentence for spec and every copy (author 2026-11-16, T172) |
| `.github` | В40 | `10c52b8885da` | T176: the heading of `toolchain` says the core holds what the release and the `ci-` recipes run; rows 7.15–7.25 are closed, every caller moved green (T171) |
| `app` | В66 | `274c164fd612` | option (a): COORDINATION row 5.14, its text in T172; architecture 3.2; row 6.14 — T62 waits for 5.14 |
| `app` | В67 | `edf21547ab7f` | T176, option (a) |
| `canvas` | В81 | `a00f4b93d5c2` | option (a): RULES.md, Hard rules, «Exact versions only»; second 2026-11-16 amendment to R40 |
| `engine` | В51 | `4261d173691e` | T176, option (b) — one sentence for all |
| `learner-model` | В52 | `8a29683e8ce8` | R157 and its 2026-11-16 amendment (T173): the start in `learner-model`, a band below; option (a), the trial series of `engine`, not taken; COORDINATION.md, row 4.20 |
| `learner-model` | В53 | `6bb501df02a5` | R157 and its 2026-11-16 amendment (T173): option (b), the risk accepted now, in version 24 of the DPIA — dpia 7, 8 and 10.2, item 10 |
| `module-kit` | В36 | `a7719f50f81c` | option 1: COORDINATION rows 2.5 and 3.11, their texts in T172 |
| `skill-map` | В12 | `bc314de2eccd` | option (a): architecture 3.3; COORDINATION row 6.19 (closed) |
| `skill-map` | В14 | `04791fad12e6` | T176: one sentence for all, and `measurements` suffixed «spec», as its option (a) |
| `tutor` | В85 | `d66629cadc52` | T176, one sentence for all rather than a copy's own |
