#!/bin/sh
# toolchain.sh: on a CI runner, the toolchain stage of the repository's .devcontainer/Dockerfile
# and the commands that run in it, as they run in the devcontainer (R30, R31). The runner runs
# this file with its own shell, from the repository's root: spec's CI and release run
# tools/toolchain/toolchain.sh, and another repository's workflows run the one in its spec
# submodule, at the tag it pins. How the stage is built, how a command runs in it and where
# spec's recipes are are written here once, and a change to them reaches every caller with the
# tag.
#
#   toolchain.sh build                                   build the stage as the image novatrail-toolchain
#   toolchain.sh run <command> [<argument>...]           run a command in it
#   toolchain.sh spec [--dry-run] <recipe> [<argument>...]
#                                                        run one of spec's recipes, from spec's justfile
#
# A command runs as the runner's user, so that what it writes in the checkout is the runner's and
# git finds the repository owned by the user it runs as, with its home in /tmp. The repository is
# mounted at /work, and RUNNER_TEMP read-only at its own path, where gh leaves the error of a
# refused release; nothing else of the runner's environment goes in. The paths reach docker as
# arguments, never as the text of a script, so no character in them is read as shell syntax. A
# colon is the one character they may not hold: docker's --volume splits on it.
#
# A recipe that runs only on a rare path — release-refusal, after a refusal of the Releases API —
# is asked first with --dry-run and the arguments of the call that would come: just's dry run
# parses the call, prints the recipe and runs nothing. A tag of spec whose recipe is gone or takes
# another number of arguments then stops the run that checks it out, not the rare one. Arguments
# that only swapped places it cannot see.

set -eu

image=novatrail-toolchain

fail() {
    echo "toolchain.sh: $*" >&2
    exit 2
}

# The repository, where the runner runs this from, and spec, two levels above this file: the
# same folder in spec itself, the spec submodule anywhere else.
here=$(pwd -P)
spec=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)

# spec's justfile as the container sees it, from /work.
spec_justfile() {
    if [ "$spec" = "$here" ]; then
        echo justfile
        return
    fi
    case "$spec" in
        "$here"/*) echo "${spec#"$here"/}/justfile" ;;
        *) fail "run it from the root of the repository: ${spec} is not inside ${here}" ;;
    esac
}

run() {
    if [ -z "${RUNNER_TEMP:-}" ]; then
        fail "RUNNER_TEMP is not set: this runs on a CI runner"
    fi
    case "${here}${RUNNER_TEMP}" in
        *:*) fail "docker's --volume cannot mount a path with a colon: ${here}, ${RUNNER_TEMP}" ;;
    esac
    exec docker run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp \
        --volume "${here}:/work" --volume "${RUNNER_TEMP}:${RUNNER_TEMP}:ro" \
        --workdir /work "$image" "$@"
}

if [ $# -eq 0 ]; then
    fail "say what to do: build, run or spec"
fi
what=$1
shift
case "$what" in
    build)
        if [ $# -ne 0 ]; then
            fail "build takes nothing more"
        fi
        if [ ! -f .devcontainer/Dockerfile ]; then
            fail "no .devcontainer/Dockerfile in ${here}: run it from the root of the repository"
        fi
        # The Dockerfile copies nothing from the repository, so it is built without a context.
        exec docker build --target toolchain --tag "$image" - < .devcontainer/Dockerfile
        ;;
    run)
        if [ $# -eq 0 ]; then
            fail "run takes the command to run"
        fi
        run "$@"
        ;;
    spec)
        justfile=$(spec_justfile)
        dry_run=false
        if [ "${1:-}" = --dry-run ]; then
            dry_run=true
            shift
        fi
        if [ $# -eq 0 ]; then
            fail "spec takes the recipe to run"
        fi
        if [ "$dry_run" = true ]; then
            run just -f "$justfile" --dry-run "$@"
        else
            run just -f "$justfile" "$@"
        fi
        ;;
    *)
        fail "${what}: not one of build, run and spec"
        ;;
esac
