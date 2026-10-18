# AGENTS.md

The working rules of this repository are in [CLAUDE.md](CLAUDE.md), and they bind every coding agent, not only Claude Code. Read it in full before any work and follow it as written: what it asks of Claude, it asks of you. It stays the one copy of the rules; this file only says what stands in for the parts that are Claude Code's own:

- **The cloud-session exception to "Devcontainer only"** is for a cloud session of Claude Code. A Codex session that does not see `NOVATRAIL_DEVCONTAINER=1` stops before its first edit.
- **Memory.** Claude Code's memory is not shared with you. What has to outlive a session goes into the repository's documents, as CLAUDE.md says.
