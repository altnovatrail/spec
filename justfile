# Tasks of the NovaTrail spec. Run `just --list` to see them.

# Check the documents: links, sections, registers, wrong-script numbers, Mermaid diagrams.
docs-check: _tools
    node tools/docs-check/main.mjs

# Run docs-check's own tests, on trial copies of a small set of documents.
docs-check-test: _tools
    node --test 'tools/docs-check/test/*.test.mjs'

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
