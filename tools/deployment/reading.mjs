// The reading of a deployment configuration, section 5 of deployment/README.md: the schema first,
// then the rules in the order of the text's table. A second implementation, beside app's and the
// rollout's, which computes what each vector of reading gives.

import { byCodeUnits } from "../shared.mjs";

export const RULES = ["deployment.api-origin", "deployment.loopback"];
// The loopback hosts, as section 5 defines them: these three, written so, and nothing else — not
// another address of 127.0.0.0/8, nor a name under localhost.
export const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

// What a reader gives a file read at origin, with validate the compiled schema of the file: {} when
// it accepts it, or { refused_by, fields } with the paths in the order of code units. origin is
// where app is open, as the URL Standard serializes an origin, as app's location.origin gives it:
// anything else is no case of reading, and is refused with an error, as deployment-check refuses
// such a vector before it reads it.
export function readingOf(validate, origin, file) {
  if (originOf(origin) !== origin) throw new Error(`${JSON.stringify(origin)} is not an origin as the URL Standard serializes it`);
  if (!validate(file)) return { refused_by: "schema", fields: fieldsOf(validate.errors) };
  const rule = brokenRule(origin, file.api);
  return rule ? { refused_by: rule, fields: ["api"] } : {};
}

function brokenRule(origin, api) {
  if (originOf(api) !== api) return "deployment.api-origin";
  if (api.startsWith("http:") && !LOOPBACK.has(new URL(origin).hostname)) return "deployment.loopback";
  return null;
}

// The origin of a URL as the URL Standard serializes it, or null when it is no URL.
export function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// The paths of the fields that ajv's errors name, each once: a missing or unknown field at the path
// it would have, any other error at the place it stands.
export function fieldsOf(errors) {
  const paths = new Set();
  for (const error of errors) {
    const names = error.instancePath.split("/").slice(1).map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
    if (error.keyword === "required") names.push(error.params.missingProperty);
    else if (error.keyword === "unevaluatedProperties") names.push(error.params.unevaluatedProperty);
    paths.add(names.join("."));
  }
  return [...paths].sort(byCodeUnits);
}
