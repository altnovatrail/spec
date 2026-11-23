# INBOX.md — rows of other repositories recorded in spec

Table 5 of [RUN.md](../RUN.md): the rows «в реестр spec» of other repositories' tables 3 that `spec` has recorded, and where the answer went. `just inbox` tells new from recorded by it and sees a recorded row change (R81, R153, R154).

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
| `.github` | В45 | `f702c4ba3e85` | T246, option (1): Д217's «When to return» names `skill-map` alone |
| `api` | В84 | `77f59e82e91d` | T218 (В74), option (1): nothing to record — T123 `api` took `learner-model` v0.1.16 with `"comments": true`; a copy is fixed at its source |
| `api` | В85 | `7651836e1f67` | T218 (В75), option (1): `learner-model` cites its own decisions in its `.proto` files as `R10 learner-model` — COORDINATION rows 4.22 and 6.42 |
| `app` | В71 | `634d45c040c5` | T194 (В48), option (a): the README of `draft/mockup/`, «Sizes», names 700 and 22–38 px as the template draws — T198 |
| `app` | В72 | `9da92a92a0ed` | T194 (В49), option (a): every country, `api`'s refusal the answer — architecture 3.1 and Д271, back to a method of `api` — T198 |
| `app` | В74 | `970eae2501b5` | T218 (В76), option (a): R161 — `canvas` leaves the statement out by `statement-hidden`, and `app` draws the card; architecture 3.1 and 3.2, COORDINATION rows 5.21 and 6.43 |
| `modules` | В41 | `5a1cbe7d4a2a` | T246, the author's option (a) of 2026-11-21: the deny of `modules/*/eval/` but `synthetic-*.json` for the clones of `.epics`, in spec's and the template's `.claude/settings.json` — T248 in run/TASKS.md |
