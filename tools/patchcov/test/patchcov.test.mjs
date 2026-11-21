// Each test counts made-up reports of made-up repositories, as Codecov would: none is a real
// repository's report.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { git } from "../../shared.mjs";
import { main } from "../main.mjs";
import { changedLines, combineSegments, fileOf, globTest, goFixes, kindOf, measure, mergeCoverage, parseGoProfile, parseLcov, patchCoverage, readConfig, truncate } from "../patchcov.mjs";

const CONFIG = `coverage:
  status:
    patch:
      default:
        target: 90%   # R48
    project:
      default:
        informational: true
ignore:
  - "internal/fixtures/**"
comment:
  layout: "condensed_header, diff, files"
`;

function repository(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "patchcov-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  write(root, files);
  commit(root, "base");
  return root;
}

function write(root, files) {
  for (const [name, text] of Object.entries(files)) {
    if (text === null) {
      fs.rmSync(path.join(root, name));
      continue;
    }
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
}

function commit(root, message) {
  git(root, ["add", "-A"]);
  git(root, ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "--quiet", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]).trim();
}

const lines = (map) => Object.fromEntries([...map].map(([file, of]) => [file, Object.fromEntries(of)]));

test("a line's kind: a count above 0 a hit, 0 a miss; branches all taken a hit, none a miss, else a partial", () => {
  assert.deepEqual([3, 0, "2/2", "0/2", "1/2"].map(kindOf), ["hit", "miss", "hit", "miss", "partial"]);
});

test("two coverages of a line merge as Codecov's: the larger count, branches all hit beside a count, the larger parts", () => {
  assert.equal(mergeCoverage(undefined, 2), 2);
  assert.equal(mergeCoverage(1, undefined), 1);
  assert.equal(mergeCoverage(1, 4), 4);
  assert.equal(mergeCoverage(3, "1/2"), "2/2");
  assert.equal(mergeCoverage("1/2", 0), "1/2");
  assert.equal(mergeCoverage("1/2", "1/2"), "1/2");
  assert.equal(mergeCoverage("2/2", "1/2"), "2/2");
  assert.equal(mergeCoverage("1/3", "3/3"), "3/3");
  assert.equal(mergeCoverage("1/3", "2/2"), "2/2");
  assert.equal(mergeCoverage("1/3", "2/4"), "2/4");
});

test("lcov: DA counts, BRDA in their place, none for .js and line 1 of .ts, records of one file merged", () => {
  const report = [
    "TN:",
    "SF:src/a.ts",
    "FN:1,f",
    "DA:1,1",
    "BRDA:1,0,0,0",
    "DA:2,5",
    "DA:3,0",
    "DA:4,7",
    "BRDA:4,0,0,7",
    "BRDA:4,0,1,0",
    "DA:5,2",
    "BRDA:5,0,0,-",
    "BRDA:5,0,1,0",
    "BRDA:6,1,0,3",
    "DA:undefined,1",
    "DA:0,3",
    "DA:7,=",
    "DA:8,-4",
    "DA:9,1e2",
    "DA:x,1",
    "DA:10",
    "BRDA:0,0,0,1",
    "BRDA:7,0",
    "LF:9",
    "end_of_record",
    "SF:src/b.js",
    "DA:1,0",
    "BRDA:1,0,0,1",
    "end_of_record",
    "SF:src/a.ts",
    "DA:3,2",
    "end_of_record",
    "DA:1,1",
    "end_of_record",
  ].join("\n");
  assert.deepEqual(lines(parseLcov(report)), {
    "src/a.ts": { 1: 1, 2: 5, 3: 2, 4: "1/2", 5: "0/2", 6: "1/1", 8: 0, 9: 100 },
    "src/b.js": { 1: 0 },
  });
});

test("Go: segments by Codecov's rule — one line, several lines, the closing brace, two blocks of a line, repeats", () => {
  const profile = [
    "mode: atomic",
    "example.com/m/a.go:3.10,3.20 1 4",
    "example.com/m/a.go:5.14,8.2 2 0",
    "example.com/m/a.go:10.2,10.8 1 1",
    "example.com/m/a.go:10.9,10.20 1 0",
    "example.com/m/a.go:12.2,12.8 1 0",
    "example.com/m/a.go:12.2,12.8 1 0",
    "example.com/m/a.go:12.2,12.8 1 3",
    "example.com/m/a.go:14.5,16.9 1 1",
    "example.com/m/a.go:20.1,20.1 1 0",
    "example.com/m/a.go:20.3,20.2 1 2",
    "example.com/m/a.go:22: f 100.0%",
    "",
  ].join("\n");
  assert.deepEqual(lines(parseGoProfile(profile)), {
    "example.com/m/a.go": { 3: 4, 5: 0, 6: 0, 7: 0, 10: "1/2", 12: 3, 14: 1, 15: 1, 16: 1, 20: 2 },
  });
  assert.throws(() => parseGoProfile("example.com/m/a.go:3.10 4\n"), /not a line of a Go profile/);
});

test("combine_partials: open runs, the first column dropped, an end of line that matches or not", () => {
  assert.deepEqual(combineSegments([[1, 3, 1]]), [[1, 3, 1]]);
  assert.deepEqual(combineSegments([[2, null, 0], [1, 3, 1]]), [[1, 3, 1], [3, null, 0]]);
  assert.deepEqual(combineSegments([[0, 1, 1], [1, null, 0]]), [[0, null, 1]]);
  assert.deepEqual(combineSegments([[0, 1, 2], [0, 1, 0]]), [[0, null, 2]]);
  assert.deepEqual(combineSegments([[0, null, 1], [5, null, 1]]), [[0, null, 1]]);
  assert.deepEqual(combineSegments([[4, null, 1], [6, null, 0]]), [[4, null, 1]]);
  assert.deepEqual(combineSegments([[1, 2, 0], [3, null, 1]]), [[1, 2, 0], [2, null, 1]]);
  assert.equal(combineSegments([[3, 2, 1], [4, 1, 0]]), null);
});

test("Codecov's fixes of a Go file: blanks, comments, lone braces, func {, block comments", () => {
  const source = ["package a", "", "// a comment", "func f() {", "\t}", "/*", "inside", "*/", "x := 1 // a note", "func {", "\t{ // open", ""].join("\n");
  assert.deepEqual([...goFixes(source)].sort((a, b) => a - b), [2, 3, 5, 6, 7, 8, 10, 11]);
});

test("the changed lines of a diff: added and changed, a removed file none, a hunk of none skipped", () => {
  const diff = [
    "diff --git a/a.go b/a.go",
    "--- a/a.go",
    "+++ b/a.go",
    "@@ -1 +1 @@",
    "@@ -3,0 +4,2 @@",
    "@@ -9,2 +10,0 @@",
    "diff --git a/old.go b/old.go",
    "--- a/old.go",
    "+++ /dev/null",
    "@@ -1,3 +0,0 @@",
  ].join("\n");
  assert.deepEqual(Object.fromEntries([...changedLines(diff)].map(([f, s]) => [f, [...s]])), { "a.go": [1, 4, 5] });
});

test("ignore globs: ** any folders, * a name, ? a character", () => {
  const fixtures = globTest("internal/fixtures/**");
  assert.ok(fixtures("internal/fixtures/a/b.go"));
  assert.ok(!fixtures("internal/fixture.go"));
  assert.ok(globTest("**/gen.go")("a/b/gen.go"));
  assert.ok(globTest("**/gen.go")("gen.go"));
  assert.ok(globTest("./cmd/*.go")("cmd/main.go"));
  assert.ok(!globTest("cmd/*.go")("cmd/x/main.go"));
  assert.ok(globTest("cmd/?.go")("cmd/a.go"));
  assert.ok(globTest("docs")("docs/a.md"));
});

test("codecov.yml: the patch's target and ignore, in a block or in brackets; no target is an error", () => {
  assert.deepEqual(readConfig(CONFIG), { target: 90, ignore: ["internal/fixtures/**"] });
  assert.deepEqual(readConfig('ignore: ["a/**", \'b\']\ncoverage:\n  status:\n    patch:\n      default:\n        target: "85.5"\n'), { target: 85.5, ignore: ["a/**", "b"] });
  assert.throws(() => readConfig("coverage:\n  status:\n    project:\n      default:\n        target: 90%\n"), /no coverage\.status\.patch\.default\.target/);
  assert.throws(() => readConfig("coverage:\n  status:\n    patch:\n      default:\n        target: auto\n"), /not a percentage/);
});

test("a report's path as the repository's file: a module's import path, an absolute path inside, a relative one", () => {
  const modules = [{ module: "example.com/m/tools/x", dir: "tools/x" }, { module: "example.com/m", dir: "" }];
  assert.equal(fileOf("example.com/m/tools/x/main.go", "/r", modules), "tools/x/main.go");
  assert.equal(fileOf("example.com/m/a.go", "/r", modules), "a.go");
  assert.equal(fileOf("/r/src/a.ts", "/r", modules), "src/a.ts");
  assert.equal(fileOf("/elsewhere/a.ts", "/r", modules), null);
  assert.equal(fileOf("./src/a.ts", "/r", modules), "src/a.ts");
});

test("two decimals cut down, as Codecov's round: down", () => {
  assert.equal(truncate(1236 / 1460), 84.65);
  assert.equal(truncate(1381 / 1460), 94.58);
  assert.equal(truncate(1), 100);
  assert.equal(truncate(0.9), 90);
});

test("the patch's coverage: only lines a report holds, ignored paths left out, no lines a pass", () => {
  const changed = new Map([["a.ts", new Set([1, 2, 3, 4, 9])], ["skip/b.ts", new Set([1])], ["c.md", new Set([1])], ["d.ts", new Set([5])]]);
  const reports = new Map([["a.ts", new Map([[1, 1], [2, 0], [3, "1/2"], [4, 2]])], ["skip/b.ts", new Map([[1, 0]])], ["d.ts", new Map([[1, 1]])]]);
  const result = patchCoverage({ changed, reports, target: 90, ignore: ["skip/**"] });
  assert.deepEqual(result, { target: 90, coverage: 50, hits: 2, misses: 1, partials: 1, pass: false, files: [{ file: "a.ts", hits: 2, misses: [2], partials: [3] }] });
  assert.deepEqual(patchCoverage({ changed: new Map(), reports, target: 90 }), { target: 90, coverage: null, hits: 0, misses: 0, partials: 0, pass: true, files: [] });
});

test("measure and main: the merge-base of origin/main, both reports, renames, the fixes of Go, the exit codes", (t) => {
  const root = repository(t, {
    ".github/codecov.yml": CONFIG,
    "go.mod": "module example.com/m\n\ngo 1.27\n",
    "a.go": "package a\n\nfunc A() int {\n\treturn 1\n}\n",
    "src/old.ts": "export const a = 1;\nexport const b = 2;\n",
  });
  const base = git(root, ["rev-parse", "HEAD"]).trim();
  git(root, ["update-ref", "refs/remotes/origin/main", base]);
  git(root, ["switch", "--quiet", "--create", "e1"]);
  write(root, {
    "a.go": "package a\n\nfunc A() int {\n\t// why\n\tif true {\n\t\treturn 1\n\t}\n\treturn 2\n}\n",
    "src/old.ts": null,
    "src/new.ts": "export const a = 1;\nexport const b = 3;\n",
    "internal/fixtures/f.ts": "export const f = 1;\n",
  });
  commit(root, "change");
  write(root, {
    "coverage/go.out": "mode: set\nexample.com/m/a.go:3.14,5.11 1 1\nexample.com/m/a.go:5.11,7.3 1 1\nexample.com/m/a.go:8.2,8.10 1 0\n",
    "coverage/lcov.info": `SF:${path.join(root, "src/new.ts")}\nDA:1,1\nDA:2,0\nend_of_record\nSF:internal/fixtures/f.ts\nDA:1,0\nend_of_record\n`,
  });
  const result = measure({ root });
  assert.equal(result.base, base);
  assert.deepEqual(result.reports, ["coverage/go.out", "coverage/lcov.info"]);
  // a.go: the comment of line 4 is a fix; 5 and 6 hit, 7 is a brace, 8 missed. src/new.ts: only
  // line 2 changed by the rename, missed. The fixtures are ignored.
  assert.deepEqual(result.files, [{ file: "a.go", hits: 2, misses: [8], partials: [] }, { file: "src/new.ts", hits: 0, misses: [2], partials: [] }]);
  assert.equal(result.coverage, 50);

  const out = [];
  const err = [];
  const io = { cwd: root, out: (l) => out.push(l), err: (l) => err.push(l) };
  assert.equal(main([], io), 1);
  assert.equal(JSON.parse(out[0]).coverage, 50);
  assert.match(err[0], /50% of the patch hit, below the target of 90%/);
  out.length = 0;
  assert.equal(measure({ root, base: "HEAD", reports: ["coverage/go.out"] }).coverage, null);
  assert.equal(main(["--base", "HEAD"], io), 2);
  assert.equal(main(["--wrong"], io), 2);
  assert.equal(main(["--config", "missing.yml"], io), 2);
  err.length = 0;
  assert.equal(main(["--config", "../codecov.yml"], io), 2);
  assert.match(err[0], /--config: \.\.\/codecov\.yml is not a file of the repository/);
  fs.rmSync(path.join(root, "coverage"), { recursive: true });
  err.length = 0;
  assert.equal(main([], io), 2);
  assert.match(err[0], /no report/);
});
