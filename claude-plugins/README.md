# claude-plugins

The Claude Code plugins that NovaTrail's repositories load, each a folder of its own. A repository of the `go` kind loads `gopls-lsp` by its devcontainer, which `just new-repo` writes from [repo-template/kinds.json](../repo-template/kinds.json) (`claudePlugins`): `containerEnv` of `.devcontainer/devcontainer.json` names the folder in the variable `CLAUDE_CODE_PLUGIN_DIRS`, and Claude Code loads it in every session in that container as the flag `--plugin-dir` would ([Environment variables](https://code.claude.com/docs/en/env-vars.md)):

```jsonc
"CLAUDE_CODE_PLUGIN_DIRS": "${containerWorkspaceFolder}/spec/claude-plugins/gopls-lsp"
```

The path goes through the repository's `spec` submodule, so the plugin is the one of the tag of spec the repository pins, and it comes with a move to a newer tag, as the lock file of gopls does. Nothing is fetched, nobody runs `claude plugin install`, and no path of it is recorded in `~/.claude`, which every NovaTrail container shares. A marketplace is not used: Claude Code records a local one there by an absolute path, the path of the container that recorded it last, and the sessions of the other containers lose its plugins. The variable is not in `.claude/settings.json`, because Claude Code ignores it there ([Create plugins](https://code.claude.com/docs/en/plugins/create.md)). Several plugins are separated by `:` ([Environment variables](https://code.claude.com/docs/en/env-vars.md)).

## gopls-lsp

- **What it does.** Claude Code starts `gopls` for `.go` files and, after each edit of one, gives the session the errors and warnings gopls reports; the `LSP` tool finds definitions and references. The plugin brings no gopls of its own: it runs the one on `PATH`, which the `go` kind builds in the devcontainer stage from its lock file, `repo-template/kinds/go/gopls/`. In a cloud session Claude Code starts no plugin language server ([Code intelligence](https://code.claude.com/docs/en/plugins/code-intelligence.md)).
- **Where from.** `plugins/gopls-lsp/` of [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/e37d307bd9f85dab6fea5dfb5e3dc146753b2d2d/plugins/gopls-lsp) at commit `e37d307bd9f85dab6fea5dfb5e3dc146753b2d2d`, 2026-11-11: `.claude-plugin/plugin.json` and `LICENSE`, unmodified, Apache-2.0. Its README is left out: it tells to install gopls at `@latest`.
- **Why a copy.** That marketplace cannot be pinned to a commit: a marketplace's `ref` takes a branch or a tag, the repository has no tags, and Claude Code refreshes the official marketplace by itself ([Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md); [Install plugins](https://code.claude.com/docs/en/plugins/install.md)).
- **To raise it**, compare `plugins/gopls-lsp/` at a newer commit with this folder, copy the changed files byte for byte, and name the commit here.
