# The NovaTrail API contracts

This is the text of the API contracts: how the messages and services that NovaTrail's parts exchange are written in protobuf, which rules buf holds them to, how they are versioned, which code is generated from them, and what each contract means and which rules its parts follow. It is normative, as are the `.proto` files beside it (R42). The documents under `docs/` describe the platform in Russian and add no rules to the contracts. The decision behind sections 1 to 9 is R83, and behind section 10, the observation, R86.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

## 1. About the contracts

- An API contract — a contract, in this text — is a protobuf package: its messages, and the services one part of the platform calls on another (R11). The contract of the element `<novatrail-canvas>` with `app` is not one: it is TypeScript types, written by hand (R36, R74). The first ones are the observation, which `tutor`, `module-kit` and `api` exchange in one process (R15), and the contract between `app` and `api`.
- The contracts are the `.proto` files under `contracts/` and this text. The code generated from them is no part of the contract: it follows from the files (section 8).
- The names in the contracts are the English terms of the glossary, concepts 15. A value or an ID of the module format keeps the spelling the format gives it (section 5).
- The first package is `novatrail.observation.v1`, the observation (section 10). The other tasks of epic E3 add theirs, each by the rules of this text.

## 2. Versions

- A contract has no version of its own beside its package. Its version is the last component of its package, `v1`, and the tag of `spec` in which a file came out.
- Within a package a change MUST only add: a new message, field, enum value, service or method. `buf breaking` holds this against the previous release of `spec` (section 7). Such a change comes out in any release of the line.
- A change of what a contract means breaks it too, though buf sees none: another meaning of a field or an enum value, or another rule of how a part of the platform reads a message — such as how two observations are joined, or which verdict an observation gives (section 10). Whatever can give another result on the same message is such a change. A new enum value, or a new field, whose meaning changes none of the old ones, only adds.
- A change that would break a package MUST come as a new package, `v2`, beside the old one. A package `vN` with N of 2 or more, beside its `v(N−1)`, opens a new line of `spec`, as a new version of the module format does (R44). The first package `v1` of a new part opens none. A version of a package is never reused.
- A server holds two major packages of a contract: the current one and the previous one. A client reads the package it was built with. Within a major package, a client older than the server works with it, since both sides of the transport skip the fields they do not know (section 9).

## 3. Files and names

- A file MUST lie at `contracts/novatrail/<part>/v1/<name>.proto`, and its package MUST be `novatrail.<part>.v1`: the path from `contracts/` repeats the package, as buf's rule `PACKAGE_DIRECTORY_MATCH` asks. `<part>` and `<name>` are lower snake case.
- The test vectors of a package lie at `contracts/vectors/<part>/v1/<case>.json`, `<case>` in kebab case; a package has them when this text gives it rules that a program follows, as section 10 does the observation.
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

## 6. JSON

- A field's name in JSON MUST be its protobuf name, in snake case, the same as in the module format (R45). Whatever writes JSON of a contract — a file of `spec`, a sample file, a codec of the transport — MUST print the protobuf names: `UseProtoNames` of `protojson` in Go, `useProtoFieldName` in protobuf-es.
- The option `json_name` MUST NOT be used.
- A reader MUST accept both the protobuf name and the lowerCamelCase name, as ProtoJSON requires of every parser.

## 7. buf's rules

- `buf lint` holds every file to the categories `STANDARD`, `COMMENTS` and `UNARY_RPC`, with no exceptions, and with `disallow_comment_ignores: true`: a comment in a file MUST NOT switch a rule off. A method streams nothing.
- `buf breaking` holds every package to the category `FILE` against the previous release of `spec`: the newest release tag in the history of the commit checked, other than the commit's own, with `buf.yaml` and `contracts/` as git holds them at that tag. A release in which a package first appears has nothing to compare it with.
- No rule of protovalidate is used: its module lives in the Buf Schema Registry.
- Beside buf's rules, `spec`'s checks hold every rule of this text that a program can read: the syntax (section 4), the path and the package (section 3), no `json_name` (section 6) and no unsigned type (section 5), `buf.yaml` as section 3 and this section have it, and a template of `buf generate` with local plugins alone (section 8). `optional` where absence differs from zero, and `int64` only past 2³¹ − 1, are held by review. The rules of section 10 are held by its test vectors, which `spec`'s checks compute (section 10, "Test vectors"); that a change of them is a change of meaning, which breaks the package (section 2), review holds.

## 8. Generated code

- The code is generated from the files by buf with local plugins at exact versions; no remote plugin of the Buf Schema Registry is used. `buf.gen.yaml` at the root of `spec` names them: `protoc-gen-go` and `protoc-gen-connect-go` are tools of `contracts/go.mod`, so that each comes at the version of the runtime the module requires, and `protoc-gen-es` is a package of `spec`'s tools. The code lies in the repository beside the files, and `spec`'s checks verify that it is what buf generates.
- **Go.** The code is the module `github.com/altnovatrail/spec/contracts`, whose `go.mod` lies in `contracts/`: the messages from `protoc-gen-go` and the services from `protoc-gen-connect-go`. Beside them, written by hand, the package `contracts` at the root of the module embeds the test vectors as `contracts.Vectors`, an `fs.FS` whose root is `contracts/vectors/`, and requires nothing beyond Go's standard library. Its tag is `contracts/vX.Y.Z`, with the number of the tag of `spec`, on the same commit: from the line 0.7 on, the release of `spec` sets it once the release is out. It requires the protobuf runtime and Connect at exact versions, while the module `github.com/altnovatrail/spec` at the root still requires nothing (R64). Code on Go MUST take a contract from this module and MUST NOT generate its own: two copies of one contract in one program refuse to start.
- **TypeScript.** The code is the npm package `@altnovatrail/contracts`, JavaScript with its declarations from `protoc-gen-es`, and no types of JSON: they would spell the fields in lowerCamelCase, which no writer of a contract writes (section 6). The package exports each file of code by its path, the path of its `.proto` file with `_pb.js` in the place of `.proto`: `@altnovatrail/contracts/novatrail/observation/v1/observation_pb.js`. It depends on `@bufbuild/protobuf` at the exact version of the `protoc-gen-es` that wrote it. A release of `spec` carries it from the line 0.7 on, as `altnovatrail-contracts-<version>.tgz`; its version is the tag of `spec` without `v`, and a consumer verifies it as it verifies `@altnovatrail/spec` (R73, R77). `spec`'s checks build it and run it under TypeScript and Node.

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
