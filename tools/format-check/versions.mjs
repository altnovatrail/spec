// The versions of a module, as section 27 of the format text gives them (format/README.md; R89,
// R101): the part of its version that a new version of a module raises, which a comparison of its
// package with the package of the newest published version finds, and the rules by which a new
// version is compared with every published version of its module, withdrawn ones too. A second
// implementation beside module-kit's diff, by which spec's CI computes the test vectors of versions.
// It compares packages as section 25 builds them, and reads a package of an earlier version of the
// format only by the places that section 2 keeps in every version. It runs no Starlark: the results
// of a solver stand among the numbers of the instances.

import { byCodeUnits } from "../shared.mjs";
import { DIGEST_PREFIX, canonicalText, descriptorOf, digestOf } from "./canonical.mjs";
import { VERSION_FIELD } from "./module.mjs";
import { instanceMaker } from "./templates.mjs";
import { answerSlotsOf, choiceForm, comparableOf, unitForm } from "./verdicts.mjs";

// The rules of versions of a module, which refuse a new version rather than a module (section 7).
export const ABOVE = "module-version.above";
export const STEP = "module-version.step";
export const RETIRED_COMPLETE = "module-version.retired-complete";
export const RETIRED_KEPT = "module-version.retired-kept";
export const RETIRED_KNOWN = "module-version.retired-known";
export const IDS_KEPT = "module-version.ids-kept";
export const LANGUAGES_KEPT = "module-version.languages-kept";
export const BANDS_KEPT = "module-version.bands-kept";
export const VERSION_RULES = [ABOVE, STEP, RETIRED_COMPLETE, RETIRED_KEPT, RETIRED_KNOWN, IDS_KEPT, LANGUAGES_KEPT, BANDS_KEPT];
// The part of their IDs, <part>.<name>.
export const VERSION_PART = "module-version";

// The parts of a version that a comparison finds, from the lowest: none, when nothing but the version
// changed, then patch, minor and major.
export const PARTS = ["none", "patch", "minor", "major"];
const rank = (part) => PARTS.indexOf(part);
export const higherPart = (a, b) => (rank(a) >= rank(b) ? a : b);

// The files of a package as files (section 25) that every version of the format keeps (section 2),
// of which a vector gives a published version of an earlier version of the format.
export const INVENTORY_FILE = "inventory.json";
export const SERVER_FILE = "server.json";
export const PACKAGE_FILES = [INVENTORY_FILE, SERVER_FILE];
// Whether the names of a folder's entries are those of a package as files, exactly.
export const isPackageFolder = (names) => names.length === PACKAGE_FILES.length && PACKAGE_FILES.every((name) => names.includes(name));

const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const FORMAT_VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const DIGEST = new RegExp(`^${DIGEST_PREFIX}[0-9a-f]{64}$`);

// A version of a module, X.Y.Z, as three integers, or null. A version has no bound, so BigInt.
export function semverOf(text) {
  const match = typeof text === "string" ? SEMVER.exec(text) : null;
  return match ? match.slice(1).map(BigInt) : null;
}

// -1, 0 or 1 as version a of a module stands below, at or above version b by Semantic Versioning: by
// their numbers, not their text, so that 1.10.0 is above 1.9.0.
export function semverCompare(a, b) {
  const [x, y] = [semverOf(a), semverOf(b)];
  for (let at = 0; at < 3; at++) if (x[at] !== y[at]) return x[at] < y[at] ? -1 : 1;
  return 0;
}

// -1, 0 or 1 as version a of the format, MAJOR.MINOR, stands below, at or above version b.
export function formatVersionCompare(a, b) {
  const [x, y] = [a, b].map((text) => text.split(".").map(Number));
  for (let at = 0; at < 2; at++) if (x[at] !== y[at]) return x[at] < y[at] ? -1 : 1;
  return 0;
}

// The part that the step from version from to version to raises, when to is the next version after
// from by one of its parts, or null (section 27). From X.Y.Z with X at least 1: X.Y.(Z+1) a patch,
// X.(Y+1).0 a minor and (X+1).0.0 a major. While X is 0, y plays the major: from 0.y.z with y at
// least 1, 0.y.(z+1) is a minor step, which serves a patch too, and 0.(y+1).0 and 1.0.0 are major
// steps; and every step from 0.0.z is a major one.
export function stepPart(from, to) {
  const [x, y, z] = semverOf(from);
  const [a, b, c] = semverOf(to);
  if (a === x && b === y && c === z + 1n) {
    if (x > 0n) return "patch";
    return y > 0n ? "minor" : "major";
  }
  if (a === x && b === y + 1n && c === 0n) return x > 0n ? "minor" : "major";
  if (a === x + 1n && b === 0n && c === 0n) return "major";
  return null;
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const keysOf = (value) => (isObject(value) ? Object.keys(value) : []);

// What the comparison reads of a package by the places that the format keeps in every version
// (section 2): from its inventory, the format version, the module's ID and version and the digest
// form of its server part; from its canonical view, the manifest's languages, the IDs of its bands in
// order, the keys of the skills of its skill graph and its retired skills with what replaced each,
// and the keys of its tasks, its lessons, its traps and its techniques. { places }, or { problem }
// when a package does not hold them where the format keeps them.
export function placesOf(inventory, view) {
  const at = (what) => ({ problem: `holds no ${what} where the format keeps it in every version (section 2)` });
  if (!isObject(inventory)) return at("inventory");
  if (typeof inventory[VERSION_FIELD] !== "string" || !FORMAT_VERSION.test(inventory[VERSION_FIELD])) return at(`${VERSION_FIELD} of its inventory`);
  if (typeof inventory.id !== "string") return at("id of its inventory");
  if (!semverOf(inventory.version)) return at("version of its inventory");
  if (!isObject(inventory.server_part) || typeof inventory.server_part.digest !== "string" || !DIGEST.test(inventory.server_part.digest)) return at("digest of the server part in its inventory");
  if (!isObject(view) || !isObject(view.manifest)) return at("manifest in its canonical view");
  const { languages, bands = [] } = view.manifest;
  if (!isObject(languages)) return at("manifest.languages");
  if (!Array.isArray(bands) || !bands.every((band) => isObject(band) && typeof band.id === "string")) return at("manifest.bands, each with its id");
  const graph = view.skill_graph ?? {};
  const retired = graph.retired_skills ?? {};
  if (!isObject(graph) || !isObject(graph.skills ?? {}) || !isObject(retired) || !Object.values(retired).every((entry) => isObject(entry) && isStrings(entry.replaced_by))) {
    return at("skill_graph, with its skills and its retired_skills, each with its replaced_by");
  }
  for (const [member, inner] of [["tasks"], ["lessons"], ["traps", "traps"], ["techniques", "techniques"]]) {
    const value = inner ? view[member]?.[inner] : view[member];
    if (value !== undefined && !isObject(value)) return at(inner ? `${member}.${inner}` : member);
  }
  return {
    places: {
      formatVersion: inventory[VERSION_FIELD],
      id: inventory.id,
      version: inventory.version,
      languages,
      bands: bands.map((band) => band.id),
      skills: keysOf(graph.skills),
      retired: Object.fromEntries(Object.entries(retired).map(([id, entry]) => [id, entry.replaced_by])),
      tasks: keysOf(view.tasks),
      lessons: keysOf(view.lessons),
      traps: keysOf(view.traps?.traps),
      techniques: keysOf(view.techniques?.techniques),
    },
  };
}

// A package as files of an earlier version of the format, each a Buffer, as a vector gives a published
// version, read by the places that every version keeps (section 2): inventory.json and server.json,
// each a JSON value, the inventory naming the server part by the digest and the size of the bytes of
// server.json, and the digest of the package that of the bytes of inventory.json. How a later
// version writes its canonical text or its device part is not read. { pkg: { inventory, view, digest } },
// or { problems }, each { file, message }.
export function packageFromFiles(files) {
  const problems = [];
  const values = {};
  for (const name of PACKAGE_FILES) {
    try {
      values[name] = JSON.parse(files[name].toString("utf8"));
    } catch (error) {
      problems.push({ file: name, message: `is no JSON value: ${error.message}` });
    }
  }
  if (problems.length) return { problems };
  const inventory = values[INVENTORY_FILE];
  const named = JSON.stringify(isObject(inventory?.server_part) ? { digest: inventory.server_part.digest, size: inventory.server_part.size } : null);
  const has = JSON.stringify(descriptorOf(files[SERVER_FILE]));
  if (named !== has) return { problems: [{ file: INVENTORY_FILE, message: `names the server part ${named}, and ${SERVER_FILE} is ${has}` }] };
  return { pkg: { inventory, view: values[SERVER_FILE], digest: digestOf(files[INVENTORY_FILE]) } };
}

// What decides the verdict and the trap of an answer slot, which a comparison compares by meaning
// (section 27): the kind always; for number, the key as a rational and the set of units as a unit
// compares; for fraction, the key as a rational and the form, any unless given; for choice, the key
// and the set of options — the check's own, or the slot's when it is bound choice — as a choice
// compares them; for predicate, the predicate as written; and the set of trap values, each the value
// as the check compares it with its trap. A rubric gives no verdict: its criteria are compared apart.
// A canonical text, so that two checks of one meaning give the same one.
export function checkMeaningOf(slot) {
  const { check } = slot;
  const set = (items) => [...new Set(items)].sort(byCodeUnits);
  const traps = (check.trap_values ?? []).map((trap) => canonicalText([comparableOf(slot, trap.value), trap.trap]));
  const meaning = { kind: check.kind };
  if (check.kind === "number") Object.assign(meaning, { key: comparableOf(slot, check.key), units: set((check.units ?? []).map(unitForm).filter((unit) => unit !== "")), traps: set(traps) });
  else if (check.kind === "fraction") Object.assign(meaning, { key: comparableOf(slot, check.key), form: check.form ?? "any", traps: set(traps) });
  else if (check.kind === "choice") Object.assign(meaning, { key: choiceForm(check.key), options: set((check.options ?? slot.options ?? []).map(choiceForm)), traps: set(traps) });
  else if (check.kind === "predicate") meaning.predicate = check.predicate;
  else if (check.kind !== "rubric") throw new Error(`format-check compares no check of the kind ${check.kind}: tools/format-check/versions.mjs has to`);
  return canonicalText(meaning);
}

const differ = (a, b) => canonicalText(a ?? null) !== canonicalText(b ?? null);
const setOf = (items) => new Set(items ?? []);
const sameSet = (a, b) => a.size === b.size && [...a].every((item) => b.has(item));
const without = (a, b) => [...a].filter((item) => !b.has(item));

// The changes from the canonical view and the device listing of before to those of after, both of
// one version of the format, by the table of section 27, and the part that they raise: { part,
// changes }, each change { at, part, what }, at a JSON Pointer in the canonical view, or in the
// listing of the device part when it begins with #device. Anything else that differs, but the
// version in the manifest, is a patch.
export function foundPartOf(before, after) {
  const changes = [];
  const change = (at, part, what) => changes.push({ at, part, what });
  const plain = ({ manifest: { version, ...manifest }, ...view }) => ({ ...view, manifest });
  if (differ(plain(before.view), plain(after.view))) change("#", "patch", "the canonical view differs beyond the version");
  if (differ(before.device, after.device)) change("#device", "patch", "the listing of the device part differs");
  compareManifests(before.view.manifest, after.view.manifest, change);
  compareSkillGraphs(before.view.skill_graph ?? {}, after.view.skill_graph ?? {}, change);
  compareCatalogs(before.view, after.view, change);
  compareSolvingSteps(before.view.solving_steps, after.view.solving_steps, change);
  compareTasks(before.view, after.view, change);
  compareLessons(before.view, after.view, change);
  const part = changes.reduce((highest, { part }) => higherPart(highest, part), "none");
  return { part, changes };
}

// The age categories that a task or a lesson suits: its own, or else the module's (sections 14 and 21).
const suited = (entry, manifest) => setOf(entry.age_categories ?? manifest.audience?.age_categories);

// A set that narrows is a major change, and one that widens a minor one.
function compareSuited(at, before, after, change) {
  if (without(before, after).length) change(at, "major", "the age categories narrow");
  else if (without(after, before).length) change(at, "minor", "the age categories widen");
}

function compareManifests(before, after, change) {
  for (const field of ["subject", "license"]) if (differ(before[field], after[field])) change(`#/manifest/${field}`, "major", `the ${field} changes`);
  compareSuited("#/manifest/audience/age_categories", setOf(before.audience?.age_categories), setOf(after.audience?.age_categories), change);
  if (!sameSet(setOf(before.audience?.grades), setOf(after.audience?.grades))) change("#/manifest/audience/grades", "minor", "the grades change");
  // The bands kept: grades of a band at its place are a minor change, and a band after the last a
  // minor one too. A band removed, moved or put before the others is module-version.bands-kept's.
  const [kept, added] = [before.bands ?? [], after.bands ?? []];
  if (kept.every((band, at) => added[at]?.id === band.id)) {
    kept.forEach((band, at) => {
      if (!sameSet(setOf(band.grades), setOf(added[at].grades))) change(`#/manifest/bands/${at}/grades`, "minor", `the grades of the band ${band.id} change`);
    });
    if (added.length > kept.length) change(`#/manifest/bands/${kept.length}`, "minor", "a band comes after the last");
  }
  const height = (manifest) => manifest.canvas?.digit_height ?? 24;
  if (height(before) !== height(after)) change("#/manifest/canvas/digit_height", "minor", "the height of a digit on a crop changes");
}

// Entries of a kind by local ID: one removed is a major change, and one added a minor one.
function compareKeys(at, before, after, what, change) {
  const [was, is] = [setOf(keysOf(before)), setOf(keysOf(after))];
  for (const id of without(was, is)) change(`${at}/${id}`, "major", `the ${what} ${id} is removed`);
  for (const id of without(is, was)) change(`${at}/${id}`, "minor", `the ${what} ${id} is added`);
  return [...was].filter((id) => is.has(id));
}

function compareSkillGraphs(before, after, change) {
  const at = "#/skill_graph/skills";
  for (const id of compareKeys(at, before.skills, after.skills, "skill", change)) {
    const [was, is] = [before.skills[id], after.skills[id]];
    if (!sameSet(setOf(was.prerequisites), setOf(is.prerequisites))) change(`${at}/${id}/prerequisites`, "minor", `the prerequisites of ${id} change`);
    const [taught, teaches] = [setOf(was.teaches), setOf(is.teaches)];
    if (without(taught, teaches).length) change(`${at}/${id}/teaches`, "major", `${id} no longer teaches ${without(taught, teaches).join(", ")}`);
    else if (without(teaches, taught).length) change(`${at}/${id}/teaches`, "minor", `${id} teaches ${without(teaches, taught).join(", ")} too`);
    if (was.assessability !== is.assessability) change(`${at}/${id}/assessability`, "major", `the assessability of ${id} changes`);
  }
  // A new entry of retired_skills comes with a retirement, and replaced_by changes only as a skill
  // that it names is retired in turn: either goes with a major change (section 27). replaced_by is a
  // set: its order carries no meaning.
  const table = (graph) => Object.fromEntries(Object.entries(graph.retired_skills ?? {}).map(([id, entry]) => [id, [...setOf(entry.replaced_by)].sort(byCodeUnits)]));
  if (differ(table(before), table(after))) change("#/skill_graph/retired_skills", "major", "the retired skills change");
}

function compareCatalogs(before, after, change) {
  const traps = compareKeys("#/traps/traps", before.traps?.traps, after.traps?.traps, "trap", change);
  for (const id of traps) {
    if (!sameSet(setOf(before.traps.traps[id].skills), setOf(after.traps.traps[id].skills))) change(`#/traps/traps/${id}/skills`, "minor", `the skills of the trap ${id} change`);
  }
  compareKeys("#/techniques/techniques", before.techniques?.techniques, after.techniques?.techniques, "technique", change);
}

function compareSolvingSteps(before, after, change) {
  if (before && !after) return change("#/solving_steps", "major", "the solving steps are removed");
  if (!before && after) return change("#/solving_steps", "minor", "the solving steps are added");
  if (!before) return;
  // Steps have no IDs: their number and, at each place, what the step gives, as a set, and its exit
  // condition. Their titles are words.
  const flow = (steps) => steps.map((step) => [[...setOf(step.gives)].sort(byCodeUnits), step.exit_condition]);
  if (differ(flow(before.steps), flow(after.steps))) change("#/solving_steps/steps", "minor", "the solving steps change their number, order, what they give or their exit conditions");
}

// The items and answer slots of two tasks, by their places: their number, the binding of each slot,
// what decides its verdict and trap, and the criteria of a rubric (section 27). withChecks is false
// for a template as written, whose checks are compared through its instances.
function compareItems(at, before, after, change, withChecks = true) {
  if (before.items.length !== after.items.length) return change(`${at}/items`, "major", "the number of items changes");
  before.items.forEach((item, place) => {
    const [was, is] = [answerSlotsOf(item), answerSlotsOf(after.items[place])];
    const there = `${at}/items/${place}`;
    if (was.length !== is.length) return change(there, "major", `the number of answer slots of item ${place + 1} changes`);
    was.forEach((slot, number) => {
      const here = `${there}: answer slot ${number + 1}`;
      if (slot.binding !== is[number].binding) return change(here, "major", "the binding changes");
      if (!withChecks) return;
      if (checkMeaningOf(slot) !== checkMeaningOf(is[number])) change(here, "major", "what decides the verdict or the trap changes");
      else if (slot.check.kind === "rubric" && differ(slot.check.criteria, is[number].check.criteria)) change(here, "minor", "the criteria of the rubric change");
    });
  });
}

// What a task gives the learner model and the engine beside its checks: its skills and those of its
// items, its band, its difficulty, its techniques and its traps (section 27).
function compareGuidance(at, before, after, change) {
  // The skills of each role as a set: their order in a list carries no meaning.
  const roles = (skills) => (skills ? { primary: [...setOf(skills.primary)].sort(byCodeUnits), supporting: [...setOf(skills.supporting)].sort(byCodeUnits) } : null);
  // The items at the places of both: an item added or removed is a major change of its own.
  const shared = Math.min(before.items.length, after.items.length);
  const items = (task) => task.items.slice(0, shared).map((item) => roles(item.skills));
  if (differ(roles(before.skills), roles(after.skills)) || differ(items(before), items(after))) change(`${at}/skills`, "minor", "the skills change");
  for (const field of ["band", "difficulty"]) if (before[field] !== after[field]) change(`${at}/${field}`, "minor", `the ${field} changes`);
  for (const field of ["techniques", "traps"]) if (!sameSet(setOf(before[field]), setOf(after[field]))) change(`${at}/${field}`, "minor", `the ${field} change`);
}

function compareTasks(before, after, change) {
  const at = "#/tasks";
  for (const id of compareKeys(at, before.tasks, after.tasks, "task", change)) {
    const [was, is] = [before.tasks[id], after.tasks[id]];
    const here = `${at}/${id}`;
    compareSuited(`${here}/age_categories`, suited(was, before.manifest), suited(is, after.manifest), change);
    compareGuidance(here, was, is, change);
    if ((was.template === undefined) !== (is.template === undefined)) {
      change(`${here}/template`, "major", `the task ${id} ${was.template === undefined ? "becomes" : "is no longer"} a template`);
      continue;
    }
    if (was.canvas.kind !== is.canvas.kind) {
      change(`${here}/canvas/kind`, "major", "the canvas kind changes");
      continue;
    }
    if (was.template === undefined) {
      compareItems(here, was, is, change);
      continue;
    }
    compareItems(here, was, is, change, false);
    compareInstances(id, before, after, change);
  }
}

// The instances of a template in both versions, matched by the numbers of their parameters, not by
// their places (section 27): parameters of other names match none, a major change; an instance in
// one version alone is a minor change; and on each pair the checks are compared, each with its
// numbers in place, so that a key that changes is a major change.
function compareInstances(id, before, after, change) {
  const here = `#/tasks/${id}`;
  const [was, is] = [before.tasks[id], after.tasks[id]];
  const names = (task) => Object.keys(task.template.parameters).sort(byCodeUnits);
  if (differ(names(was), names(is))) return change(`${here}/template/parameters`, "major", "the parameters have other names: no instance matches");
  const keyOf = (numbers) => canonicalText(Object.fromEntries(names(was).map((name) => [name, numbers[name]])));
  const byKey = (view) => new Map((view.instances?.[id] ?? []).map((numbers) => [keyOf(numbers), numbers]));
  const [old, now] = [byKey(before), byKey(after)];
  const make = [instanceMaker(was), instanceMaker(is)];
  const numbersOf = (numbers) => new Map(Object.entries(numbers).map(([name, number]) => [name, BigInt(number)]));
  for (const [key, numbers] of old) {
    if (!now.has(key)) {
      change(`#/instances/${id}`, "minor", `the instance ${key} is no longer one`);
      continue;
    }
    compareItems(`#/instances/${id}: ${key}`, make[0](numbersOf(numbers)), make[1](numbersOf(now.get(key))), change);
  }
  for (const key of now.keys()) if (!old.has(key)) change(`#/instances/${id}`, "minor", `the instance ${key} is new`);
}

// Segments of a lesson, by their places: what each is, and for a task the task (section 27). A
// segment added after the last is a minor change; any other change of the segments a major one.
function compareLessons(before, after, change) {
  const at = "#/lessons";
  for (const id of compareKeys(at, before.lessons, after.lessons, "lesson", change)) {
    const [was, is] = [before.lessons[id], after.lessons[id]];
    const here = `${at}/${id}`;
    const kindOf = (segment) => (segment.task !== undefined ? `task ${segment.task}` : Object.keys(segment)[0]);
    const [old, now] = [was.segments.map(kindOf), is.segments.map(kindOf)];
    if (now.length < old.length || old.some((segment, place) => now[place] !== segment)) change(`${here}/segments`, "major", "a segment is removed, put before another, moved or replaced");
    else if (now.length > old.length) change(`${here}/segments`, "minor", "a segment comes after the last");
    if (!sameSet(setOf(was.skills), setOf(is.skills))) change(`${here}/skills`, "minor", "the skills change");
    compareSuited(`${here}/age_categories`, suited(was, before.manifest), suited(is, after.manifest), change);
  }
}

// A new version, next, against the published versions of its module, published, each { digest,
// places } as placesOf gives them, with view and device, its canonical view and the listing of its
// device part, when its format version is next's (section 27). next is the same, with its view and
// device. { part, changes, breaches, unchanged }: the part that the comparison with the newest
// published version finds, the changes it finds, and each rule that the new version breaks,
// { rule, message }. unchanged is true when next is the newest published version as it was: then
// nothing is compared.
export function compareVersions({ published, next }) {
  const versions = [...published].sort((a, b) => semverCompare(a.places.version, b.places.version));
  const newest = versions.at(-1);
  const at = next.places.version;
  if (at === newest.places.version && next.digest === newest.digest) return { part: "none", changes: [], breaches: [], unchanged: true };
  const breaches = [];
  const breach = (rule, message) => breaches.push({ rule, message });
  for (const { places, digest } of versions) {
    const order = semverCompare(at, places.version);
    if (order === 0) breach(ABOVE, `${at} is published already, with the package ${digest}: a version is published once`);
    else if (order < 0) breach(ABOVE, `${at} is below ${places.version}, which is published: a new version stands above every published one`);
  }
  // The part: through a move to another version of the format, a major one while the format is v0;
  // otherwise what the comparison with the newest published version finds.
  const { part, changes } = newest.places.formatVersion === next.places.formatVersion ? foundPartOf(newest, next) : movePart(newest.places.formatVersion, next.places.formatVersion);
  if (!breaches.length) {
    const step = stepPart(newest.places.version, at);
    if (step === null) breach(STEP, `${at} is not the next version after ${newest.places.version} by one of its parts`);
    else if (rank(step) < rank(part)) breach(STEP, `${at} raises the ${step} part after ${newest.places.version}, and the comparison finds a ${part} change: ${shownAt(changes, part)}`);
  }
  breaches.push(...placeBreaches(versions, next.places));
  return { part, changes, breaches, unchanged: false };
}

// The part of a move of a module from one version of the format to another: major while the format is
// v0. Section 27 gives no part of a move from v1 on, and format-check computes none.
function movePart(from, to) {
  if (![from, to].every((version) => version.startsWith("0."))) throw new Error(`section 27 gives no part of a move from version ${from} of the format to ${to}: only while the format is v0`);
  return { part: "major", changes: [{ at: "#", part: "major", what: `the module moves from version ${from} of the format to ${to}` }] };
}

// The changes of one part, as a reader reads them.
export const shownAt = (changes, part) => changes.filter((change) => change.part === part).map((change) => `${change.at}: ${change.what}`).join("; ");

// The rules that read only the places of section 2: they hold through a move to another version of
// the format too (section 27). versions are the published ones, in the order of their versions.
function placeBreaches(versions, next) {
  const breaches = [];
  const breach = (rule, message) => breaches.push({ rule, message });
  const newest = versions.at(-1).places;
  const [skills, retired] = [new Set(next.skills), next.retired];
  const everSkills = new Set(versions.flatMap(({ places }) => places.skills));
  for (const id of [...everSkills].sort(byCodeUnits)) {
    if (!skills.has(id) && !Object.hasOwn(retired, id)) breach(RETIRED_COMPLETE, `the skill ${id} of a published version is neither in skills nor in retired_skills`);
  }
  for (const [id, replaced] of Object.entries(newest.retired)) {
    if (!Object.hasOwn(retired, id)) {
      breach(RETIRED_KEPT, `the entry ${id} of retired_skills of ${newest.version} is gone`);
      continue;
    }
    // Each skill that replaced id stays, or, retired in turn, gives way to its own replacements.
    const expanded = new Set(replaced.flatMap((skill) => (Object.hasOwn(retired, skill) ? retired[skill] : [skill])));
    if (!sameSet(expanded, new Set(retired[id]))) breach(RETIRED_KEPT, `${id} is replaced by ${[...retired[id]].join(", ") || "none"}, and ${newest.version} has it replaced by ${replaced.join(", ") || "none"}: an entry only expands`);
  }
  for (const id of Object.keys(retired)) {
    if (!Object.hasOwn(newest.retired, id) && !everSkills.has(id)) breach(RETIRED_KNOWN, `the new entry ${id} of retired_skills names no skill of a published version`);
  }
  for (const kind of ["skills", "tasks", "lessons", "traps", "techniques"]) {
    const kept = new Set(newest[kind]);
    const gone = new Set(versions.flatMap(({ places }) => places[kind]).filter((id) => !kept.has(id)));
    for (const id of next[kind]) if (gone.has(id)) breach(IDS_KEPT, `${id} names one of the ${kind} again, which the newest published version, ${newest.version}, does not have: a published ID never names another entry`);
  }
  for (const { places } of versions) {
    if (differ(places.languages, next.languages)) breach(LANGUAGES_KEPT, `the languages differ from those of ${places.version}: a module in other languages is another module`);
    if (places.bands.some((band, at) => next.bands[at] !== band)) breach(BANDS_KEPT, `the bands of ${places.version}, ${places.bands.join(", ")}, are not the first bands of the new version, ${next.bands.join(", ") || "none"}`);
  }
  return breaches;
}
