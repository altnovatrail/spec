// What licenses-check accepts in tools/package-lock.json (R12 and its amendment of 2026-10-19).

// Compatible with Apache-2.0: the ASF's Category A, "we consider the following licenses to be
// similar in terms to the Apache License 2.0", as SPDX identifiers. CC0 is on the ASF's list of
// licenses it treats as public domain. https://www.apache.org/legal/resolved.html, read 2026-10-19.
export const allowed = [
  "0BSD",
  "Apache-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT-0",
  "Unlicense",
];

// Packages accepted by name, each with what the lock file says of it (null: nothing) and why.
// An exception that no longer matches the lock file is an error: it is read again, not kept.
export const exceptions = {
  elkjs: {
    license: "EPL-2.0",
    reason: "mermaid's layout engine, run by docs-check and never shipped: a tool's exception (R12)",
  },
  khroma: {
    license: null,
    reason: "its package.json names no license; the license file in the package is MIT",
  },
};
