# The NovaTrail module format

This is the text of the module format: what a NovaTrail module may and must contain, and how the platform checks it. It is normative, as are the schemas and the test vectors beside it (R42). The documents under `docs/` describe the platform in Russian and add no rules to the format. The conventions of this text are decision R45, and its versions are R44.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

## 1. About the format

- A module is data: not code, and not instructions to a model (R02). The platform reads it the same way every time.
- The format is the schemas in `schemas/`, this text and the test vectors in `vectors/` (R42). What a schema cannot say, this text says as a format rule (section 7). The examples in `examples/` show the format and check the schemas, but they add no rules.
- `module-kit` implements the format: it reads a module, checks it against the schemas and the format rules, builds its package and its open view, and runs its check kinds (R17; architecture 3.7). An implementation that does not pass the test vectors does not conform to the format.
- The names in the format are the English terms of the glossary, concepts 15.

## 2. Versions

- The format has a version of its own, MAJOR.MINOR, written once, in `VERSION`. It is neither the version of a module nor a tag of `spec`. A change that gives the format a new version also starts a new line of `spec`'s releases, so within one line the format is the same (R44).
- A module names the format version it is written in as a string, such as `"0.1"`, in the field `module_format_version` at the root of its manifest (section 11). That place is the same in every version of the format, so that a reader finds the version before it knows which schemas to read the module by.
- A module is checked, built and run by the version it names, against the schemas of exactly that MAJOR.MINOR. It MUST use only what that version has. A reader MUST refuse, with a reason, a module that names a version it does not read: one newer than the reader knows, or one outside the versions the platform reads (below). The rule `manifest.format-version` (section 11) names that refusal.
- A new version of the format changes nothing in a published module — not its verdicts, its open view or its numbers — until its author moves it to that version. That move is a new version of the module.
- A minor version only adds. After it, every module of the previous version is still valid and gives the same verdict, open view and numbers on the same inputs: the module, the seed and the value read. Packages and indexes built under the previous version are read as before. Examples of minor changes:
  - an optional field, or a field that is open from the start;
  - a new check kind, canvas kind, tool or list value;
  - a parameter whose default keeps the previous behaviour;
  - a new place of randomness that shifts no numbers in the places before it.
- A major version is everything else:
  - a field removed, renamed or made required;
  - something valid made invalid, a new or stricter format rule among them;
  - anything that can give a different verdict, open view or numbers on the same inputs: the behaviour of a check kind or of its normalization, the generator or the derivation of seeds, templates, a closed field opened.
- Editorial changes give no new version. These are descriptions, examples, wording of this text that keeps its rules, and a test vector that pins what the text already says; the tag of `spec` names such a revision.
- The anchor skills of the shared taxonomy are part of the format (section 13).
  - A new anchor skill is a minor change, and so is marking one `"deprecated": true`: a module MAY still name it until a major version removes it.
  - Removing an anchor skill is a major change, and so is changing what it means. A change of meaning is made as a removal and an addition: the skill with the new meaning comes in under a new ID, and the old ID is removed. The learner model knows an anchor skill by its ID alone, so an ID never takes another meaning.
  - The description of an anchor skill is normative, since it says what the skill means: other words with the same meaning are an editorial change.
  - The ID of an anchor skill is never reused.
- A version number never goes back and is never reused: undoing a change is a new version too. A fault in `module-kit` that the test vectors catch is not a change of the format.
- While the format is v0 (0.y), nothing is promised: every change is the next 0.y, and the platform reads only the current version. From v1 on, it reads the current major version, with all its minor versions, and the previous major version. v0 leaves when v1 comes out, and each previous major version leaves when the next one comes out.
- Version 0.1 is a draft until the first release of `spec`'s line 0.3, the first release that carries the schemas as files for code (RUN.md, T35). Until then the tasks that write the format change 0.1 without raising the number, and no code takes it (R21).
- The format becomes v1 by the author's decision, once the three modules of the first slice have passed through the platform with no subject code in its core (R08). v1.0 is the last 0.y without anything that no module of the first slice used. After v1, a new canvas kind or check kind comes in a minor version, together with the module that needs it first.

## 3. Files

```
format/
├── README.md     this text
├── VERSION       the format's version, MAJOR.MINOR
├── schemas/      <term>.schema.json; common.schema.json and shared-taxonomy.schema.json, which parts refer to
├── examples/     <term>/valid/<case>.yaml and <term>/invalid/<case>.yaml; module/valid/<case>/
└── vectors/      rules/<rule-id>/, open-view/, and the vectors of check kinds and templates
```

- `<term>` is the concepts 15 term for the part a schema describes, in kebab-case: `manifest`, `skill-graph`, `task`.
- Two schemas describe no part, and the parts refer to them: `common.schema.json` holds the definitions that parts share, and `shared-taxonomy.schema.json`, named by its term, the anchor skills (section 13). Neither has examples of its own: the examples of the parts show them.
- `examples/module/valid/<case>/` is an example of a whole module: a folder laid out as a module (section 10). The part `module` has no schema of its own.
- A case is named in kebab-case for what it shows: `missing-title.yaml`, or a folder such as `no-manifest/`.
- Schemas are JSON. Examples and vectors written by hand are YAML and follow section 4.
- In version 0.1 this text and `VERSION` come first; the schemas, examples and vectors arrive part by part.

## 4. Writing a module

A module is written in [YAML 1.2.2](https://yaml.org/spec/1.2.2/) and read with its Core schema, under the rules below. They keep every reader to the same data, a JSON value: YAML parsers differ, and a parser that follows YAML 1.1 reads `0777` as an octal number and `no` as false, where the Core schema reads 777 and the string "no". Each rule is a format rule (section 7). A reader MUST refuse a file that breaks one and name the rule.

| ID | Rule |
|---|---|
| `yaml.encoding` | The file MUST be UTF-8, with no byte order mark. |
| `yaml.single-document` | The file MUST hold exactly one document. It MAY begin with `---`. |
| `yaml.no-directives` | The file MUST NOT contain `%YAML` or `%TAG` directives. |
| `yaml.no-anchors` | The file MUST NOT contain anchors (`&`) or aliases (`*`). |
| `yaml.no-tags` | The file MUST NOT contain tags (`!`, `!!`). |
| `yaml.string-keys` | Every key of a mapping MUST be a string: quoted, or plain under `yaml.plain-strings`. A plain `null`, `true`, `false` or number is not a string and MUST NOT be a key. |
| `yaml.unique-keys` | Two keys of one mapping MUST NOT be the same string once escapes are processed ([RFC 7493](https://www.rfc-editor.org/rfc/rfc7493), §2.3). |
| `yaml.json-scalars` | A plain scalar `null`, `true`, `false` or a JSON number is that value. A number MUST be finite as an IEEE 754 double; how precisely the double holds it does not matter. A number written with neither a fraction nor an exponent is an integer, and it MUST lie between −(2^53−1) and 2^53−1. Negative zero MUST NOT be written: not as `-0` or `-0.0`, nor as a negative number so small that the double rounds it to zero, such as `-1e-400` ([RFC 7493](https://www.rfc-editor.org/rfc/rfc7493), §2.2). |
| `yaml.plain-strings` | Any other plain scalar is a string. It MUST NOT be empty, MUST NOT begin with a digit, `+`, `-`, `.`, `~`, `<` or `=`, and MUST NOT equal `y`, `n`, `yes`, `no`, `on`, `off`, `true`, `false` or `null` in any letter case. Such a string is written in quotes. |
| `yaml.characters` | A key or a string MUST NOT contain a surrogate or a noncharacter — U+FDD0 to U+FDEF, and the last two code points of every plane — whether written or escaped ([RFC 7493](https://www.rfc-editor.org/rfc/rfc7493), §2.1). An escaped surrogate is refused also as half of a pair, `\ud83d\ude00`, and in the form `\U0000D800`. It MUST NOT use the escape `\/`. Escapes are read from left to right, so `\\/` is a backslash and a slash. |

- Comments, block scalars (`|` and `>`), flow collections and quoted strings MAY be used.
- The order of keys carries no meaning, and a reader MUST NOT normalize Unicode: a string is the characters written.
- A file written in JSON syntax is YAML, and the same rules apply to it.

## 5. Writing a schema

- A schema is a JSON file, `schemas/<term>.schema.json`, in JSON Schema 2020-12. Its root has `"$schema": "https://json-schema.org/draft/2020-12/schema"`.
- A schema uses only these keywords:
  - `$schema` and `$id`, at its root only, and `$ref`, `$defs` and `$comment`;
  - `allOf`, `anyOf`, `oneOf`, `not`, `if`, `then`, `else`, `dependentSchemas`, `prefixItems`, `items`, `contains`, `properties`, `patternProperties`, `additionalProperties`, `propertyNames` and `unevaluatedProperties`;
  - `type`, `enum`, `const`, `multipleOf`, `maximum`, `exclusiveMaximum`, `minimum`, `exclusiveMinimum`, `maxLength`, `minLength`, `pattern`, `maxItems`, `minItems`, `uniqueItems`, `maxProperties`, `minProperties`, `required` and `dependentRequired`;
  - `title`, `description`, `default`, `deprecated`, `readOnly`, `writeOnly`, `examples` and `format`;
  - `x-open` (section 6).

  The other keywords of 2020-12 stay out of the format: a reference names only `$defs`, and validators differ on `minContains`, `maxContains` and `unevaluatedItems` (R45).
- Its `$id` is `https://altnovatrail.github.io/spec/format/`, then the version in `VERSION`, a slash, and the file name: `https://altnovatrail.github.io/spec/format/0.1/task.schema.json`. The URI identifies the schema; it need not resolve ([JSON Schema 2020-12 core](https://json-schema.org/draft/2020-12/json-schema-core), §8.2.1). A new version changes every `$id` with it.
- A reference between schemas MUST be relative, in one of three forms: `#/$defs/<name>` for a definition in the same schema, `<file>.schema.json` for another schema, and `<file>.schema.json#/$defs/<name>` for a definition in another schema, such as `"$ref": "common.schema.json#/$defs/skill_id"`. It resolves against the `$id`. A reference MUST NOT name that prefix, nor a path such as `../0.1/`: it would tie the schema to one version without anyone noticing.
- Field names and the values of lists are the English terms of concepts 15 in snake_case: `answer_slots`, `trap_advice`. A field that names no term — `id`, `title`, `version` — is a plain English word. An array takes the plural, unless the field names, with a verb, how its item relates to others: `replaced_by`, `teaches`. A new term enters concepts 15 before it enters a schema (R42). Names under `$defs` are snake_case too.
- The root of a schema has `title` and `description`. The subschema of every field has `description`, also where it holds only `$ref`: a subschema under `properties` or `patternProperties`, and the schema of a map's values under `additionalProperties`. A condition — what `if` or `not` holds — needs none. Descriptions are in English: a sentence or two on what the term means.
- Every object is closed at its place, so an unknown field is an error.
  - A place is the root of a schema, or a subschema directly under `properties`, `patternProperties`, `additionalProperties`, `items`, `prefixItems` or `contains`, outside a condition. A definition under `$defs`, the target of a `$ref`, and the subschemas of `allOf`, `anyOf`, `oneOf`, `if`, `then`, `else`, `not` and `dependentSchemas` are parts of the place where they apply.
  - When the parts of a place describe an object — with `properties`, `patternProperties` or `"type": "object"`, followed through `$ref` and through every part but `if` and `not` — the place has `"unevaluatedProperties": false`. Only the place closes the object: a part that closed it would refuse the fields of the other parts. So `unevaluatedProperties` stands only at a place, and only as `false`, and a `$ref` to an object at a place has `"unevaluatedProperties": false` beside it.
  - A map — an object whose keys are data — uses `additionalProperties` with a schema, and `propertyNames`, and is closed by them.
  - `additionalProperties: false` MUST NOT be used: it does not see the properties declared through `$ref` or `allOf`.
  - A property that `if` or `not` names is declared also by a part that always applies at its place: the place itself, or what its `$ref` or `allOf` reaches. Validators differ on whether the properties of an `if` that failed are evaluated.
- A schema MUST NOT rely on `format` to refuse an instance: in 2020-12 `format` is only an annotation unless a validator is told otherwise ([JSON Schema 2020-12 validation](https://json-schema.org/draft/2020-12/json-schema-validation), §7.2.1).
- A `pattern`, and every key of `patternProperties`, uses only the tokens that JSON Schema 2020-12 recommends ([core](https://json-schema.org/draft/2020-12/json-schema-core), §6.4):
  - single characters;
  - classes, such as `[a-z]` and `[^a-z]`;
  - the quantifiers `+`, `*`, `?`, `{x}`, `{x,y}`, `{x,}` and their lazy forms;
  - the anchors `^` and `$`;
  - grouping `( )` and alternation `|`.

  It escapes only the characters `^ $ \ . * + ? ( ) [ ] { } |`, and it writes classes out: `[0-9]`, not `\d`. So that Go and JavaScript read a pattern the same way:
  - in a class, `[` and `]` are escaped, `-` stands first, last or between the ends of a range, a range runs upwards, and no class is empty;
  - outside a class, `{`, `}` and `]` stand only in a quantifier, or escaped;
  - a count has no leading zero, `{x,y}` has x ≤ y, and no count is above 1000, nor the product of the counts nested in one another, each counted as Go counts it: `{x}` and `{x,y}` by the most they allow, `{x,}` by x and `{0,}` as 1. Go's regular expressions refuse more ([regexp/syntax](https://pkg.go.dev/regexp/syntax)).
- `false` is used as a subschema only as the value of `unevaluatedProperties`.
- NovaTrail's own annotations begin with `x-`. JSON Schema 2020-12 reads an unknown keyword as an annotation ([core](https://json-schema.org/draft/2020-12/json-schema-core), §4.3.1), and its next version keeps the prefix `x-` for such keywords. The format has one: `x-open` (section 6). Schemas MUST NOT use other `x-` keywords.

## 6. Open fields

- The open view of a part of a module is what the learner's app receives: the part without its closed fields (architecture 1; R05). `module-kit` builds it from the marks in the schemas.
- A field is open when its subschema carries `"x-open": true`.
  - The mark MUST stand only in a subschema under `properties`, `patternProperties` or `additionalProperties`. It MAY stand beside `$ref`.
  - Its value MUST be `true`.
  - A field without the mark is closed, so a new field stays closed until it is opened.
- A place in a part is open when its parent is open and the place either is an element of an array or carries the mark. The root of a part is open.
- A mark counts only where its subschema applies and passes. This covers the branches of `allOf`, `anyOf`, `oneOf`, `if`/`then`/`else` and `dependentSchemas` as well: a mark in a branch that fails counts for nothing.
- When an open object chooses a branch of `oneOf` by one of its fields, that field MUST be open.
- A key or a predicate, a solution, a trap and a leak phrase MUST NOT be open (R05).
- Opening a closed field is a major change; a new field that is open from the start is a minor one (section 2).

## 7. Format rules

- A format rule says what the schemas cannot say: that a graph has no cycles, that a reference names something that exists, that a key is right. The YAML rules of section 4 are format rules too. `module-kit` checks them (architecture 3.7).
- A rule has an ID, `<part>.<name>` in kebab-case, where the part is the one in which a breach is reported: `skill-graph.acyclic`. A rule also has a statement with MUST. An ID is never reused.
- A reader MUST refuse a module that breaks a rule and name the rule's ID.
- A new rule, or a stricter one, is a major change (section 2).
- Each rule has test vectors (section 9). The rules of each part are listed in this text as the part is written, in a table whose first column is the rule's ID, as section 4 lists the YAML rules.

## 8. Examples

- `examples/<term>/valid/<case>.yaml` is valid against `schemas/<term>.schema.json`. It also meets every format rule that can be checked within its part, and `module-kit`'s CI runs it too. A rule that spans parts is checked on examples laid out as a whole module.
- `examples/module/valid/<case>/` is a whole module, laid out as section 10 says. Each of its files that has a part is valid against that part's schema, and the module breaks no format rule: not a rule of a whole module, nor a rule within a part or between parts. A whole module has no invalid examples: a module that breaks a rule is a test vector of that rule.
- `examples/<term>/invalid/<case>.yaml` breaks one thing. Its first line names the error it MUST give: `# error: <keyword> at <location>`.
  - `<keyword>` is the JSON Schema keyword that fails.
  - `<location>` is the place in the file where the schema holding that keyword applies. It is written as a JSON Pointer in URI fragment form ([RFC 6901](https://www.rfc-editor.org/rfc/rfc6901), §6): `#` for the whole file, `#/answer_slots/0` for an element.
  - That place is:
    - the object, for `required`, `additionalProperties`, `unevaluatedProperties`, `propertyNames`, `minProperties`, `maxProperties` and `dependentRequired`;
    - the array, for `minItems`, `maxItems`, `uniqueItems` and `contains`;
    - the value, for `type`, `enum`, `const`, `pattern`, `minimum` and the other keywords that test a value.
  - `$ref`, `allOf`, `properties`, `items` and `if`/`then`/`else` are never named; the keyword that failed inside them is. `oneOf` and `anyOf` are named when none of their branches passes.
  - The check passes when the validator, reporting all its errors, reports one with this keyword at this place. The words of its message do not count.

  For example:

  ```yaml
  # error: type at #/difficulty
  difficulty: hard
  ```
- Examples follow the rules of section 4. They show the format and check the schemas; they add no rules.

## 9. Test vectors

- Test vectors are normative: an implementation that does not pass them does not conform to the format (R42).
- `vectors/rules/<rule-id>/` holds the vectors of one format rule. Each case breaks that rule and nothing else. It is a file, or, for a rule that spans files, a folder laid out as a module (section 10).
  - A vector of a part's rule is valid against the part's schema, so only the rule refuses it. Laid out as a module, it holds a file of that part and follows the rules of a whole module.
  - A vector of a `yaml.*` rule is a file, and it breaks only that YAML rule.
  - A vector of a rule of a whole module is a folder, and it breaks only that rule of a whole module. Each file in it that has a part follows the YAML rules and is valid against its part's schema.
  - A manifest in a vector names the format version in `VERSION`, except in a vector of `manifest.format-version`, which names one that a reader of that version does not read (section 2).
  - `spec`'s CI checks that a case breaks none of the YAML rules but its own, that each file of a part with a schema is valid against it, and that a case laid out as a module breaks no rule of a whole module but its own. That a case breaks its rule, it checks only for the rules it implements itself: the YAML rules, the rules of a whole module and `manifest.format-version`. `module-kit`'s CI checks every case: that it is refused with the rule's ID.
- `vectors/open-view/` holds the vectors of the open view: a part, and the exact open view it gives.
- The vectors of check kinds, of templates and of the generator come with the tasks that define them.

## 10. A module

- A module is a folder. Which files it holds, and where each one stands, is the layout below. Where the folder lies and what it is called is not the format's to say: the repository that holds modules decides it.
- A path is written from the module's folder, with `/` between names. `<path>` stands for one name or more, joined by `/`.

| Path | Part | Holds |
|---|---|---|
| `manifest.yaml` | `manifest` | The manifest: what the module is and whom it is for (section 11). |
| `skill-graph.yaml` | `skill-graph` | The skill graph: the module's skills and what a learner needs before each (section 12). |
| `media/<path>` | — | The pictures and sound that the parts of the module show. |
| `eval/<path>` | — | The module's eval set: the samples on which the platform checks that AI reads work in this module right. |
| `NOTICE` | — | The notices that the licenses of the module's content require to keep with it. |

- The part of a file is the term whose schema checks it: such a file is YAML (section 4) and valid against `schemas/<part>.schema.json`. No schema checks a file whose part is —.
- Each part adds its row to the layout when it comes into the format. A part that a module has once is one file at its root, named by its term: `skill-graph.yaml`. A part that a module has many of, such as tasks and lessons, is a folder with one file for each item, named by the item's local ID, and the file holds that ID in its field `id`.
- The names in a path compare exactly, as the folder lists them, letter case and all: `Manifest.yaml` is not `manifest.yaml`, and `NOTICE.txt` is not `NOTICE`. A reader MUST compare the names it lists rather than open a file by its name: a file system that ignores letter case would open `Manifest.yaml` for `manifest.yaml`.
- A file or folder whose name begins with `.` is not part of the module, nor is anything in such a folder: a reader MUST leave it out of the module. A folder with no file in it holds nothing.
- A module holds files and folders only: no symbolic links.
- The order in which a folder lists its files carries no meaning.
- No learner's work is part of a module: a module is published under an open license, and it cannot be recalled. Its eval set holds synthetic samples, and samples that adult volunteers and authors made for it.

**IDs.**
- The ID of a module is `<publisher>/<name>`: `novatrail/olympiad-math`. A publisher owns the namespace of its modules' names, so two authors' modules never share an ID. The project publishes the official modules, and a third-party author publishes their own.
- A skill, task, trap, technique or lesson has a local ID, unique among the module's items of its kind: a skill and a task may share one. A file of a module names the module's own items by local ID.
- Outside its module, an item is named by its full ID: the module's ID, the item's kind and its local ID, joined by `/`, as in `novatrail/olympiad-math/skill/counting-gaps`. The kinds are `skill`, `task`, `trap`, `technique` and `lesson`. The learner model, the engine and a learner's progress name an item so, and a module never writes a full ID.
- An anchor skill of the shared taxonomy is no item of a module: its ID, `core.<name>`, is its own, the same in a module and outside it (section 13).
- The forms of these IDs and of a module's version are `module_id`, `local_id` and `module_version` in `schemas/common.schema.json`.

**Languages.** A module has one explanation language, which its manifest names. Every text of the module is in it, except the material of a language module, which is in the language the module teaches. This version of the format has no translations: the same content in another explanation language is another module.

**Media.** `media/` holds the pictures and sound of the module in four formats, each with one extension: PNG (`.png`), JPEG (`.jpg`), WebP (`.webp`) and MP3 (`.mp3`). A part refers to a media file by its path from `media/`, as `media_path` in `schemas/common.schema.json` defines it: `pictures/ladder.png`. The rule that checks the files in `media/` comes with the first part that refers to them.

**Eval set.** `eval/` holds the module's eval set. The format of its samples comes with the eval protocol; until then, the format says only where they lie.

**Notices.** `NOTICE` holds, as plain text, the notices that the licenses of the module's content require to keep with it: for content under the MIT License, its copyright notice and permission notice. A module whose licenses require none has no `NOTICE`.

**Rules.** The rules of a whole module have the part `module`, which has no schema. A module can break both, as one with `Manifest.yaml` in place of `manifest.yaml` does, but each test vector breaks one of them alone: a folder that holds no manifest and nothing out of place breaks `module.manifest` only. What lies in `media/` is the concern of the rule that checks media.

| ID | Rule |
|---|---|
| `module.manifest` | The folder of a module MUST hold the file `manifest.yaml`. |
| `module.layout` | Every file of a module MUST stand at a path of the layout above, and a module MUST hold nothing but files and folders. A file or folder whose name begins with `.` is not the module's, and the rule does not see it. |

## 11. The manifest

- The manifest is `manifest.yaml`, valid against `schemas/manifest.schema.json`. It says what the module is: the format version it is written in, its ID and version, its title and subject, whom it is for, its languages, the anchor skills it builds on, its authors and its license. Every field is open: the learner's app shows them.
- `module_format_version` names the version of the format the module is written in, as a string: `"0.1"`, since a plain `0.1` is a number (section 4). The field stands at the root of the manifest in every version of the format (section 2).
- `id` is the module's ID (section 10). `version` is its version in Semantic Versioning 2.0.0, `X.Y.Z`, with no pre-release and no build metadata. It is written in quotes, `"1.2.0"`, since a plain string MUST NOT begin with a digit (section 4).
- `title` is in the module's explanation language.
- `subject` is a code: `mathematics`, `physics` or `writing`. A new code is a new value of a list, a minor version (section 2).
- `audience.age_categories` lists the age categories that the module suits: `under_13`, `from_13_to_consent` (from 13 to the age of digital consent in the learner's country), `from_consent_to_18` and `adult`. The platform offers the module only to learners in one of them. The presentation style follows the learner's age, or the learner's choice, and the manifest does not name it in this version.
- `audience.grades` lists the school grades that the module is written for, from 1 to 12, as its author counts them: the platform maps no country's grades onto another's.
  - A module that names grades asks the learner's grade, and the platform keeps the answer in the learner's profile (privacy 4). The answer may be a grade the module does not name.
  - Grades close nothing, unlike the age categories: the module and each of its skills stay open to a learner of any grade, and a skill opens by its prerequisites (concepts 4).
  - Where a learner of each grade starts comes with the difficulty of tasks (RUN.md, T28).
  - This version has no grade 0 and no grade above 12; allowing them is a minor change (section 2).
- `languages.explanation` is the module's explanation language. `languages.target`, which only a language module has, is the language it teaches.
  - A language is a BCP 47 tag of a language subtag, an optional script and an optional region, each in the letter case of the registry: `en`, `zh-Hans`, `pt-BR`, `es-419`. BCP 47 compares tags whatever their case ([RFC 5646](https://www.rfc-editor.org/rfc/rfc5646), §2.1.1); the format fixes the case, so that a tag is always written as the same string.
  - The schema checks the form of a tag, not that the registry has it.
  - Norwegian, `no`, is written in quotes, since a plain `no` breaks `yaml.plain-strings`.
- `dependencies` lists the anchor skills of the shared taxonomy (section 13) that the module's skills need: exactly those that its skill graph names as prerequisites. A module whose skills need none leaves the field out. So what a module builds on is seen from its manifest alone; what it teaches other modules is in its skill graph, in `teaches` (section 12).
- `authors` lists who wrote the module, each by `name`: a person or an organization.
- `license` is an identifier of the [SPDX License List](https://spdx.org/licenses/): `Apache-2.0` for an official module. An SPDX expression, such as `MIT OR Apache-2.0`, is not in this version.

| ID | Rule |
|---|---|
| `manifest.format-version` | `module_format_version` MUST name a version of the format that the reader reads (section 2). A reader refuses a module that names another, and names this rule. |
| `manifest.dependencies` | `dependencies` MUST list exactly the anchor skills that the prerequisites in the module's skill graph name: each of them, and no other. |

## 12. The skill graph

- The skill graph is `skill-graph.yaml`, valid against `schemas/skill-graph.schema.json`. It names the module's skills: what each one is called, what a learner needs before it, how the platform can know a learner's command of it, and which anchor skills of the shared taxonomy it teaches. A module MAY have no skill graph, and then it has no skills.
- `skills` holds each skill under its local ID: its `title` and, if it has one, its `description`, both in the module's explanation language; its `prerequisites`; its `assessability`; and, if it teaches any anchor skill, its `teaches`. The order of the skills carries no meaning (section 4).
- `prerequisites` lists the skills that a learner needs before this one, and the learner needs each of them: to take on B, a learner needs A. A prerequisite is a skill of the module, by its local ID, or an anchor skill of the shared taxonomy, by its ID (section 13). A skill with no prerequisites leaves the field out: the list, when written, is not empty. The prerequisites among the module's skills form a directed graph with no cycle.
- A skill that needs what its own module teaches names a skill of the module that teaches it, not the anchor skill. So the graph of the module's skills keeps that link, and its tiers and the check for cycles see it.
- **Tiers.** A tier is a group of the module's skills of one difficulty. It is computed from the graph, never written:
  - a skill with no prerequisite among the module's skills is in tier 1;
  - every other skill is one tier above the highest tier of its prerequisites among the module's skills.

  So a skill's tier is the number of skills on the longest chain of prerequisites that ends with it, and a prerequisite always stands in a lower tier than its skill. An anchor skill is not one of the module's skills and counts for no tier: a skill whose prerequisites are all anchor skills is in tier 1. The number of tiers has no limit. `module-kit` computes them when it builds the module's package (architecture 3.7).

  `tiers` names the tiers in order from tier 1, in the module's explanation language. When the module has more tiers than names, the tiers past the last name are shown by their numbers, and a name past the last tier names none. A module that names no tier leaves `tiers` out.
- `assessability` says how the platform can know a learner's command of the skill:
  - `verdict` — the skill's tasks are checked against a key or a predicate, and their verdicts are evidence for the learner model;
  - `rubric` — work on the skill gets feedback by the author's rubric, not a verdict (R04);
  - `none` — the skill is practised and not assessed.

  The engine adapts to the learner only in a skill whose assessability is `verdict`. In the others, the author's order holds (concepts 4).
- `teaches` lists the anchor skills that the skill teaches: a learner who has the skill can do what the description of each says. Other modules build on them, and the learner model decides by such skills whether a learner has an anchor skill (section 13). A skill that teaches none leaves the field out. Several skills, of one module or of several, MAY teach the same anchor skill.
- **Retired skills.** A published skill ID never names another skill. A change in a skill's meaning cannot be seen in the module, so the author gives the changed skill a new ID. `retired_skills` holds each skill that an earlier version of the module had and this one has not, under the ID it had, with `replaced_by`: the skills of this version that took over what it taught.
  - A skill renamed has one skill in `replaced_by`, and a skill split has several. Skills merged into one each name that one.
  - `[]` says that no skill took over: a learner's progress in the retired skill moves to none.
  - `replaced_by` names skills of this version. When a skill that it names is retired in turn, the entry names that skill's replacements instead.
  - The learner model moves a learner's progress by this table: the evidence of a retired skill counts for each skill that replaced it, and how much it counts is the learner model's to decide (architecture 3.8).
  - An entry stays in every later version, so that progress of any age still moves. Retiring a skill raises the module's major version (concepts 3).
  - Only a comparison of two versions shows that every skill of the previous version is in this one or in `retired_skills`, and that no entry has gone. That comparison is `module-kit`'s (architecture 3.7), and the rules it checks come into this text with it.
- **Open fields.** `tiers` and `skills`, with every field of a skill, are open: the skill map shows them. The tier of a skill is no field of the part: `module-kit` computes it into the package, and how it reaches the learner's app comes with the package (RUN.md, T34). `retired_skills` is closed: progress moves on the server.

| ID | Rule |
|---|---|
| `skill-graph.acyclic` | The prerequisites among the module's skills MUST form no cycle: no skill is, through its prerequisites, a prerequisite of itself, and no skill names itself among them. |
| `skill-graph.known-skills` | Every local ID in a skill's `prerequisites` and in `replaced_by` MUST be the ID of a skill in `skills`. |
| `skill-graph.retired-ids` | An ID in `retired_skills` MUST NOT be the ID of a skill in `skills`: a published ID never names another skill. |
| `skill-graph.own-anchors` | A skill MUST NOT name among its `prerequisites` an anchor skill that a skill of its module teaches, itself included. |

## 13. The shared taxonomy

- The shared taxonomy is the vocabulary of anchor skills: skills that belong to no module and that modules name to build on one another (concepts 4). A module never names a skill of another module. A skill that needs what another module teaches names an anchor skill, and that module says which of its skills teaches it. So a module that renames or retires a skill breaks nothing in another.
- The vocabulary is `schemas/shared-taxonomy.schema.json`. Each anchor skill is a branch of its `oneOf`, with the skill's ID as `const`, its `title` and its `description`. The schema describes no part of a module and is no file of one: the parts that name anchor skills refer to it, and it refuses an ID that names none. The platform curates it in `spec`.
- The ID of an anchor skill is `core.` and a name in kebab-case that begins with a letter: `core.multiplication-table`.
  - The dot keeps it apart from a local ID and from a module's ID, which have none.
  - The name says nothing of a subject: a module of any subject may build on the skill.
  - The ID is the same in a module and outside it: an anchor skill has no full ID, and the learner model, the engine and a learner's progress know it by this one.
- The title and the description of an anchor skill are English text of the schema, not text of a module: an anchor skill has no explanation language. The description says what a learner who has the skill can do, and it is normative (section 2).
- A module names anchor skills in three places:
  - among the `prerequisites` of a skill, as what the skill needs (section 12);
  - in the `teaches` of a skill, as what the skill teaches (section 12);
  - in the `dependencies` of its manifest, as what its skills need (section 11).
- Whether a learner has an anchor skill, the learner model decides by the skills that teach it in the learner's modules (architecture 3.8). An anchor skill that none of the learner's modules teaches holds back no skill that needs it: the engine takes it as unknown (concepts 4).
- The format checks each module on its own, so it sees no cycle of prerequisites that runs through anchor skills from one module to another.
- The vocabulary changes by the format's versions (section 2), and v1 keeps only the anchor skills that a module of the first slice names. How a third-party author proposes an anchor skill is for the rules of publication (О-9).
