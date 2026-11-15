// The reading of an export, section 5 of export/README.md: each file of JSON by its schema first,
// then the rules in the order of the text's table. A second implementation, beside app's and any
// reader's, which computes what each vector of reading gives.
//
// An export is read unpacked: its files by their paths, the outer ZIP's at the root — the stored
// works among them, under works/ — and the files of api.zip under api/, as section 3 lays them out.
// A file of JSON is its value as JSON reads it, and a .proto file its text.

import { byCodeUnits } from "../shared.mjs";
import { namesOf } from "../parts.mjs";

export const SCHEMA = "schema";
export const FILES = "export.files";
export const SCOPE = "export.scope";
export const PROFILES = "export.profiles";
export const WORKS = "export.works";
export const PROTO = "export.proto";
export const RULES = [FILES, SCOPE, PROFILES, WORKS, PROTO];

export const MANIFEST = "manifest.json";
export const ACCOUNT = "api/account.json";
const PROFILE = /^api\/profiles\/([^/]+)\.json$/;
const DEVICE = /^device\/([^/]+)\.json$/;
const WORK = /^works\/([^/]+)\/([^/]+)\.json$/;
const PROTO_FILE = /^api\/proto\/(?:[a-z0-9_]+\/)+[a-z0-9_]+\.proto$/;
// The schemas of .proto that a profile's records are written by (section 1): the messages of
// learner-model for the log and the state, and the observation of the contracts.
export const LEARNER_MODEL_PROTO = ["api/proto/novatrail/learnermodel/v1/common.proto", "api/proto/novatrail/learnermodel/v1/evidence.proto", "api/proto/novatrail/learnermodel/v1/state.proto"];
export const OBSERVATION_PROTO = ["api/proto/novatrail/observation/v1/observation.proto"];

// The term of the schema a file of the export is read by, or null when the layout names no file of
// JSON there.
export function termOf(file) {
  if (file === MANIFEST) return "manifest";
  if (file === ACCOUNT) return "account";
  if (PROFILE.test(file)) return "profile";
  if (DEVICE.test(file)) return "device";
  if (WORK.test(file)) return "work";
  return null;
}

// What a reader gives an export, files by their paths, with validators the compiled schemas by
// term: { accepted: true } when it accepts it, or { refused_by, names } with the names in the order
// of code units. A file of JSON the schema refuses is named by its path and the path in it, joined
// by "#", such as api/profiles/p1.json#age_category, or by its path alone when its root is refused.
export function readingOf(validators, files) {
  const refused = [];
  for (const [file, value] of Object.entries(files).sort(([a], [b]) => byCodeUnits(a, b))) {
    const term = termOf(file);
    if (term === null) continue;
    const validate = validators.get(term);
    if (!validate(value)) for (const name of namesOf(validate.errors)) refused.push(name ? `${file}#${name}` : file);
  }
  if (refused.length) return { refused_by: SCHEMA, names: [...new Set(refused)].sort(byCodeUnits) };
  for (const [rule, breaches] of [
    [FILES, () => fileBreaches(files)],
    [SCOPE, () => scopeBreaches(files)],
    [PROFILES, () => profileBreaches(files)],
    [WORKS, () => workBreaches(files)],
    [PROTO, () => protoBreaches(files)],
  ]) {
    const names = breaches();
    if (names.length) return { refused_by: rule, names: [...new Set(names)].sort(byCodeUnits) };
  }
  return { accepted: true };
}

// export.files: the manifest is there, and every file is one the layout names.
function fileBreaches(files) {
  const names = Object.keys(files).filter((file) => termOf(file) === null && !PROTO_FILE.test(file));
  if (!Object.hasOwn(files, MANIFEST)) names.push(MANIFEST);
  return names;
}

// export.scope: an export of the account holds the account and its profiles, and one of a profile
// that profile alone, with no account.
function scopeBreaches(files) {
  const { scope } = files[MANIFEST];
  const profiles = Object.keys(files).filter((file) => PROFILE.test(file));
  const account = Object.hasOwn(files, ACCOUNT);
  if (scope === "account") return account ? [] : [ACCOUNT];
  const names = account ? [ACCOUNT] : [];
  if (profiles.length !== 1) names.push("api/profiles");
  return names;
}

// export.profiles: each profile's file is named by its profile's ID, an account's export holds the
// file of each profile the account lists and of no other, and each file of the device is a profile's
// that the part of api holds.
function profileBreaches(files) {
  const names = [];
  const ids = new Set();
  for (const [file, value] of Object.entries(files)) {
    const match = PROFILE.exec(file);
    if (!match) continue;
    ids.add(match[1]);
    if (value.profile_id !== match[1]) names.push(`${file}#profile_id`);
  }
  if (Object.hasOwn(files, ACCOUNT)) {
    const listed = new Set(files[ACCOUNT].profile_ids);
    if (listed.size !== ids.size || [...ids].some((id) => !listed.has(id))) names.push(`${ACCOUNT}#profile_ids`);
  }
  for (const file of Object.keys(files)) {
    const match = DEVICE.exec(file);
    if (match && (!ids.has(match[1]) || files[file].profile_id !== match[1])) names.push(file);
  }
  return names;
}

// export.works: a profile's file names each stored work once, each work it names has its file,
// works/<profile>/<attempt>.json, and each such file is of a work a profile's file names, of the
// profile and the attempt its path names, with the kind and the time the profile names. Run after
// export.profiles, so that a profile's file is of the profile it is named by.
function workBreaches(files) {
  const names = [];
  const named = new Map();
  for (const [file, value] of Object.entries(files)) {
    const match = PROFILE.exec(file);
    if (!match) continue;
    value.works.forEach((work, index) => {
      const path = `works/${match[1]}/${work.attempt_id}.json`;
      // One stored work for each attempt: a second naming of it is named by its place.
      if (named.has(path)) names.push(`${file}#works.${index}`);
      else named.set(path, work);
    });
  }
  for (const file of named.keys()) if (!Object.hasOwn(files, file)) names.push(file);
  for (const [file, value] of Object.entries(files)) {
    const match = WORK.exec(file);
    if (!match) continue;
    if (value.profile_id !== match[1]) names.push(`${file}#profile_id`);
    if (value.attempt_id !== match[2]) names.push(`${file}#attempt_id`);
    const work = named.get(file);
    if (!work) {
      names.push(file);
      continue;
    }
    if (value.kind !== work.kind) names.push(`${file}#kind`);
    if (instantOf(value.stored_at) !== instantOf(work.stored_at)) names.push(`${file}#stored_at`);
  }
  return names;
}

// A time of the export, RFC 3339 in UTC, as one string for each instant, whatever digits of the
// fraction of a second write it: "2026-11-10T10:45:00Z" and "2026-11-10T10:45:00.000Z" are one.
export function instantOf(time) {
  const [seconds, fraction = ""] = time.slice(0, -1).split(".");
  return `${seconds}.${fraction.padEnd(9, "0")}Z`;
}

// export.proto: a profile comes with the .proto files its records of protobuf are written by, in
// api/proto/: learner-model's always, as a profile always has its state, and the observation's when
// it has a submission, whose answer slots and observation are messages of it.
function protoBreaches(files) {
  const needed = new Set();
  for (const [file, value] of Object.entries(files)) {
    if (!PROFILE.test(file)) continue;
    for (const proto of LEARNER_MODEL_PROTO) needed.add(proto);
    if (value.attempts.some((attempt) => attempt.submissions.length)) for (const proto of OBSERVATION_PROTO) needed.add(proto);
  }
  return [...needed].filter((proto) => !Object.hasOwn(files, proto));
}
