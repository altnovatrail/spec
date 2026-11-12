// What docs-check knows about the documents. When a document, a register or a repository
// is added or renamed, this is the file to change.
//
// Two profiles read them: spec's own, and a NovaTrail repository's, which has documents and
// registers of its own and cites spec's from its spec/ submodule (RUN.md, T18; R32).

import path from "node:path";

// Documents cited by name and section: "product 7", "architecture 3.6".
export const documents = {
  product: "docs/product.md",
  concepts: "docs/concepts.md",
  privacy: "docs/privacy.md",
  architecture: "docs/architecture.md",
  repositories: "docs/repositories.md",
  dpia: "docs/dpia.md",
  // The records of external facts, and the results of measurements: out of the documents that
  // describe how things are built (R143, the 2026-11-12 amendment).
  sources: "docs/sources.md",
  measurements: "docs/measurements.md",
};

// The numbered registers. `section` is the numbered section that holds the register, or null
// for the preamble before the first section; `heading` instead names a heading by how its text
// begins. The register's opening names the next free number in the text directly under that
// heading. A register with `elsewhere`, a file and a heading, once lived there: a table left
// under that heading beside the register's own file is a second copy, and an error. With
// `fallback` too, a repository whose own file does not exist yet is read from there, if a table
// stands under that heading; with no table there either, the error names the own file. A register with `gaps` keeps the numbers of rows that left it: no number is reused,
// so the next free one is above every row. Its numbers are never checked where they are cited:
// the citation patterns know R, О-, П-, Т- alone.
export const registers = [
  {
    prefix: "R",
    file: "docs/decisions.md",
    section: null,
    // Entries are paragraphs that open with "**R01. …**".
    definedBy: "entry",
    width: 2,
    ordered: true,
  },
  {
    prefix: "О-",
    file: "docs/product.md",
    section: "13",
    // Rows of the tables in section 13 and its subsections. Decided questions move to 13.1,
    // so the order in the file is not the order of the numbers.
    definedBy: "table",
    width: 1,
    ordered: false,
  },
  {
    prefix: "П-",
    file: "docs/privacy.md",
    section: "9",
    definedBy: "table",
    width: 1,
    ordered: true,
  },
  {
    prefix: "Т-",
    file: "docs/repositories.md",
    section: "8",
    definedBy: "table",
    width: 1,
    ordered: true,
  },
  ...workRegisters(),
];

// Table 3 of RUN.md, the questions to the author, and table 4, the debt, which lives in DEBT.md
// (R19, the 2026-11-11 amendment). Rows leave when they are answered or closed, and their numbers
// are not reused. A repository that has not moved its table 4 to DEBT.md yet keeps it in RUN.md
// (`fallback`), until it takes the rule with a tag of spec, by its task of T123 spec.
function workRegisters(fallback = false) {
  const table = (prefix, file, heading) => ({ prefix, file, heading, definedBy: "table", width: 1, ordered: false, gaps: true, empty: true });
  const debt = { ...table("Д", "DEBT.md", "Таблица 4."), elsewhere: { file: "RUN.md", heading: "Таблица 4." }, fallback };
  return [table("В", "RUN.md", "Таблица 3."), debt];
}

// Where the limits of size are, from spec's root (budgets.mjs; R145).
const BUDGETS = "tools/docs-check/budgets.json";

// spec's own profile: its documents and registers, and spec's citations of itself ("R18 spec")
// are its own.
// What is never scanned: `names` wherever they are, `paths` relative to the root. The fixtures
// of docs-check break the rules on purpose, and those of format-check are a trial format, not
// spec's documents; .repos holds working copies of other repositories, with documents and logs of
// their own.
export const specProfile = {
  documents,
  registers,
  spec: null,
  // The limits of size of budgets.mjs, from the working tree checked (R145).
  budgets: { file: BUDGETS, block: "spec" },
  excluded: { names: [".git", "node_modules"], paths: ["tools/docs-check/test/fixtures", "tools/format-check/test/fixtures", ".repos"] },
};

// A NovaTrail repository's profile. Its own: docs/architecture.md, cited as "architecture 2", and
// docs/sources.md and docs/measurements.md once it has them, "sources 2.1" and "measurements 1"; its
// decision log, which may still be empty; table 3 of its RUN.md and table 4 of its DEBT.md, or of
// its RUN.md until it moves. spec's documents and the
// registers R, О-, П-, Т- are read from specDir — the spec/ submodule, or for a draft spec's
// working tree — and cited "architecture 3.8 spec", "R18 spec", "Т-15". What is wrong in spec's
// own files is spec's to report, not the repository's.
export function componentProfile(specDir) {
  const inSpec = (file) => `spec/${file}`;
  return {
    documents: { architecture: "docs/architecture.md", sources: "docs/sources.md", measurements: "docs/measurements.md" },
    // "раздел 3" in a document with no numbered sections of its own, and no link to tell.
    sectionsDocument: "docs/architecture.md",
    registers: [
      { prefix: "R", file: "docs/decisions.md", section: null, definedBy: "entry", width: 2, ordered: true, empty: true },
      ...workRegisters(true),
    ],
    // spec's block "repository" of its limits, from the submodule, with what the repository's
    // docs-budgets.json names in its place; without that file, there is no check yet (R145).
    budgets: { file: inSpec(BUDGETS), path: path.join(specDir, BUDGETS), block: "repository", own: "docs-budgets.json" },
    spec: {
      dir: specDir,
      documents: Object.fromEntries(Object.entries(documents).map(([name, file]) => [name, inSpec(file)])),
      registers: registers.filter((r) => ["R", "О-", "П-", "Т-"].includes(r.prefix)).map((r) => ({ ...r, file: inSpec(r.file) })),
    },
    // The submodule at the root, and no other folder that happens to be called spec.
    excluded: { names: [".git", "node_modules"], paths: ["spec"] },
  };
}

// MathTrail's repositories: their decisions and documents are cited as "R37 canvas-api",
// "product 5.4 canvas-api", or in a list as "canvas-api: R37, R38". Not checked.
export const mathtrailRepositories = ["canvas-api", "standalone", "mathtrail-standalone"];

// NovaTrail's other repositories keep logs of their own, cited as "R03 api" (repositories 2.2).
// Not checked either. "R19 spec" is this repository's own.
export const novatrailRepositories = [
  ".github",
  "modules",
  "module-kit",
  "learner-model",
  "engine",
  "sim",
  "tutor",
  "api",
  "canvas",
  "skill-map",
  "app",
  "infra",
  "site",
  "module-registry",
  "module-pipeline",
  "widget-template",
];

// Words after "раздел N" that make it a section of some other text, not of our documents:
// "раздел 3 лицензии" in R12 is section 3 of the Apache License.
export const otherTexts = ["лицензии"];
