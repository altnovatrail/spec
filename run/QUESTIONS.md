# QUESTIONS.md — questions to the author of spec

Table 3 of [RUN.md](../RUN.md): the author's open questions that tasks leave (R153, R154, R160).

- Never read whole: take the rows the task and its sections name — `grep -n '^| В35 ' run/QUESTIONS.md`.
- A row is a question a task leaves open (RUN.md rule 9). Record the author's answer where it belongs — the task, a document or [DEBT.md](DEBT.md) — and delete the row.
- Rows «в реестр spec» of other repositories are triaged by RUN.md rule 13 into table 5, [INBOX.md](INBOX.md), not here.

## Table 3. Questions to the author

Numbers are not reused: next — В70.

| ID | Question | From | Options | Recommendation |
|---|---|---|---|---|
| В69 | A move to a tag of `spec`: В61 says «a commit and a README line, not an entry», but a README names no tag (the 2026-11-17 amendment to R21) — the tag is named by the line `spec/` — spec at `vX` of CLAUDE.md and «a submodule at tag vX» of RUN.md, which `new-repo-check` reads. Which line does a move change? | T203; R21, R160 | 1) The commit, which says why, and those lines of CLAUDE.md and RUN.md; the README stays without a tag. 2) The commit alone: CLAUDE.md and RUN.md name the submodule without its tag (В60: a document names the file, not the value); the template, `new-repo-check` and T206 change. 3) A README line naming the tag, as В61 reads: R21 changes again. | 1: the lines exist and a move already rewrites them, and R21 holds; 2 saves two edits a move but a session runs `git -C spec describe --tags` to know its tag. |
