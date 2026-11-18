# QUESTIONS.md — questions to the author of spec

Table 3 of [RUN.md](../RUN.md): the author's open questions that tasks leave (R153, R154, R160).

- Never read whole: take the rows the task and its sections name — `grep -n '^| В35 ' run/QUESTIONS.md`.
- A row is a question a task leaves open (RUN.md rule 9). Record the author's answer where it belongs — the task, a document or [DEBT.md](DEBT.md) — and delete the row.
- Rows «в реестр spec» of other repositories are triaged by RUN.md rule 13 into table 5, [INBOX.md](INBOX.md), not here.

## Table 3. Questions to the author

Numbers are not reused: next — В79.

| ID | Question | From | Options | Recommendation |
|---|---|---|---|---|
| В70 | Who writes a task across repositories (R159; RUN.md, Epics). The author's word of 2026-11-18 puts all its code on one branch of one name in each repository, run locally together before any pull request. RULES.md, Across repositories: «a session changes neither spec nor any other repository from where it works»; each executor runs in its own repository's container, which mounts that clone alone (R156). | T219 | (a) one executor for each repository, in its own container, on the shared branch: each changes only its own repository, pushes its branch, and takes the others' by their pushed commits — Go `replace` to the branch's pseudo-version, npm from the branch's packed build, the submodule at the branch's commit; the orchestrator runs them in turn by dependency, and the last runs the end-to-end path; RULES.md stays; (b) one session in a container that mounts every clone the task touches — a third configuration of spec, like the orchestrator's —, and RULES.md, Across repositories, allows it on the task's branch; (c) no task across repositories: a task in each, merged and released in turn, as now | (a): it keeps one repository to one session and container, and needs no new configuration; the end-to-end run is the last executor's |
| В71 | CI of a pull request that needs another repository's release (R159). Before the release the pins are local and never reach a pull request (R34, R77); a pull request whose CI builds against a pinned tag or `release-verify` of the other repository cannot pass until that release exists. | T219 | (a) the pull requests open in the order of their dependencies: the dependency's merges and releases first, then the dependent's moves its pins to the release and runs its one round of CI, which the local run has already passed; (b) every pull request opens at once and CI of the dependent waits, failing, until the release; (c) CI may build against the other repository's branch, by a commit, until the release | (a): one round of CI a pull request, and no pin outside a release reaches CI |
