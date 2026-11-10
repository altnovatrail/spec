package spec

import (
	"encoding/json"
	"io/fs"
	"os"
	"regexp"
	"slices"
	"strings"
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

// Admission holds every file of admission/, and its VERSION and its table are what the text says.
func TestAdmissionHoldsEveryFile(t *testing.T) {
	embedded := filesOf(t, Admission)
	onDisk := filesOf(t, os.DirFS("admission"))
	if !slices.Equal(embedded, onDisk) {
		t.Fatalf("Admission holds %d files, and admission/ %d", len(embedded), len(onDisk))
	}
	version, err := fs.ReadFile(Admission, "VERSION")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\n$`).Match(version) {
		t.Fatalf("VERSION is %q, not MAJOR.MINOR and a newline", version)
	}
	table, err := fs.ReadFile(Admission, "admission-table.json")
	if err != nil {
		t.Fatal(err)
	}
	if !json.Valid(table) {
		t.Fatal("admission-table.json is not JSON")
	}
}

// Deployment holds every file of deployment/, and its VERSION is an integer, which the field format
// of the file's schema holds.
func TestDeploymentHoldsEveryFile(t *testing.T) {
	embedded := filesOf(t, Deployment)
	onDisk := filesOf(t, os.DirFS("deployment"))
	if !slices.Equal(embedded, onDisk) {
		t.Fatalf("Deployment holds %d files, and deployment/ %d", len(embedded), len(onDisk))
	}
	version, err := fs.ReadFile(Deployment, "VERSION")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[1-9][0-9]*\n$`).Match(version) {
		t.Fatalf("VERSION is %q, not an integer and a newline", version)
	}
	data, err := fs.ReadFile(Deployment, "schemas/deployment.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties struct {
			Format struct {
				Const json.Number `json:"const"`
			} `json:"format"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatalf("schemas/deployment.schema.json is not JSON: %v", err)
	}
	if want := strings.TrimSuffix(string(version), "\n"); string(schema.Properties.Format.Const) != want {
		t.Fatalf("the field format of the file is the const %q, and VERSION %q", schema.Properties.Format.Const, want)
	}
}

// Legal holds every file of legal/, and its VERSION is an integer, which the field format of the
// passport's schema holds, as the passport itself does.
func TestLegalHoldsEveryFile(t *testing.T) {
	embedded := filesOf(t, Legal)
	onDisk := filesOf(t, os.DirFS("legal"))
	if !slices.Equal(embedded, onDisk) {
		t.Fatalf("Legal holds %d files, and legal/ %d", len(embedded), len(onDisk))
	}
	version, err := fs.ReadFile(Legal, "VERSION")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[1-9][0-9]*\n$`).Match(version) {
		t.Fatalf("VERSION is %q, not an integer and a newline", version)
	}
	data, err := fs.ReadFile(Legal, "schemas/legal.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties struct {
			Format struct {
				Const json.Number `json:"const"`
			} `json:"format"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatalf("schemas/legal.schema.json is not JSON: %v", err)
	}
	want := strings.TrimSuffix(string(version), "\n")
	if string(schema.Properties.Format.Const) != want {
		t.Fatalf("the field format of the passport is the const %q, and VERSION %q", schema.Properties.Format.Const, want)
	}
	passport, err := fs.ReadFile(Legal, "legal.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`(?m)^format: ` + regexp.QuoteMeta(want) + `$`).Match(passport) {
		t.Fatalf("legal.yaml does not hold format: %s", want)
	}
}

// ConsentAge holds every file of consent-age/, and its VERSION is an integer, which the field format
// of the table's schema holds, as the table itself does.
func TestConsentAgeHoldsEveryFile(t *testing.T) {
	embedded := filesOf(t, ConsentAge)
	onDisk := filesOf(t, os.DirFS("consent-age"))
	if !slices.Equal(embedded, onDisk) {
		t.Fatalf("ConsentAge holds %d files, and consent-age/ %d", len(embedded), len(onDisk))
	}
	version, err := fs.ReadFile(ConsentAge, "VERSION")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[1-9][0-9]*\n$`).Match(version) {
		t.Fatalf("VERSION is %q, not an integer and a newline", version)
	}
	data, err := fs.ReadFile(ConsentAge, "schemas/consent-age.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties struct {
			Format struct {
				Const json.Number `json:"const"`
			} `json:"format"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatalf("schemas/consent-age.schema.json is not JSON: %v", err)
	}
	want := strings.TrimSuffix(string(version), "\n")
	if string(schema.Properties.Format.Const) != want {
		t.Fatalf("the field format of the table is the const %q, and VERSION %q", schema.Properties.Format.Const, want)
	}
	table, err := fs.ReadFile(ConsentAge, "consent-age.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`(?m)^format: ` + regexp.QuoteMeta(want) + `$`).Match(table) {
		t.Fatalf("consent-age.yaml does not hold format: %s", want)
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
