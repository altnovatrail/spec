// Command roundtrip reads each value of a corpus into the Go type it names and writes it back
// (R72):
//
//	go -C tools/types/roundtrip run . <corpus>
//
// The corpus, which tools/types/corpus.mjs writes, holds the values of format/ that pass a schema,
// each with the type of formatv0 that reads it, and the open view of each vector of the open view
// with the type of open that reads it. A value is read strictly — a field its type has not fails
// it, as does anything after it — and written again, and the JSON written is the value read,
// whatever the order of its keys. A case marked closed is the part of a vector of the open view
// that holds a closed field, read by the type of its open view: reading it fails on that field, or
// the check does. Prints one line per failure and the count of cases, and exits 1 on any failure.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"reflect"
	"strings"
)

// A case of the corpus.
type corpusCase struct {
	File   string          `json:"file"`
	Type   string          `json:"type"`
	Value  json.RawMessage `json:"value"`
	Closed bool            `json:"closed"`
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}

// run checks the corpus its one argument names, and gives the exit status: 0 when every case
// passes, 1 when one fails or the corpus cannot be read, 2 for other arguments.
func run(args []string, stdout, stderr io.Writer) int {
	if len(args) != 1 {
		fmt.Fprintln(stderr, "usage: go -C tools/types/roundtrip run . <corpus>")
		return 2
	}
	data, err := os.ReadFile(args[0])
	if err != nil {
		fmt.Fprintln(stderr, "roundtrip: "+err.Error())
		return 1
	}
	count, failures, err := checkCorpus(data)
	if err != nil {
		fmt.Fprintln(stderr, "roundtrip: "+err.Error())
		return 1
	}
	for _, failure := range failures {
		fmt.Fprintln(stderr, "roundtrip: "+failure)
	}
	if len(failures) > 0 {
		return 1
	}
	fmt.Fprintf(stdout, "roundtrip: %d cases, each read by its type and written back as it was\n", count)
	return 0
}

// checkCorpus checks each case of a corpus: the count of cases, and a line for each that fails.
func checkCorpus(data []byte) (int, []string, error) {
	var cases []corpusCase
	if err := json.Unmarshal(data, &cases); err != nil {
		return 0, nil, fmt.Errorf("the corpus is no list of cases: %w", err)
	}
	if len(cases) == 0 {
		return 0, nil, errors.New("the corpus holds no case")
	}
	var failures []string
	for _, c := range cases {
		if err := checkCase(c); err != nil {
			failures = append(failures, fmt.Sprintf("%s, read by %s: %v", c.File, c.Type, err))
		}
	}
	return len(cases), failures, nil
}

// checkCase reads a case's value by its type and writes it back, or, for a closed case, reads it
// and expects a field the type has not.
func checkCase(c corpusCase) error {
	newValue, ok := typesByName[c.Type]
	if !ok {
		return fmt.Errorf("no type %s in typesByName", c.Type)
	}
	value := newValue()
	err := readStrictly(c.Value, value)
	if c.Closed {
		if err == nil {
			return errors.New("reads a closed field of the part into its open view")
		}
		if !strings.Contains(err.Error(), "unknown field") {
			return fmt.Errorf("fails on another thing than a closed field: %w", err)
		}
		return nil
	}
	if err != nil {
		return err
	}
	written, err := json.Marshal(value)
	if err != nil {
		return err
	}
	same, err := sameJSON(c.Value, written)
	if err != nil {
		return err
	}
	if !same {
		return fmt.Errorf("writes another value back:\n  read    %s\n  written %s", c.Value, written)
	}
	return nil
}

// readStrictly reads one JSON value into value, failing on a field that value's type has not and
// on anything after the value.
func readStrictly(data []byte, value any) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return err
	}
	if _, err := decoder.Token(); err != io.EOF {
		return errors.New("more than one JSON value")
	}
	return nil
}

// sameJSON says whether two JSON texts hold the same value, whatever the order of their keys.
func sameJSON(a, b []byte) (bool, error) {
	var x, y any
	if err := json.Unmarshal(a, &x); err != nil {
		return false, err
	}
	if err := json.Unmarshal(b, &y); err != nil {
		return false, err
	}
	return reflect.DeepEqual(x, y), nil
}
