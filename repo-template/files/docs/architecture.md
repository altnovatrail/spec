# {{name}} — architecture

> Status: a frame from the template of `spec`, {{date}}.
>
> What the component does, what it does not do, and what is still to decide about it. This is the detail of its card in `spec/docs/architecture.md`, the one its heading names `{{name}}`. The card stays the summary: if the detail changes what the card says, the card is changed in `spec` the same way as a question for its registers, by a row «В реестр spec».
>
> Why it was decided so and not otherwise is in [decisions.md](decisions.md); the work plan is in [RUN.md](../RUN.md). The concepts are the glossary of `spec/docs/concepts.md`. The documents and decisions of `spec` are under `spec/docs/`; a text here says in words what it takes from them, and cites none.
>
> An external fact — a provider's terms, a price, a law, a library's documentation — becomes a record of [sources.md](sources.md), with its source and the date it was read, and a claim here cites the record. The results of measurements — what was measured, how, and the numbers — go to `docs/measurements.md`, which the first measurement starts, and here goes only what was decided from them.

## 1. Purpose and bounds

<!-- FILL: from the card in `spec/docs/architecture.md` — in your own words, not a copy, in three paragraphs:
- **Does:** …
- **Does not:** …
- **Data and links:** which data it holds and which it never holds, who calls it and whom it calls, what it is built with, its stage.
Each claim in words, with no citation of spec's sections or decisions. -->

## 2. To decide when detailed

The points of the card's *To decide when detailed* — a subsection for each. Each is decided by a task of its own in epic E1 of [RUN.md](../RUN.md). A decided point leaves for the design below, and its why goes into the log. A question that goes beyond this repository goes «в реестр spec».

<!-- FILL: a subsection "### 2.N. <point>" for each point of the card's *To decide when detailed*, in its order; points that cannot be decided apart — one subsection. In each:
- **Gist:** what to decide and why it is decided here;
- **What is known:** what spec and MathTrail settled about it, in words, and the open questions Т-, П-, О- it rests on;
- **Options:** empty for now — the task brings them;
- **Task:** its number in RUN.md. -->

## 3. Design

Empty for now. What is decided of the points above moves here: what parts the component is made of, its types and data, how it is linked with other repositories.
