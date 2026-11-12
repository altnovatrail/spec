---
paths:
  - "tools/**"
  - ".claude/settings.json"
---

# The code of `tools/`

The checks of spec are code in `tools/`, on Node.js, with one `tools/package.json` and its lock file, `tools/package-lock.json`, from which the recipes install the packages (`_tools` in the justfile). Code of `tools/` comes with its tests: all of them at once and with their coverage, as CI runs them, are `just coverage`, and one tool's are `just <tool>-test` (`just --list`). Each part's own check and its tool are in the rule of that part, `.claude/rules/<part>.md`.

`just licenses-check` checks the licenses of that lock file against the list in `tools/licenses/config.mjs` — the ASF's Category A, as R12 says — and its named exceptions; a task that changes `tools/package.json` or the lock file ends with it green.

`just tokens-report` prints where the tokens of this repository's Claude Code sessions on this machine went, from their transcripts: the calls of the model and the cache, what entered the context between calls — by tool, by file and by program — and what each carried, and what a session starts with; it prints numbers, paths and names alone, never what a transcript says (measurements 1). Another repository runs it as `just -f spec/justfile tokens-report`; its tests are `just tokens-test`.

`just translation-check <ref> <file>…` compares a document translated into English with its original at `<ref>`, unit by unit, and `just translation-anchors <ref> <file>…` rewrites the links to the headings a translation renamed, in every Markdown file of the repository; `tools/translation/README.md` is how a translation runs, and its tests are `just translation-test` (R143, the 2026-11-12 amendment). Another repository runs them as `just -f spec/justfile translation-check` and `translation-anchors`.

`.claude/settings.json` runs the hook `UserPromptSubmit` of `tools/session/`, which stops a prompt that starts another task than the one the session has led and names `/clear`: one task is one session (R143; measurements 1.7). The template's settings run it from `spec/tools/session/`, and it takes no package of `node_modules`, which another repository's `spec/` does not have; its tests are `just session-test`.
