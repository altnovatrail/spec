#!/bin/sh
# toolchain.sh: on a CI runner, the toolchain stage of the repository's .devcontainer/Dockerfile
# and the commands that run in it, as they run in the devcontainer (R30, R31). The runner runs
# this file with its own shell, from the repository's root: spec's CI and release run
# tools/toolchain/toolchain.sh, and another repository's workflows run the one in its spec
# submodule, at the tag it pins. How the stage is built, how a command runs in it and where
# spec's recipes are are written here once, and a change to them reaches every caller with the
# tag.
#
#   toolchain.sh build                                   build the stage as the image novatrail-toolchain,
#                                                        or load it from TOOLCHAIN_IMAGE_FILE (below)
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
# The image may come from a file of docker save, which the caller keeps in the cache of GitHub
# Actions by the sha256 of the Dockerfile (R31): TOOLCHAIN_IMAGE_FILE names it, its whole path.
# Unset or empty, build builds the stage, as ever; a release sets it never, so the image of the job
# that signs is built from the Dockerfile. Set, build
#   - loads the file, if it is there, and holds that it gave the image novatrail-toolchain, then
#     removes the file and builds nothing. A file that does not load, or loads another image, is
#     removed and the stage is built, with a warning, and no file is written: the cache was hit,
#     and its entry cannot change;
#   - else builds the stage and writes the file by docker save. A save that fails leaves a
#     warning and no file, and build still succeeds: the image is there.
# Each is one call of docker: load --quiet --input <file>, image inspect novatrail-toolchain,
# build as above, save --output <file> novatrail-toolchain. The inspect holds on a runner that had
# no image of that name before, as a hosted runner has none. A warning is a workflow command on
# stdout with no path in it, so no character of the caller's path is read as another command; the
# path goes to stderr beside it.
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

# A file of the image that is used or broken goes; one that is no file stays, and the build goes on.
forget() {
    rm -f -- "$1" 2> /dev/null || :
}

# The Dockerfile copies nothing from the repository, so it is built without a context.
build_stage() {
    docker build --target toolchain --tag "$image" - < .devcontainer/Dockerfile
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
        file=${TOOLCHAIN_IMAGE_FILE:-}
        if [ -z "$file" ]; then
            build_stage
            exit
        fi
        if [ -f "$file" ]; then
            if docker load --quiet --input "$file" > /dev/null && docker image inspect "$image" > /dev/null; then
                forget "$file"
                exit 0
            fi
            forget "$file"
            echo "toolchain.sh: ${file}" >&2
            echo "::warning::toolchain.sh: the file of TOOLCHAIN_IMAGE_FILE did not give the image ${image}, so it is built. The cache entry that held the file is broken and stays: delete it, or it is hit again"
            build_stage
            exit
        fi
        build_stage
        if ! docker save --output "$file" "$image"; then
            forget "$file"
            echo "toolchain.sh: ${file}" >&2
            echo "::warning::toolchain.sh: docker save could not write the file of TOOLCHAIN_IMAGE_FILE; the image is built, but not cached"
        fi
        exit 0
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
