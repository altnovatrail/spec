# INBOX.md — rows of other repositories recorded in spec

Table 5 of [RUN.md](../RUN.md): the rows «в реестр spec» of other repositories' tables 3 that `spec` has recorded, and where the answer went. `just inbox` tells new from recorded by it and sees a recorded row change (R81, R153).

- Read by the inbox triage only — on the author's word or once every task of the current epic is done (RUN.md rule 13).
- **Triage.** `just inbox` (needs `gh` signed in) reads other repositories' tables 3 on GitHub — `run/QUESTIONS.md`, or RUN.md until a repository moves to the layout of R153 — and prints the rows «в реестр spec» missing here, on `main` and "on the way" in open pull requests, and the rows here whose fingerprint on `main` changed.
  - A new row: record it as a decision, new or rewritten in its place (R160), a document change, open question or row of [DEBT.md](DEBT.md) — what the author has decided at once, the rest to the author with options and a recommendation. Then add it here with where the answer went.
  - A row "on the way" — only on the author's word: it may change before the merge.
  - A changed row: record what was added, the same way; write the fingerprint the recipe names (`—` until it names one). A row gone at its source — delete it here.
  - A triage larger than one review is a task of its own (RUN.md rule 11). Report its edits in a separate paragraph, as by rule 12.
  - A `due:` line is a date of measurements 1.9 (R145). Monthly measurement: measure all 13 repositories of this machine, `just tokens-report --project=… --since … --row`, from the end of the last row to the session's start, into measurements 1.9. Quarterly check of the Claude Code changelog: a task of analysis in [TASKS.md](TASKS.md). Then move the date and check the threshold of R145.
- Closed rows of COORDINATION.md, marked «(closed)» here: rule 4 of COORDINATION.md names the commit that still holds each.
- **Fingerprint:** the first 12 hexadecimal digits of the SHA-256 of all the cells of the rows a row of this table names, as the source's `main` holds them (R81).

## Table 5. Rows of other repositories recorded in spec

| Repository | Rows | Fingerprint | Where the answer is |
|---|---|---|---|
| `.github` | В46 | `00d23e55c9f4` | T330 (outside an epic), option (a) without exception: the mark of a row for spec in English, and every quote of a Russian text of spec in English |
| `app` | В71 | `634d45c040c5` | T194 (В48), option (a): the README of `draft/mockup/`, «Sizes», names 700 and 22–38 px as the template draws — T198 |
| `app` | В72 | `9da92a92a0ed` | T194 (В49), option (a): every country, `api`'s refusal the answer — architecture 3.1 and Д271, back to a method of `api` — T198 |
| `app` | В74 | `970eae2501b5` | T218 (В76), option (a): R161 — `canvas` leaves the statement out by `statement-hidden`, and `app` draws the card; architecture 3.1 and 3.2, COORDINATION rows 5.21 and 6.43 |
| `app` | В76 | `8ffcc7a26842` | option (a): R90 — on both screens of a task from paper back stands alone at every width, the screen's name its heading unseen |
| `canvas` | В89 | `c1a14214560d` | T331 (outside an epic), option (a): the template of the kind `typescript` raised to Playwright 1.65.1 |
| `infra` | В61 | `fa29925a7803` | T276 (В89), option (b): `docs-check` reads the comments `#`, `//` and `/* */` of `.tf`, `.tofu`, `.tfvars` and `.hcl`, R32; string literals stay unread, as В84 has it; `infra` turns red at none, by a trial on its `main` |
| `learner-model` | В59 | `24026412f458` | T332 (outside an epic), option (a): the register R with gaps, a number never given again, archives may cite one that left |
| `skill-map` | В16 | `e9461afac172` | option (a): Д88 and Д146 no longer name `skill-map`; Д217 and Д235, which named nothing else, deleted |
| `skill-map` | В17 | `c566707013bf` | T332 (outside an epic), option (a): `docs-check` does not take a section of an archive that falls back to `sources` or `measurements` |
| `tutor` | В98 | `7c3af9d6a1eb` | T276, option (a): in `spec` since v0.19.14 — the three comments of `format/vectors/leaks/` give their reason in words; `tutor` copies them by its next move to a tag |
