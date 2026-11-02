// contracts: the code buf generates from the API contracts, put beside the files it comes from
// (R83; contracts/README.md, section 8; RUN.md, T55).
//
//   node tools/contracts/generate.mjs      spec's own contracts/, two levels above this file
//
// buf generate writes the code of buf.gen.yaml into a new folder; then every generated file of
// contracts/ goes, and the new ones take their place, so that a file no .proto gives any more goes
// too, as just types puts the types of the format in place. buf does not run while buf.yaml or
// buf.gen.yaml breaks R83, nor while a file of contracts/ is not where the layout has it; with no
// .proto file, only the generated files go.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "../shared.mjs";
import { generate } from "./buf.mjs";
import { checkConfig, layout } from "./main.mjs";

// Generates the code at root and puts it in place: how many files it wrote and removed.
export function writeGenerated(root) {
  const { protos, generated, errors } = layout(root);
  errors.push(...checkConfig(root));
  if (errors.length) {
    const lines = errors.map(({ file, line, message }) => `${file}:${line}: ${message}`);
    throw new Error(`buf generate does not run while contracts-check finds these:\n${lines.join("\n")}`);
  }
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-generate-"));
  try {
    const written = protos.length ? generate(root, path.join(folder, "generated")) : new Map();
    for (const file of generated.keys()) fs.rmSync(path.join(root, file));
    for (const [file, bytes] of written) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), bytes);
    }
    // A folder of generated code that no file is left in goes too, and so do the folders above it
    // that it leaves empty — the folder of another file may have gone with them already.
    for (const file of generated.keys()) {
      let dir = path.dirname(path.join(root, file));
      while (dir.startsWith(path.join(root, "contracts", "novatrail")) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      }
    }
    return { written: written.size, removed: [...generated.keys()].filter((file) => !written.has(file)).length };
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  try {
    const { written, removed } = writeGenerated(root);
    console.log(`contracts: ${written} file${written === 1 ? "" : "s"} of generated code in contracts/${removed ? `, ${removed} no longer generated removed` : ""}`);
  } catch (error) {
    console.error(`contracts: ${error.message}`);
    process.exitCode = 1;
  }
}
