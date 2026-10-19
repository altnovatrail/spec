// Citations of sections — "product 7", "architecture 3.5, 4", "раздел 9.4", "section 15" —
// lead to sections that exist.
//
// Which document "раздел N" means:
// - the one linked right before it: "[privacy.md](privacy.md), раздел 10", "… (раздел 10)";
// - else the document it stands in, when that document has numbered sections;
// - else the last document linked earlier in the same block, as in CLAUDE.md's list of documents.

import { documents } from "./config.mjs";
import { findSections } from "./citations.mjs";
import { decode, isExternal, resolveLink } from "./links.mjs";

export function checkSections(files, report) {
  let count = 0;
  for (const [file, doc] of files) {
    for (const block of doc.blocks) {
      for (const citation of findSections(block)) {
        const line = block.lineAt(citation.start);
        const target = citation.kind === "document" ? documents[citation.name] : targetOf(files, file, block, citation.start);
        const quoted = block.text.slice(citation.start).split(/[;)]/)[0].trim();
        if (!target) {
          report(file, line, `"${quoted}": cannot tell which document this section is in; link the document right before it`);
          continue;
        }
        const linked = files.get(target);
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

function targetOf(files, file, block, start) {
  const links = block.links
    .filter((l) => l.end <= start)
    .map((l) => ({ ...l, target: markdownTarget(file, l.url) }))
    .filter((l) => l.target);
  const last = links.at(-1);
  if (last && /^[\s,:;(—–-]*$/u.test(block.text.slice(last.end, start))) return last.target;
  if (files.get(file)?.sections.size) return file;
  return links.findLast((l) => files.get(l.target)?.sections.size)?.target ?? null;
}

function markdownTarget(file, url) {
  if (isExternal(url)) return null;
  const target = decode(url.split("#")[0]);
  if (!target.endsWith(".md")) return null;
  return resolveLink(file, target);
}
