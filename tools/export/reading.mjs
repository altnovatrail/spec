// The reading of an export, section 5 of export/README.md: each file of JSON by its schema first,
// then the rules in the order of the text's table. A second implementation, beside app's and any
// reader's, which computes what each vector of reading gives.
//
// An export is read unpacked: its files by their paths, the outer ZIP's at the root and the files
// of api.zip under api/, as section 3 lays them out. A file of JSON is its value as JSON reads it,
// and a .proto file its text.

import { byCodeUnits } from "../shared.mjs";
import { namesOf } from "../parts.mjs";

export const SCHEMA = "schema";
export const FILES = "export.files";
export const SCOPE = "export.scope";
export const PROFILES = "export.profiles";
export const PROTO = "export.proto";
export const RULES = [FILES, SCOPE, PROFILES, PROTO];

export const MANIFEST = "manifest.json";
export const ACCOUNT = "api/account.json";
const PROFILE = /^api\/profiles\/([^/]+)\.json$/;
const DEVICE = /^device\/([^/]+)\.json$/;
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
