# The admission table

This folder is the admission table of NovaTrail: to which AI provider, on which AI route, the work of a learner of each age category may go, and which capability of AI may serve each category. It is normative (R42, R96), and its terms are those of the glossary, concepts 15.

## 1. About the table

- The table is data: the rules of admission to AI by age category, which the providers' terms and the platform's decisions give (privacy 5; R07, R47, R65). The table is `admission-table.json`, its schema `schemas/admission-table.schema.json`, this text and the test vectors in `vectors/`.
- `tutor`'s admission function implements it (R57 tutor). It is one pure function: no input or output, no clock, nothing kept. `api` calls it before an attempt, naming the capabilities of AI that the task's check needs, the AI route and the age category, and on the own key its provider. `tutor` calls it before each call of a model that carries a learner's work. The eval runner and the check board do not call it: they send synthetic samples and adults' samples, and measure models that are not admitted yet (R24; architecture 3.6).
- What the table does not name is closed (section 6). For a minor every cell of platform AI needs the deployment fact `minor_safeguards`, which an operator declares only once the author has decided, on Claude's analysis, that the safeguards are enough (R112, R123), and every cell of the own key is closed (R122).
- A cell is no legal reading. It is the platform's reading of a provider's terms, which privacy 5.3 quotes with the date they were read; whether it is enough, the author decides on Claude's analysis (R112; R121).

## 2. Versions

- The table has a version of its own, MAJOR.MINOR, written once, in `VERSION`. It is neither a tag of `spec` nor the version of the module format. A change that gives the table a new version also starts a new line of `spec`'s releases, as a new version of the module format does ([the module format](../format/README.md), section 2), so within one line the table is the same, and a release's tag names the table it carries (R96).
- The admission function's answer names the version of the table it read (section 6), so a refusal written to a log says by which table it was refused.
- Any change of `admission-table.json` is a new version: a cell, a rule of a capability, a provider, a deployment fact or its description, a row of the terms or the date they were read, a citation.
- A minor version keeps the shape: what a reader of the previous version reads, it reads the same way, and only the content differs — what is closed and what is open, and what opens it.
- A major version is everything else: a field removed, renamed or made required; a new input of the function, such as a region of data or the learner's country (privacy 9, П-11, П-6); a new reason of refusal or kind of admission; a new or stricter rule of a table (section 7).
- Changes of this text that keep its rules, and a test vector that pins what it says already, give no new version: the tag of `spec` names such a revision.
- A version number never goes back and is never reused: undoing a change is a new version too.
- While the table is v0 (0.y), nothing is promised: every change is the next 0.y. Version 0.1 comes out with v0.8.0, the first release of `spec`'s line 0.8. Version 0.2 comes out with v0.12.0, the first release of the line 0.12: the fact `minor_safeguards` is declared on the author's decision, not a lawyer's answer (R112, R123); `data_processing_agreement` holds for an agreement in force, signed or incorporated into the provider's terms (R121); cells rest on R121–R123 instead of the closed questions П-3, П-4 and П-15; and every cell's terms were read on 2026-11-09. No cell opens or closes.

## 3. Files

```
admission/
├── README.md              this text
├── VERSION                the table's version, MAJOR.MINOR
├── admission-table.json   the table
├── schemas/               admission-table.schema.json, the table's; answer-vector.schema.json, a vector of answers'
├── examples/              admission-table/valid/<case>.yaml and admission-table/invalid/<case>.yaml
└── vectors/               answers/<case>.yaml, rules/<rule-id>/<case>.yaml
```

- The table is JSON: code reads it. Examples and vectors are YAML and follow the YAML rules of [the module format](../format/README.md), section 4, and a case is named in kebab-case for what it shows.
- Schemas follow the conventions of the module format's schemas, section 5 of its text, with two differences: an `$id` begins with `https://altnovatrail.github.io/spec/admission/`, then the version in `VERSION`, a slash and the file name, such as `https://altnovatrail.github.io/spec/admission/0.2/admission-table.schema.json`; and no schema marks a field `x-open`, since the table has no open view. The codes of the age categories are those of the module format (R46).
- Code takes this folder from `spec`'s releases, not from a checkout of `spec` (R21, R64). Go code takes it from the Go module `github.com/altnovatrail/spec` at the release's tag, whose package `spec` holds it as `spec.Admission`, with its root here, and its types from the package `types/admissionv0` of the same module (R72). TypeScript takes its types from the npm package `@altnovatrail/spec`, as `@altnovatrail/spec/admissionv0` (R73). The package `admissionv0` holds the types of the major version 0: a major version of the table brings a package of its own. Any other code takes the release's file `admission-<version>.tar.gz`, which holds `LICENSE` and this folder: the release signs it with cosign, with the bundle `admission-<version>.tar.gz.sigstore.json` beside it, and GitHub's attestation of the release names it. Every release of one line of `spec` carries the same version.

## 4. The table

The table is one JSON object with four members.

- `providers` — the AI providers that the table knows, by code: the code that `tutor`'s adapters and the admission function name a provider by, in snake_case, such as `openai`, with the provider's `name`. A provider that is not here is closed: its terms have not been read in full, as privacy 5.3 reads those it names (R65).
- `facts` — the dictionary of deployment facts, by code, each with its `description`: what an operator of a deployment declares by it, and when it holds (section 5).
- `capabilities` — the first part of the table: the rule of each capability of AI for each age category, `open` or `closed`, with its `basis`. The capabilities are those of concepts 10, by code: `handwriting_reading`, `text_reading`, `solution_analysis` — the analysis of the steps of a learner's solution, — `rubric_assessment`, `hint` and `voice`. Voice is one capability for now, the voicing of the tutor by a provider and the learner's voice input together (R56 tutor).
- `cells` — the second part: the cell of each AI provider, AI route and age category.
  - `provider`, by its code in `providers`; `ai_route`, `platform_ai` or `own_key` (concepts 14); `age_category`, by its code (R46).
  - `admission` — `closed`; `open`; or `open_with_facts`, open only when every fact of the cell holds for its provider and age category.
  - `facts` — only in a cell open with facts: the deployment facts that open it, by code in `facts`, in the order the admission function checks them. A cell of the own key is never open with facts: the agreement with the provider is the key owner's, and a deployment declares nothing of it (privacy 5.2).
  - `terms` — the provider's terms that the cell reads: each the provider's `row` in the table of privacy 5.3, as its first column names it, and the date they were last `read`, YYYY-MM-DD.
  - `basis` — what the cell rests on besides the terms.

A `basis` lists citations of `spec`'s documents: a decision, `R47`; an open question of a register, `П-4`; or a section of a document, `privacy 5.3`.

## 5. Deployment facts

- A deployment fact is what the operator of a deployment declares about its agreements with a provider, such as that a data processing agreement is signed. The dictionary of the table says what each code means.
- A fact holds for a provider and for the age categories the operator names: a data processing agreement may not cover children's data, and zero data retention may be approved for one project. The admission function gets the facts declared as a value: for each provider, each fact with the age categories it holds for, as `facts` in a vector of answers (section 9).
- `api` reads that value from a file of its deployment's configuration, which a pull request changes, and reads it when it starts; the file's type and how it is read are `tutor`'s (R57 tutor). With no file no fact holds: every cell open with facts is closed, and the own key of an adult stays open. A fact the file names that the dictionary does not is an error when `api` starts, since a typo would close a route without a word.
- An operator declares a fact only when it holds. `minor_safeguards` holds only once every safeguard on the provider's list of R123 is in place and the author has decided, on Claude's analysis, that they are enough (R112, R123). A deployment of self-hosting declares its own facts.
- Withdrawing a fact closes the cells it opened, with no release of `spec`: that is how an operator closes platform AI at once.
- Only cells of platform AI need facts.

## 6. The admission function

- A request names a capability of AI, an AI route, a provider and an age category, and, for `tutor`, a model. It names no identifier, no country and no age in years (R06).
- The function checks, in this order, and the first refusal is its answer:
  1. the rule of the capability for the age category: when it is closed, or the table has none, the request is refused `capability_closed`;
  2. the cell of the provider, the AI route and the age category: when it is closed, or the table has none, the request is refused `cell_closed`; when it is open, the request is admitted;
  3. when the cell is open with facts, each of its facts in its order: the first that is not declared for the provider and the age category refuses the request `fact_missing`; when each is declared, the request is admitted.
- Then `tutor` checks the model: it is among the admitted models of the capability and of that provider (R07). That list is `tutor`'s and no part of the table, so the vectors leave it out.
- The answer is admitted, with the cell that admits it; or a refusal, with its reason, the rule or the cell that refuses it when the table has one, and for `fact_missing` the fact. With it goes the version of the table. The answer holds no content and no identifier, so it may be written to logs (R09).
- A reading by two readers (R68) asks for each before the first call: when one is refused, neither call goes.

## 7. Table rules

A rule of a table says what its schema cannot. A reader MUST refuse a table that breaks one, and name the rule's ID. A new or stricter rule is a major change (section 2).

| ID | Rule |
|---|---|
| `admission-table.unique-cells` | Two cells MUST NOT have the same provider, AI route and age category. |
| `admission-table.unique-capabilities` | Two rules of `capabilities` MUST NOT have the same capability and age category. |
| `admission-table.known-providers` | The provider of a cell MUST be a key of `providers`. |
| `admission-table.known-facts` | A fact that a cell names MUST be a key of `facts`. |

## 8. Examples

- `examples/admission-table/valid/<case>.yaml` is a table that passes its schema and breaks no rule. `examples/admission-table/invalid/<case>.yaml` fails its schema, and its first line names the error: `# error: <keyword> at <location>`, as in [the module format](../format/README.md), section 8.
- The examples show the schema, and add no rules. The vectors of answers show `schemas/answer-vector.schema.json`.

## 9. Test vectors

- Test vectors are normative: an admission function that does not pass them does not conform to the table (R42).
- `vectors/rules/<rule-id>/<case>.yaml` holds the vectors of one rule of a table: each a table that passes the schema and breaks that rule and nothing else. `spec`'s CI checks that it breaks that rule and no other, and `tutor`'s CI that its admission function refuses it with the rule's ID.
- `vectors/answers/<case>.yaml` holds the vectors of answers: a file for each case, valid against `schemas/answer-vector.schema.json`. It holds `table`, a table of its own that breaks no rule, and `cases`: each a `request`, the deployment `facts` declared, none when they are left out, and the `answer` that section 6 gives, whatever the order of keys. The facts of a case name only providers and facts of its table: a reader refuses any other (section 5). A vector carries a table of its own, not `admission-table.json`, so that a change of a cell changes no vector: what the table says, it says itself. `spec`'s CI computes each answer as section 6 says and compares, and so does `tutor`'s CI, by its admission function.
- `spec`'s CI checks also that the table and every table of a vector cite what `spec`'s documents hold: each row of `terms` is a row of the table of privacy 5.3, and each citation names a decision, an open question or a section that is there.

## 10. Changing the table

- Only `spec` changes the table, by a pull request (R96).
- The signal is a row «в реестр spec» of another repository — most often `tutor`'s, which calls the providers — or `spec`'s own check of the terms before a decision on a route to AI (privacy 5.3).
- The pull request reads the provider's terms again, all of its row of privacy 5.3, and quotes them with the date they were read. It changes the cells and their dates, gives the table a new version in a new line (section 2), and records the change in the decision log, as an amendment to R96 or a decision of its own.
- An operator closes platform AI at once by withdrawing a fact (section 5). The own key has no facts, so closing it takes a new version of the table, a release of `tutor` and a deployment of `api`.
