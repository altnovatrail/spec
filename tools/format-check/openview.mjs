// The open view of a part of a module (format/README.md, section 6; R45, R51): the part without its
// closed fields, built from the marks x-open in the schemas. A mark counts only where its subschema
// applies and passes, as an annotation of JSON Schema 2020-12 is collected only from subschemas that
// pass: the walk follows $ref beside its sibling keywords, every branch of allOf, the branches of
// anyOf and oneOf that pass, then or else by if, and dependentSchemas whose key is present. A field
// is open when a subschema that applies to it — under properties, a matching patternProperties, or
// else additionalProperties — carries the mark; an element of an open array is open; and the root of
// a part is open. format-check builds the open view of each vector in vectors/open-view/ and compares
// it with the one the vector gives, as module-kit does (R45).

import { fragmentOf } from "./schemas.mjs";
import { byCodeUnits } from "../shared.mjs";

// The open view of value, a part valid against the schema of schemaName. ctx holds byName, the
// schemas read, and schemaAt(uri), the validator of the subschema a URI names. Throws an Error that
// says why when a subschema cannot be validated.
export function openViewOf(value, schemaName, ctx) {
  const schema = ctx.byName.get(schemaName);
  return view(value, applicable({ node: schema.json, schema, at: [] }, value, ctx), ctx);
}

// The open view of value, given the subschemas that apply to its place and pass.
function view(value, refs, ctx) {
  if (Array.isArray(value)) return value.map((element, index) => view(element, elementRefs(refs, index, element, ctx), ctx));
  if (!isObject(value)) return value;
  const open = {};
  for (const [key, field] of Object.entries(value)) {
    const subs = fieldRefs(refs, key);
    if (!subs.some((ref) => isObject(ref.node) && ref.node["x-open"] === true)) continue;
    open[key] = view(field, subs.flatMap((ref) => applicable(ref, field, ctx)), ctx);
  }
  return open;
}

// The subschemas of a field that the subschemas of its object give: properties, every matching
// patternProperties, and additionalProperties where neither of them matched in the same subschema.
function fieldRefs(refs, key) {
  const subs = [];
  for (const ref of refs) {
    const { node } = ref;
    let matched = false;
    if (isObject(node.properties) && Object.hasOwn(node.properties, key)) {
      subs.push(child(ref, ["properties", key]));
      matched = true;
    }
    if (isObject(node.patternProperties)) {
      for (const pattern of Object.keys(node.patternProperties)) {
        if (new RegExp(pattern, "u").test(key)) {
          subs.push(child(ref, ["patternProperties", pattern]));
          matched = true;
        }
      }
    }
    if (!matched && isObject(node.additionalProperties)) subs.push(child(ref, ["additionalProperties"]));
  }
  return subs;
}

// The subschemas that apply to the element at index of an array, and pass: prefixItems at the index,
// or else items.
function elementRefs(refs, index, element, ctx) {
  const subs = [];
  for (const ref of refs) {
    const { node } = ref;
    if (Array.isArray(node.prefixItems) && index < node.prefixItems.length) subs.push(child(ref, ["prefixItems", index]));
    else if (isObject(node.items)) subs.push(child(ref, ["items"]));
  }
  return subs.flatMap((ref) => applicable(ref, element, ctx));
}

// A subschema and every subschema it brings to the same place that applies to value and passes.
function applicable(start, value, ctx) {
  const found = [];
  const visit = (ref) => {
    const { node } = ref;
    if (!isObject(node)) return;
    found.push(ref);
    if (typeof node.$ref === "string") visit(resolve(node.$ref, ref.schema, ctx));
    if (Array.isArray(node.allOf)) for (const index of node.allOf.keys()) visit(child(ref, ["allOf", index]));
    for (const keyword of ["anyOf", "oneOf"]) {
      if (!Array.isArray(node[keyword])) continue;
      for (const index of node[keyword].keys()) {
        const branch = child(ref, [keyword, index]);
        if (passes(branch, value, ctx)) visit(branch);
      }
    }
    if (isObject(node.if) && (isObject(node.then) || isObject(node.else))) {
      const branch = passes(child(ref, ["if"]), value, ctx) ? "then" : "else";
      if (isObject(node[branch])) visit(child(ref, [branch]));
    }
    if (isObject(node.dependentSchemas) && isObject(value)) {
      for (const key of Object.keys(node.dependentSchemas)) if (Object.hasOwn(value, key)) visit(child(ref, ["dependentSchemas", key]));
    }
  };
  visit(start);
  return found;
}

function child(ref, keys) {
  let node = ref.node;
  for (const key of keys) node = node?.[key];
  return { node, schema: ref.schema, at: [...ref.at, ...keys] };
}

// The subschema a reference names: #/$defs/<name>, <file>.schema.json or <file>.schema.json#/$defs/<name>,
// the forms the conventions allow, with a name in snake_case, so that no name needs unescaping.
function resolve(reference, schema, ctx) {
  const hash = reference.indexOf("#");
  const name = hash === -1 ? reference : reference.slice(0, hash);
  const target = name === "" ? schema : ctx.byName.get(name);
  if (!target) throw new Error(`the reference ${reference} names no schema`);
  const at = hash === -1 ? [] : reference.slice(hash + 1).split("/").slice(1);
  return child({ node: target.json, schema: target, at: [] }, at);
}

function passes(ref, value, ctx) {
  const uri = `${ref.schema.json.$id}${fragmentOf(ref.at)}`;
  const validate = ctx.schemaAt(uri);
  if (!validate) throw new Error(`the subschema ${uri} cannot be validated`);
  return validate(value);
}

// Where two JSON values differ, as a path of keys and indexes, or null when they are the same; the
// order of an object's keys does not count.
export function differenceOf(a, b, at = []) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return at;
    if (a.length !== b.length) return at;
    for (const [index, item] of a.entries()) {
      const found = differenceOf(item, b[index], [...at, index]);
      if (found) return found;
    }
    return null;
  }
  if (isObject(a) || isObject(b)) {
    if (!isObject(a) || !isObject(b)) return at;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of [...keys].sort(byCodeUnits)) {
      if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) return [...at, key];
      const found = differenceOf(a[key], b[key], [...at, key]);
      if (found) return found;
    }
    return null;
  }
  return Object.is(a, b) ? null : at;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
