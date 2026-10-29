// Command gomod checks the zip of spec's Go module as the Go module proxy will build it from a
// tag of spec (R64), before the tag exists:
//
//	go -C tools/gomod run . <repository root> <revision> <line>
//
// golang.org/x/mod/zip builds the zip from git at the revision, as the go command and the proxy
// build a module's zip, under the version the line's first release takes, vMAJOR.MINOR.0. It
// refuses what a module's zip may not hold: a file name Go does not take, two names that differ
// by case alone, a module too large, a module path whose major version suffix the version does
// not match. What a module's zip leaves out it leaves out without a word — a folder with a go.mod
// of its own, a vendor folder, a link — so the command reads the zip back: LICENSE and every file
// of format/ and of types/ at the revision are in it, byte for byte, or the check fails. It checks too that
// go.mod names the module by the path its consumers import.
//
// The tool is no part of the module spec ships: it is a module of its own, and a module's zip
// leaves out the folders of other modules.
package main

import (
	"archive/zip"
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"golang.org/x/mod/modfile"
	"golang.org/x/mod/module"
	modzip "golang.org/x/mod/zip"
)

// The path consumers import the module by, before its suffix from v2 on.
const modulePath = "github.com/altnovatrail/spec"

// What the module carries to its consumers, which its zip must hold whole: the format, its types
// (R72), and the license that goes with them.
var carried = []string{"LICENSE", "format", "types"}

var lineForm = regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`)

// The git the tool runs, by absolute path, as tools/shared.mjs has it: no directory on PATH
// decides which program runs. The base image's git first, or else the system's own. The zip
// itself golang.org/x/mod/zip builds with the git on PATH, as the go command does.
var gitProgram = first("/usr/local/bin/git", "/usr/bin/git", "/bin/git")

// first is the first of the paths that exists, or the first of them, which then fails by its
// own name.
func first(paths ...string) string {
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return paths[0]
}

func main() {
	if len(os.Args) != 4 {
		fmt.Fprintln(os.Stderr, "usage: go -C tools/gomod run . <repository root> <revision> <line>")
		os.Exit(2)
	}
	report, err := check(os.Args[1], os.Args[2], os.Args[3])
	if err != nil {
		fmt.Fprintln(os.Stderr, "gomod: "+err.Error())
		os.Exit(1)
	}
	fmt.Println("gomod: " + report)
}

// check builds the zip of the module at revision in the repository at root, as the release of
// line will have it, and says what it holds, or why it is not the module spec ships.
func check(root, revision, line string) (string, error) {
	if !filepath.IsAbs(root) {
		return "", fmt.Errorf("the repository's root is %q, not an absolute path", root)
	}
	if !lineForm.MatchString(line) {
		return "", fmt.Errorf("the line %q is not MAJOR.MINOR", line)
	}
	commit, err := git(root, nil, "rev-parse", "--verify", "--end-of-options", revision+"^{commit}")
	if err != nil {
		return "", err
	}
	sha := strings.TrimSpace(string(commit))
	goMod, err := git(root, nil, "show", sha+":go.mod")
	if err != nil {
		return "", err
	}
	major, _ := strconv.Atoi(strings.Split(line, ".")[0])
	want := modulePath
	if major >= 2 {
		want += "/v" + strconv.Itoa(major)
	}
	if path := modfile.ModulePath(goMod); path != want {
		return "", fmt.Errorf("go.mod at %s names the module %q, and the line %s is released as %q", short(sha), path, line, want)
	}

	version := module.Version{Path: want, Version: "v" + line + ".0"}
	var zipped bytes.Buffer
	if err := modzip.CreateFromVCS(&zipped, version, root, sha, ""); err != nil {
		return "", err
	}
	held, err := filesOf(zipped.Bytes(), version.String()+"/")
	if err != nil {
		return "", err
	}
	count, size, err := compare(root, sha, held)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("the zip of %s at %s holds LICENSE and the %d files of format/ and types/, %d bytes in all", version, short(sha), count-1, size), nil
}

// filesOf reads a module's zip into its files' contents by their names in the module.
func filesOf(data []byte, prefix string) (map[string][]byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, err
	}
	held := make(map[string][]byte, len(reader.File))
	for _, file := range reader.File {
		name, ok := strings.CutPrefix(file.Name, prefix)
		if !ok {
			return nil, fmt.Errorf("the zip holds %s, outside %s", file.Name, prefix)
		}
		opened, err := file.Open()
		if err != nil {
			return nil, err
		}
		content, err := io.ReadAll(opened)
		opened.Close()
		if err != nil {
			return nil, err
		}
		held[name] = content
	}
	return held, nil
}

// compare holds every file the module carries at the commit against the zip: in it, and the
// same bytes as git has. It returns how many there are and their size.
func compare(root, sha string, held map[string][]byte) (int, int, error) {
	listing, err := git(root, nil, append([]string{"ls-tree", "-r", "-z", "--full-tree", sha, "--"}, carried...)...)
	if err != nil {
		return 0, 0, err
	}
	type entry struct{ name, object string }
	var entries []entry
	var objects bytes.Buffer
	for _, record := range strings.Split(strings.TrimSuffix(string(listing), "\x00"), "\x00") {
		meta, name, ok := strings.Cut(record, "\t")
		fields := strings.Fields(meta)
		if !ok || len(fields) != 3 {
			return 0, 0, fmt.Errorf("git ls-tree wrote %q", record)
		}
		if fields[1] != "blob" || fields[0] == "120000" {
			return 0, 0, fmt.Errorf("%s at %s is a %s of mode %s, which a module's zip leaves out: the module carries files alone", name, short(sha), fields[1], fields[0])
		}
		entries = append(entries, entry{name, fields[2]})
		objects.WriteString(fields[2] + "\n")
	}
	if len(entries) == 0 || entries[0].name != "LICENSE" {
		return 0, 0, fmt.Errorf("%s has no LICENSE at its root", short(sha))
	}
	// git ls-tree names nothing for a path the commit lacks: each folder the module carries holds a
	// file, or the module its consumers get would lack it.
	for _, path := range carried[1:] {
		found := false
		for _, e := range entries {
			if strings.HasPrefix(e.name, path+"/") {
				found = true
				break
			}
		}
		if !found {
			return 0, 0, fmt.Errorf("%s has no file in %s/, which the module carries", short(sha), path)
		}
	}

	contents, err := git(root, &objects, "cat-file", "--batch")
	if err != nil {
		return 0, 0, err
	}
	batch := bufio.NewReader(bytes.NewReader(contents))
	size := 0
	for _, e := range entries {
		content, err := nextBlob(batch, e.object)
		if err != nil {
			return 0, 0, err
		}
		got, ok := held[e.name]
		if !ok {
			return 0, 0, fmt.Errorf("the module's zip leaves out %s: Go drops a folder with a go.mod of its own and a vendor folder, and the module carries every file of format/ and of types/", e.name)
		}
		if !bytes.Equal(got, content) {
			return 0, 0, fmt.Errorf("the module's zip holds %s with other bytes than git has at %s", e.name, short(sha))
		}
		size += len(content)
	}
	return len(entries), size, nil
}

// nextBlob reads one answer of git cat-file --batch: "<object> blob <size>", the bytes, and a
// newline.
func nextBlob(batch *bufio.Reader, object string) ([]byte, error) {
	header, err := batch.ReadString('\n')
	if err != nil {
		return nil, fmt.Errorf("git cat-file stopped before %s: %w", object, err)
	}
	fields := strings.Fields(header)
	if len(fields) != 3 || fields[0] != object || fields[1] != "blob" {
		return nil, fmt.Errorf("git cat-file answered %q for %s", strings.TrimSpace(header), object)
	}
	length, err := strconv.Atoi(fields[2])
	if err != nil {
		return nil, err
	}
	content := make([]byte, length+1)
	if _, err := io.ReadFull(batch, content); err != nil {
		return nil, err
	}
	return content[:length], nil
}

// git runs git in the repository, with stdin when given, and returns what it wrote.
func git(root string, stdin io.Reader, args ...string) ([]byte, error) {
	cmd := exec.Command(gitProgram, append([]string{"-C", root}, args...)...)
	cmd.Stdin = stdin
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			return nil, fmt.Errorf("git %s: %s", strings.Join(args, " "), strings.TrimSpace(stderr.String()))
		}
		return nil, err
	}
	return out, nil
}

func short(sha string) string {
	if len(sha) > 12 {
		return sha[:12]
	}
	return sha
}
