# QUESTIONS.md — questions to the author of spec

Table 3 of [RUN.md](../RUN.md): the author's open questions that tasks leave (R153, R154, R160).

- Never read whole: take the rows the task and its sections name — `grep -n '^| В35 ' run/QUESTIONS.md`.
- A row is a question a task leaves open (RUN.md rule 9). Record the author's answer where it belongs — the task, a document or [DEBT.md](DEBT.md) — and delete the row.
- Rows «в реестр spec» of other repositories are triaged by RUN.md rule 13 into table 5, [INBOX.md](INBOX.md), not here.

## Table 3. Questions to the author

Numbers are not reused: next — В82.

| ID | Question | From | Options | Recommendation |
|---|---|---|---|---|
| В79 | Framing a missed task by hand in the paper flow (R162; R90). The loop drawn with a finger or the pen is a path-based gesture, WCAG 2.5.1 (A), and has no keyboard way, 2.1.1 (A); resizing a frame by its corner and moving the crop by its grip are dragging only, 2.5.7 (AA). The mockup has no other way. Decide before T227 and T228 | T221 | (a) two taps — a corner, then the opposite one — make the same frame; a frame is resized by removing it and framing again; the crop's move declared 2.5.7 by `canvas` with the sheet's own; 2.1.1 of framing by hand declared by `app`; (b) a button "Add a frame" that drops a frame the keyboard and the corner then move and resize; (c) every one of them declared, with no term | (a): it meets 2.5.1 and 2.5.7 for the frame with no new control, and the crop lies over a sheet that moves only by dragging anyway (R90) |
| В80 | The work of a task from paper, and its circled option, are handwriting only (R162): 2.1.1 fails as for `app`'s answer in handwriting, but that one goes away with О-25's second way for a slot with a number, which a task from paper has not (R162 rejected option buttons; R82 has no text field) | T221 | (a) `app` declares it for tasks from paper, with no term; (b) О-25 widens to tasks from paper: a final answer typed or tapped, compared with the key by the program, and a choice by buttons for whoever needs them | (a) now, and О-25's text names tasks from paper, so that its second way is designed for both |
