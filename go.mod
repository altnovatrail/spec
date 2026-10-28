// The Go module of spec: what Go code of the platform takes from spec, at the tag of a release
// (R64). Its versions are spec's release tags, vX.Y.Z, and it requires nothing: `just go-check`
// says so on every run. From spec v2 on its path ends in /v2, as Go asks of a module's major
// version, and the check of the module's zip refuses a path that does not.
module github.com/altnovatrail/spec

go 1.27.0
