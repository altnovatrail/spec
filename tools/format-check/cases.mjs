// The examples and test vectors of the module format, and the rules its text lists (format/README.md,
// sections 7–9; R45 and its amendment of 2026-10-22).

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { isKebabCase } from "./schemas.mjs";
import { YAML_RULES, readModuleFile } from "./yaml.mjs";

// What an invalid example never names: the keyword that failed inside them is named instead
// (format/README.md, section 8).
const NEVER_NAMED = new Set(["$ref", "allOf", "properties", "items", "if", "then", "else"]);
const HEADER = "# error: ";

// The rules the text lists: the rows of each table whose first column is headed ID, each a rule's
// ID, <part>.<name>, and its statement (section 7). Other tables are no lists of rules, whatever
// their first cells look like. { rules: [{ id, line }], problems: [{ line, message }] }.
export function readRules(readme) {
  const rules = [];
  const problems = [];
  const lines = new Map();
  const visit = (node) => {
    if (node.type !== "table") {
      for (const child of node.children ?? []) visit(child);
      return;
    }
    const [header, ...rows] = node.children;
    if (cellText(header.children[0]) !== "ID") return;
    for (const row of rows) {
      const id = cellText(row.children[0]);
      const line = row.position.start.line;
      if (!isRuleId(id)) problems.push({ line, message: `${JSON.stringify(id)}: a rule's ID is <part>.<name>, each in kebab-case` });
      else if (lines.has(id)) problems.push({ line, message: `the rule ${id} again, after line ${lines.get(id)}` });
      else {
        lines.set(id, line);
        rules.push({ id, line });
      }
    }
  };
  visit(fromMarkdown(readme, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }));
  return { rules, problems };
}

function cellText(node) {
  if (!node) return "";
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(cellText).join("").trim();
}

// <part>.<name>, each in kebab-case: skill-graph.acyclic, yaml.no-tags.
export function isRuleId(text) {
  const parts = text.split(".");
  return parts.length === 2 && parts.every(isKebabCase);
}

// The YAML rules the text lists against those this check knows: each side has every rule of the
// other. Problems at the rules' lines in README.md, or at none.
export function compareYamlRules(rules) {
  const problems = [];
  const listed = new Set(rules.filter((rule) => rule.id.startsWith("yaml.")).map((rule) => rule.id));
  for (const rule of rules) {
    if (rule.id.startsWith("yaml.") && !YAML_RULES.includes(rule.id)) problems.push({ line: rule.line, message: `format-check does not check ${rule.id}: tools/format-check/yaml.mjs has to` });
  }
  for (const id of YAML_RULES) if (!listed.has(id)) problems.push({ line: 0, message: `format-check checks ${id}, and section 4 does not list it` });
  return problems;
}

// An example: a valid one passes its schema, an invalid one gives the error its first line names,
// and both follow the YAML rules. validate is its term's validator, or undefined when there is none.
// Returns problems, each { line, message }.
export function checkExample(bytes, kind, validate) {
  const { value, violations, notYaml } = readModuleFile(bytes);
  const problems = yamlProblems(violations, notYaml);
  const text = new TextDecoder().decode(bytes);
  const header = expectedError(text);
  if (kind === "valid" && header) problems.push({ line: 1, message: "a valid example names no error" });
  if (kind === "invalid" && !header) problems.push({ line: 1, message: `an invalid example's first line is ${HEADER}<keyword> at <location>` });
  if (kind === "invalid" && header?.problem) problems.push({ line: 1, message: header.problem });
  if (problems.length || !validate) return problems;

  const valid = validate(value);
  const errors = valid ? [] : validate.errors;
  if (kind === "valid") {
    for (const error of errors) problems.push({ line: 0, message: `does not pass its schema: ${describe(error)}` });
    return problems;
  }
  if (valid) problems.push({ line: 1, message: `passes its schema, and names ${header.keyword} at ${header.location}` });
  else if (!errors.some((error) => error.keyword === header.keyword && error.instancePath === header.pointer)) {
    problems.push({ line: 1, message: `gives no ${header.keyword} at ${header.location}; it gives ${errors.map(describe).join("; ")}` });
  }
  return problems;
}

// A case of a rule's test vectors. A case of a YAML rule breaks that rule and no other; a case of a
// part's rule follows the YAML rules and passes the part's schema, so that only the rule refuses it
// (section 9). validate is the part's validator, or undefined.
export function checkVector(bytes, rule, validate) {
  const { value, violations, notYaml } = readModuleFile(bytes);
  if (rule.startsWith("yaml.")) {
    const problems = notYaml.map(({ line, message }) => ({ line, message: `not YAML: ${message}` }));
    for (const { rule: broken, line, message } of violations) {
      if (broken !== rule) problems.push({ line, message: `breaks ${broken} too: ${message}` });
    }
    if (!notYaml.length && !violations.some((violation) => violation.rule === rule)) problems.push({ line: 0, message: `breaks no ${rule}` });
    return problems;
  }
  const problems = yamlProblems(violations, notYaml);
  if (problems.length || !validate) return problems;
  if (!validate(value)) for (const error of validate.errors) problems.push({ line: 0, message: `does not pass the schema of its part: ${describe(error)}` });
  return problems;
}

function yamlProblems(violations, notYaml) {
  return [
    ...notYaml.map(({ line, message }) => ({ line, message: `not YAML: ${message}` })),
    ...violations.map(({ rule, line, message }) => ({ line, message: `${rule}: ${message}` })),
  ];
}

// The error an invalid example names on its first line: { keyword, location, pointer }, or
// { problem } when the line is not of that form, or null when the file names none.
export function expectedError(text) {
  const first = text.split("\n", 1)[0];
  if (!first.startsWith(HEADER)) return null;
  const words = first.slice(HEADER.length).split(" ");
  const [keyword, at, location] = words;
  if (words.length !== 3 || at !== "at" || keyword === "" || !location.startsWith("#")) {
    return { problem: `the first line reads ${HEADER}<keyword> at <location>, such as "${HEADER}type at #/difficulty"` };
  }
  if (NEVER_NAMED.has(keyword)) return { problem: `${keyword} is never named: name the keyword that failed inside it` };
  let pointer;
  try {
    pointer = decodeURIComponent(location.slice(1));
  } catch {
    return { problem: `${location} is no JSON Pointer in a URI fragment` };
  }
  if (pointer !== "" && !pointer.startsWith("/")) return { problem: `${location} is no JSON Pointer in a URI fragment` };
  return { keyword, location, pointer };
}

function describe(error) {
  return `${error.keyword} at #${encodeURI(error.instancePath)}: ${error.message}`;
}
