package contracts

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"reflect"
	"slices"
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

// Go reads every example of the sample file as contracts-check does: protojson takes each strictly,
// refusing a field it does not know, and writes it back, with the protobuf names and every field,
// as the example has it (contracts/README.md, section 11). A field added to a sample is refused.
func TestSamplesReadInGo(t *testing.T) {
	examples := os.DirFS("examples")
	names, err := fs.Glob(examples, "eval/v1/*.json")
	if err != nil {
		t.Fatal(err)
	}
	if len(names) == 0 {
		t.Fatal("no examples of the sample file")
	}
	for _, name := range names {
		data, err := fs.ReadFile(examples, name)
		if err != nil {
			t.Fatal(err)
		}
		readBack(t, name, data, &evalv1.Sample{})
		extra, ok := jsonOf(t, data).(map[string]any)
		if !ok {
			t.Fatalf("%s is no JSON object", name)
		}
		extra["writer_name"] = "x"
		added, err := json.Marshal(extra)
		if err != nil {
			t.Fatal(err)
		}
		if err := protojson.Unmarshal(added, &evalv1.Sample{}); err == nil {
			t.Errorf("%s: protojson takes a field the sample file does not have", name)
		}
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
