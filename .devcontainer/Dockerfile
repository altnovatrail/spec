# Development container for the NovaTrail spec.
# Exact versions only: the base image is pinned by digest, every tool below by an ARG default.
# Anything a builder understands: no heredocs, no RUN --mount, no TARGETARCH — architecture is
# detected at RUN time via dpkg instead, so any host that has Docker can build this.
#
# `toolchain-core` holds Node, just, Go and buf: what a release needs — its version and its files —
# and every check that runs no browser, and a release builds it alone. `toolchain` adds what
# the repository's tests need — in a copy, its kind's lines at the end of the stage — and is the
# stage the automated checks run inside. `devcontainer` adds what a person needs, and
# devcontainer.json names it as its target. spec's own file ends with `orchestrator`, the
# devcontainer with the Docker CLI and the Dev Containers CLI, which `just new-repo` leaves out of
# a copy: in a copy `devcontainer` is the last stage, the one a build with no target
# gives, and in spec every build names its stage.

# -- toolchain-core: releases the repository, checks it without a browser -----

FROM mcr.microsoft.com/devcontainers/base:3.0.13-noble@sha256:48be4adec1c1ecbe030064700aef85382f5205786a8f82937fc44a7473717eae AS toolchain-core

SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# Node.js LTS: the checks of spec's justfile are npm packages, and a repository's TypeScript runs
# on it too.
ARG NODE_VERSION=24.21.0
ARG JUST_VERSION=1.58.0
# Go, in /usr/local/go, where the shared CodeQL workflow of .github looks for it: a repository's
# Go code is built, vetted, tested and read by CodeQL with it. In spec that code is its Go module
# and the Go tools in tools/, and the checks build the module's zip as the Go module proxy will.
# Every copy gets Go whatever its kind, unused where there is no Go code.
ARG GO_VERSION=1.27.4
# buf formats, lints, compares with the previous release and generates code from the protobuf
# API contracts, spec's contracts/. Every copy gets it as it gets Go, unused where there are
# no contracts: the other repositories take the generated code from a release of spec.
ARG BUF_VERSION=1.75.0
# Each archive's sha256 per architecture, as its publisher lists it: SHASUMS256.txt of the Node
# release, SHA256SUMS of just's, go.dev/dl for Go, sha256.txt of buf's, whose binary comes bare. A
# sum written here keeps a download from being swapped, and is raised with its version.
ARG NODE_SHA256_AMD64=6e1db87ef58b8819e5d5402eff1536491b18edd8eb7bee5ef7897876e88dc5ff
ARG NODE_SHA256_ARM64=724282c3b43aec998aa9527380465b45d229e021b58035f5f4f63095eabfe5d5
ARG JUST_SHA256_AMD64=4a5cc2f53e6f0f8c59092a6cc38291eb729d46a7dd95d3ae582008881b84931d
ARG JUST_SHA256_ARM64=748237128c4c40cbdabc65e841d05ceba13cc23a91eaba395495894c1d9764df
ARG GO_SHA256_AMD64=7226736c2339719cda28fbf3a54d71aa63bcefe376e98cef00034268dab24840
ARG GO_SHA256_ARM64=3392582988a273a87ab5043ee1b2c9c17a2c3c00580bf9326c47a2e0aaaeac92
ARG BUF_SHA256_AMD64=fad1e38d6909bbb583a4da81d8c02a01046e2cd663bde7e337dd24277393764b
ARG BUF_SHA256_ARM64=00eb190aa82df17f393e05b04889cc60a0b13b3259d336e21a87d5f23ab4fd26

# One helper fetches every archive, so each is retried the same way and checked against its sum
# before anything unpacks it. --retry-all-errors is the point: a plain --retry does not repeat a
# transfer that dies partway, the failure a small tunnel MTU produces. An archive still short fails
# its sum.
RUN arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) node_arch=x64; gnu_arch=x86_64; \
            node_sha256="$NODE_SHA256_AMD64"; just_sha256="$JUST_SHA256_AMD64"; go_sha256="$GO_SHA256_AMD64"; \
            buf_sha256="$BUF_SHA256_AMD64" ;; \
        arm64) node_arch=arm64; gnu_arch=aarch64; \
            node_sha256="$NODE_SHA256_ARM64"; just_sha256="$JUST_SHA256_ARM64"; go_sha256="$GO_SHA256_ARM64"; \
            buf_sha256="$BUF_SHA256_ARM64" ;; \
        *) echo "unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    workdir="$(mktemp -d)"; \
    fetch() { \
        local url="$1" out="$2" sha256="$3"; \
        curl -fsSL --proto "=https" --proto-redir "=https" --retry 3 --retry-all-errors \
            -o "$out" "$url"; \
        echo "${sha256}  ${out}" | sha256sum --check --strict -; \
    }; \
    \
    echo "node ${NODE_VERSION}"; \
    mkdir -p /usr/local/node; \
    fetch "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.gz" \
        "$workdir/node-${NODE_VERSION}-${node_arch}.tar.gz" "$node_sha256"; \
    tar -C /usr/local/node --strip-components=1 -xzf "$workdir/node-${NODE_VERSION}-${node_arch}.tar.gz"; \
    \
    echo "just ${JUST_VERSION}"; \
    fetch "https://github.com/casey/just/releases/download/${JUST_VERSION}/just-${JUST_VERSION}-${gnu_arch}-unknown-linux-musl.tar.gz" \
        "$workdir/just-${JUST_VERSION}-${gnu_arch}.tar.gz" "$just_sha256"; \
    tar -C "$workdir" -xzf "$workdir/just-${JUST_VERSION}-${gnu_arch}.tar.gz" just; \
    install -m 0755 "$workdir/just" /usr/local/bin/just; \
    \
    echo "go ${GO_VERSION}"; \
    fetch "https://go.dev/dl/go${GO_VERSION}.linux-${arch}.tar.gz" \
        "$workdir/go-${GO_VERSION}-${arch}.tar.gz" "$go_sha256"; \
    tar -C /usr/local -xzf "$workdir/go-${GO_VERSION}-${arch}.tar.gz"; \
    /usr/local/go/bin/go version; \
    \
    echo "buf ${BUF_VERSION}"; \
    fetch "https://github.com/bufbuild/buf/releases/download/v${BUF_VERSION}/buf-Linux-${gnu_arch}" \
        "$workdir/buf-${BUF_VERSION}-${gnu_arch}" "$buf_sha256"; \
    install -m 0755 "$workdir/buf-${BUF_VERSION}-${gnu_arch}" /usr/local/bin/buf; \
    buf --version; \
    \
    rm -rf "$workdir"

# GOTOOLCHAIN=local: the Go above runs every go command, and none downloads another Go because a
# go.mod asks for a newer one: a go.mod that does fails, which is the signal to raise GO_VERSION.
ENV PATH="/usr/local/node/bin:/usr/local/go/bin:/home/vscode/.local/bin:${PATH}" \
    GOTOOLCHAIN=local

# -- toolchain: the core, plus what the repository's tests need ---------------
#
# What the repository's tests need beyond the core: in spec, nothing; in a copy, the lines its kind
# adds at the end of this stage, if it adds any. What they install, a release never builds, and
# neither do the checks that run no browser: what the release and those ci- recipes call belongs in
# toolchain-core.

FROM toolchain-core AS toolchain

SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# -- devcontainer: the toolchain, plus what a person works with --------------

FROM toolchain AS devcontainer

SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# The GitHub CLI: pull requests, the runs of the checks and their alerts live only on
# github.com and are invisible from inside a container otherwise.
ARG GH_VERSION=2.101.0
# The language server for justfiles: the just extension in devcontainer.json starts it, and
# warns on every justfile it opens when it is missing.
ARG JUST_LSP_VERSION=0.10.0
# Claude Code CLI. The VS Code extension in devcontainer.json must have the same version.
ARG CLAUDE_CODE_VERSION=2.1.280
# The sums, as above: gh_<version>_checksums.txt of the gh release, SHA256SUMS of just-lsp's.
# The helper below repeats toolchain-core's rather than leaving it in that image as a script: the
# checks run in the toolchain images, and nothing there needs it.
ARG GH_SHA256_AMD64=9bca2d1c16825f109907a23307628a2f0698fbf99662b73a5cf0b020293072b8
ARG GH_SHA256_ARM64=b57e8063f18862647c9d22727c32e9da1b963f8bf9db648fe123a6975695640f
ARG JUST_LSP_SHA256_AMD64=3c35e10e76db6cc1931495bb3abdaef02576eaeb406c217420f4fd37e1ebe22c
ARG JUST_LSP_SHA256_ARM64=88d83e1bfb29f5cf41be1d4056d56311bcdcad81aec57b7737cdd98147547478

RUN arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) gnu_arch=x86_64; gh_sha256="$GH_SHA256_AMD64"; just_lsp_sha256="$JUST_LSP_SHA256_AMD64" ;; \
        arm64) gnu_arch=aarch64; gh_sha256="$GH_SHA256_ARM64"; just_lsp_sha256="$JUST_LSP_SHA256_ARM64" ;; \
        *) echo "unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    workdir="$(mktemp -d)"; \
    fetch() { \
        local url="$1" out="$2" sha256="$3"; \
        curl -fsSL --proto "=https" --proto-redir "=https" --retry 3 --retry-all-errors \
            -o "$out" "$url"; \
        echo "${sha256}  ${out}" | sha256sum --check --strict -; \
    }; \
    \
    echo "gh ${GH_VERSION}"; \
    fetch "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${arch}.tar.gz" \
        "$workdir/gh-${GH_VERSION}-${arch}.tar.gz" "$gh_sha256"; \
    tar -C "$workdir" --strip-components=2 \
        -xzf "$workdir/gh-${GH_VERSION}-${arch}.tar.gz" \
        "gh_${GH_VERSION}_linux_${arch}/bin/gh"; \
    install -m 0755 "$workdir/gh" /usr/local/bin/gh; \
    \
    echo "just-lsp ${JUST_LSP_VERSION}"; \
    fetch "https://github.com/terror/just-lsp/releases/download/${JUST_LSP_VERSION}/just-lsp-${JUST_LSP_VERSION}-${gnu_arch}-unknown-linux-musl.tar.gz" \
        "$workdir/just-lsp-${JUST_LSP_VERSION}-${gnu_arch}.tar.gz" "$just_lsp_sha256"; \
    tar -C "$workdir" -xzf "$workdir/just-lsp-${JUST_LSP_VERSION}-${gnu_arch}.tar.gz" ./just-lsp; \
    install -m 0755 "$workdir/just-lsp" /usr/local/bin/just-lsp; \
    \
    rm -rf "$workdir"

# Claude Code comes from the registry at an exact version, not from an installer script off the
# network: npm checks the archive against the hash the registry publishes, and no install script
# runs. The one step the package needs, install.cjs, which puts the native binary of its platform
# package in place of the stub it ships, runs by name afterwards; without it `claude` is a stub
# that says the binary is not installed and exits 1 (the Node wrapper is a fallback started by
# hand). install.cjs exits 0 even when the binary is missing, so claude --version stops the build
# on the stub. npm's cache under root's home goes in the same layer: the container runs as vscode.
RUN echo "claude code ${CLAUDE_CODE_VERSION}" \
    && npm install -g --ignore-scripts "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    && node "$(npm root -g)/@anthropic-ai/claude-code/install.cjs" \
    && claude --version \
    && npm cache clean --force

# The dirs the named volumes are mounted over are created here so the volumes inherit vscode
# ownership — a dir Docker makes for a mount belongs to root, and VS Code Server could not write
# to its own home — and the image is left as that user: nothing in it needs root once it is built.
USER vscode
RUN mkdir -p /home/vscode/.claude /home/vscode/.codex /home/vscode/.config/gh \
        /home/vscode/.vscode-server/extensions

# -- orchestrator: the devcontainer, plus the Docker and Dev Containers CLIs --
#
# spec's alone, for orchestrator/devcontainer.json, which mounts the host's Docker socket so that
# «Сделай эпик E…» runs each task in its repository's container. The fetch helper repeats
# toolchain-core's, as the devcontainer stage's does: a change to one is a change to all three.

FROM devcontainer AS orchestrator

SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

USER root

# The Docker CLI, from Docker's static archive: of its binaries the client, docker, alone — built
# from docker/cli under Apache-2.0 —, and none of the daemon's, which is the host's.
ARG DOCKER_VERSION=29.9.3
# Docker publishes no sums beside its static archives, so each is the sha256 of the archive as
# downloaded over HTTPS, taken again with every raise of the version.
ARG DOCKER_SHA256_AMD64=3fb5d1f13014c18cc54945bc177c58a9056a482dada031e17d12cf2e6922c973
ARG DOCKER_SHA256_ARM64=1b27fd739378ef938401e81ce5afb73b7ad7432d4f598814a9ff5f826bb464d2

RUN arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) gnu_arch=x86_64; docker_sha256="$DOCKER_SHA256_AMD64" ;; \
        arm64) gnu_arch=aarch64; docker_sha256="$DOCKER_SHA256_ARM64" ;; \
        *) echo "unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    workdir="$(mktemp -d)"; \
    fetch() { \
        local url="$1" out="$2" sha256="$3"; \
        curl -fsSL --proto "=https" --proto-redir "=https" --retry 3 --retry-all-errors \
            -o "$out" "$url"; \
        echo "${sha256}  ${out}" | sha256sum --check --strict -; \
    }; \
    \
    echo "docker ${DOCKER_VERSION}"; \
    fetch "https://download.docker.com/linux/static/stable/${gnu_arch}/docker-${DOCKER_VERSION}.tgz" \
        "$workdir/docker-${DOCKER_VERSION}-${gnu_arch}.tgz" "$docker_sha256"; \
    tar -C "$workdir" -xzf "$workdir/docker-${DOCKER_VERSION}-${gnu_arch}.tgz" docker/docker; \
    install -m 0755 "$workdir/docker/docker" /usr/local/bin/docker; \
    docker --version; \
    \
    rm -rf "$workdir"

# The Dev Containers CLI, `devcontainer`, by which the orchestrator rebuilds a repository's
# container or creates its first. It is MIT with no dependencies, and what it bundles is
# under MIT, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD and Python-2.0, all on the allowed list, so it
# needs no exception. Its archive comes from the npm registry at its exact version and is
# unpacked by hand, as npm lays out a package with no dependencies: npm would check it against the
# registry's integrity, not a sum in this file, and the package has no script of its own to run.
ARG DEVCONTAINERS_CLI_VERSION=0.90.0
# The registry lists the archive's sha512, its integrity, and a SHA-1, but no sha256, so each sum
# is the sha256 of the archive as downloaded over HTTPS and checked against that integrity, taken
# again with every raise of the version. The package is JavaScript alone: both sums are one
# archive's.
ARG DEVCONTAINERS_CLI_SHA256_AMD64=b3d40fec9d274a303a29ea91a24852887cf287701bc8d340bfc1cf970542495a
ARG DEVCONTAINERS_CLI_SHA256_ARM64=b3d40fec9d274a303a29ea91a24852887cf287701bc8d340bfc1cf970542495a

# A layer of its own, so that a raise of either version leaves the other's download in the cache.
# Its curl takes the helper's flags.
RUN arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) cli_sha256="$DEVCONTAINERS_CLI_SHA256_AMD64" ;; \
        arm64) cli_sha256="$DEVCONTAINERS_CLI_SHA256_ARM64" ;; \
        *) echo "unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    workdir="$(mktemp -d)"; \
    archive="$workdir/devcontainers-cli-${DEVCONTAINERS_CLI_VERSION}.tgz"; \
    \
    echo "devcontainers cli ${DEVCONTAINERS_CLI_VERSION}"; \
    curl -fsSL --proto "=https" --proto-redir "=https" --retry 3 --retry-all-errors \
        -o "$archive" "https://registry.npmjs.org/@devcontainers/cli/-/cli-${DEVCONTAINERS_CLI_VERSION}.tgz"; \
    echo "${cli_sha256}  ${archive}" | sha256sum --check --strict -; \
    install -d /usr/local/lib/devcontainers-cli; \
    tar -C /usr/local/lib/devcontainers-cli --strip-components=1 --no-same-owner -xzf "$archive" package; \
    ln -s /usr/local/lib/devcontainers-cli/devcontainer.js /usr/local/bin/devcontainer; \
    version="$(devcontainer --version)"; \
    if [[ "$version" != "$DEVCONTAINERS_CLI_VERSION" ]]; then \
        echo "devcontainer --version says ${version}, not ${DEVCONTAINERS_CLI_VERSION}" >&2; exit 1; \
    fi; \
    \
    rm -rf "$workdir"

# The socket's group, by the number docker-group.sh read on the host and left in the context. A
# group of the image may have that number already — 999 is systemd-journal's here, 0 root's where
# the socket is root's own —, and then vscode joins that one: whatever else the group opens in the
# container, the socket itself is root on the host. The group is in /etc/group before the
# container starts, so every process of vscode has it, VS Code's server and each docker exec
# alike. getent answers 2 for a number no group has, which pipefail would take for a failure.
#
# The folder comes whole, since docker-gid may be missing from it: Docker's legacy builder, which
# the Dev Containers CLI falls back to on a host without buildx, builds every stage before its
# target, and the CLI's target follows the end of this file, so spec's ordinary configuration
# builds this stage too, with no docker-gid. Without the file vscode joins no group; the
# orchestrator's own configuration always writes it, or stops before the build.
COPY orchestrator/ /tmp/orchestrator/
RUN gid_file=/tmp/orchestrator/docker-gid; \
    if [[ ! -f "$gid_file" ]]; then \
        echo "orchestrator/docker-gid is not in the context: vscode joins no group of the Docker socket"; \
        rm -rf /tmp/orchestrator; \
        exit 0; \
    fi; \
    gid="$(cat "$gid_file")"; \
    rm -rf /tmp/orchestrator; \
    if [[ ! "$gid" =~ ^[0-9]+$ ]]; then \
        echo "orchestrator/docker-gid holds no group number: ${gid}" >&2; exit 1; \
    fi; \
    group="$(getent group "$gid" | cut -d: -f1 || true)"; \
    if [[ -z "$group" ]]; then \
        group=docker-host; \
        groupadd --gid "$gid" "$group"; \
    fi; \
    usermod --append --groups "$group" vscode; \
    echo "vscode joins ${group}, group ${gid}"

USER vscode
