# {{name}} — architecture

> Status: a frame from the template of `spec`, {{date}}.
>
> What the component does, what it does not do, and what is still to decide about it. This is the detail of its card — architecture {{card}} spec. The card stays the summary: if the detail changes what the card says, the card is changed in `spec` the same way as the questions for its registers (RULES.md, Across repositories).
>
> Why it was decided so and not otherwise is in [decisions.md](decisions.md); the work plan is in [RUN.md](../RUN.md). The concepts are concepts spec. The documents and decisions of `spec` are under `spec/docs/` and are cited with the suffix "spec".
>
> An external fact — a provider's terms, a price, a law, a library's documentation — becomes a record of [sources.md](sources.md), with its source and the date it was read, and a claim here cites the record. The results of measurements — what was measured, how, and the numbers — go to `docs/measurements.md`, which the first measurement starts, and here goes only what was decided from them (RULES.md, The bar; R143 spec).

## 1. Purpose and bounds

<!-- FILL: from the card, architecture {{card}} spec, — in your own words, not a copy, in three paragraphs:
- **Does:** …
- **Does not:** …
- **Data and links:** which data it holds and which it never holds, who calls it and whom it calls, what it is built with (repositories 2.1 and 3 spec), its stage.
Each claim cites the section or decision of spec it comes from. -->

## 2. To decide when detailed

The points of the card's *To decide when detailed* — a subsection for each. Each is decided by a task of its own in epic E1 of [RUN.md](../RUN.md). A decided point names the entry of the log, and the decision itself moves to section 3. A question that goes beyond this repository goes «в реестр spec» (RULES.md, Across repositories).

<!-- FILL: a subsection "### 2.N. <point>" for each point of the card's *To decide when detailed*, in its order; points that cannot be decided apart — one subsection. In each:
- **Gist:** what to decide and why it is decided here;
- **What is known:** citations of spec — sections, R, Т-, П-, О- — and of MathTrail, if it was decided there;
- **Options:** empty for now — the task brings them;
- **Task:** its number in RUN.md. -->

## 3. Design

Empty for now. What is decided by section 2 moves here: what parts the component is made of, its types and data, how it is linked with other repositories.
