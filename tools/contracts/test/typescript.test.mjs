// The check of the contracts' code through its npm package, under tsc and Node: the sources it
// writes of the declarations, spec's own package, which passes, and made-up packages that tsc or
// Node refuse.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkTypeScript, messagesOf, sourcesOf } from "../typescript.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.join(here, "..", "..", "..");
const observation = "contracts/novatrail/observation/v1/observation_pb";

const scratch = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

// A made-up root: what the package is built of, with spec's observation as its code unless other
// code is given, and spec's tools/node_modules unless another folder is.
function root({ code, modules = path.join(spec, "tools", "node_modules") } = {}) {
  const dir = scratch("contracts-typescript-");
  const copy = (file) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(spec, file), path.join(dir, file));
  };
  for (const file of ["LICENSE", "tools/package.json", "tools/contracts/npm/README.md"]) copy(file);
  if (code) {
    for (const [file, text] of Object.entries(code)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
  } else {
    for (const file of [`${observation}.js`, `${observation}.d.ts`]) copy(file);
  }
  fs.symlinkSync(modules, path.join(dir, "tools", "node_modules"));
  return dir;
}

test("the sources declare and run each message of each file, by the package's exports", () => {
  const declarations = new Map([
    ["novatrail/a/v1/a_pb.js", "export declare const ASchema: GenMessage<A>;\nexport declare const A_PartSchema: GenMessage<A_Part>;\nexport declare const KindSchema: GenEnum<Kind>;\n"],
    ["novatrail/b/v1/b_pb.js", "export declare const file_b: GenFile;\n"],
  ]);
  const files = messagesOf(declarations);
  assert.deepEqual(files, [
    { file: "novatrail/a/v1/a_pb.js", messages: [{ schema: "ASchema", type: "A" }, { schema: "A_PartSchema", type: "A_Part" }] },
    { file: "novatrail/b/v1/b_pb.js", messages: [] },
  ]);
  const { ts, runtime } = sourcesOf(files);
  assert.match(ts, /^import \* as f0 from "@altnovatrail\/contracts\/novatrail\/a\/v1\/a_pb\.js";$/m);
  assert.match(ts, /^import \* as f1 from "@altnovatrail\/contracts\/novatrail\/b\/v1\/b_pb\.js";$/m);
  assert.match(ts, /^export const made0_1: f0\.A_Part = create\(f0\.A_PartSchema\);$/m);
  assert.match(ts, /^export const json0_0: JsonValue = toJson\(f0\.ASchema, made0_0, \{ useProtoFieldName: true \}\);$/m);
  assert.match(runtime, /^ {2}\["novatrail\/a\/v1\/a_pb\.js", "A_Part", f0\.A_PartSchema\],$/m);
  assert.doesNotMatch(ts, /Kind/);
});

test("spec's own package passes: tsc takes it under each resolution, and Node runs it", () => {
  const dir = root();
  try {
    assert.deepEqual(checkTypeScript(dir), { errors: [], messages: 4 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a tsc that refuses the code is named with what it says, for each resolution", () => {
  const dir = root();
  const tsc = path.join(dir, "tsc");
  fs.writeFileSync(tsc, "#!/bin/sh\necho \"every.ts(3,1): error TS2307: Cannot find module\"\nexit 2\n", { mode: 0o755 });
  try {
    const { errors } = checkTypeScript(dir, { tsc });
    assert.deepEqual(errors.map(({ message }) => message.replace(/ by .*?:/, " by …:")), [
      "tsc does not take the code of @altnovatrail/contracts by …: every.ts(3,1): error TS2307: Cannot find module",
      "tsc does not take the code of @altnovatrail/contracts by …: every.ts(3,1): error TS2307: Cannot find module",
    ]);
    assert.match(errors[0].message, /by tsconfig\.nodenext\.json:/);
    assert.match(errors[1].message, /by tsconfig\.bundler\.json:/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("code whose declarations name a message its JavaScript lacks fails under Node", () => {
  const declarations = [
    'import type { GenMessage } from "@bufbuild/protobuf/codegenv2";',
    'import type { Message } from "@bufbuild/protobuf";',
    'export declare type Ghost = Message<"novatrail.ghost.v1.Ghost"> & {};',
    "export declare const GhostSchema: GenMessage<Ghost>;",
    "",
  ].join("\n");
  const dir = root({ code: { "contracts/novatrail/ghost/v1/ghost_pb.js": "export {};\n", "contracts/novatrail/ghost/v1/ghost_pb.d.ts": declarations } });
  try {
    const { errors, messages } = checkTypeScript(dir);
    assert.equal(messages, 1);
    assert.equal(errors.length, 1, JSON.stringify(errors));
    assert.match(errors[0].message, /^Node does not run the code of @altnovatrail\/contracts as the contracts want: .*TypeError/s);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a runtime other than the one the package depends on, and a package that cannot be built, are refused", () => {
  const modules = scratch("contracts-typescript-modules-");
  fs.mkdirSync(path.join(modules, "@bufbuild", "protobuf"), { recursive: true });
  fs.writeFileSync(path.join(modules, "@bufbuild", "protobuf", "package.json"), JSON.stringify({ name: "@bufbuild/protobuf", version: "2.15.0" }));
  const other = root({ modules });
  const none = root({ modules: scratch("contracts-typescript-none-") });
  const unbuilt = root();
  fs.rmSync(path.join(unbuilt, "tools/contracts/npm/README.md"));
  try {
    assert.deepEqual(checkTypeScript(other).errors.map(({ message }) => message), [
      "tools/node_modules holds @bufbuild/protobuf 2.15.0, and @altnovatrail/contracts depends on 2.16.0: tools/package-lock.json is out of step with tools/package.json",
    ]);
    const [missing, ...more] = checkTypeScript(none).errors;
    assert.deepEqual(more, []);
    assert.match(missing.message, /^tools\/node_modules holds no @bufbuild\/protobuf, which @altnovatrail\/contracts depends on: run just contracts-check, which installs tools\/ by its lock file \(ENOENT/);
    const { errors } = checkTypeScript(unbuilt);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /^the npm package @altnovatrail\/contracts cannot be built: tools\/contracts\/npm\/README\.md is no file of [^:]*$/);
  } finally {
    for (const dir of [modules, other, none, unbuilt]) fs.rmSync(dir, { recursive: true, force: true });
  }
});
