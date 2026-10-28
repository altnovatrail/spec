// The check of spec's Go module by the code the Go module proxy builds module zips with (R64): a
// tool of spec's CI, not part of what spec ships. A module of its own, it stays out of the zip of
// spec's module, and so does golang.org/x/mod, which only it requires.
module github.com/altnovatrail/spec/tools/gomod

go 1.27.0

require golang.org/x/mod v0.42.0
