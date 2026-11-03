// The run of the contracts' code under Node (tools/contracts/typescript.mjs): copied into the
// project beside the package, as check.mjs, and called by its runtime.mjs with every message of
// every file of code, and with every vector the package carries. For each, a message with no field set and one with a value in every field — a
// member of each oneof, an element of each list and map, a message in each field of a message, to
// a depth — must come back the same from its binary form and from both spellings of its JSON, and
// its JSON written with useProtoFieldName must name each field, nested ones too, by its protobuf
// name (contracts/README.md, section 6).

import { isDeepStrictEqual } from "node:util";
import { ScalarType, create, equals, fromBinary, fromJson, toBinary, toJson } from "@bufbuild/protobuf";

const DEPTH = 4;
const SCALARS = {
  [ScalarType.DOUBLE]: 1.5,
  [ScalarType.FLOAT]: 1.5,
  [ScalarType.INT32]: 1,
  [ScalarType.UINT32]: 1,
  [ScalarType.SINT32]: 1,
  [ScalarType.FIXED32]: 1,
  [ScalarType.SFIXED32]: 1,
  [ScalarType.INT64]: 1n,
  [ScalarType.UINT64]: 1n,
  [ScalarType.SINT64]: 1n,
  [ScalarType.FIXED64]: 1n,
  [ScalarType.SFIXED64]: 1n,
  [ScalarType.BOOL]: true,
  [ScalarType.STRING]: "a",
  [ScalarType.BYTES]: new Uint8Array([1]),
};
// The key of a map's one entry, by the scalar type of its keys.
const KEYS = { [ScalarType.STRING]: "k", [ScalarType.BOOL]: "true" };

// A value of a field of the kind given: a scalar, an enum's first value but zero, or a message of
// its own, down to DEPTH.
function valueOf(kind, field, depth) {
  if (kind === "scalar") return SCALARS[field.scalar];
  if (kind === "enum") return field.enum.values.find((value) => value.number !== 0)?.number ?? 0;
  return depth < DEPTH ? sample(field.message, depth + 1) : undefined;
}

// A message of the schema with a value in every field, and in the first member of each oneof.
export function sample(schema, depth = 0) {
  const init = {};
  for (const field of schema.fields) {
    let value;
    if (field.fieldKind === "list") {
      value = [valueOf(field.listKind, field, depth)].filter((item) => item !== undefined);
    } else if (field.fieldKind === "map") {
      const item = valueOf(field.mapKind, field, depth);
      value = item === undefined ? {} : { [KEYS[field.mapKey] ?? "1"]: item };
    } else {
      value = valueOf(field.fieldKind, field, depth);
    }
    if (value === undefined) continue;
    if (!field.oneof) init[field.localName] = value;
    else if (!(field.oneof.localName in init)) init[field.oneof.localName] = { case: field.localName, value };
  }
  return create(schema, init);
}

// What in JSON of a message of the schema is no protobuf name of its field: "at: name" for each,
// nested messages too.
export function otherNames(schema, json, at = "") {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return [];
  const found = [];
  for (const [key, value] of Object.entries(json)) {
    const field = schema.fields.find((each) => each.name === key);
    if (!field) {
      found.push(`${at}${key}`);
      continue;
    }
    const kind = { list: field.listKind, map: field.mapKind }[field.fieldKind] ?? field.fieldKind;
    if (kind !== "message") continue;
    const items = { list: value, map: Object.values(value ?? {}) }[field.fieldKind] ?? [value];
    for (const item of items) found.push(...otherNames(field.message, item, `${at}${key}.`));
  }
  return found;
}

// The failures of the cases, [file, type, schema] each: what does not come back, or is named
// otherwise.
export function checkMessages(cases) {
  const failures = [];
  for (const [file, type, schema] of cases) {
    const fail = (what) => failures.push(`${file}: ${type}: ${what}`);
    for (const message of [create(schema), sample(schema)]) {
      if (!equals(schema, message, fromBinary(schema, toBinary(schema, message)))) fail("its binary form does not read back to it");
      const proto = toJson(schema, message, { useProtoFieldName: true, alwaysEmitImplicit: true });
      for (const name of otherNames(schema, proto)) fail(`JSON with useProtoFieldName names a field ${name}, no protobuf name of it`);
      if (!equals(schema, message, fromJson(schema, proto))) fail("its JSON with protobuf names does not read back to it");
      const camel = toJson(schema, message, { alwaysEmitImplicit: true });
      if (!equals(schema, message, fromJson(schema, camel))) fail("its JSON with lowerCamelCase names does not read back to it");
    }
  }
  return failures;
}

// The messages a case of a vector of the rules the device and the runner share holds (contracts/
// README.md, section 12): by its key, a message or a list of them, and by its key and a key within
// each member of a list, the message there or null.
const VECTOR_MESSAGES = {
  history: "novatrail.eval.v1.History",
  strokes: "novatrail.eval.v1.FinalStroke",
  groups: "novatrail.eval.v1.Group",
  group_boxes: "novatrail.eval.v1.TenthsBox",
  crops: "novatrail.eval.v1.CropSet",
  boxes: "novatrail.eval.v1.PageBox",
  filled_boxes: "novatrail.eval.v1.FilledBox",
};
const VECTOR_MEMBERS = {
  snaps: { box: "novatrail.observation.v1.CropBox", snapped: "novatrail.eval.v1.TenthsBox" },
  verdicts: { answer_slot: "novatrail.observation.v1.AnswerSlotPlace" },
};

// The failures of the vectors the package carries, [file, vector] each, read with the schemas of its
// code: each message of each case, as the package's code reads it strictly and writes it back with
// the protobuf names and every field, must be what the vector holds, so that a consumer on
// TypeScript reads them as Go does.
export function checkVectors(vectors, schemas) {
  const byName = new Map(schemas.map((schema) => [schema.typeName, schema]));
  const failures = [];
  let read = 0;
  for (const [file, vector] of vectors) {
    for (const [k, one] of (vector.cases ?? []).entries()) {
      for (const [key, value] of Object.entries(one)) {
        const members = Array.isArray(value) ? value : [value];
        const each = (json, name, what) => {
          if (json === null || json === undefined) return;
          const schema = byName.get(name);
          const where = `${file}, case ${k + 1}, ${what}`;
          if (!schema) return failures.push(`${where}: the package has no ${name}`);
          try {
            const back = toJson(schema, fromJson(schema, json), { useProtoFieldName: true, alwaysEmitImplicit: true });
            if (!isDeepStrictEqual(back, json)) failures.push(`${where}: the package writes it ${JSON.stringify(back)}`);
            read += 1;
          } catch (error) {
            failures.push(`${where}: ${error.message}`);
          }
        };
        if (VECTOR_MESSAGES[key]) members.forEach((member, n) => each(member, VECTOR_MESSAGES[key], `${key} ${n + 1}`));
        for (const [field, name] of Object.entries(VECTOR_MEMBERS[key] ?? {})) members.forEach((member, n) => each(member?.[field], name, `${key} ${n + 1}, ${field}`));
      }
    }
  }
  if (vectors.length && read === 0) failures.push("the vectors the package carries hold no message of it");
  return failures;
}
