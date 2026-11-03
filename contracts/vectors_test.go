package contracts

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"reflect"
	"slices"
	"strings"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	evalv1 "github.com/altnovatrail/spec/contracts/novatrail/eval/v1"
	observationv1 "github.com/altnovatrail/spec/contracts/novatrail/observation/v1"
)

// Vectors holds every file of vectors/ as the module has it.
func TestVectorsHoldEveryFile(t *testing.T) {
	embedded := filesOf(t, Vectors)
	onDisk := filesOf(t, os.DirFS("vectors"))
	if len(embedded) == 0 {
		t.Fatal("Vectors holds no file")
	}
	if !slices.Equal(embedded, onDisk) {
		t.Fatalf("Vectors holds %d files, and vectors/ %d", len(embedded), len(onDisk))
	}
}

// Go reads every observation of the vectors as protobuf-es does in contracts-check: protojson takes
// each, refusing a field it does not know, and writes it back, with the protobuf names and every
// field, as the vector has it (contracts/README.md, section 6). A reader in Go then passes them as
// they are written.
func TestObservationsReadInGo(t *testing.T) {
	names, err := fs.Glob(Vectors, "observation/v1/*.json")
	if err != nil {
		t.Fatal(err)
	}
	if len(names) == 0 {
		t.Fatal("no vectors of the observation")
	}
	for _, name := range names {
		data, err := fs.ReadFile(Vectors, name)
		if err != nil {
			t.Fatal(err)
		}
		var vector struct {
			Cases []struct {
				Observations []json.RawMessage `json:"observations"`
				Joined       json.RawMessage   `json:"joined"`
			} `json:"cases"`
		}
		if err := json.Unmarshal(data, &vector); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		for k, one := range vector.Cases {
			observations := one.Observations
			if one.Joined != nil && string(one.Joined) != "null" {
				observations = append(observations, one.Joined)
			}
			for n, raw := range observations {
				readBack(t, fmt.Sprintf("%s, case %d, observation %d", name, k+1, n+1), raw, &observationv1.Observation{})
			}
		}
	}
}

// The messages a case of a vector of the rules the device and the runner share holds: by its key,
// a message or a list of them, and by its key and a key within each member of a list, the message
// there or null.
var (
	ruleMessages = map[string]func() proto.Message{
		"history":      func() proto.Message { return &evalv1.History{} },
		"strokes":      func() proto.Message { return &evalv1.FinalStroke{} },
		"groups":       func() proto.Message { return &evalv1.Group{} },
		"group_boxes":  func() proto.Message { return &evalv1.TenthsBox{} },
		"crops":        func() proto.Message { return &evalv1.CropSet{} },
		"boxes":        func() proto.Message { return &evalv1.PageBox{} },
		"filled_boxes": func() proto.Message { return &evalv1.FilledBox{} },
	}
	ruleMembers = map[string]map[string]func() proto.Message{
		"snaps": {
			"box":     func() proto.Message { return &observationv1.CropBox{} },
			"snapped": func() proto.Message { return &evalv1.TenthsBox{} },
		},
		"verdicts": {
			"answer_slot": func() proto.Message { return &observationv1.AnswerSlotPlace{} },
		},
	}
)

// Go reads every message of the vectors of the rules as protobuf-es does in contracts-check:
// protojson takes each strictly and writes it back, with the protobuf names and every field, as the
// vector has it (contracts/README.md, sections 6 and 12). A null where a message may be absent —
// a box that takes no stroke, a stroke of the draft — holds none.
func TestRuleVectorsReadInGo(t *testing.T) {
	names, err := fs.Glob(Vectors, "eval/v1/*.json")
	if err != nil {
		t.Fatal(err)
	}
	if len(names) != 4 {
		t.Fatalf("the vectors of the rules are 4 files, and eval/v1/ holds %d", len(names))
	}
	read := 0
	for _, name := range names {
		data, err := fs.ReadFile(Vectors, name)
		if err != nil {
			t.Fatal(err)
		}
		var vector struct {
			Cases []map[string]json.RawMessage `json:"cases"`
		}
		if err := json.Unmarshal(data, &vector); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		for k, one := range vector.Cases {
			for key, raw := range one {
				what := fmt.Sprintf("%s, case %d, %s", name, k+1, key)
				if message, ok := ruleMessages[key]; ok {
					read += readEach(t, what, raw, "", message)
				}
				for field, message := range ruleMembers[key] {
					read += readEach(t, what, raw, field, message)
				}
			}
		}
	}
	if read == 0 {
		t.Fatal("the vectors of the rules hold no message")
	}
}

// readEach reads back raw, a message or a list of them — or, with a field, the message at that
// field of each member of the list —, and says how many it read.
func readEach(t *testing.T, what string, raw json.RawMessage, field string, message func() proto.Message) int {
	t.Helper()
	var members []json.RawMessage
	if err := json.Unmarshal(raw, &members); err != nil {
		members = []json.RawMessage{raw}
	}
	read := 0
	for n, member := range members {
		if field != "" {
			var object map[string]json.RawMessage
			if err := json.Unmarshal(member, &object); err != nil {
				t.Fatalf("%s %d: %v", what, n+1, err)
			}
			member = object[field]
		}
		if member == nil || string(member) == "null" {
			continue
		}
		readBack(t, fmt.Sprintf("%s %d", what, n+1), member, message())
		read++
	}
	return read
}

// Go reads every example of the sample file as contracts-check does: protojson takes each strictly,
// refusing a field it does not know, and writes it back, with the protobuf names and every field,
// as the example has it, its markup too (contracts/README.md, section 11). A field added to a sample
// is refused.
func TestSamplesReadInGo(t *testing.T) {
	readExamples(t, false, func() proto.Message { return &evalv1.Sample{} }, "writer_name")
}

// Go reads every example of the runner's report, report-<case>.json, as it reads the samples
// (contracts/README.md, sections 3 and 14). A field added to a report is refused.
func TestReportsReadInGo(t *testing.T) {
	readExamples(t, true, func() proto.Message { return &evalv1.Report{} }, "sample_text")
}

// readExamples reads the examples of the eval protocol that are reports, or those that are not, as
// the message gives: each back as it is written, and refused with the field extra added to it.
func readExamples(t *testing.T, reports bool, message func() proto.Message, extra string) {
	t.Helper()
	examples := os.DirFS("examples")
	names, err := fs.Glob(examples, "eval/v1/*.json")
	if err != nil {
		t.Fatal(err)
	}
	read := 0
	for _, name := range names {
		if strings.HasPrefix(path.Base(name), "report-") != reports {
			continue
		}
		read++
		data, err := fs.ReadFile(examples, name)
		if err != nil {
			t.Fatal(err)
		}
		readBack(t, name, data, message())
		value, ok := jsonOf(t, data).(map[string]any)
		if !ok {
			t.Fatalf("%s is no JSON object", name)
		}
		value[extra] = "x"
		added, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		if err := protojson.Unmarshal(added, message()); err == nil {
			t.Errorf("%s: protojson takes the field %s, which the message does not have", name, extra)
		}
	}
	if read == 0 {
		t.Fatalf("no examples of %T", message())
	}
}

// readBack reads raw into message as protojson reads by default, refusing a field it does not
// know, and writes it back as a writer of a contract does, with the protobuf names and every field
// (contracts/README.md, section 6): the JSON it writes is the one it read.
func readBack(t *testing.T, what string, raw []byte, message proto.Message) {
	t.Helper()
	if err := protojson.Unmarshal(raw, message); err != nil {
		t.Errorf("%s: %v", what, err)
		return
	}
	written, err := protojson.MarshalOptions{UseProtoNames: true, EmitDefaultValues: true}.Marshal(message)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(jsonOf(t, raw), jsonOf(t, written)) {
		t.Errorf("%s: Go writes it %s", what, written)
	}
}

func jsonOf(t *testing.T, data []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	return value
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
