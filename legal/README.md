# The legal texts

This folder holds the legal texts of the NovaTrail platform: the privacy policy, the terms of use, the consents, and the sets of texts of the samples page with the volunteer's form. It is normative (R42, R130), and its terms are those of the glossary, concepts 15. The texts are in English, and the English text is the one in force; a screen in another language shows the gist of a text in its own language beside it (privacy 7; R116).

## 1. About the part

- One part serves everyone who shows a text: `app` gets the texts for its pages and its consents from `api` (section 8), the samples page of `canvas` carries its sets of texts in its build, and the organizer of an eval set takes the volunteer's form from the same release (R130).
- A text is never rewritten once it is in force. A consent and a sample name the version of the text that the person saw (GDPR art. 7(1); R93), and the version stays in this part for ever, so that a record finds exactly those words (section 2).
- A self-hosted copy shows the texts of its own operator, never the platform's: its operator writes a folder of this same layout, checked by `spec`'s recipe, and the `api` of the copy serves it (R115; section 8). No text has a placeholder for a name: a text is what one operator promises.
- The words of each text are written in T97–T99 of RUN.md and approved by the author (R112); until then every text is a draft, and nothing is shown to people.

## 2. Versions

- **The part** has a version of its own, an integer, in `VERSION` and in the field `format` of the passport: the layout of this folder, the passport's schema and the rules of section 5. It is neither a tag of `spec` nor the version of a text.
- **A text** has versions numbered from 1, one after another, and so has a set. A version is a file of its own, `texts/<id>/<n>.md`, and an entry in the passport; a new wording is a new version, never an edit of an old one.
- **The status** of a version is `draft` or `in_force`. A draft may change freely and is shown to nobody. A version in force has the date the author approved it, `in_force_since`, and from that release on its file and its entry do not change by a byte (rule `legal.in-force-unchanged`, section 5).
- **The current version** of a text is its version in force with the highest number; a text with no version in force has none, and is shown nowhere. The same holds for a set. A version that a later one replaced stays in the part, so that what a consent or a sample names can still be read.
- **What a release holds to.** Within the line of the release before it, and under the same `VERSION`, `release-version` refuses a change of `schemas/legal.schema.json` once its annotations — `title`, `description`, `$comment` and `examples` — are taken out at every level, and a change of the list of the IDs of the rules of section 5, in their order, as it does for the deployment configuration ([the deployment configuration](../deployment/README.md), section 2). A new text, a new version of a text and the words of a draft are no change of the part.
- A change that gives the part a new `VERSION` also starts a new line of `spec`'s releases. A version number never goes back and is never reused.
- Version 1 comes out with `v0.13.0`, the first release of `spec`'s line 0.13, while its texts are still drafts: their words, and the author's approval, come in later releases of the line.

## 3. Files

```
legal/
├── README.md     this text
├── VERSION       the part's version, an integer
├── legal.yaml    the passport: the texts, their versions, and the sets
├── texts/        <id>/<n>.md, a version of a text
├── schemas/      legal.schema.json, the passport's; reading-vector.schema.json, a vector of reading's
├── examples/     legal/{valid,invalid}/<case>.yaml, passports
└── vectors/      reading/<case>.yaml
```

- A schema is in JSON Schema 2020-12 and follows the conventions of the module format's schemas ([the module format](../format/README.md), section 5). Its `$id` is `https://altnovatrail.github.io/spec/legal/`, then the version, a slash and the file name.
- The passport, the examples and the vectors are YAML by the YAML rules of the module format ([the module format](../format/README.md), section 4).
- An ID of a text or of a set is lower-case Latin letters and digits in words joined by hyphens, beginning with a letter, `privacy-policy`, of at most 64 characters; a set's ID is of at most 24, so that its ID and version fit a sample's `text_set_version` (section 4).
- A file that the layout above does not name is an error, and so is a file under `texts/` that is no version of the passport (rule `legal.files`).

## 4. The passport

`legal.yaml` is an object with exactly these fields; `schemas/legal.schema.json` holds them.

| Field | What |
|---|---|
| `format` | the version of the part, the integer in `VERSION` |
| `texts` | a map from the ID of a text to the text |
| `texts.<id>.place` | where the text is shown: `app`, on its pages and its consents; `samples_page`, the notice of a set of texts of the samples page; `form`, a form a person signs outside every screen |
| `texts.<id>.versions` | the versions, from 1 on, in order |
| `…versions[].version` | the number |
| `…versions[].status` | `draft` or `in_force` |
| `…versions[].in_force_since` | the date the author approved the version, `YYYY-MM-DD`; only in force, and always there |
| `…versions[].summary` | the gist of the version in each language of the interface, `en` and `ru` (R92; R116): a map from the language's tag to plain text, with no Markdown, of at most 1000 characters — code points, as JSON Schema counts them. A self-hosted copy writes both too: one build of `app` serves every copy |
| `sets` | a map from the ID of a set to the set: the notice of a purpose of the samples page and its form, under one version (R11 canvas) |
| `sets.<id>.versions` | the versions, from 1 on, in order |
| `…versions[].version`, `status`, `in_force_since` | as for a text |
| `…versions[].notice`, `…versions[].form` | the text and its version: `{ text: <id>, version: <n> }` |

A version of a text is a Markdown file, CommonMark with the tables of GitHub's flavour, that begins with a heading of the first level, the text's title. It holds no HTML, no image and no link: the screens that show it are `app`'s own pages and the samples page, which open nothing outside (R115), and a form is printed. A sample names its set by the set's ID and version joined by a hyphen, such as `child-sample-1`, in its field `text_set_version` ([the API contracts](../contracts/README.md), section 11); the version is what follows the last hyphen, since an ID may end in a word of digits.

## 5. Reading the part

A reader — `api` serving the texts, the build of the samples page taking its sets, this part's check — accepts a part in two steps, and refuses it at the first step that finds something wrong.

1. **The schema.** The passport passes `schemas/legal.schema.json`. What it refuses is named by its path: the names of the fields from the root joined by `.`, the index of an item of a list among them, such as `texts.privacy-policy.versions.0.status`.
2. **The rules.** A passport that passes the schema breaks none of the rules below. They are read in the order of the table, and the first one broken refuses the part. A rule names what breaks it: a text or a set as `texts.<id>` or `sets.<id>`, a file by its path from the part, such as `texts/privacy-policy/1.md`; every name it finds, in the order of code units.

| ID | Rule |
|---|---|
| `legal.files` | Every version of every text MUST have its file, `texts/<id>/<n>.md`, and every file under `texts/` MUST be a version of the passport. |
| `legal.versions` | The versions of a text and of a set MUST be numbered 1, 2, 3… in order; a draft MUST come after every version in force; and the dates of the versions in force MUST NOT go back. |
| `legal.set-texts` | A version of a set MUST name versions that exist, its notice a text with the place `samples_page` and its form a text with the place `form`; and a version of a set in force MUST name versions in force. |
| `legal.markdown` | A version of a text MUST begin with a heading of the first level and MUST hold no HTML, no image and no link. |
| `legal.in-force-unchanged` | Every version in force in the part of the release before — of a text or of a set — MUST be here: the same file, byte for byte, and the same entry of the passport. |

- `legal.in-force-unchanged` reads the part of the release before: the newest release tag of `spec` in the history of HEAD, other than a tag of HEAD itself. When that release has no `legal/`, the rule holds. A self-hosted copy checks its folder without it: the copy's operator keeps its own history (section 8).
- **What the rules name.** The schema names a field it refuses at its path, a missing field at the path it would have, and a key of a map it refuses as it stands, such as `texts.Privacy-Policy`; an error of `if` is not named, since its `then` or `else` names the place. `legal.in-force-unchanged` names a text or a set whose entry changed or is gone — its place counts as part of its entry — and a file whose bytes changed; a text that is gone is named by its ID alone, and when both an entry and its file changed, both names are given.
- **Markdown.** A link reference with no definition, `[x][y]`, is plain text in CommonMark and passes `legal.markdown`; a bare URL or e-mail address that GitHub's flavour makes a link is a link, and is refused.
- What a reader gives a part it accepts is the current version of every text and of every set that has one (section 2).
- A reader MUST NOT accept a part that one step refuses, and MUST NOT read a part in part.

## 6. Examples

`examples/legal/` holds passports that the schema accepts, under `valid/`, and passports it refuses, under `invalid/`. An invalid example breaks the schema in one way only. An example is no test of section 5's rules: the vectors are.

## 7. Test vectors

A vector of reading, `vectors/reading/<case>.yaml`, passes `schemas/reading-vector.schema.json`: a list of cases, each a part — its passport and its files under `texts/` — and perhaps the part of the release before, and what section 5 gives: the current versions when the reader accepts the part, or the step that refuses it and the names it gives. A reader implements section 5 and gets exactly that. Between them, the vectors accept a part and refuse one at each step and by each rule.

## 8. Who reads it

- **`api`** serves the texts of the place `app` by `LegalService.GetLegalTexts` ([the API contracts](../contracts/README.md), section 15): the current version of each, its body, and its summary in the language asked. `api` takes this part from `spec`'s Go module at the tag it pins, as `spec.Legal` (R64). In a self-hosted copy, `api` reads its operator's folder instead, at its start, from the path its configuration names, and refuses to start when the folder breaks section 5; a change of the folder takes a restart of `api`.
- **`app`** shows those texts as its own pages, with no link out, and the gist of a consent in the language of the screen beside it (R115; R116). Which version a consent was given to, the contract records (RUN.md, T103).
- **The samples page of `canvas`** carries the sets of its purposes in its build, from the file `legal-<VERSION>.tar.gz` of a release of `spec` that `release-verify` accepted (R77): a purpose opens only with a current set (R11 canvas).
- **The organizer** of an eval set, or of a measurement, takes the form from that same file and gives it to sign: the volunteer's form carries the text of DCO 1.1 (R126).
- A self-hosted copy's operator checks its folder by `just -f spec/justfile legal-check-dir <folder>`, against the schema and the rules of section 5 but `legal.in-force-unchanged`. The folder holds `VERSION`, `legal.yaml` and `texts/` alone, and its `VERSION` is that of the `spec` it checks against.

## 9. Changing the part

- The texts change in `spec`, by the tasks that write them, and the author approves a version by turning it to `in_force` with its date (R112).
- The part's layout, schema and rules change only by a decision that amends R130 or replaces it, and with a new `VERSION` (section 2).
