---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
  - "tools/gomod/**"
---

# The Go modules of spec

`just go-check` checks spec's Go module, which Go code of the platform takes at the tag of a release — `go.mod` and `spec.go` at the root, which embeds `format/` as `spec.Format`, `admission/` as `spec.Admission`, `deployment/` as `spec.Deployment`, `legal/` as `spec.Legal`, `consent-age/` as `spec.ConsentAge` and `export/` as `spec.Export` — each its own `embed.FS`, so that a binary keeps only the parts it reads —, and the types of the module format under `types/`: that it requires nothing, and its zip as the Go module proxy will build it, which `tools/gomod`, a module of its own, builds of HEAD and reads back; and the same of the module of the contracts, `contracts/`, which requires the runtime of protobuf and Connect alone, and whose package `contracts` embeds its test vectors.

`just ci-lint`, `just ci-test`, `just ci-vuln` and `just ci-licenses` check every Go module of spec — those two and the modules of `tools/`, leaving out and naming a module with no Go package yet — by `gofmt` and `go vet`, `go test -race`, govulncheck and go-licenses, at the versions the justfile pins; `ci-test` writes their coverage to `coverage/go.out`, and a task that touches Go code ends with them green. The types under `types/` are generated: `.claude/rules/types.md`.
