#!/usr/bin/env bash
# Runs on the host — the machine VS Code itself runs on — before the orchestrator's container is
# built, and on a CI runner before the stage is (R156).
#
# The orchestrator's container mounts the host's Docker socket, and the user vscode reaches it by
# the socket's group, whose number is the host's own: Docker's group has no fixed number. A
# devcontainer.json takes no value from a command — its variables are the host's environment —,
# so the number goes to the build in a file of its context, docker-gid beside this script, which
# git ignores, and the stage orchestrator of the Dockerfile adds vscode to the group of that
# number.
#
# The number is the one the container sees only where Docker runs on the host's own kernel: Linux
# with Docker Engine. Docker Desktop runs it in a virtual machine, whose socket a container gets,
# and the host's file says nothing of its group; on macOS this stops.
#
# The image keeps the number it was built with, and a start of the container does not build it
# again: when the socket's group is no longer the one written, this says so, and the container
# is to be rebuilt. The file is written only when it is missing or its number changes: a file of
# the build's context written at every start, by the same number, looks like a change to whoever
# watches the build's files.
#
#   docker-group.sh [<socket>]        the socket is /var/run/docker.sock unless given

set -euo pipefail

socket="${1:-/var/run/docker.sock}"
out="$(dirname -- "$0")/docker-gid"

if [[ "$(uname -s)" != Linux ]]; then
    echo "docker-group.sh: the orchestrator's container needs Docker on a Linux host, not $(uname -s)" >&2
    exit 1
fi
# -S and -L both follow a link to the socket.
if [[ ! -S "$socket" ]]; then
    echo "docker-group.sh: ${socket} is no socket: the orchestrator's container needs the host's Docker there" >&2
    exit 1
fi

gid="$(stat -L -c %g -- "$socket")"
was=""
if [[ -f "$out" ]]; then
    was="$(cat -- "$out")"
    if [[ "$was" != "$gid" ]]; then
        echo "docker-group.sh: the socket's group was ${was} and is ${gid} now: rebuild the orchestrator's container (Dev Containers: Rebuild Container)" >&2
    fi
fi
if [[ ! -f "$out" || "$was" != "$gid" ]]; then
    echo "$gid" > "$out"
fi
echo "docker socket ${socket}: group ${gid}"
