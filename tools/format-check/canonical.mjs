// The canonical view's serialization and a package's digests: a JSON value written as RFC 8785
// (JCS) in UTF-8, and a digest written sha256:<64 lowercase hex digits> (R62).

import { createHash } from "node:crypto";
import { byCodeUnits } from "../shared.mjs";

export const DIGEST_PREFIX = "sha256:";

// An object is written key by key: JSON.stringify on sorted keys would still put an integer key such
// as "1" first, against RFC 8785, section 3.2.3. JSON.stringify escapes a string as RFC 8785, section
// 3.2.2.2, asks. The format's data holds only integers within ±(2^53 − 1), so a number is written in
// decimal digits.
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

// No byte order mark and no trailing newline.
export const canonicalBytes = (value) => Buffer.from(canonicalText(value), "utf8");

export const digestOf = (bytes) => `${DIGEST_PREFIX}${createHash("sha256").update(bytes).digest("hex")}`;

export const descriptorOf = (bytes) => ({ digest: digestOf(bytes), size: bytes.length });
