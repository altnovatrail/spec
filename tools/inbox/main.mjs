// inbox: what the other NovaTrail repositories hold for spec (R81).
//
//   node tools/inbox/main.mjs
//
// Reads table 3 of each repository's RUN.md on GitHub through gh — on main, and in each open
// pull request — and table 5 of spec's RUN.md in the working tree, the rows spec has recorded.
// Prints the rows marked «в реестр spec» that are new on main, those on the way in an open pull
// request, and the numbers of table 5 that the source no longer marks. A session of spec runs it
// before a task (RUN.md, rule 13); nobody carries a row from session to session any more. Exits 0
// when it read and compared everything; 1 when table 5 has a row it cannot read or names a
// repository it does not read; 2 when a repository or a pull request could not be read — gh has to
// be logged in —, and then it still prints what it read of the others.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REPOSITORIES } from "../release/repositories.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { compare, ledgerOf, readRepository, report, runGh } from "./inbox.mjs";

const RUN = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "RUN.md");

// Every repository of the organization but spec itself, in a stable order.
export const OTHERS = Object.keys(REPOSITORIES)
  .filter((name) => name !== "spec")
  .sort(byCodeUnits);

// The whole run: { lines, status }.
export function inbox({ names = OTHERS, ledgerSource = fs.readFileSync(RUN, "utf8"), gh = runGh } = {}) {
  const { ledger, problems } = ledgerOf(ledgerSource);
  const unread = [];
  const repositories = [];
  for (const name of names) {
    try {
      const repository = readRepository(name, gh);
      repositories.push(repository);
      unread.push(...repository.problems);
    } catch (error) {
      unread.push(`cannot read ${name} — ${error.message}`);
    }
  }
  const result = compare(repositories, ledger, names);
  const wrong = [...problems, ...result.problems];
  let status = 0;
  if (wrong.length) status = 1;
  if (unread.length) status = 2;
  return { lines: [...report(result, repositories.length), ...wrong, ...unread.map((u) => `inbox: ${u}`)], status };
}

if (isMain(import.meta.url)) {
  const { lines, status } = inbox();
  console.log(lines.join("\n"));
  process.exitCode = status;
}
