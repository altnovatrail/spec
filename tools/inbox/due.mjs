// What inbox reminds a session of spec of: the monthly measurement of the
// transcripts of every repository of this machine, and the quarterly check of Claude Code's
// changelog. Their dates are lines of docs/measurements.md, which each measurement and each check
// move on; inbox prints the one whose date has come.

export const DATES = [
  { phrase: "Next measurement: by", what: "the monthly measurement of the sessions' tokens" },
  { phrase: "Next check of Claude Code's changelog: by", what: "the quarterly check of Claude Code's changelog" },
];

// { due: [line], problems: [line] } for the text of docs/measurements.md on the day `today`, a Date.
// A date comes when its day begins, in UTC.
export function dueOf(source, today) {
  const day = today.toISOString().slice(0, 10);
  const due = [];
  const problems = [];
  for (const { phrase, what } of DATES) {
    const found = [...source.matchAll(new RegExp(`${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d{4}-\\d{2}-\\d{2})\\.`, "g"))];
    if (found.length !== 1) {
      problems.push(`inbox: the section Keeping the savings of docs/measurements.md should name "${phrase} YYYY-MM-DD." once, and names it ${found.length} times`);
      continue;
    }
    const date = found[0][1];
    const real = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== date) {
      problems.push(`inbox: the section Keeping the savings of docs/measurements.md names "${phrase} ${date}.", and ${date} is no date`);
      continue;
    }
    if (date <= day) due.push(`due: ${what}, by ${date}`);
  }
  return { due, problems };
}
