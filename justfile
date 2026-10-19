# Tasks of the NovaTrail spec. Run `just --list` to see them.

# Check the documents: links, sections, registers, wrong-script numbers, Mermaid diagrams.
docs-check: _tools
    node tools/docs-check/main.mjs

# Run docs-check's own tests, on trial copies of a small set of documents.
docs-check-test: _tools
    node --test 'tools/docs-check/test/*.test.mjs'

# Reads the lock file alone, so nothing is installed first. The allowed list and the named
# exceptions are in tools/licenses/config.mjs (R12).
# Check the licenses of the packages in tools/package-lock.json.
licenses-check:
    node tools/licenses/main.mjs

# Run licenses-check's own tests, on made-up lock files.
licenses-check-test:
    node --test 'tools/licenses/test/*.test.mjs'

# The copy is built from repo-template/ as it stands at spec's latest release tag, and its FILL
# markers are left to write from the component's card: 3.8 in `just new-repo learner-model go 3.8`.
# Build a new repository's working copy in .repos/<name>, with spec as a submodule.
new-repo name kind card: _tools
    node tools/new-repo/new-repo.mjs '{{name}}' '{{kind}}' '{{card}}'

# A draft is built from the working tree, names the given tag, and leaves git alone: a copy to
# read before the tag exists, such as `just new-repo-draft learner-model go 3.8 v0.1.0`.
# Build a draft of a new repository's working copy in .repos/<name>.
new-repo-draft name kind card tag: _tools
    node tools/new-repo/new-repo.mjs '{{name}}' '{{kind}}' '{{card}}' --draft '{{tag}}'

# Check a working copy built by new-repo, once its FILL markers are written.
new-repo-check name: _tools
    node tools/new-repo/check.mjs '.repos/{{name}}'

# Run new-repo's own tests, on copies built in temporary directories.
new-repo-test: _tools
    node --test 'tools/new-repo/test/*.test.mjs'

# Install tools/ from its lock file, again whenever package.json or the lock file changes:
# the stamp holds their hashes, so a restored file with an old mtime is noticed too.
# Package scripts never run: tools/.npmrc sets ignore-scripts, and the flag says it again.
[private]
_tools:
    #!/usr/bin/env bash
    set -euo pipefail
    stamp=tools/node_modules/.installed-from
    wanted="$(cd tools && sha256sum package.json package-lock.json)"
    if [[ ! -f "$stamp" || "$(cat "$stamp")" != "$wanted" ]]; then
        (cd tools && npm ci --ignore-scripts --no-audit --no-fund)
        printf '%s\n' "$wanted" > "$stamp"
    fi
