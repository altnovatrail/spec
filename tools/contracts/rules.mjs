// The rules of the API contracts that contracts-check holds beside buf's own (R83;
// contracts/README.md): buf.yaml and buf.gen.yaml as R83 has them, the files of contracts/ by
// their layout, and what buf lets pass in a file — a syntax other than proto3, a json_name, an
// unsigned type, a package without the prefix novatrail. Each rule takes text or the image buf
// builds and returns errors, { file, line, message }; nothing here runs buf.

import { LineCounter, isMap, isSeq, parseDocument } from "yaml";

// Where the rules come from, named in each message.
const TEXT = "contracts/README.md";

// buf.yaml, as R83 fixes every part of it: one module, contracts/, no deps, the lint categories
// STANDARD, COMMENTS and UNARY_RPC with no exception and no comment that switches a rule off, and
// the breaking category FILE.
export const BUF_YAML = {
  version: "v2",
  modules: [{ path: "contracts" }],
  lint: { use: ["STANDARD", "COMMENTS", "UNARY_RPC"], disallow_comment_ignores: true },
  breaking: { use: ["FILE"] },
};

// Why a part of buf.yaml that R83 does not have is refused, where a reason says more than "R83
// does not have it".
const REFUSED = {
  deps: "a dependency comes from the Buf Schema Registry, and the build depends on no service outside the repository",
  "lint.except": "every rule of the categories holds, with no exception",
  "lint.ignore": "every rule holds for every file",
  "lint.ignore_only": "every rule holds for every file",
  "breaking.except": "every rule of the category holds, with no exception",
  "breaking.ignore": "every rule holds for every file",
  "breaking.ignore_only": "every rule holds for every file",
};

// YAML read for a rule: the value, and the line of a path of keys and indexes in it — of its key
// in a map or its item in a list, or of the nearest node above it that is there, or 1 — or else
// the error reading gives.
function read(file, text) {
  const counter = new LineCounter();
  const document = parseDocument(text, { lineCounter: counter });
  if (document.errors.length) {
    const [first] = document.errors;
    return { error: { file, line: first.linePos?.[0]?.line ?? 1, message: `not YAML: ${first.message.split("\n")[0]}` } };
  }
  const lineAt = (path) => {
    let node = document.contents;
    let line = 1;
    for (const step of path) {
      if (isMap(node)) {
        const pair = node.items.find((item) => item.key?.value === step);
        if (!pair) break;
        line = counter.linePos(pair.key.range[0]).line;
        node = pair.value;
      } else if (isSeq(node) && node.items[step]) {
        node = node.items[step];
        line = counter.linePos(node.range[0]).line;
      } else break;
    }
    return line;
  };
  return { value: document.toJS(), lineAt };
}

export const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const show = (value) => JSON.stringify(value);

// buf.yaml against BUF_YAML: every key it has and lacks, and every value, where a list of
// categories is a set.
export function checkBufYaml(text) {
  const file = "buf.yaml";
  const { value, lineAt, error } = read(file, text);
  if (error) return [error];
  const errors = [];
  const walk = (actual, expected, path) => {
    const at = path.join(".");
    if (isObject(expected)) {
      if (!isObject(actual)) {
        errors.push({ file, line: lineAt(path), message: `${at || "the file"} is ${show(actual)}, and R83 has ${show(expected)} (${TEXT}, sections 3 and 7)` });
        return;
      }
      for (const name of Object.keys(actual)) {
        const named = [...path, name].join(".");
        if (!(name in expected)) {
          const why = REFUSED[named] ?? "R83 has no such setting";
          errors.push({ file, line: lineAt([...path, name]), message: `${named}: ${why} (${TEXT}, sections 3 and 7)` });
        }
      }
      for (const [name, wanted] of Object.entries(expected)) {
        if (!(name in actual)) errors.push({ file, line: lineAt(path), message: `${[...path, name].join(".")} is missing: R83 has ${show(wanted)} (${TEXT}, sections 3 and 7)` });
        else walk(actual[name], wanted, [...path, name]);
      }
      return;
    }
    const same = Array.isArray(expected)
      ? Array.isArray(actual) && actual.length === expected.length && expected.every((item) => actual.some((other) => show(other) === show(item)))
      : actual === expected;
    if (!same) errors.push({ file, line: lineAt(path), message: `${at} is ${show(actual)}, and R83 has ${show(expected)} (${TEXT}, sections 3 and 7)` });
  };
  walk(value, BUF_YAML, []);
  return errors;
}

// buf.gen.yaml: buf generates from the workspace of buf.yaml alone, with local plugins only, into
// contracts/, and never cleans a folder (R83; the text, section 8). Which plugins and which of
// their options is the file's: the generated code is held to what it gives.
export function checkBufGenYaml(text) {
  const file = "buf.gen.yaml";
  const { value, lineAt, error } = read(file, text);
  if (error) return [error];
  const errors = [];
  const refuse = (path, message) => errors.push({ file, line: lineAt(path), message: `${message} (${TEXT}, section 8)` });
  if (!isObject(value)) return [{ file, line: 1, message: `the file is ${show(value)}, not a template of buf generate (${TEXT}, section 8)` }];
  if (value.version !== "v2") refuse(["version"], `version is ${show(value.version)}, and the template is of version v2`);
  for (const key of Object.keys(value)) {
    if (key === "inputs") refuse([key], "inputs: buf generates from the workspace of buf.yaml alone, and no input comes from outside the repository");
    else if (!["version", "managed", "plugins"].includes(key)) refuse([key], `${key}: the template has version, managed and plugins alone`);
  }
  if (!Array.isArray(value.plugins) || value.plugins.length === 0) {
    refuse(["plugins"], "plugins: the template names its local plugins");
    return errors;
  }
  value.plugins.forEach((plugin, i) => {
    const at = ["plugins", i];
    if (!isObject(plugin)) {
      refuse(at, `a plugin is ${show(plugin)}, not a local plugin with its out and opt`);
      return;
    }
    for (const key of Object.keys(plugin)) {
      if (key === "remote") refuse([...at, key], `remote: ${show(plugin.remote)} is a plugin of the Buf Schema Registry, and every plugin is local, at an exact version`);
      else if (key === "protoc_builtin") refuse([...at, key], `protoc_builtin: ${show(plugin.protoc_builtin)} needs protoc, and every plugin is local, at an exact version`);
      else if (key === "clean") refuse([...at, key], "clean: buf generate cleans no folder, since contracts/ holds the .proto files too; just contracts puts the code in place");
      else if (!["local", "out", "opt"].includes(key)) refuse([...at, key], `${key}: a plugin has local, out and opt alone`);
    }
    const local = plugin.local;
    const program = typeof local === "string" || (Array.isArray(local) && local.length > 0 && local.every((part) => typeof part === "string"));
    if (!("remote" in plugin) && !("protoc_builtin" in plugin) && !program) refuse([...at, "local"], `local is ${show(local)}: a plugin is a local program, a name or a list of a program and its arguments`);
    if (plugin.out !== "contracts") refuse([...at, "out"], `out is ${show(plugin.out)}: the code lies beside the .proto files it comes from, in contracts/`);
  });
  return errors;
}

// The layout of contracts/ (the text, section 3): its text, the module of the generated Go code
// with the package that embeds the test vectors, vectors.go and its test, the contracts,
// contracts/novatrail/<part>/vN/<name>.proto, the code buf generates from each — <name>.pb.go,
// <part>vNconnect/<name>.connect.go, <name>_pb.js and <name>_pb.d.ts beside it —, and the test
// vectors of a package, contracts/vectors/<part>/vN/<case>.json (the text, section 10).
const NAME = "[a-z][a-z0-9_]*";
const FOLDER = `contracts/novatrail/(${NAME})/v([1-9][0-9]*)`;
const PROTO = new RegExp(`^${FOLDER}/(${NAME})\\.proto$`);
const GENERATED = [
  new RegExp(`^${FOLDER}/(${NAME})\\.pb\\.go$`),
  new RegExp(`^${FOLDER}/(${NAME})_pb\\.js$`),
  new RegExp(`^${FOLDER}/(${NAME})_pb\\.d\\.ts$`),
];
const CONNECT = new RegExp(`^${FOLDER}/(${NAME})v([1-9][0-9]*)connect/(${NAME})\\.connect\\.go$`);
const VECTOR = new RegExp(`^contracts/vectors/(${NAME})/v([1-9][0-9]*)/[a-z0-9]+(?:-[a-z0-9]+)*\\.json$`);
const FIXED = new Set(["contracts/README.md", "contracts/go.mod", "contracts/go.sum", "contracts/vectors.go", "contracts/vectors_test.go"]);

export const UNKNOWN = "contracts-check does not know it: the task that brings it to contracts/ extends the check";

// What a file of contracts/ is: { kind: "text" }, { kind: "proto", package }, { kind:
// "generated", source } with the .proto file it comes from, { kind: "vector", package } with the
// package it is a vector of, or null for a file the layout does not have.
export function classify(file) {
  if (FIXED.has(file)) return { kind: "text" };
  const proto = PROTO.exec(file);
  if (proto) return { kind: "proto", package: `novatrail.${proto[1]}.v${proto[2]}` };
  const vector = VECTOR.exec(file);
  if (vector) return { kind: "vector", package: `novatrail.${vector[1]}.v${vector[2]}` };
  for (const pattern of GENERATED) {
    const match = pattern.exec(file);
    if (match) return { kind: "generated", source: `contracts/novatrail/${match[1]}/v${match[2]}/${match[3]}.proto` };
  }
  const connect = CONNECT.exec(file);
  if (connect && connect[3] === connect[1] && connect[4] === connect[2]) {
    return { kind: "generated", source: `contracts/novatrail/${connect[1]}/v${connect[2]}/${connect[5]}.proto` };
  }
  return null;
}

// The error of a file of contracts/ the layout does not have.
export function unknownFile(file) {
  const message = file.endsWith(".proto")
    ? `a contract is contracts/novatrail/<part>/vN/<name>.proto, its part and name in lower snake case and N from 1 (${TEXT}, sections 2 and 3)`
    : file.startsWith("contracts/vectors/")
      ? `a test vector is contracts/vectors/<part>/vN/<case>.json, its part in lower snake case, N from 1 and its case in kebab case (${TEXT}, sections 3 and 10)`
      : UNKNOWN;
  return { file, line: 0, message };
}

// What buf lets pass in a file, by the image buf builds of contracts/, with its source info: the
// syntax (the text, section 4), the prefix of the package (section 3), and of every field, at any
// depth, a json_name set in the file (section 6) or an unsigned type (section 5) — a scalar, a
// wrapper of one, or the key of a map, which the image holds as the field key of the map's entry,
// a nested message of its own with no place in the file but its map field's.
const UNSIGNED = new Set(["TYPE_UINT32", "TYPE_UINT64", "TYPE_FIXED32", "TYPE_FIXED64"]);
const UNSIGNED_WRAPPERS = new Set([".google.protobuf.UInt32Value", ".google.protobuf.UInt64Value"]);
// The field numbers of descriptor.proto that the paths of the source info go through.
const MESSAGE_TYPE = 4;
const NESTED_TYPE = 3;
const FIELD = 2;
const MESSAGE_EXTENSION = 6;
const FILE_EXTENSION = 7;
const FIELD_TYPE = 5;
const JSON_NAME = 10;
const PACKAGE = 2;
const SYNTAX = 12;

export function checkImage(image) {
  const errors = [];
  for (const file of image.file ?? []) {
    const name = `contracts/${file.name}`;
    const lines = new Map((file.sourceCodeInfo?.location ?? []).map((location) => [location.path?.join(",") ?? "", location.span[0] + 1]));
    const lineAt = (path, otherwise = 1) => lines.get(path.join(",")) ?? otherwise;
    if (file.syntax !== "proto3") {
      const syntax = file.syntax === "editions" ? `edition ${file.edition}` : `syntax ${file.syntax ?? "proto2"}`;
      errors.push({ file: name, line: lineAt([SYNTAX]), message: `the file is of ${syntax}, and a contract is proto3 (${TEXT}, section 4)` });
    }
    if (!(file.package ?? "").startsWith("novatrail.")) {
      errors.push({ file: name, line: lineAt([PACKAGE]), message: `the package ${show(file.package ?? "")} lacks the prefix novatrail. (${TEXT}, section 3)` });
    }
    // A map's entry has no place in the file: its fields are found at the line of the map field,
    // and named by it.
    const fields = (list, at, entry) => {
      (list ?? []).forEach((field, k) => {
        const path = [...at, k];
        const called = entry ? `${field.name} of the map ${entry.name}` : field.name;
        const unsigned = UNSIGNED.has(field.type) ? field.type.slice(5).toLowerCase() : UNSIGNED_WRAPPERS.has(field.typeName) ? field.typeName.slice(1) : null;
        if (unsigned) {
          errors.push({ file: name, line: lineAt([...path, FIELD_TYPE], entry?.line ?? lineAt(path)), message: `the field ${called} is of the unsigned ${unsigned}, and no contract uses an unsigned type (${TEXT}, section 5)` });
        }
        if (lines.has([...path, JSON_NAME].join(","))) {
          errors.push({ file: name, line: lineAt([...path, JSON_NAME]), message: `the field ${field.name} sets json_name, and a field's name in JSON is its protobuf name (${TEXT}, section 6)` });
        }
      });
    };
    const messages = (list, at, entries = new Map()) => {
      (list ?? []).forEach((message, i) => {
        const path = [...at, i];
        fields(message.field, [...path, FIELD], entries.get(message.name));
        fields(message.extension, [...path, MESSAGE_EXTENSION]);
        // The map fields of this message, by the name of their entry: .<package>.<Message>.<Entry>.
        const maps = new Map();
        (message.field ?? []).forEach((field, k) => {
          const entry = (message.nestedType ?? []).find((nested) => nested.options?.mapEntry && field.typeName?.endsWith(`.${nested.name}`));
          if (entry) maps.set(entry.name, { name: field.name, line: lineAt([...path, FIELD, k]) });
        });
        messages(message.nestedType, [...path, NESTED_TYPE], maps);
      });
    };
    messages(file.messageType, [MESSAGE_TYPE]);
    fields(file.extension, [FILE_EXTENSION]);
  }
  return errors;
}
