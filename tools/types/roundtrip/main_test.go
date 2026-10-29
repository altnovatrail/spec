package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// An inventory with every field it always holds: the smallest root type to read and write back.
const inventory = `{"module_format_version": "0.1", "id": "novatrail/a", "version": "1.0.0",
	"server_part": {"digest": "sha256:00", "size": 1}, "device_part": {"digest": "sha256:01", "size": 2}}`

func corpusOf(t *testing.T, cases ...corpusCase) []byte {
	t.Helper()
	data, err := json.Marshal(cases)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func TestAValueReadAndWrittenBackPasses(t *testing.T) {
	count, failures, err := checkCorpus(corpusOf(t,
		corpusCase{File: "a.yaml", Type: "formatv0.Inventory", Value: json.RawMessage(inventory)},
		// A field left out stays out, and a field of zero value stays in.
		corpusCase{File: "b.yaml", Type: "open.Manifest", Value: json.RawMessage(`{"module_format_version": "0.1", "id": "novatrail/a",
			"version": "1.0.0", "title": "A", "subject": "mathematics", "audience": {"age_categories": ["under_13"]},
			"languages": {"explanation": "en"}, "canvas": {}, "authors": [{"name": "A"}], "license": "Apache-2.0"}`)},
		corpusCase{File: "c.yaml", Type: "open.Traps", Value: json.RawMessage(`{}`)},
	))
	if err != nil || count != 3 || len(failures) != 0 {
		t.Fatalf("count %d, failures %v, error %v", count, failures, err)
	}
}

func TestWhatTheTypesCannotHoldFails(t *testing.T) {
	cases := map[string]corpusCase{
		"unknown field":             {Type: "formatv0.Inventory", Value: json.RawMessage(strings.Replace(inventory, `"id"`, `"other": 1, "id"`, 1))},
		"writes another value back": {Type: "formatv0.Inventory", Value: json.RawMessage(strings.Replace(inventory, `"id": "novatrail/a", `, "", 1))},
		"no type formatv0.Nothing":  {Type: "formatv0.Nothing", Value: json.RawMessage(`{}`)},
		"cannot unmarshal":          {Type: "formatv0.Inventory", Value: json.RawMessage(`[]`)},
	}
	for want, c := range cases {
		c.File = "a.yaml"
		_, failures, err := checkCorpus(corpusOf(t, c))
		if err != nil || len(failures) != 1 || !strings.Contains(failures[0], want) || !strings.Contains(failures[0], "a.yaml, read by "+c.Type) {
			t.Errorf("%s: failures %v, error %v", want, failures, err)
		}
	}
}

// A value is one JSON value. json.Marshal writes no corpus with another after it, so the value is
// read here by itself.
func TestAValueWithAnotherAfterItFails(t *testing.T) {
	if err := readStrictly([]byte(inventory+" {}"), typesByName["formatv0.Inventory"]()); err == nil || !strings.Contains(err.Error(), "more than one JSON value") {
		t.Errorf("two values: %v", err)
	}
}

// The part of a vector of the open view with a closed field fails to be read by the open view's
// type, on that field and on nothing else.
func TestAClosedFieldFailsTheOpenView(t *testing.T) {
	if _, failures, err := checkCorpus(corpusOf(t, corpusCase{File: "a.yaml", Type: "open.Traps", Value: json.RawMessage(`{"traps": {}}`), Closed: true})); err != nil || len(failures) != 0 {
		t.Errorf("a closed field: failures %v, error %v", failures, err)
	}
	cases := map[string]string{
		"reads a closed field":   `{}`,
		"fails on another thing": `[]`,
	}
	for want, value := range cases {
		_, failures, err := checkCorpus(corpusOf(t, corpusCase{File: "a.yaml", Type: "open.Traps", Value: json.RawMessage(value), Closed: true}))
		if err != nil || len(failures) != 1 || !strings.Contains(failures[0], want) {
			t.Errorf("%s: failures %v, error %v", want, failures, err)
		}
	}
}

func TestACorpusIsAListOfCases(t *testing.T) {
	for _, data := range []string{`{}`, `[]`, `[`} {
		if _, _, err := checkCorpus([]byte(data)); err == nil {
			t.Errorf("%s passed", data)
		}
	}
}

func TestSameJSONIsTheSameValue(t *testing.T) {
	if same, err := sameJSON([]byte(`{"a": 1, "b": [2]}`), []byte(`{"b":[2],"a":1.0}`)); err != nil || !same {
		t.Errorf("the same value: %v, %v", same, err)
	}
	if same, err := sameJSON([]byte(`{"a": 1}`), []byte(`{"a": "1"}`)); err != nil || same {
		t.Errorf("another value: %v, %v", same, err)
	}
	for _, pair := range [][2]string{{`{`, `{}`}, {`{}`, `{`}} {
		if _, err := sameJSON([]byte(pair[0]), []byte(pair[1])); err == nil {
			t.Errorf("%s and %s: no error", pair[0], pair[1])
		}
	}
}

func TestTheCommandGivesItsStatus(t *testing.T) {
	dir := t.TempDir()
	write := func(name string, data []byte) string {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, data, 0o644); err != nil {
			t.Fatal(err)
		}
		return path
	}
	passing := write("passing.json", corpusOf(t, corpusCase{File: "a.yaml", Type: "formatv0.Inventory", Value: json.RawMessage(inventory)}))
	failing := write("failing.json", corpusOf(t, corpusCase{File: "a.yaml", Type: "formatv0.Nothing", Value: json.RawMessage(`{}`)}))
	empty := write("empty.json", []byte(`[]`))
	cases := []struct {
		args   []string
		status int
		out    string
	}{
		{[]string{passing}, 0, "1 cases, each read by its type and written back as it was"},
		{[]string{failing}, 1, "a.yaml, read by formatv0.Nothing"},
		{[]string{empty}, 1, "holds no case"},
		{[]string{filepath.Join(dir, "missing.json")}, 1, "missing.json"},
		{nil, 2, "usage"},
		{[]string{passing, passing}, 2, "usage"},
	}
	for _, c := range cases {
		var stdout, stderr bytes.Buffer
		if status := run(c.args, &stdout, &stderr); status != c.status || !strings.Contains(stdout.String()+stderr.String(), c.out) {
			t.Errorf("%v: status %d, output %q%q", c.args, status, stdout.String(), stderr.String())
		}
	}
}

// Every type of the registry gives a value to read into: a pointer to a value of its own name.
func TestEveryTypeGivesAValueToReadInto(t *testing.T) {
	for name, newValue := range typesByName {
		value := reflect.ValueOf(newValue())
		if value.Kind() != reflect.Pointer || value.IsNil() {
			t.Errorf("%s gives %v", name, value)
			continue
		}
		if got := value.Elem().Type(); !strings.HasSuffix(name, "."+got.Name()) || !strings.HasSuffix(got.PkgPath(), "/"+strings.Split(name, ".")[0]) {
			t.Errorf("%s gives a %s.%s", name, got.PkgPath(), got.Name())
		}
	}
}
