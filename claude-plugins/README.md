# claude-plugins

The Claude Code plugins that NovaTrail's repositories turn on, as a marketplace of their own: `novatrail`, the folder Claude Code reads as a `directory` marketplace. A repository of the `go` kind names it in its `.claude/settings.json`, which `just new-repo` writes from [repo-template/kinds.json](../repo-template/kinds.json):

```json
"extraKnownMarketplaces": { "novatrail": { "source": { "source": "directory", "path": "./spec/claude-plugins" } } },
"enabledPlugins": { "gopls-lsp@novatrail": true }
```

The path goes through the repository's `spec` submodule, so the plugin is the one of the tag of spec the repository pins, and it comes with a move to a newer tag, as the lock file of gopls does (R102, R143). Claude Code loads a plugin of a local marketplace in place, from this folder: nothing is fetched, and nobody runs `claude plugin install`. It reads the project's settings only once the folder is trusted (sources 2.7).

## gopls-lsp

- **What it does.** Claude Code starts `gopls` for `.go` files and, after each edit of one, gives the session the errors and warnings gopls reports; the `LSP` tool finds definitions and references. The plugin brings no gopls of its own: it runs the one on `PATH`, which the `go` kind builds in the devcontainer stage from its lock file, `repo-template/kinds/go/gopls/`. In a cloud session Claude Code starts no plugin language server (sources 2.7).
- **Where from.** `plugins/gopls-lsp/` of [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/e37d307bd9f85dab6fea5dfb5e3dc146753b2d2d/plugins/gopls-lsp) at commit `e37d307bd9f85dab6fea5dfb5e3dc146753b2d2d`, 2026-11-11: `.claude-plugin/plugin.json` and `LICENSE`, unmodified, Apache-2.0. Its README is left out: it tells to install gopls at `@latest`.
- **Why a copy.** That marketplace cannot be pinned to a commit: a marketplace's `ref` takes a branch or a tag, the repository has no tags, and Claude Code refreshes the official marketplace by itself (sources 2.7).
- **To raise it**, compare `plugins/gopls-lsp/` at a newer commit with this folder, copy the changed files byte for byte, and name the commit here.
