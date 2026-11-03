// The check of the contracts' code for TypeScript (R83; RUN.md, T57): the npm package
// @altnovatrail/contracts of the working tree, as a consumer installs it, under TypeScript and Node.
//
// The package goes into the node_modules of a project in a temporary folder, beside the runtime of
// protobuf-es at the version the package depends on, from tools/node_modules. The project imports
// every file of code the package exports:
// - every.ts, a declaration of each message — made, written in binary and in JSON with protobuf
//   names, and read back — and an import of each vector the package exports, as JSON, as its README
//   shows, which tsc of tools/ checks under each resolution of modules a consumer may use, nodenext
//   and bundler, as strictly as tools/types checks the types of the format, the package's
//   declarations and the runtime's included;
// - runtime.mjs, the same for each message under Node, by contracts.check.mjs beside this module:
//   a message with no field set and one with a value in every field, nested ones too, read back the
//   same from the binary form and both spellings of JSON, and JSON written with useProtoFieldName
//   names each field by its protobuf name (contracts/README.md, section 6). It imports every vector
//   the package exports, as JSON, and the package's code reads each message of it back as it is
//   written (section 12).
// Both are written from the package's declarations, so a contract that comes with a later task is
// checked as the first one is.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TAR, TYPESCRIPT_CONFIGS as CONFIGS, TYPESCRIPT_STRICT as STRICT } from "../shared.mjs";
import { NAME, RUNTIME, packOf } from "./npm.mjs";

// A message's schema, as protoc-gen-es declares it: its name and the message's type.
const MESSAGE = /^export declare const (\w+): GenMessage<(\w+)/gm;
// The version the package is built under for the check: any will do.
const VERSION = "0.0.0";

// The messages of each file of code, from its declarations: [{ file, messages: [{ schema, type }] }].
export function messagesOf(declarations) {
  return [...declarations].map(([file, text]) => ({ file, messages: [...text.matchAll(MESSAGE)].map(([, schema, type]) => ({ schema, type })) }));
}

// The run under Node, which runtime.mjs imports as check.mjs.
export const RUNTIME_CHECK = fileURLToPath(new URL("contracts.check.mjs", import.meta.url));

// The sources of the project for the files of code and their messages, and the vectors the package
// exports: every.ts and runtime.mjs.
export function sourcesOf(files, vectors = []) {
  const imports = files.map(({ file }, i) => `import * as f${i} from ${JSON.stringify(`${NAME}/${file}`)};`);
  const vectorImports = vectors.map((file, i) => `import v${i} from ${JSON.stringify(`${NAME}/${file}`)} with { type: "json" };`);
  const ts = [
    `// Every message of ${NAME}, as code that takes the package would declare it (tools/contracts/typescript.mjs).`,
    "",
    `import { create, fromBinary, fromJson, toBinary, toJson, type JsonValue } from ${JSON.stringify(RUNTIME)};`,
    ...imports,
    ...vectorImports,
    ...vectors.map((file, i) => `export const vector${i}: JsonValue = v${i};`),
  ];
  const cases = [];
  files.forEach(({ file, messages }, i) => {
    messages.forEach(({ schema, type }, j) => {
      const at = `${i}_${j}`;
      const of = `f${i}.${schema}`;
      ts.push(
        "",
        `// ${file}: ${type}`,
        `export const made${at}: f${i}.${type} = create(${of});`,
        `export const binary${at}: Uint8Array = toBinary(${of}, made${at});`,
        `export const json${at}: JsonValue = toJson(${of}, made${at}, { useProtoFieldName: true });`,
        `export const read${at}: f${i}.${type} = fromBinary(${of}, binary${at});`,
        `export const parsed${at}: f${i}.${type} = fromJson(${of}, json${at});`,
      );
      cases.push(`  [${JSON.stringify(file)}, ${JSON.stringify(type)}, ${of}],`);
    });
  });
  const runtime = [
    `// Every message of ${NAME} under Node (tools/contracts/typescript.mjs).`,
    "",
    `import { checkMessages, checkVectors } from "./check.mjs";`,
    ...imports,
    ...vectorImports,
    "",
    "const cases = [",
    ...cases,
    "];",
    `const schemas = [${files.map((_, i) => `f${i}`).join(", ")}].flatMap((file) => Object.values(file)).filter((value) => value?.kind === "message");`,
    `const vectors = [${vectors.map((file, i) => `[${JSON.stringify(file)}, v${i}]`).join(", ")}];`,
    "const failures = [...checkMessages(cases), ...checkVectors(vectors, schemas)];",
    "if (failures.length) {",
    "  console.error(failures.join(\"\\n\"));",
    "  process.exitCode = 1;",
    "} else {",
    "  console.log(`${cases.length} messages, ${vectors.length} vectors`);",
    "}",
  ];
  return { ts: `${ts.join("\n")}\n`, runtime: `${runtime.join("\n")}\n` };
}

// The check of the package of the working tree at root: { errors, messages, vectors }. tsc is that
// of tools/, at root.
export function checkTypeScript(root, { tsc = path.join(root, "tools", "node_modules", ".bin", "tsc") } = {}) {
  const errors = [];
  const refuse = (message) => errors.push({ file: "contracts", line: 0, message });
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-typescript-"));
  try {
    let archive;
    try {
      archive = packOf(root, VERSION, folder);
    } catch (error) {
      refuse(`the npm package ${NAME} cannot be built: ${error.message}`);
      return { errors, messages: 0, vectors: 0 };
    }
    const project = path.join(folder, "project");
    const installed = path.join(project, "node_modules", ...NAME.split("/"));
    fs.mkdirSync(installed, { recursive: true });
    const unpacked = spawnSync(TAR, ["-xzf", archive, "-C", installed, "--strip-components=1"], { encoding: "utf8" });
    if (unpacked.status !== 0) {
      refuse(`tar could not unpack ${path.basename(archive)}: ${String(unpacked.stderr || unpacked.error?.message).trim()}`);
      return { errors, messages: 0, vectors: 0 };
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(installed, "package.json"), "utf8"));

    // The runtime, at the version the package depends on: the one tools/ installs.
    const runtime = path.join(root, "tools", "node_modules", ...RUNTIME.split("/"));
    const wanted = manifest.dependencies[RUNTIME];
    let version;
    try {
      version = JSON.parse(fs.readFileSync(path.join(runtime, "package.json"), "utf8")).version;
    } catch (error) {
      refuse(`tools/node_modules holds no ${RUNTIME}, which ${NAME} depends on: run just contracts-check, which installs tools/ by its lock file (${error.message})`);
      return { errors, messages: 0, vectors: 0 };
    }
    if (version !== wanted) {
      refuse(`tools/node_modules holds ${RUNTIME} ${version}, and ${NAME} depends on ${wanted}: tools/package-lock.json is out of step with tools/package.json`);
      return { errors, messages: 0, vectors: 0 };
    }
    fs.mkdirSync(path.dirname(path.join(project, "node_modules", ...RUNTIME.split("/"))), { recursive: true });
    fs.symlinkSync(runtime, path.join(project, "node_modules", ...RUNTIME.split("/")));

    const files = Object.keys(manifest.exports).filter((key) => key.endsWith("_pb.js")).map((key) => key.slice(2));
    const vectors = Object.keys(manifest.exports).filter((key) => key.startsWith("./vectors/")).map((key) => key.slice(2));
    const declarations = new Map(files.map((file) => [file, fs.readFileSync(path.join(installed, file.replace(/\.js$/, ".d.ts")), "utf8")]));
    const messages = messagesOf(declarations);
    const { ts, runtime: script } = sourcesOf(messages, vectors);
    fs.writeFileSync(path.join(project, "package.json"), `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`);
    fs.writeFileSync(path.join(project, "every.ts"), ts);
    fs.writeFileSync(path.join(project, "runtime.mjs"), script);
    fs.copyFileSync(RUNTIME_CHECK, path.join(project, "check.mjs"));
    for (const [file, resolution] of Object.entries(CONFIGS)) {
      fs.writeFileSync(path.join(project, file), `${JSON.stringify({ compilerOptions: { ...resolution, ...STRICT, resolveJsonModule: true }, files: ["every.ts"] }, null, 2)}\n`);
      const checked = spawnSync(tsc, ["-p", path.join(project, file)], { cwd: project, encoding: "utf8" });
      if (checked.status !== 0) refuse(`tsc does not take the code of ${NAME} by ${file}: ${`${checked.stdout}${checked.stderr}`.trim() || checked.error?.message}`);
    }
    const ran = spawnSync(process.execPath, [path.join(project, "runtime.mjs")], { cwd: project, encoding: "utf8" });
    if (ran.status !== 0) refuse(`Node does not run the code of ${NAME} as the contracts want: ${`${ran.stderr}${ran.stdout}`.trim()}`);
    return { errors, messages: messages.reduce((sum, { messages: of }) => sum + of.length, 0), vectors: vectors.length };
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
