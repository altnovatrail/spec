# @altnovatrail/spec

The types of [NovaTrail](https://github.com/altnovatrail)'s module format for TypeScript. The package covers:
- the parts of a module and their open views;
- the canonical view and the inventory of a package;
- the module index;
- the test vectors.

They are generated from the format's schemas, [`format/schemas`](https://github.com/altnovatrail/spec/tree/main/format/schemas) in `altnovatrail/spec`, by its `tools/types`. Go code takes the same types from the Go module `github.com/altnovatrail/spec`, at the same tag.

From 0.5.0 on, the package also holds the types of the element `<novatrail-canvas>`: the contract between the canvas and the learner's app. These are written by hand rather than generated, and only TypeScript has them.

The package holds declarations alone, with no code to run, so import them with `import type`:

```ts
import type { Manifest, Task } from "@altnovatrail/spec/formatv0";
import type * as open from "@altnovatrail/spec/formatv0/open";

function show(task: open.Task, manifest: open.Manifest) {
  // …
}
```

- **`@altnovatrail/spec/formatv0`** holds the types of the format's major version 0. There is a type for:
  - each schema and each of its `$defs`;
  - each object without a name of its own;
  - each enumeration of a field.

  A field the object always holds is required, and any other is optional. That includes each field that only some branches of a schema give.
- **`@altnovatrail/spec/formatv0/open`** holds the open view of each part, which is what the learner's app gets ([the format's text](https://github.com/altnovatrail/spec/blob/main/format/README.md#6-open-fields), section 6). Each type keeps its name from `formatv0` and only the fields marked `x-open`, so an open view has no check, no template and no solver.
- **`@altnovatrail/spec/canvas`** holds the types of `<novatrail-canvas>`:
  - `CanvasElement`, which describes the element's properties `tool`, `task`, `workedExample`, `demoState`, `manifest`, `media`, `history` and `filled` and its method `exportWork()`;
  - `Media`, the function by which the consumer gives the files of the pictures: the canvas goes to no network;
  - the events `toolchange`, `historychange` and `demochange`, with `CanvasEventMap` naming them;
  - the state of a worked example's demo, `DemoState`;
  - the history of writing;
  - the work for checking, with the context of its submission.

  Its unions are exact: an event of the history is told by its `kind`, and the work of a sheet or of a workbook by its key, `png` or `cells`. The declarations need the DOM's types, so the consumer's `lib` must include `dom`. The tutor's marks are not in it yet: their types come with the contract between the app and the platform's API. The package registers nothing. The canvas's own package puts the element in `HTMLElementTagNameMap` and its events in `GlobalEventHandlersEventMap`.

A type gives the shape of a value and nothing more: the schemas decide what is valid. Code that reads a value from elsewhere checks it against its schema first.

The package is read through its `exports`, under `"moduleResolution": "nodenext"`, `"node16"` or `"bundler"`.

## Versions

The package's version is the tag of the release of `altnovatrail/spec` it comes from, without its `v`: 0.4.0 is `v0.4.0`. Every release from the line 0.4 on carries one, even when the types have not changed. Take it at an exact version, the same tag as any submodule or Go module of `spec` you hold, and move all of them together.

## Checking the archive

The archive in npm is the file `altnovatrail-spec-<version>.tgz` of that release, which the release signs with cosign and whose attestation names it. A NovaTrail repository lets the package into its code only once spec's `release-verify-npm` has accepted its lock file, in CI of the pull request that changes it (decision R77 of spec; [RULES.md](https://github.com/altnovatrail/spec/blob/main/RULES.md), Hard rules). It runs from the repository's `spec` submodule:

```sh
just -f spec/justfile release-verify-npm package-lock.json
```

For each package of `@altnovatrail` in the lock file, it downloads the archive from the registry and checks it against Sigstore's trust root and the cosign bundle of the release file of the same name. This package's must be signed by spec's own `.github/workflows/release.yml` on `main`, in `altnovatrail/spec`. Its certificate names the tip of `main` as the signing run began, so the archive is tied to its tag by the version its `package.json` holds. Last, the lock file's `integrity` must be the hash of the bytes so checked. A single archive, with its bundle beside it, is checked by `just -f spec/justfile release-verify spec v0.6.2 altnovatrail-spec-0.6.2.tgz`.

The release's attestation ties the archive to the release, not to a commit, and `gh release verify-asset` checks it apart:

```sh
npm pack @altnovatrail/spec@0.6.2
gh release verify-asset v0.6.2 altnovatrail-spec-0.6.2.tgz -R altnovatrail/spec
```

The release publishes that file to npm itself, by trusted publishing, and npm gives each version it publishes that way a provenance attestation. The provenance names `.github/workflows/release.yml` of `altnovatrail/spec` and the commit of the run that published it, which is the tip of `main` when the run began rather than always the commit the release was cut from. 0.4.0 was published by hand and has no provenance. Not every release of the line has a version in npm, so take a tag whose version is there.

## License

[Apache-2.0](https://github.com/altnovatrail/spec/blob/main/LICENSE).
