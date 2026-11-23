// patchcov: the coverage of the lines a branch changes, as Codecov's check codecov/patch counts it,
// before the pull request.
//
//   node tools/patchcov/main.mjs [--report <file>]… [--config <file>]
//
// It runs in the root of a NovaTrail repository — `just -f spec/justfile patchcov` there, `just
// patchcov` in spec — after the repository's ci-test has written its reports: the base is the
// merge-base of origin/main and HEAD; the reports, coverage/go.out and
// coverage/lcov.info, whichever are there; the target, the repository's .github/codecov.yml. It
// prints JSON: the target, the coverage, the hits, misses and partials, and by file the lines
// missed and partly covered. Exits 0 at or above the target, 1 below it, 2 on a wrong input. It
// takes only Node's own modules: spec/tools/ of another repository has no node_modules.

import { parseArgs } from "node:util";
import { isMain } from "../shared.mjs";
import { measure } from "./patchcov.mjs";

export function main(argv, { cwd = process.cwd(), out = (l) => console.log(l), err = (l) => console.error(l) } = {}) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: { report: { type: "string", multiple: true }, config: { type: "string" } }, strict: true, allowPositionals: false }));
  } catch {
    err("patchcov: [--report <file>]… [--config <file>]");
    return 2;
  }
  let result;
  try {
    result = measure({ root: cwd, reports: values.report ?? null, config: values.config ?? ".github/codecov.yml" });
  } catch (error) {
    err(`patchcov: ${error.message}`);
    return 2;
  }
  out(JSON.stringify(result));
  if (!result.pass) err(`patchcov: ${result.coverage}% of the patch hit, below the target of ${result.target}%`);
  return result.pass ? 0 : 1;
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2));
