package spec

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
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

// Each part answers as fs.Sub of its embed.FS does, method for method: the same files, the same
// errors, and the same interfaces.
func TestPartIsWhatSubGives(t *testing.T) {
	for _, each := range []struct {
		part  fs.FS
		files *embed.FS
		dir   string
	}{
		{Format, &formatFiles, "format"},
		{Admission, &admissionFiles, "admission"},
		{Deployment, &deploymentFiles, "deployment"},
		{Legal, &legalFiles, "legal"},
		{ConsentAge, &consentAgeFiles, "consent-age"},
	} {
		sub, err := fs.Sub(each.files, each.dir)
		if err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(filesOf(t, each.part), filesOf(t, sub)) {
			t.Fatalf("%s holds other files than fs.Sub gives", each.dir)
		}
		for _, check := range []func(fs.FS) error{
			func(fsys fs.FS) error { _, ok := fsys.(fs.ReadLinkFS); return boolError(ok) },
			func(fsys fs.FS) error { _, ok := fsys.(fs.SubFS); return boolError(ok) },
			func(fsys fs.FS) error { _, ok := fsys.(fs.GlobFS); return boolError(ok) },
		} {
			if (check(each.part) == nil) != (check(sub) == nil) {
				t.Fatalf("%s does not take the interfaces fs.Sub's value takes", each.dir)
			}
		}
		file, err := each.part.Open("VERSION")
		if err != nil {
			t.Fatal(err)
		}
		file.Close()
		if _, err := each.part.Open("nope"); err == nil || err.Error() != "open nope: file does not exist" {
			t.Fatalf("%s: Open of a missing file gives %v", each.dir, err)
		}
		for _, name := range []string{"VERSION", "nope"} {
			got, gotErr := fs.Lstat(each.part, name)
			want, wantErr := fs.Lstat(sub, name)
			if fmt.Sprint(gotErr) != fmt.Sprint(wantErr) || (got == nil) != (want == nil) {
				t.Fatalf("%s: Lstat %s gives %v, and fs.Sub %v", each.dir, name, gotErr, wantErr)
			}
			_, gotErr = fs.ReadLink(each.part, name)
			_, wantErr = fs.ReadLink(sub, name)
			if fmt.Sprint(gotErr) != fmt.Sprint(wantErr) {
				t.Fatalf("%s: ReadLink %s gives %v, and fs.Sub %v", each.dir, name, gotErr, wantErr)
			}
		}
		got, err := fs.Glob(each.part, "schemas/*.json")
		want, _ := fs.Glob(sub, "schemas/*.json")
		if err != nil || !slices.Equal(got, want) || len(got) == 0 {
			t.Fatalf("%s: Glob gives %v, %v, and fs.Sub %v", each.dir, got, err, want)
		}
		schemas, err := fs.Sub(each.part, "schemas")
		if err != nil {
			t.Fatal(err)
		}
		if names := filesOf(t, schemas); len(names) != len(got) {
			t.Fatalf("%s: Sub of schemas holds %d files, and Glob found %d", each.dir, len(names), len(got))
		}
	}
}

func boolError(ok bool) error {
	if ok {
		return nil
	}
	return errors.New("no")
}

// A folder that fs.ValidPath refuses is no constant of the package; it stops there, as fs.Sub's
// error would.
func TestPartRefusesAFolderNoPathNames(t *testing.T) {
	defer func() {
		if recovered := recover(); recovered == nil || !strings.HasPrefix(fmt.Sprint(recovered), "spec: ") {
			t.Fatalf("a part of ../format recovers %v", recovered)
		}
	}()
	(&part{&formatFiles, "../format"}).Open("VERSION")
}

// A binary keeps only the parts it reads (the amendment of 2026-11-10 to R64): a program that reads
// one part holds a file of that part and no file of another, and one that reads two holds both.
// The compiler's static initialization is what makes it so, not a rule of the language, so the
// test builds the programs, with the go of the toolchain that runs it, and reads the binaries.
func TestBinaryKeepsOnlyThePartsItReads(t *testing.T) {
	if testing.Short() {
		t.Skip("builds programs")
	}
	root, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	goMod, err := os.ReadFile("go.mod")
	if err != nil {
		t.Fatal(err)
	}
	goLine := regexp.MustCompile(`(?m)^go [0-9.]+$`).Find(goMod)
	goTool := filepath.Join(runtime.GOROOT(), "bin", "go")
	// A file of each part that no other part holds, byte for byte.
	marks := map[string]string{
		"Format":     "format/schemas/task.schema.json",
		"Admission":  "admission/admission-table.json",
		"Deployment": "deployment/schemas/deployment.schema.json",
		"Legal":      "legal/legal.yaml",
		"ConsentAge": "consent-age/consent-age.yaml",
	}
	contents := map[string][]byte{}
	for name, file := range marks {
		if contents[name], err = os.ReadFile(file); err != nil {
			t.Fatal(err)
		}
	}
	build := func(names ...string) []byte {
		t.Helper()
		dir := t.TempDir()
		module := "module example.invalid/reader\n\n" + string(goLine) + "\n\nrequire github.com/altnovatrail/spec v0.0.0\n\nreplace github.com/altnovatrail/spec => " + root + "\n"
		parts := make([]string, len(names))
		for i, name := range names {
			parts[i] = "spec." + name
		}
		program := "package main\n\nimport (\n\t\"fmt\"\n\t\"io/fs\"\n\n\t\"github.com/altnovatrail/spec\"\n)\n\nfunc main() {\n\tfor _, part := range []fs.FS{" + strings.Join(parts, ", ") + "} {\n\t\tentries, _ := fs.ReadDir(part, \".\")\n\t\tfmt.Println(len(entries))\n\t}\n}\n"
		for file, text := range map[string]string{"go.mod": module, "main.go": program} {
			if err := os.WriteFile(filepath.Join(dir, file), []byte(text), 0o644); err != nil {
				t.Fatal(err)
			}
		}
		out := filepath.Join(dir, "reader")
		cmd := exec.Command(goTool, "build", "-o", out, ".")
		cmd.Dir = dir
		cmd.Env = append(os.Environ(), "GOWORK=off", "GOPROXY=off", "CGO_ENABLED=0")
		if output, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("go build: %v\n%s", err, output)
		}
		binary, err := os.ReadFile(out)
		if err != nil {
			t.Fatal(err)
		}
		return binary
	}
	for name := range marks {
		binary := build(name)
		for other, content := range contents {
			if held := bytes.Contains(binary, content); held != (other == name) {
				t.Fatalf("a program that reads %s holds %s: %v", name, marks[other], held)
			}
		}
	}
	both := build("Format", "Admission")
	if !bytes.Contains(both, contents["Format"]) || !bytes.Contains(both, contents["Admission"]) || bytes.Contains(both, contents["Legal"]) {
		t.Fatal("a program that reads Format and Admission does not hold both, and those alone")
	}
}
