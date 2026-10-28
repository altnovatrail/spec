// Package spec is what Go code of the NovaTrail platform takes from spec: its normative parts as
// files, at the tag of a release, which is the version of this module (R64). Code takes them
// from here rather than from the spec/ submodule its repository keeps for the documents (R21):
//
//	go get github.com/altnovatrail/spec@v0.3.0
//
// go.sum and the Go checksum database then hold the files to the bytes of that tag.
package spec

import (
	"embed"
	"io/fs"
)

// The prefix all: keeps the files whose names start with a dot or an underscore, which embed
// leaves out otherwise: a vector of packages holds one on purpose, since a module's package
// leaves such files out (format/README.md, section 25).
//
//go:embed all:format
var files embed.FS

// Format is the module format as the release has it: format/ at its tag, with the text, VERSION,
// the schemas, the examples and the test vectors (format/README.md, section 3). Its root is
// format/, so that VERSION is "VERSION" and a schema is "schemas/task.schema.json".
var Format = sub("format")

func sub(dir string) fs.FS {
	part, err := fs.Sub(files, dir)
	if err != nil {
		// fs.Sub fails only on a name fs.ValidPath refuses, and dir is a constant that it takes.
		panic("spec: " + err.Error())
	}
	return part
}
