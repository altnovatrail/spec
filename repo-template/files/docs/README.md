# The documents of {{name}}

What the [README](../README.md) of the repository leaves out, which says only what the component is and where it stands in NovaTrail. How to build and run the component, and anything else of the kind, is added here as it comes, or in a document of its own that this list names.

- [architecture.md](architecture.md) — the component: what it does and does not do, its data and links, and what is still to decide.
- [decisions.md](decisions.md) — the decision log: what was decided, why, and what was rejected.
- [sources.md](sources.md) — the records of the facts no run checks that the documents rest on, each with its address, the date read and a quote.
- [RUN.md](../RUN.md) — the work plan, in epics.
- `run/` — the plan's other tables: [the epics for later](../run/EPICS.md), [the open questions](../run/QUESTIONS.md), [the technical debt](../run/DEBT.md) and [the tasks outside an epic](../run/TASKS.md).

The working rules, for people and coding agents alike, are in [CLAUDE.md](../CLAUDE.md) and [AGENTS.md](../AGENTS.md). The platform's shared vocabulary, formats, contracts and decisions are in [spec](https://github.com/altnovatrail/spec), checked out here as a git submodule: clone this repository with `git clone --recurse-submodules`.
