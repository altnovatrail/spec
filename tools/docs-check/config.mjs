// What docs-check knows about the documents. When a document, a register or a repository
// is added or renamed, this is the file to change.

// Documents cited by name and section: "product 7", "architecture 3.6".
export const documents = {
  product: "docs/product.md",
  concepts: "docs/concepts.md",
  privacy: "docs/privacy.md",
  architecture: "docs/architecture.md",
  repositories: "docs/repositories.md",
};

// The numbered registers. `section` is the numbered section that holds the register, or null
// for the preamble before the first section. The register's opening names the next free number
// in the text directly under that heading.
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
];

// MathTrail's repositories: their decisions and documents are cited as "R37 canvas-api",
// "product 5.4 canvas-api", or in a list as "canvas-api: R37, R38". Not checked.
export const mathtrailRepositories = ["canvas-api", "standalone"];

// NovaTrail's other repositories keep logs of their own, cited as "R3 api" (repositories 2.2).
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

// Paths, relative to the root, that are never scanned. The fixtures break the rules on purpose.
export const excluded = [".git", "node_modules", "tools/node_modules", "tools/docs-check/test/fixtures"];
