# QUESTIONS.md — questions to the author of spec

Table 3 of [RUN.md](../RUN.md): the author's open questions that tasks leave (R153, R154, R160).

- Never read whole: take the rows the task and its sections name — `grep -n '^| В35 ' run/QUESTIONS.md`.
- A row is a question a task leaves open (RUN.md rule 9). Record the author's answer where it belongs — the task, a document or [DEBT.md](DEBT.md) — and delete the row.
- Rows «в реестр spec» of other repositories are triaged by RUN.md rule 13 into table 5, [INBOX.md](INBOX.md), not here.

## Table 3. Questions to the author

Numbers are not reused: next — В83.

| ID | Question | From | Options | Recommendation |
|---|---|---|---|---|
| В82 | `BeginPaperAttempts` closes every open attempt of paper of the profile, `CLOSE_REASON_LEFT` ([contracts text](../contracts/README.md), section 15; R162), and `app` calls it again after "Add" on the same page for the tasks not begun yet: the tasks begun before are closed under the learner, their next Check or Hint gets `CAUSE_ATTEMPT_CLOSED`, `app` keeps them over, read only (R77 `app`), and `api` erases their work at the close (R101 `api`). Which attempts does Start close? | T231 | (a) the request names the page, a `page_id` `app` gives, which `api` keeps beside each attempt while it is open, and closes only another page's; (b) the request names the open attempts of the page to keep, and `api` closes the others; (c) no "Add": one Start a page, the tasks picked at once | (a): one field, the ID the history and the export of `app` already name, and `api` holds no list from the device; `spec` contract, then `api` and `app`, before T232 |
