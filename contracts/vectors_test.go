package contracts

import (
	"encoding/json"
	"io/fs"
	"os"
	"reflect"
	"slices"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"

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
	read := protojson.UnmarshalOptions{}
	write := protojson.MarshalOptions{UseProtoNames: true, EmitDefaultValues: true}
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
				var observation observationv1.Observation
				if err := read.Unmarshal(raw, &observation); err != nil {
					t.Errorf("%s, case %d, observation %d: %v", name, k+1, n+1, err)
					continue
				}
				written, err := write.Marshal(&observation)
				if err != nil {
					t.Fatal(err)
				}
				if !reflect.DeepEqual(jsonOf(t, raw), jsonOf(t, written)) {
					t.Errorf("%s, case %d, observation %d: Go writes it %s", name, k+1, n+1, written)
				}
			}
		}
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
