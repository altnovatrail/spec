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

# Reads table 3 of every other NovaTrail repository's RUN.md on GitHub, through gh — on main and in
# each open pull request — and prints the rows «в реестр spec» that table 5 of RUN.md does not hold
# yet, and those of table 5 the source no longer marks (R81). A session of spec runs it before a
# task, rule 13 of RUN.md; gh has to be logged in.
# List what the other repositories hold for spec.
inbox: _tools
    node tools/inbox/main.mjs

# Run inbox's own tests, on made-up RUN.md files and a stand-in for gh.
inbox-test: _tools
    node --test 'tools/inbox/test/*.test.mjs'

# Reads spec's own format/ by the layout of its text: each schema against the conventions of R45 and
# the 2020-12 meta-schema, each example against its schema, the YAML rules on every example and test
# vector, the layout of a module and its rules on the cases laid out as one — the ids of the files at
# <id> and the signatures of the media files among them (R46, R51) —, the rules the text lists against
# their vectors, the open view of each vector of the open view, built from the marks x-open, and the
# verdicts of each vector of verdicts, computed as section 15 of the text gives them — of a predicate
# only blank and notation (R56) — with the trap of each wrong value, and what the leak check of
# section 20 finds in each text of a vector of the leak check (R57) and in the texts of a lesson,
# for the keys of its tasks (R58), the numbers of each vector of the generator, as section 22
# computes them (R59), and the instances of each template, as section 23 counts, picks and fills
# them, with the rules of a task on every instance (R60), and the results of their solvers as the
# vectors give them, since spec runs no Starlark (R61); the tiers of each vector of tiers, as section
# 12 computes them, and the package of each vector of packages — its canonical view, the listing of
# its device part, its inventory and their digests, as section 25 builds them —, and the canonical
# view of each example of a whole module against its schema (R62); and the module index that each
# vector of the index builds of its release, as section 26 builds it from the index of the release
# before, or the rule of the index that refuses it (R63). A file it does not know is an error, so
# the task that brings it extends the check (RUN.md, T25).
# Check the module format in format/: schemas, examples and test vectors.
format-check: _tools
    node tools/format-check/main.mjs

# Run format-check's own tests, on trial copies of a small format and on files written in the tests.
format-check-test: _tools
    node --test 'tools/format-check/test/*.test.mjs'

# Reads spec's own admission/, the admission table (R96), by the layout of its text: VERSION, each
# schema against the conventions of the format's schemas under the prefix of the table and with no
# x-open, the codes of the age categories against the format's, the table against its schema and
# its rules, and each of its rows of privacy 5.3 and its citations against spec's documents; each
# example against its schema, each vector of a rule — that it breaks that rule and no other —, and
# each vector of answers, whose answers it computes as section 6 of the text gives them, with every
# reason of a refusal among them.
# Check the admission table in admission/: its schemas, the table, examples and test vectors.
admission-check: _tools
    node tools/admission/main.mjs

# Run admission-check's own tests, on trial copies of spec's admission/ and the documents it cites.
admission-check-test: _tools
    node --test 'tools/admission/test/*.test.mjs'

# The types of the module format, generated from its schemas by tools/types (R72): the packages
# formatv0 and formatv0/open under types/, and admissionv0 of the admission table, generated from
# admission/schemas (R96), which spec's Go module ships at the tag of every release, each with its
# TypeScript beside it, index.d.ts, which the npm package @altnovatrail/spec carries (R73), and the
# registry of tools/types/roundtrip. The generator writes them into a new folder,
# gofmt aligns the Go, and they take the place of the files in the repository, so that a type no
# schema gives any more goes too. types/canvas, the types of <novatrail-canvas>, is written by hand
# (R74): it stays as it is.
# Generate the types of the module format and of the admission table from their schemas again.
types: _tools
    #!/usr/bin/env bash
    set -euo pipefail
    out=$(mktemp -d)
    trap 'rm -rf "$out"' EXIT
    node tools/types/main.mjs "$out"
    gofmt -w "$out"
    mkdir -p types
    find types -mindepth 1 -maxdepth 1 ! -name canvas -exec rm -rf {} +
    mv "$out"/types/* types/
    mv "$out/tools/types/roundtrip/registry.go" tools/types/roundtrip/registry.go

# What `just types` would write is what types/ and the registry hold, file for file, and types/ holds
# nothing else but types/canvas/index.d.ts, the types of <novatrail-canvas>, written by hand (R74).
# Then each value of format/ and admission/ that passes a schema — the examples, the files of every
# module of the examples and the vectors, the vectors themselves, the canonical view of each example
# of a whole module and the admission table — is read by its type of formatv0 or admissionv0
# strictly and written back as it was, and so is the open view of each
# vector of the open view by its type of open; the part of such a vector that holds a closed field
# fails to be read by that type (tools/types/corpus.mjs, tools/types/roundtrip). And each value is
# the value of a declaration of its type in TypeScript, imported from the npm package, which is
# packed of the working tree and unpacked into the project tsc checks: under the resolution of
# modules nodenext and under bundler, with a value that holds a closed field refused
# (tools/types/typescript.mjs, tools/types/npm.mjs). The package is of the line the working tree is
# numbered in, as its next release's will be, and tsc takes the check of the types of
# <novatrail-canvas> from it too, tools/types/canvas.check.ts, with the DOM, beside the npm package
# of the contracts' code, @altnovatrail/contracts of the working tree, and the runtime of
# protobuf-es it depends on, from tools/node_modules: the check holds the element's marks to the
# contract's (R83). The corpus is of the working tree, as format-check's files are.
# Check the types of the format and the admission table against their schemas and values.
types-check: _tools
    #!/usr/bin/env bash
    set -euo pipefail
    out=$(mktemp -d)
    trap 'rm -rf "$out"' EXIT
    node tools/types/main.mjs "$out/generated"
    gofmt -w "$out/generated"
    if [ "$(ls -A types/canvas 2> /dev/null)" != "index.d.ts" ]; then
        echo "types-check: types/canvas holds index.d.ts alone, the types of <novatrail-canvas>, written by hand: just types neither writes nor cleans it" >&2
        exit 1
    fi
    if ! diff -r --exclude=canvas types "$out/generated/types" || ! diff tools/types/roundtrip/registry.go "$out/generated/tools/types/roundtrip/registry.go"; then
        echo "types-check: the files differ from what format/schemas and admission/schemas give; run just types" >&2
        exit 1
    fi
    node tools/types/corpus.mjs "$out/corpus.json"
    go -C tools/types/roundtrip run . "$out/corpus.json"
    node tools/types/typescript.mjs "$out/corpus.json" "$out/typescript"
    line=$(node tools/release/line.mjs < .github/workflows/release.yml)
    archive=$(node tools/types/npm.mjs . "${line}.0" "$out")
    mkdir -p "$out/typescript/node_modules/@altnovatrail/spec"
    tar -xzf "$archive" -C "$out/typescript/node_modules/@altnovatrail/spec" --strip-components=1
    contracts=$(node tools/contracts/npm.mjs . "${line}.0" "$out")
    mkdir -p "$out/typescript/node_modules/@altnovatrail/contracts" "$out/typescript/node_modules/@bufbuild"
    tar -xzf "$contracts" -C "$out/typescript/node_modules/@altnovatrail/contracts" --strip-components=1
    ln -s "$PWD/tools/node_modules/@bufbuild/protobuf" "$out/typescript/node_modules/@bufbuild/protobuf"
    for config in "$out/typescript"/tsconfig.*.json; do
        tools/node_modules/.bin/tsc -p "$config"
        case "$config" in
            */tsconfig.canvas.*) echo "types-check: tsc takes the check of <novatrail-canvas>, by $(basename "$config")" ;;
            *) echo "types-check: tsc takes every case, by $(basename "$config")" ;;
        esac
    done

# Run the generator's own tests, on small schemas written in the tests and on spec's own format/,
# with tsc on the TypeScript of a small model.
types-test: _tools
    node --test 'tools/types/test/*.test.mjs'

# Reads spec's API contracts in contracts/ by the rules of R83 and contracts/README.md: buf.yaml as
# R83 fixes it and buf.gen.yaml with local plugins alone, before buf runs; the layout of contracts/;
# what buf lets pass in a file — a syntax other than proto3, a json_name, an unsigned type, a package
# without the prefix novatrail. —, by the image buf builds; buf format and buf lint; the test vectors
# of the observation, read by the same image, whose joins and verdicts it computes as section 10 of
# contracts/README.md gives them, but for what Starlark gives a predicate (R86); the test vectors
# of the rules the device and the runner share, read by the same image, which it computes as
# section 12 gives them (R94); the examples of the sample file, read by the same image, strictly,
# and held to the rules of sections 11 and 12, their markup too (R93, R94, R95); the examples of
# the runner's report, report-<case>.json, held to the form of section 14 and to the samples
# beside them (R95); buf
# breaking against the previous release, the newest release tag in the history of HEAD other than
# HEAD's own, whose buf.yaml and contracts/ git archive unpacks, since spec's own history holds
# every release and no file of a release is needed; and the code buf generates, which contracts/
# holds file for file. buf is the toolchain stage's, at an exact version; its Go plugins are the tools of
# contracts/go.mod, and protoc-gen-es the package of tools/. With no .proto file, buf refuses a
# module without one, and the check stops after the layout. A file it does not know is an error, so
# the task that brings it extends the check (RUN.md, T55, T68, T58, T59, T60).
# Check the API contracts in contracts/: buf's rules, R83's own, the generated code, the vectors and
# the examples.
contracts-check: _tools
    node tools/contracts/main.mjs

# Runs from a NovaTrail repository's root, as `just -f spec/justfile sample-check eval/a.json …`:
# each sample file of the eval protocol it names is read strictly and held to the rules of
# contracts/README.md, sections 11 and 12, by the code that holds spec's examples to them (R93, R94), against
# the image buf builds of this spec's contracts/ — the submodule's, at the tag the repository pins.
# The folder it is run from is the root: the paths are from it, a path that leaves it — a link that
# leads out too — or names no file stops the check before buf runs, and a file named twice is
# checked once. buf is the toolchain stage's and reaches no service, since buf.yaml has no deps
# (R83), and no key is needed, so a pull request from a fork runs it too; only _tools reaches the
# npm registry, to install tools/ from its lock file, as docs-check-repo's does, and fails with
# npm's status. A file that breaks a rule gives file:line: message and the exit status 1; a path,
# buf, or a call that names no file, since a check of nothing passes nothing, stops it with 2. In
# spec itself it reads spec's files the same way.
# Check sample files of the eval protocol, from a repository's root.
[positional-arguments]
sample-check *files: _tools
    cd {{quote(invocation_directory())}} && node {{quote(justfile_directory() / "tools/contracts/main.mjs")}} --samples "$@"

# The code buf generates from the contracts, beside the .proto files it comes from (R83): Go of
# protoc-gen-go and protoc-gen-connect-go, JavaScript with its declarations of protoc-gen-es.
# buf writes it into a new folder, and it takes the place of the generated files of
# contracts/, so that a file no .proto gives any more goes too. Then go mod tidy brings
# contracts/go.mod and go.sum in line with what the code imports, as go-check wants them.
# Generate the code of the contracts again.
contracts: _tools
    node tools/contracts/generate.mjs
    go -C contracts mod tidy

# The tests that run the recipes run this same just: sample-check's, from made-up repositories.
# Run contracts-check's own tests, on trial contracts in made-up repositories, with spec's buf.yaml,
# buf.gen.yaml and contracts/go.mod, and buf and its plugins as the check runs them.
contracts-check-test: _tools
    JUST={{quote(just_executable())}} node --test 'tools/contracts/test/*.test.mjs'

# The Go module spec ships at the tag of every release (R64): go.mod and spec.go at the root, which
# embeds format/, and the types of the module format under types/ (R72). It requires nothing: go
# list names it alone. Its zip, as the Go module proxy will build it from a tag, is built of HEAD — a
# commit, not the working tree — by tools/gomod, a module of its own, under the version the line of
# release.yml at HEAD takes, and read back for LICENSE and every file of format/ and of types/. go
# fetches golang.org/x/mod for it at the version tools/gomod/go.sum pins. The vet and the tests of
# this module and of the modules of tools/ are ci-lint's and ci-test's, below.
# The same holds for the module of the contracts, github.com/altnovatrail/spec/contracts in
# contracts/, which ships at the tag contracts/vX.Y.Z with the number of spec's (R83): its go.mod
# and go.sum are as go mod tidy leaves them, its go.mod at HEAD requires the runtime of protobuf and
# of Connect and nothing else, and its zip of HEAD holds LICENSE and every file of contracts/. Its
# go.mod names buf's Go generators as tools, so its requirements stand before the first .proto too.
# go list reads the working tree and tools/gomod the commit, so that a requirement of spec's own
# module is found before it is committed, and what a tag would ship is held as well.
# Check spec's Go modules: what they require, and their zips of HEAD.
go-check:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "$(go list -m all)" != "$(go list -m)" ]; then
        echo "go-check: spec's Go module requires other modules, and it ships with none (R64):" >&2
        go list -m all >&2
        exit 1
    fi
    if ! go -C contracts mod tidy -diff; then
        echo "go-check: contracts/go.mod or go.sum is not as go mod tidy leaves it; run go -C contracts mod tidy" >&2
        exit 1
    fi
    line=$(git show HEAD:.github/workflows/release.yml | node tools/release/line.mjs)
    go -C tools/gomod run . {{quote(justfile_directory())}} HEAD "$line"
    go -C tools/gomod run . {{quote(justfile_directory())}} HEAD "$line" contracts

# The ci- recipes are what .github's shared go.yml runs, one job each, in the toolchain stage of
# .devcontainer/Dockerfile, as it runs them in every Go repository of NovaTrail: "Go / lint", "Go /
# test", "Go / vuln" and "Go / licenses" (R16 .github; R30). Each checks every Go module of spec:
# the root and the modules of tools/, which `./...` at the root does not reach.
#
# The tools only the checks need, at exact versions. Each is a Go program run straight from its
# module, as module-kit's justfile runs them, so nothing is installed for it: the Go module proxy
# serves that version and the checksum database vouches for it. Dependabot does not see them,
# so they are raised by hand.
GOVULNCHECK := "golang.org/x/vuln/cmd/govulncheck@v1.9.0"
GO_LICENSES := "github.com/google/go-licenses/v2@v2.0.1"

# The folder of each Go module of spec, one a line: each go.mod git tracks or would, outside any
# testdata/ — go.mod at the root, contracts, tools/gomod and tools/types/roundtrip today. The tests
# of tools/gomod build their repositories in temporary folders, and the copies new-repo builds in
# .repos/ git ignores. A new module is checked without a change here. A module that holds no Go
# package yet is named and left out, since go vet, go test and govulncheck refuse a pattern that
# matches nothing, as contracts did until its first .proto file, with only the generators of buf (R83).
[private]
_go-modules:
    #!/usr/bin/env bash
    set -euo pipefail
    modules=$(git ls-files --cached --others --exclude-standard -- 'go.mod' '*/go.mod' ':(glob,exclude)**/testdata/**' \
        | sed -e 's|/*go\.mod$||' -e 's|^$|.|' | sort -u)
    if ! grep -qx '\.' <<< "$modules"; then
        echo "_go-modules: git lists no go.mod at the root of spec" >&2
        exit 1
    fi
    while IFS= read -r module; do
        if ! packages=$(go -C "$module" list ./... 2> /dev/null); then
            echo "_go-modules: go list fails in ${module}:" >&2
            go -C "$module" list ./... >&2 || true
            exit 1
        fi
        if [ -z "$packages" ]; then
            echo "_go-modules: ${module} holds no Go package yet, and the Go checks leave it out" >&2
            continue
        fi
        echo "$module"
    done <<< "$modules"

# Fail on Go code gofmt would rewrite, and on what go vet reports.
ci-lint:
    #!/usr/bin/env bash
    set -euo pipefail
    modules=$({{quote(just_executable())}} _go-modules)
    unformatted="$(git ls-files -z --cached --others --exclude-standard -- '*.go' ':(glob,exclude)**/testdata/**' \
        | xargs -0 -r gofmt -l)"
    if [ -n "$unformatted" ]; then
        echo "ci-lint: gofmt would rewrite these files; run gofmt -w on them:" >&2
        echo "$unformatted" >&2
        exit 1
    fi
    while IFS= read -r module; do
        echo "ci-lint: go vet in ${module}"
        go -C "$module" vet ./...
    done <<< "$modules"

# The profiles of the modules go into coverage/go.out, one profile with one mode line, which the job
# coverage of .github's shared go.yml sends to Codecov, as "Go / coverage" (R48). Go counts
# statements, and leaves the tests themselves out; a package that no test runs is in it too, its
# statements at zero. The code buf generates from the contracts, *.pb.go and *.connect.go under
# contracts/, is left out of it: contracts-check holds it to what buf generates, and codecov/patch
# would count every generated line of a new message as a line no test covers (R83).
# Run the tests, with the race detector, and write their coverage.
ci-test:
    #!/usr/bin/env bash
    set -euo pipefail
    modules=$({{quote(just_executable())}} _go-modules)
    rm -f coverage/go.out
    profiles=$(mktemp -d)
    trap 'rm -rf "$profiles"' EXIT
    n=0
    while IFS= read -r module; do
        n=$((n + 1))
        echo "ci-test: go test in ${module}"
        go -C "$module" test -race -count=1 -covermode=atomic -coverprofile="${profiles}/${n}.out" ./...
    done <<< "$modules"
    mkdir -p coverage
    {
        echo "mode: atomic"
        for profile in "$profiles"/*.out; do
            tail -n +2 "$profile" | awk '!/^github\.com\/altnovatrail\/spec\/contracts\/.*\.(pb|connect)\.go:/'
        done
    } > coverage/go.out

# Fail on a known vulnerability in code a module reaches, in the standard library of its Go too.
ci-vuln:
    #!/usr/bin/env bash
    set -euo pipefail
    modules=$({{quote(just_executable())}} _go-modules)
    while IFS= read -r module; do
        echo "ci-vuln: govulncheck in ${module}"
        go -C "$module" run {{GOVULNCHECK}} ./...
    done <<< "$modules"

# The list is ALLOWED_LICENSES, SPDX identifiers separated by commas, which .github's go.yml sets
# from spec's own list; without it, the recipe takes that list itself, as licenses-allowed prints
# it (R12, R39). A module of tools/ is spec's own code under the LICENSE at the root, which
# go-licenses looks for no higher than the module's root: its own packages are left out, and every
# package it is built from is checked.
# Fail if a package a module is built from carries a license outside that list.
ci-licenses:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "${ALLOWED_LICENSES:-}" ]; then
        allowed=$ALLOWED_LICENSES
    else
        allowed=$({{quote(just_executable())}} licenses-allowed | paste -sd , -)
    fi
    modules=$({{quote(just_executable())}} _go-modules)
    while IFS= read -r module; do
        echo "ci-licenses: go-licenses in ${module}"
        ignore=()
        if [ "$module" != . ]; then
            ignore=(--ignore "$(go -C "$module" list -m)")
        fi
        go -C "$module" run {{GO_LICENSES}} check ./... --allowed_licenses="$allowed" "${ignore[@]}"
    done <<< "$modules"

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
# (R31); and a commit that gets a release is refused when its format/VERSION breaks R44 against
# the release before it, once releases carry the format as files: another version of the format
# needs a raised line (tools/release/format-line.mjs). So does a new major package of an API
# contract, novatrail.<part>.vN with N of 2 or more, that the release before had not (R83;
# tools/release/contracts-line.mjs), and another version of the admission table, once releases
# carry it (R96; tools/release/admission-line.mjs). Anywhere else — another repository, a working
# copy in .repos/ among them — the line is
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
    in_spec=false
    if [ "$here" = "$(cd {{quote(justfile_directory())}} && pwd -P)" ]; then
        in_spec=true
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
    tags() {
        git tag --list 'v*'; echo --
        git tag --merged "$commit" --list 'v*'; echo --
        git tag --points-at "$commit" --list 'v*'
    }
    if [ "$in_spec" = true ]; then
        tags | node {{quote(justfile_directory() / "tools/release/version.mjs")}} \
            | node {{quote(justfile_directory() / "tools/release/format-line.mjs")}} "$commit" \
            | node {{quote(justfile_directory() / "tools/release/contracts-line.mjs")}} "$commit" \
            | node {{quote(justfile_directory() / "tools/release/admission-line.mjs")}} "$commit"
    else
        tags | node {{quote(justfile_directory() / "tools/release/version.mjs")}}
    fi

# spec's own (R64): another repository's release builds its own files, by its own recipe. The
# folder is a new one, and a relative path is from spec's root. From the line release.yml sets at
# the commit, FIRST_FILES_LINE on (tools/release/files.mjs), each normative part with a version
# of its own goes in as <part>-<version>.tar.gz — the module format, format-<version>.tar.gz, and
# from FIRST_ADMISSION_LINE on the admission table, admission-<version>.tar.gz (R96): git archive of
# the commit, a folder of that name holding LICENSE and the part as the commit has them, every file
# and nothing else, which the recipe checks against git ls-tree. From
# FIRST_NPM_LINE on, the npm package @altnovatrail/spec goes in too, altnovatrail-spec-<X.Y.Z>.tgz,
# of the release's tag, which the recipe then takes third (R73): npm pack of the package that
# tools/types/npm.mjs writes of the commit's types/, LICENSE and the package's README, read back by
# tar. From FIRST_CONTRACTS_LINE on, the npm package of the contracts' code, @altnovatrail/contracts,
# goes in as well, altnovatrail-contracts-<X.Y.Z>.tgz: npm pack of the package tools/contracts/npm.mjs
# writes of the commit's code of protoc-gen-es under contracts/, LICENSE, the package's README and
# the runtime tools/package.json pins (R83). A commit of an earlier line gets an empty folder. The
# recipe reads the commit alone, never the working tree: release.yml builds the files of the commit
# its checks passed on from the tip's checkout (R31).
# Build the files of spec's release of a commit into a new folder.
release-files commit dir tag="":
    #!/usr/bin/env bash
    set -euo pipefail
    commit=$(git rev-parse --verify --end-of-options {{quote(commit + "^{commit}")}})
    dir={{quote(dir)}}
    if [ -e "$dir" ] || [ -L "$dir" ]; then
        echo "release-files: ${dir} is there already; the files go into a new folder" >&2
        exit 1
    fi
    line=$(git show "${commit}:.github/workflows/release.yml" | node tools/release/line.mjs)
    tag={{quote(tag)}}
    files=$(
        {
            if git cat-file -e "${commit}:format/VERSION" 2>/dev/null; then git show "${commit}:format/VERSION"; fi
            echo --
            if git cat-file -e "${commit}:admission/VERSION" 2>/dev/null; then git show "${commit}:admission/VERSION"; fi
        } | node tools/release/files.mjs "$line" "$tag"
    )
    mkdir -p "$dir"
    while read -r name part; do
        if [ -z "$name" ]; then continue; fi
        if [[ "$name" == *.tgz ]]; then
            case "$part" in
                types) node tools/types/npm.mjs . "${tag#v}" "$dir" "$commit" > /dev/null ;;
                contracts) node tools/contracts/npm.mjs . "${tag#v}" "$dir" "$commit" > /dev/null ;;
                *)
                    echo "release-files: ${name} is an npm package of ${part}/, which no packer of spec builds" >&2
                    exit 1
                    ;;
            esac
            echo "release-files: ${name}, the npm package of ${part}/ at ${commit}"
            continue
        fi
        folder="${name%.tar.gz}"
        git archive --format=tar.gz --prefix="${folder}/" -o "${dir}/${name}" "$commit" LICENSE "$part"
        # Both lists name each file as it is: tar never escapes, and git, with -z, never quotes.
        held=$(tar --quoting-style=literal -tzf "${dir}/${name}" | grep -v '/$' | sort)
        wanted=$(git ls-tree -r -z --name-only "$commit" LICENSE "$part" | tr '\0' '\n' | sed "s|^|${folder}/|" | sort)
        if [ "$held" != "$wanted" ]; then
            echo "release-files: ${name} does not hold LICENSE and the files of ${part}/ at ${commit}, and only them" >&2
            diff <(echo "$wanted") <(echo "$held") >&2 || true
            exit 1
        fi
        echo "release-files: ${name}, $(wc -l <<< "$held") files of ${commit}"
    done <<< "$files"

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

# A file of a NovaTrail release enters NovaTrail only through this check (R77): the release <tag>
# of <repository>, its file, and the file's cosign bundle, <file>.sigstore.json beside it unless
# named; paths are from the caller's directory. tools/release/verify.mjs verifies the bundle for
# the file's bytes by sigstore-js against Sigstore's trust root, which TUF reads afresh from
# Sigstore on every run, and holds the certificate's fields to R77: a file of spec is signed by
# spec's release.yml on main and bound to its tag by what it holds; a file of any other
# repository is signed by the shared release.yml of .github, at the commit of a release of
# .github, v0.1.7 or newer, on its main, at the call of the repository's release.yml on main, of
# the commit of the tag. What GitHub holds it reads through git, with no token and none of the
# caller's git settings; the repositories' numeric IDs are tools/release/repositories.mjs. When
# Sigstore or GitHub cannot be read, the file is refused. Another repository runs it by
# `just -f spec/justfile release-verify`, in its toolchain stage, which reaches the network.
# Verify the signature of a release's file against R77.
release-verify repository tag file bundle="": _tools
    cd {{quote(invocation_directory())}} && node {{quote(justfile_directory() / "tools/release/verify.mjs")}} {{quote(repository)}} {{quote(tag)}} {{quote(file)}} {{ if bundle == "" { "" } else { quote(bundle) } }}

# The same check, for each package of @altnovatrail in an npm lock file of lockfileVersion 2 or 3
# (R37, R77): the archive from the registry, at the lock file's resolved address, verified as the
# release file of the same name, against the bundle that release holds, and the lock file's
# integrity held to the verified bytes. From then on the integrity holds the version. A link to a
# folder is named and skipped; a lock file with no such package has nothing to verify. RULES.md
# has a repository run it in CI of each pull request that changes the lock file.
# Verify each package of @altnovatrail in an npm lock file against R77.
release-verify-npm lock: _tools
    cd {{quote(invocation_directory())}} && node {{quote(justfile_directory() / "tools/release/verify.mjs")}} --npm {{quote(lock)}}

# The tests that run the recipes run this same just. release-verify's tests verify files of real
# releases, tools/release/test/fixtures/, with the packages of tools/ and no network.
# Run the tests of the release recipes: release-version, release-refusal, release-files and release-verify.
release-version-test: _tools
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
# coverage. Then the tests of every Go module, as ci-test runs them, with their profile in
# coverage/go.out, which "Go / coverage" sends from its own run of ci-test (R48).
# Run every test of tools/ and of the Go modules once, and write their coverage.
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
    {{quote(just_executable())}} ci-test

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
