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
//go:embed all:format all:admission all:deployment all:legal all:consent-age
var files embed.FS

// Format is the module format as the release has it: format/ at its tag, with the text, VERSION,
// the schemas, the examples and the test vectors (format/README.md, section 3). Its root is
// format/, so that VERSION is "VERSION" and a schema is "schemas/task.schema.json".
var Format = sub("format")

// Admission is the admission table as the release has it (R96): admission/ at its tag, with the
// text, VERSION, the table, its schemas, its examples and its test vectors (admission/README.md,
// section 3). Its root is admission/, so that the table is "admission-table.json".
var Admission = sub("admission")

// Deployment is the format of the deployment configuration as the release has it (R85):
// deployment/ at its tag, with the text, VERSION, the schemas, the examples and the test vectors
// (deployment/README.md, section 3). Its root is deployment/, so that the schema of the file is
// "schemas/deployment.schema.json".
var Deployment = sub("deployment")

// Legal is the legal texts as the release has them (R130): legal/ at its tag, with the text,
// VERSION, the passport, the versions of the texts, the schemas, the examples and the test vectors
// (legal/README.md, section 3). Its root is legal/, so that the passport is "legal.yaml" and a
// version of a text is "texts/privacy-policy/1.md". api serves the texts from it
// (legal/README.md, section 8).
var Legal = sub("legal")

// ConsentAge is the table of the age of digital consent as the release has it (R134):
// consent-age/ at its tag, with the text, VERSION, the table, the schemas, the examples and the
// test vectors (consent-age/README.md, section 3). Its root is consent-age/, so that the table is
// "consent-age.yaml". api computes a learner's age category by it (consent-age/README.md,
// section 6).
var ConsentAge = sub("consent-age")

func sub(dir string) fs.FS {
	part, err := fs.Sub(files, dir)
	if err != nil {
		// fs.Sub fails only on a name fs.ValidPath refuses, and dir is a constant that it takes.
		panic("spec: " + err.Error())
	}
	return part
}
