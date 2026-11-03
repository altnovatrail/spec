// Package contracts holds the test vectors of the API contracts, which Go code takes at the tag of
// a release of the module, contracts/vX.Y.Z, as it takes the code of the contracts (R83, R86):
//
//	go get github.com/altnovatrail/spec/contracts@vX.Y.Z
//
// The package is there from the first release after v0.7.0. What the vectors hold and how a reader
// passes them is the text of the contracts, contracts/README.md, section 10.
package contracts

import (
	"embed"
	"io/fs"
)

// The prefix all: keeps every file that vectors/ holds, so that Vectors is the folder as the
// release has it. The proxy builds the module from git, and contracts-check refuses a file that git
// holds there and that is no vector; a file git ignores is embedded only in a local build.
//
//go:embed all:vectors
var files embed.FS

// Vectors is the test vectors of the contracts as the release has them: vectors/ at its tag, with
// a folder for each package that has them, <part>/vN/, such as observation/v1/boxes.json.
var Vectors = sub("vectors")

func sub(dir string) fs.FS {
	part, err := fs.Sub(files, dir)
	if err != nil {
		// fs.Sub fails only on a name fs.ValidPath refuses, and dir is a constant that it takes.
		panic("contracts: " + err.Error())
	}
	return part
}
