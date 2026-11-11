// session: the hook UserPromptSubmit of Claude Code that keeps one task to one session (R143).
//
//   node tools/session/main.mjs < <the hook's input>
//
// .claude/settings.json runs it before each prompt reaches the model — in spec as
// ${CLAUDE_PROJECT_DIR}/tools/session/main.mjs, in another NovaTrail repository from its spec/
// submodule. It reads the prompt and the path of the session's transcript from the JSON on stdin,
// and when the prompt starts a task other than the one the session has led, prints the JSON that
// stops it, with the reason the author sees. It never prints what the transcript says, and fails
// open: an input or a transcript it cannot read lets the prompt through. Always exits 0. It takes
// only Node's own modules: spec/tools/ of another repository has no node_modules.

import fs from "node:fs";
import { isMain } from "../shared.mjs";
import { taskOf, verdict } from "./session.mjs";

// The records of a transcript that may be the author's prompts, read from its JSON Lines. A line
// of any other type, or one that holds a result of a tool, is not parsed: a long session's
// transcript runs to tens of megabytes, and the hook holds up the prompt. A line that is not JSON —
// a session cut short leaves half a one — is skipped.
export function promptRecords(text) {
  const records = [];
  for (const line of text.split("\n")) {
    if (!line.includes('"type":"user"') || line.includes('"type":"tool_result"')) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // not a whole record
    }
  }
  return records;
}

// What the hook prints for its input, the JSON Claude Code gives it: the decision that stops the
// prompt, or "" to let it through. A prompt that starts no task — most of them — goes through
// without the transcript being read.
export function hook(input, readFile = (file) => fs.readFileSync(file, "utf8")) {
  let reason;
  try {
    const { prompt, transcript_path: transcript } = JSON.parse(input);
    if (typeof prompt !== "string" || !taskOf(prompt)) return "";
    const records = typeof transcript === "string" && transcript ? promptRecords(readFile(transcript)) : [];
    reason = verdict(prompt, records);
  } catch {
    return "";
  }
  if (!reason) return "";
  return JSON.stringify({ decision: "block", reason, hookSpecificOutput: { hookEventName: "UserPromptSubmit" } });
}

if (isMain(import.meta.url)) {
  let input = "";
  try {
    input = fs.readFileSync(0, "utf8");
  } catch {
    // no input: the prompt goes through
  }
  const out = hook(input);
  if (out) process.stdout.write(`${out}\n`);
}
