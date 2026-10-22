// What docs-check knows about the documents. When a document, a register or a repository
// is added or renamed, this is the file to change.
//
// Two profiles read them: spec's own, and a NovaTrail repository's, which has documents and
// registers of its own and cites spec's from its spec/ submodule (RUN.md, T18; R32).

// Documents cited by name and section: "product 7", "architecture 3.6".
export const documents = {
  product: "docs/product.md",
  concepts: "docs/concepts.md",
  privacy: "docs/privacy.md",
  architecture: "docs/architecture.md",
  repositories: "docs/repositories.md",
};

// The numbered registers. `section` is the numbered section that holds the register, or null
// for the preamble before the first section; `heading` instead names a heading by how its text
// begins. The register's opening names the next free number in the text directly under that
// heading. A register with `gaps` keeps the numbers of rows that left it: no number is reused,
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
  ...workRegisters("RUN.md"),
];

// Tables 3 and 4 of a RUN.md: the questions to the author and the debt (R19). Rows leave when
// they are answered or closed, and their numbers are not reused.
function workRegisters(file) {
  const table = (prefix, heading) => ({ prefix, file, heading, definedBy: "table", width: 1, ordered: false, gaps: true, empty: true });
  return [table("В", "Таблица 3."), table("Д", "Таблица 4.")];
}

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
  excluded: { names: [".git", "node_modules"], paths: ["tools/docs-check/test/fixtures", "tools/format-check/test/fixtures", ".repos"] },
};

// A NovaTrail repository's profile. Its own: docs/architecture.md, cited as "architecture 2"; its
// decision log, which may still be empty; tables 3 and 4 of its RUN.md. spec's documents and the
// registers R, О-, П-, Т- are read from specDir — the spec/ submodule, or for a draft spec's
// working tree — and cited "architecture 3.8 spec", "R18 spec", "Т-15". What is wrong in spec's
// own files is spec's to report, not the repository's.
export function componentProfile(specDir) {
  const inSpec = (file) => `spec/${file}`;
  return {
    documents: { architecture: "docs/architecture.md" },
    // "раздел 3" in a document with no numbered sections of its own, and no link to tell.
    sectionsDocument: "docs/architecture.md",
    registers: [
      { prefix: "R", file: "docs/decisions.md", section: null, definedBy: "entry", width: 2, ordered: true, empty: true },
      ...workRegisters("RUN.md"),
    ],
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
