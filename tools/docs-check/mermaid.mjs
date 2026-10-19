// Every Mermaid diagram parses. Mermaid needs a DOM even to parse, so it runs in a jsdom window.
// The version is the one in tools/package.json. The Markdown preview in the devcontainer bundles
// its own Mermaid, an older major version, so a diagram can parse here and still fail there.

import { JSDOM } from "jsdom";

let mermaid = null;

async function load() {
  if (mermaid) return mermaid;
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  globalThis.window = window;
  globalThis.document = window.document;
  mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false });
  return mermaid;
}

export async function checkDiagrams(files, report) {
  let count = 0;
  for (const [file, doc] of files) {
    for (const { value, line } of doc.diagrams) {
      count++;
      try {
        await (await load()).parse(value);
      } catch (error) {
        const message = String(error?.message ?? error).replace(/\s+/g, " ").trim();
        // The parser counts lines from the diagram's first line, which is the one after the fence.
        const inside = Number(/on line (\d+)/.exec(message)?.[1] ?? 0);
        report(file, line + inside, `the Mermaid diagram does not parse: ${message}`);
      }
    }
  }
  return count;
}
