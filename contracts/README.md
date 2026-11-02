# The NovaTrail API contracts

This is the text of the API contracts: how the messages and services that NovaTrail's parts exchange are written in protobuf, which rules buf holds them to, how they are versioned, and which code is generated from them. It is normative, as are the `.proto` files beside it (R42). The documents under `docs/` describe the platform in Russian and add no rules to the contracts. The decision behind this text is R83.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

## 1. About the contracts

- An API contract — a contract, in this text — is a protobuf package: its messages, and the services one part of the platform calls on another (R11). The contract of the element `<novatrail-canvas>` with `app` is not one: it is TypeScript types, written by hand (R36, R74). The first ones are the observation, which `tutor`, `module-kit` and `api` exchange in one process (R15), and the contract between `app` and `api`.
- The contracts are the `.proto` files under `contracts/` and this text. The code generated from them is no part of the contract: it follows from the files (section 8).
- The names in the contracts are the English terms of the glossary, concepts 15. A value or an ID of the module format keeps the spelling the format gives it (section 5).
- This folder has no `.proto` file yet. The tasks of epic E3 add them, each by the rules of this text.

## 2. Versions

- A contract has no version of its own beside its package. Its version is the last component of its package, `v1`, and the tag of `spec` in which a file came out.
- Within a package a change MUST only add: a new message, field, enum value, service or method. `buf breaking` holds this against the previous release of `spec` (section 7). Such a change comes out in any release of the line.
- A change that would break a package MUST come as a new package, `v2`, beside the old one. A package `vN` with N of 2 or more, beside its `v(N−1)`, opens a new line of `spec`, as a new version of the module format does (R44). The first package `v1` of a new part opens none. A version of a package is never reused.
- A server holds two major packages of a contract: the current one and the previous one. A client reads the package it was built with. Within a major package, a client older than the server works with it, since both sides of the transport skip the fields they do not know (section 9).

## 3. Files and names

- A file MUST lie at `contracts/novatrail/<part>/v1/<name>.proto`, and its package MUST be `novatrail.<part>.v1`: the path from `contracts/` repeats the package, as buf's rule `PACKAGE_DIRECTORY_MATCH` asks. `<part>` and `<name>` are lower snake case.
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
- Beside buf's rules, `spec`'s checks hold every rule of this text that a program can read: the syntax (section 4), the path and the package (section 3), no `json_name` (section 6) and no unsigned type (section 5), `buf.yaml` as section 3 and this section have it, and a template of `buf generate` with local plugins alone (section 8). `optional` where absence differs from zero, and `int64` only past 2³¹ − 1, are held by review.

## 8. Generated code

- The code is generated from the files by buf with local plugins at exact versions; no remote plugin of the Buf Schema Registry is used. `buf.gen.yaml` at the root of `spec` names them: `protoc-gen-go` and `protoc-gen-connect-go` are tools of `contracts/go.mod`, so that each comes at the version of the runtime the module requires, and `protoc-gen-es` is a package of `spec`'s tools. The code lies in the repository beside the files, and `spec`'s checks verify that it is what buf generates.
- **Go.** The code is the module `github.com/altnovatrail/spec/contracts`, whose `go.mod` lies in `contracts/`: the messages from `protoc-gen-go` and the services from `protoc-gen-connect-go`. Its tag is `contracts/vX.Y.Z`, with the number of the tag of `spec`. It requires the protobuf runtime and Connect at exact versions, while the module `github.com/altnovatrail/spec` at the root still requires nothing (R64). Code on Go MUST take a contract from this module and MUST NOT generate its own: two copies of one contract in one program refuse to start.
- **TypeScript.** The code is the npm package `@altnovatrail/contracts`, JavaScript with its declarations and the JSON types of `protoc-gen-es`. It depends on `@bufbuild/protobuf` at an exact version. Its version is the tag of `spec` without `v`, and a consumer verifies it as it verifies `@altnovatrail/spec` (R73, R77).

## 9. Transport

- `app` and `api` talk by Connect: the server is connect-go, and the client connect-es. Every call is unary.
- Whether a call goes as JSON or binary protobuf is the transport's choice; a server takes both.
- Both sides skip the fields they do not know, so a client and a server within one major package understand each other.
