# The NovaTrail module format

This is the text of the module format: what a NovaTrail module may and must contain, and how the platform checks it. It is normative, as are the schemas and the test vectors beside it (R42). The documents under `docs/` describe the platform in Russian and add no rules to the format. The conventions of this text are decision R45, and its versions are R44.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

## 1. About the format

- A module is data: not code, and not instructions to a model (R02). The platform reads it the same way every time.
- The format is the schemas in `schemas/`, this text and the test vectors in `vectors/` (R42). What a schema cannot say, this text says as a format rule (section 7). The examples in `examples/` show the format and check the schemas, but they add no rules.
- `module-kit` implements the format: it reads a module, checks it against the schemas and the format rules, builds its package (section 25), the module index (section 26) and its open view and the instances of its templates, and runs its check kinds, its leak check, its generator and the solvers of its templates (R17; architecture 3.7). An implementation that does not pass the test vectors does not conform to the format.
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
  - a new place of randomness that shifts no numbers in the places before it, a new function of the generator, or a new first name of the places of a module (section 22);
  - a new construct of the expressions of templates, a higher limit of their combinations, or parameters of an item (section 23);
  - a higher budget of a solver's steps, a longer program, or a helper function that a solver may call (section 24);
  - a new member of the canonical view, or a new entry of the listing of a device part (section 25);
  - an optional member of the module index or of its entries, or a new reason of withdrawal (section 26).
- A major version is everything else:
  - a field removed, renamed or made required;
  - something valid made invalid, a new or stricter format rule among them;
  - anything that can give a different verdict, trap, open view, leak or numbers on the same inputs: the behaviour of a check kind or of its normalization, how the verdicts of an item's answer slots make the item's, the limit of a predicate's steps, how a wrong value matches a trap, what the leak check searches for and finds (section 20), the generator, the derivation of seeds, a function of the generator or how many integers it draws (section 22), the meaning of a template's expressions, the order of its combinations, how an instance is picked and how its placeholders are replaced (section 23), what a solver gets and returns, the order of its calls, its dialect and a lower budget of its steps (section 24), what a member of the canonical view holds, its canonical text, the inventory and how a digest is taken (section 25), how an entry of the module index is derived from a package (section 26), a closed field opened.
- Editorial changes give no new version. These are descriptions, examples, wording of this text that keeps its rules, and a test vector that pins what the text already says; the tag of `spec` names such a revision.
- The anchor skills of the shared taxonomy are part of the format (section 13).
  - A new anchor skill is a minor change, and so is marking one `"deprecated": true`: a module MAY still name it until a major version removes it.
  - Removing an anchor skill is a major change, and so is changing what it means. A change of meaning is made as a removal and an addition: the skill with the new meaning comes in under a new ID, and the old ID is removed. The learner model knows an anchor skill by its ID alone, so an ID never takes another meaning.
  - The description of an anchor skill is normative, since it says what the skill means: other words with the same meaning are an editorial change.
  - The ID of an anchor skill is never reused.
- The module index keeps the entries of every version of the format (section 26), so its members keep their places and meanings in every version, while the format is v0 too, as `module_format_version` keeps its place in a manifest: `module_format_version` and `modules` at its root, and `module_format_version`, `package_digest`, `release`, `teaches` and `withdrawn` in an entry. A version MAY add only an optional member and a reason of withdrawal. A reader reads these members of an index of any version by their places alone, not by the schema of its own version, which refuses what a later version adds: it skips an entry whose format version it does not read, rather than refuse the index.
- A version number never goes back and is never reused: undoing a change is a new version too. A fault in `module-kit` that the test vectors catch is not a change of the format.
- While the format is v0 (0.y), nothing is promised beyond the places that this section keeps in every version: every change is the next 0.y, and the platform reads only the current version. From v1 on, it reads the current major version, with all its minor versions, and the previous major version. v0 leaves when v1 comes out, and each previous major version leaves when the next one comes out.
- Version 0.1 is a draft until the first release of `spec`'s line 0.3, the first release that carries the schemas as files for code (RUN.md, T35). Until then the tasks that write the format change 0.1 without raising the number, and no code takes it (R21).
- The format becomes v1 by the author's decision, once the three modules of the first slice have passed through the platform with no subject code in its core (R08). v1.0 is the last 0.y without anything that no module of the first slice used. After v1, a new canvas kind or check kind comes in a minor version, together with the module that needs it first.

## 3. Files

```
format/
├── README.md     this text
├── VERSION       the format's version, MAJOR.MINOR
├── schemas/      <term>.schema.json; common.schema.json and shared-taxonomy.schema.json, which parts refer to; canonical-view.schema.json and inventory.schema.json, of a package; module-index.schema.json; verdict-vector.schema.json, leak-vector.schema.json, random-vector.schema.json, template-vector.schema.json, tier-vector.schema.json, package-vector.schema.json and index-vector.schema.json
├── examples/     <term>/valid/<case>.yaml and <term>/invalid/<case>.yaml; module/valid/<case>/
└── vectors/      rules/<rule-id>/, open-view/<part>/<case>/, verdicts/<kind>/<case>.yaml, leaks/<case>.yaml, random/<case>.yaml, templates/<case>.yaml, tiers/<case>.yaml, packages/<case>/, indexes/<case>/
```

- `<term>` is the concepts 15 term for the part a schema describes, in kebab-case: `manifest`, `skill-graph`, `task`. A catalog is named by the entries it holds, in the plural: the trap catalog is `traps`, and the technique catalog `techniques`.
- Twelve schemas describe no part. The parts refer to two of them: `common.schema.json` holds the definitions that parts share, and `shared-taxonomy.schema.json`, named by its term, the anchor skills (section 13). Two describe a module's package, each named by its term (section 25): `canonical-view.schema.json` its server part, which refers to the parts' schemas, and `inventory.schema.json` its inventory and the listing of its device part. `module-index.schema.json`, named by its term, describes the module index (section 26), and refers to the inventory's form of a digest. The other seven describe test vectors (section 9): `verdict-vector.schema.json` those of verdicts, `leak-vector.schema.json` those of the leak check and `template-vector.schema.json` those of templates, which refer to the task's, `random-vector.schema.json` those of the generator, which refers to none, `tier-vector.schema.json` those of tiers, `package-vector.schema.json` those of packages, which refer to the schemas of a package, and `index-vector.schema.json` those of the module index, which refers to its schema; `template-vector.schema.json` takes its form of a seed from `random-vector.schema.json`, and the numbers of an instance from `canonical-view.schema.json`. Of these twelve, only `inventory.schema.json` and `module-index.schema.json` have examples of their own: the examples of the parts show the first two, the vectors of packages show the canonical view, and their vectors show the seven schemas of vectors.
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

- The open view of a part of a module is what the learner's app receives: the part without its closed fields (architecture 1; R05). `module-kit` builds it from the marks in the schemas, and so does `spec`'s CI for the vectors of the open view (section 9).
- A field is open when its subschema carries `"x-open": true`.
  - The mark MUST stand only in a subschema under `properties`, `patternProperties` or `additionalProperties`. It MAY stand beside `$ref`.
  - The mark MUST NOT stand in what `if`, `not`, `contains` or `propertyNames` holds: no place of the part is open by it, so it would count for nothing.
  - Its value MUST be `true`.
  - A field without the mark is closed, so a new field stays closed until it is opened.
- A place in a part is open when its parent is open and the place either is an element of an array or carries the mark. The root of a part is open.
- A mark counts only where its subschema applies and passes, as JSON Schema 2020-12 collects an annotation only from a subschema that passes ([core](https://json-schema.org/draft/2020-12/json-schema-core), §7.7.1.2). So the subschemas whose marks count at a place are:
  - the place's own, and what its `$ref` names, beside the other keywords there;
  - every branch of `allOf`, each branch of `anyOf` that passes, and the branch of `oneOf` that passes;
  - `then` when `if` passes, and `else` when it fails;
  - each branch of `dependentSchemas` whose key the object has;
  - and, through them, for a field: its subschema under `properties`, under each key of `patternProperties` that matches it, and under `additionalProperties` where neither matches in the same subschema; for an element of an array: its subschema under `prefixItems`, or else under `items`.
- An open object whose fields are all closed stays in the open view, as an empty object.
- When an open object chooses a branch of `oneOf`, or a `then` of an `if`, by one of its fields, that field MUST be open.
- A check — with its key, its trap values, its predicate, the options of a choice written by hand and the criteria of a rubric —, the solution of a task, a trap, of the trap catalog or of a task, a leak phrase and the `template` of a task MUST NOT be open (R05; sections 15, 16, 20 and 23). The demo of a worked example in a lesson is open: a worked example is no task (section 21).
- Opening a closed field is a major change; a new field that is open from the start is a minor one (section 2).

## 7. Format rules

- A format rule says what the schemas cannot say: that a graph has no cycles, that a reference names something that exists, that a key is right. The YAML rules of section 4 are format rules too. `module-kit` checks them (architecture 3.7).
- A rule has an ID, `<part>.<name>` in kebab-case, where the part is the one in which a breach is reported: `skill-graph.acyclic`. A rule also has a statement with MUST. An ID is never reused.
- A reader MUST refuse a module that breaks a rule and name the rule's ID.
- The rules of the module index, `module-index.<name>`, refuse to build an index rather than a module: `module-kit` MUST refuse to build an index that would break one, and name the rule's ID (section 26).
- A new rule, or a stricter one, is a major change (section 2).
- Each rule has test vectors (section 9): a rule of the module index among the vectors of the index, and every other rule in a folder of its own. The rules of each part are listed in this text as the part is written, in a table whose first column is the rule's ID, as section 4 lists the YAML rules.

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
- `vectors/rules/<rule-id>/` holds the vectors of one format rule, but a rule of the module index. Each case breaks that rule and nothing else. It is a file, or, for a rule that spans files, a folder laid out as a module (section 10).
  - A vector of a part's rule is valid against the part's schema, so only the rule refuses it. Laid out as a module, it holds a file of that part and follows the rules of a whole module.
  - A vector of a `yaml.*` rule is a file, and it breaks only that YAML rule.
  - A vector of a rule of a whole module is a folder, and it breaks only that rule of a whole module. Each file in it that has a part follows the YAML rules and is valid against its part's schema.
  - A manifest in a vector names the format version in `VERSION`, except in a vector of `manifest.format-version`, which names one that a reader of that version does not read (section 2).
  - `spec`'s CI checks that a case breaks none of the YAML rules but its own, that each file of a part with a schema is valid against it, and that a case laid out as a module breaks no rule of a whole module but its own. That a case breaks its rule, it checks only for the rules it implements itself: the YAML rules, the rules of a whole module, `manifest.format-version`, the rules of a task that an answer slot's check shows by itself — `task.choice-key`, `task.choice-options`, `task.fraction-key` and `task.trap-values` —, `task.no-leaks` and `lesson.no-leaks`, and the rules of templates: `task.template-names`, `task.template-expressions`, `task.placeholders`, `task.template-instances` and `task.instances`. Not `task.template-solver`: `spec`'s CI runs no solver (section 24). Those rules of a task it checks on every instance of a template, as sections 23 and 24 say, and it checks them also on the valid examples of a task and of a whole module, which break none of them, and on the cases of every other rule, which break none of them either; and `lesson.no-leaks`, which spans files, on the valid examples of a whole module and on the cases of every other rule laid out as a module. A case of `lesson.no-leaks` is a folder. `module-kit`'s CI checks every case: that it is refused with the rule's ID.
- `vectors/open-view/<part>/<case>/` holds the vectors of the open view: a folder of its own kind, not laid out as a module, with two files and nothing else. `part.yaml` is a part, valid against the schema of `<part>`, which is a part of the layout (section 10); `open-view.yaml` is the exact open view of it (section 6), whatever the order of keys. Both follow the YAML rules, and a manifest names the format version in `VERSION`. `spec`'s CI builds the open view of each case from the marks in the schemas and compares the two, and so does `module-kit`'s CI.
- `vectors/verdicts/<kind>/<case>.yaml` holds the vectors of verdicts: a folder for each check kind that gives verdicts, named by its code in kebab-case, and in it a file for each case. A case is valid against `schemas/verdict-vector.schema.json` and follows the YAML rules. It holds `item`, an item of a task whose answer slots are all checked by the kind of its folder, and which breaks no rule of a task, and `readings`: each the value read in every answer slot of the item, in order, with what each answer slot gets — its verdict, for `unreadable` the reason, and for a value that matches a trap value the trap — and the verdict that the item gets (section 15).
  - `spec`'s CI computes each verdict, reason and trap from section 15 and compares, and so does `module-kit`'s CI. Of the rules of a task, `spec`'s CI checks on the item those that an answer slot's check shows by itself: `task.choice-key`, `task.choice-options`, `task.fraction-key` and `task.trap-values`.
  - A predicate is the exception: `spec`'s CI has no Starlark, and computes only what a predicate gives before it runs, `blank` and `notation`. Its `correct`, `not_yet` and `unchecked` only `module-kit`'s CI computes.
- `vectors/leaks/<case>.yaml` holds the vectors of the leak check (section 20): a file for each case, valid against `schemas/leak-vector.schema.json`, which follows the YAML rules. It holds `task`, a task that breaks no rule within its part, and `texts`: each a `text` that the learner might see, with `leaks`, every key and leak phrase of the task that the leak check finds in it, as the task writes them, in any order. `spec`'s CI searches each text as section 20 says and compares, and so does `module-kit`'s CI. Of the rules of a task, `spec`'s CI checks on the task those that it implements (above), `task.no-leaks` among them.
- `vectors/random/<case>.yaml` holds the vectors of the generator (section 22): a file for each case, valid against `schemas/random-vector.schema.json`, which follows the YAML rules. It holds the start of a stream — `state`, its two words, and, when the stream is a place of randomness's, the `seed` and the `names` of the place, whose state it is — and `draws`: the functions called on the stream, in order, each with its arguments and the value it gives. An integer of 64 bits is written as a string of decimal digits, since a YAML number holds an integer of 53 bits at most (section 4). `spec`'s CI derives each state and computes each value as section 22 says and compares, and so does `module-kit`'s CI.
- `vectors/templates/<case>.yaml` holds the vectors of templates (section 23): a file for each case, valid against `schemas/template-vector.schema.json`, which follows the YAML rules. It holds `task`, a template that breaks no rule of a task; `count`, the number of its instances; when the template has a solver, and only then, `inputs`, the names of the numbers that its solver gets, in any order (section 24); and `attempts`: each a `seed`, the `numbers` of the instance it gets — every parameter, derived number and result of the solver — and that `instance`, the task with its numbers in place. A seed is written as in the vectors of the generator. `spec`'s CI counts the instances, derives the place of each seed, picks its instance, replaces its placeholders and compares, whatever the order of keys, and checks on the instance the rules of a task that it implements; so does `module-kit`'s CI. The results of a solver are the vector's: `spec`'s CI takes them as given, and checks `inputs` against the open view of the template, and `module-kit`'s CI runs the solver on each instance and compares its results too. The open view of an instance is the open view of a task, which the vectors of the open view pin.
- `vectors/tiers/<case>.yaml` holds the vectors of tiers (section 12): a file for each case, valid against `schemas/tier-vector.schema.json`, which follows the YAML rules. It holds `skill_graph`, a skill graph whose prerequisites among the module's skills run in no cycle, and `skill_tiers`, the tier of each of its skills, as the canonical view holds it (section 25). `spec`'s CI computes each tier as section 12 says and compares, and so does `module-kit`'s CI.
- `vectors/packages/<case>/` holds the vectors of packages (section 25): a folder of its own kind with two things and nothing else. `module/` is a module, laid out as one (section 10), which breaks no rule, as an example of a whole module does; `package.yaml`, valid against `schemas/package-vector.schema.json` and following the YAML rules, is its package: `server_part`, its canonical view, `device_part`, the listing of its device part, `inventory` and `digest`. `spec`'s CI builds the package of `module/` and compares each, whatever the order of keys, and so does `module-kit`'s CI; the digests pin the canonical text, byte for byte. The results of a solver are the vector's, in the instances of `server_part`: `spec`'s CI takes them as given, as in the vectors of templates, and `module-kit`'s CI runs the solver and compares.
- `vectors/indexes/<case>/` holds the vectors of the module index (section 26): a folder of its own kind with two things and nothing else. `modules/` holds the modules of a release, each in a folder `<name>/` laid out as a module, which breaks no rule, as an example of a whole module does, and whose templates have no solver: `spec`'s CI runs none, and the vectors of packages pin the numbers of instances. `index.yaml`, valid against `schemas/index-vector.schema.json` and following the YAML rules, holds the release: the `previous` index, unless it is the first release, its `release` tag, its `withdrawals`, by module ID and version, each with its reason, and either the `index` that the release builds or the `refusal`, the ID of the rule of the index by which the build is refused. A refusal breaks only that rule, and each rule of the index has a refusal. The index that a case builds names the format version in `VERSION` at its root, and its previous index names that version or an earlier one, as the index of the release before a new version of the format does. `spec`'s CI builds the package of each module and the index as section 26 builds them, and compares the index, whatever the order of keys, or the rule that refuses it; and so does `module-kit`'s CI.

## 10. A module

- A module is a folder. Which files it holds, and where each one stands, is the layout below. Where the folder lies and what it is called is not the format's to say: the repository that holds modules decides it.
- A path is written from the module's folder, with `/` between names. `<path>` stands for one name or more, joined by `/`, and `<id>` before the extension of the last name stands for one name of the form of a local ID: `tasks/<id>.yaml`.

| Path | Part | Holds |
|---|---|---|
| `manifest.yaml` | `manifest` | The manifest: what the module is and whom it is for (section 11). |
| `skill-graph.yaml` | `skill-graph` | The skill graph: the module's skills and what a learner needs before each (section 12). |
| `traps.yaml` | `traps` | The trap catalog: the typical mistakes that the module's tasks catch (section 16). |
| `techniques.yaml` | `techniques` | The technique catalog: the ways of solving that the module names and teaches (section 17). |
| `solving-steps.yaml` | `solving-steps` | The solving steps: the frame through which the tutor leads a learner within a task (section 18). |
| `tasks/<id>.yaml` | `task` | A task, a file for each, named by its local ID (section 14). |
| `lessons/<id>.yaml` | `lesson` | A lesson, a file for each, named by its local ID (section 21). |
| `media/<path>` | — | The pictures and sound that the parts of the module show. |
| `eval/<path>` | — | The module's eval set: the samples on which the platform checks that AI reads work in this module right. |
| `LICENSE` | — | The text of the license that the manifest names. |
| `NOTICE` | — | The notices that the licenses of the module's content require to keep with it. |

- The part of a file is the term whose schema checks it: such a file is YAML (section 4) and valid against `schemas/<part>.schema.json`. No schema checks a file whose part is —.
- Each part adds its row to the layout when it comes into the format. A part that a module has once is one file at its root, named by its term, and a catalog by its entries (section 3): `skill-graph.yaml`, `traps.yaml`. A part that a module has many of, such as tasks and lessons, is a folder with one file for each entry, `<id>.yaml`, named by the entry's local ID, and the file holds that ID in its field `id` (`module.file-ids`).
- The names in a path compare exactly, as the folder lists them, letter case and all: `Manifest.yaml` is not `manifest.yaml`, and `NOTICE.txt` is not `NOTICE`. A reader MUST compare the names it lists rather than open a file by its name: a file system that ignores letter case would open `Manifest.yaml` for `manifest.yaml`.
- A file or folder whose name begins with `.` is not part of the module, nor is anything in such a folder: a reader MUST leave it out of the module. A folder with no file in it holds nothing.
- A module holds files and folders only: no symbolic links.
- The order in which a folder lists its files carries no meaning.
- No learner's work is part of a module: a module is published under an open license, and it cannot be recalled. Its eval set holds synthetic samples, and samples that adult volunteers and authors made for it.

**IDs.**
- The ID of a module is `<publisher>/<name>`: `novatrail/olympiad-math`. A publisher owns the namespace of its modules' names, so two authors' modules never share an ID. The project publishes the official modules, and a third-party author publishes their own.
- A skill, task, trap, technique or lesson is an entry of the module and has a local ID, unique among the module's entries of its kind: a skill and a task may share one. A file of a module names the module's own entries by local ID.
- Outside its module, an entry is named by its full ID: the module's ID, the entry's kind and its local ID, joined by `/`, as in `novatrail/olympiad-math/skill/counting-gaps`. The kinds are `skill`, `task`, `trap`, `technique` and `lesson`. The learner model, the engine and a learner's progress name an entry so, and a module never writes a full ID.
- An anchor skill of the shared taxonomy is no entry of a module: its ID, `core.<name>`, is its own, the same in a module and outside it (section 13).
- A band of the module's difficulty scale (section 11) has an ID of the form of a local ID, unique among the module's bands. It is no entry of the module, and no full ID names it.
- The forms of these IDs and of a module's version are `module_id`, `local_id`, `band_id` and `module_version` in `schemas/common.schema.json`.

**Languages.** A module has one explanation language, which its manifest names. Every text of the module is in it, except the material of a language module, which is in the language the module teaches. This version of the format has no translations: the same content in another explanation language is another module.

**Media.** `media/` holds the pictures and sound of the module in four formats, each with one extension: PNG (`.png`), JPEG (`.jpg`), WebP (`.webp`) and MP3 (`.mp3`). A part refers to a media file by its path from `media/`, as `media_path` in `schemas/common.schema.json` defines it: `pictures/ladder.png`. The rule `module.media` checks each file of `media/`: that it stands at such a path, and that it begins with the signature of the format its extension names, as [WHATWG MIME Sniffing](https://mimesniff.spec.whatwg.org/), §6.1 and §6.2, gives them:

| Format | The file begins with |
|---|---|
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| JPEG | `FF D8 FF` |
| WebP | `52 49 46 46` (`RIFF`), four bytes of any value, then `57 45 42 50 56 50` (`WEBPVP`) |
| MP3 | `49 44 33` (`ID3`), or the header of an MPEG audio frame of layer III: `FF`, a byte whose highest three bits are set and whose bits 2 and 1 are `01`, and a byte whose highest four bits are not all set and whose bits 3 and 2 are not both set |

The signature is all that `module.media` reads: that the rest of the file is a picture or a sound that every browser shows is the author's to make sure of.

**Eval set.** `eval/` holds the module's eval set. The format of its samples comes with the eval protocol; until then, the format says only where they lie. The eval set is no part of the module's package (section 25).

**License.** `LICENSE` holds the text of the license that the manifest names in `license` (section 11), as plain text: for an official module, the text of Apache-2.0 that the repository's own `LICENSE` holds. Every module has one, since a license such as Apache-2.0 asks that whoever gets the content gets a copy of it, and the module's package carries it to every reader, the learner's device among them (section 25; `module.license`). The format does not check that the text is the license's: that is the author's to make sure of, as the notices are.

**Notices.** `NOTICE` holds, as plain text, the notices that the licenses of the module's content require to keep with it: for content under the MIT License, its copyright notice and permission notice. A module whose licenses require none has no `NOTICE`. A comment in a file of a part does not reach the package, which holds the parts' values (section 25), so a notice that a license requires stands in `NOTICE`, whatever a comment beside the content also says.

**Plain text.** `LICENSE` and `NOTICE` are UTF-8, with no byte order mark, and every line of them ends with LF alone (`module.plain-text`). The package carries them byte for byte, so a checkout that turned their line ends into CR LF would change the package's digest.

**Rules.** The rules of a whole module have the part `module`, which has no schema. A module can break more than one, as one with `Manifest.yaml` in place of `manifest.yaml` breaks both `module.manifest` and `module.layout`, but each test vector breaks one of them alone: a folder that holds no manifest and nothing out of place breaks `module.manifest` only. What lies in `media/` is the concern of `module.media`, and `module.layout` only places it.

| ID | Rule |
|---|---|
| `module.manifest` | The folder of a module MUST hold the file `manifest.yaml`. |
| `module.layout` | Every file of a module MUST stand at a path of the layout above, and a module MUST hold nothing but files and folders. A file or folder whose name begins with `.` is not the module's, and the rule does not see it. |
| `module.file-ids` | A file at a path with `<id>` MUST hold, in its field `id`, the name it has before its extension. |
| `module.media` | Every file in `media/` MUST stand at a path of the form `media_path` from `media/`, and MUST begin with the signature of the format its extension names. |
| `module.license` | The folder of a module MUST hold the file `LICENSE`, and it MUST NOT be empty. |
| `module.plain-text` | `LICENSE` and `NOTICE` MUST be UTF-8, with no byte order mark, and MUST hold no carriage return: every line ends with LF alone. |

## 11. The manifest

- The manifest is `manifest.yaml`, valid against `schemas/manifest.schema.json`. It says what the module is: the format version it is written in, its ID and version, its title and subject, whom it is for, the bands of its difficulty scale, its languages, the anchor skills it builds on, the settings of its canvas, its authors and its license. Every field is open: the learner's app shows them.
- `module_format_version` names the version of the format the module is written in, as a string: `"0.1"`, since a plain `0.1` is a number (section 4). The field stands at the root of the manifest in every version of the format (section 2).
- `id` is the module's ID (section 10). `version` is its version in Semantic Versioning 2.0.0, `X.Y.Z`, with no pre-release and no build metadata. It is written in quotes, `"1.2.0"`, since a plain string MUST NOT begin with a digit (section 4).
- `title` is in the module's explanation language.
- `subject` is a code: `mathematics`, `physics` or `writing`. A new code is a new value of a list, a minor version (section 2).
- `audience.age_categories` lists the age categories that the module suits: `under_13`, `from_13_to_consent` (from 13 to the age of digital consent in the learner's country), `from_consent_to_18` and `adult`. The platform offers the module only to learners in one of them. The presentation style follows the learner's age, or the learner's choice, and the manifest does not name it in this version.
- `audience.grades` lists the school grades that the module is written for, from 1 to 12, as its author counts them: the platform maps no country's grades onto another's.
  - A module that names grades asks the learner's grade, and the platform keeps the answer in the learner's profile (privacy 4). The answer may be a grade the module does not name.
  - Grades close nothing, unlike the age categories: the module and each of its skills stay open to a learner of any grade, and a skill opens by its prerequisites (concepts 4).
  - A learner of a grade starts in the band that holds the grade (`bands`, below).
  - This version has no grade 0 and no grade above 12; allowing them is a minor change (section 2).
- `bands` lists the bands of the module's difficulty scale, from the easiest, each with its `id`, its `title` in the module's explanation language and, in a module that names grades, the `grades` it is written for. Each task names its band and a difficulty from 1 to 5 within it (section 14), so a module with tasks has bands. In the module of olympiad mathematics the bands are grades 1–2, 3–4 and 5–6, as in MathTrail.
  - In a module that names grades, every band names grades, and every grade of `audience.grades` is in exactly one band: a learner of that grade starts in it. In a module that names no grades, no band names grades (`manifest.bands`). A module with no tasks MAY leave `bands` out.
  - Where a learner starts whose grade is in no band, or who gave none, is the learner model's to decide (architecture 3.8): MathTrail moved such a grade to the nearest band. So are the numbers of the scale: how far apart the bands stand, and whether they overlap.
- `languages.explanation` is the module's explanation language. `languages.target`, which only a language module has, is the language it teaches.
  - A language is a BCP 47 tag of a language subtag, an optional script and an optional region, each in the letter case of the registry: `en`, `zh-Hans`, `pt-BR`, `es-419`. BCP 47 compares tags whatever their case ([RFC 5646](https://www.rfc-editor.org/rfc/rfc5646), §2.1.1); the format fixes the case, so that a tag is always written as the same string.
  - The schema checks the form of a tag, not that the registry has it.
  - Norwegian, `no`, is written in quotes, since a plain `no` breaks `yaml.plain-strings`.
- `dependencies` lists the anchor skills of the shared taxonomy (section 13) that the module's skills need: exactly those that its skill graph names as prerequisites. A module whose skills need none leaves the field out. So what a module builds on is seen from its manifest alone; what it teaches other modules is in its skill graph, in `teaches` (section 12).
- `canvas.digit_height` is the height, in px, that a digit or a letter of the learner's writing has on a crop that goes to be read, of a handwriting sheet or of a box of a workbook: an integer from 1 to 256, 32 unless given. It is the module's setting, the same for each of its tasks: the learner's app gets it in the open view of the manifest, which the server gives once for the package of an attempt, not with each task (section 25).
- `authors` lists who wrote the module, each by `name`: a person or an organization.
- `license` is an identifier of the [SPDX License List](https://spdx.org/licenses/): `Apache-2.0` for an official module. An SPDX expression, such as `MIT OR Apache-2.0`, is not in this version.
- `rung_templates` are the templates of the first two rungs of the hint ladder, in order, in the module's explanation language: what the learner reads after a wrong answer when the tutor's question did not come or did not pass its checks, and neither a trap text nor a trap's advice fits (section 19). They are two texts, and they differ, so that a fallback never repeats the one before it. A module with an item with a verdict (section 15) has them (`manifest.rung-templates`): a module of rubrics alone has no hint ladder and needs none. `task.no-leaks` searches them for the keys and leak phrases of every task with an item with a verdict, so they SHOULD hold no number and name nothing that a task might have as its answer.

| ID | Rule |
|---|---|
| `manifest.format-version` | `module_format_version` MUST name a version of the format that the reader reads (section 2). A reader refuses a module that names another, and names this rule. |
| `manifest.dependencies` | `dependencies` MUST list exactly the anchor skills that the prerequisites in the module's skill graph name: each of them, and no other. |
| `manifest.bands` | When the manifest has `bands`, their IDs MUST differ. In a module that names grades, every band MUST then name grades, every grade of `audience.grades` MUST be in exactly one band, and no band MAY name a grade that `audience.grades` does not; in a module that names none, no band MAY name grades. |
| `manifest.rung-templates` | A module with an item with a verdict MUST have `rung_templates` in its manifest. |

## 12. The skill graph

- The skill graph is `skill-graph.yaml`, valid against `schemas/skill-graph.schema.json`. It names the module's skills: what each one is called, what a learner needs before it, how the platform can know a learner's command of it, and which anchor skills of the shared taxonomy it teaches. A module MAY have no skill graph, and then it has no skills.
- `skills` holds each skill under its local ID: its `title` and, if it has one, its `description`, both in the module's explanation language; its `prerequisites`; its `assessability`; and, if it teaches any anchor skill, its `teaches`. The order of the skills carries no meaning (section 4).
- `prerequisites` lists the skills that a learner needs before this one, and the learner needs each of them: to take on B, a learner needs A. A prerequisite is a skill of the module, by its local ID, or an anchor skill of the shared taxonomy, by its ID (section 13). A skill with no prerequisites leaves the field out: the list, when written, is not empty. The prerequisites among the module's skills form a directed graph with no cycle. They also order the module's lessons (section 21).
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

  The engine adapts to the learner only in a skill whose assessability is `verdict`. In the others, the author's order holds: the order of the skill graph and of a lesson's segments, and where the graph orders nothing, the engine's rule chooses without the learner model (section 21; concepts 4).
- `teaches` lists the anchor skills that the skill teaches: a learner who has the skill can do what the description of each says. Other modules build on them, and the learner model decides by such skills whether a learner has an anchor skill (section 13). A skill that teaches none leaves the field out. Several skills, of one module or of several, MAY teach the same anchor skill.
- **Retired skills.** A published skill ID never names another skill. A change in a skill's meaning cannot be seen in the module, so the author gives the changed skill a new ID. `retired_skills` holds each skill that an earlier version of the module had and this one has not, under the ID it had, with `replaced_by`: the skills of this version that took over what it taught.
  - A skill renamed has one skill in `replaced_by`, and a skill split has several. Skills merged into one each name that one.
  - `[]` says that no skill took over: a learner's progress in the retired skill moves to none.
  - `replaced_by` names skills of this version. When a skill that it names is retired in turn, the entry names that skill's replacements instead.
  - The learner model moves a learner's progress by this table: the evidence of a retired skill counts for each skill that replaced it, and how much it counts is the learner model's to decide (architecture 3.8).
  - An entry stays in every later version, so that progress of any age still moves. Retiring a skill raises the module's major version (concepts 3).
  - Only a comparison of two versions shows that every skill of the previous version is in this one or in `retired_skills`, and that no entry has gone. That comparison is `module-kit`'s (architecture 3.7), and the rules it checks come into this text with it.
- **Open fields.** `tiers` and `skills`, with every field of a skill, are open: the skill map shows them. The tier of a skill is no field of the part, nor of its open view: `module-kit` computes it into the canonical view of the package, as `skill_tiers` (section 25), and the server gives it to the skill map. `retired_skills` is closed: progress moves on the server.

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

  The module index names, for each published version of a module, the anchor skills that it teaches (section 26), so that the platform can offer a learner a module that teaches what the learner lacks.
- Whether a learner has an anchor skill, the learner model decides by the skills that teach it in the learner's modules (architecture 3.8). An anchor skill that none of the learner's modules teaches holds back no skill that needs it: the engine takes it as unknown (concepts 4).
- The format checks each module on its own, so it sees no cycle of prerequisites that runs through anchor skills from one module to another.
- The vocabulary changes by the format's versions (section 2), and v1 keeps only the anchor skills that a module of the first slice names. How a third-party author proposes an anchor skill is for the rules of publication (О-9).

## 14. The task

- A task is `tasks/<id>.yaml`, valid against `schemas/task.schema.json`, and its `id` is the name of its file before `.yaml` (section 10). It says what the learner reads, where and how they answer, what is right in each answer, which skills it trains, and how hard it is; and what helps the learner on the way: what the statement gives and asks, the techniques that help, the traps that the task catches, a simpler case, and its solution. What is right in an answer slot, and how the platform tells, is the answer slot's check (section 15).
- **Statement.** `statement` is what the learner reads: parts in order, each a paragraph, `text`, or a picture.
  - A paragraph is plain text in the module's explanation language. This version has no formulas and no sound in a statement; either is a minor change (section 2).
  - A picture is `picture`, its path from `media/` (`picture_path`: a PNG, JPEG or WebP file); `alt`, what it shows in words, which a screen reader reads and which stands in its place until it comes; and `width` and `height`, the size it is shown at in CSS px, narrower when the statement is. `alt` is empty only for a picture that only decorates.
  - The statement belongs to the author's template, which the learner does not erase or change. Whether it stands above the canvas or on it is the canvas kind's to say: a handwriting sheet shows it above the sheet.
- **Canvas.** `canvas` is one for the whole task. Its `kind` is `handwriting_sheet` or `workbook`.
  - A handwriting sheet is a free sheet of 1000 × 1400 units, from its top left corner, with y going down; its size is the kind's, not the task's. The task gives it a `grid` — `squares`, `lines` or `dots`, squares unless given — and a `grid_step` from 20 to 500 units, 50 unless given.
  - A workbook is a page of lines, one for each item, that the learner does not erase, with a box in a line for each answer. How the lines are laid out on the page is the canvas's.
  - Every task has the pen and the eraser. A field for other tools, such as a ruler or a calculator, is a minor change; so is a new canvas kind.
  - The height of a digit on the crop is the manifest's (section 11).
- **Items.** `items` lists the items of the task, each named by its place, from 1.
  - On a handwriting sheet, an item has `answer_slots`, and MAY have `text`: what it asks, such as "a)". The learner's app shows the `text`, with the options of the item's answer slots bound `choice`, beside the sheet: the sheet shows neither.
  - On a workbook, an item is a `line`: pieces of `text` and boxes, `binding: box`, in order, with at least one box, as in "7 × [ ] = 56" or "[ ] apples". Its boxes are its answer slots.
  - An answer slot is named by its place among its item's answer slots, from 1: the third item's second answer slot.
  - Every answer slot, a box too, has its `check` (section 15), and an item's verdict is made of its answer slots' verdicts.
  - An item MAY have a `simpler_case`: a similar case, simpler than the item, which the learner reads at the third rung of the hint ladder when the tutor's words do not come (section 19).
- **Bindings.** The `binding` of an answer slot says where and how the learner gives the answer.
  - `anywhere` — anywhere on the sheet: the learner writes the final answer where they like, and AI finds it. When it finds none, or more than one, the learner is asked to circle the answer, which is no wrong answer (concepts 9.1).
  - `sheet` — the whole sheet is the answer: a work as a whole, such as an essay, which a rubric gives feedback on.
  - `zone` — in a zone of the sheet: a rectangle, `zone`, whose `left` and `top` are how far it begins from the left and top edges of the sheet, and whose `width` and `height` are its size, all in units of the sheet. A zone lies on the sheet, and no two zones of a task overlap; zones that touch at an edge do not (`task.zones`). The names are not `x` and `y`: a plain `y` breaks `yaml.plain-strings` (section 4).
  - `choice` — the learner chooses one of the `options` by tapping it: two or more texts, all different, shown in their order. A choice that the learner writes by hand, such as a sign in a box, is a check kind instead, and its options are the check's (section 15).
  - `box` — a box in a line of a workbook.

  On a handwriting sheet the bindings are `anywhere`, `sheet`, `zone` and `choice`, and on a workbook `box`. An answer slot bound `anywhere` or `sheet` is the only answer slot of its task. An answer given by keyboard, an edit in the text of the statement and the state of a widget come in later versions, each a minor change; and only the bindings that a module of the first slice takes stay in v1 (section 2): so far no module takes `zone`.
- **Skills.** `skills` names the skills of the task: `primary`, the skills of the module, by local ID, that the task trains, so that a wrong answer is evidence against them; and `supporting`, the skills that the answer needs and that a wrong answer does not count against, skills of the module by local ID or anchor skills by their IDs (section 13).
  - An item MAY name `skills` of its own, which take the place of the task's for that item.
  - A skill is not both a primary and a supporting skill of an item (`task.skill-roles`).
  - A task names a skill of its module that teaches an anchor skill rather than the anchor skill itself, as a skill does in its prerequisites (`task.own-anchors`; section 12).
  - A supporting anchor skill does not enter `dependencies` (section 11), which hold what the skill graph's prerequisites name.
- **Band and difficulty.** `band` is the band of the module's difficulty scale that the task is in, by its ID in the manifest's `bands`, and `difficulty` is how hard the task is within its band, from 1 to 5 (section 11).
- **Age categories.** `age_categories`, when given, lists the age categories that the task suits, fewer than the module's: the platform gives the task only to learners in one of them (privacy 3.2). A task on the learner's own life, for instance, may be for adults alone (privacy 9, П-20). A lesson that names the task is given only to learners whom the task suits too (section 21).
- **Lessons.** A task MAY be a segment of a lesson, of one or of several, and it lives outside lessons too: the engine may give it for practice without an explanation (section 21).
- **Givens and unknown.** `givens` lists what the statement gives, each a short text, and `unknown` says what the task asks to find, in the module's explanation language. They are the chips that the learner ticks at a solving step that gives them (section 18), and what a hint asked for gives before the first answer (section 19). They restate the statement and tell no way to the answer.
- **Techniques.** `techniques` names, by local ID, the techniques of the module's technique catalog that help in the task (section 17). The learner gets them from the server, at a solving step that gives them or on request (section 19): a technique's title tells how to solve the task, as a skill's would.
- **Traps.** A task catches a trap of the module's trap catalog (section 16) in two ways:
  - by a wrong value: the check of an answer slot names the trap of each wrong value it knows, in `trap_values` (section 15), and the program finds the trap;
  - by the kind of mistake in the learner's work: `traps` names, by local ID, the traps that AI may suggest from the work, and such a trap's provenance is AI's (concepts 9.4). A trap that a trap value of the task shows SHOULD NOT be named in `traps` too: one mistake would then count twice, as the program's finding and as AI's.
- **Solution.** `solution` is how the task is solved, in parts as the statement is: paragraphs and pictures. The learner sees it once the task is solved, and AI reads it to find the first mistake in the learner's work (concepts 10). A task with an item with a verdict has one: the schema requires it of a task with a line, or with an answer slot bound other than `sheet`.
- **Leak phrases.** `leak_phrases` lists phrases that give the answer away beyond the keys themselves, in the module's explanation language: the leak check searches the texts that the learner sees before the task is solved for them (section 20). They carry what the keys cannot: an answer in words, a key that its item shows already, the answer to a predicate.
- **Template.** A task MAY be a template, with `template`: parameters whose numbers each attempt draws from its seed, and placeholders for them in the task's texts. An attempt gets one instance of it, and the rules of a task apply to every instance (section 23).
- **Provenance.** Everything in a module is its author's, so a task has no field for provenance (concepts 9.4). The key of a template is computed by its expressions or by its solver, as the template shows (sections 23 and 24).
- **Open fields.** `id`, `statement`, `canvas`, `items`, `givens` and `unknown` are open, with every field of them but the `skills` and the `simpler_case` of an item and the `check` of each answer slot: the learner's app shows them. Those, and `skills`, `band`, `difficulty`, `age_categories`, `techniques`, `traps`, `solution`, `leak_phrases` and `template`, are closed: the server reads them. A check holds what is right, a solution and a simpler case come only when the program gives them, and the title of a skill or a technique could tell how to solve the task.

| ID | Rule |
|---|---|
| `task.known-skills` | Every local ID in the skills of a task, and of its items, MUST be the ID of a skill in the module's skill graph. |
| `task.skill-roles` | No skill MAY be both a primary and a supporting skill of an item: of the task, for an item that names no skills of its own, or of the item itself. |
| `task.own-anchors` | A task MUST NOT name among its supporting skills an anchor skill that a skill of its module teaches. |
| `task.known-band` | The `band` of a task MUST be the ID of a band in the manifest's `bands`. |
| `task.known-pictures` | The `picture` of every part of a task's statement and of its solution MUST be the path, from `media/`, of a file of the module. |
| `task.age-categories` | Every age category of a task MUST be one of the manifest's `audience.age_categories`. |
| `task.zones` | Every zone of a task MUST lie on the sheet, so that `left` + `width` is at most 1000 and `top` + `height` at most 1400, and no two zones of a task MAY overlap. |

## 15. Checks

- A check says what is right in an answer slot and how the platform tells it. Every answer slot of a task has one, `check`: an answer slot of a handwriting sheet, and a box of a workbook's line (section 14). It names its `kind`, the check kind, and the kind's parameters.
- A check kind is code of the platform, the same for every module: a module chooses a kind and gives its parameters (R02), and `module-kit` runs it (R17). A new check kind is a minor change (section 2).
- The check is closed, every field of it, and its kind too: the learner's app gets none of it until the task is solved (section 6; R05). A statement that wants the learner to know what a rubric judges, or which signs a box takes, says so in its text.

**Kinds.**

| Kind | What is right | Parameters | Bindings |
|---|---|---|---|
| `number` | a number of the key's value | `key`; `units`; `trap_values` | `anywhere`, `zone`, `box` |
| `fraction` | a fraction of the key's value, in the form asked | `key`; `form`; `trap_values` | `anywhere`, `zone`, `box` |
| `choice` | the option that is the key | `key`; `options`, when the choice is written by hand; `trap_values` | `choice`; written by hand, `anywhere`, `zone` and `box` |
| `predicate` | a whole number that the predicate holds for | `predicate` | `anywhere`, `zone`, `box` |
| `rubric` | none: the work gets feedback by the criteria, not a verdict | `criteria` | `sheet` |

- `key` is a string, written in quotes: a plain number in YAML is a double, and `0.1` would not be one tenth. In a template, the key and the trap values of `number` and `fraction` MAY hold placeholders in the place of an integer, a numerator or a denominator, such as `"{second}"` and `"{part}/{whole}"`, and every instance has numbers in their place (section 23).
- `number`: `key` is an integer, a decimal with a point or a simple fraction, written as the notation below takes it: `"7"`, `"-3"`, `"2.5"`, `"3/4"`. `units`, when given, are the words that MAY follow the number in the answer, as rungs in "7 rungs": the singular and the plural both, when both are right.
- `fraction`: `key` is a simple fraction, `"3/4"`. `form` is `any` unless given, and then every fraction of the key's value is right. With `form: reduced`, only the fraction in lowest terms is right, and the key is that fraction (`task.fraction-key`): a fraction of the right value that can be reduced is not yet right.
- `choice`: `key` is one of the options, as written (`task.choice-key`). When the answer slot is bound `choice`, the options are the answer slot's, and the learner taps one. Otherwise the check holds its own `options`, two or more, and the learner writes one of them by hand: a sign `<`, `>` or `=` in a box, or a word. No two options of a choice are alike once normalized (`task.choice-options`).
- `predicate`: `predicate` is an expression of [Starlark](https://github.com/bazelbuild/starlark/blob/master/spec.md) that is `True` for every right answer and `False` for every other, such as `"value % 3 == 0 and value % 4 == 0"`. It is written on one name, `value`, the whole number read, and names nothing but `value` and Starlark's built-in names (`task.predicate-expression`). It is at most 1000 characters long: a check that needs more is a program, and the one program of this version is the solver of a template, which finds a key (section 24).
- `rubric`: `criteria` lists what the work is judged by, each criterion a `text` in the module's explanation language. AI gives the feedback by them (R04). A rubric gives no verdict, so the item has none.

The kinds that give a verdict are `number`, `fraction`, `choice` and `predicate`, and an item whose answer slots they check is an item with a verdict: sections 11, 19 and 20 name it so.

**Trap values.** `trap_values` lists the wrong values that the author knows, each with the trap it shows: `value`, the wrong value; `trap`, a trap of the module's trap catalog by local ID (section 16); and, if the author wrote one, `text`, what the learner reads after this wrong value, which names the mistake rather than retelling the solution (section 19). A check of `number`, `fraction` or `choice` MAY have them: a predicate has no key to be wrong against, and a rubric no verdict.
- A trap value is written as the key is: in quotes, and for `number` and `fraction` in the notation of the kind, at most 16 characters long. For a choice it is one of the options as written, other than the key.
- A value read is compared with the trap values as the check compares it with the key, after the same normalization: `6 rungs` matches the trap value `6` of a check with the units `rungs`, `9/12` matches `6/8` by value, and `EVEN` matches `even`. A value matches a trap only when its verdict is `not_yet`, and then it matches one at most: the trap values of a check are all `not_yet`, and no two of them are equal as the check compares them (`task.trap-values`).
- With `form: reduced`, a fraction of the key's value that can be reduced is not yet right, so a trap value MAY be such a fraction, as `6/8` for the key `3/4`: every fraction of that value that is not the key then matches it.
- The trap that a value matches is the program's finding, and it weighs as a verdict does (concepts 9.4).

**The value read.** A check judges the value read in its answer slot:
- for an answer written by hand, what AI read in the slot, as it is written, and for a slot bound `anywhere` the final answer that AI found;
- for a choice by tapping, the text of the option the learner tapped;
- nothing, when nothing was read: the value is null.

The reader gives the value as it is written: normalizing it is the check kind's, below, and is `module-kit`'s, not the reader's (R03). What else the reading says — that the writing is illegible or ambiguous, or that there is no final answer or more than one — makes the verdict `unreadable` before any check kind runs, and a failure of AI makes it `unchecked` (concepts 9.1). That is the observation's, which comes with the eval protocol; the test vectors of verdicts hold only the value.

**Verdicts.** The verdict of an answer slot is one of:
- `correct` — the value is right;
- `not_yet` — the value is in the kind's notation and is not right;
- `unreadable` — nothing was read, and the reason is `blank`; or the value is not in the kind's notation, and the reason is `notation`. The learner is asked to write the answer again, which is no wrong answer (R04);
- `unchecked` — the check could not run: of the kinds of this version, only a predicate gives it.

The verdict of an item is made of its answer slots' verdicts:
- `correct`, when every answer slot is correct;
- otherwise `not_yet`, when an answer slot is not yet right: a value read clearly and wrong is no doubt, and the item is not right whatever the others hold;
- otherwise `unreadable`, when an answer slot is unreadable;
- otherwise `unchecked`.

**Numbers.** `number`, `fraction` and `predicate` read the value in these steps:
1. Every superscript or subscript digit — U+00B2, U+00B3, U+00B9, or U+2070 to U+209F — becomes U+FFFD, the replacement character, which no notation takes: the next step would make `7²` into `72`. So does every vulgar fraction — U+00BC to U+00BE, U+2150 to U+215F, or U+2189 — that a number, a character of the general category N such as `1` or `１`, stands right before or right after: the next step would make `1½` into `11⁄2`, eleven halves. A unit such as `cm²` goes through the same step, and still matches (step 6).
2. The value is normalized to NFKC ([UAX #15](https://www.unicode.org/reports/tr15/)), so that a full-width `７` is `7` and `½` is `1⁄2`.
3. The hyphens and dashes U+2010 and U+2012 to U+2015, and the minus sign U+2212, become `-`; the fraction slash U+2044 and the division slash U+2215 become `/`.
4. Every run of white space, the characters with the Unicode property White_Space, becomes one space, and white space at either end is dropped.
5. A `=` at the start is dropped, and so is every `.`, `!` and `?` at the end: "= 7" and "7." are 7.
6. For `number` with `units`: of the units that end the value, with a space before it or none, the longest is dropped, when something stands before it; when nothing does, nothing is dropped. The units go through steps 1 to 5, as the value does, so that `cm²` and `min.` match, and are compared with it by the simple lowercase mapping of each character (below).
7. White space at either end is dropped again. A value that is now empty is blank.

The value is then in notation when it is at most 16 characters long and is:
- an integer, `-?(0|[1-9][0-9]*)`: `7`, `-12`, `0`;
- a decimal, `-?(0|[1-9][0-9]*)\.[0-9]+`: `2.5`, `-0.75`;
- a simple fraction, `-?(0|[1-9][0-9]*) ?/ ?[1-9][0-9]*`: `3/4`, `3 / 4`, `-1/2`.

`number` takes all three, `fraction` only a simple fraction, and `predicate` only an integer. So `07`, `+7`, `.5`, `1,5`, `1 000`, `1,000`, `1/0`, `1 1/2`, `1½`, `7e0` and a number in other digits are not in notation. A value in notation is compared with the key as a rational number, exactly, never through floating point: `3/6`, `0.5` and `1/2` are equal, and `9007199254740993` is not `9007199254740992`.

**Choices.** A choice normalizes the value and every option alike: NFKC, the dashes and slashes of step 3, the white space of step 4, and then each character to its simple lowercase mapping ([UnicodeData.txt](https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt), field 13), so that `ODD` is `odd` and `＜` is `<`. Nothing more is dropped: a `=` or a `.` can be what the learner chose. An empty value is blank. A value equal to the key is `correct`, a value equal to another option is `not_yet`, and any other value is not in notation: the learner wrote none of the options.

**Predicates.** The value is read as a number, and is in notation only as an integer. The expression is evaluated with `value` bound to that integer, a Starlark `int`:
- `True` gives `correct`, and `False` gives `not_yet`;
- an error, a result that is not a `bool`, or more than 1 000 000 steps, as go.starlark.net counts them (`Thread.SetMaxExecutionSteps`), give `unchecked`. So does `module-kit`'s clock, when it stops an evaluation that runs too long.

The limit of steps is the format's: the same expression on the same value takes the same steps on every machine, so the verdict repeats on the value stored (R03). The clock is not: how long an evaluation may take, and how many run at once, is `module-kit`'s to decide (architecture 3.7).

**What this version leaves out.** Text, an edit of a text, a quantity with its units, an order or a set, the state of a widget, and the steps of a solution — a check of each of its lines — are no check kinds of this version. Each would come as a new kind, a minor change, and only the kinds that a module of the first slice uses stay in v1 (section 2). The kinds of v0 are those its three modules need — numbers and fractions in the workbook of school mathematics, numbers and choices in olympiad mathematics, a rubric and choices in short essays — and the predicate, which v1 keeps only if one of them uses it.

- A statement SHOULD say what form the answer takes when a check asks for one: "in lowest terms", "Write <, > or =".
- The normalization follows the version of Unicode that the reader's release names. The test vectors use only characters that every version of Unicode from 15.0 on normalizes alike.

| ID | Rule |
|---|---|
| `task.choice-key` | The `key` of a `choice` check MUST be one of its options as written: the answer slot's `options` when it is bound `choice`, and the check's own otherwise. |
| `task.choice-options` | No two options of a choice MAY be the same once normalized as a choice normalizes them. |
| `task.fraction-key` | The `key` of a `fraction` check with `form: reduced` MUST be a fraction in lowest terms. |
| `task.trap-values` | Every trap value of a check MUST get `not_yet` from the check, read as a value of its answer slot: for a choice it is one of the options as written, other than the key. No two trap values of a check MAY be equal as the check compares them. |
| `task.predicate-expression` | The `predicate` of a check MUST be a Starlark expression, and MUST name nothing but `value` and Starlark's built-in names. |
| `task.assessability` | Each primary skill of an item that is a skill of the module's graph MUST be of the assessability `verdict` when the item's answer slots are checked by a kind that gives a verdict, and `rubric` when the item's answer slot is checked by a rubric. An item's skills are its own, or else its task's. So a skill whose assessability is `none` is only ever a supporting skill. |

## 16. The trap catalog

- The trap catalog is `traps.yaml`, valid against `schemas/traps.schema.json`. It names the module's traps: the typical mistakes that its tasks catch, each by name, so that a wrong answer becomes a diagnosis that can be counted, which a free-form name of a mistake cannot (concepts 7). A task names only a trap of the catalog (`task.known-traps`). A module MAY have no trap catalog, and then its tasks catch no trap.
- `traps` holds each trap under its local ID:
  - `description`, what the mistake is, in the module's explanation language. AI reads it to suggest the trap from the learner's work, and the learner's progress names the mistakes that repeat by it;
  - `skills`, when given, the skills of the module that the mistake belongs to, by local ID: the learner model counts the traps of a skill (concepts 11). A trap that belongs to no skill leaves the field out;
  - `trap_advice`, what to advise the adult or the learner on this mistake, in the module's explanation language. The learner's progress gives it beside a trap that repeats, and it is the fallback text of the first two rungs after a wrong value of the trap that has no text of its own (section 19).
- A published trap ID never names another trap: the learner's progress counts traps by their full IDs (section 10). The order of the traps carries no meaning (section 4).
- **Open fields.** None: the trap catalog is closed, and its open view is an empty object (section 6). A trap tells what mistake a task expects, and the learner's app does not get it (R05).

| ID | Rule |
|---|---|
| `traps.known-skills` | Every local ID in a trap's `skills` MUST be the ID of a skill in the module's skill graph. |
| `task.known-traps` | Every trap that a task names, in its `traps` and in the trap values of its checks, MUST be the ID of a trap in the module's trap catalog. |

## 17. The technique catalog

- The technique catalog is `techniques.yaml`, valid against `schemas/techniques.schema.json`. It names the module's techniques: ways of solving that can be named and taught, such as "start with small numbers" (concepts 7). A module MAY have no technique catalog, and then its tasks name no technique.
- `techniques` holds each technique under its local ID: its `title` and, if it has one, its `description` — what the technique is and when it helps — both in the module's explanation language. The order of the techniques carries no meaning (section 4), and this version gives them no numbers.
- A task names the techniques that help in it, in its `techniques` (section 14).
- **Open fields.** `techniques`, with every field of a technique, is open, as the skills of the skill graph are: the learner's app may show the catalog. Which techniques help in a task is closed, in the task (section 14).

| ID | Rule |
|---|---|
| `task.known-techniques` | Every local ID in a task's `techniques` MUST be the ID of a technique in the module's technique catalog. |

## 18. Solving steps

- The solving steps are `solving-steps.yaml`, valid against `schemas/solving-steps.schema.json`: the frame through which the tutor leads a learner within a task, such as Pólya's understand, plan, solve and check (concepts 7). A module MAY have none, and then its tasks are solved without steps.
- `steps` lists the steps in order, each named by its place, from 1. A step has:
  - `title`, what the learner does in it, in the module's explanation language;
  - `gives`, when given, what of the task the step gives the learner: `givens`, the task's `givens` and `unknown`, which the learner ticks; and `techniques`, the task's techniques, which the server gives when the step begins (section 19);
  - `exit_condition`, when the step ends, by an event on the learner's device and with no key:
    - `givens_ticked` — the learner has ticked every given and the unknown. Such a step gives `givens`, and on a task with neither it ends at once;
    - `answer_slots_filled` — every answer slot of the task holds something of the learner's: a stroke in its zone or its box, an option tapped, and for an answer slot bound `anywhere` or `sheet`, a stroke on the sheet;
    - `none` — the learner moves on.
- The state of a widget comes as a new exit condition, a minor change, with the widgets (concepts 7).
- Every task of the module goes through the same steps, and the learner MAY solve it without them: in the mode of solving alone, the tutor answers only when called (concepts 10).
- **Open fields.** `steps`, with every field of a step, is open: the learner's app leads the steps itself, by their exit conditions (architecture 3.1).

## 19. Hints

- **The hint ladder** goes by the number of wrong answers on a task, and the program picks its rung, from 1 to 3: a question on where the mistake is, a question on the rule or the trap, and a similar case, simpler (concepts 10). AI only words the question for the rung (R03). After the third rung, the program offers to call an adult or to show the solution (О-7).
- **Fallback texts.** When the tutor's question does not come, or does not pass its checks, the learner reads a fallback text of the module:
  - at rungs 1 and 2, the `text` of the trap value that the wrong value matched (section 15); without one, the `trap_advice` of its trap (section 16); and without a trap, the template of the rung, from the manifest's `rung_templates` (section 11);
  - at rung 3, the `simpler_case` of the item (section 14); without one, what rung 2 gives.

  So a module with an item with a verdict has rung templates (`manifest.rung-templates`), and the learner always gets an answer. Which answer slot a fallback speaks of, when a submission has more than one wrong, is the server's to decide (architecture 3.5).
- **A hint asked for.** Before the learner's first answer, a hint that the learner asks for gives what the module gives the solving steps: the task's `givens` and `unknown` (section 14) and its techniques (section 17), with no AI and no reading of the work. What a hint asked for gives after a wrong answer, and how it counts as evidence, is the server's to decide (architecture 3.5; О-21).
- **Techniques.** The server gives the task's techniques when a solving step that `gives` them begins (section 18), or when the learner asks for a hint, and records that the learner saw them.
- A sketch of how to start, which the tutor draws under the learner's work (concepts 8), is not in this version: it comes as a minor change, once the canvas draws one.
- The module's texts that a call of AI reads — the descriptions of the traps, the techniques, the solution and the criteria of a rubric — reach it only as a marked block of data, which cannot change its task (R02).

## 20. The leak check

- The leak check is the program's search for the answer in a text that the learner will see: in the tutor's words before the learner gets them (R54), and in the module's texts when the module is checked (`task.no-leaks` and `lesson.no-leaks`). It is a safeguard, not a proof: it finds what it searches for, and an answer put in other words passes it (concepts 10).
- **What it searches for.** For a task, it searches a text for:
  - the `key` of every check of kind `number`, `fraction` and `choice`, in every item of the task, except a key that is found, by the same search, in a text that the learner sees with its item: the paragraphs of the statement and the `alt` of its pictures, the item's `text`, the `text` pieces of its line, and the `options` of its answer slots bound `choice`. Such a key, as `2` in a task whose statement says that a chicken has 2 legs, would be found in a plain mention of the task, and the task's leak phrases carry it instead. The options of a choice written by hand are closed and do not count, and neither do units or trap values;
  - every phrase of the task's `leak_phrases`, always.

  A predicate has no key, and a rubric neither: for them only leak phrases are searched for. A key of a choice by tapping is always among its item's options, so it is never searched for: a task that wants it kept SHOULD write it, or what gives it away, in `leak_phrases`.
- **The normal form.** A text, a key of a choice and a leak phrase are searched in their normal forms: step 1 of section 15, then NFKC, the dashes and slashes of step 3 and the white space of step 4, and then each character to its simple lowercase mapping (section 15). A character of a word is one of the Unicode general categories L, M and N: a letter, a mark or a number.
- **A phrase.** A key of a choice and a leak phrase are found where their normal form stands in the text's normal form, and when it begins with a character of a word, the character before it is none, if there is one, and when it ends with one, so is the character after it. So `odd` is found in "Odd." and in "even/odd", but not in "odds", and `<` is found in "56<65". A phrase whose normal form is empty is found nowhere.
- **A number.** A key of `number` or `fraction` is found where a number of the text has its value, whatever the sign: the search compares magnitudes, so that `5-3` shows a key `3` and a key `-3` alike. The numbers of a text are found in its normal form, from its start:
  1. at a digit, 0 to 9, the search takes the longest run of the form of a number: a simple fraction, digits, an optional space, `/`, an optional space and digits that are not all zero; a decimal, digits, `.` and digits; or an integer, digits;
  2. the run is a number of the text when no character of a word stands right before it and none right after it, and its value is the exact rational number it writes, leading zeros and all;
  3. either way, the search goes on after the whole run, so that no tail of a longer token is read as a number.

  So `7` is found in "7 rungs", "(7)", "07:30" and "-7", but not in "17", "7.5", "7x", "x7" or "7th", and `5` is not found in "x7.5"; `0.5` is found in "1/2", "2 / 4" and "½"; and `3/4` is found in "6/8".
- **What is not read as a number.** A number in words, a decimal comma, digits grouped by a comma or a space, a mixed number such as `1 1/2`, an exponent and the digits of other scripts are not read as numbers: `1,5` is the numbers 1 and 5. A task whose answer can be written so, and a task in a language that writes numbers so, SHOULD write it in `leak_phrases`: "seven", "семь".
- **The module's texts.** For each task, `task.no-leaks` searches these texts of the module, which the learner can see before the task is solved: its `givens` and `unknown`, the title and description of each technique it names, the `text` of each of its trap values, the `trap_advice` of each trap it names, the `simpler_case` of each of its items, and, when it has an item with a verdict, the manifest's `rung_templates`. Its statement is not searched, being the task, nor its solution, which comes once it is solved.
  - A text of the whole module — a rung template, a trap's advice, a technique — is searched for the keys of every task that can show it, so it SHOULD hold no number.
  - A trap text SHOULD NOT repeat the learner's value: under `form: reduced`, `2/8` has the key's value, and "2/8 is right in value" gives `1/4` away. It says "your fraction" instead.
  - A text for one item SHOULD NOT name the numbers of another: the keys of every item of the task are searched in it, and an item's own texts free only its own key.
  - The texts of a lesson that names the task are searched by `lesson.no-leaks`, every one of them, after the task's segment too: the open view of a lesson reaches the learner's app whole (section 21). Neither rule searches the texts of another lesson for the task, nor the texts of another task of the same lesson: the statement and the solution of an earlier task are seen before a later one. A worked example SHOULD NOT solve a task of the module, and a lesson SHOULD NOT name two tasks of which one's texts give the other's answer.
- **Templates.** `task.no-leaks` and `lesson.no-leaks` search a template through its instances (section 23): the texts of each instance for its own keys and leak phrases, and a text of the whole module, or of a lesson that names the template, for those of every instance. So such a text SHOULD hold no number that a key of an instance can be. A key and a leak phrase that hold a result of a solver are searched for once the result is known: by `module-kit`, which runs the solver, on every instance, and by `spec`'s CI only on the instances of a vector of templates, which gives the result (section 24).
- The test vectors of the leak check (section 9) use only characters that every version of Unicode from 15.0 on normalizes alike, as those of verdicts do.

| ID | Rule |
|---|---|
| `task.no-leaks` | None of these texts of the module, which the learner can see before a task is solved, MAY hold a key or a leak phrase of the task, as the leak check finds them: its `givens` and `unknown`, the title and description of each technique it names, the `text` of each of its trap values, the `trap_advice` of each trap it names, the `simpler_case` of each of its items and, when it has an item with a verdict, the manifest's `rung_templates`. |

## 21. Lessons

- A lesson is `lessons/<id>.yaml`, valid against `schemas/lesson.schema.json`, and its `id` is the name of its file before `.yaml` (section 10). It is a sequence that the author made — explanations, worked examples and tasks, in order — and it names the skills that it teaches (concepts 5). A module MAY have no lessons: its tasks live outside lessons too.
- `title` is what the lesson is called, in the module's explanation language. The learner sees it before every task of the lesson, and `lesson.no-leaks` searches it for the keys of each of them, so it SHOULD hold no number.
- **Skills.** `skills` names, by local ID, the skills of the module that the lesson teaches (`lesson.known-skills`). An anchor skill is no skill of a lesson: a lesson teaches its module's own. Every task of the lesson trains one of them as a primary skill (`lesson.task-skills`).
- **Segments.** `segments` lists the segments of the lesson in order, each named by its place, from 1. A segment is one of three, by its one field:
  - `explanation` — paragraphs and pictures that the learner reads, in parts as a task's statement is (section 14);
  - `worked_example` — an example solved before the learner's eyes (below);
  - `task` — a task of the module, by its local ID (`lesson.known-tasks`); a template too, and then the learner gets one instance of it (section 23). The segment ends when the task ends, as the server decides by the hint ladder and the solution shown (architecture 3.5; О-7), and only then does the next segment begin.

  No two segments of a lesson are the same, so a lesson names a task once. A check at the end of a lesson is its last tasks: the format marks no segment as a check.
- **Worked examples.** A worked example is no task: it has no answer slots and no key, and nothing in it is evidence for the learner model.
  - `statement` is what the example asks, in parts as a task's statement is.
  - `canvas` is a handwriting sheet, `kind: handwriting_sheet`, with its `grid` and `grid_step` as a task's (section 14). A workbook is not in this version. The learner does not write on the sheet: it holds the author's demo and no learner's work.
  - `demo` is the author's demo: the parts of how the example is solved, in order. The learner opens them one at a time, and MAY hide the whole demo and show it again. A part is a paragraph, `text`; a picture beside the sheet, with its `alt`, `width` and `height` as in a statement; or a picture on the sheet, with its `alt` and its `area`.
  - An area is a rectangle of the sheet in its units — `left`, `top`, `width` and `height`, as a zone has (section 14) — and it lies on the sheet (`lesson.areas`). A picture on the sheet stands on the canvas layer of the author's demo, under the learner's work and the tutor's layer (concepts 8), and is shown at the size of its area, so the area SHOULD have the picture's proportions. Areas MAY overlap.
  - Whether the paragraphs and the pictures beside the sheet stand above it or beside it is the canvas's to say, as for a task's statement.
  - A worked example SHOULD NOT solve a task of the module: the engine may give that task outside the lesson, and `lesson.no-leaks` searches a lesson only for the keys of its own tasks (section 20).
- **The order of lessons.** The skill graph orders a module's lessons (section 12), and a module has no field for that order. Lesson A comes after lesson B when a skill of A needs, through its prerequisites among the module's skills and theirs, a skill of B that is not one of A's own skills. An anchor skill orders nothing. That order has no cycle (`lesson.order`). Where it orders nothing — two lessons of the same skills, or of skills with no link — the engine's rule chooses (architecture 3.8). A module whose skill graph is a chain is sequential, and the learner's app MAY show it so.
- **Adaptation.** The segments of a lesson go in the author's order, and the engine never reorders them. In a lesson whose skills are not all of the assessability `verdict` (section 12), the engine adds no segment and skips none: the lesson goes in the author's order, without adapting to the learner (concepts 4). Whether the engine adds a task for practice to a lesson whose skills are all `verdict`, or ends such a lesson early, is the engine's to decide (architecture 3.8).
- **Age categories.** `age_categories`, when given, lists the age categories that the lesson suits, fewer than the module's, as a task's do (section 14). The platform gives the lesson only to a learner whom the lesson and each of its tasks suit, so some age category suits them all (`lesson.age-categories`): a lesson that no learner can get is a mistake.
- **Open fields.** `id`, `title` and `segments` are open, with every field of a segment: the learner's app leads the lesson. Its open view reaches the app whole, from the server, and only for a learner whom the lesson may go to (section 25), so a text after a task is seen before the task is solved too, and `lesson.no-leaks` searches every text of the lesson (section 20), for a template for the keys of every instance (section 23). `skills` and `age_categories` are closed: the engine reads them on the server, and the title of a skill could tell how to solve the lesson's tasks, as a task's skills could (section 14).

| ID | Rule |
|---|---|
| `lesson.known-skills` | Every local ID in a lesson's `skills` MUST be the ID of a skill in the module's skill graph. |
| `lesson.known-tasks` | Every task that a segment of a lesson names MUST be a task of the module: a file in `tasks/` whose name before `.yaml` is its ID. |
| `lesson.task-skills` | Every task of the module that a lesson names MUST train a skill of the lesson: for at least one item of the task, the item's primary skills — its own, or else its task's — MUST include a skill in the lesson's `skills`. |
| `lesson.known-pictures` | The `picture` of every part of a lesson's explanations, and of the statement and the demo of each of its worked examples, MUST be the path, from `media/`, of a file of the module. |
| `lesson.areas` | Every area of a lesson MUST lie on the sheet, so that `left` + `width` is at most 1000 and `top` + `height` at most 1400. |
| `lesson.age-categories` | Every age category of a lesson MUST be one of the manifest's `audience.age_categories`, and at least one age category MUST suit the lesson and each task of the module that it names: the lesson's own, or else the module's, and each task's own, or else the module's. |
| `lesson.order` | The order of the module's lessons MUST have no cycle: no lesson comes, through the lessons that it comes after, after itself. |
| `lesson.no-leaks` | No text of a lesson MAY hold a key or a leak phrase of a task of the module that the lesson names, as the leak check finds them (section 20): the lesson's `title`, the paragraphs of its explanations and the `alt` of their pictures, and the paragraphs and the `alt` of the pictures of its worked examples' statements and demos. |

## 22. Randomness

- Randomness on the platform comes only from a seed, so that the same inputs give the same numbers (R03). The format has one generator and one way to derive a stream of numbers from a seed, and the whole platform takes them: `module-kit` for the numbers of templates, the widgets, the engine and the simulator of virtual learners (R27). The test vectors of the generator are in `vectors/random/` (section 9).
- **A seed** is an unsigned integer of 64 bits, from 0 to 2^64 − 1. Where a text writes it, it is written in decimal digits with no leading zero, and zero as `0`.
- **The generator** is PCG with 128 bits of state, the generator `PCG` of the Go package `math/rand/v2`. It is defined here, so that no implementation depends on a library:
  - The state is two words of 64 bits, high and low, read as the number high · 2^64 + low. A generator started from two words takes them as its state as they are.
  - A step sets the state to state · M + C modulo 2^128, where M is 2549297995355413924 · 2^64 + 4865540595714422341 (`0x2360ed051fc65da44385df649fccf645`), and C is 6364136223846793005 · 2^64 + 1442695040888963407 (`0x5851f42d4c957f2d14057b7ef767814f`).
  - The next integer of the stream is drawn by a step, and then from the new state's high word h and low word l, each operation modulo 2^64: h ← h xor (h >> 32); h ← h · 15750249268501108917 (`0xda942042e4dd58b5`); h ← h xor (h >> 48); h ← h · (l or 1). The integer is h. This output is called DXSM.
  - It is not NumPy's PCG64DXSM, which multiplies by a constant of 64 bits and draws before the step, and it is no cryptographic generator.
- **A place of randomness** is a seed and a list of names, at least one: the stream of numbers that one use of randomness draws from. A name is a string that is not empty and holds no `|`, and names compare as written, with no normalization (section 4).
  - The stream of a place is the generator started from two words. The high word is FNV-1a of 64 bits ([RFC 9923](https://www.rfc-editor.org/rfc/rfc9923), sections 2 and 5) of the UTF-8 bytes of a text: the seed in decimal digits and then, for each name in order, `|` and the name. The low word is the seed itself.
  - FNV-1a of 64 bits starts from 14695981039346656037 (`0xcbf29ce484222325`), and for each byte in turn takes the exclusive or of it and then multiplies by 1099511628211 (`0x100000001b3`), modulo 2^64.
  - So two places of one seed differ by their names alone, and a new place, with names of its own, shifts no number of another. The stream that the simulator of mathtrail-standalone draws for a unit, `seeded`, is the place of its master seed with three names: the experiment, the unit and the purpose (R27).
  - Two properties are informative. Places of one seed share the low word of their state, so their states lie on one sequence of the generator, at offsets that are multiples of 2^64. And FNV-1a resists no collisions, so two lists of names whose texts hash alike give one stream. Neither matters for the places of a module or of a run; a use that needs streams apart from another's takes a seed of its own.
- **Functions.** A stream gives numbers only through the functions below, each the same as the method of Go's `math/rand/v2` named beside it. So every implementation draws the same numbers, and as many integers of the stream for each.
  - `integer` gives the next integer of the stream, from 0 to 2^64 − 1, and draws one (Go: `Uint64`).
  - `below(b)`, for a bound b from 1 to 2^64 − 1, gives an integer from 0 to b − 1 (Go: `Uint64N`).
    - When b is a power of two, the value is the next integer and b − 1, bitwise, which draws one integer: `below(1)` too, which gives 0.
    - Otherwise it takes the product of the next integer and b, x · b = hi · 2^64 + lo. When lo < b, it takes t = (2^64 − b) mod b, and while lo < t it takes the product again with the next integer. The value is hi, and each product draws one integer.
  - `between(a, c)`, for signed integers of 64 bits a ≤ c with c − a + 1 at most 2^63 − 1, gives a + below(c − a + 1) (Go: `a + Int64N(c - a + 1)`). `between(a, a)` gives a, and draws one integer.
  - `fraction` gives a number from 0 up to 1, never 1: the low 53 bits of the next integer, divided by 2^53 (Go: `Float64`). It draws one integer, and its value k / 2^53 is exact.
  - `permutation(n)`, for n from 0 to 2^31 − 1, gives an order of the integers from 0 to n − 1. It starts from them in order, and for i from n − 1 down to 1 swaps the items at places i and below(i + 1) (Go: `Perm`). It draws nothing when n is 0 or 1. To shuffle a list of n items is to do the same swaps on the list (Go: `Shuffle`): the item at place k of the shuffled list is the item at place `permutation(n)[k]` of the list, counting places from 0.
- **No other distribution** is in the format. A normal or an exponential one needs logarithms and exponents, which JavaScript computes only to an approximation ([ECMA-262](https://tc39.es/ecma262/), `Math.exp`: «implementation-approximated»), and which Go may compute with fused operations on some processors. A part that needs one builds it on these functions, and its numbers are its own, as the simulator's are.
- **The seeds of the platform.**
  - The server draws the seed of an attempt from a cryptographic source of randomness when the attempt begins, and keeps it with the attempt (architecture 3.5). It says nothing about the learner. Neither it nor the state of a place derived from it reaches the learner's device: the state of a place shows its seed, and the generator is not cryptographic.
  - The places of randomness of a module are places of the seed of its attempt, and the first name of each says what it is of: `template`, a template of a task, whose other names are the task's ID and `instance` (section 23). A new first name is a minor change (section 2).
  - A widget has a seed of its own, not the seed of the attempt: how it gets one comes with the protocol of widgets (architecture 3.4; Т-24).
  - The engine, if its rule draws at random, and the simulator take seeds and names of their own — a choice's and a run's — with this generator and these functions (R27).
- **Versions.** The generator has no version of its own: it is part of the version of the format (section 2). A change to its constants, to its output, to FNV-1a, to the text of a place, or to a function or how many integers it draws is a major change. A new function, or a new first name of the places of a module, is a minor one. What a place draws, and in what order, is its owner's to say: a template draws one `below` (section 23).

## 23. Templates

- A task MAY be a template: a task with parameters, in its field `template`, whose numbers come from the seed of each attempt (R60). An attempt on a template gets one instance of it: the task that one combination of its parameters gives, with numbers in the place of its placeholders. A template is a task in `tasks/<id>.yaml` like any other (section 14). A lesson names it as it names a task, and the learner model and the engine see one task, whichever instance an attempt gets.
- **The template.** `template` holds:
  - `parameters`, at least one: each a name with its domain, the integers from `from` to `to`, both included;
  - `derived`, when given, the derived numbers: each a name with an expression that computes it from the parameters, such as `legs: "2 * chickens + 4 * rabbits"`;
  - `constraint`, when given, an expression that holds for the combinations of the parameters that give an instance, such as `"chickens != rabbits"`;
  - `solver`, when given, a program of Starlark that finds numbers of each instance by search, its results (section 24).

  A name is lowercase letters, digits and `_`, beginning with a letter, and is at most 14 characters long, so that `"{name}"` fits the 16 characters of a key (section 15). It is no keyword or reserved word of Starlark, and no two of the parameters, the derived numbers and the results of the solver of a template share a name (`task.template-names`).
- **Expressions.** A derived number and the constraint are expressions of a narrow subset of [Starlark](https://github.com/bazelbuild/starlark/blob/master/spec.md), the language of predicates (section 15), which `spec`'s CI evaluates as well (`task.template-expressions`):

  ```
  expression  = disjunction
  disjunction = conjunction { "or" conjunction }
  conjunction = negation { "and" negation }
  negation    = "not" negation | comparison
  comparison  = sum [ ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) sum ]
  sum         = product { ( "+" | "-" ) product }
  product     = unary { ( "*" | "//" | "%" ) unary }
  unary       = "-" unary | atom
  atom        = integer | name | "(" expression ")"
  integer     = "0" | [1-9][0-9]*
  ```

  - Tokens are separated by spaces, U+0020, or by nothing. A name or an integer is the longest run of `[a-z0-9_]`, and an integer is digits alone. `==`, `!=`, `<=`, `>=` and `//` are one token each.
  - Every expression is typed: an integer and a name are ints; `+`, `-`, `*`, `//` and `%` take ints and give an int; a comparison takes two ints and gives a bool; `not`, `and` and `or` take bools and give a bool. A derived number is an int expression that names only parameters, and the constraint a bool expression that names parameters and derived numbers.
  - The meaning is Starlark's. An int has no bound. `//` is floored division and `%` the remainder of floored division, so `-7 // 2` is `-4` and `-7 % 2` is `1`. Unary `-` binds tighter than `*`, `//` and `%`, so `-a // 2` is `(-a) // 2`. Division by zero is an error. `and` and `or` evaluate their right operand only when the left one does not decide, so `b != 0 and a % b == 0` is no error when `b` is 0.
  - Comparisons do not chain: `0 < a < 9` is no expression of Starlark, and `0 < a and a < 9` is.
  - An expression is at most 1000 characters long, as a predicate is. It takes no more steps than it has tokens, so it has no limit of steps.
  - A function such as `abs`, `min` or `max`, a conditional expression, and a derived number that names another derived number each come as a minor change (section 2).
- **Instances.** The combinations of the parameters come in the order of an odometer: the parameters in the order of their names, compared by code units, the first changing slowest, and each through its domain upwards. On each combination the derived numbers are computed, and then the constraint. The combinations for which the constraint holds, or all of them when there is none, are the instances, numbered from 0 in that order. A template MUST be such that every instance can be checked (`task.template-instances`):
  - the sizes of its domains multiply to at most 10 000;
  - on every combination every expression evaluates without error, and every derived number lies between −(2^53−1) and 2^53−1, as an integer of YAML does (section 4);
  - at least one combination is an instance.
- **The instance of an attempt** is number `below(count)` of the place of randomness of the attempt's seed whose names are `template`, the task's ID and `instance`, where count is the number of instances (section 22). Nothing else draws from that place. So the same package and the same seed give the same instance (R03), and an attempt keeps only its seed (architecture 3.5).
- **Placeholders.** In a template, every string of the task outside `template` is read from left to right: `{{` is `{`, `}}` is `}`, and `{name}` is a placeholder of a parameter, a derived number or a result of the solver. Any other brace breaks `task.placeholders`, and so does a placeholder of a result outside the few closed fields where section 24 lets it stand. The instance is the task with every placeholder replaced by its number, in decimal digits and with `-` before a negative one, and every doubled brace by one, in a single pass: what is put in is not read again. The instance has no `template`, and its `id` is the template's.
  - The key and the trap values of a check of `number` or `fraction` are written in the kind's notation, with a placeholder in the place of an integer, of a numerator or of a denominator: `"{second}"`, `"{part}/{whole}"`, `"3/{whole}"`. A decimal holds none, and the key as written is at most 16 characters long, its placeholders too. Outside a template, a key or a trap value that holds a placeholder breaks `task.placeholders`, and every other brace is only text.
  - In every other string — a paragraph of the statement and the `alt` of a picture, the text of an item, a piece of a line, an option, the givens and the unknown, the key and options of a choice, a trap text, a simpler case, the solution and a leak phrase — placeholders stand among the text: `"{first} ×"`, `"= {product}"`.
  - A string that begins with `{`, `=` or a digit is written in quotes: a plain `{` begins a flow mapping, and the others break `yaml.plain-strings` (section 4).
- **Checking a template.** A template is checked through its instances. Every instance MUST be valid against `schemas/task.schema.json` (`task.instances`), and each rule of a task, and `lesson.no-leaks` of each lesson that names the template, applies to every instance (sections 14–21). A breach names its rule and the numbers of the instance. These rules apply to the instances, not to the template as it is written.
  - `module-kit` builds and checks every instance when it checks the module, so the key of every instance is known before any attempt, and the server runs no Starlark when an attempt begins. The package carries the template as it is written and the numbers of every instance, in their order: the server picks the instance of an attempt among them and puts its numbers in place, and evaluates no expression (section 25).
  - The texts of the whole module, and a lesson that names the template, are searched for the keys of every instance (section 20), so they SHOULD hold no number that a key of an instance can be.
  - The instances of a template share its `band` and its `difficulty`, so they SHOULD be alike in difficulty.
- **What reaches the learner's app** is the open view of the instance that the attempt gets (section 6). `template` is closed, and neither the seed of the attempt nor a number that no open field of the instance shows reaches the learner's device (section 22).
- **What this version leaves out.** A workbook page of independent lines is no template of this version, since its combinations multiply past the limit: parameters of an item would come as a minor change. Only what a module of the first slice takes stays in v1 (section 2), and so far no module takes templates.
- **Versions.** A change to the meaning of an expression, to the order of the combinations, to how the instance of an attempt is picked or to the names of its place, to the substitution, or a lower limit, is a major change. A new construct of an expression, a higher limit, parameters of an item and a new place of randomness of a template are minor ones (section 2).
- The test vectors of templates are in `vectors/templates/` (section 9).

| ID | Rule |
|---|---|
| `task.template-names` | No two of the parameters, the derived numbers and the results of the solver of a template MAY share a name. |
| `task.template-expressions` | Every derived number of a template MUST be an int expression of the subset of this section that names only parameters, and its constraint MUST be a bool expression of it that names only parameters and derived numbers. |
| `task.placeholders` | In a template, every brace in a string outside `template` MUST be doubled or be part of a placeholder that names a parameter, a derived number or a result of the solver, and a placeholder of a result MUST stand only in a key or a trap value of a check of `number` or `fraction`, in the solution or in a leak phrase. Outside a template, no key or trap value of a check of `number` or `fraction` MAY hold a placeholder. |
| `task.template-instances` | The sizes of a template's domains MUST multiply to at most 10 000; on every combination its expressions MUST evaluate without error, and every derived number MUST lie between −(2^53−1) and 2^53−1; and at least one combination MUST give an instance. |
| `task.instances` | Every instance of a template MUST be valid against `schemas/task.schema.json`. |

## 24. Solvers

- A template MAY have a solver, in `template.solver`: a program of [Starlark](https://github.com/bazelbuild/starlark/blob/master/spec.md) that finds numbers of each instance that no expression gives, such as a key whose formula the author does not know, as the solvers of mathtrail-standalone find the answer of a task by search (R61). A key that a solver finds is checked by a solver, as a key that an expression gives is (concepts 9.4).
- **The solver.** `solver` holds:
  - `program`, the program, at most 8192 characters long, which a block scalar writes best (section 4);
  - `results`, the names of the numbers that it finds, at least one and no two alike. A result is named as a parameter is (section 23), and no parameter or derived number shares its name (`task.template-names`).
- **What the solver gets.** The program defines `solve`, a function of one parameter. On each instance it is called with a frozen dict of the numbers that the open fields of the template show (section 6): each parameter and derived number whose placeholder stands in the statement, the givens, the unknown, the text of an item, a text piece of its line or an option of an answer slot bound `choice`, by its name, a string, with its number, an `int`. The names are inserted in their order, compared by code units. A number that only a closed field shows — in a key, a trap value or the solution — is not in the dict, so the solver solves the task that the learner sees, and cannot read an answer that an expression already gives.
- **What it returns.** `solve` returns a dict whose keys are the names of `results`, exactly these, and whose values are `int`s between −(2^53−1) and 2^53−1, as an integer of YAML is (section 4). Each result is then a number of the instance, as a derived number is, and its placeholders are replaced by it (section 23).
- **Where a result stands.** A placeholder of a result stands only in the `key` and in the `value` of a trap value of a check of `number` or `fraction`, in the `solution`, and in a leak phrase: in closed fields that the learner gets, if at all, once the task is solved. Everything that the learner sees before — the statement, the givens and the unknown, the texts of the items, the options, the trap texts and the simpler cases — is built without the solver, and a placeholder of a result anywhere else breaks `task.placeholders`.
- **The dialect** is that of go.starlark.net with the options of `syntax.FileOptions` that the solvers of mathtrail-standalone run with: `Set`, `While`, `TopLevelControl` and `GlobalReassign` on, and `Recursion` off, so that a function that calls itself fails when it does. A program MUST NOT hold `load`. It names only the built-in names of Starlark: no module such as `math`, `json` or `time`, and none of the helpers of standalone's sandbox, such as `permutations` and `gcd`. `print` writes nothing. No name of the dialect draws randomness or reads a clock, so the same program gives the same results on the same numbers on every machine (R03).
- **Running it.** The program runs once, on one thread, and then `solve` is called on every instance in the order of the instances (section 23), on the same thread. The top level and all the calls together take at most 100 000 000 steps, as go.starlark.net counts them (`Thread.SetMaxExecutionSteps`): the budget is the template's, not each instance's. A template MUST be such that its solver gives its results on every instance (`task.template-solver`): the program parses and runs under the dialect, defines `solve` as a function of one parameter, and on every instance `solve` returns, without an error and within the budget, a dict of exactly its results, each an `int` within the bounds above. A breach names the numbers of the instance on which the solver fails, or that it fails before the first.
  - The budget is the format's, as the limit of a predicate's steps is (section 15): the same program on the same instances takes the same steps. How long a solver may run, and how many run at once, is `module-kit`'s to decide (architecture 3.7).
  - A run of a solver of mathtrail-standalone takes at most 25 000 000 steps, and the heaviest of its 705 solvers takes 2 413 617 (SPEC 6.6 standalone). A template of many instances SHOULD search only what its question leaves open, as standalone's solver templates do (R72 standalone).
- **Who runs it.** `module-kit` runs the solver of every template when it checks the module, so every key of every instance is known before any attempt, and the server runs no Starlark when an attempt begins: the results stand among the numbers of every instance that the package carries (sections 23 and 25). `spec`'s CI has no Starlark: on an instance whose results it does not know, it checks the rules of a task on what holds no result, and passes over a key, a trap value and a leak phrase that hold one. The vectors of templates give the results as data, with the other numbers of each attempt: `spec`'s CI checks the rules of a task on the instance that they make, and `module-kit`'s CI runs the solver and compares (section 9). That a vector of `task.template-solver` breaks its rule, only `module-kit`'s CI checks: `spec`'s CI checks it as a vector of any rule that it does not implement.
- **Versions.** A lower budget, a shorter limit of a program, a change to what `solve` gets or returns, to the order of the calls or to the dialect, is a major change. A higher budget, a longer limit and a helper function, such as standalone's `permutations`, are minor ones (section 2).

| ID | Rule |
|---|---|
| `task.template-solver` | The solver of a template MUST give its results on every instance: its program MUST parse and run under the dialect of this section and define `solve`, a function of one parameter, and on every instance, in their order and within 100 000 000 steps in all, `solve` MUST return without an error a dict of exactly its results, each an `int` between −(2^53−1) and 2^53−1. |

## 25. Packages

- The package of a module is what the platform reads of it: a version of the module, addressed by its content and signed (R17). `module-kit` builds it from the module's folder when the module is released, by the format version that the manifest names, and the release workflow of `.github` signs it, with the module index, which names it by its digest (section 26); what a check of that signature verifies is decided apart (RUN.md, T37). A package has two parts, which its inventory names by their digests, and the digest of the package is the digest of its inventory (R62).
  - **The server part** is the canonical view of the module: all its content, keys, solutions and traps among it. Only the server reads it.
  - **The device part** is the files that the learner's device may load: `LICENSE`, `NOTICE` and the media files, and widget bundles once the format has widgets.
  - **The inventory** names the module and both parts.
- **What stays out.** The eval set, `eval/`, is no part of the package: its samples are not content that the platform serves, and a new sample changes neither a verdict nor a digest. Neither is a file or folder whose name begins with `.`, which is not the module's (section 10), nor a comment in a file of a part. Nothing is added that the module's files do not give: no version of `module-kit`, no time, no path. So the package depends only on the module's files and the format version its manifest names, and the same module gives the same digest wherever and whenever it is built (R44).
- **The canonical view** is a JSON object, valid against `schemas/canonical-view.schema.json`:
  - each part of the module under a member of its own: a part that a module has once under its term in snake_case — `manifest`, `skill_graph`, `traps`, `techniques`, `solving_steps` —, and a part that it has many of under the name of its folder — `tasks`, `lessons` —, as an object from each entry's local ID to it. The value of a part is the JSON value of its file (section 4), as it is: a template as it is written, and no default filled in, so a manifest that gives no `canvas.digit_height` has none in the view either;
  - `skill_tiers`, when the module has a skill graph: the tier of each of its skills, by local ID, as section 12 computes it;
  - `instances`, when a task is a template: for each template, under its ID, the numbers of each of its instances in the order of section 23 — an object from every parameter, every derived number and every result of its solver to its number.

  A member whose part the module does not have is absent. No field of the canonical view is open: the learner's app never gets it, but the open view of a part, which the server builds from it (section 6).
- **The canonical text** of a JSON value is what a digest is taken of. It is the value written as [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), the JSON Canonicalization Scheme, writes it, which for the data of the format comes to this:
  - an object is `{`, its members in the order of their names' UTF-16 code units, each its name, `:` and its value, joined by `,`, and `}`; an array is `[`, its elements in their order, joined by `,`, and `]`. No whitespace stands between tokens;
  - a number is an integer between −(2^53−1) and 2^53−1, as section 4 bounds an integer, written in decimal digits, with `-` before a negative one: `50`, whether a file wrote `50`, `50.0` or `5e1`;
  - a string is `"`, its characters and `"`. `"` and `\` are written `\"` and `\\`; U+0008, U+0009, U+000A, U+000C and U+000D are written `\b`, `\t`, `\n`, `\f` and `\r`; every other character from U+0000 to U+001F is written `\u00` and its two hexadecimal digits in lowercase, U+0007 as `\u0007`. Every other character is written as it is: `/`, `<`, `>`, `&`, U+2028 and U+2029 among them. Characters are not normalized (section 4);
  - `true`, `false` and `null` are written so;
  - the text is UTF-8, with no byte order mark and no newline at the end.

  A JSON library that escapes more does not give the canonical text: `encoding/json` of Go escapes `<`, `>` and `&` unless it is told not to, and U+2028 and U+2029 always ([encoding/json](https://pkg.go.dev/encoding/json)), and the vectors of packages hold such characters. `Value.Canonicalize` of Go's [encoding/json/jsontext](https://pkg.go.dev/encoding/json/jsontext) implements RFC 8785, but in go1.27.3 only under the experiment `jsonv2` (both read 2026-10-28).
- **Digests.** A digest is `sha256:` and the SHA-256 of bytes in 64 lowercase hexadecimal digits, and a size is how many bytes there are. Each part is named by the digest and the size of a canonical text:
  - the server part, by the canonical text of the canonical view;
  - the device part, by the canonical text of its listing: an object with `license`, the digest and size of `LICENSE`, `notice`, those of `NOTICE` when the module has one, and `media`, those of each file of `media/` by its path from `media/`, when it has any (`inventory.schema.json`, `$defs/device_listing`). The files themselves travel as they are, and how — in an archive or one by one, compressed or not — changes no digest.
- **The inventory**, valid against `schemas/inventory.schema.json`, holds `module_format_version`, `id` and `version`, as the manifest names them, and `server_part` and `device_part`, each with its digest and size. `module_format_version` stands at the root of the inventory in every version of the format, as it does in the manifest (section 2), so that a reader finds it before it knows how to read the rest. The digest of the package is the digest of the canonical text of the inventory: an attempt keeps it (architecture 1), and a reader that has it checks the inventory, then each part, then each file by the digests that name it.
- **A package as files** is a folder: `inventory.json`, `server.json` and `device.json`, the canonical texts of the inventory, the canonical view and the listing of the device part, and `device/`, with `LICENSE`, `NOTICE` and `media/<path>` byte for byte. How the files of packages lie in a release of `modules` is that repository's to decide (architecture 3.10); the digests do not depend on it.
- **Who reads it.** `module-kit` builds packages and reads them for `api`, for the eval runner of `tutor` and, through its command line, for the CI of `canvas`; `sim` reads `server.json` by the types of the canonical view, without `module-kit` (architecture 3.9). The learner's app reads no package: the server gives it the open view of a part (section 6) — of the manifest, the skill graph, the technique catalog and the solving steps once for the package of an attempt, of a lesson whole once the learner may take it (section 21), and of a task or an instance with each attempt (section 23) —, the tiers with the skill map, and the files of the device part, which it serves.
- **An attempt on a template.** The server picks number `below(count)` of the template's instances, where count is how many `instances` lists (section 23), and puts that instance's numbers in the place of the template's placeholders. It evaluates no expression and runs no solver.
- **Versions.** The members of the canonical view, the canonical text, the listing of the device part, the inventory and how a digest is taken are part of the format's version (section 2). A new member or a new entry of the listing is a minor change; a change to the canonical text, to the algorithm of the digests or to what a member or an entry holds is a major one. A package is read by the version its inventory names, and packages built under a previous minor version are read as before.
- The test vectors of tiers are in `vectors/tiers/`, and those of packages in `vectors/packages/` (section 9). This section has no format rule of its own: what a module needs to have a package, the rules of sections 4–24 already ask.

## 26. The module index

- The module index is the registry of the official modules while the registry is no service (R17): one signed file that names every published version of every module by the digest of its package (section 25), with where its files lie, which anchor skills it teaches and whether it has been withdrawn from publication (R63). `module-kit` builds it in the CI of `modules` when that repository releases, and the release workflow of `.github` signs it with the release's other files; what a check of that signature verifies is decided apart (RUN.md, T37). From stage 4 the registry service builds it (architecture 3.13), and a minor version adds to an entry what that service needs, such as a place of the files outside a release of `modules`.
- **The file** is `module-index.json`, a file of every release of `modules`: the canonical text (section 25) of an object valid against `schemas/module-index.schema.json`. It holds `module_format_version`, the format version by which it was built, and `modules`: under each module's ID, under each of its versions, X.Y.Z, the entry of that version.
- **An entry** holds:
  - `module_format_version`: the format version that the package's inventory names, by which the package is read;
  - `package_digest`: the digest of the package, which is the digest of its inventory (section 25);
  - `release`: the tag of the release of `modules` whose files hold the package, `vX.Y.Z`, as every NovaTrail repository numbers its releases. How the files lie in a release is for `modules` to decide. A reader checks what it fetches against the digests, so the place needs no trust;
  - `teaches`, when the version's skills teach any anchor skill: each anchor skill that the `teaches` of a skill of its skill graph names (section 12), once, in the order of the UTF-16 code units of the IDs. Its items have the form of an anchor skill's ID, not the vocabulary itself, so that an entry stays valid after a later version of the format removes the anchor skill it names; `module-kit` checks a package's anchor skills against the vocabulary of the package's version when it builds the package;
  - `withdrawn`, when the version has been withdrawn from publication: the reason of the withdrawal (below).
- **Every published version.** The index of a release names every version that any release of `modules` has published, not only those of its own release. A release builds it from the index of the release before it, which it reads from that release, and from its own packages:
  - the first release of `modules` has no previous index, and the build is told so. A release whose previous index cannot be read fails: it does not start a new index;
  - every entry of the previous index stands in the new one as it was (`module-index.entries-kept`);
  - a package whose version the previous index names keeps that entry, its release among it. The same module gives the same package wherever it is built (section 25), so a release MAY build the packages of every module or only of those that changed. A version is published once: a package of it with another digest is refused (`module-index.one-package`);
  - every other package of the release gets a new entry, which names the release's own tag. So the index is built within the release workflow, once the release has its number and before it is published;
  - last, the release's withdrawals are marked (below).
- **Withdrawal from publication.** A published version may prove harmful, and a release cannot be changed: so a later release withdraws the version, and its index marks the version's entry `withdrawn`, with the reason of the withdrawal, one of these:
  - `wrong_key`: a key or a predicate of the version gives wrong verdicts;
  - `answer_leak`: a text that the learner sees gives an answer away;
  - `unsuitable_content`: the version holds content that does not suit the learners it may reach.

  A withdrawal names a version that the new index names (`module-index.known-withdrawals`), one that the release itself publishes among them. Withdrawing again a version that is withdrawn for the same reason changes nothing, so the list of withdrawals that `modules` keeps MAY grow from release to release; another reason breaks `module-index.entries-kept`. A withdrawal is never undone: a fixed module is a new version. What a withdrawn version means for the platform is decision R63:
  - it stays only so that its verdicts can be repeated: no new attempt takes it, and the learner's device no longer loads its device part nor keeps its open views;
  - an attempt begun on it ends `unchecked`, with a neutral phrase (R04); a finished one stays in the history, and when the reason is `wrong_key`, its evidence no longer counts for the learner model;
  - the page of samples of `canvas` is not built from it (R25).
- **Signature.** The index is the one file whose signature a reader checks: the index names each inventory by its digest, the inventory each part, and the listing of the device part each file (section 25). A reader that has checked the index checks every file it fetches against those digests.
- **Who reads it.**
  - `api`: a pull request pins in its configuration a release of `modules` and its index, the anchor of trust (architecture 3.10), and it begins a new attempt only on a version that the index does not mark withdrawn. A withdrawal takes effect with the pull request that moves `api` to the release that marks it.
  - The CI of `canvas`: before it builds the page of samples from a release of `modules`, it reads `withdrawn` in the index of the newest release, which alone knows of every withdrawal so far (R25).
  - The platform, for a module that a learner lacks (concepts 4): the modules that teach an anchor skill are those whose entry names it in `teaches`, each by its newest version, by Semantic Versioning, that is not withdrawn and whose format version the reader reads.
- **Versions.** The members of the index and of its entries keep their places and meanings in every version of the format, v0 included, and a version MAY add only an optional member and a reason (section 2). A reader reads them in an index of any version by their places alone, not by the schema of its own version, which refuses what a later version adds: it skips an entry whose format version it does not read, rather than refuse the index, and it takes a version as withdrawn whatever its reason, one that it does not know among them. How an entry is derived from a package is part of the format's version.
- The test vectors of the module index are in `vectors/indexes/` (section 9). Its rules refuse to build an index (section 7), and each has a refusal among those vectors:

| ID | Rule |
|---|---|
| `module-index.entries-kept` | Every entry of the previous index MUST stand in the new one as it was: the same format version, package digest, release and `teaches`, and, when it was withdrawn, withdrawn for the same reason. |
| `module-index.one-package` | A version of a module MUST have one package: two packages of a release with the same module ID and version, and a package and the entry of its module ID and version in the previous index, MUST have the same digest. |
| `module-index.known-withdrawals` | A withdrawal MUST name a version of a module that the new index names. |
