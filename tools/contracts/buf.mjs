// What contracts-check and the generation of the contracts' code run: buf, at the version the
// toolchain stage installs (R83), and git, in the repository at root. buf reads the workspace of
// root's buf.yaml and nothing outside the repository: buf.yaml has no deps and buf.gen.yaml only
// local plugins, which rules.mjs holds before buf runs.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { BUF, TAR, byCodeUnits, git } from "../shared.mjs";
import { previousReleaseTag } from "../release/previous.mjs";

// How long buf may take: generating with the Go plugins builds them the first time, which a
// fresh machine fetches through the Go module proxy.
const TIMEOUT = 600_000;

// A program run in root, with what it wrote; it throws when the program cannot start.
function run(program, args, root) {
  const result = spawnSync(program, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: TIMEOUT });
  if (result.error) throw new Error(`${path.basename(program)} ${args[0]}: ${result.error.message}`);
  return result;
}

// The files of contracts/ as the check sees them: what git tracks or would, ignored files left out,
// as format-check and the Go checks see theirs.
export function contractFiles(root) {
  return git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "contracts"])
    .split("\0")
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(root, file)))
    .sort(byCodeUnits);
}

// The errors buf reports with --error-format json, one JSON object a line, as { file, line,
// message }, the message naming the rule and the command. What is no such line — buf's own
// failure — is one error of the file named, with buf's words.
function bufErrors(result, command, file) {
  const errors = [];
  const rest = [];
  for (const line of `${result.stdout}\n${result.stderr}`.split("\n")) {
    if (!line.trim()) continue;
    try {
      const report = JSON.parse(line);
      errors.push({ file: report.path, line: report.start_line ?? 0, message: `${report.message} (buf ${command}, ${report.type})` });
    } catch {
      rest.push(line.trim());
    }
  }
  if (result.status !== 0 && errors.length === 0) errors.push({ file, line: 0, message: `buf ${command} failed: ${rest.join(" ") || `exit status ${result.status}`}` });
  return errors;
}

// buf on the workspace at root: build, its image into a temporary folder, read back as JSON.
export function build(root, buf = BUF) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-image-"));
  try {
    const image = path.join(folder, "image.json");
    const result = run(buf, ["build", "--exclude-imports", "--error-format", "json", "-o", image], root);
    const errors = bufErrors(result, "build", "buf.yaml");
    return errors.length ? { errors } : { errors, image: JSON.parse(fs.readFileSync(image, "utf8")) };
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

export function lint(root, buf = BUF) {
  return bufErrors(run(buf, ["lint", "--error-format", "json"], root), "lint", "buf.yaml");
}

// Each .proto file buf format would write otherwise: buf writes the formatted module into a
// temporary folder, and each file is compared with it.
export function format(root, protos, buf = BUF) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-format-"));
  try {
    const result = run(buf, ["format", "-o", folder], root);
    if (result.status !== 0) return [{ file: "buf.yaml", line: 0, message: `buf format failed: ${result.stderr.trim()}` }];
    return protos
      .filter((file) => {
        const formatted = path.join(folder, path.relative("contracts", file));
        return !fs.existsSync(formatted) || !fs.readFileSync(formatted).equals(fs.readFileSync(path.join(root, file)));
      })
      .map((file) => ({ file, line: 0, message: "the file is not as buf format writes it; run buf format -w" }));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

// The release spec's buf breaking compares with (R83): the newest release tag in the history of
// HEAD, other than a tag of HEAD itself — unless the working tree changes buf.yaml or contracts/:
// what it would commit comes after HEAD, so a release of HEAD is the previous one then (the
// amendment of 2026-11-04 to R83), as tools/release/previous.mjs finds it. Its buf.yaml and
// contracts/, as git archive gives them, go into folder, when one is named and the release has a
// .proto file. Returns the tag and how many .proto files it has, or null when HEAD descends from
// no release. A shallow clone has no tags to count from and is refused, as release-version
// refuses it.
export function previousRelease(root, folder = null) {
  const tag = previousReleaseTag(root, ["buf.yaml", "contracts"]);
  if (!tag) return null;
  const protos = git(root, ["ls-tree", "-r", "-z", "--name-only", tag, "--", "contracts"])
    .split("\0")
    .filter((file) => file.endsWith(".proto"));
  if (protos.length === 0 || folder === null) return { tag, protos: protos.length };
  fs.mkdirSync(folder, { recursive: true });
  const archive = path.join(folder, "previous.tar");
  git(root, ["archive", "--format=tar", `--output=${archive}`, tag, "buf.yaml", "contracts"]);
  const unpacked = run(TAR, ["-xf", archive, "-C", folder], root);
  if (unpacked.status !== 0) throw new Error(`tar: ${unpacked.stderr.trim()}`);
  fs.rmSync(archive);
  return { tag, protos: protos.length };
}

// buf breaking against the release unpacked in folder.
export function breaking(root, folder, tag, buf = BUF) {
  const result = run(buf, ["breaking", "--against", folder, "--error-format", "json"], root);
  return bufErrors(result, `breaking against ${tag}`, "buf.yaml");
}

// The code buf generates from the workspace at root, into folder: its files by their paths from
// the root, contracts/…, with their bytes. Throws with buf's words when it fails.
export function generate(root, folder, buf = BUF) {
  const result = run(buf, ["generate", "-o", folder], root);
  if (result.status !== 0) throw new Error(`buf generate failed: ${`${result.stderr}${result.stdout}`.trim()}`);
  const files = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.set(path.relative(folder, full).split(path.sep).join("/"), fs.readFileSync(full));
    }
  };
  if (fs.existsSync(folder)) walk(folder);
  return files;
}
