// Where Claude Code keeps the transcripts of a repository's sessions on this machine, and how
// tokens-report reads them (measurements 1.1).
//
// Claude Code writes each session to <config>/projects/<slug>/<session>.jsonl, and each subagent
// of a session to <config>/projects/<slug>/<session>/subagents/agent-<id>.jsonl. <config> is
// $CLAUDE_CONFIG_DIR, which the devcontainer sets, or else ~/.claude; <slug> is the folder the
// session started in, every character but a letter or a digit of ASCII replaced by "-":
// /workspaces/spec gives -workspaces-spec, /workspaces/.github gives -workspaces--github.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { byCodeUnits, git } from "../shared.mjs";

// The folder of every project's transcripts.
export function projectsRoot(env = process.env) {
  return path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
}

// The name of a project's folder for the folder a session starts in.
export function slugOf(folder) {
  return folder.replace(/[^A-Za-z0-9]/g, "-");
}

// The root of the git repository around cwd: the folder a session of it starts in.
export function repositoryRoot(cwd = process.cwd()) {
  return git(cwd, ["rev-parse", "--show-toplevel"]).trim();
}

// Every transcript in a project's folder, in a stable order: { file, session, subagent }.
export function transcriptsOf(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byCodeUnits(a.name, b.name))) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      found.push({ file: path.join(dir, entry.name), session: entry.name.slice(0, -".jsonl".length), subagent: false });
    } else if (entry.isDirectory()) {
      const subagents = path.join(dir, entry.name, "subagents");
      if (!fs.existsSync(subagents)) continue;
      for (const name of fs.readdirSync(subagents).sort(byCodeUnits)) {
        if (name.endsWith(".jsonl")) found.push({ file: path.join(subagents, name), session: entry.name, subagent: true });
      }
    }
  }
  return found;
}

// A transcript's records, in the order it holds them, and how many of its lines are not JSON: a
// session cut short may leave half a line.
export function readTranscript(file) {
  const records = [];
  let broken = 0;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      broken += 1;
    }
  }
  return { records, broken };
}
