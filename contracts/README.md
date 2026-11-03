# The NovaTrail API contracts

This is the text of the API contracts: how the messages and services that NovaTrail's parts exchange are written in protobuf, which rules buf holds them to, how they are versioned, which code is generated from them, and what each contract means and which rules its parts follow. It is normative, as are the `.proto` files beside it (R42). The documents under `docs/` describe the platform in Russian and add no rules to the contracts. The decision behind sections 1 to 9 is R83, behind section 10, the observation, R86, behind section 11, the sample file, R93, behind section 12, the rules the device and the runner share, R94, behind the markup of section 11 and sections 13 and 14, eval sets and the runner's report, R95, and behind section 15, the contract between `app` and `api`, R97.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

## 1. About the contracts

- An API contract — a contract, in this text — is a protobuf package: its messages, and the services one part of the platform calls on another (R11). The contract of the element `<novatrail-canvas>` with `app` is not one: it is TypeScript types, written by hand (R36, R74). The first ones are the observation, which `tutor`, `module-kit` and `api` exchange in one process (R15), and the contract between `app` and `api`.
- The contracts are the `.proto` files under `contracts/` and this text. The code generated from them is no part of the contract: it follows from the files (section 8).
- The names in the contracts are the English terms of the glossary, concepts 15. A value or an ID of the module format keeps the spelling the format gives it (section 5).
- The first package is `novatrail.observation.v1`, the observation (section 10). The second is `novatrail.eval.v1`, the eval protocol: the sample file with its markup (section 11), the rules of the strokes on a sheet that the device and the runner share (section 12), eval sets (section 13) and the runner's report (section 14). The third is `novatrail.api.v1`, the contract between `app` and `api` (section 15). The other tasks of epic E3 add theirs, each by the rules of this text.

## 2. Versions

- A contract has no version of its own beside its package. Its version is the last component of its package, `v1`, and the tag of `spec` in which a file came out.
- Within a package a change MUST only add: a new message, field, enum value, service or method. `buf breaking` holds this against the previous release of `spec` (section 7). Such a change comes out in any release of the line.
- A change of what a contract means breaks it too, though buf sees none: another meaning of a field or an enum value, or another rule of how a part of the platform reads a message — such as how two observations are joined, or which verdict an observation gives (section 10). Whatever can give another result on the same message is such a change. A new enum value, or a new field, whose meaning changes none of the old ones, only adds.
- A change that would break a package MUST come as a new package, `v2`, beside the old one. A package `vN` with N of 2 or more, beside its `v(N−1)`, opens a new line of `spec`, as a new version of the module format does (R44). The first package `v1` of a new part opens none. A version of a package is never reused.
- A server holds two major packages of a contract: the current one and the previous one. A client reads the package it was built with. Within a major package, a client older than the server works with it, since both sides of the transport skip the fields they do not know (section 9).

## 3. Files and names

- A file MUST lie at `contracts/novatrail/<part>/v1/<name>.proto`, and its package MUST be `novatrail.<part>.v1`: the path from `contracts/` repeats the package, as buf's rule `PACKAGE_DIRECTORY_MATCH` asks. `<part>` and `<name>` are lower snake case.
- The test vectors of a package lie at `contracts/vectors/<part>/v1/<case>.json`, `<case>` in kebab case; a package has them when this text gives it rules that a program follows, as section 10 does the observation and section 12 the eval protocol.
- The examples of a package lie at `contracts/examples/<part>/v1/<case>.json`, `<case>` in kebab case: messages of the package written as section 6 has it, which `spec`'s checks hold to the rules of this text, as section 11 does the sample file. Where a package's examples show more than one message, the case names the message: of `novatrail.eval.v1`, an example whose case begins with `report-` is a runner's report (section 14), and any other a sample file (section 11).
- The prefix `novatrail` keeps every name unique: a Go program refuses to start with two protobuf declarations of one name linked into it.
- `buf.yaml`, version 2, lies at the root of `spec`, with one module, `contracts`, and no `deps`: the build MUST NOT depend on the Buf Schema Registry or any other service outside the repository.
- Comments in the files are in English (R14). Every message, field, enum, enum value, oneof, service and method MUST have a leading comment that says what it is, as a schema of the format describes each property (R45).

## 4. Syntax

- A file MUST begin with `syntax = "proto3";`. Editions are not used: moving to them is a decision of its own, and it changes neither the wire nor JSON.
- A scalar field where "absent" and zero differ MUST be `optional`, as absence differs from a zero value in the module format's types (R72).

## 5. Fields

- A field's name is the glossary's English term in snake case, and a repeated field's name is plural.
- A place and a crop on the canvas, in thousandths of the crop, and the other small integers of the platform, are `int32` (R53). A field MUST NOT be `int64` unless its value can exceed 2³¹ − 1, the largest `int32`: in JSON an `int64` is a string, and in TypeScript a `bigint`. Unsigned types are not used.
- The zero value of an enum MUST be `<ENUM>_UNSPECIFIED` and means nothing. A field or an enum value is never removed from a package (section 2): what a contract no longer needs stays, its comment says so, and the next major package leaves it out.
- A value or an ID of the module format — a canvas kind such as `handwriting_sheet`, a task's ID — is a `string` holding the format's own spelling, not an enum of the contract, so that one value has one spelling.
- One of several alternatives is a `oneof`.
- A PNG, or any other file, is `bytes`; in JSON it is a base64 string.
- A moment is `google.protobuf.Timestamp`; in JSON it is a string of RFC 3339, in UTC.

## 6. JSON

- A field's name in JSON MUST be its protobuf name, in snake case, the same as in the module format (R45). Whatever writes JSON of a contract — a file of `spec`, a sample file, a codec of the transport — MUST print the protobuf names: `UseProtoNames` of `protojson` in Go, `useProtoFieldName` in protobuf-es.
- The option `json_name` MUST NOT be used.
- A reader MUST accept both the protobuf name and the lowerCamelCase name, as ProtoJSON requires of every parser.

## 7. buf's rules

- `buf lint` holds every file to the categories `STANDARD`, `COMMENTS` and `UNARY_RPC`, with no exceptions, and with `disallow_comment_ignores: true`: a comment in a file MUST NOT switch a rule off. A method streams nothing.
- `buf breaking` holds every package to the category `FILE` against the previous release of `spec`: the newest release tag in the history of the commit checked, other than the commit's own, with `buf.yaml` and `contracts/` as git holds them at that tag. A release in which a package first appears has nothing to compare it with.
- No rule of protovalidate is used: its module lives in the Buf Schema Registry.
- Beside buf's rules, `spec`'s checks hold every rule of this text that a program can read: the syntax (section 4), the path and the package (section 3), no `json_name` (section 6) and no unsigned type (section 5), `buf.yaml` as section 3 and this section have it, and a template of `buf generate` with local plugins alone (section 8). `optional` where absence differs from zero, and `int64` only past 2³¹ − 1, are held by review. The rules of sections 10 and 12 are held by their test vectors, which `spec`'s checks compute (section 10, "Test vectors"; section 12, "Test vectors"), those of sections 11 and 12 by the check of each example (section 11, "Examples") and of each sample file another repository names (section 11, "Checking a sample"), and the form of a report by the check of its examples (section 14, "Examples"). Sections 13 and 14 are rules of the runner, which `tutor`'s tests and review hold: the measures of section 14 have no vectors, since one implementation counts them, and a report's records let anyone count them again. Section 15 has no vectors either: its rules are what `app` and `api` do, which their tests and review hold. That a change of any of them is a change of meaning, which breaks the package (section 2), review holds.

## 8. Generated code

- The code is generated from the files by buf with local plugins at exact versions; no remote plugin of the Buf Schema Registry is used. `buf.gen.yaml` at the root of `spec` names them: `protoc-gen-go` and `protoc-gen-connect-go` are tools of `contracts/go.mod`, so that each comes at the version of the runtime the module requires, and `protoc-gen-es` is a package of `spec`'s tools. The code lies in the repository beside the files, and `spec`'s checks verify that it is what buf generates.
- **Go.** The code is the module `github.com/altnovatrail/spec/contracts`, whose `go.mod` lies in `contracts/`: the messages from `protoc-gen-go` and the services from `protoc-gen-connect-go`. Beside them, written by hand, the package `contracts` at the root of the module embeds the test vectors as `contracts.Vectors`, an `fs.FS` whose root is `contracts/vectors/`, and requires nothing beyond Go's standard library. The module carries the examples too, as files of `contracts/examples/`. Its tag is `contracts/vX.Y.Z`, with the number of the tag of `spec`, on the same commit: from the line 0.7 on, the release of `spec` sets it once the release is out. It requires the protobuf runtime and Connect at exact versions, while the module `github.com/altnovatrail/spec` at the root still requires nothing (R64). Code on Go MUST take a contract from this module and MUST NOT generate its own: two copies of one contract in one program refuse to start.
- **TypeScript.** The code is the npm package `@altnovatrail/contracts`, JavaScript with its declarations from `protoc-gen-es`, and no types of JSON: they would spell the fields in lowerCamelCase, which no writer of a contract writes (section 6). The package exports each file of code by its path, the path of its `.proto` file with `_pb.js` in the place of `.proto`: `@altnovatrail/contracts/novatrail/observation/v1/observation_pb.js`. It depends on `@bufbuild/protobuf` at the exact version of the `protoc-gen-es` that wrote it. It carries the test vectors of the packages whose rules code on TypeScript follows, too, each exported by its path from `contracts/`: `@altnovatrail/contracts/vectors/eval/v1/groups.json`, the rules the device and the runner share (section 12). The vectors of the observation it does not carry: TypeScript gives no verdict. A release of `spec` carries it from the line 0.7 on, as `altnovatrail-contracts-<version>.tgz`; its version is the tag of `spec` without `v`, and a consumer verifies it as it verifies `@altnovatrail/spec` (R73, R77). `spec`'s checks build it and run it under TypeScript and Node.

## 9. Transport

- `app` and `api` talk by Connect: the server is connect-go, and the client connect-es. Every call is unary.
- Between `app` and `api` the wire is binary protobuf: a new enum value reaches an older client as a number, while in JSON connect-es skips a name it does not know and reads the field as unset (section 2). The server takes JSON too, for debugging, and writes it with the protobuf names (section 6).
- Both sides skip the fields they do not know, so a client and a server within one major package understand each other.

## 10. The observation

- The observation is what AI read in a learner's work, answer slot by answer slot, before any check runs: the message `Observation` of the package `novatrail.observation.v1` (R03, R86). A reader of `tutor` gives one, without the key. `module-kit` joins two of them into one and gives the verdict on it. `api` passes them from one to the other in its process (R15) and keeps the one joined. Which models read is `tutor`'s to decide, by eval (R07).
- An answer slot whose answer AI reads is in the observation once, in the task's order: items by their place, answer slots by their place in the item, each named by its place (`AnswerSlotPlace`, R53).
  - On a handwriting sheet, these are the slots bound `anywhere`, `zone` and `sheet` (section 14 of the module format).
  - On a workbook, every box. A box that the learner left empty sends no crop, and its reader gives it as blank without calling a model. The reader takes the boxes from the open view of the task, since the work lists only the filled ones (R53).
  - A slot bound `choice` is tapped, not read, and is not in the observation. Its value is the text of the option tapped (section 15 of the module format), which `api` gives `module-kit` beside the observation and keeps beside it.
- A task whose answer slot is bound `sheet`, an essay, is read by one reader. Any other task that AI reads is read by two readers of one provider, in two calls (R68).

**What a reader gives.**

- A reader gets the work — the crop of a handwriting sheet, or the crops of the filled boxes of a workbook — and the open view of the task, with the age category and the path to AI for admission. It gets no key, no solution of the task, and nothing of an answer slot's check: neither its kind nor the options of a choice written by hand (R67, R75). A statement that wants an answer in a form says so (section 15 of the module format).
- For each answer slot it gives `value`, what is written there, or `unreadable`, why it gives none.
  - A value is given only when the reader sees it in the writing itself, and as it is written: normalizing it is the check kind's, and `module-kit`'s, not the reader's (R56). A fraction written with a bar is given on one line, numerator first, as section 15 of the module format says. A value is never empty, nor only white space: where nothing is written, the slot is blank.
  - `UNREADABLE_BLANK`: nothing is written in the slot.
  - `UNREADABLE_ILLEGIBLE`: something is written, and it cannot be read.
  - `UNREADABLE_AMBIGUOUS`: what is written can be read more than one way. A digit written mirrored is such a case, as section 15 of the module format says; so is a value that the reader sees another reading of, and a value that the reader cannot point to in the writing.
  - `UNREADABLE_NO_FINAL_ANSWER` and `UNREADABLE_SEVERAL_FINAL_ANSWERS`, only in a slot bound `anywhere`: AI finds no final answer in the work, or more than one, and the learner is asked to circle the answer (section 14 of the module format).
- In a slot bound `sheet`, the value is the text of the essay as it is written, the learner's mistakes kept; or the slot is blank, or illegible: the essay as a whole cannot be read. A word that cannot be read does not make the essay illegible (R87); how the reader gives such a word is open (repositories 8, Т-37). The essay is read without the rubric, and the text goes to the rubric's assessment, without the picture (R75).
- **The place.** `crop_box` stands only in a slot bound `anywhere`: the box of the final answer on the crop that the device sent, in whole thousandths of its height and width, when the reader names one. `tutor`'s adapter turns the provider's units into thousandths, and gives no box that is not valid: whole numbers from 0 to 1000, `ymin` less than `ymax` and `xmin` less than `xmax` (R53). In a slot bound `zone` and in a box of a workbook, the place is the answer slot itself. A group's label as a place comes only if the frames of the groups go with the work (repositories 8, Т-31).
- The parts of a free writing, the other readings that a reader sees, and whether a digit is mirrored are the reader's own: they lead it to the value or the reason it gives, and the observation holds neither.
- An observation is valid when it holds every answer slot of the task that AI reads, each once and in order, and no other — neither a slot bound `choice` nor a place the task does not have; each with a value that is not empty nor only white space, the characters with the Unicode property White_Space, as step 4 of the module format's numbers has it (section 15 of its text), or with a reason other than `UNREADABLE_UNSPECIFIED`; when only a slot bound `anywhere` gives `UNREADABLE_NO_FINAL_ANSWER`, `UNREADABLE_SEVERAL_FINAL_ANSWERS` or a `crop_box`, and the box stands only beside a value and is valid; and when a slot bound `sheet` gives only a value, `UNREADABLE_BLANK` or `UNREADABLE_ILLEGIBLE`. A reason added to the package after a release of `module-kit` is not valid to that release, as `UNREADABLE_UNSPECIFIED` is not.
- An observation that is not valid is no observation: it is as a failure of AI (below).

**What is no observation.** A failure of AI, an exhausted limit or quota, a refusal of admission and a refusal of the learner's own key are outcomes of the call, not observations (R84). After such an outcome, every answer slot whose check gives a verdict and that AI reads gets `unchecked`, while an essay does not reach the assessment and its submission ends unchecked, which is no verdict (R87); how the learner's app shows it is the contract between `app` and `api`. When the call of one of two readers ends in such an outcome, the reading gives no observation at all, not even the other reader's: the pair holds the verdict (R68).

**Joining two observations.** `module-kit` joins the observations of two readers into one, answer slot by answer slot, before it gives a verdict. The first observation is that of the reader whom `tutor` names first in the pair.
- A value that the kind normalizes to nothing, such as `=` under `number`, is `UNREADABLE_BLANK` before any pairing: with `UNREADABLE_BLANK`, or with another such value, it joins into `UNREADABLE_BLANK`, and with a value or another reason into `UNREADABLE_AMBIGUOUS`.
- Two values join when the check of the answer slot compares them equal — as it compares a value with a trap value, after the same normalization (section 15 of the module format) — and gives them the same verdict. The joined value is the first. So `0.5` and `1/2` join under `number`, while `2/4` and `1/2` do not under `fraction` with `form: reduced`. A predicate compares the integers read: `12` and `24` do not join, though the predicate holds for both. Two values that are not in the kind's notation join when they are the same once normalized as the kind normalizes them — steps 1 to 7 of a number, its units dropped, and a choice's normal form in lowercase —, so that `7²` and `7³` join, both a 7 and U+FFFD; a value in the notation and one out of it never join.
- Beside a joined value, the joined `crop_box` is the first's, or, when the first gives none, the second's. A joined reason has none.
- Two reasons that are the same join into that reason.
- Every other pair joins into `UNREADABLE_AMBIGUOUS`: two values that do not join, a value and a reason, or two reasons that differ. The readers read the slot differently.
- When either observation is not valid, there is no joined observation: as after a failure of AI, every answer slot that AI reads gets `unchecked`. A slot bound `choice` still gets the verdict of the option tapped, and the item's verdict is made of all its answer slots'.
- The observation of an essay has one reader and nothing to join.

**The verdict.** `module-kit` gives the verdict on the observation once the reading has ended, on the whole observation, not on parts of it while they come (R54): each answer slot's, and then the item's, as section 15 of the module format makes it of its answer slots'.
- A value gets the verdict that section 15 of the module format gives that value read, with its reason and its trap. A value that the kind normalizes to nothing is blank.
- A reason gets `unreadable`, with the reason of the verdict named after it. This holds in a slot whose check gives a verdict; an essay gives none (below).

  | `Unreadable` | Reason of the verdict |
  |---|---|
  | `UNREADABLE_BLANK` | `blank` |
  | `UNREADABLE_ILLEGIBLE` | `illegible` |
  | `UNREADABLE_AMBIGUOUS` | `ambiguous` |
  | `UNREADABLE_NO_FINAL_ANSWER` | `no_final_answer` |
  | `UNREADABLE_SEVERAL_FINAL_ANSWERS` | `several_final_answers` |

  `blank` is the module format's reason too, and so is `notation`, which only a value gets: the check kind's.
- A slot bound `choice` gets the verdict that section 15 of the module format gives the text of the option tapped.
- A rubric gives no verdict. An essay with a value goes on to the assessment by the rubric; a blank or illegible one does not: its submission ends unreadable, which is no verdict either, and the learner writes the sheet again (R75; R87).

**What is kept.** `api` keeps the joined observation with the values of the slots tapped, and the same release of `module-kit` gives the same verdict on them again, with no AI (R03). The two readers' observations are not kept. Of an essay, `api` keeps no observation: the text read lives in the memory of the request and on the device. It keeps how each submission ended and, with feedback, the mark of each criterion (R87; privacy 9, П-19).

**Test vectors.** The test vectors hold the rules of this section: `contracts/vectors/observation/v1/<case>.json`. `spec`'s checks compute each, as a second implementation (`just contracts-check`), and `module-kit`'s CI passes them all, from `contracts.Vectors` at the tag it takes (section 8).
- A vector is a JSON file: `description`, what it holds; `canvas`, the task's canvas, and `items`, the task's items, as the module format writes them, with the checks of their answer slots; and `cases`.
- A case has its `description`; `observations`, the readers' observations in the order of the pair — two, or one for an essay —, each written as section 6 has it, with every field, its zero too (`EmitDefaultValues` of `protojson`, `alwaysEmitImplicit` of protobuf-es), and a reason that the package does not know as its number; and `valid`, whether each is valid. An observation that is not valid breaks one condition alone, so that the vector shows which.
- Where the task has answer slots bound `choice`, `tapped` lists each, in order, as `{ answer_slot, value }`: the text of the option tapped, as written, or `null` when the learner tapped none.
- A case of an essay has `submission`: `assessment`, when the submission goes on to the assessment by the rubric, `unreadable` or `unchecked`. Every other case has `joined`, the joined observation, or `null` when either observation is not valid, and `verdicts`, each item's in order: its answer slots' verdicts, each `{ verdict, reason, trap }` as the test vectors of verdicts of the module format write them (section 9 of its text), and its own.
- The verdict of a predicate on a value in its notation is Starlark's, which `spec`'s checks do not run: they take the vector's, and only `module-kit`'s CI computes it. The join of two such values, which compares the integers read, they compute.
- Together, the vectors give every reason of the table above in a joined observation, every check kind of the module format, an observation that is not valid and an option tapped. The check refuses a reason added to the package until the table above names it and a vector gives it.

## 11. The sample file

- The sample file is one sample of writing on a handwriting sheet or a page of a workbook, as the samples page of `canvas` saves it on the device and the eval runner of `tutor` reads it (R15, R38): the message `Sample` of the package `novatrail.eval.v1`, one JSON file to a sample (R93). It holds no key of its task and nothing that AI read. What a sample is meant to say is its markup (below); which samples make an eval set, and how the runner reads them, are section 13, and what the runner reports of a run, section 14; the rules that the device and the runner share — how the history of writing folds, the groups of strokes, the crop, how the tutor's marks snap and which box a stroke fills — are section 12, with their test vectors.
- `protocol` names the package, `"novatrail.eval.v1"`. A reader reads it first, and reads a file of no other protocol. The version of the protocol is that of a contract (section 2).
- `id` is the sample's ID: 1 to 64 lowercase Latin letters, digits and hyphens, so that it can name the sample's file. A person's sample gets one at random; a synthetic sample's comes from its seed, so that one seed gives the same file.

**What a sample holds.** Its purpose and who wrote it set which fields it holds (R09 canvas):

  | `purpose` | `writer` | Strokes | `writer_code` | `license` |
  |---|---|---|---|---|
  | `PURPOSE_EVAL_SET` | `WRITER_ADULT`, `WRITER_ADULT_AS_CHILD` | `geometry` | none | `"Apache-2.0"` |
  | `PURPOSE_MEASUREMENT` | `WRITER_ADULT`, `WRITER_ADULT_AS_CHILD` | `history` | REQUIRED | none |
  | `PURPOSE_MEASUREMENT` | `WRITER_CHILD` | `geometry` | REQUIRED | none |

- A child writes no sample of an eval set. A sample of an eval set has no writer's code, which would link published samples with each other, and names its license, under which `modules` publishes it.
- The origin — `person`, or `synthetic` with its seed, an unsigned integer of 64 bits in decimal digits — does not change which fields a sample holds, and a synthetic sample comes in each of the three.
- `writer_code` is 6 to 16 digits and capital Latin letters, which the samples page makes at random; `text_set_version`, the version of the set of texts that the page showed, is 1 to 32 Latin letters, digits, dots and hyphens; `canvas_version` is the version of `canvas` that wrote the file, `MAJOR.MINOR.PATCH`.
- No field holds a name, an email, an account, the device, the browser, the screen, a language, a date, an age or a class, and since a reader refuses a field the message does not have (below), none can be added.
- **The history of writing** is the events in the order they happened, each at its time on the sheet's clock, whole milliseconds never decreasing: `write`, a stroke with its ID, unique and from 1, the type of the pointer that wrote it, and its points, each across and down in units of the sheet to a tenth and at its time, which never goes back along the stroke, the last no later than the event's: a stroke is written when its last point is, or later, when another action landed while it was written (section 12); `erase`, the strokes the eraser took off; `clear`, every stroke the sheet showed; and `undo`, the strokes it took off and those it put back. Erase, clear and undo take off only strokes the sheet shows, and undo puts back only strokes written and not shown. The history holds no pressure: no input of a model takes it (R11 tutor), and nothing is kept that nobody reads (privacy 1).
- **The final geometry** is the strokes the sheet shows at the end, numbered by their place from 1, each with its points along the stroke in its canonical direction, to a tenth: no time, no pointer, no order of writing and nothing erased. The groups and the table of boxes name the strokes by these numbers.
- **A sheet** gives its width and height in units, the height of a digit that the module asks a crop to be drawn at, the groups of the visible strokes — labelled A, B and on by their place, every visible stroke in one, by the rule of groups (section 12) — and their crops. **A workbook** gives the page's width and height, the same height of a digit, every box of the page in the task's order, each by its place (`AnswerSlotPlace`) with its rectangle in whole units, and the filled boxes in the task's order: the IDs of the strokes in each, the table "box → stroke IDs" that the device built by the rule of boxes (section 12), and its crops. A workbook has no groups. In the final geometry of a workbook every stroke is in a box: the draft goes nowhere (R53).
- **The crops** of one set of strokes — the sheet's visible strokes, or a filled box's — are a `CropSet`: the box of their points and h_med, the lower median of the heights of their bundles, both in whole tenths of a unit, and a crop at each height of a digit of eval, 16, 24, 32 and 48 px, and at the module's, by the height ascending. Each crop gives the height asked for and the height drawn, its size and margins in px, its scale, the width of its line, its `sheet_box`, the frames of the groups in the order of their labels — on a workbook none —, and its PNG. A sheet with no stroke has no crops. These numbers are those the rule of the crop gives the strokes the sample holds (section 12): the strokes a history shows at the end, or the final geometry, with the sheet's groups, or a filled box's strokes with none.
- A history holds the strokes as they came, so its groups on a sheet and its table of boxes on a workbook are those the rules give the strokes it shows. The final geometry holds them no more as the device saw them — no time, and the points maybe other along a stroke —, so its groups and its table are the device's, and a reader does not compute them again.
- **The task** is named without its key: its source — `modules`, by the tag of a release of `modules`, the module, its version and the digest of its package; `tutor`, by the tag of a release of `tutor`, the digest of its file of open tasks, the bank and the bank's digest (R64 tutor); or `file`, a file of tasks outside any release, by its digest, the bank and the bank's digest —, the task's ID, the seed of the instance when the task is a template, and the digest of its open view: `sha256:` and the SHA-256 of its canonical text, in 64 lowercase hexadecimal digits (section 25 of the module format), of an instance with its numbers in place. The runner finds the key by them.

**The markup.** `markup` is what the sample is meant to say: the truth the runner compares what AI reads with (R95). Every writer — the samples page, and the code that draws a synthetic sample — writes it into every sample. A file without it is still a sample, and a reader reads it, but the runner measures nothing on it (section 13).
- Who makes it follows from the origin and the writer, and the file says no more. An adult, writing in their own hand or imitating a child's, marks what they wrote, by what the samples page showed them before and while they wrote; for a child, an adult marks it after the writing, from what the child says; code marks a synthetic sample by what it drew. The page calls no AI, so a markup never follows what a model reads. The markup is made before the file is saved and does not change after it, but for the people's marks of an essay (below).
- `truth` is an observation (section 10): every answer slot that AI reads, in the task's order, with its value as it is written, or the reason why a reader that reads right gives none — a digit written mirrored is `UNREADABLE_AMBIGUOUS`, as section 10 has it —, and with no `crop_box`. On a workbook it names every box of the page, and a box that holds no stroke is `UNREADABLE_BLANK`; on a sheet that shows no stroke, every answer slot is. The outcome and the trap are not written: the runner gets them as the verdict on the truth, by the task's key (section 14).
- `notes` set apart the answer slots whose rows the runner measures apart, ascending by place, each noting one at least: `mirrored`, a digit written mirrored, whose truth is then `UNREADABLE_AMBIGUOUS`; `crossed_out`, something crossed out and written again (R56).
- On a sheet the markup gives one of two, and on a workbook neither, since its boxes are its places:
  - `parts`, the parts of a solution in the order it reads, each what the writer meant as one, a text or a drawing (concepts 15), with its `text` — a text as it is written, a drawing described in words, with every number and label on it — and its strokes. Every stroke the sheet shows is in one part, and the strokes that cross a part out are in it. `crossed_out` says that the writer crossed the part out, so it is no part of the solution; `illegible`, that the part, or something in it, is written illegibly on purpose; `final_answer`, that it holds the final answer of the task's answer slot bound `anywhere`, which is the one answer slot of its task (section 14 of the module format), and a part crossed out holds none. One such part gives that slot a value, `UNREADABLE_ILLEGIBLE` or `UNREADABLE_AMBIGUOUS`, and two or more `UNREADABLE_SEVERAL_FINAL_ANSWERS`; a truth of `UNREADABLE_NO_FINAL_ANSWER` has none. `first_error` is the place, from 1, of the part where the solution went wrong, even when its calculation is right, and in a drawing too, but never a part crossed out; there is none when the solution did not go wrong.
  - `marks`, an essay's: whether it meets each criterion, by the criterion's place in the rubric from 1, ascending, as the people who marked it agreed. A criterion they did not agree on has no mark, and the runner counts it nowhere. The essay's truth is its one answer slot, bound `sheet`: its text as it is written, or `UNREADABLE_BLANK` or `UNREADABLE_ILLEGIBLE`, and an essay that cannot be read has no mark, since it reaches no assessment (R75). The marks come after the writing: the organizer of the eval set or of the measurement adds them once the people have agreed, before the sample goes into a set or a run, and code marks a synthetic essay. How many people mark an essay, and how they agree, is the volunteer's form's to say (privacy 9, П-16).
- What only the task holds, the runner holds: that the truth is a valid observation of the task (section 10) and gets a verdict, that a final answer stands only where the task's slot is bound `anywhere`, and that the marks name criteria its rubric has (section 13).

**Writing and reading.**
- A writer writes the file as section 6 has it, with every field, its zero too (`EmitDefaultValues` of `protojson`, `alwaysEmitImplicit` of protobuf-es), as the test vectors of section 10 are written.
- A reader reads it strictly: a field that the message does not have is refused, as `protojson.Unmarshal` and `fromJson` refuse one by default, while the transport skips one (section 9). So a file of a later tag of `spec`, with a field added, is refused by a reader of an earlier one, which names the field, until the reader takes the later tag.
- A crop's PNG is a grey image of 8 bits, colour type 0, not interlaced, of the crop's width and height, whose IDAT is one zlib stream with nothing after it, each row with a filter of PNG, 0 to 4; and its chunks are IHDR, IDAT and IEND alone: no ancillary chunk, neither tEXt, iTXt, zTXt, eXIf and tIME, which hold text, metadata and a time, nor any other, a private one too. A decoder may skip an ancillary chunk, so nothing of the crop is in one.
- A sample that breaks a rule of this section is not valid, and a reader refuses it.

**Where a sample goes.**
- A sample of measurement by an adult goes to the organizer of the measurement, outside git and outside the platform's server, and from there to the providers of AI that the measurement names (privacy 9, П-18).
- A sample of an eval set goes to the organizer of the eval set, who adds it to a module's eval set in `modules`, where it is published under Apache-2.0 and never withdrawn (R25; privacy 9, П-16). Its markup is published with it, the texts of its parts and an essay's truth too, so the organizer looks for a name in them as on the sheet.
- A sample of a child lies outside every repository, with a separate consent, for a time (privacy 9, П-10). A runner MUST NOT send a sample whose writer is `WRITER_CHILD` to a provider of AI until a contract with the provider admits children (R24; privacy 9, П-3).
- No sample goes to the platform's server (R09).

**Checking a sample.** A repository other than `spec` checks its sample files by the code that holds the examples below to this section, at the tag of `spec` it pins, and MUST NOT write a check of its own (R93): `just -f spec/justfile sample-check <file>…`, from its root, in its `toolchain` stage.
- Each path is the repository's, from the folder the check runs from, its root: a path that leaves it, a link in it that leads out too, or a path that names no file stops the check before it reads any, and a file named twice is read once.
- The message is the one of the image buf builds of the `contracts/` of the repository's `spec` submodule. buf reaches no service, since `buf.yaml` has no `deps` (section 3), and no key is needed, so a pull request from a fork runs the check too.
- Each file is read and held to this section and to section 12 as an example is, and nothing is asked of the files together. A rule a file breaks is named by its file and line, `file:line: message`, and the check exits with the status 1. A path it refuses, an image buf cannot build or one with no `Sample`, and a call that names no file stop it with the status 2: a check of no file passes none.

**Examples.** `contracts/examples/eval/v1/<case>.json`, but those whose case begins with `report-` (section 14), holds synthetic samples, each with its markup.
- One of each row of the table above: a sheet of measurement by an adult, a sheet of an eval set by an adult imitating a child, and a workbook of measurement by a child. Their strokes come from the test vectors of `canvas`, and their groups, crops and PNG from the code of `canvas`, at its commit 602945b.
- Two more: a sheet of measurement by an adult whose solution has a drawing, a number line with its first error, and an essay of an eval set by an adult, with the people's marks. Their strokes were drawn by the synthetic hand of `tutor` at its tag v0.1.1, their groups and the numbers of their crops come from `spec`'s implementation of section 12, and the pixels of their crops from the code of `canvas` at 602945b, whose numbers are the same.
- They answer tasks of the file of open tasks of `tutor` v0.1.1, and each markup says what its strokes show, which is not always a right answer to its task.

`spec`'s checks hold each to this section and to section 12 (`just contracts-check`), and Go reads each back as it is written (the test of the module of the contracts, section 8). Together they show every purpose, writer, ink, surface and event of the history, every kind of part, parts and marks, a first error, a final answer and a workbook's truth; the check refuses a purpose, a writer or a kind of part added to the package until this section names it.

## 12. The rules the device and the runner share

- The device, `canvas`, and the eval runner of `tutor` follow the same rules of the strokes on a sheet and a page: how a history of writing folds, which strokes make a group, how a crop is drawn, which strokes a box of a model takes, and which box of a workbook a stroke fills (R94). They are `canvas`'s rules as it wrote them (R22, R24–R26, R34 and R37 canvas), and every writer and reader of a sample file follows them (section 11).
- Every rule counts in whole numbers. A place is taken in whole tenths of a unit, `round(10 × v)`, a half rounded up: 100.05 units are 1001 tenths. A time is taken in whole milliseconds, `round(t)`, a half rounded up too. After that a rule only adds, subtracts, multiplies and compares, and each number that is not whole is one division of two whole numbers. Every whole number stays below 2^53, so a double holds it exactly, and so does an `int64`, and IEEE 754 rounds each division alike in every language. A sample writes its places to a tenth and its times whole (section 11), so the rules round nothing of a sample.

**The history of writing.** A history folds into the strokes the sheet shows at the end by adding and taking off IDs alone, with no rule of the stack of undo: `write` adds its stroke, `erase` and `clear` take off the strokes they name — a clear reads as an erase —, and `undo` takes off the strokes it removed and adds back those it restored.
- A stroke is written when its last point is, or later: a stroke that ended without its pointer coming up, while another action landed, lands no sooner than that action, so that the events stay in the order of their times (R22 canvas).
- The history the element `<novatrail-canvas>` keeps, `HistoryEvent` of `@altnovatrail/spec/canvas` (R74), is that of a sample written otherwise: its event's `kind` is the field the event sets, its `t` is `t_ms`, a stroke's `kind` is its `pointer`, and a point's `t` its `t_ms`, each time rounded to a whole millisecond. A point's pressure, `p`, does not go into a sample (R93); the element keeps it to draw the width of a pen's line.

**The groups of strokes.** The groups are made of the strokes the sheet shows at the end, each with its points and their times (R24 canvas).
- A stroke's box is the box of its points, in tenths, and its span runs from the earliest time of its points to the latest.
- Two strokes are neighbours when the pause between them is no more than 2000 ms and the gap between their boxes no more than 500 tenths, 50 units, across, and no more than 500 tenths down. The pause runs from the end of the earlier's span to the start of the later's, and is 0 when the spans overlap; a gap is 0 where the boxes touch or overlap. Each bound is in.
- A group is the strokes that a chain of neighbours joins. The groups are labelled by their place, A to Z, then AA, AB and on: by the box of the group's points in tenths — its top, then its left, its bottom and its right —, then by the earliest start of its strokes, then by its least ID. A group names its strokes' IDs ascending.
- A stroke written and not shown at the end — erased, cleared or taken off by an undo — is in the groups of the strokes shown that would be its neighbours, by the same rule with its own box and span: in none when it would neighbour none, and in each of two groups when it would neighbour a stroke of each. `tutor`'s runner counts by it what was erased, and in which group (R11 tutor).

**The crop.** The crops of a set of strokes are drawn from their points, with their groups — on a workbook, none —, at each height of a digit D asked for, a whole number of px from 1 to 256 (R25 canvas).
- B is the box of all their points, in tenths.
- A stroke whose points span 150 tenths, 15 units, or more from top to bottom is in a bundle; a lower one is a line — a dot, a minus, the bar of a fraction, an underline — and joins nothing. Strokes whose boxes touch or overlap, a gap of 0 both across and down, are one bundle, by a chain, whatever their times. A bundle's height is that of the box of its points.
- h_med is the lower median of the heights of the bundles, the ⌊(n − 1) / 2⌋-th from the lowest, in tenths, or 150 when there is no bundle. The scale takes H = min(h_med, 1000). The rule takes printed lowercase letters as it takes any stroke: each is a bundle about half a digit tall, and where they are half the bundles, h_med falls to their height.
- D′, the height drawn, is the first from D down for which the crop fits: with w₀ = ⌈(B.xmax − B.xmin) × D′ / H⌉ + 24 and h₀ = ⌈(B.ymax − B.ymin) × D′ / H⌉ + 24, a margin of 12 px on each side, the width is max(w₀, 200) and the left margin 12 + ⌊(width − w₀) / 2⌋, and the height and the top margin alike; it fits when max(width, height) ≤ 1568 and ⌈width / 28⌉ × ⌈height / 28⌉ ≤ 1568, the limits R25 canvas takes from Claude's standard size of an image. At D′ = 1 a crop always fits.
- `scale`, s, is 10 × D′ / H px to a unit, and the line is max(D′, 12) / 12 px wide.
- `sheet_box`, where the crop with its margins lies on the sheet, in units, is [(B.ymin × D′ − top × H) / (10 × D′), (B.xmin × D′ − left × H) / (10 × D′), (B.ymin × D′ − top × H + height × H) / (10 × D′), (B.xmin × D′ − left × H + width × H) / (10 × D′)].
- The frame of a group, with g the box of its points in tenths, r = (max(D′, 12) + 24) × H, X(x) = 24 × ((x − B.xmin) × D′ + left × H) and Y(y) = 24 × ((y − B.ymin) × D′ + top × H), is [⌊1000 × (Y(g.ymin) − r) / (24 × H × height)⌋, ⌊1000 × (X(g.xmin) − r) / (24 × H × width)⌋, ⌈1000 × (Y(g.ymax) + r) / (24 × H × height)⌉, ⌈1000 × (X(g.xmax) + r) / (24 × H × width)⌉] in whole thousandths of the crop: the group's ink, its points widened by half the line and the pixel at its edge, rounded outward, so that every pixel the ink touches lies within it, and its min is less than its max.
- The rule gives the numbers of a crop, not its pixels: two implementations may draw a crop a level of grey apart. The form of a crop's PNG is section 11's.

**Snapping.** A tutor's mark on a sheet takes the strokes that a box of a model, on a crop of the work, snaps to (R26 canvas). The box is in whole thousandths of the crop's height and width, a `CropBox` (section 10), and the strokes are those of the submission, of its groups: a stroke written after it is in none, and no box takes it.
- With the crop's D′, width w and height h, its margins my at the top and mx at the left, and B and H of its set, a point (x, y) in tenths lies on the crop at X = 1000 × ((x − B.xmin) × D′ + mx × H) and Y = 1000 × ((y − B.ymin) × D′ + my × H): its place in px, times 1000 × H.
- The box widened by 250 thousandths of D′ holds the point when (xmin × w − 250 × D′) × H ≤ X ≤ (xmax × w + 250 × D′) × H and (ymin × h − 250 × D′) × H ≤ Y ≤ (ymax × h + 250 × D′) × H, its edges in. That is the box laid on the sheet by `sheet_box` and widened there by H / 4; it widens first, and is clipped to the sheet after.
- The box takes a stroke when it holds k of its n points with k ≥ 1 and 3 × k ≥ 2 × n: two thirds of them at least. What it gives is the IDs of the strokes taken, ascending, and the box of their points, in tenths; or none, when it takes no stroke, and the mark then has no place on the sheet.
- The margin, 250, and the share, two thirds, are parameters of eval: eval may choose them anew by its own data.

**The boxes of a workbook.** A stroke on a workbook's page is in one box or in none — the draft —, each stroke by itself and with no time (R34 and R37 canvas). A box's L, T, W and H are its left, top, width and height in tenths, 10 × those of its `PageBox`, and x0, x1, y0 and y1 the least and the most of the stroke's points in tenths.
- A box holds the stroke when its size and its middle do: 1000 × (x1 − x0) ≤ 1600 × W and 1000 × (y1 − y0) ≤ 1600 × H; and 2 × (1000 × L − 120 × W) ≤ 1000 × (x0 + x1) ≤ 2 × (1000 × (L + W) + 120 × W), and the same down with y, T and H.
- Of the boxes that hold it, the stroke's is the one with the most of its points in the box widened by 120 thousandths — 1000 × L − 120 × W ≤ 1000 × x ≤ 1000 × (L + W) + 120 × W, and the same down —, and of those the earliest in the task's order, by item, then by slot. A stroke no box holds is the draft.
- A box is filled when it is a stroke's box. The table "box → stroke IDs" lists the filled boxes in the task's order, the IDs of each ascending. The draft goes into no box and onto no crop.

**Test vectors.** The test vectors hold these rules: `contracts/vectors/eval/v1/`, four files, each `{ description, rule, cases }`. `rule` gives the numbers of its rule above. Each case is `{ name, description, … }`, its name unique in its file and in kebab case, with the input of the rule and what the rule gives: messages of the package written as section 6 has it, with every field, its zero too, and beside them what no message holds. Their sheet is `canvas`'s, 1000 units across and 1400 down (R06 canvas), and so is a workbook's page; every point lies on it.
- `groups.json`: `history`, a `History`; `visible`, the IDs of the strokes the sheet shows at the end, ascending; `neighbours`, the pairs of them that are neighbours, `[a, b]` with a less than b, in order; `groups`, each a `Group`, and `group_boxes`, the box of each group's points, a `TenthsBox`; and `erased`, each stroke written and not shown, by ID ascending, `{ stroke_id, labels }`, the labels of its groups in their order.
- `crops.json`: `digit_height`, the module's; `strokes`, each a `FinalStroke`, and `groups`; `bundles`, the IDs of each bundle, ascending, the bundles by their least ID; and `crops`, a `CropSet`, its PNG empty: the vectors hold no pixels.
- `snaps.json`: `digit_height`, `strokes`, `groups` and `crops`, as in `crops.json`; and `snaps`, each `{ digit_height, box, stroke_ids, snapped }`: a box of a model, a `CropBox`, on the crop drawn at that height, the IDs of the strokes it takes, and the box of their points, a `TenthsBox`, or `null`.
- `boxes.json`: `boxes`, the page's, each a `PageBox`, in the task's order; `strokes`; `verdicts`, each stroke's box by its ID, `{ stroke_id, answer_slot }`, an `AnswerSlotPlace` or `null`; and `filled_boxes`, each a `FilledBox` without its crops.
- The cases are those of `canvas`'s vectors at its tag v0.1.2, commit 8e9c6f6, written in this form, a history without pressure and in whole milliseconds; `groups.json` adds the groups of the strokes taken off, which `canvas` does not draw.
- `spec`'s checks compute each, as a second implementation (`just contracts-check`). `canvas`'s CI passes them all, from the npm package `@altnovatrail/contracts`, and `tutor`'s, from `contracts.Vectors`, each at the tag of `spec` it takes (section 8).
- A rule changes only in `spec`, by a task that changes this section, the vectors and `spec`'s implementation together; `canvas` and `tutor` bring a change as a row «в реестр spec» of their RUN.md. A change that gives another result for the same input — another group, another number of a crop, another stroke taken or box filled, the margin and the share of snapping too — changes what the package means, and comes as a new package (section 2). A case that pins what this section says already only adds.
- Together, the vectors give a history with each event that takes strokes off, a stroke taken off in no group and one in two, a crop with no bundle, one with h_med above 1000 and one drawn below the height asked, a box of a model that takes strokes and one that takes none, a stroke of the draft and a filled box.

## 13. Eval sets

- An eval set is samples, each a sample file with its markup, on which the eval runner of `tutor` measures how AI reads work (concepts 15; R95). A model is admitted for a capability of AI once it passes the eval set of the capability and the eval sets of every published module with that capability; the rule of admission — its bounds, its targets, how many repeats — is `tutor`'s (R07; architecture 4.6).
- **A module's eval set** is every file in its folder `eval/`, at any depth, whose name ends in `.json`, letter case and all; a file or folder whose name begins with `.` is no part of it, as it is none of the module (section 10 of the module format). Any other file in `eval/` is no sample, and the runner reads none. Where the samples lie within `eval/` is for the repository that holds the modules to decide: the layout of a module lets it hold any file at `eval/<path>`, and the format does not change.
  - Each file is a sample of the purpose `PURPOSE_EVAL_SET`, with its markup, of a task of its own module: its source is `modules`, with the module's ID. No two samples of a set share an ID.
  - The eval set is no part of the module's package (section 25 of the module format; R62): a new sample changes neither a verdict nor a digest, and the runner takes the samples from the module's folder at the commit it checks.
- **The task.** Of a module's eval set, the runner takes a sample's task from the package that `module-kit` builds of the module at the commit checked — in the CI of `modules`, the pull request's —, by the task's ID and, of a template, the seed. The tag, the version and the package's digest that the sample names say only what it was made on, and are not compared, but the digest of the task's open view MUST be the sample's. Of any other eval set, the runner takes the task at the source and the digests that the sample names.
- **Refusal.** The runner refuses a sample, sends nothing of it to AI, and names it in its report with the reason (section 14), when:
  - it breaks a rule of sections 11 and 12, which the runner holds by the same code as `sample-check`, or its markup does not fit its task: a truth that is no valid observation of the task (section 10) or gets no verdict, a final answer where the task has no slot bound `anywhere`, a mark of a criterion its rubric does not have;
  - it has no markup;
  - its task is not the one it names: no such task, in a module's eval set a task of another module, or an open view of another digest;
  - a child wrote it, until a contract with the provider admits children (R24; privacy 9, П-3).

  A run of a module's eval set that refuses a sample does not pass, and neither does the pull request it checks. A pull request that changes the open view of a task re-makes or removes its samples in the same pull request.
- **A capability's eval set** is `tutor`'s (R15): samples of any purpose, of tasks of any source, by their tags and digests. Where it lies and what it holds is `tutor`'s to decide, and samples of measurement and of children stay outside git (privacy 9, П-10 and П-18). A capability whose input is no sample — the tutor's words, with their points on gender and safety (R70) — has an eval set of its own form, `tutor`'s too.

## 14. The runner's report

- The runner's report is what the eval runner measured in one run of an eval set, for one capability of AI: the message `Report` of the package `novatrail.eval.v1`, one JSON file to a run, written and read as the sample file is (section 11, "Writing and reading"; R95). It holds no value, text, stroke or crop of any work: only the IDs of samples, places, verdicts and marks. The CI of `modules` reads it, and so does `tutor`'s rule of admission; the log of a run, with what each model answered, and the reports for people, in Markdown or CSV, are `tutor`'s own.
- `protocol` is as in a sample file; `runner`, the tag of the release of `tutor` whose runner made the run; `capability`, `CAPABILITY_HANDWRITING_READING`, reading the values of the answer slots on a sheet or a workbook, or `CAPABILITY_RUBRIC_ASSESSMENT`, assessing an essay by its rubric on the whole path: the essay read, and what was read assessed (R71; R75). A run of reading measures no essay, and a run of assessment nothing but essays.
- `readers` are the models that read, each by its provider and by the model as the list of admitted models names it, with its setting: in a run of reading the two of a pair, in its order (R68), or one; in a run of assessment one, beside `assessor`, the model that assessed.
- `verdicts` names the code that gave the verdicts, with the tag of its release: `VERDICT_CODE_MODULE_KIT`, as in the platform's work, or `VERDICT_CODE_RUNNER`, the runner's own. Only a report whose verdicts `module-kit` gave admits a model; one of the runner's own code is a measurement (R07).
- The eval set is `module`, a module's, by its ID and the commit of `modules` whose `eval/` was read, or `capability_set`, a capability's, by the name `tutor` gives it; `repeats`, how many times each sample was read.
- `samples` holds each sample of the set that the capability measures, ascending by ID, with `refused` and the reason of section 13 — `REFUSAL_INVALID`, `REFUSAL_NO_MARKUP`, `REFUSAL_OTHER_TASK` or `REFUSAL_CHILD` —, or `measured`:
  - in a run of reading, each answer slot that a model reads and whose check gives a verdict, in the task's order — on a workbook its filled boxes, since an empty box goes to no model (section 10): `truth`, the verdict on the truth of the markup; `mirrored` and `crossed_out`, its notes; and `readings`, one for each repeat, in order: the verdict on the observation of the readers, joined when they are two (section 10), and beside `unchecked` alone its cause, `UNCHECKED_CAUSE_FAILURE` when AI failed, `UNCHECKED_CAUSE_LIMIT` when a limit or a quota ran out, or `UNCHECKED_CAUSE_INVALID` when an observation is not valid;
  - in a run of assessment, `essay`: `truth`, set only when the truth holds no text, `UNREADABLE_BLANK` or `UNREADABLE_ILLEGIBLE`; `people`, the marks of the markup; and `readings`, one for each repeat: `assessment`, when AI marked one criterion of the rubric at least, with the mark it gave each criterion the people marked, in their order — met, not met or none (R87), so that each is none when AI marked only criteria the people did not agree on —; `unreadable`, the essay read as blank or illegible; or `unchecked` with its cause, among them `UNCHECKED_CAUSE_NO_MARK`, an assessment that marked no criterion of the rubric (R87).
- A verdict is written as the test vectors of verdicts of the module format write one (section 9 of its text): `verdict`, `correct`, `not_yet`, `unreadable` or `unchecked`; `reason`, beside `unreadable` alone; and `trap`, the trap that a wrong value shows, beside `not_yet` alone; each empty where there is none.

**The measures.** A report holds no totals: the measures are counted from its records, all repeats together, by these rules, and any reader can count them again. T is the verdict on the truth, and R the verdict on a reading.
- In a run of reading, the unit is an answer slot in one repeat.
  - **False alarm**, the main measure (R04): R is `not_yet`, and T is not. Its share is among the readings whose T is not `not_yet` and whose R is not `unchecked`. A digit written mirrored, whose T is `unreadable`, counts in it (product 10).
  - **False correct**: R is `correct`, and T is not; among the readings whose T is not `correct` and whose R is not `unchecked`.
  - **Needless "unreadable"**: R is `unreadable`, and T is `correct` or `not_yet`; among the readings whose T is one of those and whose R is not `unchecked`.
  - **"Unreadable" kept**: T and R are both `unreadable`; among the readings whose T is `unreadable` and whose R is not `unchecked`.
  - **Another trap**: T and R are both `not_yet`, with different traps; among the readings whose T and R are both `not_yet`.
  - **Unchecked**: R is `unchecked`, by its cause; among all the readings.
  - Each measure is counted apart too on the answer slots noted `mirrored`, and on those noted `crossed_out` (R56).
- In a run of assessment, a reading of an essay whose truth holds its text, and which ends `unreadable`, is needless, among those that do not end `unchecked`. The unit of the rubric is a criterion that the people marked, in a repeat whose essay was assessed, and which AI marked met or not met (R71):
  - **False alarm**, the main measure: AI marks the criterion not met, and the people met. Its share is among the people's marks met, by criterion and in all. AI's marks of none are counted apart.
  - **Agreement**: the share of AI's marks that are the people's.
  - **Cohen's kappa**, for each criterion: (p_o − p_e) / (1 − p_e), with p_o the agreement, and p_e the sum, over met and not met, of the share of the people's marks and the share of AI's that are it, multiplied; when p_e is 1, there is none.
- The bounds of a share, its target and how many repeats a run takes are the rule of admission's, `tutor`'s (R07). So are the measures of the other capabilities, such as the analysis of a solution by its parts and its first error, and a hint: the markup holds their data.

**Where a report goes.** A report names its models and their providers. A run of an eval set at a provider, and a report of it published, follow that provider's terms: beyond OpenAI and Anthropic, some providers forbid benchmarking, and one its publication without consent (R65; architecture 4.6; privacy 5.3). A log of CI that anyone can read publishes what it prints. A report that names samples of measurement or of a child is not published: it lies where they do (privacy 9, П-10 and П-18).

**Examples.** `contracts/examples/eval/v1/report-<case>.json` holds synthetic reports of the samples beside them (section 11, "Examples"): a run of reading on a capability set of those samples, which refuses the child's, and a run of assessment of the essay, in three repeats. No runner made them: their runner and the code of their verdicts are `v0.0.0`, their models are stand-ins named `example`, and their readings are made up; the verdict on each truth is the one the check `number` gives with the key of its task in `tutor`'s bank at v0.1.1. `spec`'s checks hold each to the form of this section and, once the samples beside it hold their own rules, to them: it names each that its capability measures, and only those, a child's is refused as such, the answer slots are those of the truth that a model reads, with its notes, and an essay's people's marks are its markup's. Go reads each back as it is written. Together they show every capability, a refused and a measured sample, every verdict a reading gives and every mark AI gives a criterion, and the check refuses a value that the package adds to an enum of the report until this section names it.

## 15. The contract between app and api

- The contract between `app` and `api` is the package `novatrail.api.v1`: the services that `app` calls on `api` by Connect (section 9), one package for all of them, with one list of causes (R97; R17 api). This section is its text so far: the checking of an attempt, `AttemptService` of `attempt.proto`, with `cause.proto`. Which requests there are, with what comes and goes in each, `api`'s detailing proposed (architecture 3.9 api); what both sides know is the contract's, and how `api` keeps it is `api`'s code: the order of its checks, its records of idempotency keys and how long they live, the reserve of its quota, CORS, its codecs and which place the program gives a mark.
- **Every request** on an attempt names the profile, `profile_id`, and the attempt, `attempt_id`: `api` reads an attempt by the pair. An attempt of another profile, or none, gets `CAUSE_NOT_FOUND`, and a profile that is not the account's `CAUSE_NO_PROFILE`. A request whose form the contract refuses — a field it needs left out, a place the task does not have, a method the task's kind does not take — gets the code `invalid_argument` with no `Refusal`.

**Refusals and outcomes.**
- A request that was not done is refused: an error of Connect with the standard code that the cause's comment gives, and the detail `Refusal`, its cause and what it tells beside it. A method's comment names its refusals.
- A request that was done answers, and the answer says what changed for the learner. A call of AI in it that gave no reading or no words is an outcome, `Outcome`, in the answer, not a refusal: a failure of AI, the quota with when the next family day begins, the limit of platform AI, no admission, and of the learner's own key the limit reached, with why, or the key refused (R84; R11 api). "Explain differently" is the one request on an attempt that makes no call of platform AI without the reserve of the quota: there the quota, the limit of platform AI and no admission are refusals, and the right to it on the rung stays.
- `Cause` is one list for both: why a request was refused, or what a call of AI came to. A verdict's reason is no cause: it is the module format's and the observation's. Why an attempt was closed, `CloseReason`, and how a submission of an essay ended, `SubmissionEnd`, are values of their own, which come in answers and in the data of a refusal.
- A cause that the build of `app` does not know, it reads by the code of the error; an outcome it does not know, as a failure of AI. It words neither: the words are `app`'s, in the language of its screen, and the server sends no text of a cause (R10 app).

**The idempotency key.** A request that must not be done twice carries `idempotency_key`, a field of its message, since CORS lets through `Authorization` and the headers of Connect alone: `SubmitWork`, `SubmitEssay`, `GetRungWords`, `GetCorrectAnswerWords`, `ExplainDifferently` and `ShowSolution`.
- `app` makes a key for each action and sends it with every repeat of the action.
- The same key with another method or another attempt gets `CAUSE_KEY_ALREADY_USED`, and a repeat while the first request goes, `CAUSE_STILL_GOING`.
- A repeat once it is done is answered by what is recorded, with no AI:

  | Method | A repeat gets |
  |---|---|
  | `SubmitWork` | the verdicts and the reading recorded |
  | `SubmitEssay` | how the submission ended, `repeated`, without the text read and the words of the feedback: they are nowhere on the server (R87) |
  | `GetRungWords`, `ExplainDifferently` | the words the attempt keeps, while it is open; the words of a rung `repeated` and without marks, which the server does not keep |
  | `GetCorrectAnswerWords` | an answer `repeated` without words: the server keeps none, and a response lost is words lost |
  | `ShowSolution` | the solution again |

- `Done`, `GetHint` and `BeginStep` carry no key: they repeat by the attempt's state.

**The own key and the clock.**
- `own_key`, the key and its provider by its code in the admission table, goes with every request of a profile of its owner that calls AI, "explain differently" too (R84; R08 app).
  - `api` takes it with a profile of the age category `adult` alone, and otherwise refuses `CAUSE_KEY_NOT_FOR_PROFILE`.
  - It holds the key in the memory of the request alone, and writes it nowhere.
  - Neither the limit reached nor the key refused moves the call to platform AI.
- `clock_offset_minutes`, the offset of the device's clock from UTC, goes with a request on platform AI alone, for the family day of its quota, and not with the own key (privacy 9, П-23).

**What never reaches the device.** Before the task is solved, an answer holds no key, no solution, nothing of a check, and no trap: neither the trap catalog nor the trap that a wrong value shows, which the tutor's words alone get, in `api` (section 16 of the module format; R05, R57). Nor does any answer hold a technique of the task beyond the IDs given at a step or on request, the simpler case, a leak phrase, or the marks of the criteria of a rubric (R82, R87). Once the task is solved, `SolvedTask` comes (below).

**The work.**
- On a handwriting sheet, the PNG of the one crop, without its `sheet_box`.
- On a workbook, the crop of each filled box with its place, in the task's order. An empty box sends nothing, and the draft goes nowhere.
- With either, the text of each option the learner tapped, by its answer slot.
- Nothing of the writing history goes (R52), nor the context of the submission, which `app` keeps on the device to give the canvas its marks (R36), nor the groups of strokes and their frames (repositories 8, Т-31), nor the text of an item (R53).
- The server keeps no crop, so the work goes again for the tutor's words (R09).

**The verdict.** `SubmitWork` sends the work of a task with a verdict and answers once the reading has ended, with the verdict on the whole observation (R54; section 10).
- `items` holds each item of the task, in order, with its verdict, and each of its answer slots with its own. The verdicts and their reasons are written as section 15 of the module format and section 10 have them. `value` is what was read, which the learner sees, "Read: 6": the value of the observation, or the text of the option tapped (R05).
- When a call of AI gives no reading, the answer slots that AI reads get `unchecked`, and `outcome` says why; a slot bound `choice` keeps its verdict.
- `wrong_answers` counts the attempt's wrong answers, this one's too: a wrong answer is a submission with an answer slot `not_yet`, and an `unreadable` or `unchecked` one raises no rung (R82).
- `solved` comes when every item is correct, and the attempt is closed `CLOSE_REASON_CORRECT`.

**Two requests.** The words come in a request of their own, after the verdict: there is no channel of real time (R19 api; repositories 8, Т-25). After a wrong answer, `app` asks `GetRungWords`; after a correct one, `GetCorrectAnswerWords`. An essay is one request, `SubmitEssay`.

**The tutor's words.**
- The words come whole, once they passed the leak check and the form check, or as the fallback text, never in parts (R54, R57, R70).
- **The rung's words.** The k-th wrong answer gives the rung k, up to 3; from the fourth on, no rung is new.
  - `GetRungWords` names the wrong answer it asks for by the `wrong_answers` of its submission's answer, and sends that submission's work again. A wrong answer that is no longer the last gets `CAUSE_NOT_CURRENT`, with how many there are, so that the words never speak of a work the learner has written over (R97).
  - The answer is the rung, its words and the marks they come with.
  - When a call of AI came to an outcome, the words are the rung's fallback text and `outcome` says why; when the words failed a check, they are the fallback text with no outcome.
  - The same wrong answer asked again, or a repeat, gets the words the attempt keeps, with no AI and no marks.
- **After a correct answer**, `GetCorrectAnswerWords` sends the work again, once, while the profile has begun no other attempt; on an attempt that no correct answer closed, and asked again, it gets `CAUSE_NO_MORE_WORDS`. `app` keeps the work until the answer comes.
- **Explain differently**, `ExplainDifferently`, is one call of AI on a rung, without the work. It names the wrong answer whose words the learner reads, as `GetRungWords` does, and one that is no longer the last gets `CAUSE_NOT_CURRENT`. `CAUSE_NO_OTHER_WORDS` is its outcome when the words are the ones the learner reads already: the right to it on that rung is spent (R82; R10 api).
- **Hint**, `GetHint`, asks for no AI and sends no work:
  - before the first wrong answer, and on a task with a rubric, it gives the IDs of the task's techniques, empty when the task names none, which is the answer that there is nothing to hint;
  - after it, the current rung and its words.

  "What is known and what to find" `app` shows from the open view of the task: they are open, and the server records nothing of them (R82).
- **A step.** `BeginStep` begins a solving step whose `gives` gives techniques, by its place, and gives the IDs of the task's techniques. The server records each technique given, at a step or on request (R82). "Step done" sends no request (R69).

**The solution shown.** `ShowSolution` names whose action it is: `ACTION_LEARNING`, the learner's, with the right `can_learn`, or `ACTION_ADULT`, an adult's behind the PIN, with the right `can_manage`. A request without its right gets the code `permission_denied`: the PIN is a barrier of the interface, and the server tells kinds of action apart, not people (R04 api).
- A child's solution is shown from the fourth wrong answer on, and earlier, by either kind of action, gets `CAUSE_LADDER_NOT_PASSED`.
- While the child's setting "ask before showing" is on, a learning action gets `CAUSE_ADULT_NEEDED`.
- A learner of the category `adult` shows it from the beginning.
- A task with a rubric has nothing to show this way, `CAUSE_NO_SHOWING`: "Done" solves it.
- The answer is `SolvedTask`, and the attempt is closed `CLOSE_REASON_SOLUTION_SHOWN` (R82).

**Marks.** A mark of the tutor, `Mark`, is its kind and its place; the program places it (R03), and it belongs to the words of the answer that brings it, the rung's one question (R70; R97).
- Its kind is `MARK_KIND_FRAME`, a frame round the place.
- Its place is an answer slot by its place, `answer_slot`, or a box on the crop the device sent, `crop_box`, in whole thousandths, as the observation writes them (section 10).
  - On a workbook, only an answer slot: the box, framed with its strokes, or alone when it is empty.
  - The box of the first mistake that the analysis gives goes as it is, with no translation (R86).
  - A group's label as a place comes only if the frames of the groups go with the work, as a field added to `place` (repositories 8, Т-31).
- Its name, which a screen reader reads, `app` writes in the language of its screen from its kind, its number and its place: "Tutor's mark 1 of 2" (R10 app).
- `app` gives the canvas the marks with the context of the submission it kept, as the types of the element `<novatrail-canvas>` have them: `Marks`, `Mark` and `Anchor` of `@altnovatrail/spec/canvas`, written by hand and checked against this message (R74; R83).

**An essay.** `SubmitEssay` sends the crop of the sheet of a task with a rubric, and its answer is how the submission ended, `end`, which is no verdict (R87):
- `SUBMISSION_END_FEEDBACK`: the essay was read and assessed. `text` is what was read, as it is written, and `feedback` the words of the feedback; without them, they failed the leak check or the rule of feedback, and `app` shows its own phrase "no feedback this time", which is no neutral phrase.
- `SUBMISSION_END_UNREADABLE`, with `reason`, `blank` or `illegible`, as a verdict's reason is written: it reached no assessment, and the learner writes the sheet again.
- `SUBMISSION_END_UNCHECKED`: `outcome` says why, and is absent when the assessment assessed no criterion; `text` is there if the essay was read.
- `closed` names why the attempt was closed while the submission went, `CLOSE_REASON_UNSPECIFIED` when it is open: the feedback comes all the same. A submission on an attempt closed already gets `CAUSE_ATTEMPT_CLOSED` before any call of AI.
- Neither the marks of the criteria nor their justifications reach the device.
- The attempt stays open for writing again, and the learner ends it with `Done`, after one submission at least, whatever it came to; earlier, `CAUSE_NO_SUBMISSION`. `Done` closes it `CLOSE_REASON_DONE`, and the task is solved (R87).

**The task solved.** `SolvedTask` comes once an attempt is closed by a correct answer, by the solution shown, or by "Done" (R05):
- `keys`, each answer slot's key as the module format writes it, of the instance when the task is a template; a predicate or a rubric has none.
- `solution`, the task's field `solution` as JSON of the module format, bytes, and `module_format_version`, its version; empty when the task has none. `app` reads it by the types of `@altnovatrail/spec`, and for a version of the format that its build does not read, it offers to reload (R44).
- `criteria`, on a task with a rubric, the text of each criterion, without the marks of the assessment.
