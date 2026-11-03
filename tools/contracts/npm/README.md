# @altnovatrail/contracts

The code of [NovaTrail](https://github.com/altnovatrail)'s API contracts for TypeScript: the messages and enums of each contract, with their descriptors, for [protobuf-es](https://github.com/bufbuild/protobuf-es) and Connect. The contracts are the protobuf files under [`contracts/`](https://github.com/altnovatrail/spec/tree/main/contracts) in `altnovatrail/spec`, and their text is [`contracts/README.md`](https://github.com/altnovatrail/spec/blob/main/contracts/README.md). `protoc-gen-es` generates this code from them: JavaScript with its declarations. Go code takes the same contracts from the Go module `github.com/altnovatrail/spec/contracts`, at the tag `contracts/vX.Y.Z` of the same number.

Each file of code is exported by its path, the path of its `.proto` file with `_pb.js` in the place of `.proto`:

```ts
import { create, fromJson, toJson } from "@bufbuild/protobuf";
import { ObservationSchema, Unreadable } from "@altnovatrail/contracts/novatrail/observation/v1/observation_pb.js";

const observation = fromJson(ObservationSchema, json);
const written = toJson(ObservationSchema, observation, { useProtoFieldName: true });
```

The code imports the runtime of protobuf-es, `@bufbuild/protobuf`, which the package depends on at the exact version of `protoc-gen-es` that wrote it. Take the runtime at that version too, or let npm install it with the package.

JSON of a contract names each field by its protobuf name, in snake case, as the files of `spec` do: whatever writes it passes `useProtoFieldName: true` to `toJson`. A reader takes both the protobuf name and the lowerCamelCase one, as `fromJson` does ([the contracts' text](https://github.com/altnovatrail/spec/blob/main/contracts/README.md), section 6). The package has no types of JSON: `protoc-gen-es` would spell them in lowerCamelCase.

The package is read through its `exports`, under `"moduleResolution": "nodenext"`, `"node16"` or `"bundler"`. `spec` checks its declarations with TypeScript 7 under both, strictly, and runs its code under Node.

## Versions

The package's version is the tag of the release of `altnovatrail/spec` it comes from, without its `v`: 0.7.0 is `v0.7.0`. Every release from the line 0.7 on carries one, even when the contracts have not changed. Take it at an exact version, the same tag as the `spec` submodule and the Go modules of `spec` you hold, and move all of them together. Leave it out of Dependabot, as the Go modules: a release of `spec` comes out with each change of its documents. Dependabot's `ignore` matches a dependency by the name the manifest gives it, `@altnovatrail/contracts` here, and `github.com/altnovatrail/spec/contracts` for the Go module.

Within a contract's package — its last part, `v1` — a release only adds. A change that breaks it comes as a new package, `v2`, beside the old one, in a new line of `spec` ([the contracts' text](https://github.com/altnovatrail/spec/blob/main/contracts/README.md), section 2).

## Checking the archive

The archive in npm is the file `altnovatrail-contracts-<version>.tgz` of that release, which the release signs with cosign and whose attestation names it. A NovaTrail repository lets the package into its code only once spec's `release-verify-npm` has accepted its lock file, in CI of the pull request that changes it (decision R77 of spec; [RULES.md](https://github.com/altnovatrail/spec/blob/main/RULES.md), Hard rules). It runs from the repository's `spec` submodule:

```sh
just -f spec/justfile release-verify-npm package-lock.json
```

For this package, it downloads the archive from the registry and checks it against Sigstore's trust root and the cosign bundle of the file of the same name in the release of `altnovatrail/spec`. The archive must be signed by spec's own `.github/workflows/release.yml` on `main`, and is tied to its tag by the version its `package.json` holds. Last, the lock file's `integrity` must be the hash of the bytes so checked. A single archive, with its bundle beside it, is checked by `just -f spec/justfile release-verify spec v0.7.0 altnovatrail-contracts-0.7.0.tgz`.

The release's attestation ties the archive to the release, not to a commit, and `gh release verify-asset` checks it apart:

```sh
npm pack @altnovatrail/contracts@0.7.0
gh release verify-asset v0.7.0 altnovatrail-contracts-0.7.0.tgz -R altnovatrail/spec
```

The release publishes that file to npm itself, by trusted publishing, and npm gives each version it publishes that way a provenance attestation. The provenance names `.github/workflows/release.yml` of `altnovatrail/spec` and the commit of the run that published it, which is the tip of `main` when the run began rather than always the commit the release was cut from. 0.7.0 was published by hand and has no provenance. A release whose run did not publish its version — one that came out before the release published this package, or one whose publish failed and was not run again — has none in npm, so take a tag whose version is there.

## License

[Apache-2.0](https://github.com/altnovatrail/spec/blob/main/LICENSE). The runtime, `@bufbuild/protobuf`, is under Apache-2.0 and BSD-3-Clause.
