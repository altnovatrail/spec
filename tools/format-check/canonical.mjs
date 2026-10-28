// The serialization of a canonical view and the digests of a package, as section 25 of the format
// text gives them (format/README.md; R62): a JSON value written as RFC 8785, JCS, writes it — keys in
// the order of their UTF-16 code units, no whitespace, strings escaped as ECMAScript's JSON.stringify
// escapes them, UTF-8 — and a digest, the SHA-256 of bytes, written sha256:<64 lowercase hex digits>.
// The format's data holds no number but integers within ±(2^53 − 1) (section 4), so a number here is
// written in decimal digits, and anything else is refused.

import { createHash } from "node:crypto";
import { byCodeUnits } from "../shared.mjs";

export const DIGEST_PREFIX = "sha256:";

// The canonical text of a JSON value. An object is written key by key here, in the order of code
// units: JSON.stringify on an object with sorted keys would put a key such as "1" first, as
// JavaScript enumerates integer keys before the others, against RFC 8785, section 3.2.3. A string goes
// through JSON.stringify, which escapes ", \ and U+0000 to U+001F as RFC 8785, section 3.2.2.2, asks;
// one that is not well formed, with a lone surrogate, is refused, as RFC 8785 refuses it.
export function canonicalText(value) {
  if (value === null || value === true || value === false) return String(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${value}: a number of the format is an integer within ±(2^53 − 1)`);
    return String(value);
  }
  if (typeof value === "string") {
    if (!value.isWellFormed()) throw new RangeError(`${JSON.stringify(value)}: a string holds no lone surrogate`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort(byCodeUnits);
    return `{${keys.map((key) => `${canonicalText(key)}:${canonicalText(value[key])}`).join(",")}}`;
  }
  throw new TypeError(`${String(value)}: no JSON value`);
}

// The canonical bytes of a JSON value: its canonical text in UTF-8, with no byte order mark and no
// newline at the end.
export const canonicalBytes = (value) => Buffer.from(canonicalText(value), "utf8");

// The digest of bytes: sha256: and the SHA-256 of them in lowercase hexadecimal digits.
export const digestOf = (bytes) => `${DIGEST_PREFIX}${createHash("sha256").update(bytes).digest("hex")}`;

// What names bytes in a package (section 25): their digest and their size.
export const descriptorOf = (bytes) => ({ digest: digestOf(bytes), size: bytes.length });
