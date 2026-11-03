// The answer of the admission function by the table (admission/README.md, section 6): what spec's
// check computes for each vector of answers, as tutor's admission function computes it in Go
// (R57 tutor). The steps, in order, to the first refusal:
//
//   1. the rule of the capability for the age category: closed or missing, capability_closed;
//   2. the cell of the provider, the AI route and the age category: closed or missing,
//      cell_closed; open, admitted;
//   3. open with facts: the first fact of the cell, in its order, that is not declared for the
//      provider and the age category, fact_missing; none missing, admitted.
//
// The check of the model comes after these, and is tutor's: its list of admitted models is no
// part of the table (R07). The table is one that breaks no rule, and the request and the facts
// are valid against the schema of the vectors.

// The answer to request, { capability, ai_route, provider, age_category }, by table, with facts,
// the deployment facts declared: provider → fact → the age categories it holds for.
export function answerOf(table, request, facts = {}) {
  const { capability, ai_route, provider, age_category } = request;
  const rule = table.capabilities.find((r) => r.capability === capability && r.age_category === age_category);
  if (!rule) return { admitted: false, reason: "capability_closed" };
  if (rule.admission !== "open") return { admitted: false, reason: "capability_closed", capability_rule: { capability, age_category } };
  const cell = table.cells.find((c) => c.provider === provider && c.ai_route === ai_route && c.age_category === age_category);
  if (!cell) return { admitted: false, reason: "cell_closed" };
  const key = { provider, ai_route, age_category };
  if (cell.admission === "closed") return { admitted: false, reason: "cell_closed", cell: key };
  if (cell.admission === "open_with_facts") {
    const declared = Object.hasOwn(facts, provider) ? facts[provider] : {};
    for (const fact of cell.facts) {
      const categories = Object.hasOwn(declared, fact) ? declared[fact] : [];
      if (!categories.includes(age_category)) return { admitted: false, reason: "fact_missing", cell: key, fact };
    }
  }
  return { admitted: true, cell: key };
}
