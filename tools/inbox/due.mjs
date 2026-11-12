// What the savings of epic E10 ask of a session of spec before its task (R145): the monthly
// measurement of the transcripts of every repository of this machine, and the quarterly check of
// Claude Code's changelog. Their dates are lines of measurements 1.9, which each measurement and
// each check move on; inbox prints the one whose date has come.

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
      problems.push(`inbox: measurements 1.9 should name "${phrase} YYYY-MM-DD." once, and names it ${found.length} times`);
      continue;
    }
    const date = found[0][1];
    const real = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== date) {
      problems.push(`inbox: measurements 1.9 names "${phrase} ${date}.", and ${date} is no date`);
      continue;
    }
    if (date <= day) due.push(`due: ${what}, by ${date} (measurements 1.9; RUN.md, rule 13)`);
  }
  return { due, problems };
}
