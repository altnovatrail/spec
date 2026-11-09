// The steps of reading a deployment configuration, one by one, on files written here
// (deployment/README.md, section 5): the schema of spec's own deployment/, then the rules.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileSchemas, readSchema } from "../../format-check/schemas.mjs";
import { DEPLOYMENT_PART } from "../main.mjs";
import { LOOPBACK, RULES, fieldsOf, originOf, readingOf } from "../reading.mjs";

const spec = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const validate = compileSchemas([readSchema(spec, "deployment.schema.json", DEPLOYMENT_PART)]).validators.get("deployment");
const signIn = { service: "firebase", apiKey: "synthetic-key", authDomain: "example.firebaseapp.com", projectId: "example", appId: "synthetic-app" };
const file = (fields) => ({ format: 1, api: "https://api.example.org", signIn, ...fields });

test("the rules are the text's, in its order", () => {
  assert.deepEqual(RULES, ["deployment.api-origin", "deployment.loopback"]);
});

test("a file that passes the schema and breaks no rule is accepted, by nothing", () => {
  assert.deepEqual(readingOf(validate, "https://app.example.org", file()), {});
  assert.deepEqual(readingOf(validate, "http://localhost:5173", file({ api: "http://127.0.0.1:8080" })), {});
  assert.deepEqual(readingOf(validate, "http://[::1]", file({ api: "http://[::1]:8080" })), {});
});

test("the schema comes first, and names every field it refuses, once, in the order of code units", () => {
  assert.deepEqual(readingOf(validate, "https://app.example.org", file({ api: "https://api.example.org:443", format: 2 })), { refused_by: "schema", fields: ["format"] });
  assert.deepEqual(readingOf(validate, "https://app.example.org", { api: "http://api.example.org", extra: true }), { refused_by: "schema", fields: ["api", "extra", "format", "signIn"] });
  assert.deepEqual(readingOf(validate, "https://app.example.org", null), { refused_by: "schema", fields: [""] });
});

test("api must be written as its origin is", () => {
  for (const api of ["https://api.example.org:443", "http://localhost:80"]) {
    assert.deepEqual(readingOf(validate, "http://localhost:5173", file({ api })), { refused_by: "deployment.api-origin", fields: ["api"] }, api);
  }
});

test("http needs app itself on a loopback host, and the origin's rule comes before it", () => {
  assert.deepEqual(readingOf(validate, "https://app.example.org", file({ api: "http://localhost:8080" })), { refused_by: "deployment.loopback", fields: ["api"] });
  assert.deepEqual(readingOf(validate, "http://localhost.example.org", file({ api: "http://localhost:8080" })), { refused_by: "deployment.loopback", fields: ["api"] });
  assert.deepEqual(readingOf(validate, "https://app.example.org", file({ api: "http://localhost:80" })), { refused_by: "deployment.api-origin", fields: ["api"] });
});

test("a loopback host is 127.0.0.1, localhost or [::1], written so, and nothing else", () => {
  assert.deepEqual([...LOOPBACK], ["127.0.0.1", "localhost", "[::1]"]);
  for (const origin of ["http://127.0.0.2:5173", "http://dev.localhost:5173", "http://localhost.example.org", "http://[::2]:5173"]) {
    assert.deepEqual(readingOf(validate, origin, file({ api: "http://localhost:8080" })), { refused_by: "deployment.loopback", fields: ["api"] }, origin);
  }
});

test("the origin of app is an origin as the URL Standard serializes it, or no case of reading", () => {
  for (const origin of ["http://[::1", "http://localhost:80", "http://localhost:5173/", "LOCALHOST"]) {
    assert.throws(() => readingOf(validate, origin, file()), /is not an origin as the URL Standard serializes it/, origin);
  }
  assert.equal(originOf("http://LOCALHOST:5173/path"), "http://localhost:5173");
  assert.equal(originOf("no URL"), null);
});

test("an api that is no URL is refused by its origin's rule, whatever schema let it pass", () => {
  const passing = () => true;
  assert.deepEqual(readingOf(passing, "https://app.example.org", { api: "no URL" }), { refused_by: "deployment.api-origin", fields: ["api"] });
});

test("the paths of ajv's errors undo the escapes of a JSON Pointer and name a missing or unknown field", () => {
  assert.deepEqual(
    fieldsOf([
      { keyword: "required", instancePath: "/signIn", params: { missingProperty: "appId" } },
      { keyword: "unevaluatedProperties", instancePath: "", params: { unevaluatedProperty: "a/b" } },
      { keyword: "pattern", instancePath: "/x~1y/z~0w", params: {} },
      { keyword: "minLength", instancePath: "/signIn/appId", params: {} },
      { keyword: "type", instancePath: "", params: {} },
    ]),
    ["", "a/b", "signIn.appId", "x/y.z~w"],
  );
});
