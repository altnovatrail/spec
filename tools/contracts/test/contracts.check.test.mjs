// The run of the contracts' code under Node, on a message made up here with every kind of field: a
// scalar of each width, an enum, a message, a list, a map, a oneof and an optional field, each with
// a name of two words, whose protobuf and lowerCamelCase spellings differ.

import { test } from "node:test";
import assert from "node:assert/strict";
import { create, createFileRegistry, toJson } from "@bufbuild/protobuf";
import { FileDescriptorProtoSchema } from "@bufbuild/protobuf/wkt";
import fs from "node:fs";
import path from "node:path";
import { root } from "../../release/test/repository.mjs";
import { build } from "../buf.mjs";
import { checkMessages, checkVectors, otherNames, sample } from "../contracts.check.mjs";
import { messagesOf } from "../strokes.mjs";

// FieldDescriptorProto's types and labels by their numbers in descriptor.proto.
const TYPE = { double: 1, int64: 3, int32: 5, bool: 8, string: 9, message: 11, bytes: 12, enum: 14 };
const OPTIONAL = 1;
const REPEATED = 3;

// json_name as protoc writes it into every descriptor: the lowerCamelCase of the name.
const field = (name, number, type, extra = {}) => ({ name, jsonName: name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), number, label: OPTIONAL, type: TYPE[type], ...extra });
const file = create(FileDescriptorProtoSchema, {
  name: "novatrail/trial/v1/trial.proto",
  package: "novatrail.trial.v1",
  syntax: "proto3",
  enumType: [{ name: "Kind", value: [{ name: "KIND_UNSPECIFIED", number: 0 }, { name: "KIND_LINE", number: 1 }] }],
  messageType: [
    {
      name: "Place",
      field: [
        field("place_name", 1, "string"),
        field("long_count", 2, "int64"),
        field("small_count", 3, "int32"),
        field("is_open", 4, "bool"),
        field("raw_bytes", 5, "bytes"),
        field("place_kind", 6, "enum", { typeName: ".novatrail.trial.v1.Kind" }),
        field("crop_box", 7, "message", { typeName: ".novatrail.trial.v1.Box" }),
        field("all_boxes", 8, "message", { label: REPEATED, typeName: ".novatrail.trial.v1.Box" }),
        field("boxes_by_name", 9, "message", { label: REPEATED, typeName: ".novatrail.trial.v1.Place.BoxesByNameEntry" }),
        field("read_value", 10, "string", { oneofIndex: 0 }),
        field("read_box", 11, "message", { oneofIndex: 0, typeName: ".novatrail.trial.v1.Box" }),
        field("maybe_ratio", 12, "double", { oneofIndex: 1, proto3Optional: true }),
      ],
      oneofDecl: [{ name: "read_as" }, { name: "_maybe_ratio" }],
      nestedType: [
        {
          name: "BoxesByNameEntry",
          field: [field("key", 1, "string"), field("value", 2, "message", { typeName: ".novatrail.trial.v1.Box" })],
          options: { mapEntry: true },
        },
      ],
    },
    { name: "Box", field: [field("top_edge", 1, "int32"), field("inner_place", 2, "message", { typeName: ".novatrail.trial.v1.Place" })] },
  ],
});
const registry = createFileRegistry(file, () => undefined);
const Place = registry.getMessage("novatrail.trial.v1.Place");
const Box = registry.getMessage("novatrail.trial.v1.Box");

test("the sample has a value in every field, a member of each oneof, and messages to a depth", () => {
  const place = sample(Place);
  assert.equal(place.placeName, "a");
  assert.equal(place.longCount, 1n);
  assert.equal(place.smallCount, 1);
  assert.equal(place.isOpen, true);
  assert.deepEqual(place.rawBytes, new Uint8Array([1]));
  assert.equal(place.placeKind, 1);
  assert.equal(place.cropBox.topEdge, 1);
  assert.equal(place.allBoxes.length, 1);
  assert.deepEqual(Object.keys(place.boxesByName), ["k"]);
  assert.equal(place.readAs.case, "readValue");
  assert.equal(place.maybeRatio, 1.5);
  // Place and Box name each other: the sample stops at its depth.
  let depth = 0;
  for (let box = place.cropBox; box?.innerPlace; box = box.innerPlace.cropBox) depth += 1;
  assert.ok(depth >= 1 && depth < 4, String(depth));
  const json = toJson(Place, place, { useProtoFieldName: true });
  assert.deepEqual(Object.keys(json).sort(), ["all_boxes", "boxes_by_name", "crop_box", "is_open", "long_count", "maybe_ratio", "place_kind", "place_name", "raw_bytes", "read_value", "small_count"]);
  assert.deepEqual(otherNames(Place, json), []);
});

test("every message of the file comes back from its binary form and both spellings of its JSON", () => {
  assert.deepEqual(checkMessages([["novatrail/trial/v1/trial_pb.js", "Place", Place], ["novatrail/trial/v1/trial_pb.js", "Box", Box]]), []);
});

test("JSON that names a field otherwise than by its protobuf name is found, nested ones too", () => {
  const camel = toJson(Place, sample(Place));
  assert.deepEqual(otherNames(Place, camel).sort(), ["allBoxes", "boxesByName", "cropBox", "isOpen", "longCount", "maybeRatio", "placeKind", "placeName", "rawBytes", "readValue", "smallCount"]);
  assert.deepEqual(otherNames(Place, { crop_box: { topEdge: 1 }, all_boxes: [{ inner_place: { placeName: "a" } }], boxes_by_name: { k: { topEdge: 2 } } }), [
    "crop_box.topEdge",
    "all_boxes.inner_place.placeName",
    "boxes_by_name.topEdge",
  ]);
  for (const json of [null, [], "a"]) assert.deepEqual(otherNames(Place, json), []);
});

test("the vectors the package carries read back by its code, and one it reads otherwise fails", () => {
  const built = build(root);
  assert.deepEqual(built.errors, []);
  const schemas = Object.values(messagesOf(built.image).messages);
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "contracts/vectors/eval/v1", name), "utf8"));
  const names = ["groups.json", "crops.json", "snaps.json", "boxes.json"];
  assert.deepEqual(checkVectors(names.map((name) => [`vectors/eval/v1/${name}`, read(name)]), schemas), []);
  assert.deepEqual(checkVectors([], schemas), []);

  const camel = read("groups.json");
  camel.cases[0].groups[0] = { label: "A", strokeIds: camel.cases[0].groups[0].stroke_ids };
  const [written, ...others] = checkVectors([["vectors/eval/v1/groups.json", camel]], schemas);
  assert.deepEqual(others, []);
  assert.match(written, /^vectors\/eval\/v1\/groups\.json, case 1, groups 1: the package writes it \{"label":"A","stroke_ids":\[/);

  const unknown = read("snaps.json");
  unknown.cases[0].snaps[0].box.depth = 1;
  assert.match(checkVectors([["vectors/eval/v1/snaps.json", unknown]], schemas)[0], /^vectors\/eval\/v1\/snaps\.json, case 1, snaps 1, box: /);

  const lacking = schemas.filter((schema) => schema.typeName !== "novatrail.eval.v1.PageBox");
  assert.ok(checkVectors([["vectors/eval/v1/boxes.json", read("boxes.json")]], lacking).every((failure) => / boxes \d+: the package has no novatrail\.eval\.v1\.PageBox$/.test(failure)));
  assert.deepEqual(checkVectors([["vectors/eval/v1/none.json", { cases: [{ name: "a", description: "b" }] }]], schemas), ["the vectors the package carries hold no message of it"]);
});
