// The model of the module format's types, built of its schemas (R72): the types every schema
// names — its root and each of its $defs —, the objects without a name of their own, named by
// INLINE_NAMES, and the enumerations of a field, named after the field. A type is a struct, a
// string, an integer or another type under a name of its own; a struct has fields, each with its
// type, whether the object always holds it, and whether the open view keeps it.
//
// The model takes the shape of a value and leaves the rest to the schema: pattern, bounds, not,
// contains, and what one field says of another. A field that a branch of if/then/else declares is
// a field of the object, which holds it in some cases. The schemas of version 0.1 are read as they
// are (RUN.md, T24 and T45): a form the model does not know is an error that names its place in
// the schema, not a field left out.

import { byCodeUnits } from "../shared.mjs";

// The objects whose place gives them no name: a field's object, an array's element, a map's value.
// Each takes a term of concepts 15, by the schema and the JSON Pointer of its place. A struct at a
// place that is neither here nor a schema's root or $defs is an error.
export const INLINE_NAMES = {
  "manifest.schema.json#/properties/audience": "Audience",
  "manifest.schema.json#/properties/bands/items": "Band",
  "manifest.schema.json#/properties/languages": "Languages",
  "manifest.schema.json#/properties/canvas": "CanvasSettings",
  "manifest.schema.json#/properties/authors/items": "Author",
  "skill-graph.schema.json#/properties/skills/additionalProperties": "Skill",
  "skill-graph.schema.json#/properties/retired_skills/additionalProperties": "RetiredSkill",
  "techniques.schema.json#/properties/techniques/additionalProperties": "Technique",
  "traps.schema.json#/properties/traps/additionalProperties": "Trap",
  "random-vector.schema.json#/properties/state": "RandomState",
  "random-vector.schema.json#/$defs/draw/properties/integer": "IntegerDraw",
  "random-vector.schema.json#/$defs/draw/properties/below": "BelowDraw",
  "random-vector.schema.json#/$defs/draw/properties/between": "BetweenDraw",
  "random-vector.schema.json#/$defs/draw/properties/fraction": "FractionDraw",
  "random-vector.schema.json#/$defs/draw/properties/permutation": "PermutationDraw",
};

// What a subschema beside a $ref may say without changing the shape of the type it refers to: it
// narrows the values, or names a field the type has.
const NARROWING = new Set(["$ref", "description", "x-open", "unevaluatedProperties", "pattern", "not", "required", "if", "then", "else", "properties", "minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum"]);
// What an object may hold that the model takes no fields from: they would be left out silently.
const UNKNOWN_OBJECT_FORMS = ["$ref", "patternProperties", "dependentSchemas", "additionalProperties"];
// What gives a subschema a shape of its own: without any of them it only constrains a value whose
// shape another subschema gives.
const SHAPING = ["$ref", "type", "enum", "const", "anyOf", "oneOf", "properties", "additionalProperties", "items"];
const PRIMITIVES = new Set(["string", "integer", "number", "boolean"]);

// Builds the model of the schemas, each { name, json } with name the file's name. parts are the
// terms of the parts of a module, whose open views the model gives. Returns { types, roots, open }:
// types by name, in the order of the schemas and of their places; roots, the type of each schema
// that has one, by term; open, the open view of each struct the open view of a part reaches, by
// name. Throws a ModelError at the first form it does not know.
export function buildModel(schemas, parts) {
  const byName = new Map(schemas.map((schema) => [schema.name, schema.json]));
  const types = new Map();
  const building = new Set();
  const roots = new Map();
  const at = (schema, pointer) => `${schema}#${pointer}`;

  const nodeAt = (schema, pointer) => {
    const json = byName.get(schema);
    if (json === undefined) throw new ModelError(at(schema, pointer), "refers to a schema there is none of");
    let node = json;
    for (const key of pointerKeys(pointer)) {
      node = node?.[key];
      if (node === undefined) throw new ModelError(at(schema, pointer), "refers to a place there is none of");
    }
    return node;
  };

  // The place a $ref names, from a subschema of schema: { schema, pointer }.
  const target = (ref, schema) => {
    const [file, fragment = ""] = ref.split("#");
    return { schema: file === "" ? schema : file, pointer: fragment };
  };

  // The name of the type at a place that has one: a schema's root, one of its $defs, or a place of
  // INLINE_NAMES. undefined elsewhere.
  const nameAt = (schema, pointer) => {
    if (pointer === "") return isTyped(byName.get(schema)) ? pascalOf(schema.slice(0, -".schema.json".length)) : undefined;
    const keys = pointerKeys(pointer);
    if (keys.length === 2 && keys[0] === "$defs") return pascalOf(keys[1]);
    return INLINE_NAMES[at(schema, pointer)];
  };

  // The named type at a place, built once: its name.
  const typeAt = (schema, pointer) => {
    const name = nameAt(schema, pointer);
    if (name === undefined) throw new ModelError(at(schema, pointer), "has no name: a schema's root, one of its $defs and the places of INLINE_NAMES have one");
    const known = types.get(name);
    if (known) {
      if (known.schema !== schema || known.pointer !== pointer) throw new ModelError(at(schema, pointer), `is named ${name}, as ${at(known.schema, known.pointer)} is`);
      return name;
    }
    building.add(name);
    const node = nodeAt(schema, pointer);
    // Registered before its fields, so that a type comes before those it holds, and a type that
    // holds itself finds its name.
    const type = { name, schema, pointer, doc: docOf(node), kind: null };
    types.set(name, type);
    Object.assign(type, shapeOfNamed(node, schema, pointer));
    building.delete(name);
    return name;
  };

  // What a named place is: a struct, a string, an integer, or another type under its own name — a
  // $ref with what narrows it, or a list or a map.
  const shapeOfNamed = (node, schema, pointer) => {
    if (node.$ref !== undefined) return { kind: "named", type: refOf(node, schema, pointer, null) };
    if (isStruct(node)) return { kind: "struct", fields: fieldsOf(node, schema, pointer) };
    const values = enumOf(node);
    if (values) return { kind: "string", values };
    if (node.type === "string" || isStringChoice(node, schema)) return { kind: "string", values: null };
    if (node.type === "integer") return { kind: "integer" };
    const ref = refOf(node, schema, pointer, null);
    if (ref === null) throw new ModelError(at(schema, pointer), "has no shape the model knows");
    return { kind: "named", type: ref };
  };

  // The type of a value at a place: { named }, { primitive }, { list }, { map: { key, value } } or
  // { nullable }, or null when the subschema gives no shape. name is what an enumeration there is
  // named, or null where none may stand.
  const refOf = (node, schema, pointer, name) => {
    if (!isObject(node) || !SHAPING.some((key) => key in node)) return null;
    if (node.$ref !== undefined) {
      const { schema: file, pointer: place } = target(node.$ref, schema);
      const referred = typeAt(file, place);
      checkNarrowing(node, schema, pointer, referred);
      return { named: referred };
    }
    if (Array.isArray(node.type)) {
      const [first, second, ...rest] = node.type;
      if (rest.length === 0 && second === "null" && PRIMITIVES.has(first)) return { nullable: { primitive: first } };
      throw new ModelError(at(schema, pointer), `has the types ${node.type.join(", ")}: the model knows one, or one and null`);
    }
    // A map: its keys by propertyNames, its values by additionalProperties.
    if (node.type === "object" && isObject(node.additionalProperties) && node.properties === undefined) {
      const key = node.propertyNames === undefined ? { primitive: "string" } : refOf(node.propertyNames, schema, `${pointer}/propertyNames`, null);
      if (!isStringRef(key)) throw new ModelError(at(schema, `${pointer}/propertyNames`), "names keys by no string type");
      const value = refOf(node.additionalProperties, schema, `${pointer}/additionalProperties`, name) ?? fail(schema, `${pointer}/additionalProperties`);
      // An entry of a map is open when its subschema carries the mark (format/README.md, section 6).
      return { map: { key, value, open: node.additionalProperties["x-open"] === true } };
    }
    if (isStruct(node)) return { named: typeAt(schema, pointer) };
    if (node.type === "array") {
      const items = isObject(node.items) ? refOf(node.items, schema, `${pointer}/items`, name) : null;
      if (items === null) throw new ModelError(at(schema, pointer), "is an array of no shape the model knows");
      return { list: items };
    }
    const values = enumOf(node);
    if (values) {
      if (name === null) throw new ModelError(at(schema, pointer), "is an enumeration at a place that gives it no name");
      return { named: enumType(name, schema, pointer, node, values) };
    }
    if (PRIMITIVES.has(node.type)) return { primitive: node.type };
    if (node.const !== undefined && typeof node.const === "string") return { primitive: "string" };
    if (isStringChoice(node, schema)) return { primitive: "string" };
    throw new ModelError(at(schema, pointer), "has no shape the model knows");
  };

  const fail = (schema, pointer) => {
    throw new ModelError(at(schema, pointer), "has no shape the model knows");
  };

  // A string enumeration at a field, named after it. A struct's fields are built once, so the name
  // is taken only by another place.
  const enumType = (name, schema, pointer, node, values) => {
    const known = types.get(name);
    if (known) throw new ModelError(at(schema, pointer), `is named ${name}, as ${at(known.schema, known.pointer)} is`);
    types.set(name, { name, schema, pointer, doc: docOf(node), kind: "string", values });
    return name;
  };

  // Whether a positive anyOf or oneOf at node chooses among strings alone: then its value is a
  // string.
  const isStringChoice = (node, schema) => {
    const branches = node.anyOf ?? node.oneOf;
    return Array.isArray(branches) && branches.length > 0 && branches.every((branch) => isString(branch, schema));
  };

  // Whether the value of a subschema is a string: by its type, its enum or const, or what it
  // refers to.
  const isString = (node, schema) => {
    if (node.type === "string" || typeof node.const === "string" || enumOf(node) !== null) return true;
    if (node.$ref !== undefined) {
      const { schema: file, pointer } = target(node.$ref, schema);
      return isString(nodeAt(file, pointer), file);
    }
    return isStringChoice(node, schema);
  };

  // A subschema beside a $ref says nothing of the shape but what the type it refers to has.
  const checkNarrowing = (node, schema, pointer, referred) => {
    for (const key of Object.keys(node)) {
      if (!NARROWING.has(key)) throw new ModelError(at(schema, pointer), `has ${key} beside $ref: the model takes the shape from ${referred} alone`);
    }
    const type = types.get(referred);
    const fields = new Set(type?.kind === "struct" ? type.fields.map((field) => field.json) : []);
    const named = [node, node.then, node.else].flatMap((part) => (isObject(part?.properties) ? Object.keys(part.properties) : []));
    for (const field of named) {
      if (!fields.has(field) && !building.has(referred)) throw new ModelError(at(schema, pointer), `names the field ${field} beside $ref, which ${referred} has not`);
    }
  };

  // The fields of an object: those of its properties, of each allOf, and of each branch of
  // if/then/else, in the order they are written. A field is required when the object holds it
  // always: required at the object or in an allOf of it, not in a branch.
  const fieldsOf = (node, schema, pointer) => {
    const declarations = new Map();
    const required = new Set();
    const collect = (part, place, conditional) => {
      if (!isObject(part)) return;
      for (const key of UNKNOWN_OBJECT_FORMS) {
        if (part[key] !== undefined) throw new ModelError(at(schema, place), `has ${key} in an object: the model takes its fields from properties, allOf and the branches of if alone`);
      }
      for (const key of ["anyOf", "oneOf"]) {
        if (Array.isArray(part[key]) && part[key].some((branch) => isObject(branch?.properties))) throw new ModelError(at(schema, `${place}/${key}`), "declares fields in a branch of a choice: the model takes them from the branches of if alone");
      }
      if (isObject(part.properties)) {
        for (const [field, subschema] of Object.entries(part.properties)) {
          if (!declarations.has(field)) declarations.set(field, []);
          declarations.get(field).push({ subschema, place: `${place}/properties/${escapeKey(field)}`, conditional });
        }
      }
      if (!conditional && Array.isArray(part.required)) for (const field of part.required) required.add(field);
      if (Array.isArray(part.allOf)) part.allOf.forEach((member, index) => collect(member, `${place}/allOf/${index}`, conditional));
      collect(part.then, `${place}/then`, true);
      collect(part.else, `${place}/else`, true);
    };
    collect(node, pointer, false);
    const parent = nameAt(schema, pointer);
    const fields = [];
    for (const [field, list] of declarations) {
      // The subschemas that shape the field most (strengthOf): a branch narrows a field that another
      // subschema shapes — by a const, or by the items or the fields of its value alone.
      const strongest = Math.max(...list.map(({ subschema }) => strengthOf(subschema)));
      const defining = strongest === 0 ? [] : list.filter(({ subschema }) => strengthOf(subschema) === strongest);
      if (defining.length === 0) throw new ModelError(at(schema, list[0].place), `gives the field ${field} no shape anywhere`);
      const name = `${parent}${pascalOf(field)}`;
      const [first, ...others] = defining;
      const type = refOf(first.subschema, schema, first.place, name);
      // A branch may name the type by another name of the same type, as a $ref that narrows it:
      // the check of an answer slot written by hand is a check. Two enumerations of a field are one
      // when their values are.
      for (const other of others) {
        const values = enumOf(first.subschema);
        const same = values ? JSON.stringify(enumOf(other.subschema)) === JSON.stringify(values) && other.subschema.type === first.subschema.type : JSON.stringify(unaliased(refOf(other.subschema, schema, other.place, name))) === JSON.stringify(unaliased(type));
        if (!same) throw new ModelError(at(schema, other.place), `gives the field ${field} another shape than ${at(schema, first.place)}`);
      }
      // A field marked where its object always is is open in every value; a field marked in a branch
      // is open in a value of that branch alone. The type holds no branch, so a field marked in a
      // branch and left unmarked in another declaration is a form the model does not know.
      const marked = list.filter(({ subschema }) => subschema["x-open"] === true);
      const unmarked = list.find(({ subschema }) => subschema["x-open"] !== true);
      if (marked.length && unmarked && marked.every(({ conditional }) => conditional)) {
        throw new ModelError(at(schema, unmarked.place), `leaves the field ${field} unmarked, which ${at(schema, marked[0].place)} marks x-open in a branch alone: whether it is open would turn on the branch`);
      }
      const described = list.find(({ subschema }) => typeof subschema.description === "string");
      const defaulted = list.find(({ subschema }) => subschema.default !== undefined);
      fields.push({
        json: field,
        doc: described ? described.subschema.description : "",
        default: defaulted ? defaulted.subschema.default : undefined,
        required: required.has(field),
        open: marked.length > 0,
        type,
      });
    }
    for (const field of required) {
      if (!declarations.has(field)) throw new ModelError(at(schema, pointer), `requires the field ${field}, which it does not declare`);
    }
    return fields;
  };

  // A type with the names that only stand for another taken off: { named } of a $ref that narrows a
  // type is that type.
  const unaliased = (ref) => {
    const type = ref.named === undefined ? undefined : types.get(ref.named);
    return type?.kind === "named" && type.type?.named !== undefined ? unaliased(type.type) : ref;
  };

  for (const { name } of [...schemas].sort((a, b) => byCodeUnits(a.name, b.name))) {
    const json = byName.get(name);
    const term = name.slice(0, -".schema.json".length);
    if (isTyped(json)) roots.set(term, typeAt(name, ""));
    for (const definition of Object.keys(json.$defs ?? {})) typeAt(name, `/$defs/${escapeKey(definition)}`);
  }
  return { types, roots, open: openViewsOf(types, parts.map((part) => roots.get(part)).filter(Boolean)) };
}

// The open view of each struct that the open view of a part reaches from its root (format/README.md,
// section 6): the struct with its open fields alone, each of a type of the open view when it is a
// struct's. A field is open when a subschema of its place marks it. That is what the open view of
// every value keeps, since the model refuses a field marked in a branch alone that another of its
// subschemas leaves unmarked (fieldsOf), and an open map whose entries are closed.
export function openViewsOf(types, roots) {
  const open = new Map();
  // An open map whose entries are closed has an empty open view, which no type of a map holds.
  const checkEntries = (ref, type, field) => {
    if (ref.list) return checkEntries(ref.list, type, field);
    if (ref.nullable) return checkEntries(ref.nullable, type, field);
    if (ref.map) {
      if (!ref.map.open) throw new ModelError(`${type.schema}#${type.pointer}`, `opens the field ${field.json}, a map whose entries carry no x-open: its open view is always empty`);
      return checkEntries(ref.map.value, type, field);
    }
    const named = ref.named ? types.get(ref.named) : undefined;
    if (named?.kind === "named") checkEntries(named.type, type, field);
  };
  const visit = (name) => {
    if (open.has(name)) return;
    const type = types.get(name);
    // Another name of a struct reaches that struct.
    if (type.kind === "named") for (const named of namesIn(type.type)) visit(named);
    if (type.kind !== "struct") return;
    const view = { name, fields: [] };
    open.set(name, view);
    for (const field of type.fields) {
      if (!field.open) continue;
      checkEntries(field.type, type, field);
      view.fields.push(field);
      for (const named of namesIn(field.type)) visit(named);
    }
  };
  for (const root of roots) visit(root);
  return open;
}

// The names of the types a type refers to, through lists, maps and null.
export function namesIn(ref) {
  if (ref.named) return [ref.named];
  if (ref.list) return namesIn(ref.list);
  if (ref.nullable) return namesIn(ref.nullable);
  if (ref.map) return [...namesIn(ref.map.key), ...namesIn(ref.map.value)];
  return [];
}

// The type of a field of an open view, as the open view reads it: a struct's open view by the
// struct's name, { view }; a list or a map of structs under a name of its own written out, of their
// open views, since the named type would hold their closed fields; any other named type as it is,
// the base package's.
export function openRefOf(ref, types) {
  if (ref.named) {
    const struct = structBehind(ref.named, types);
    if (struct) return { view: struct.name };
    const named = types.get(ref.named);
    if (named.kind === "named" && namesIn(named.type).some((name) => holdsStruct(name, types))) return openRefOf(named.type, types);
    return ref;
  }
  if (ref.list) return { list: openRefOf(ref.list, types) };
  if (ref.map) return { map: { ...ref.map, key: openRefOf(ref.map.key, types), value: openRefOf(ref.map.value, types) } };
  if (ref.nullable) return { nullable: openRefOf(ref.nullable, types) };
  return ref;
}

// The struct a name stands for, through the names of a struct that narrow it, or undefined.
function structBehind(name, types) {
  const type = types.get(name);
  if (type.kind === "struct") return type;
  if (type.kind === "named" && type.type.named) return structBehind(type.type.named, types);
  return undefined;
}

// Whether a named type is a struct or holds one, through lists, maps and names of its own.
function holdsStruct(name, types) {
  const type = types.get(name);
  return type.kind === "struct" || (type.kind === "named" && namesIn(type.type).some((inner) => holdsStruct(inner, types)));
}

// The place of a type in its schema, which its comment names: the schema, and its JSON Pointer.
export function placeOf(type) {
  return type.pointer === "" ? type.schema : `${type.schema}#${type.pointer}`;
}

export class ModelError extends Error {
  constructor(place, message) {
    super(`${place} ${message}`);
    this.place = place;
  }
}

// A name in PascalCase of a snake_case or kebab-case one, with ID for id, as Go writes it:
// answer_slot → AnswerSlot, skill_id → SkillID, skill-graph → SkillGraph.
export function pascalOf(name) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => (word === "id" ? "ID" : word[0].toUpperCase() + word.slice(1)))
    .join("");
}

function isTyped(json) {
  return isObject(json) && SHAPING.some((key) => key in json);
}

function isStruct(node) {
  return isObject(node) && (isObject(node.properties) || (node.type === "object" && !isObject(node.additionalProperties)));
}

// How much a subschema says of the shape of a field: 3 by a type, a $ref or a choice of them; 2
// by an enum alone; 1 by a const alone, which narrows an enum; 0 otherwise.
function strengthOf(subschema) {
  if (!isObject(subschema)) return 0;
  if (["type", "$ref", "anyOf", "oneOf"].some((key) => key in subschema)) return 3;
  if ("enum" in subschema) return 2;
  return "const" in subschema ? 1 : 0;
}

function isStringRef(ref) {
  return ref !== null && (ref.primitive === "string" || ref.named !== undefined);
}

// The values of a string enumeration: an enum, or a oneOf of consts, each a string; otherwise null.
function enumOf(node) {
  if (Array.isArray(node.enum) && node.enum.every((value) => typeof value === "string")) return node.enum;
  if (Array.isArray(node.oneOf) && node.oneOf.length > 0 && node.oneOf.every((branch) => typeof branch.const === "string")) return node.oneOf.map((branch) => branch.const);
  return null;
}

// The description of a place, which a type's comment repeats; a schema's title is no sentence.
function docOf(node) {
  return typeof node.description === "string" ? node.description : "";
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pointerKeys(pointer) {
  if (pointer === "") return [];
  return pointer
    .slice(1)
    .split("/")
    .map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function escapeKey(key) {
  return key.replaceAll("~", "~0").replaceAll("/", "~1");
}
