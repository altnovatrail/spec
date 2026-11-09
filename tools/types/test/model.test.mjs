// The model of the format's types, of small schemas written here: each form the schemas of 0.1
// use, and each form the model does not know, which stops it with its place.

import { test } from "node:test";
import assert from "node:assert/strict";
import { INLINE_NAMES, ModelError, buildModel, partOfId, pascalOf } from "../model.mjs";

const ID = "https://altnovatrail.github.io/spec/format/0.1/";

// A schema of name with the keywords given, beside $schema and $id.
function schema(name, json) {
  return { name, json: { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `${ID}${name}`, ...json } };
}

const common = schema("common.schema.json", {
  $defs: {
    local_id: { type: "string", pattern: "^[a-z]+$", description: "A local ID." },
    skill_id: { $ref: "#/$defs/local_id", description: "The ID of a skill." },
    text: { type: "string", description: "A text." },
    grade: { type: "integer", minimum: 1 },
    kind: { enum: ["sheet", "workbook"], description: "A kind." },
    pair: {
      type: "object",
      properties: { left: { $ref: "#/$defs/text", "x-open": true, description: "The left." }, right: { type: "integer", description: "The right." } },
      required: ["left"],
    },
  },
});

const model = (...schemas) => buildModel([common, ...schemas], ["part"]);
const type = (built, name) => built.types.get(name);
const field = (built, name, json) => type(built, name).fields.find((each) => each.json === json);

test("a struct has a field of each property, required when the object always holds it", () => {
  const built = model(
    schema("part.schema.json", {
      type: "object",
      properties: {
        id: { $ref: "common.schema.json#/$defs/skill_id", "x-open": true, description: "Its ID." },
        grades: { type: "array", items: { $ref: "common.schema.json#/$defs/grade" }, description: "Its grades." },
        step: { type: "integer", default: 50, description: "Its step." },
        note: { type: ["string", "null"], description: "A note or null." },
      },
      required: ["id", "note"],
      allOf: [{ required: ["grades"] }],
    }),
  );
  assert.equal(built.roots.get("part"), "Part");
  assert.deepEqual(
    type(built, "Part").fields.map(({ json, required, open, type: ref }) => ({ json, required, open, ref })),
    [
      { json: "id", required: true, open: true, ref: { named: "SkillID" } },
      { json: "grades", required: true, open: false, ref: { list: { named: "Grade" } } },
      { json: "step", required: false, open: false, ref: { primitive: "integer" } },
      { json: "note", required: true, open: false, ref: { nullable: { primitive: "string" } } },
    ],
  );
  assert.equal(field(built, "Part", "step").default, 50);
  assert.equal(field(built, "Part", "step").doc, "Its step.");
  // A $ref to a string is a type of its own, and an integer is too; common has no root.
  assert.deepEqual(type(built, "SkillID").type, { named: "LocalID" });
  assert.equal(type(built, "LocalID").kind, "string");
  assert.equal(type(built, "Grade").kind, "integer");
  assert.equal(built.roots.has("common"), false);
});

test("a field a branch declares is a field of the object that it holds in some cases", () => {
  const built = model(
    schema("part.schema.json", {
      type: "object",
      properties: { binding: { enum: ["zone", "anywhere"], "x-open": true, description: "Where." } },
      required: ["binding"],
      allOf: [
        {
          if: { properties: { binding: { const: "zone" } }, required: ["binding"] },
          then: { properties: { zone: { $ref: "common.schema.json#/$defs/pair", "x-open": true, description: "The zone." }, binding: { const: "zone" } }, required: ["zone"] },
          else: { properties: { reach: { type: "integer", description: "How far." } }, not: { required: ["zone"] } },
        },
      ],
    }),
  );
  const fields = type(built, "Part").fields;
  assert.deepEqual(
    fields.map(({ json, required }) => [json, required]),
    [
      ["binding", true],
      ["zone", false],
      ["reach", false],
    ],
  );
  // The enumeration of a field is named after its object and the field, and a const narrows it.
  assert.deepEqual(field(built, "Part", "binding").type, { named: "PartBinding" });
  assert.deepEqual(type(built, "PartBinding").values, ["zone", "anywhere"]);
  // The open view keeps the fields marked in any branch, and the structs they reach.
  assert.deepEqual(
    built.open.get("Part").fields.map(({ json }) => json),
    ["binding", "zone"],
  );
  assert.deepEqual(
    built.open.get("Pair").fields.map(({ json }) => json),
    ["left"],
  );
});

test("a map, a choice of strings, a oneOf of consts and an object with a name of INLINE_NAMES", () => {
  const built = buildModel(
    [
      common,
      schema("shared-taxonomy.schema.json", { type: "string", oneOf: [{ const: "core.a" }, { const: "core.b" }] }),
      schema("techniques.schema.json", {
        type: "object",
        properties: {
          techniques: {
            type: "object",
            propertyNames: { $ref: "common.schema.json#/$defs/skill_id" },
            additionalProperties: { type: "object", properties: { title: { $ref: "common.schema.json#/$defs/text", "x-open": true } }, required: ["title"], "x-open": true },
            "x-open": true,
          },
          anchors: { type: "array", items: { anyOf: [{ $ref: "common.schema.json#/$defs/skill_id" }, { $ref: "shared-taxonomy.schema.json" }] } },
          tiers: { type: "object", additionalProperties: { type: "integer" } },
        },
        required: ["techniques"],
      }),
    ],
    ["techniques"],
  );
  assert.deepEqual(field(built, "Techniques", "techniques").type, { map: { key: { named: "SkillID" }, value: { named: "Technique" }, open: true } });
  assert.deepEqual(field(built, "Techniques", "anchors").type, { list: { primitive: "string" } });
  assert.deepEqual(field(built, "Techniques", "tiers").type, { map: { key: { primitive: "string" }, value: { primitive: "integer" }, open: false } });
  assert.deepEqual(type(built, "SharedTaxonomy").values, ["core.a", "core.b"]);
  assert.deepEqual([...built.open.keys()], ["Techniques", "Technique"]);
});

test("an inline name is its part's: a schema of the same name in another part has none", () => {
  assert.equal(partOfId("https://altnovatrail.github.io/spec/legal/1/reading-vector.schema.json"), "legal");
  assert.equal(partOfId("https://altnovatrail.github.io/spec/format/0.4/task.schema.json"), "format");
  for (const id of [undefined, "https://example.org/spec/legal/1/a.schema.json", "https://altnovatrail.github.io/spec/"]) assert.equal(partOfId(id), null, String(id));
  assert.deepEqual(Object.keys(INLINE_NAMES), ["format", "legal"]);
  const vector = (prefix) => ({
    name: "reading-vector.schema.json",
    json: { $id: `${prefix}reading-vector.schema.json`, type: "object", properties: {}, $defs: { case: { type: "object", properties: { current: { type: "object", properties: { a: { type: "string" } } } } } } },
  });
  // The legal texts' vector names its object Current.
  assert.equal(buildModel([vector("https://altnovatrail.github.io/spec/legal/1/")], []).types.get("Current").pointer, "/$defs/case/properties/current");
  // The deployment configuration's, at the same place, and one with no part, have no name for it.
  for (const prefix of ["https://altnovatrail.github.io/spec/deployment/1/", "https://example.org/"]) {
    assert.throws(() => buildModel([vector(prefix)], []), (error) => error instanceof ModelError && /reading-vector\.schema\.json#\/\$defs\/case\/properties\/current has no name/.test(error.message), prefix);
  }
});

test("a $ref that narrows a type stands for it, and a name of its own for a struct is another name of it", () => {
  const built = model(
    schema("part.schema.json", {
      type: "object",
      properties: {
        pair: { $ref: "common.schema.json#/$defs/pair", properties: { right: { minimum: 1 } }, required: ["right"], "x-open": true },
        narrowed: { $ref: "#/$defs/narrow_pair" },
      },
      allOf: [{ if: { required: ["pair"] }, then: { properties: { narrowed: { $ref: "common.schema.json#/$defs/pair" } } } }],
      $defs: { narrow_pair: { $ref: "common.schema.json#/$defs/pair", properties: { left: { pattern: "^a" } } } },
    }),
  );
  assert.deepEqual(field(built, "Part", "pair").type, { named: "Pair" });
  assert.deepEqual(type(built, "NarrowPair"), { name: "NarrowPair", schema: "part.schema.json", pointer: "/$defs/narrow_pair", doc: "", kind: "named", type: { named: "Pair" } });
  // The branch names the field by the struct, the object by another name of it: one shape.
  assert.deepEqual(field(built, "Part", "narrowed").type, { named: "NarrowPair" });
  // The open view reaches the struct through its other name.
  const viaName = model(schema("part.schema.json", { type: "object", properties: { pair: { $ref: "#/$defs/named", "x-open": true } }, $defs: { named: { $ref: "common.schema.json#/$defs/pair" } } }));
  assert.ok(viaName.open.has("Pair"));
});

test("a form the model does not know stops it with its place", () => {
  const refused = (json, pattern, others = []) => {
    assert.throws(
      () => buildModel([common, ...others, schema("part.schema.json", json)], ["part"]),
      (error) => error instanceof ModelError && pattern.test(error.message),
      `${JSON.stringify(json)} against ${pattern}`,
    );
  };
  refused({ type: "object", properties: { a: { type: "object", properties: { b: { type: "string" } } } } }, /part\.schema\.json#\/properties\/a has no name/);
  refused({ type: "object", properties: { a: { type: ["string", "integer"] } } }, /#\/properties\/a has the types string, integer/);
  refused({ type: "object", properties: { a: { $ref: "common.schema.json#/$defs/pair", type: "object" } } }, /has type beside \$ref/);
  refused({ type: "object", properties: { a: { $ref: "common.schema.json#/$defs/pair", properties: { other: {} } } } }, /names the field other beside \$ref, which Pair has not/);
  refused({ type: "object", properties: { a: { type: "string" } }, allOf: [{ if: { required: ["a"] }, then: { properties: { a: { type: "integer" } } } }] }, /gives the field a another shape/);
  refused({ type: "object", properties: {}, allOf: [{ if: { required: ["a"] }, then: { properties: { a: { minLength: 1 } } } }] }, /gives the field a no shape anywhere/);
  refused({ type: "object", properties: { a: { type: "string" } }, required: ["b"] }, /requires the field b, which it does not declare/);
  refused({ type: "object", properties: { a: { $ref: "other.schema.json#/$defs/b" } } }, /other\.schema\.json#\/\$defs\/b refers to a schema there is none of/);
  refused({ type: "object", properties: { a: { $ref: "common.schema.json#/$defs/none" } } }, /refers to a place there is none of/);
  refused({ type: "object", properties: { a: { type: "array", items: { minLength: 1 } } } }, /#\/properties\/a is an array of no shape the model knows/);
  refused({ type: "object", properties: { a: { type: "object", propertyNames: { type: "integer" }, additionalProperties: { type: "string" } } } }, /propertyNames names keys by no string type/);
  refused({ type: "object", properties: { a: { type: "object", additionalProperties: { minLength: 1 } } } }, /additionalProperties has no shape the model knows/);
  refused({ type: "object", properties: { a: { anyOf: [{ type: "string" }, { type: "integer" }] } } }, /#\/properties\/a has no shape the model knows/);
  refused({ type: "object", properties: { a: { type: "array", items: { anyOf: [{ $ref: "common.schema.json#/$defs/pair" }] } } } }, /items has no shape the model knows/);
  refused({ $defs: { a: { minLength: 1 } } }, /#\/\$defs\/a has no shape the model knows/);
  // Two places of one name: a $defs of one schema and a field's enumeration of another.
  refused({ type: "object", properties: { pair: { type: "string" } }, $defs: { pair: { type: "string" } } }, /is named Pair, as common\.schema\.json#\/\$defs\/pair is/);
  refused({ type: "object", properties: { kind: { enum: ["a"] } }, $defs: { part_kind: { type: "string" } } }, /is named PartKind/);
  refused({ $defs: { a: { type: "array", items: { enum: ["x"] } } } }, /is an enumeration at a place that gives it no name/);
  // Forms of an object whose fields the model would leave out.
  // A $ref is a member of allOf, to an object, and nowhere else in an object.
  refused({ type: "object", properties: {}, allOf: [{ $ref: "common.schema.json#/$defs/text" }] }, /#\/allOf\/0 refers in allOf to no object/);
  refused({ type: "object", properties: {}, allOf: [{ if: { required: ["a"] }, then: { $ref: "common.schema.json#/$defs/pair" } }] }, /#\/allOf\/0\/then has \$ref in an object/);
  refused({ type: "object", properties: {}, patternProperties: { "^a": { type: "string" } } }, /has patternProperties in an object/);
  refused({ type: "object", properties: {}, dependentSchemas: { a: { properties: { b: { type: "string" } } } } }, /has dependentSchemas in an object/);
  refused({ type: "object", properties: { a: { type: "string" } }, additionalProperties: { type: "string" } }, /has additionalProperties in an object/);
  refused({ type: "object", properties: {}, anyOf: [{ properties: { a: { type: "string" } } }] }, /#\/anyOf declares fields in a branch of a choice/);
  // A mark in a branch alone, which another subschema of the field leaves out.
  refused({ type: "object", properties: { a: { type: "string" } }, allOf: [{ if: { required: ["b"] }, then: { properties: { a: { "x-open": true } } } }] }, /#\/properties\/a leaves the field a unmarked, which .*\/then\/properties\/a marks x-open in a branch alone/);
  // An open map whose entries carry no mark.
  refused({ type: "object", properties: { a: { type: "object", additionalProperties: { type: "string" }, "x-open": true } } }, /part\.schema\.json# opens the field a, a map whose entries carry no x-open/);
  refused({ type: "object", properties: { a: { $ref: "#/$defs/closed_map", "x-open": true } }, $defs: { closed_map: { type: "object", additionalProperties: { type: "string" } } } }, /opens the field a, a map whose entries/);
  // Two branches may give a field one enumeration, and no other.
  const branches = (second) => ({ type: "object", properties: {}, allOf: [{ if: { required: ["b"] }, then: { properties: { form: { enum: ["any", "reduced"] } } } }, { if: { required: ["c"] }, then: { properties: { form: second } } }] });
  assert.deepEqual(type(model(schema("part.schema.json", branches({ enum: ["any", "reduced"] }))), "PartForm").values, ["any", "reduced"]);
  // With a type beside it too.
  const typed = (second) => ({ type: "object", properties: { form: { type: "string", enum: ["any", "reduced"] } }, allOf: [{ if: { required: ["c"] }, then: { properties: { form: second } } }] });
  assert.deepEqual(type(model(schema("part.schema.json", typed({ type: "string", enum: ["any", "reduced"] }))), "PartForm").values, ["any", "reduced"]);
  refused(typed({ enum: ["any", "reduced"], type: "integer" }), /gives the field form another shape/);
  // A field marked where its object always is may go unmarked in a branch; one declared in a branch
  // alone may be marked there.
  const marks = model(schema("part.schema.json", { type: "object", properties: { a: { type: "string", "x-open": true } }, allOf: [{ if: { required: ["b"] }, then: { properties: { a: { minLength: 1 }, z: { type: "string", "x-open": true } } } }] }));
  assert.deepEqual(marks.open.get("Part").fields.map(({ json }) => json), ["a", "z"]);
  refused(branches({ enum: ["any"] }), /allOf\/1\/then\/properties\/form gives the field form another shape/);
});

test("a member of allOf that refers to a struct gives the object its fields, with the types they have there", () => {
  const built = model(
    schema("part.schema.json", {
      type: "object",
      properties: { draft: { $ref: "#/$defs/draft", description: "A draft." }, final: { $ref: "#/$defs/final", description: "A final." } },
      required: ["draft"],
      $defs: {
        status: {
          type: "object",
          properties: { state: { enum: ["draft", "final"], description: "The state." }, since: { type: "string", description: "The date." } },
          required: ["state"],
          if: { properties: { state: { const: "final" } } },
          then: { properties: { note: { type: "string", description: "A note." } }, required: ["since"] },
        },
        draft: { type: "object", allOf: [{ $ref: "#/$defs/status" }], properties: { words: { type: "string", description: "The words." } }, required: ["words"] },
        // From another schema too, beside a part of its own.
        final: { type: "object", allOf: [{ $ref: "#/$defs/status" }, { $ref: "common.schema.json#/$defs/pair" }] },
      },
    }),
  );
  const fields = (name) => type(built, name).fields.map(({ json, type: ref, required }) => ({ json, ref, required }));
  const status = [
    { json: "state", ref: { named: "StatusState" }, required: true },
    { json: "since", ref: { primitive: "string" }, required: false },
    { json: "note", ref: { primitive: "string" }, required: false },
  ];
  assert.deepEqual(fields("Status"), status);
  assert.deepEqual(fields("Draft"), [{ json: "words", ref: { primitive: "string" }, required: true }, ...status]);
  assert.deepEqual(fields("Final"), [...status, { json: "left", ref: { named: "Text" }, required: true }, { json: "right", ref: { primitive: "integer" }, required: false }]);
  // The enumeration of the field of status is one type, wherever its fields go.
  assert.deepEqual(type(built, "StatusState"), { name: "StatusState", schema: "part.schema.json", pointer: "/$defs/status/properties/state", doc: "The state.", kind: "string", values: ["draft", "final"] });
  assert.ok(!built.types.has("DraftState") && !built.types.has("FinalState"));
  // A field the member gives no shape is named at its place there.
  assert.throws(
    () => model(schema("part.schema.json", { type: "object", properties: {}, allOf: [{ $ref: "#/$defs/loose" }], $defs: { loose: { type: "object", properties: { a: { minLength: 1 } } } } })),
    (error) => error instanceof ModelError && /part\.schema\.json#\/\$defs\/loose\/properties\/a gives the field a no shape anywhere/.test(error.message),
  );
});

test("names are PascalCase, with ID for id", () => {
  assert.equal(pascalOf("answer_slot"), "AnswerSlot");
  assert.equal(pascalOf("skill_id"), "SkillID");
  assert.equal(pascalOf("skill-graph"), "SkillGraph");
  assert.equal(pascalOf("module-index.entries-kept"), "ModuleIndexEntriesKept");
  assert.equal(pascalOf("under_13"), "Under13");
  assert.equal(pascalOf("answer_slots"), "AnswerSlots");
  // The fields of the deployment configuration keep their names in camelCase (R85).
  assert.equal(pascalOf("appId"), "AppID");
  assert.equal(pascalOf("authDomain"), "AuthDomain");
  assert.equal(pascalOf("signIn"), "SignIn");
  // api is an initialism of Go's, as id is.
  assert.equal(pascalOf("api"), "API");
  assert.equal(pascalOf("apiKey"), "APIKey");
  assert.equal(pascalOf("deployment.api-origin"), "DeploymentAPIOrigin");
  assert.equal(pascalOf("rapid_idea"), "RapidIdea");
});

test("a const number is an integer or a number, and a field described alone holds any JSON value where the model lets it", () => {
  const part = schema("part.schema.json", {
    type: "object",
    properties: { format: { const: 1, description: "A version." }, ratio: { const: 0.5, description: "A ratio." }, file: { description: "Any JSON value." } },
    required: ["format", "file"],
  });
  // The format's and the admission table's models do not: such a field has no shape.
  assert.throws(() => model(part), (error) => error instanceof ModelError && /#\/properties\/file gives the field file no shape anywhere/.test(error.message));
  assert.throws(() => buildModel([common, part], [], { anyValue: false }), /gives the field file no shape anywhere/);
  const built = buildModel([common, part], ["part"], { anyValue: true });
  assert.deepEqual(
    type(built, "Part").fields.map(({ json, type: ref, required }) => ({ json, ref, required })),
    [
      { json: "format", ref: { primitive: "integer" }, required: true },
      { json: "ratio", ref: { primitive: "number" }, required: false },
      { json: "file", ref: { any: true }, required: true },
    ],
  );
});
