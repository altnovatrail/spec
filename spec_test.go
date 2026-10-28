package spec

import (
	"encoding/json"
	"io/fs"
	"os"
	"regexp"
	"slices"
	"testing"
)

// VERSION is MAJOR.MINOR and a newline, as format-check reads it.
func TestFormatHasItsVersion(t *testing.T) {
	version, err := fs.ReadFile(Format, "VERSION")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\n$`).Match(version) {
		t.Fatalf("VERSION is %q, not MAJOR.MINOR and a newline", version)
	}
}

func TestEverySchemaIsJSON(t *testing.T) {
	schemas, err := fs.Glob(Format, "schemas/*.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	if len(schemas) == 0 {
		t.Fatal("no schemas in format/schemas")
	}
	for _, name := range schemas {
		data, err := fs.ReadFile(Format, name)
		if err != nil {
			t.Fatal(err)
		}
		if !json.Valid(data) {
			t.Errorf("%s is not JSON", name)
		}
	}
}

// Format holds every file of format/ as the module has it, the ones on a dot among them: the
// vector of packages that a module's package leaves .editor-notes out of would lose its point.
func TestFormatHoldsEveryFile(t *testing.T) {
	embedded := filesOf(t, Format)
	onDisk := filesOf(t, os.DirFS("format"))
	if !slices.Equal(embedded, onDisk) {
		t.Fatalf("Format holds %d files, and format/ %d", len(embedded), len(onDisk))
	}
	if !slices.Contains(embedded, "vectors/packages/with-media-and-notice/module/.editor-notes") {
		t.Fatal("Format leaves out the files on a dot")
	}
}

func filesOf(t *testing.T, fsys fs.FS) []string {
	t.Helper()
	var names []string
	err := fs.WalkDir(fsys, ".", func(name string, entry fs.DirEntry, err error) error {
		if err == nil && !entry.IsDir() {
			names = append(names, name)
		}
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	return names
}
