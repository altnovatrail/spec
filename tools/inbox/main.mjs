// inbox: what the other NovaTrail repositories hold for spec (R81).
//
//   node tools/inbox/main.mjs
//
// Reads table 3 of each repository's RUN.md on GitHub through gh — on main, and in each open
// pull request — and table 5 of spec's RUN.md in the working tree, the rows spec has recorded.
// Prints the rows marked «в реестр spec» that are new on main, those on the way in an open pull
// request, the rows of table 5 whose rows on main have changed since it recorded them — by the
// fingerprint it keeps of them —, and the numbers of table 5 that the source no longer marks. A
// session of spec runs it on the author's word or once every task of the current epic is done, not
// before each task (RUN.md, rule 13); nobody carries a row from session to session any more. It
// also prints what the savings of E10 ask — the monthly measurement or the quarterly check of
// Claude Code's changelog, once its date in measurements 1.9 has come (R145). Exits 0 when it read and compared everything; 1 when table 5 has a row it
// cannot read or names a repository it does not read, or measurements 1.9 does not name its dates; 2 when a repository or a pull request could
// not be read — gh has to be logged in —, and then it still prints what it read of the others.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REPOSITORIES } from "../release/repositories.mjs";
import { byCodeUnits, isMain } from "../shared.mjs";
import { compare, ledgerOf, readRepository, report, runGh } from "./inbox.mjs";
import { dueOf } from "./due.mjs";

const SPEC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUN = path.join(SPEC, "RUN.md");
const MEASUREMENTS = path.join(SPEC, "docs", "measurements.md");

// Every repository of the organization but spec itself, in a stable order.
export const OTHERS = Object.keys(REPOSITORIES)
  .filter((name) => name !== "spec")
  .sort(byCodeUnits);

// The whole run: { lines, status }.
export function inbox({
  names = OTHERS,
  ledgerSource = fs.readFileSync(RUN, "utf8"),
  measurementsSource = fs.readFileSync(MEASUREMENTS, "utf8"),
  today = new Date(),
  gh = runGh,
} = {}) {
  const { ledger, entries, problems } = ledgerOf(ledgerSource);
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
  const result = compare(repositories, ledger, names, entries);
  const dates = dueOf(measurementsSource, today);
  const wrong = [...problems, ...result.problems, ...dates.problems];
  let status = 0;
  if (wrong.length) status = 1;
  if (unread.length) status = 2;
  return { lines: [...report(result, repositories.length), ...dates.due, ...wrong, ...unread.map((u) => `inbox: ${u}`)], status };
}

if (isMain(import.meta.url)) {
  const { lines, status } = inbox();
  console.log(lines.join("\n"));
  process.exitCode = status;
}
