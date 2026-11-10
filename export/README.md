# The format of the export

This folder holds the format of the export: the file that the owner of an account gets of a learner's profile or of the whole account, with every datum the platform keeps of them but secrets and service fields, in an open format that reads without a library (R09, R135). `app` builds the file, of the part that `api` gives it and of what the device holds (R98). It is normative (R42, R135), and its terms are those of the glossary, concepts 15.

## 1. About the part

- **Who builds what.** `api` gives its part by `ExportProfile` or `ExportAccount`: bytes in this format, and the format's version ([the API contracts](../contracts/README.md), section 15). `app` puts those bytes into the file as they are, without reading them, beside its own part of what the device holds of each profile, and a manifest (R98). Works on another device are exported from that device (architecture 4.5).
- **One form for two scopes.** The export of a profile holds that profile alone; the export of the account holds the account and every profile it has. The files of a profile are the same in both.
- **Open and whole.** The export is a ZIP of files of JSON, which every system opens with no program of its own. What the platform keeps as bytes of protobuf — the evidence log, the state of the model, the observation — is in it as the JSON of the same value, by protobuf's JSON mapping with the fields' names as in the `.proto` file, and those `.proto` files are in the export too, so that the export says what each field is and the bytes can be built again from it (R10 learner-model).
- **What is not in it.** A secret or a service field of `api` — the sign-in user's ID, the hash of the PIN and its counter and lock, the binding of an invite code, the seed of an attempt, the keys of idempotency, the tuples of OpenFGA (R21 api); the own key (R84); the minimal record of a consent after a deletion, which names no account (R117); the scan of a parent's form, which the operator keeps (R116); what the device keeps for itself — its caches, media, the session, the voices and the key (R04 app). A report of a problem gets its kind of data with T103 of RUN.md, and comes with a new version of this part.

## 2. Versions

- **The part** has a version of its own, an integer, in `VERSION` and in the field `format` of every file of JSON of an export: the layout, the schemas of the files and the rules of section 5. `export_format_version` of the contract is the same integer written in decimal, `"1"`.
- **What a release holds to.** Within the line of the release before it, and under the same `VERSION`, `release-version` refuses a change of the schema of a file — `manifest`, `account`, `profile` or `device` — or of `common`, once its annotations — `title`, `description`, `$comment` and `examples` — are taken out at every level, and a change of the list of the IDs of the rules of section 5, in their order, as it does for the deployment configuration ([the deployment configuration](../deployment/README.md), section 2). A new field, a new kind of record, a new rule is a new `VERSION`, and so is a new file of the layout or of `schemas/`: `release-version` refuses a schema of a file added or taken out under the same `VERSION` too.
- A change that gives the part a new `VERSION` also starts a new line of `spec`'s releases. A version number never goes back and is never reused.
- Version 1 comes out with `v0.14.0`, the first release of `spec`'s line 0.14.

## 3. Files

```
export/
├── README.md     this text
├── VERSION       the part's version, an integer
├── schemas/      manifest, account, profile and device .schema.json, the files of an export's; common.schema.json, what they share; reading-vector.schema.json, a vector's
├── examples/     <term>/{valid,invalid}/<case>.yaml, files of an export
└── vectors/      reading/<case>.yaml
```

- A schema is in JSON Schema 2020-12 and follows the conventions of the module format's schemas ([the module format](../format/README.md), section 5). Its `$id` is `https://altnovatrail.github.io/spec/export/`, then the version, a slash and the file name.
- The examples and the vectors are YAML by the YAML rules of the module format ([the module format](../format/README.md), section 4). They are synthetic: no learner's data (RULES.md, Hard rules).
- A file that the layout above does not name is an error.

**An export** is a ZIP file, its names in UTF-8, every entry stored or deflated, no name absolute, none with a part `..`, and no two the same:

```
<export>.zip
├── manifest.json            the manifest, which app writes
├── api.zip                  the part of api, byte for byte as the method gave it
│   ├── account.json         the account: only in the export of the account
│   ├── profiles/<id>.json   a profile and every record of it, by the profile's ID
│   └── proto/…/<name>.proto the .proto files the records of protobuf are written by
└── device/<id>.json         what this device holds of a profile, by the profile's ID
```

A reader opens the export, then `api.zip`; this text names the files of `api.zip` as under `api/`, as `api/profiles/<id>.json`. A file of JSON is UTF-8, with no byte order mark.

## 4. The files

`schemas/` holds each file's fields; what each holds is here.

| File | Schema | What it holds |
|---|---|---|
| `manifest.json` | `manifest.schema.json` | `format`, the part's version; `scope`, `profile` or `account`; when `app` built the export, in UTC; the version of the build of `app`; and `api_format`, the version the method named, as the string it gave |
| `api/account.json` | `account.schema.json` | `format`; the account's fields that are no secret — the owner's statement that they are 18 or older with its date, the plan, the family's offset from UTC and the end of its day of quota, the day of the last request — the account's counters of quota, and every consent of the account in full: who gave it, when, how it was confirmed, its state, for one that waits the category and country, and the ID and version of the text it was given to (R116, R130, R131) |
| `api/profiles/<id>.json` | `profile.schema.json` | `format`; the profile with every field privacy 4 names, the day its age was given and the age of digital consent its category was given by (R134); its connected modules; its attempts, without the seed, each with its observations as JSON of `novatrail.observation.v1`, its verdicts, traps, hints and techniques, and how it ended; its submissions with a rubric and the mark of each criterion (R87); its runs of lessons; the engine's choices with their reason codes; its evidence log and its current state, as JSON of `novatrail.learnermodel.v1`, each entry with the columns `api` keeps beside it — and, for each module of the log, the version whose graph the state was computed by, or that it has none (R08 api); its stored artefacts, when storage is on (R113); and its counters of quota |
| `device/<id>.json` | `device.schema.json` | `format` and the profile's ID; what this device holds of the profile: the writing history of each unfinished attempt — strokes with their times and pressure, as the element `<novatrail-canvas>` gives them —, the context of each submission, the state of the solving steps, the essays with what was read and the feedback by the rubric, and the place in each lesson with its state of showing (R04, R05, R06 app) |

- **Times and days.** A time is RFC 3339 in UTC, `2026-11-10T09:30:00Z`; a day is `YYYY-MM-DD`. An ID is a string as `api` or `app` gives it.
- **A work in two places.** When storage on the server is on, a work may be in `api/profiles/<id>.json` as an artefact and in `device/<id>.json` as the device holds it. Both go in as they are; a reader knows them for one by the attempt's ID.
- **Withdrawn versions.** The evidence of a version of a module the index withdrew stays in the log, as the log stays (R80).

## 5. Reading an export

A reader — `app` before it hands the file over, this part's check, any program the owner takes it to — accepts an export in two steps, and refuses it at the first step that finds something wrong. It reads the export unpacked: its files by their paths, those of `api.zip` under `api/`.

1. **The schema.** Each file of JSON passes its schema by section 4. What a schema refuses is named by the file's path and the place in the file, joined by `#`: the names of the fields from the root joined by `.`, the index of an item of a list among them, such as `api/profiles/p1.json#age_category`, or by the file's path alone when its root is refused.
2. **The rules.** An export whose files pass their schemas breaks none of the rules below. They are read in the order of the table, and the first one broken refuses it. A rule names what breaks it — a file by its path, or a place in it as the schema names one —, every name it finds, in the order of code units.

| ID | Rule |
|---|---|
| `export.files` | The export MUST hold `manifest.json`, and every file MUST be one the layout of section 3 names: the manifest, the account, a profile's file, a file of `.proto` under `api/proto/`, or a device's file. |
| `export.scope` | An export of the scope `account` MUST hold `api/account.json`; one of the scope `profile` MUST hold no account and exactly one profile's file. |
| `export.profiles` | A profile's file MUST be named by the ID of the profile it holds; an export of the account MUST hold the file of each profile its `profile_ids` lists, and of no other; and a device's file MUST be named by the ID of a profile that the part of `api` holds, which it names too. |
| `export.proto` | An export with a profile MUST hold the `.proto` files of `novatrail.learnermodel.v1` — `common.proto`, `evidence.proto` and `state.proto` —, since a profile always has its state, and one with a submission — whose answer slots and observation are messages of `novatrail.observation.v1` — `novatrail/observation/v1/observation.proto`, under `api/proto/`. |

- A reader MUST NOT accept an export that one step refuses. `app` builds the export, reads it as this section does, and hands over only an export it accepts.

## 6. Examples

`examples/<term>/` holds files of an export that their schema accepts, under `valid/`, and files it refuses, under `invalid/`. An invalid example breaks the schema in one way only. An example is no test of section 5's rules: the vectors are.

## 7. Test vectors

A vector of reading, `vectors/reading/<case>.yaml`, passes `schemas/reading-vector.schema.json`: a list of cases, each an export unpacked — its files by their paths, each file of JSON as a value and each `.proto` file as its text — and what section 5 gives: that the reader accepts it, or the step that refuses it and the names it gives. Between them, the vectors accept an export and refuse one by the schema and by each rule. A reader implements section 5 and gets exactly that.

## 8. Who reads it

- **`api`** writes `api.zip` by this part, from `spec`'s Go module at the tag it pins, as `spec.Export` (R64), and names the version in `export_format_version`. The evidence and the state it writes as the JSON of their messages, with the `.proto` files of the version of `learner-model` it runs, from that version's release file, which `release-verify` accepted (R77; R10 learner-model).
- **`app`** writes the manifest and the files of the device, puts `api.zip` in as it is, reads the export by section 5, and gives the owner the file; the types of the files are `@altnovatrail/spec/exportv1`.
- **Whoever gets the export** reads it with any program that opens a ZIP and JSON, and builds the bytes of protobuf again from the JSON and the `.proto` files, by `buf convert` or any implementation of protobuf.

## 9. Changing the part

The part's layout, schemas and rules change only by a decision that amends R135 or replaces it, and with a new `VERSION` (section 2).
