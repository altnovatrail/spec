// What a run's session spent by its transcript, for an attempt that printed no `result` — one the
// orchestrator stopped, or one cut short (T175). Claude Code writes the session's transcript to the
// volume novatrail-claude in the executor's container, beside the orchestrator's own folder:
// `projects/<the workdir, each character but a letter or a digit a dash>/<session>.jsonl`, and the
// transcripts of its subagents in `<session>/subagents/`. Every attempt of a run resumes the one
// session, so the transcript holds them all, as a result's total_cost_usd does (sources 2.11).
//
// Each call of the model is counted once, by its message's id, with its largest output, as
// tokens-report counts it (measurements 1): the call and its tokens are tools/tokens/calls.mjs, its
// prices tools/tokens/prices.mjs, and neither takes a package.

import fs from "node:fs";
import path from "node:path";
import { callOf, tokensOf } from "../tokens/calls.mjs";
import { costOf } from "../tokens/prices.mjs";

// What each session's transcripts came to, by their sizes and times of change: `wait` asks again
// every few seconds, and a long session's transcript runs to megabytes.
const CACHE = new Map();

// The folder of a session's transcripts for a container's workdir, under the volume's root.
export function projectOf(root, workdir) {
  return path.join(root, "projects", workdir.replace(/[^a-zA-Z0-9]/g, "-"));
}

// What the session cost by its transcripts: dollars, the calls counted and those with no price — a
// model the prices do not name, or fast mode —, or null when there is no transcript. Read again
// only when a file of it has changed.
export function sessionCost(root, workdir, session) {
  const dir = projectOf(root, workdir);
  const main = path.join(dir, `${session}.jsonl`);
  if (!fs.existsSync(main)) return null;
  const files = [main];
  const subagents = path.join(dir, session, "subagents");
  if (fs.existsSync(subagents)) {
    for (const name of fs.readdirSync(subagents).sort()) if (name.endsWith(".jsonl")) files.push(path.join(subagents, name));
  }
  const signature = files
    .map((file) => {
      const stat = fs.statSync(file);
      return `${file}:${stat.size}:${stat.mtimeMs}`;
    })
    .join("\n");
  const known = CACHE.get(main);
  if (known?.signature === signature) return known.cost;
  const cost = costOfFiles(files);
  CACHE.set(main, { signature, cost });
  return cost;
}

function costOfFiles(files) {
  const calls = new Map();
  for (const file of files) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      // Most records are no call of the model: they are not parsed.
      if (!line.includes('"assistant"')) continue;
      let message;
      try {
        message = callOf(JSON.parse(line));
      } catch {
        continue;
      }
      if (!message) continue;
      const known = calls.get(message.id);
      if (known) known.output = Math.max(known.output, message.usage.output_tokens ?? 0);
      else calls.set(message.id, { model: message.model, ...tokensOf(message.usage) });
    }
  }
  let usd = 0;
  let unpriced = 0;
  for (const call of calls.values()) {
    const cost = costOf(call.model, call);
    if (cost === null) unpriced += 1;
    else usd += cost;
  }
  return { usd, calls: calls.size, unpriced };
}
