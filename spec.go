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

// The files of format/. Each part is an embed.FS of its own, and its name below is a pointer to a
// part, which takes the folder off at each call: no code runs when the package starts, so a binary
// keeps only the parts it reads (the amendment of 2026-11-10 to R64). One embed.FS, or fs.Sub run
// as the package starts, would keep every part in every binary that imports the package.
//
// Every part's directive has the prefix all:, which keeps the files whose names start with a dot or
// an underscore, which embed leaves out otherwise: a vector of packages holds one on purpose, since
// a module's package leaves such files out (format/README.md, section 25).
//
//go:embed all:format
var formatFiles embed.FS

// The files of admission/, with the prefix all: as format/'s.
//
//go:embed all:admission
var admissionFiles embed.FS

// The files of deployment/, with the prefix all: as format/'s.
//
//go:embed all:deployment
var deploymentFiles embed.FS

// The files of legal/, with the prefix all: as format/'s.
//
//go:embed all:legal
var legalFiles embed.FS

// The files of consent-age/, with the prefix all: as format/'s.
//
//go:embed all:consent-age
var consentAgeFiles embed.FS

// The files of export/, with the prefix all: as format/'s.
//
//go:embed all:export
var exportFiles embed.FS

// Format is the module format as the release has it: format/ at its tag, with the text, VERSION,
// the schemas, the examples and the test vectors (format/README.md, section 3). Its root is
// format/, so that VERSION is "VERSION" and a schema is "schemas/task.schema.json".
var Format fs.FS = &part{&formatFiles, "format"}

// Admission is the admission table as the release has it (R96): admission/ at its tag, with the
// text, VERSION, the table, its schemas, its examples and its test vectors (admission/README.md,
// section 3). Its root is admission/, so that the table is "admission-table.json".
var Admission fs.FS = &part{&admissionFiles, "admission"}

// Deployment is the format of the deployment configuration as the release has it (R85):
// deployment/ at its tag, with the text, VERSION, the schemas, the examples and the test vectors
// (deployment/README.md, section 3). Its root is deployment/, so that the schema of the file is
// "schemas/deployment.schema.json".
var Deployment fs.FS = &part{&deploymentFiles, "deployment"}

// Legal is the legal texts as the release has them (R130): legal/ at its tag, with the text,
// VERSION, the passport, the versions of the texts, the schemas, the examples and the test vectors
// (legal/README.md, section 3). Its root is legal/, so that the passport is "legal.yaml" and a
// version of a text is "texts/privacy-policy/1.md". api serves the texts from it
// (legal/README.md, section 8).
var Legal fs.FS = &part{&legalFiles, "legal"}

// ConsentAge is the table of the age of digital consent as the release has it (R134):
// consent-age/ at its tag, with the text, VERSION, the table, the schemas, the examples and the
// test vectors (consent-age/README.md, section 3). Its root is consent-age/, so that the table is
// "consent-age.yaml". api computes a learner's age category by it (consent-age/README.md,
// section 6).
var ConsentAge fs.FS = &part{&consentAgeFiles, "consent-age"}

// Export is the format of the export as the release has it (R135): export/ at its tag, with the
// text, VERSION, the schemas of the files of an export, the examples and the test vectors
// (export/README.md, section 3). Its root is export/, so that the schema of a profile's file is
// "schemas/profile.schema.json". api writes its part of an export by it (export/README.md,
// section 8).
var Export fs.FS = &part{&exportFiles, "export"}

// part is a folder of an embed.FS seen as its root, as fs.Sub gives it: the same paths, the same
// errors and the same methods — those of fs.ReadDirFS, fs.ReadFileFS, fs.GlobFS, fs.SubFS and
// fs.ReadLinkFS. Each call takes the folder off anew.
type part struct {
	files *embed.FS
	dir   string
}

func (p *part) root() fs.FS {
	root, err := fs.Sub(p.files, p.dir)
	if err != nil {
		// fs.Sub fails only on a name fs.ValidPath refuses, and dir is a constant that it takes.
		panic("spec: " + err.Error())
	}
	return root
}

func (p *part) Open(name string) (fs.File, error) { return p.root().Open(name) }

func (p *part) ReadFile(name string) ([]byte, error) { return fs.ReadFile(p.root(), name) }

func (p *part) ReadDir(name string) ([]fs.DirEntry, error) { return fs.ReadDir(p.root(), name) }

func (p *part) Glob(pattern string) ([]string, error) { return fs.Glob(p.root(), pattern) }

func (p *part) Sub(dir string) (fs.FS, error) { return fs.Sub(p.root(), dir) }

func (p *part) ReadLink(name string) (string, error) { return fs.ReadLink(p.root(), name) }

func (p *part) Lstat(name string) (fs.FileInfo, error) { return fs.Lstat(p.root(), name) }
