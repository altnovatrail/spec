// The rules contracts-check holds beside buf's own, on texts and images written in the tests, and
// on spec's own buf.yaml and buf.gen.yaml.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBufGenYaml, checkBufYaml, checkImage, classify, unknownFile } from "../rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const bufYaml = fs.readFileSync(path.join(root, "buf.yaml"), "utf8");
const bufGenYaml = fs.readFileSync(path.join(root, "buf.gen.yaml"), "utf8");

// The messages of the errors a rule gives, each with its line.
const messages = (errors) => errors.map(({ file, line, message }) => `${file}:${line}: ${message}`);

// One error, its text matching pattern.
function expectOnly(errors, pattern) {
  assert.equal(errors.length, 1, messages(errors).join("\n"));
  assert.match(messages(errors)[0], pattern);
}

test("spec's own buf.yaml and buf.gen.yaml are as R83 has them", () => {
  assert.deepEqual(checkBufYaml(bufYaml), []);
  assert.deepEqual(checkBufGenYaml(bufGenYaml), []);
});

test("buf.yaml holds no deps, no exception and no other category", () => {
  expectOnly(checkBufYaml(`${bufYaml}deps:\n  - buf.build/bufbuild/protovalidate\n`), /^buf\.yaml:\d+: deps: a dependency comes from the Buf Schema Registry/);
  expectOnly(checkBufYaml(bufYaml.replace("  disallow_comment_ignores: true\n", "  disallow_comment_ignores: true\n  except:\n    - COMMENT_FIELD\n")), /^buf\.yaml:\d+: lint\.except: every rule of the categories holds/);
  expectOnly(checkBufYaml(bufYaml.replace("breaking:\n  use:\n", "breaking:\n  ignore:\n    - contracts\n  use:\n")), /^buf\.yaml:\d+: breaking\.ignore: every rule holds for every file/);
  expectOnly(checkBufYaml(bufYaml.replace("    - COMMENTS\n", "")), /lint\.use is \["STANDARD","UNARY_RPC"\], and R83 has \["STANDARD","COMMENTS","UNARY_RPC"\]/);
  expectOnly(checkBufYaml(bufYaml.replace("    - FILE\n", "    - WIRE_JSON\n")), /breaking\.use is \["WIRE_JSON"\]/);
  expectOnly(checkBufYaml(bufYaml.replace("disallow_comment_ignores: true", "disallow_comment_ignores: false")), /lint\.disallow_comment_ignores is false, and R83 has true/);
  expectOnly(checkBufYaml(bufYaml.replace("version: v2", "version: v1")), /^buf\.yaml:\d+: version is "v1", and R83 has "v2"/);
  expectOnly(checkBufYaml(bufYaml.replace("  - path: contracts\n", "  - path: contracts\n  - path: proto\n")), /modules is \[\{"path":"contracts"\},\{"path":"proto"\}\]/);
  expectOnly(checkBufYaml(bufYaml.replace("  - path: contracts\n", "  - path: contracts\n    excludes:\n      - contracts/old\n")), /modules is \[\{"path":"contracts","excludes":\["contracts\/old"\]\}\]/);
  expectOnly(checkBufYaml(bufYaml.replace(/breaking:\n[^]*$/, "")), /^buf\.yaml:1: breaking is missing: R83 has \{"use":\["FILE"\]\}/);
  expectOnly(checkBufYaml(bufYaml.replace(/lint:\n[^]*breaking/, "lint: STANDARD\nbreaking")), /^buf\.yaml:\d+: lint is "STANDARD", and R83 has/);
});

test("the order of the categories is no part of the rule", () => {
  assert.deepEqual(checkBufYaml(bufYaml.replace("    - STANDARD\n    - COMMENTS\n", "    - COMMENTS\n    - STANDARD\n")), []);
});

test("a buf.yaml that is not YAML is one error", () => {
  expectOnly(checkBufYaml("version: [v2\n"), /^buf\.yaml:\d+: not YAML:/);
});

test("buf.gen.yaml has local plugins alone, out to contracts/, with no input and no cleaning", () => {
  const plugin = "  - local: tools/node_modules/.bin/protoc-gen-es\n";
  expectOnly(checkBufGenYaml(bufGenYaml.replace(plugin, "  - remote: buf.build/bufbuild/es:v2.16.0\n")), /^buf\.gen\.yaml:\d+: remote: "buf\.build\/bufbuild\/es:v2\.16\.0" is a plugin of the Buf Schema Registry/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace(plugin, "  - protoc_builtin: java\n")), /protoc_builtin: "java" needs protoc/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace(plugin, `${plugin}    clean: true\n`)), /clean: buf generate cleans no folder/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace(plugin, `${plugin}    strategy: all\n`)), /strategy: a plugin has local, out and opt alone/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace("    out: contracts\n    opt:\n      - target", "    out: gen\n    opt:\n      - target")), /out is "gen": the code lies beside the \.proto files/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace(plugin, "  - local: []\n")), /local is \[\]: a plugin is a local program/);
  expectOnly(checkBufGenYaml(`${bufGenYaml}inputs:\n  - git_repo: https://github.com/acme/weather.git\n`), /inputs: buf generates from the workspace of buf\.yaml alone/);
  expectOnly(checkBufGenYaml(`${bufGenYaml}clean: true\n`), /clean: the template has version, managed and plugins alone/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace("version: v2", "version: v1")), /version is "v1", and the template is of version v2/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace(/plugins:[^]*$/, "plugins: []\n")), /plugins: the template names its local plugins/);
  expectOnly(checkBufGenYaml(bufGenYaml.replace(plugin, "  - protoc-gen-es\n").replace(/    out: contracts\n    opt:\n      - target=js\+dts\n      - import_extension=js\n/, "")), /a plugin is "protoc-gen-es", not a local plugin/);
  expectOnly(checkBufGenYaml("- protoc-gen-go\n"), /the file is \["protoc-gen-go"\], not a template of buf generate/);
  expectOnly(checkBufGenYaml("plugins: [\n"), /^buf\.gen\.yaml:\d+: not YAML:/);
});

test("the layout of contracts/ names each file's kind and the .proto it comes from", () => {
  for (const file of ["contracts/README.md", "contracts/go.mod", "contracts/go.sum", "contracts/vectors.go", "contracts/vectors_test.go"]) assert.deepEqual(classify(file), { kind: "text" });
  assert.deepEqual(classify("contracts/vectors/learner_model/v2/two-readers.json"), { kind: "vector", package: "novatrail.learner_model.v2" });
  assert.deepEqual(classify("contracts/examples/learner_model/v2/sheet-of-lines.json"), { kind: "example", package: "novatrail.learner_model.v2" });
  assert.deepEqual(classify("contracts/novatrail/learner_model/v2/progress.proto"), { kind: "proto", package: "novatrail.learner_model.v2" });
  const source = "contracts/novatrail/learner_model/v2/progress.proto";
  for (const file of ["progress.pb.go", "progress_pb.js", "progress_pb.d.ts", "learner_modelv2connect/progress.connect.go"]) {
    assert.deepEqual(classify(`contracts/novatrail/learner_model/v2/${file}`), { kind: "generated", source }, file);
  }
  for (const file of [
    "contracts/trial.proto",
    "contracts/novatrail/trial/v0/trial.proto",
    "contracts/novatrail/trial/v1alpha1/trial.proto",
    "contracts/novatrail/Trial/v1/trial.proto",
    "contracts/novatrail/trial/v1/sub/trial.proto",
    "contracts/novatrail/trial/v1/otherv1connect/trial.connect.go",
    "contracts/novatrail/trial/v1/trialv2connect/trial.connect.go",
    "contracts/novatrail/trial/v1/trial.pb.ts",
    "contracts/LICENSE",
    "contracts/buf.yaml",
    "contracts/vectors/trial/v1/Two.json",
    "contracts/vectors/trial/v1/two_readers.json",
    "contracts/vectors/trial/v1/two-.json",
    "contracts/vectors/trial/v1/two.yaml",
    "contracts/vectors/trial/v0/two.json",
    "contracts/vectors/trial/v1/sub/two.json",
    "contracts/vectors/two.json",
    "contracts/examples/trial/v1/Two.json",
    "contracts/examples/trial/v0/two.json",
    "contracts/examples/trial/v1/two.png",
    "contracts/examples/two.json",
    "contracts/other.go",
  ]) {
    assert.equal(classify(file), null, file);
  }
  assert.match(unknownFile("contracts/novatrail/trial/v0/trial.proto").message, /^a contract is contracts\/novatrail\/<part>\/vN\/<name>\.proto/);
  assert.match(unknownFile("contracts/LICENSE").message, /^contracts-check does not know it/);
  assert.match(unknownFile("contracts/vectors/two.json").message, /^a test vector is contracts\/vectors\/<part>\/vN\/<case>\.json/);
  assert.match(unknownFile("contracts/examples/two.json").message, /^an example is contracts\/examples\/<part>\/vN\/<case>\.json/);
});

// An image as buf build --exclude-imports writes it, made up: one file, with the fields and
// locations a rule reads.
function image({ syntax = "proto3", edition, pkg = "novatrail.trial.v1", fields = [], nested = [], extensions = [], locations = [] } = {}) {
  return {
    file: [
      {
        name: "novatrail/trial/v1/trial.proto",
        package: pkg,
        syntax,
        edition,
        messageType: [{ name: "Place", field: fields, nestedType: nested }],
        extension: extensions,
        sourceCodeInfo: { location: [{ path: [], span: [0, 0, 10, 0] }, { path: [12], span: [0, 0, 18] }, { path: [2], span: [4, 0, 27] }, ...locations] },
      },
    ],
  };
}

test("an image of proto3 with no json_name and no unsigned type passes", () => {
  assert.deepEqual(checkImage(image({ fields: [{ name: "ymin", type: "TYPE_INT32", jsonName: "ymin" }] })), []);
  assert.deepEqual(checkImage({}), []);
});

test("a syntax other than proto3 is found, at the line of syntax or edition", () => {
  expectOnly(checkImage(image({ syntax: "proto2" })), /^contracts\/novatrail\/trial\/v1\/trial\.proto:1: the file is of syntax proto2, and a contract is proto3/);
  const unnamed = image();
  delete unnamed.file[0].syntax;
  expectOnly(checkImage(unnamed), /the file is of syntax proto2/);
  expectOnly(checkImage(image({ syntax: "editions", edition: "EDITION_2023" })), /the file is of edition EDITION_2023, and a contract is proto3/);
});

test("a package without the prefix novatrail. is found", () => {
  expectOnly(checkImage(image({ pkg: "trial.v1" })), /^contracts\/novatrail\/trial\/v1\/trial\.proto:5: the package "trial\.v1" lacks the prefix novatrail\./);
  const packageless = image();
  delete packageless.file[0].package;
  expectOnly(checkImage(packageless), /the package "" lacks the prefix/);
});

test("a json_name and an unsigned type are found at any depth, at their lines", () => {
  const fields = [
    { name: "ymin", type: "TYPE_UINT32", jsonName: "ymin" },
    { name: "task_id", type: "TYPE_STRING", jsonName: "taskId" },
  ];
  const nested = [{ name: "Part", field: [{ name: "xmin", type: "TYPE_FIXED64", jsonName: "xmin" }], nestedType: [{ name: "Deep", field: [{ name: "n", type: "TYPE_STRING", jsonName: "N" }] }] }];
  const extensions = [{ name: "count", type: "TYPE_UINT64", jsonName: "count" }];
  const locations = [
    { path: [4, 0, 2, 0, 5], span: [8, 2, 8] },
    { path: [4, 0, 2, 1, 10], span: [9, 22, 42] },
    { path: [4, 0, 3, 0, 2, 0, 5], span: [12, 4, 11] },
    { path: [4, 0, 3, 0, 3, 0, 2, 0, 10], span: [14, 20, 30] },
  ];
  assert.deepEqual(messages(checkImage(image({ fields, nested, extensions, locations }))), [
    "contracts/novatrail/trial/v1/trial.proto:9: the field ymin is of the unsigned uint32, and no contract uses an unsigned type (contracts/README.md, section 5)",
    "contracts/novatrail/trial/v1/trial.proto:10: the field task_id sets json_name, and a field's name in JSON is its protobuf name (contracts/README.md, section 6)",
    "contracts/novatrail/trial/v1/trial.proto:13: the field xmin is of the unsigned fixed64, and no contract uses an unsigned type (contracts/README.md, section 5)",
    "contracts/novatrail/trial/v1/trial.proto:15: the field n sets json_name, and a field's name in JSON is its protobuf name (contracts/README.md, section 6)",
    "contracts/novatrail/trial/v1/trial.proto:1: the field count is of the unsigned uint64, and no contract uses an unsigned type (contracts/README.md, section 5)",
  ]);
});

test("an error names the line of its own key, not of the first key of the same name", () => {
  const lines = bufYaml.split("\n");
  const breakingUse = lines.indexOf("breaking:") + 2;
  const errors = checkBufYaml(bufYaml.replace("    - FILE\n", "    - WIRE\n"));
  assert.deepEqual(messages(errors), [`buf.yaml:${breakingUse}: breaking.use is ["WIRE"], and R83 has ["FILE"] (contracts/README.md, sections 3 and 7)`]);
  const genLines = bufGenYaml.split("\n");
  const third = genLines.findIndex((line) => line.startsWith("  - local: tools/node_modules/.bin/protoc-gen-es"));
  const out = genLines.findIndex((line, i) => i > third && line === "    out: contracts") + 1;
  expectOnly(checkBufGenYaml(bufGenYaml.replace("    out: contracts\n    opt:\n      - target", "    out: gen\n    opt:\n      - target")), new RegExp(`^buf\\.gen\\.yaml:${out}: out is "gen"`));
  // A key that is missing is found at the line of the map that lacks it.
  expectOnly(checkBufYaml(bufYaml.replace("  disallow_comment_ignores: true\n", "")), new RegExp(`^buf\\.yaml:${lines.indexOf("lint:") + 1}: lint\\.disallow_comment_ignores is missing`));
});

test("a wrapper of an unsigned type and the unsigned key of a map are found, the key at its map field's line", () => {
  const found = checkImage({
    file: [
      {
        name: "novatrail/trial/v1/trial.proto",
        package: "novatrail.trial.v1",
        syntax: "proto3",
        messageType: [
          {
            name: "Extra",
            field: [
              { name: "names", type: "TYPE_MESSAGE", typeName: ".novatrail.trial.v1.Extra.NamesEntry", jsonName: "names" },
              { name: "count", type: "TYPE_MESSAGE", typeName: ".google.protobuf.UInt64Value", jsonName: "count" },
              { name: "total", type: "TYPE_MESSAGE", typeName: ".google.protobuf.Int64Value", jsonName: "total" },
            ],
            nestedType: [
              {
                name: "NamesEntry",
                field: [
                  { name: "key", type: "TYPE_UINT32", jsonName: "key" },
                  { name: "value", type: "TYPE_STRING", jsonName: "value" },
                ],
                options: { mapEntry: true },
              },
            ],
          },
        ],
        sourceCodeInfo: { location: [{ path: [4, 0, 2, 0], span: [7, 2, 34] }, { path: [4, 0, 2, 1], span: [8, 2, 40] }, { path: [4, 0, 2, 1, 6], span: [8, 2, 29] }] },
      },
    ],
  });
  assert.deepEqual(messages(found), [
    "contracts/novatrail/trial/v1/trial.proto:9: the field count is of the unsigned google.protobuf.UInt64Value, and no contract uses an unsigned type (contracts/README.md, section 5)",
    "contracts/novatrail/trial/v1/trial.proto:8: the field key of the map names is of the unsigned uint32, and no contract uses an unsigned type (contracts/README.md, section 5)",
  ]);
});
