# @altnovatrail/spec

The types of [NovaTrail](https://github.com/altnovatrail)'s module format for TypeScript, from 0.8.0 on those of its admission table, from 0.11.0 on those of its deployment configuration, from 0.13.0 on those of the passport of its legal texts, and from 0.14.0 on those of its table of the age of digital consent and of the files of its export. The package covers:
- the parts of a module and their open views;
- the canonical view and the inventory of a package;
- the module index;
- the test vectors.

They are generated from the format's schemas, [`format/schemas`](https://github.com/altnovatrail/spec/tree/main/format/schemas) in `altnovatrail/spec`, by its `tools/types`. Go code takes the same types from the Go module `github.com/altnovatrail/spec`, at the same tag.

From 0.5.0 on, the package also holds the types of the element `<novatrail-canvas>`: the contract between the canvas and the learner's app. These are written by hand rather than generated, and only TypeScript has them.

From 0.8.0 on, it holds the types of the admission table too: which AI provider, on which route to AI, may receive the work of a learner of which age category ([the table's text](https://github.com/altnovatrail/spec/blob/main/admission/README.md)). They are generated from its schemas, `admission/schemas`, as the format's are.

From 0.10.0 on, it holds the page of the workbook too, which format 0.4 makes a rule: `@altnovatrail/spec/format/page.json`, the numbers and the widths by which every page is laid out, and `@altnovatrail/spec/format/vectors/pages/<case>.json`, the test vectors of the page, each the JSON of the format's [`page.yaml`](https://github.com/altnovatrail/spec/blob/main/format/page.yaml) and of its vectors, `format/vectors/pages/` ([the format's text](https://github.com/altnovatrail/spec/blob/main/format/README.md), section 14). A canvas reads them to lay its page out, and its tests check its layout against the vectors; their types are `Page` and `PageVector` of `formatv0`.

From 0.11.0 on, it holds the types of the deployment configuration too: the file `/deployment.json`, which the learner's app reads at its start from the root of its origin, with the origin of the platform's API and the parameters of the sign-in service ([the format's text](https://github.com/altnovatrail/spec/blob/main/deployment/README.md)). They are generated from its schemas, `deployment/schemas`, as the format's are, and the fields of the file keep their names in camelCase, such as `signIn.apiKey`.

From 0.13.0 on, it holds the types of the legal texts' passport too, `legal/legal.yaml`: each text of the platform — the privacy policy, the terms of use, the consents and the forms —, where it is shown, its versions with their status, the date each came into force and its gist in each language of the interface, and the sets of texts of the samples page ([the part's text](https://github.com/altnovatrail/spec/blob/main/legal/README.md)). The words of each version are a Markdown file of their own, `legal/texts/<id>/<n>.md`, which no type holds. They are generated from the part's schemas, `legal/schemas`, as the format's are.

From 0.15.0 on, `@altnovatrail/spec/legalv2` takes the place of `@altnovatrail/spec/legalv1`: the types of the part's version 2, whose version of a text may name its `translations` into languages of the interface other than English, each a Markdown file of its own, `texts/<id>/<n>.<tag>.md`, with no force of its own. A consumer of 0.14 that imports `legalv1` imports `legalv2` from 0.15 on.

From 0.17.0 on, `@altnovatrail/spec/legalv3` takes the place of `@altnovatrail/spec/legalv2`: the types of the part's version 3, whose `in_force_since` is the day from which a version applies, which may be later than the day it was approved, and whose test vector of reading names the day it reads a part on, `today`, and gives the next versions, `next`, beside the current ones. A consumer of 0.16 that imports `legalv2` imports `legalv3` from 0.17 on.

From 0.14.0 on, it holds the types of the table of the age of digital consent too, `consent-age/consent-age.yaml`: for each country, by its code of ISO 3166-1 alpha-2, the age from which a learner gives consent themselves, from the day it applies, with the law and the provision that set it, a quote of the provision, its source and the date it was read ([the part's text](https://github.com/altnovatrail/spec/blob/main/consent-age/README.md)). `Country` is the 249 codes ISO 3166-1 assigns officially, which a screen may take as the countries it offers. They are generated from the part's schemas, `consent-age/schemas`, as the format's are.

From 0.14.0 on, it holds the types of the files of an export too: the file the owner of an account gets of a profile or of the whole account — its manifest, the account, a profile with every record of it and what a device holds of it ([the part's text](https://github.com/altnovatrail/spec/blob/main/export/README.md)). A field that holds the JSON of a message of protobuf, or a value of `<novatrail-canvas>`, is `unknown`. They are generated from the part's schemas, `export/schemas`, as the format's are.

From 0.17.0 on, `@altnovatrail/spec/exportv2` takes the place of `@altnovatrail/spec/exportv1`: the types of the part's version 2, whose profile carries its stored works, `works`, each with its history of writing, the contexts of its submissions and its picture, in place of `artefacts`. A consumer of 0.16 that imports `exportv1` imports `exportv2` from 0.17 on.

The types are declarations alone, with no code to run, so import them with `import type`; the page's JSON is data, which a module imports with `with { type: "json" }` or reads as a file:

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
- **`@altnovatrail/spec/admissionv0`** holds the types of the admission table's major version 0: the table, with its providers, deployment facts, rules of capabilities and cells, and the test vectors of the admission function's answers.
- **`@altnovatrail/spec/deploymentv1`** holds the types of the deployment configuration's version 1: the file, `Deployment`, and the test vectors of reading it, `ReadingVector`, whose file is any JSON value, `unknown`. A type gives the shape alone: a reader checks the file against its schema and then against the rules of reading, section 5 of the format's text.
- **`@altnovatrail/spec/legalv3`** holds the types of version 3 of the legal texts: the passport, `Legal`, with each `Text` and its `TextVersion` with its `translations`, each `Set` and its `SetVersion`, and the test vectors of reading the part, `ReadingVector`, whose passport is any JSON value, `unknown`. A type gives the shape alone: a reader checks the passport against its schema and then the part against the rules of reading, section 5 of the part's text.
- **`@altnovatrail/spec/consentagev1`** holds the types of version 1 of the table of the age of digital consent: the table, `ConsentAge`, with each country's `Entry`, the `Country` codes, and the test vectors of reading the table, `ReadingVector`, whose table is any JSON value, `unknown`, and of the category, `CategoryVector`. A type gives the shape alone: a reader checks the table against its schema and then against the rules of reading, section 5 of the part's text, and computes a learner's category as the part's text says.
- **`@altnovatrail/spec/exportv2`** holds the types of version 2 of the format of the export: `Manifest`, `Account`, `Profile` with its `Attempt`, `Submission`, `Choice`, `EvidenceEntry`, `StateEntry` and `Work`, `Device`, and the test vectors of reading an export, `ReadingVector`. A type gives the shape alone: a reader checks each file against its schema and then the export against the rules of reading, section 5 of the part's text.
- **`@altnovatrail/spec/canvas`** holds the types of `<novatrail-canvas>`:
  - `CanvasElement`, which describes the element's properties `tool`, `task`, `workedExample`, `demoState`, `manifest`, `media`, `history`, `marks` and `filled` and its method `exportWork()`;
  - `Media`, the function by which the consumer gives the files of the pictures: the canvas goes to no network;
  - the events `toolchange`, `historychange` and `demochange`, with `CanvasEventMap` naming them;
  - the state of a worked example's demo, `DemoState`;
  - the history of writing;
  - the work for checking, with the context of its submission;
  - the tutor's marks of a submission, `Marks`, `Mark` and `Anchor`: their kind and place come from the contract between the app and the platform's API, the message `Mark` of `novatrail.api.v1` in the npm package `@altnovatrail/contracts`, and their name from the app.

  Its unions are exact: an event of the history is told by its `kind`, and the work of a sheet or of a workbook by its key, `png` or `cells`. The declarations need the DOM's types, so the consumer's `lib` must include `dom`. The package registers nothing. The canvas's own package puts the element in `HTMLElementTagNameMap` and its events in `GlobalEventHandlersEventMap`.

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
