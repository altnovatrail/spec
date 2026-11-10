package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// A made-up spec: go.mod, LICENSE, a small format/, a small admission/, a small deployment/, a
// small legal/, a small consent-age/, a small export/ and a type of the format, committed on main.
func scratch(t *testing.T, goMod string) string {
	t.Helper()
	t.Setenv("GIT_CONFIG_GLOBAL", os.DevNull)
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	root := t.TempDir()
	run(t, root, "git", "-c", "init.defaultBranch=main", "init", "--quiet")
	write(t, root, "go.mod", goMod)
	write(t, root, "LICENSE", "Apache License\n")
	write(t, root, "format/VERSION", "0.1\n")
	write(t, root, "format/vectors/packages/a/module/.editor-notes", "left out of a package, not of the module\n")
	write(t, root, "admission/VERSION", "0.1\n")
	write(t, root, "deployment/VERSION", "1\n")
	write(t, root, "legal/VERSION", "1\n")
	write(t, root, "consent-age/VERSION", "1\n")
	write(t, root, "export/VERSION", "1\n")
	write(t, root, "types/formatv0/doc.go", "package formatv0\n")
	commit(t, root)
	return root
}

func write(t *testing.T, root, name, text string) {
	t.Helper()
	path := filepath.Join(root, name)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
		t.Fatal(err)
	}
}

func commit(t *testing.T, root string) {
	t.Helper()
	run(t, root, "git", "add", "--all")
	run(t, root, "git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "change")
}

func run(t *testing.T, dir string, name string, args ...string) {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("%s %s: %v\n%s", name, strings.Join(args, " "), err, out)
	}
}

const v0 = "module github.com/altnovatrail/spec\n\ngo 1.27.0\n"

func TestTheModuleCarriesEveryFile(t *testing.T) {
	root := scratch(t, v0)
	report, err := check(root, "HEAD", "0.3", ".")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(report, "github.com/altnovatrail/spec@v0.3.0") || !strings.Contains(report, "the 8 files of format/, admission/, deployment/, legal/, consent-age/, export/ and types/") {
		t.Fatalf("report: %s", report)
	}
}

// Go leaves a folder with a go.mod of its own out of a module's zip, and a vendor folder too:
// the files would be in spec and missing from the module its consumers get.
func TestFilesTheZipLeavesOutAreFound(t *testing.T) {
	for _, name := range []string{"format/vectors/rules/a/go.mod", "format/vectors/vendor/a/b.yaml", "types/formatv0/open/go.mod"} {
		root := scratch(t, v0)
		write(t, root, name, "module example.invalid/a\n")
		commit(t, root)
		if _, err := check(root, "HEAD", "0.3", "."); err == nil || !strings.Contains(err.Error(), "leaves out") {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestALinkIsFound(t *testing.T) {
	root := scratch(t, v0)
	if err := os.Symlink("VERSION", filepath.Join(root, "format", "link")); err != nil {
		t.Fatal(err)
	}
	commit(t, root)
	if _, err := check(root, "HEAD", "0.3", "."); err == nil || !strings.Contains(err.Error(), "mode 120000") {
		t.Fatalf("a link: %v", err)
	}
}

// From v2 on the module's path ends in /vN, and Go refuses the other way round too.
func TestThePathFollowsTheMajorVersion(t *testing.T) {
	if _, err := check(scratch(t, v0), "HEAD", "2.0", "."); err == nil || !strings.Contains(err.Error(), `"github.com/altnovatrail/spec/v2"`) {
		t.Errorf("v2 without /v2: %v", err)
	}
	v2 := strings.Replace(v0, "spec\n", "spec/v2\n", 1)
	if _, err := check(scratch(t, v2), "HEAD", "2.0", "."); err != nil {
		t.Errorf("v2 with /v2: %v", err)
	}
	if _, err := check(scratch(t, v2), "HEAD", "1.4", "."); err == nil {
		t.Error("v1 with /v2 passed")
	}
	if _, err := check(scratch(t, strings.Replace(v0, "altnovatrail", "elsewhere", 1)), "HEAD", "0.3", "."); err == nil {
		t.Error("another path passed")
	}
}

func TestBadArgumentsAreRefused(t *testing.T) {
	root := scratch(t, v0)
	for _, args := range [][4]string{{"relative", "HEAD", "0.3", "."}, {root, "HEAD", "0.3.0", "."}, {root, "no-such-revision", "0.3", "."}, {root, "HEAD", "0.3", "tools/gomod"}} {
		if _, err := check(args[0], args[1], args[2], args[3]); err == nil {
			t.Errorf("%v passed", args)
		}
	}
}

// git runs by an absolute path, never by a search of PATH: the first that exists, or else the
// first named, which then fails by its own name.
func TestGitRunsByAbsolutePath(t *testing.T) {
	if !filepath.IsAbs(gitProgram) {
		t.Fatalf("git runs as %q", gitProgram)
	}
	dir := t.TempDir()
	missing, present := filepath.Join(dir, "missing"), filepath.Join(dir, "present")
	write(t, dir, "present", "")
	if got := first(missing, present); got != present {
		t.Errorf("an existing path: %q", got)
	}
	if got := first(missing, filepath.Join(dir, "also-missing")); got != missing {
		t.Errorf("none exists: %q", got)
	}

	// Every git the tool runs is gitProgram: with it pointing nowhere, git fails by that name.
	saved := gitProgram
	t.Cleanup(func() { gitProgram = saved })
	gitProgram = missing
	if _, err := git(dir, nil, "--version"); err == nil || !strings.Contains(err.Error(), missing) {
		t.Errorf("git ran without gitProgram: %v", err)
	}
}

// A folder the module carries that the commit lacks would leave its consumers without it.
func TestAMissingFolderIsFound(t *testing.T) {
	root := scratch(t, v0)
	run(t, root, "git", "rm", "--quiet", "-r", "types")
	commit(t, root)
	if _, err := check(root, "HEAD", "0.3", "."); err == nil || !strings.Contains(err.Error(), "no file in types/") {
		t.Fatalf("no types/: %v", err)
	}
}

func TestNoLicenseIsFound(t *testing.T) {
	root := scratch(t, v0)
	run(t, root, "git", "rm", "--quiet", "LICENSE")
	commit(t, root)
	if _, err := check(root, "HEAD", "0.3", "."); err == nil || !strings.Contains(err.Error(), "no LICENSE") {
		t.Fatalf("no LICENSE: %v", err)
	}
}

// The module of the contracts, in a folder of its own, with what its go.mod requires (R83).
const contractsMod = "module github.com/altnovatrail/spec/contracts\n\ngo 1.27.0\n\nrequire (\n\tconnectrpc.com/connect/v2 v2.0.2\n\tgoogle.golang.org/protobuf v1.36.12\n)\n"

// A made-up spec with the module of the contracts beside its own: a README, a .proto, a file of
// generated code, and a test vector with the package that embeds it.
func scratchContracts(t *testing.T, goMod string) string {
	t.Helper()
	root := scratch(t, v0)
	write(t, root, "contracts/go.mod", goMod)
	write(t, root, "contracts/README.md", "# The contracts\n")
	write(t, root, "contracts/novatrail/trial/v1/trial.proto", "syntax = \"proto3\";\n")
	write(t, root, "contracts/novatrail/trial/v1/trial.pb.go", "package trialv1\n")
	write(t, root, "contracts/vectors.go", "package contracts\n")
	write(t, root, "contracts/vectors/trial/v1/one.json", "{}\n")
	write(t, root, "contracts/examples/trial/v1/one.json", "{}\n")
	commit(t, root)
	return root
}

// The zip of a module in a folder holds its files by their names in it, and the root's LICENSE.
func TestTheContractsModuleCarriesEveryFile(t *testing.T) {
	root := scratchContracts(t, contractsMod)
	report, err := check(root, "HEAD", "0.7", "contracts")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(report, "github.com/altnovatrail/spec/contracts@v0.7.0") || !strings.Contains(report, "LICENSE and the 7 files of contracts/") {
		t.Fatalf("report: %s", report)
	}
	// spec's own module no longer carries contracts/, and its check is the same as before.
	if report, err := check(root, "HEAD", "0.7", "."); err != nil || !strings.Contains(report, "the 8 files of format/, admission/, deployment/, legal/, consent-age/, export/ and types/") {
		t.Fatalf("the root beside the contracts: %s, %v", report, err)
	}
}

// Each module requires what it may and nothing else, whatever the versions.
func TestTheRequirementsAreHeld(t *testing.T) {
	extra := strings.Replace(contractsMod, ")\n", "\tgolang.org/x/text v0.30.0\n)\n", 1)
	missing := strings.Replace(contractsMod, "\tconnectrpc.com/connect/v2 v2.0.2\n", "", 1)
	for name, goMod := range map[string]string{"extra": extra, "missing": missing} {
		if _, err := check(scratchContracts(t, goMod), "HEAD", "0.7", "contracts"); err == nil || !strings.Contains(err.Error(), "may require connectrpc.com/connect/v2 and google.golang.org/protobuf") {
			t.Errorf("%s: %v", name, err)
		}
	}
	withRequirement := v0 + "\nrequire golang.org/x/text v0.30.0\n"
	if _, err := check(scratch(t, withRequirement), "HEAD", "0.3", "."); err == nil || !strings.Contains(err.Error(), "may require nothing") {
		t.Errorf("the root with a requirement: %v", err)
	}
}

// The module of the contracts is named by its own path, with /vN from v2 on as spec's own.
func TestTheContractsPathIsHeld(t *testing.T) {
	root := scratchContracts(t, strings.Replace(contractsMod, "spec/contracts", "spec/proto", 1))
	if _, err := check(root, "HEAD", "0.7", "contracts"); err == nil || !strings.Contains(err.Error(), `"github.com/altnovatrail/spec/contracts"`) {
		t.Errorf("another path: %v", err)
	}
	if _, err := check(scratchContracts(t, contractsMod), "HEAD", "2.0", "contracts"); err == nil || !strings.Contains(err.Error(), `"github.com/altnovatrail/spec/contracts/v2"`) {
		t.Errorf("v2 without /v2: %v", err)
	}
}

// A folder of the contracts with a go.mod of its own would leave the module.
func TestAFolderTheContractsZipLeavesOutIsFound(t *testing.T) {
	root := scratchContracts(t, contractsMod)
	write(t, root, "contracts/novatrail/trial/go.mod", "module example.invalid/a\n")
	commit(t, root)
	if _, err := check(root, "HEAD", "0.7", "contracts"); err == nil || !strings.Contains(err.Error(), "leaves out contracts/novatrail/trial/") || !strings.Contains(err.Error(), "every file of contracts/") {
		t.Fatalf("a nested module: %v", err)
	}
}

// What a module may require is a set: the order it is written in is no part of the rule.
func TestTheRequirementsAreASet(t *testing.T) {
	saved := modules["contracts"]
	t.Cleanup(func() { modules["contracts"] = saved })
	reversed := saved
	reversed.requires = []string{"google.golang.org/protobuf", "connectrpc.com/connect/v2"}
	modules["contracts"] = reversed
	if _, err := check(scratchContracts(t, contractsMod), "HEAD", "0.7", "contracts"); err != nil {
		t.Fatalf("requirements written out of order: %v", err)
	}
}
