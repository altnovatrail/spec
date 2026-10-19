# repo-template

The template every NovaTrail repository other than spec starts from (R21; repositories 2.2). It holds no rules of its own: a new repository follows spec's [RULES.md](../RULES.md), which its CLAUDE.md imports from the `spec/` submodule.

`just new-repo <name> <kind> <card>` builds the new repository's working copy in `.repos/<name>`, from this template as it stands at the latest release of spec, its highest `vX.Y.Z` tag:

- `files/` is the new repository. Each `{{…}}` is filled in — the repository's name, the number of its card in architecture 3, the tag of spec and the date — and each `<!-- FILL: … -->` is left for the executor to write from the component's card.
- `LICENSE`, `AGENTS.md` and `.devcontainer/` in `files/` are links to spec's own, so there is one copy of each. They are copied as they are; the devcontainer then gets the repository's own name and network, the VS Code extensions of its kind, and a start command that checks out `spec/` when a clone has left it empty.
- `kinds.json` names those extensions, at exact versions: `docs` adds none to spec's, `go` adds the Go extension, and `typescript` adds none yet — VS Code supports TypeScript itself, and a linter's extension comes once the repository has chosen its linter.
- spec becomes a git submodule at the same tag, and everything is staged. The first commit is the author's.

Before spec has a tag, or to read a change to the template, `just new-repo-draft <name> <kind> <card> <tag>` builds the copy from the working tree instead, names the given tag in its text, and leaves git alone.

`docs-check` reads `files/` as part of spec. Its citations of spec, written with the suffix "spec", are checked against spec's documents. The template cites its own sections through a link to its own file and the word «раздел», which `docs-check` resolves inside `files/`. A bare "architecture 2" or "R03" would be checked against spec's documents instead, so the template uses those only as examples of how to cite.

`just new-repo-check <name>` checks the copy once it is filled: no `{{…}}` and no FILL left, `LICENSE` and `AGENTS.md` the same as spec's, relative links that lead somewhere, no name of spec's left in the devcontainer, and the submodule at the tag that the links to spec name.
