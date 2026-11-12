# The age of digital consent

This folder holds the table of the age of digital consent by country: the age from which a learner gives consent to the processing of their data themselves, and below which the holder of parental responsibility gives it for them, with the law and the provision that set it, a quote of the provision, its source and the date it was read. By it `api` puts a learner of 13 to 17 in an age category (R98, R134). It is normative (R42, R134), and its terms are those of the glossary, concepts 15.

## 1. About the part

- **What the age decides.** A learner's age category is one of four: `under_13`, `from_13_to_consent`, `from_consent_to_18` and `adult` (concepts 13; R06, R46). Their bounds are 13, the age of digital consent of the learner's country, and 18. Below that age the parent gives consent for the learner; from it on, up to 18, the learner gives it themselves, in their own profile (privacy 3.1; R116).
- **Where an age comes from.** GDPR sets 16 and lets a Member State provide by law a lower age, not below 13 (art. 8(1)); the EEA takes GDPR as it is; the UK GDPR sets 13. Outside them, the table holds the United States: COPPA asks a parent's consent below 13, and no federal law sets an age above it. The laws of the states of the US are another task (RUN.md, T107; R131).
- **A country outside the table** has the age 18: a parent gives consent for every learner under 18 there, and the category `from_consent_to_18` is empty. The platform cannot know a law nobody has read, and an error on that side is a parent's consent for a learner who could have given their own, never a learner's own consent where the law asks the parent's (R134).
- **One table for every copy.** A law is the same for every operator, so a self-hosted copy reads this table as the platform does. Whether a deployment takes learners from a country at all is not in the table: its operator closes a country in `api`'s own list of countries, as the platform does with the EU, the EEA and the UK until it has its representatives there (R118, R131).
- **History.** A law changes, and an entry is never rewritten: a new age is a new entry, with the day from which it applies, and the entries before it stay. The table begins with the ages in force when it was first read, on 2026-11-10; an age that applied before is no entry, and an entry's note names it where the reader needs it. `api` keeps the category, the day the age was given and the age of the country that the category was given by, not the age in years (privacy 3.3), so that a learner who gave their own consent gives their age again once the country's age is above it (section 6).

## 2. Versions

- **The part** has a version of its own, an integer, in `VERSION` and in the field `format` of the table: the layout of this folder, the table's schema and the rules of section 5. It is neither a tag of `spec` nor a version of the table's entries.
- **The entries** change in any release, by a task that reads the law again, under the rules of section 5: a new entry, a new country, a correction of the words of an entry. None of these is a change of the part.
- **What a release holds to.** Within the line of the release before it, and under the same `VERSION`, `release-version` refuses a change of `schemas/consent-age.schema.json` once its annotations — `title`, `description`, `$comment` and `examples` — are taken out at every level, and a change of the list of the IDs of the rules of section 5, in their order, as it does for the deployment configuration ([the deployment configuration](../deployment/README.md), section 2). A new code of ISO 3166-1 is such a change of the schema, and comes with a new `VERSION`.
- A change that gives the part a new `VERSION` also starts a new line of `spec`'s releases. A version number never goes back and is never reused.
- Version 1 comes out with `v0.14.0`, the first release of `spec`'s line 0.14.

## 3. Files

```
consent-age/
├── README.md          this text
├── VERSION            the part's version, an integer
├── consent-age.yaml   the table
├── schemas/           consent-age.schema.json, the table's; reading-vector.schema.json and category-vector.schema.json, the vectors'
├── examples/          consent-age/{valid,invalid}/<case>.yaml, tables
└── vectors/           reading/<case>.yaml and category/<case>.yaml
```

- A schema is in JSON Schema 2020-12 and follows the conventions of the module format's schemas ([the module format](../format/README.md), section 5). Its `$id` is `https://altnovatrail.github.io/spec/consent-age/`, then the version, a slash and the file name.
- The table, the examples and the vectors are YAML by the YAML rules of the module format ([the module format](../format/README.md), section 4).
- A file that the layout above does not name is an error.

## 4. The table

`consent-age.yaml` is an object with exactly these fields; `schemas/consent-age.schema.json` holds them.

| Field | What |
|---|---|
| `format` | the version of the part, the integer in `VERSION` |
| `outside_table` | the age of a country the table does not hold: 18 (section 1) |
| `countries` | a map from a country, by its code of ISO 3166-1 alpha-2 — `GB` for the United Kingdom, `GR` for Greece — to its entries |
| `countries.<code>[]` | the entries of the country, by the day they apply from, the earliest first |
| `…[].age` | the age of digital consent, an integer from 13 to 18 |
| `…[].from` | the day from which the age applies, `YYYY-MM-DD`: the day the provision applies from, or the day GDPR applies from in the country when the age is GDPR's own. A day still to come is a law adopted and not yet applying |
| `…[].law` | the law, by its official title in its own language and its number in the official journal |
| `…[].provision` | the article, section or paragraph of the law, as the law writes it |
| `…[].quote` | the words of the provision that set the age, verbatim, in the language of the law; for an age that is GDPR's own, the words of GDPR art. 8(1) |
| `…[].source` | the official text that was read: the URL of the official journal or the official database of the country's laws, or of EUR-Lex |
| `…[].read` | the day the source was read, `YYYY-MM-DD` |
| `…[].note` | what else the reader of the entry needs, in English, such as how the law has the parent and the learner consent together, or which national law was read and found to set no age: optional |

- A code is one of the 249 codes that ISO 3166-1 assigns officially, which `schemas/consent-age.schema.json` lists in `$defs.country`, as the iso-codes project of Debian keeps them ([`data/iso_3166-1.json`](https://salsa.debian.org/iso-codes-team/iso-codes/-/blob/d055275324963c9bce5882eaaa93024cf2bf7ed0/data/iso_3166-1.json), commit d055275 of 2023-02-22, read 2026-11-10). A code that ISO only reserves, such as `UK` or `EL`, is no code of a country, and the schema refuses it. The same list gives `api` and `app` the codes a learner's country may be (section 9).
- A day is a day of the calendar in UTC.

## 5. Reading the table

A reader — this part's check, and `api` if it reads a table it did not take from `spec`'s Go module — accepts a table in two steps, and refuses it at the first step that finds something wrong.

1. **The schema.** The table passes `schemas/consent-age.schema.json`. What it refuses is named by its path: the names of the fields from the root joined by `.`, the index of an item of a list among them, such as `countries.AT.0.age`.
2. **The rules.** A table that passes the schema breaks none of the rules below. They are read in the order of the table, and the first one broken refuses it. A rule names what breaks it: a country as `countries.<code>`, or an entry as `countries.<code>.<index>`; every name it finds, in the order of code units.

| ID | Rule |
|---|---|
| `consent-age.days` | Every `from` and every `read` MUST be a day of the calendar. |
| `consent-age.entries-ordered` | The entries of a country MUST stand by their `from`, each later than the one before it. |
| `consent-age.ages-kept` | Every entry of the table of the release before — its `age` and its `from` — MUST be here, in its country. |

- `consent-age.days` names an entry, `consent-age.entries-ordered` a country, and `consent-age.ages-kept` a country of the release before that lost an entry or is gone.
- `consent-age.ages-kept` reads the table of the release before: the newest release tag of `spec` in the history of HEAD, other than a tag of HEAD itself, unless the working tree changes `consent-age/` (`tools/release/previous.mjs`). When that release has no `consent-age/`, the rule holds; a table of that release that this schema refuses stops the check, as one of another shape is no history to hold this one to. The words of an entry — `law`, `provision`, `quote`, `source`, `read` and `note` — may be corrected, and `read` moves when the source is read again; its `age` and `from` never change, since a category given by them stays given (section 6).
- A reader MUST NOT accept a table that one step refuses, and MUST NOT read a table in part.

## 6. The category

A reader computes from an accepted table what follows; `api` computes the same, and the vectors of section 8 give the answers.

- **The age of a country on a day** is the `age` of the country's latest entry whose `from` is not after that day. A country the table does not hold, and a country on a day before its first entry — an entry still to come among them —, has the age `outside_table`.
- **The category of a learner** of `age_years` years, an integer from 0, in a country on a day: `under_13` below 13; else `from_13_to_consent` below the age of the country on that day; else `from_consent_to_18` below 18; else `adult`. `api` computes it when the age is given — in a request for consent and at the yearly check of the category (privacy 3.3; R98) — and keeps the category, the day and `applied`, the age of the country on that day, not the age in years. `applied` is an age of a law, from 13 to 18, and says nothing of the learner but what the category says.
- **Asking the age again.** A profile whose category is `from_consent_to_18`, given by the age `applied`, needs its age given again on the day `today` when the age of its country on `today` is greater than `applied`: the learner may now be below the age, where the law asks a parent's consent. Before the next work of such a profile, `api` asks for the age again, as it does when the country changes (privacy 3.3; R134). A lower age waits for the yearly check: the category kept is the stricter one. Any other category never needs it. The rule takes `applied`, not the day the age was given: an entry written after its own day — a law found late — still asks the age again of a category the table before it gave.

## 7. Examples

`examples/consent-age/` holds tables that the schema accepts, under `valid/`, and tables it refuses, under `invalid/`. An invalid example breaks the schema in one way only. An example is no test of section 5's rules: the vectors are.

## 8. Test vectors

- **A vector of reading**, `vectors/reading/<case>.yaml`, passes `schemas/reading-vector.schema.json`: a list of cases, each a table as YAML reads it, perhaps with the table of the release before, and what section 5 gives — that the reader accepts it, or the step that refuses it and the names it gives. Between them, the vectors accept a table and refuse one by the schema and by each rule.
- **A vector of the category**, `vectors/category/<case>.yaml`, passes `schemas/category-vector.schema.json`: a table that section 5 accepts, and cases of section 6 — a learner's age in years, a country and a day, and the category with `applied`; or a category, a country, the `applied` it was given by and a day, and whether the age is asked again. Between them, the vectors hold a country of 13, of an age between, of 16 and outside the table, every category, an entry still to come, an age that rose, one that fell and a law found late.
- A reader implements sections 5 and 6 and gets exactly what the vectors give.

## 9. Who reads it

- **`api`** takes the table from `spec`'s Go module at the tag it pins, as `spec.ConsentAge` (R64), and computes the category and when to ask the age again by section 6; it refuses a country whose code is not one of `$defs.country`. A new entry reaches `api` with a new tag of `spec`, so the session that writes it says so in the row of table 4, in `DEBT.md`, that `api` takes (R134).
- **`app`** may take the codes of the countries it offers from the same list, of the npm package `@altnovatrail/spec`; the category it shows is the one `api` gives.
- **A self-hosted copy** reads the same table, from the same release (section 1). The file `consent-age-<VERSION>.tar.gz` of a release of `spec` holds this folder, for whoever reads it outside Go, once `release-verify` accepted it (R77).

## 10. Changing the table

- An entry changes in `spec`, by a task that reads the law again, and the entry names what was read and when. A law adopted and not yet applying is an entry whose `from` is still to come; a bill is not an entry.
- The part's layout, schema and rules change only by a decision that amends R134 or replaces it, and with a new `VERSION` (section 2).
