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

# Reads spec's own format/ by the layout of its text: each schema against the conventions of R45 and
# the 2020-12 meta-schema, each example against its schema, the YAML rules on every example and test
# vector, the layout of a module and its rules on the cases laid out as one — the ids of the files at
# <id> and the signatures of the media files among them (R46, R51) —, the rules the text lists against
# their vectors, the open view of each vector of the open view, built from the marks x-open, and the
# verdicts of each vector of verdicts, computed as section 15 of the text gives them — of a predicate
# only blank and notation (R56). A file it does not know is an error, so the task that brings it
# extends the check (RUN.md, T25).
# Check the module format in format/: schemas, examples and test vectors.
format-check: _tools
    node tools/format-check/main.mjs

# Run format-check's own tests, on trial copies of a small format and on files written in the tests.
format-check-test: _tools
    node --test 'tools/format-check/test/*.test.mjs'

# Reads the lock file alone, so nothing is installed first. The allowed list and the named
# exceptions are in tools/licenses/config.mjs (R12).
# Check the licenses of the packages in tools/package-lock.json.
licenses-check:
    node tools/licenses/main.mjs

# Runs from a NovaTrail repository's root, as `just -f spec/justfile licenses-check-repo
# package-lock.json licenses.json`: every package of that npm lock file against the list in
# tools/licenses/config.mjs, with the exceptions the repository names in the file given second,
# if any — a JSON object of packages, each with the license its lock file says, or null, and why
# it is accepted. An exception for a license off the list holds only for a package the lock file
# marks dev, a tool that never ships, and for the packages that tool names in optionalDependencies,
# its builds, while they are dev too and under the same license. Both paths are the repository's,
# from where the recipe is run, and a path that leaves it is refused. A lock file of npm 5 or 6,
# with no packages in it, is refused (R39).
# Check the licenses of the packages in a repository's npm lock file.
licenses-check-repo lock exceptions="":
    cd {{quote(invocation_directory())}} && node {{quote(justfile_directory() / "tools/licenses/main.mjs")}} --lock={{quote(lock)}} {{ if exceptions == "" { "" } else { "--exceptions=" + quote(exceptions) } }}

# What another repository's license check allows, taken from here rather than copied: one SPDX
# identifier a line, as tools/licenses/config.mjs lists them (R12, R39).
# Print the licenses a NovaTrail repository may build from.
licenses-allowed:
    node tools/licenses/main.mjs --allowed

# The tests that run the recipes run this same just.
# Run licenses-check's own tests, on made-up lock files.
licenses-check-test:
    JUST={{quote(just_executable())}} node --test 'tools/licenses/test/*.test.mjs'

# Prints version=, previous=, released= and behind= lines, which a release workflow takes as its
# step outputs; version= is empty when the commit has a release already or is older than the
# newest one. The tags are those of the repository the recipe is run from: spec's, or a
# repository's that runs `just -f spec/justfile release-version`. The commit is HEAD unless
# given: release.yml gives the commit its checks passed on, by SHA. Refuses a shallow clone,
# which has no tags to count from. In spec the line is RELEASE_LINE as release.yml sets it at
# that commit, whatever is checked out or set in the shell, and naming a workflow is refused
# (R31). Anywhere else — another repository, a working copy in .repos/ among them — the line is
# RELEASE_LINE as the workflow named second sets it at that commit, a path from the repository's
# root, whatever the shell sets: a release workflow's own env, the tip's, must not number an
# older commit. A commit from before that workflow existed takes the checked-out file's line. With
# no workflow named it is RELEASE_LINE from the environment, and with neither the recipe refuses,
# since that repository's releases take its own line.
# Print the version the next release takes.
release-version commit="HEAD" workflow="":
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{quote(invocation_directory())}}
    here=$(git rev-parse --show-toplevel)
    if [ "$(git rev-parse --is-shallow-repository)" = true ]; then
        echo "release-version: a shallow clone has no tags to count from; fetch the whole history" >&2
        exit 1
    fi
    commit=$(git rev-parse --verify --end-of-options {{quote(commit + "^{commit}")}})
    workflow={{quote(workflow)}}
    if [ "$here" = "$(cd {{quote(justfile_directory())}} && pwd -P)" ]; then
        if [ -n "$workflow" ]; then
            echo "release-version: in spec the line is its own release.yml's; a workflow is named by another repository" >&2
            exit 1
        fi
        RELEASE_LINE=$(git show "${commit}:.github/workflows/release.yml" | node {{quote(justfile_directory() / "tools/release/line.mjs")}})
        export RELEASE_LINE
    elif [ -n "$workflow" ]; then
        if git cat-file -e "${commit}:${workflow}" 2>/dev/null; then
            RELEASE_LINE=$(git show "${commit}:${workflow}" | node {{quote(justfile_directory() / "tools/release/line.mjs")}})
        elif [ -f "${here}/${workflow}" ]; then
            echo "release-version: ${workflow} is not at ${commit}, which came before it; the line is the checked-out file's" >&2
            RELEASE_LINE=$(node {{quote(justfile_directory() / "tools/release/line.mjs")}} < "${here}/${workflow}")
        else
            echo "release-version: ${workflow} is neither at ${commit} nor checked out" >&2
            exit 1
        fi
        export RELEASE_LINE
    elif [ -z "${RELEASE_LINE+set}" ]; then
        echo "release-version: ${here} is not spec, and neither a workflow nor RELEASE_LINE names its line: name its release workflow after the commit" >&2
        exit 1
    fi
    {
        git tag --list 'v*'; echo --
        git tag --merged "$commit" --list 'v*'; echo --
        git tag --points-at "$commit" --list 'v*'
    } | node {{quote(justfile_directory() / "tools/release/version.mjs")}}

# The Releases API refuses GITHUB_TOKEN a commit that is no longer the tip of main and "adds or
# modifies any file under .github/workflows/ relative to the repository's default branch", with
# 404, or on some paths "403 Resource not accessible by integration" (GitHub Docs, REST API
# endpoints for releases, read 2026-10-20); the release of the tip then covers that commit. The
# tip is the one the caller fetched after the refusal; the commit must be in its history, since
# only then does the tip's release cover it. The error is the file gh wrote its stderr to. Exits
# 0 when the refusal is that one, and 1 with the reason when it is not or when anything cannot be
# read: a release refused for any other reason fails its run (R31). spec's release.yml runs it,
# and so may another repository's, by `just -f spec/justfile`.
# Tell whether a refusal of the Releases API is the one a newer tip covers.
release-refusal commit tip error:
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{quote(invocation_directory())}}
    commit=$(git rev-parse --verify --end-of-options {{quote(commit + "^{commit}")}})
    tip=$(git rev-parse --verify --end-of-options {{quote(tip + "^{commit}")}})
    error={{quote(error)}}
    if [ "$tip" = "$commit" ]; then
        echo "release-refusal: ${commit} is the tip of main, and nothing newer covers it" >&2
        exit 1
    fi
    if ! git merge-base --is-ancestor "$commit" "$tip"; then
        echo "release-refusal: ${commit} is not in the history of ${tip}, so the tip's release does not cover it" >&2
        exit 1
    fi
    # git diff --quiet exits 1 on a difference and 0 on none; anything else is its own failure.
    changed=0
    git diff --quiet --diff-filter=AM "$tip" "$commit" -- .github/workflows/ || changed=$?
    if [ "$changed" = 0 ]; then
        echo "release-refusal: ${commit} adds or modifies no file under .github/workflows/ relative to ${tip}" >&2
        exit 1
    elif [ "$changed" != 1 ]; then
        echo "release-refusal: git diff could not compare ${tip} with ${commit}" >&2
        exit 1
    fi
    if [ ! -r "$error" ]; then
        echo "release-refusal: the refusal's error, ${error}, cannot be read" >&2
        exit 1
    fi
    if ! grep -qE 'HTTP 404|HTTP 403: Resource not accessible by integration' "$error"; then
        echo "release-refusal: the refusal is neither HTTP 404 nor \"HTTP 403: Resource not accessible by integration\"" >&2
        exit 1
    fi
    echo "release-refusal: ${commit} is no longer the tip of main (${tip}) and adds or modifies its workflow files; the release of the tip covers it"

# The tests that run the recipes run this same just.
# Run release-version's and release-refusal's own tests, on made-up tags and repositories.
release-version-test:
    JUST={{quote(just_executable())}} node --test 'tools/release/test/*.test.mjs'

# tools/toolchain/toolchain.sh is no recipe: a runner runs it with its own shell, to start the
# toolchain stage that just itself is in. Its tests stand a docker in that writes down what it is
# asked, and the dry run they try is this same just's.
# Run toolchain.sh's own tests, with a stand-in for docker.
toolchain-test:
    JUST={{quote(just_executable())}} node --test 'tools/toolchain/test/*.test.mjs'

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

# The tests of every tool above in one run, as CI runs them, with the coverage of the code they
# test: a summary after the tests, and coverage/lcov.info, its paths from the repository's root,
# which a job of CI sends to Codecov (R48). Node leaves the tests themselves and node_modules/ out
# of the report. A module that no test loads is not in it at all, and codecov/patch would never
# count its lines, so the recipe fails on any module of tools/ the report does not name. Node
# measures JavaScript alone: toolchain.sh and the bash recipes here have their tests, but no
# coverage.
# Run every test of tools/ once, and write their coverage.
coverage: _tools
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p coverage
    rm -f coverage/lcov.info
    JUST={{quote(just_executable())}} node --test --experimental-test-coverage \
        --test-reporter=spec --test-reporter-destination=stdout \
        --test-reporter=lcov --test-reporter-destination=coverage/lcov.info \
        'tools/*/test/*.test.mjs'
    # Both lists first, so that a git or a sed that fails stops the recipe rather than empty a list.
    modules=$(git ls-files --cached --others --exclude-standard -- 'tools/*.mjs' | grep -v '/test/')
    reported=$(sed -n 's/^SF://p' coverage/lcov.info)
    missing=$(comm -23 <(sort <<< "$modules") <(sort <<< "$reported"))
    if [ -n "$missing" ]; then
        echo "coverage: no test loads these modules of tools/, so codecov/patch would never count their lines:" >&2
        echo "$missing" >&2
        exit 1
    fi

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
