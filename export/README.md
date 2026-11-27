# The format of the export

This folder holds the format of the export: the file that the owner of an account gets of a learner's profile or of the whole account, with every datum the platform keeps of them but secrets and service fields, in an open format that reads without a library (R09, R135). `app` builds the file, of the part that `api` gives it and of what the device holds (R98). It is normative (R42, R135), and its terms are those of the glossary, concepts 15.

## 1. About the part

- **Who builds what.** `api` gives its part by `ExportProfile` or `ExportAccount`: bytes in this format, and the format's version ([the API contracts](../contracts/README.md), section 15). `app` puts those bytes into the file as they are, without reading them, beside its own part of what the device holds of each profile, each stored work of a profile, which it reads by `GetWork` one at a time (R151), each page from the profile's paper, which the device alone holds (R162), and a manifest (R98). Works on another device are exported from that device (architecture 4.5).
- **One form for two scopes.** The export of a profile holds that profile alone; the export of the account holds the account and every profile it has. The files of a profile are the same in both.
- **Open and whole.** The export is a ZIP of files of JSON, which every system opens with no program of its own. What the platform keeps as bytes of protobuf — the evidence log, the state of the model, the observation — is in it as the JSON of the same value, by protobuf's JSON mapping with the fields' names as in the `.proto` file, and those `.proto` files are in the export too, so that the export says what each field is and the bytes can be built again from it (R10 learner-model).
- **What is not in it.** A secret or a service field of `api` — the sign-in user's ID, the hash of the PIN and its counter and lock, the binding of an invite code, the seed of an attempt, the keys of idempotency, the tuples of OpenFGA (R21 api); the own key (R84); the minimal record of a consent after a deletion, which names no account (R117); the scan of a parent's form, which the operator keeps (R116); what the device keeps for itself — its caches, media, the session, the voices and the key (R04 app).

## 2. Versions

- **The part** has a version of its own, an integer, in `VERSION` and in the field `format` of every file of JSON of an export: the layout, the schemas of the files and the rules of section 5. `export_format_version` of the contract is the same integer written in decimal, `"6"`.
- **What a release holds to.** Within the line of the release before it, and under the same `VERSION`, `release-version` refuses a change of the schema of a file — `manifest`, `account`, `profile`, `device`, `work` or `paper` — or of `common`, once its annotations — `title`, `description`, `$comment` and `examples` — are taken out at every level, and a change of the list of the IDs of the rules of section 5, in their order, as it does for the deployment configuration ([the deployment configuration](../deployment/README.md), section 2). A new field, a new kind of record, a new rule is a new `VERSION`, and so is a new file of the layout or of `schemas/`: `release-version` refuses a schema of a file added or taken out under the same `VERSION` too.
- A change that gives the part a new `VERSION` also starts a new line of `spec`'s releases. A version number never goes back and is never reused.
- Version 1 comes out with `v0.14.0`, the first release of `spec`'s line 0.14.
- Version 2 comes out with `v0.17.0`, the first release of the line 0.17: a profile's stored works, `works`, each as the device holds it — its history of writing, the contexts of its submissions and its picture, the PNG of its strokes in base64 —, in place of the artefacts that carried an essay's text, and a work's kind is handwriting, an essay or a drawing, with no recording (R135; R113).
- Version 3 comes out with `v0.18.0`, the first release of the line 0.18: a profile's file names its stored works without their bytes — the attempt, the kind, when `api` kept it and the size, as `ListWorks` names it —, and each work is a file of its own beside `api.zip`, which `app` writes as `GetWork` gives it, so that no answer of `api` is larger than a work; the rule `export.works` holds the two to each other (R151; R135).
- Version 4 comes out with `v0.19.0`, the first release of the line 0.19: each page from the learner's paper that the device holds is a file of its own beside `api.zip`, `paper/<profile id>/<page id>.json` — the photo, its task frames, and each picked task's crop and work —, which the rule `export.paper` holds to the profiles; a profile has its hint mode; and a record of the evidence log is of an attempt, `attempt_id`, or of an adult's correction of a module's level, `correction_id`, never both (R162; R157; R135).
- Version 5 comes out with `v0.20.0`, the first release of the line 0.20: an open attempt of a task from paper no longer says where the key of each of its tasks came from, `key_sources`, since a model judges the work and the task has no key; and a submission's verdict, of an item and of an answer slot, may be `so_far_correct` on such an attempt, a slot with no answer yet and a solution with no error (R162; R135).
- Version 6 comes out with `v0.22.0`, the first release of the line 0.22: a connected module names the task skill the learner chose for its tasks, `task_skill`; a choice names the module whose tasks alone it was among, or the module of a lesson the learner chose, `module_id`; and a choice's reason code may be `lesson_chosen`, a lesson the learner opened from the module's lessons (R176; R135).
- **An earlier version stays readable.** A release file of the part never changes, so version 5 stays as `export-5.tar.gz` of the lines 0.20 and 0.21 holds it, version 4 as `export-4.tar.gz` of the line 0.19 holds it, version 3 as `export-3.tar.gz` of the line 0.18 holds it, version 2 as `export-2.tar.gz` of the line 0.17 holds it — its text, its schemas and its vectors —, and version 1 as `export-1.tar.gz` of the lines 0.14 to 0.16; an export of an earlier version is read by that version (section 5).

## 3. Files

```
export/
├── README.md     this text
├── VERSION       the part's version, an integer
├── schemas/      manifest, account, profile, device, work and paper .schema.json, the files of an export's; common.schema.json, what they share; reading-vector.schema.json, a vector's
├── examples/     <term>/{valid,invalid}/<case>.yaml, files of an export
└── vectors/      reading/<case>.yaml
```

- A schema is in JSON Schema 2020-12 and follows the conventions of the module format's schemas ([the module format](../format/README.md), section 5). Its `$id` is `https://altnovatrail.github.io/spec/export/`, then the version, a slash and the file name.
- The examples and the vectors are YAML by the YAML rules of the module format ([the module format](../format/README.md), section 4). They are synthetic: no learner's data (RULES.md, Hard rules).
- A file that the layout above does not name is an error.

**An export** is a ZIP file, its names in UTF-8, every entry stored or deflated, no name absolute, none with a part `..`, and no two the same:

```
<export>.zip
├── manifest.json             the manifest, which app writes
├── api.zip                   the part of api, byte for byte as the method gave it
│   ├── account.json          the account: only in the export of the account
│   ├── profiles/<id>.json    a profile and every record of it, by the profile's ID
│   └── proto/…/<name>.proto  the .proto files the records of protobuf are written by
├── device/<id>.json          what this device holds of a profile, by the profile's ID
├── works/<id>/<attempt>.json a stored work, by the profile's ID and the attempt's, as GetWork gave it
└── paper/<id>/<page>.json    a page from paper the device holds, by the profile's ID and the page's
```

A reader opens the export, then `api.zip`; this text names the files of `api.zip` as under `api/`, as `api/profiles/<id>.json`. A file of JSON is UTF-8, with no byte order mark.

## 4. The files

`schemas/` holds each file's fields; what each holds is here.

| File | Schema | What it holds |
|---|---|---|
| `manifest.json` | `manifest.schema.json` | `format`, the part's version; `scope`, `profile` or `account`; when `app` built the export, in UTC; the version of the build of `app`; and `api_format`, the version the method named, as the string it gave |
| `api/account.json` | `account.schema.json` | `format`; the account's fields that are no secret — the owner's statement that they are 18 or older with its date, the plan, the family's offset from UTC and the end of its day of quota, the day of the last request — the account's counters of quota, and every consent of the account in full: who gave it — the owner, a parent or the learner —, when, how it was confirmed, its state, for one that waits the category and country, for a parent's the code of its request and where its form stands, and the IDs and versions of the texts it was given to (R116, R130, R131; R136) |
| `api/profiles/<id>.json` | `profile.schema.json` | `format`; the profile with every field privacy 4 names, the day its age was given and the age of digital consent its category was given by (R134); its connected modules, each with its task skill; its attempts, without the seed, each with its observations as JSON of `novatrail.observation.v1`, its verdicts, traps, hints and techniques, and how it ended; its open attempts of tasks from paper, those of one page, each with its wrong answers, rungs and submissions, without the model's hidden solution and answer, which never reach the device (R05; R162); its submissions with a rubric and the mark of each criterion (R87); its runs of lessons; the engine's choices with their reason codes; its evidence log and its current state, as JSON of `novatrail.learnermodel.v1`, each entry with the columns `api` keeps beside it — and, for each module of the log, the version whose graph the state was computed by, or that it has none (R08 api); its stored works, newest first, when storage is on, each named without its bytes, as `ListWorks` names it — the attempt, the kind, when `api` kept it and the size — ([the API contracts](../contracts/README.md), section 15; R151), whether storage is on, and each consent to it, with the version of `storage-consent` and when it was switched off (R113, R131); the reports of a problem with the tutor's words that `api` keeps, until the operator reviewed them and for a year after (R123; R136); and its counters of quota |
| `device/<id>.json` | `device.schema.json` | `format` and the profile's ID; what this device holds of the profile: the writing history of each unfinished attempt — strokes with their times and pressure, as the element `<novatrail-canvas>` gives them —, the context of each submission, the state of the solving steps, the essays with what was read and the feedback by the rubric, and the place in each lesson with its state of showing (R04, R05, R06 app) |
| `paper/<id>/<page>.json` | `paper.schema.json` | `format`, the profile's ID and the page's, as `app` gave it; when the learner took or picked the photo; the photo, a JPEG or a PNG without the metadata of its file, in base64; the task frames, each a box in whole thousandths of the photo and who drew it, the AI or the learner; and each picked task: its attempt, its frame by its place, its crop as `app` cut it, in base64, its history of writing — the sheet's strokes and the tracing paper's —, where the tracing paper lay and its scale, and the context of each submission with how many events of the history it covers, as the element `<novatrail-canvas>` gave them (R162; privacy 4.1) |
| `works/<id>/<attempt>.json` | `work.schema.json` | `format`, the profile's ID and the attempt's; the stored work as `GetWork` gives it: its kind, when `api` kept it, its history of writing and the context of each submission as the JSON values their bytes hold, not as protobuf's JSON mapping writes bytes, with how many events of the history each covers, and its picture, the PNG in base64 (R113, R151) |

- **Times and days.** A time is RFC 3339 in UTC, `2026-11-10T09:30:00Z`; a day is `YYYY-MM-DD`. An ID is a string as `api` or `app` gives it. An ID that names a file — a profile's, an attempt's of a stored work and a page's from paper — is one part of a path: letters, digits, `-`, `_` and `.`, the first not a `.`, so that it is never `.` or `..` and holds no `/` (`file_id` of `common.schema.json`); and no two profiles of an export, nor two stored works or two pages of a profile, have IDs that differ in the case of their letters alone (section 5, `export.case`).
- **The stored works.** For each stored work the profile's file of `api.zip` names, `app` reads the work by `GetWork`, by the action the export is made by, and writes it as its file, one at a time (R151). A work that `GetWork` gives with another time than the profile's file names, since a device put it again meanwhile, or does not give, `CAUSE_NOT_FOUND`, since it was erased, makes `app` begin the export again from `ExportProfile` or `ExportAccount`: the export holds the works its part of `api` names, and only them (section 5, `export.works`). `app` begins again at most three times in a row: if the third new beginning finds a work changed or gone as well — a learner at work on another device —, `app` hands over no file and tells the owner that the works are changing on another device and to try again later, so that an export is always whole (R135).
- **The pages from paper.** A page from the learner's paper is the device's alone: the server keeps neither its photo nor its crops nor its work, not even as a stored work (R113; R162). `app` writes each page the profile's history holds as its file, and the part of `api` names none of them; the part of `api` holds their attempts only while they are open, as `paper_attempts`, and never in the profile's evidence (privacy 4.1).
- **A work in two places.** When storage on the server is on, a work may be in `works/<id>/<attempt>.json` as a stored work, the last one a device put, and in `device/<id>.json` as the device holds it now. Both go in as they are; a reader knows them for one by the attempt's ID.
- **Withdrawn versions.** The evidence of a version of a module the index withdrew stays in the log, as the log stays (R80).

## 5. Reading an export

A reader — `app` before it hands the file over, this part's check, any program the owner takes it to — accepts an export in two steps, and refuses it at the first step that finds something wrong. It reads the export unpacked: its files by their paths, those of `api.zip` under `api/`.

**The version.** The steps below are those of version 6. A reader that reads an earlier version too reads the field `format` of `manifest.json` first, and an export of version 5, 4, 3 or 2 it reads by section 5 of that version and its schemas, as `export-5.tar.gz`, `export-4.tar.gz`, `export-3.tar.gz` and `export-2.tar.gz` hold them (section 2). A reader of version 6 alone refuses an export of another version by the schema, step 1. `app` builds version 6, and this part's check and its vectors read version 6. A part of `api` of another version, by `export_format_version`, `app` puts into no export: it offers to reload ([the API contracts](../contracts/README.md), section 15).

1. **The schema.** Each file of JSON passes its schema by section 4. What a schema refuses is named by the file's path and the place in the file, joined by `#`: the names of the fields from the root joined by `.`, the index of an item of a list among them, such as `api/profiles/p1.json#age_category`, or by the file's path alone when its root is refused.
2. **The rules.** An export whose files pass their schemas breaks none of the rules below. They are read in the order of the table, and the first one broken refuses it. A rule names what breaks it — a file by its path, or a place in it as the schema names one —, every name it finds, in the order of code units.

| ID | Rule |
|---|---|
| `export.files` | The export MUST hold `manifest.json`, and every file MUST be one the layout of section 3 names: the manifest, the account, a profile's file, a file of `.proto` under `api/proto/`, a device's file, a stored work's file under `works/`, or a page's file under `paper/`. |
| `export.scope` | An export of the scope `account` MUST hold `api/account.json`; one of the scope `profile` MUST hold no account and exactly one profile's file. |
| `export.profiles` | A profile's file MUST be named by the ID of the profile it holds; an export of the account MUST hold the file of each profile its `profile_ids` lists, and of no other; and a device's file MUST be named by the ID of a profile that the part of `api` holds, which it names too. |
| `export.works` | A profile's file MUST name the stored work of an attempt once. Each stored work that a profile's file names MUST have its file, `works/<id>/<attempt>.json`, by the ID the profile's file is named by and the attempt's; and each file under `works/` MUST be of a work that a profile's file names: its `profile_id` and `attempt_id` those its path names, and its `kind` and `stored_at` those the profile's file names, `stored_at` the same instant, whatever digits of the fraction of a second write it. |
| `export.paper` | A page's file, `paper/<id>/<page>.json`, MUST be of a profile whose file the part of `api` holds, by the ID its path names, and its `profile_id` and `page_id` MUST be those its path names; each of its tasks MUST name by `frame` one of the page's frames; and an attempt MUST be the task of one page of a profile, once. |
| `export.case` | No two profiles' files of an export, no two stored works' files of a profile, and no two pages' files of a profile MUST have IDs that are one once the capital letters `A`–`Z` are read as small, `p-1` and `P-1`: a file system that does not tell letter case apart would make their files and folders one when the export is unpacked. The rule names the files of each such profile, work or page. |
| `export.proto` | An export with a profile MUST hold the `.proto` files of `novatrail.learnermodel.v1` — `common.proto`, `evidence.proto` and `state.proto` —, since a profile always has its state, and one with a submission, of a task of a module or of a task from paper — whose answer slots and observation are messages of `novatrail.observation.v1` — `novatrail/observation/v1/observation.proto`, under `api/proto/`. |

- A reader MUST NOT accept an export that one step refuses. `app` builds the export, reads it as this section does, and hands over only an export it accepts.

## 6. Examples

`examples/<term>/` holds files of an export that their schema accepts, under `valid/`, and files it refuses, under `invalid/`. An invalid example breaks the schema in one way only. An example is no test of section 5's rules: the vectors are.

## 7. Test vectors

A vector of reading, `vectors/reading/<case>.yaml`, passes `schemas/reading-vector.schema.json`: a list of cases, each an export unpacked — its files by their paths, each file of JSON as a value and each `.proto` file as its text — and what section 5 gives: that the reader accepts it, or the step that refuses it and the names it gives. Between them, the vectors accept an export and refuse one by the schema and by each rule. A reader implements section 5 and gets exactly that.

## 8. Who reads it

- **`api`** writes `api.zip` by this part, from `spec`'s Go module at the tag it pins, as `spec.Export` (R64), and names the version in `export_format_version`. The evidence and the state it writes as the JSON of their messages, with the `.proto` files of the version of `learner-model` it runs, from that version's release file, which `release-verify` accepted (R77; R10 learner-model).
- **`app`** writes the manifest, the files of the device, the stored works, each from `GetWork`, and the pages from paper, puts `api.zip` in as it is, reads the export by section 5, and gives the owner the file; the types of the files are `@altnovatrail/spec/exportv6`.
- **Whoever gets the export** reads it with any program that opens a ZIP and JSON, and builds the bytes of protobuf again from the JSON and the `.proto` files, by `buf convert` or any implementation of protobuf.

## 9. Changing the part

The part's layout, the shape of its schemas and its rules change only by a decision that amends R135 or replaces it, and with a new `VERSION` (section 2): a new field, a new kind of record, a new rule or a new file. The annotations of a schema — `title`, `description`, `$comment` and `examples` — and the examples and test vectors change within a version, as `release-version` lets them (`tools/release/export-line.mjs`; R135).
