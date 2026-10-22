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
- A module names the format version it is written in as a string, such as `"0.1"`. The place where it names it is the same in every version of the format; the manifest's schema defines it.
- A module is checked, built and run by the version it names, against the schemas of exactly that MAJOR.MINOR. It MUST use only what that version has. A reader MUST refuse, with a reason, a module that names a version it does not read: one newer than the reader knows, or one outside the versions the platform reads (below).
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
- A version number never goes back and is never reused: undoing a change is a new version too. A fault in `module-kit` that the test vectors catch is not a change of the format.
- While the format is v0 (0.y), nothing is promised: every change is the next 0.y, and the platform reads only the current version. From v1 on, it reads the current major version, with all its minor versions, and the previous major version. v0 leaves when v1 comes out, and each previous major version leaves when the next one comes out.
- Version 0.1 is a draft until the first release of `spec`'s line 0.3, the first release that carries the schemas as files for code (RUN.md, T35). Until then the tasks that write the format change 0.1 without raising the number, and no code takes it (R21).
- The format becomes v1 by the author's decision, once the three modules of the first slice have passed through the platform with no subject code in its core (R08). v1.0 is the last 0.y without anything that no module of the first slice used. After v1, a new canvas kind or check kind comes in a minor version, together with the module that needs it first.

## 3. Files

```
format/
├── README.md     this text
├── VERSION       the format's version, MAJOR.MINOR
├── schemas/      <term>.schema.json; common.schema.json for definitions that parts share
├── examples/     <term>/valid/<case>.yaml and <term>/invalid/<case>.yaml
└── vectors/      rules/<rule-id>/, open-view/, and the vectors of check kinds and templates
```

- `<term>` is the concepts 15 term for the part a schema describes, in kebab-case: `manifest`, `skill-graph`, `task`.
- A case is named in kebab-case for what it shows: `missing-title.yaml`.
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
- Field names and the values of lists are the English terms of concepts 15 in snake_case: `answer_slots`, `trap_advice`. A field that names no term — `id`, `title`, `version` — is a plain English word. An array takes the plural. A new term enters concepts 15 before it enters a schema (R42). Names under `$defs` are snake_case too.
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
- `vectors/rules/<rule-id>/` holds the vectors of one format rule. Each case breaks that rule and nothing else. It is a file, or, for a rule that spans files, a folder laid out as a module.
  - A vector of a part's rule is valid against the part's schema, so only the rule refuses it.
  - A vector of a `yaml.*` rule breaks only that YAML rule.
  - `spec`'s CI checks both. `module-kit`'s CI checks that each case is refused with the rule's ID.
- `vectors/open-view/` holds the vectors of the open view: a part, and the exact open view it gives.
- The vectors of check kinds, of templates and of the generator come with the tasks that define them.
