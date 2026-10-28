// The package of a module, as section 25 of the format text gives it (format/README.md; R62): its
// canonical view, which is its server part, with the tier of each skill (section 12) and the numbers
// of every instance of each template (section 23); its device part, named by a listing of its files;
// and its inventory, which names both parts by their digests, and whose digest is the package's. A
// second implementation beside module-kit's, by which spec's CI computes the test vectors of
// packages and of tiers. The results of a solver come from Starlark, which spec does not run
// (section 24): format-check takes them from a vector.

import fs from "node:fs";
import path from "node:path";
import { byCodeUnits } from "../shared.mjs";
import { canonicalBytes, descriptorOf, digestOf } from "./canonical.mjs";
import { LICENSE, MANIFEST_PART, NOTICE, VERSION_FIELD } from "./module.mjs";
import { resultsOf, templateOf } from "./templates.mjs";

// The members of a canonical view that no part of the layout gives: the tier of each skill of the
// skill graph, and the numbers of the instances of the templates among the tasks.
const SKILL_GRAPH = "skill_graph";
const SKILL_TIERS = "skill_tiers";
const TASKS = "tasks";
const INSTANCES = "instances";
const MEDIA = "media";
// An anchor skill of the shared taxonomy, core.<name>, counts for no tier (section 12).
const isAnchor = (id) => id.startsWith("core.");

// The name of the member of a canonical view that holds a part, by its row of the layout: a part
// that a module has once under its term in snake_case, skill_graph; a part that it has many of under
// the name of its folder, tasks, an object by local ID.
export const memberOf = (row) => (row.id === null ? row.part.replaceAll("-", "_") : row.names.join("_"));

// The tier of each skill of a skill graph (section 12): { tiers }, an object from each skill's local
// ID to its tier, or { problem } when a prerequisite names no skill of the module and no anchor skill,
// or the prerequisites run in a cycle, which only module-kit refuses by its rule.
export function tiersOf(skillGraph) {
  const skills = skillGraph.skills ?? {};
  const tiers = {};
  const onPath = new Set();
  let problem = null;
  const tierOf = (id) => {
    if (Object.hasOwn(tiers, id)) return tiers[id];
    if (onPath.has(id)) {
      problem ??= `the prerequisites of ${id} run in a cycle: its tier is no number`;
      return 0;
    }
    onPath.add(id);
    let highest = 0;
    for (const prerequisite of skills[id].prerequisites ?? []) {
      if (isAnchor(prerequisite)) continue;
      if (!Object.hasOwn(skills, prerequisite)) problem ??= `${id} needs ${prerequisite}, which is no skill of the module`;
      else highest = Math.max(highest, tierOf(prerequisite));
    }
    onPath.delete(id);
    tiers[id] = highest + 1;
    return tiers[id];
  };
  for (const id of Object.keys(skills).sort(byCodeUnits)) tierOf(id);
  return problem ? { problem } : { tiers };
}

// The canonical view of a module from its members, each part's value under memberOf its row (section
// 25): the members as they are, then skill_tiers when there is a skill graph, and instances when a
// task is a template — each template's instances in order, each an object from every parameter,
// derived number and result of its solver to its number. results, an object from a template's ID to
// the results of its solver on each instance, in order, as a vector gives them, adds them; without
// them, an instance holds the numbers that spec computes. { view }, or { problem, inResults }, where
// inResults is true when the problem is with the results given rather than with the module.
export function canonicalViewOf(members, results = {}) {
  const view = { ...members };
  if (members[SKILL_GRAPH]) {
    const { tiers, problem } = tiersOf(members[SKILL_GRAPH]);
    if (problem) return { problem };
    view[SKILL_TIERS] = tiers;
  }
  const instances = {};
  for (const id of Object.keys(members[TASKS] ?? {}).sort(byCodeUnits)) {
    const task = members[TASKS][id];
    if (task.template === undefined) continue;
    const counted = templateOf(task).instances;
    if (!counted) return { problem: `the template ${id} has no instances that spec can count: it breaks a rule of a template` };
    // An ID such as constructor names nothing that results inherits.
    const given = Object.hasOwn(results, id) ? results[id] : undefined;
    if (given !== undefined && given.length !== counted.length) return { problem: `the results of the solver of ${id} are given for ${given.length} instances, and it has ${counted.length}`, inResults: true };
    const names = resultsOf(task);
    const missing = given === undefined ? -1 : given.findIndex((numbers) => names.some((name) => !Object.hasOwn(numbers, name)));
    if (missing !== -1) return { problem: `the results of the solver of ${id} are not all given on instance ${missing}: each of ${names.join(", ")} is`, inResults: true };
    instances[id] = counted.map((numbers, index) => {
      const own = Object.fromEntries([...numbers].map(([name, number]) => [name, Number(number)]));
      return given === undefined ? own : { ...own, ...Object.fromEntries(names.map((name) => [name, given[index][name]])) };
    });
  }
  if (Object.keys(instances).length) view[INSTANCES] = instances;
  return { view };
}

// The listing of a module's device part (section 25): LICENSE, NOTICE when the module has one, and
// each file of media/ by its path from media/, each named by its digest and size. files are the
// module's files by their paths from its folder.
export function deviceListingOf(folder, files) {
  const read = (file) => descriptorOf(fs.readFileSync(path.join(folder, file)));
  const listing = { license: read(LICENSE) };
  if (files.includes(NOTICE)) listing.notice = read(NOTICE);
  const media = files.filter((file) => file.startsWith(`${MEDIA}/`)).sort(byCodeUnits);
  if (media.length) listing.media = Object.fromEntries(media.map((file) => [file.slice(MEDIA.length + 1), read(file)]));
  return listing;
}

// The package of a module: { server, device, inventory, digest } — its canonical view, the listing of
// its device part, its inventory and its digest —, or { problem, inResults } as canonicalViewOf
// gives it. folder is the module's folder,
// files its files, members its parts as canonicalViewOf takes them, and results the results of its
// solvers.
export function packageOf(folder, files, members, results = {}) {
  const { view, problem, inResults } = canonicalViewOf(members, results);
  if (problem) return { problem, inResults };
  const manifest = members[MANIFEST_PART];
  const named = [VERSION_FIELD, "id", "version"].filter((field) => typeof manifest?.[field] !== "string");
  if (named.length) return { problem: `the manifest names no ${named.join(", ")}, which the inventory names` };
  const device = deviceListingOf(folder, files);
  const inventory = {
    [VERSION_FIELD]: manifest[VERSION_FIELD],
    id: manifest.id,
    version: manifest.version,
    server_part: descriptorOf(canonicalBytes(view)),
    device_part: descriptorOf(canonicalBytes(device)),
  };
  return { server: view, device, inventory, digest: digestOf(canonicalBytes(inventory)) };
}
