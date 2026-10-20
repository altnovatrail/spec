# Tasks of the NovaTrail spec. Run `just --list` to see them.

# Check the documents: links, sections, registers, wrong-script numbers, Mermaid diagrams.
docs-check: _tools
    node tools/docs-check/main.mjs

# Runs from a NovaTrail repository's root, as `just -f spec/justfile docs-check-repo`: the spec it
# pins as its submodule checks the repository's documents, and its citations of spec against
# itself (R32). The repository is the one around this spec, so in spec itself it refuses.
# Check the documents of the repository this spec is the submodule of.
docs-check-repo: _tools
    node tools/docs-check/main.mjs --component

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

# Prints version=, previous=, released= and behind= lines, which a release workflow takes as its
# step outputs; version= is empty when the commit has a release already or is older than the
# newest one. The tags are those of the repository the recipe is run from: spec's, or a
# repository's that runs `just -f spec/justfile release-version`. The commit is HEAD unless
# given: release.yml gives the commit its checks passed on, by SHA. Refuses a shallow clone,
# which has no tags to count from. In spec the line is RELEASE_LINE as release.yml sets it at
# that commit, whatever is checked out or set in the shell (R31). Anywhere else — another
# repository, a working copy in .repos/ among them — the line is RELEASE_LINE from the
# environment, and without it the recipe refuses: that repository's releases take its own line.
# Print the version the next release takes.
release-version commit="HEAD":
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{quote(invocation_directory())}}
    here=$(git rev-parse --show-toplevel)
    if [ "$(git rev-parse --is-shallow-repository)" = true ]; then
        echo "release-version: a shallow clone has no tags to count from; fetch the whole history" >&2
        exit 1
    fi
    commit=$(git rev-parse --verify --end-of-options {{quote(commit + "^{commit}")}})
    if [ "$here" = "$(cd {{quote(justfile_directory())}} && pwd -P)" ]; then
        RELEASE_LINE=$(git show "${commit}:.github/workflows/release.yml" | node {{quote(justfile_directory() / "tools/release/line.mjs")}})
        export RELEASE_LINE
    elif [ -z "${RELEASE_LINE+set}" ]; then
        echo "release-version: ${here} is not spec, and RELEASE_LINE is not set: its releases take its own line, from its release workflow" >&2
        exit 1
    fi
    {
        git tag --list 'v*'; echo --
        git tag --merged "$commit" --list 'v*'; echo --
        git tag --points-at "$commit" --list 'v*'
    } | node {{quote(justfile_directory() / "tools/release/version.mjs")}}

# Run release-version's own tests, on made-up tags; the recipe's own test runs this same just.
release-version-test:
    JUST={{quote(just_executable())}} node --test 'tools/release/test/*.test.mjs'

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
    node tools/new-repo/check.mjs '{{name}}'

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
