// The rules of a table that its schema cannot say (admission/README.md, section 7). A table that
// passes the schema and breaks one of them a reader refuses, naming the rule's ID.

export const RULES = [
  "admission-table.unique-cells",
  "admission-table.unique-capabilities",
  "admission-table.known-providers",
  "admission-table.known-facts",
];

// What a table that passes its schema breaks: [{ rule, at, message }], at the path of keys and
// indexes of the value that breaks it.
export function tableBreaches(table) {
  const breaches = [];
  const cells = new Map();
  table.cells.forEach((cell, index) => {
    const key = `${cell.provider} ${cell.ai_route} ${cell.age_category}`;
    if (cells.has(key)) {
      breaches.push({ rule: "admission-table.unique-cells", at: ["cells", index], message: `a second cell of ${cell.provider}, ${cell.ai_route} and ${cell.age_category}, after cells/${cells.get(key)}` });
    } else cells.set(key, index);
    if (!Object.hasOwn(table.providers, cell.provider)) {
      breaches.push({ rule: "admission-table.known-providers", at: ["cells", index, "provider"], message: `${cell.provider}: no provider of providers` });
    }
    (cell.facts ?? []).forEach((fact, at) => {
      if (!Object.hasOwn(table.facts, fact)) breaches.push({ rule: "admission-table.known-facts", at: ["cells", index, "facts", at], message: `${fact}: no fact of the dictionary, facts` });
    });
  });
  const rules = new Map();
  table.capabilities.forEach((rule, index) => {
    const key = `${rule.capability} ${rule.age_category}`;
    if (rules.has(key)) {
      breaches.push({ rule: "admission-table.unique-capabilities", at: ["capabilities", index], message: `a second rule of ${rule.capability} and ${rule.age_category}, after capabilities/${rules.get(key)}` });
    } else rules.set(key, index);
  });
  return breaches;
}
