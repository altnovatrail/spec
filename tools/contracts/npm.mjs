// The npm package @altnovatrail/contracts (R83): the code of the API contracts for TypeScript, which
// protoc-gen-es writes beside each .proto file of contracts/ — JavaScript and its declarations, no
// JSON types (buf.gen.yaml) —, with spec's LICENSE and the package's README, tools/contracts/npm/.
// It exports each file of code by its path, as the Go package's path names it, without the module's
// prefix: ./novatrail/observation/v1/observation_pb.js, its types from the declarations beside it.
// It carries the test vectors of the packages whose rules code on TypeScript runs, too, each by its
// path from contracts/: ./vectors/eval/v1/groups.json, the rules the device and the runner share,
// which canvas runs (contracts/README.md, section 12; R94). The observation's are Go's alone:
// TypeScript gives no verdict. What the package holds is what the tree holds, so the package of a
// commit with no such vectors is the one it was.
// The code imports the runtime of protobuf-es, @bufbuild/protobuf, which the package depends on at
// the exact version tools/package.json pins, the version of protoc-gen-es that writes the code.
//
//   node tools/contracts/npm.mjs <root> <version> <folder> [<commit>]
//
// builds the package's archive into the folder, and prints its path: of the working tree at root,
// for `just contracts-check`, which checks the code through the package under tsc and Node, or of a
// commit of the repository at root, its objects alone, for `just release-files`, which puts the
// archive in the release from the line FIRST_CONTRACTS_LINE on (tools/release/files.mjs). version is
// the release's, MAJOR.MINOR.PATCH without its v. tools/npm-package.mjs packs it.

import path from "node:path";
import { isMain } from "../shared.mjs";
import { archiveName, checkPackageArchive, checkedVersion, isVersion, packPackage, treeOf, writePackageOf } from "../npm-package.mjs";

export const NAME = "@altnovatrail/contracts";
// The runtime the code imports, and the plugin that writes it, as tools/package.json names them.
export const RUNTIME = "@bufbuild/protobuf";
const PLUGIN = "@bufbuild/protoc-gen-es";
const FOLDER = "contracts";
const CODE = /^contracts\/(novatrail\/.+_pb\.(?:js|d\.ts))$/;
// The parts whose vectors the package carries, and a vector of one of them.
export const TYPESCRIPT_VECTORS = ["eval"];
const VECTOR = new RegExp(`^contracts/(vectors/(?:${TYPESCRIPT_VECTORS.join("|")})/v[1-9][0-9]*/[a-z0-9]+(?:-[a-z0-9]+)*\\.json)$`);

// The package of version, of the tree: its files, each by its path in the package and in the tree,
// and its package.json.
export function packageOf(version, tree) {
  checkedVersion(version);
  const listed = tree.list(FOLDER);
  const code = listed.map((from) => CODE.exec(from)?.[1]).filter(Boolean);
  if (!code.length) throw new Error(`${FOLDER}/ holds no code of protoc-gen-es: no .proto file, or run just contracts`);
  const vectors = listed.map((from) => VECTOR.exec(from)?.[1]).filter(Boolean);
  const files = [
    { file: "LICENSE", from: "LICENSE" },
    { file: "README.md", from: "tools/contracts/npm/README.md" },
    ...[...code, ...vectors].map((file) => ({ file, from: `${FOLDER}/${file}` })),
  ];
  return { files, manifest: manifestOf(version, code, runtimeOf(tree), vectors) };
}

// The version of @bufbuild/protobuf that tools/package.json pins: exact, and that of protoc-gen-es,
// which writes code for the runtime of its own version.
export function runtimeOf(tree) {
  let dependencies;
  try {
    dependencies = JSON.parse(tree.read("tools/package.json").toString("utf8")).dependencies ?? {};
  } catch (error) {
    throw new Error(`tools/package.json does not say which ${RUNTIME} the code needs: ${error.message}`);
  }
  const runtime = dependencies[RUNTIME];
  if (!isVersion(runtime)) throw new Error(`tools/package.json pins ${RUNTIME} at ${JSON.stringify(runtime)}, not at an exact version`);
  if (dependencies[PLUGIN] !== runtime) throw new Error(`tools/package.json pins ${RUNTIME} at ${runtime} and ${PLUGIN} at ${JSON.stringify(dependencies[PLUGIN])}: the code is written for the runtime of the plugin's own version`);
  return runtime;
}

// The package's package.json, of version, with its files of code, the runtime they need and the
// vectors it carries. The repository is spec's, as npm's provenance wants it to be.
export function manifestOf(version, code, runtime, vectors = []) {
  const exports = {};
  for (const file of code.filter((file) => file.endsWith("_pb.js"))) {
    const types = file.replace(/\.js$/, ".d.ts");
    if (!code.includes(types)) throw new Error(`${FOLDER}/${file} has no declarations beside it, ${FOLDER}/${types}: run just contracts`);
    exports[`./${file}`] = { types: `./${types}`, default: `./${file}` };
  }
  for (const file of vectors) exports[`./${file}`] = `./${file}`;
  exports["./package.json"] = "./package.json";
  return {
    name: NAME,
    version: checkedVersion(version),
    description: "The code of NovaTrail's API contracts for TypeScript, which protoc-gen-es generates from their protobuf files: the messages and enums of each contract, with their descriptors, for @bufbuild/protobuf and Connect.",
    license: "Apache-2.0",
    repository: { type: "git", url: "git+https://github.com/altnovatrail/spec.git" },
    type: "module",
    exports,
    files: vectors.length ? ["novatrail", "vectors"] : ["novatrail"],
    sideEffects: false,
    dependencies: { [RUNTIME]: runtime },
  };
}

// The name npm pack gives the package's archive of version.
export function archiveOf(version) {
  return archiveName(NAME, version);
}

// Writes the package of version into folder, which is not there yet: of the working tree at root,
// or, when commit is given, of that commit of the repository at root.
export function writePackage(root, version, folder, commit) {
  const tree = treeOf(root, commit);
  writePackageOf(packageOf(version, tree), tree, folder);
}

// Builds the archive of the package of version, of the tree at root, into the folder dir, which is
// there and holds no archive of that version; checks it and gives its path.
export function packOf(root, version, dir, commit, npm) {
  const tree = treeOf(root, commit);
  return packPackage(packageOf(version, tree), tree, dir, npm);
}

// The archive holds the files of the package of version, of the tree at root, its package.json
// among them, and nothing else.
export function checkArchive(archive, root, version, commit) {
  checkPackageArchive(archive, packageOf(version, treeOf(root, commit)));
}

if (isMain(import.meta.url)) {
  const [root, version, dir, commit, ...rest] = process.argv.slice(2);
  if (!dir || rest.length) {
    console.error("usage: node tools/contracts/npm.mjs <root> <version> <folder> [<commit>]");
    process.exit(2);
  }
  try {
    console.log(packOf(path.resolve(root), version, path.resolve(dir), commit));
  } catch (error) {
    console.error(`npm: ${error.message}`);
    process.exit(1);
  }
}
