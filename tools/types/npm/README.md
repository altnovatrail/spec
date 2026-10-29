# @altnovatrail/spec

The types of [NovaTrail](https://github.com/altnovatrail)'s module format for TypeScript. The package covers:
- the parts of a module and their open views;
- the canonical view and the inventory of a package;
- the module index;
- the test vectors.

They are generated from the format's schemas, [`format/schemas`](https://github.com/altnovatrail/spec/tree/main/format/schemas) in `altnovatrail/spec`, by its `tools/types`. Go code takes the same types from the Go module `github.com/altnovatrail/spec`, at the same tag.

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

A type gives the shape of a value and nothing more: the schemas decide what is valid. Code that reads a value from elsewhere checks it against its schema first.

The package is read through its `exports`, under `"moduleResolution": "nodenext"`, `"node16"` or `"bundler"`.

## Versions

The package's version is the tag of the release of `altnovatrail/spec` it comes from, without its `v`: 0.4.0 is `v0.4.0`. Every release from the line 0.4 on carries one, even when the types have not changed. Take it at an exact version, the same tag as any submodule or Go module of `spec` you hold, and move all of them together.

## Checking the archive

The archive in npm is the file `altnovatrail-spec-<version>.tgz` of that release, which the release signs with cosign and whose attestation names it. To check it:

```sh
npm pack @altnovatrail/spec@0.4.0
gh release verify-asset v0.4.0 altnovatrail-spec-0.4.0.tgz -R altnovatrail/spec
```

The release publishes that file to npm itself, by trusted publishing, and npm gives each version it publishes that way a provenance attestation. The provenance names `.github/workflows/release.yml` of `altnovatrail/spec` and the commit of the run that published it. That commit is the tip of `main` when the run began, which is not always the commit the release was cut from. The release's attestation names the release's own commit, and `gh release verify-asset` is what ties the archive to it. 0.4.0 was published by hand and has no provenance. Not every release of the line has a version in npm, so take a tag whose version is there.

## License

[Apache-2.0](https://github.com/altnovatrail/spec/blob/main/LICENSE).
