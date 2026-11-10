# The deployment configuration

This folder is the format of the deployment configuration of NovaTrail: the file `/deployment.json`, which `app` reads at every start from the root of its origin, beside its signed build but not in it. It is normative (R42, R85), and its terms are those of the glossary, concepts 15.

## 1. About the format

- One build of `app` serves the platform and every self-hosted copy (R09 app). What differs between them is this file, and the headers of the hosting: the origin of `api` and the project of the sign-in service.
- The file is written by those who do not read it. On the platform `infra`'s rollout writes it from the rollout list (R106; R05 infra), and in a self-hosted copy its operator writes it. `app` reads it, and the rollout checks it before it writes it.
- The file holds no secret: every browser that opens `app` gets it. "API keys restricted to Firebase services do not need to be treated as secrets, and it's safe to include them in your code or configuration files" ([Firebase, Learn about using and managing API keys](https://firebase.google.com/docs/projects/api-keys), last updated 2026-11-05, read 2026-11-09; R09 app). No key of an AI provider, no key of a service account and no token goes into it, ever.
- The template of the Content Security Policy, `csp.json`, is no part of this format: it follows the code of the build, which scripts and addresses that code needs, and stays in the signed build of `app` (R09 app).
- How `app` fetches the file — the absolute path, the status, the type and the size of the answer — and what it shows when the file is wrong, is R09 app's. This text says what a file is, and when a reader accepts it.

## 2. Versions

- The format has a version of its own, an integer, written once, in `VERSION`, and in the field `format` of every file. It is neither a tag of `spec` nor the version of the module format or of the admission table.
- `app` refuses a field it does not know (section 5), so every change of the file's shape is a new version: a field added, removed or renamed, a value the schema allows or refuses, and a value a rule of reading allows or refuses. Version 1 is the format that R09 app named first: `format`, `api` and `signIn`.
- What the release holds to this is the shape alone (R85): within the line of the release before it, and under the same version, `release-version` refuses a change of `schemas/deployment.schema.json` once its annotations — `title`, `description`, `$comment` and `examples` — are taken out at every level, and a change of the list of the IDs of the rules of section 5, in their order. A rule is held by its ID, so a rule that comes to allow or refuse another value takes a new ID, or a new rule is added, and the format a new version with it. A change of `schemas/reading-vector.schema.json`, of a description, of an example or of a vector passes.
- A change that gives the format a new version also starts a new line of `spec`'s releases, as a new version of the admission table does ([the admission table](../admission/README.md), section 2), so within one line the format is the same, and a release's tag names the format it carries (R85).
- A build of `app` carries a copy of `schemas/deployment.schema.json` from the release of `spec` it stands on, as `deployment.schema.json` at the root of its archive, and so names the version it reads. The rollout checks a file by the schema of its `spec/` submodule and by the schema of the build, and refuses a build of another version, naming both; `infra` then moves to the tag of that version (R85).
- Changes of this text that keep its rules, and a test vector that pins what it says already, give no new version: the tag of `spec` names such a revision.
- A version number never goes back and is never reused: undoing a change is a new version too.
- Version 1 comes out with v0.11.0, the first release of `spec`'s line 0.11.

## 3. Files

```
deployment/
├── README.md     this text
├── VERSION       the format's version, an integer
├── schemas/      deployment.schema.json, the file's; reading-vector.schema.json, a vector of reading's
├── examples/     deployment/{valid,invalid}/<case>.yaml
└── vectors/      reading/<case>.yaml
```

- A schema is in JSON Schema 2020-12 and follows the conventions of the module format's schemas ([the module format](../format/README.md), section 5), with two differences. Its `$id` is `https://altnovatrail.github.io/spec/deployment/`, then the version, a slash and the file name. And the fields of the file keep the names of R09 app, in camelCase: those of `signIn` are the keys of the configuration object of a Firebase project, which an operator copies from the Firebase console and `app` gives the Firebase SDK as they are. The schema of a vector names its fields in snake_case.
- The path of the file's schema, `deployment/schemas/deployment.schema.json`, stays the same from version to version, so that a check finds it in a `spec/` submodule by one path, as the schemas of the admission table (R14 infra).
- Examples and vectors are YAML by the YAML rules of the module format ([the module format](../format/README.md), section 4); a reader reads the file itself as JSON.
- A file that the layout above does not name is an error.

## 4. The file

A file is a JSON object with exactly these fields; `schemas/deployment.schema.json` holds them.

| Field | What | Example | Rule |
|---|---|---|---|
| `format` | the version of the format | `1` | the integer 1 |
| `api` | the origin of `api`: its requests, the open views and the media files of a package's part for the device (R62) | `https://api.example.org` | an origin: a scheme, a host and perhaps a port — no path, no `/` at the end, no query, fragment or credentials; `https`, or `http` on a loopback host (section 5) |
| `signIn.service` | the sign-in service | `firebase` | only `firebase`: another service is another adapter, in `api` (R03 api) and in `app` |
| `signIn.apiKey`, `signIn.projectId`, `signIn.appId` | the parameters of the Firebase project, as its console gives them | — | strings that are not empty |
| `signIn.authDomain` | the host of the Firebase sign-in pages | `example-project.firebaseapp.com` | a host name: no scheme, no path; the SDK builds `https://<authDomain>/__/auth/…` itself |

```json
{
  "format": 1,
  "api": "https://api.example.org",
  "signIn": {
    "service": "firebase",
    "apiKey": "<the key of the Firebase web app>",
    "authDomain": "example-project.firebaseapp.com",
    "projectId": "example-project",
    "appId": "<the ID of the Firebase web app>"
  }
}
```

- There is no default and no address of the platform in a build: a copy with no file goes neither to the platform's `api` nor to its Firebase project.
- A field the format does not name is an error, not ignored: a `measurementId` of Google Analytics, copied from the Firebase console with the rest, would otherwise turn analytics on unseen (privacy 1).

## 5. Reading the file

A reader — `app` at its start, the rollout before it writes the file — accepts a file in two steps, and refuses it at the first step that finds something wrong. It names every field that step refuses, by its path: the names of the fields from the root, joined by `.`, such as `signIn.authDomain`, and the empty path for the root itself.

1. **The schema.** The file passes `schemas/deployment.schema.json`. A field missing, unknown or of a wrong value is refused at its own path: a missing or unknown field at the path it would have.
2. **The rules.** A file that passes the schema breaks none of the rules below. They are read in the order of the table, and the first one broken refuses the file; a rule names `api`, the one field it holds.

| ID | Rule |
|---|---|
| `deployment.api-origin` | `api` MUST be equal to its own origin, as the URL Standard serializes an origin ([WHATWG URL, origin](https://url.spec.whatwg.org/#concept-url-origin), read 2026-11-09) — `new URL(api).origin` in a browser or in Node.js: `https://api.example.org:443` is refused, as its origin is written without the default port. |
| `deployment.loopback` | `api` MUST be `https`, unless the origin of `app` itself is on a loopback host: work and the token of sign-in would otherwise cross the network in clear text. |

- A loopback host is the host `127.0.0.1`, `localhost` or `[::1]`, written so in an origin as the URL Standard serializes it, and nothing else: not another address of `127.0.0.0/8`, such as `127.0.0.2`, nor a name under `localhost`, such as `dev.localhost`. It is one definition for both: the host of `api`, which the schema holds to it, and the host of the origin of `app`, which `deployment.loopback` reads.
- On a loopback, `api` over `http` is the origin of `app` itself, its paths led by a proxy of the server of `app`: the rule lets `http` through, but the lower layer of the policy of `app`'s page lets no origin over `http` but its own (architecture 3.7 app).
- The schema cannot hold either rule: it does not know URL serialization, nor where `app` is open. The rollout of the platform writes no `http`, and checks `deployment.loopback` against the origin of the platform's `app`.
- A reader MUST NOT accept a file that one step refuses, and MUST NOT read a file in part.

## 6. Examples

`examples/deployment/` holds files that the schema accepts, under `valid/`, and files it refuses, under `invalid/`. An invalid example breaks the schema in one way only. An example is no test of section 5's rules: the vectors are.

## 7. Test vectors

A vector of reading, `vectors/reading/<case>.yaml`, passes `schemas/reading-vector.schema.json`: a list of cases, each the origin where `app` is open, a file, and what section 5 gives — nothing when the reader accepts the file, or the step that refuses it and the paths it names. A reader implements section 5 and gets exactly that. Between them, the vectors accept a file and refuse one at each step and by each rule.

## 8. Changing the format

- The format changes only in `spec`, by a decision that amends R85 or replaces it, and with a new version (section 2). `app` and `infra` take it with a tag of the line that carries it, and a new field of `app`'s, such as the domain of widgets at stage 4 (R16), comes as a new version.
- A test vector that pins what the text says already, or a case it was missing, is no change of the format.
