// The small models the tests of the generator's output are run on, built here rather than of
// schemas: what they hold is what each output has to write.

export const struct = (name, schema, fields, extra = {}) => ({ name, schema, pointer: extra.pointer ?? "", doc: extra.doc ?? "", kind: "struct", fields });
export const fieldOf = (json, type, extra = {}) => ({ json, doc: "", default: undefined, required: false, open: false, type, ...extra });

// A model of a part, an enumeration, an ID, a map and another name of a struct.
export function smallModel() {
  const types = new Map();
  const add = (type) => types.set(type.name, type);
  add(
    struct(
      "Part",
      "part.schema.json",
      [
        fieldOf("id", { named: "PartID" }, { required: true, open: true, doc: "Its ID." }),
        fieldOf("kind", { named: "PartKind" }, { required: true, open: true }),
        fieldOf("step", { primitive: "integer" }, { default: 50, open: true }),
        fieldOf("pieces", { list: { named: "Piece" } }, { open: true }),
        fieldOf("tiers", { named: "Tiers" }),
        fieldOf("note", { nullable: { primitive: "string" } }, { required: true, open: true }),
        fieldOf("other", { named: "OtherPiece" }),
        fieldOf("shelf", { named: "Shelf" }, { open: true }),
      ],
      { doc: "A part." },
    ),
  );
  add({ name: "PartID", schema: "common.schema.json", pointer: "/$defs/part_id", doc: "", kind: "named", type: { named: "LocalID" } });
  add({ name: "LocalID", schema: "common.schema.json", pointer: "/$defs/local_id", doc: "", kind: "string", values: null });
  add({ name: "PartKind", schema: "part.schema.json", pointer: "/properties/kind", doc: "", kind: "string", values: ["handwriting_sheet", "module-index.one"] });
  add({ name: "Grade", schema: "common.schema.json", pointer: "/$defs/grade", doc: "", kind: "integer" });
  add({ name: "Tiers", schema: "part.schema.json", pointer: "/$defs/tiers", doc: "", kind: "named", type: { map: { key: { named: "PartID" }, value: { primitive: "integer" } } } });
  add(struct("Piece", "part.schema.json", [fieldOf("size", { primitive: "number" }, { required: true }), fieldOf("on", { primitive: "boolean" })], { pointer: "/$defs/piece" }));
  add({ name: "OtherPiece", schema: "part.schema.json", pointer: "/$defs/other_piece", doc: "", kind: "named", type: { named: "Piece" } });
  add({ name: "Shelf", schema: "part.schema.json", pointer: "/$defs/shelf", doc: "", kind: "named", type: { map: { key: { named: "PartID" }, value: { named: "OtherPiece" }, open: true } } });
  add(struct("Empty", "empty.schema.json", [fieldOf("hidden", { primitive: "string" })]));
  const open = new Map([
    ["Part", { name: "Part", fields: types.get("Part").fields.filter((field) => field.open) }],
    ["Piece", { name: "Piece", fields: [] }],
    ["Empty", { name: "Empty", fields: [] }],
  ]);
  return { types, roots: new Map([["part", "Part"], ["empty", "Empty"]]), open };
}
