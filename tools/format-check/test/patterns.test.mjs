// patternProblem on patterns within the subset and outside it. Each refused pattern is one that Go
// and JavaScript read differently, or that one of them refuses.

import { test } from "node:test";
import assert from "node:assert/strict";
import { patternProblem } from "../patterns.mjs";

test("the tokens of 2020-12 pass", () => {
  for (const pattern of [
    "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
    "^[A-Z]{2}$",
    "^[^/]+$",
    "a|b|",
    "(|a)",
    "a+?b*?c??d{2}?e{1,3}?f{2,}?",
    "\\^\\$\\\\\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|",
    "[\\]\\[\\\\^$.*+?(){}|]",
    "[-a]",
    "[a-]",
    "[^-a-z]",
    "😀{2}[😀-😂]",
    "a{1000}",
    "(a{10}){100}",
    "a{1000,}",
    "a{0}",
    "/ -,:=!<>#",
  ]) {
    assert.equal(patternProblem(pattern), null, pattern);
    assert.doesNotThrow(() => new RegExp(pattern, "u"), pattern);
  }
});

test("what is no token of 2020-12 is refused", () => {
  const refused = {
    "\\d": /the escape \\d is no token/,
    "\\w+": /the escape \\w is no token/,
    "\\-": /the escape \\- is no token/,
    "\\/": /the escape \\\/ is no token/,
    ".": /a \. that is no letter/,
    "(?:a)": /a group that begins with \?/,
    "(?<n>a)": /a group that begins with \?/,
    "a\\": /a \\ at the end/,
  };
  for (const [pattern, problem] of Object.entries(refused)) assert.match(patternProblem(pattern), problem, pattern);
});

test("what Go and JavaScript read differently is refused", () => {
  const refused = {
    "[]a]": /an empty class/,
    "[^]": /an empty class/,
    "[[]": /a \[ in a class is written \\\[/,
    "[a-z-0]": /a - in a class stands first, last or between the ends of a range/,
    "[--a]": /a - in a class stands first, last/,
    "a{01}": /leading zero/,
    "a{1,02}": /leading zero/,
    "a{": /a \{ that is no quantifier/,
    "a{,5}": /a \{ that is no quantifier/,
    "a{x}": /a \{ that is no quantifier/,
    "a}": /a \} outside a quantifier or a class/,
    "]": /a \] outside a quantifier or a class/,
    "{": /a \{ outside a quantifier or a class/,
  };
  for (const [pattern, problem] of Object.entries(refused)) assert.match(patternProblem(pattern), problem, pattern);
});

test("what one of them refuses is refused", () => {
  const refused = {
    "a{1001}": /the count 1001, above 1000/,
    "a{1,1001}": /the count 1001/,
    "a{1001,}": /the count 1001/,
    "(a{10}){101}": /make 1010, above 1000/,
    "(a{2}|b{3}){400}": /make 1200/,
    "((a{2}){5}){101}": /make 1010/,
    "a{2,1}": /counts downwards/,
    "[z-a]": /runs downwards/,
    "a**": /a second quantifier/,
    "a{2}{3}": /a second quantifier/,
    "a+??": /a second quantifier/,
    "*a": /nothing to repeat before \*/,
    "^*": /nothing to repeat before \*/,
    "a|+": /nothing to repeat before \+/,
    "(a": /a \( with no \) after it/,
    "a)": /a \) with no \( before it/,
    "[a": /a \[ with no \] after it/,
  };
  for (const [pattern, problem] of Object.entries(refused)) assert.match(patternProblem(pattern), problem, pattern);
});

test("a problem says where it is, by code point", () => {
  assert.match(patternProblem("😀\\d"), /at character 3$/);
});

test("review: {0,} counts as 1, as Go counts it, and {0} lets anything inside pass", () => {
  assert.match(patternProblem("((a{2}){0,}){600}"), /make 1200/);
  assert.equal(patternProblem("((a{2}){0,}){500}"), null);
  assert.equal(patternProblem("(((a{10}){100}){0}){5}"), null);
  assert.equal(patternProblem("(((a{10}){100}){0,0}){5}"), null);
});
