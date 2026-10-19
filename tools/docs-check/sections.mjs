// Citations of sections — "product 7", "architecture 3.5, 4", "раздел 9.4", "section 15" —
// lead to sections that exist. "architecture 3.8 spec" is a section of spec's architecture; in a
// repository of its own, bare "architecture 2" is the repository's.
//
// Which document "раздел N" means:
// - the one linked right before it: "[privacy.md](privacy.md), раздел 10", "… (раздел 10)".
//   A link outside the repository there makes it a section of another text, not checked; a link
//   to a file that is not Markdown, or to an anchor, leaves it to the rules below;
// - else, in a list item under one whose last link leads outside the repository, a section of
//   that text: "- standalone, [SPEC.md](https://…)" over "  - раздел 2.8 — …";
// - else the document it stands in, when that document has numbered sections;
// - else the last document linked earlier in the same block, as in CLAUDE.md's list of documents;
// - else, in a repository of its own, its docs/architecture.md: the one document it has with
//   numbered sections, which its RUN.md speaks of as "раздел 3".

import { findSections } from "./citations.mjs";
import { decode, isExternal, resolveLink } from "./links.mjs";

// `files` are the documents checked; `context` holds them and whatever they may cite, spec's
// documents among them in a repository of its own.
export function checkSections(files, context, profile, report) {
  const specDocuments = profile.spec?.documents ?? profile.documents;
  let count = 0;
  for (const [file, doc] of files) {
    for (const block of doc.blocks) {
      for (const citation of findSections(block)) {
        const line = block.lineAt(citation.start);
        const quoted = block.text.slice(citation.start).split(/[;)]/)[0].trim();
        let target;
        if (citation.kind === "document") {
          target = (citation.scope === "spec" ? specDocuments : profile.documents)[citation.name];
          if (!target && specDocuments[citation.name]) {
            report(file, line, `"${quoted}": ${citation.name} is spec's document; cite it as "${citation.name} ${citation.sections[0]} spec"`);
            continue;
          }
        } else {
          target = targetOf(context, file, block, citation.start, profile.sectionsDocument);
          if (target === ELSEWHERE) continue;
          // "раздел 9 spec" is a section of spec's: of the spec document linked right before it.
          if (profile.spec && citation.scope === "spec" && !target?.startsWith("spec/")) {
            report(file, line, `"${quoted}": a section of spec's document; cite it by name — "architecture 3.8 spec" — or link the document right before it`);
            continue;
          }
        }
        if (!target) {
          report(file, line, `"${quoted}": cannot tell which document this section is in; link the document right before it`);
          continue;
        }
        const linked = context.get(target);
        if (!linked) {
          report(file, line, `"${quoted}": ${target} does not exist`);
          continue;
        }
        for (const section of citation.sections) {
          count++;
          if (!linked.sections.has(section)) report(file, line, `${target} has no section ${section}`);
        }
      }
    }
  }
  return count;
}

// A section of a text outside the repository: "[SPEC.md](https://…), раздел 6".
const ELSEWHERE = Symbol("elsewhere");

function targetOf(files, file, block, start, fallback) {
  const before = block.links.filter((l) => l.end <= start).map((l) => ({ ...l, target: markdownTarget(file, l.url) }));
  const nearest = before.at(-1);
  if (nearest && /^[\s,:;(—–-]*$/u.test(block.text.slice(nearest.end, start))) {
    if (isExternal(nearest.url)) return ELSEWHERE;
    if (nearest.target) return nearest.target;
  }
  const above = block.outer?.at(-1);
  if (before.length === 0 && above && isExternal(above.url)) return ELSEWHERE;
  if (files.get(file)?.sections.size) return file;
  const linked = before.filter((l) => l.target).findLast((l) => files.get(l.target)?.sections.size)?.target;
  return linked ?? fallback ?? null;
}

function markdownTarget(file, url) {
  if (isExternal(url)) return null;
  const target = decode(url.split("#")[0]);
  if (!target.endsWith(".md")) return null;
  return resolveLink(file, target);
}
