# gopls is the language server that the Go extension in devcontainer.json starts. It is built
# with the Go of the toolchain stage, and only here: the checks do not need it. This step and
# gopls/ beside this file are the go kind's of spec's repo-template, and a move to a tag of spec
# brings them with the rest of the devcontainer (R102).
ARG GOPLS_VERSION=0.24.0

# gopls is built from its lock file, gopls/ in this folder. Its go.mod names gopls as a tool at an
# exact version, and its go.sum holds the hash of every module the build takes. -mod=readonly
# builds from that lock and nothing else: a module missing from go.sum, or with another hash, stops
# the build, as a wrong sum stops an archive (R34). The built gopls must name GOPLS_VERSION
# exactly, so the lock and the ARG cannot drift apart; spec's tests and new-repo-check hold them
# to each other too, since CI never builds this stage. Everything the step writes stays in one
# folder that the same layer removes: go clean takes the module cache, whose files the go command
# makes read-only, and the build cache, and XDG_CONFIG_HOME keeps the telemetry counters of go and
# gopls there as well. The checks build the toolchain stage alone, with no context, and never
# reach this COPY.
COPY gopls/go.mod gopls/go.sum /tmp/gopls-build/src/
RUN echo "gopls ${GOPLS_VERSION}"; \
    build=/tmp/gopls-build; \
    export GOPATH="$build" GOCACHE="$build/cache" XDG_CONFIG_HOME="$build/config"; \
    cd "$build/src"; \
    GOBIN=/usr/local/bin go install -mod=readonly tool; \
    gopls version | grep -xF "golang.org/x/tools/gopls v${GOPLS_VERSION}"; \
    go clean -cache -modcache; \
    cd /; \
    rm -rf "$build"
