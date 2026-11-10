// The reading of section 5, on exports written here from spec's own examples.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileSchemas, readSchema } from "../../format-check/schemas.mjs";
import { readModuleFile } from "../../format-check/yaml.mjs";
import { EXPORT_PART } from "../main.mjs";
import { LEARNER_MODEL_PROTO, OBSERVATION_PROTO, RULES, readingOf, termOf } from "../reading.mjs";

const spec = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const schemas = fs.readdirSync(path.join(spec, "export/schemas")).map((name) => readSchema(spec, name, EXPORT_PART));
const { validators } = compileSchemas(schemas);
const example = (file) => readModuleFile(fs.readFileSync(path.join(spec, "export/examples", file))).value;
const protos = Object.fromEntries([...LEARNER_MODEL_PROTO, ...OBSERVATION_PROTO].map((file) => [file, 'syntax = "proto3";\n']));
const manifest = example("manifest/valid/profile.yaml");
const profile = example("profile/valid/one-attempt.yaml");
const exportOf = (files) => ({ "manifest.json": manifest, [`api/profiles/${profile.profile_id}.json`]: profile, ...protos, ...files });

test("the rules are read in the order of the text, and each file of JSON has its schema", () => {
  assert.deepEqual(RULES, ["export.files", "export.scope", "export.profiles", "export.proto"]);
  const readme = fs.readFileSync(path.join(spec, "export/README.md"), "utf8");
  assert.deepEqual([...readme.matchAll(/^\| `(export\.[a-z-]+)` \|/gm)].map((match) => match[1]), RULES);
  assert.equal(termOf("manifest.json"), "manifest");
  assert.equal(termOf("api/account.json"), "account");
  assert.equal(termOf("api/profiles/p.json"), "profile");
  assert.equal(termOf("device/p.json"), "device");
  assert.equal(termOf("api/proto/a/b.proto"), null);
});

test("an export of one profile reads; the schema comes first, and names the file and the place", () => {
  assert.deepEqual(readingOf(validators, exportOf({})), { accepted: true });
  assert.deepEqual(readingOf(validators, exportOf({ "manifest.json": { ...manifest, scope: "family" }, "api/notes.txt": "x" })), { refused_by: "schema", names: ["manifest.json#scope"] });
  // A file refused at its root is named by its path alone.
  assert.deepEqual(readingOf(validators, exportOf({ "manifest.json": "x" })), { refused_by: "schema", names: ["manifest.json"] });
});

test("export.files wants the manifest and the files of the layout alone", () => {
  const { "manifest.json": _, ...rest } = exportOf({});
  assert.deepEqual(readingOf(validators, rest), { refused_by: "export.files", names: ["manifest.json"] });
  assert.deepEqual(readingOf(validators, exportOf({ "api/proto/../x.proto": "x", "readme.txt": "x" })), { refused_by: "export.files", names: ["api/proto/../x.proto", "readme.txt"] });
});

test("export.scope holds an account's export to its account and a profile's to one profile", () => {
  const account = example("account/valid/one-child.yaml");
  assert.deepEqual(readingOf(validators, exportOf({ "manifest.json": { ...manifest, scope: "account" } })), { refused_by: "export.scope", names: ["api/account.json"] });
  assert.deepEqual(readingOf(validators, exportOf({ "manifest.json": { ...manifest, scope: "account" }, "api/account.json": { ...account, profile_ids: [profile.profile_id] } })), { accepted: true });
  assert.deepEqual(readingOf(validators, exportOf({ "api/account.json": account })), { refused_by: "export.scope", names: ["api/account.json"] });
  const { [`api/profiles/${profile.profile_id}.json`]: _, ...none } = exportOf({});
  assert.deepEqual(readingOf(validators, none), { refused_by: "export.scope", names: ["api/profiles"] });
});

test("export.profiles names a profile's file by its ID, and a device's file by a profile of api's part", () => {
  const device = example("device/valid/unfinished-attempt.yaml");
  assert.deepEqual(readingOf(validators, exportOf({ [`device/${profile.profile_id}.json`]: device })), { accepted: true });
  assert.deepEqual(readingOf(validators, exportOf({ "device/p-9.json": { ...device, profile_id: "p-9" } })), { refused_by: "export.profiles", names: ["device/p-9.json"] });
  assert.deepEqual(readingOf(validators, exportOf({ [`device/${profile.profile_id}.json`]: { ...device, profile_id: "p-9" } })), { refused_by: "export.profiles", names: [`device/${profile.profile_id}.json`] });
  // An export of the account holds each profile it lists, and no other.
  const account = example("account/valid/one-child.yaml");
  const ofAccount = (ids) => exportOf({ "manifest.json": { ...manifest, scope: "account" }, "api/account.json": { ...account, profile_ids: ids } });
  assert.deepEqual(readingOf(validators, ofAccount([profile.profile_id])), { accepted: true });
  assert.deepEqual(readingOf(validators, ofAccount([profile.profile_id, "p-2"])), { refused_by: "export.profiles", names: ["api/account.json#profile_ids"] });
  assert.deepEqual(readingOf(validators, ofAccount(["p-2"])), { refused_by: "export.profiles", names: ["api/account.json#profile_ids"] });
});

test("export.proto wants learner-model's .proto with a profile, and the observation's with a submission", () => {
  const { [OBSERVATION_PROTO[0]]: _, ...noObservation } = exportOf({});
  assert.deepEqual(readingOf(validators, noObservation), { refused_by: "export.proto", names: OBSERVATION_PROTO });
  // A profile with no submission needs none: its answer slots and observations are the observation's.
  const plain = { ...profile, attempts: [] };
  assert.deepEqual(readingOf(validators, { ...noObservation, [`api/profiles/${profile.profile_id}.json`]: plain }), { accepted: true });
  // A profile always has its state — the row of the cache comes with the profile (R43 api) —, so
  // it always comes with learner-model's .proto.
  const stateless = { ...plain };
  delete stateless.state;
  assert.equal(validators.get("profile")(stateless), false);
  const { [LEARNER_MODEL_PROTO[0]]: __, ...noModel } = noObservation;
  assert.deepEqual(readingOf(validators, { ...noModel, [`api/profiles/${profile.profile_id}.json`]: plain }), { refused_by: "export.proto", names: [LEARNER_MODEL_PROTO[0]] });
});
