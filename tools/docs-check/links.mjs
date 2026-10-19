// Relative links lead to files that exist, and an anchor into a Markdown file to a heading in it.

import fs from "node:fs";
import path from "node:path";

// `context` holds the parsed Markdown an anchor may lead into, the checked files and more; `locate`
// turns a path relative to the root into the file on disk, which for spec/ may be elsewhere.
export function checkLinks(files, root, report, { context = files, locate = (resolved) => path.join(root, resolved) } = {}) {
  let count = 0;
  for (const [file, doc] of files) {
    for (const { url, line } of doc.links) {
      if (isExternal(url)) continue;
      count++;
      const hash = url.indexOf("#");
      const target = decode(hash < 0 ? url : url.slice(0, hash));
      const anchor = hash < 0 ? null : decode(url.slice(hash + 1));

      const resolved = target === "" ? file : resolveLink(file, target);
      if (resolved === null) {
        report(file, line, `link ${url} leads outside the repository`);
        continue;
      }
      if (target !== "" && !fs.existsSync(locate(resolved))) {
        report(file, line, `link ${url}: ${resolved} does not exist`);
        continue;
      }
      if (anchor) {
        const linked = context.get(resolved);
        if (linked && !linked.slugs.has(anchor)) {
          report(file, line, `link ${url}: ${resolved} has no heading with the anchor #${anchor}`);
        }
      }
    }
  }
  return count;
}

// A URL with a scheme, or one that starts with "//", leads outside the repository's files.
export const isExternal = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");

// The target as a path relative to the root, or null when it leaves the root.
// A leading slash is the root of the repository, as on GitHub.
export function resolveLink(file, target) {
  const from = target.startsWith("/") ? "." : path.posix.dirname(file);
  const joined = path.posix.normalize(path.posix.join(from, target.replace(/^\/+/, "")));
  if (joined === ".." || joined.startsWith("../")) return null;
  return joined.replace(/\/$/, "") || ".";
}

export function decode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
