// The module index, as section 26 of the format text gives it (format/README.md; R63): every
// published version of every module, each by the digest of its package (section 25), with the tag of
// the release of modules whose files hold it, the anchor skills it teaches and its withdrawal from
// publication. A release builds it from the index of the release before it, its own packages, its
// tag and its withdrawals. A second implementation beside module-kit's, by which spec's CI computes
// the test vectors of the module index.

import { byCodeUnits } from "../shared.mjs";
import { VERSION_FIELD } from "./module.mjs";

// The rules of the module index, which refuse to build an index rather than a module (section 7).
export const ENTRIES_KEPT = "module-index.entries-kept";
export const ONE_PACKAGE = "module-index.one-package";
export const KNOWN_WITHDRAWALS = "module-index.known-withdrawals";
export const INDEX_RULES = [ENTRIES_KEPT, ONE_PACKAGE, KNOWN_WITHDRAWALS];
// The part of their IDs, <part>.<name>.
export const INDEX_PART = "module-index";

// The entry that a version has in the index of its module, or undefined: an ID or a version such as
// constructor names nothing that an object inherits.
const entryAt = (modules, id, version) => (Object.hasOwn(modules, id) && Object.hasOwn(modules[id], version) ? modules[id][version] : undefined);

// The anchor skills that a canonical view teaches: each that the teaches of a skill of its skill
// graph names, once, in the order of code units.
export function teachesOf(view) {
  const skills = Object.values(view.skill_graph?.skills ?? {});
  return [...new Set(skills.flatMap((skill) => skill.teaches ?? []))].sort(byCodeUnits);
}

// The entry of a package that packageOf built, { server, inventory, digest }, published by the
// release whose tag is release: its format version, the digest of its package, the release, and the
// anchor skills it teaches, when it teaches any.
export function entryOf(built, release) {
  const entry = { [VERSION_FIELD]: built.inventory[VERSION_FIELD], package_digest: built.digest, release };
  const teaches = teachesOf(built.server);
  if (teaches.length) entry.teaches = teaches;
  return entry;
}

// The index that a release builds (section 26). version is the format version it is built by;
// previous the index of the release before, or undefined for the first release; packages the
// release's packages as packageOf builds them; release its tag; withdrawals an object from a module's
// ID to each version that the release withdraws to the reason. { index, breaches }: breaches lists
// each rule that the build breaks, { rule, message }, and a build that breaks one is refused. The
// index is what the build gives without what breaks a rule.
export function indexOf({ version, previous, packages, release, withdrawals = {} }) {
  const modules = structuredClone(previous?.modules ?? {});
  const breaches = [];
  // The digest of each version that a package of this release gives, by its ID and version.
  const built = new Map();
  for (const pkg of packages) {
    const { id, version: moduleVersion } = pkg.inventory;
    const key = `${id} ${moduleVersion}`;
    if (built.has(key)) {
      if (built.get(key) !== pkg.digest) breaches.push({ rule: ONE_PACKAGE, message: `the release builds two packages of ${key}: ${built.get(key)} and ${pkg.digest}` });
      continue;
    }
    built.set(key, pkg.digest);
    const kept = entryAt(modules, id, moduleVersion);
    if (kept === undefined) {
      if (!Object.hasOwn(modules, id)) modules[id] = {};
      modules[id][moduleVersion] = entryOf(pkg, release);
    } else if (kept.package_digest !== pkg.digest) {
      breaches.push({ rule: ONE_PACKAGE, message: `the previous index names the package ${kept.package_digest} of ${key}, and the release builds ${pkg.digest}: a version is published once` });
    }
  }
  for (const id of Object.keys(withdrawals).sort(byCodeUnits)) {
    for (const moduleVersion of Object.keys(withdrawals[id]).sort(byCodeUnits)) {
      const reason = withdrawals[id][moduleVersion];
      const entry = entryAt(modules, id, moduleVersion);
      if (entry === undefined) breaches.push({ rule: KNOWN_WITHDRAWALS, message: `the release withdraws ${id} ${moduleVersion}, which the index does not name` });
      else if (entry.withdrawn === undefined) entry.withdrawn = reason;
      else if (entry.withdrawn !== reason) {
        breaches.push({ rule: ENTRIES_KEPT, message: `${id} ${moduleVersion} is withdrawn for ${entry.withdrawn}, and the release withdraws it for ${reason}: a withdrawal keeps its reason` });
      }
    }
  }
  return { index: { [VERSION_FIELD]: version, modules }, breaches };
}

// Whether format version a, MAJOR.MINOR, comes after b.
function isNewer(a, b) {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  return aMajor > bMajor || (aMajor === bMajor && aMinor > bMinor);
}

// What an index of an example or a vector does against section 26 that its schema cannot see: its
// root names a format version other than version, the one in format/VERSION — or, for an index
// built before, with earlier true, one newer than version —, or an entry lists teaches out of the
// order of code units. Messages, each a sentence.
export function indexFormProblems(index, version, earlier = false) {
  const problems = [];
  // A version other than the one in format/VERSION, in a form that the schema lets through.
  const named = index[VERSION_FIELD];
  const other = version !== null && named !== version && /^[0-9]+\.[0-9]+$/.test(named);
  if (other && !earlier) problems.push(`the index names the format version ${named}: it names ${version}, as format/VERSION has it`);
  else if (other && isNewer(named, version)) problems.push(`the index names the format version ${named}, newer than ${version}, which format/VERSION has`);
  for (const [id, versions] of Object.entries(index.modules ?? {})) {
    for (const [moduleVersion, entry] of Object.entries(versions)) {
      const teaches = entry.teaches ?? [];
      if (teaches.some((skill, at) => at > 0 && byCodeUnits(teaches[at - 1], skill) > 0)) {
        problems.push(`the teaches of ${id} ${moduleVersion} are not in the order of code units: ${[...teaches].sort(byCodeUnits).join(", ")}`);
      }
    }
  }
  return problems;
}
