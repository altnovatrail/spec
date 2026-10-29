// The check that the types of spec's Go module read the values of format/ and write them back
// (R72): a tool of spec's CI, not part of what spec ships. A module of its own, it stays out of the
// zip of spec's module, and it takes the module it checks from the working tree, not a release.
// Its go.sum is empty: the one module it requires is spec's own, replaced by a folder, and Go keeps
// no sum of a module a folder replaces.
module github.com/altnovatrail/spec/tools/types/roundtrip

go 1.27.0

require github.com/altnovatrail/spec v0.0.0

replace github.com/altnovatrail/spec => ../../..
