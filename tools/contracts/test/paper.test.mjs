// The vectors of the solver of module-kit, as tools/contracts/paper.mjs checks them: the solver,
// the rules of an answer of AI and the verdict by a key, on their own; spec's own vectors, which
// pass; and copies of them with one thing broken, by the image buf builds of spec's own contracts/.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { root } from "../../release/test/repository.mjs";
import { build } from "../buf.mjs";
import { FOLDER, REASONS, RULES, breachOf, checkVectors, packageOf, parse, solve, verdictOf } from "../paper.mjs";

let image;
before(() => {
  const built = build(root);
  assert.deepEqual(built.errors, []);
  image = built.image;
});
const files = ["answers.json", "solver.json", "verdicts.json"].map((name) => `${FOLDER}/${name}`);
const number = (value, units = [], unknown = "") => ({ number: { value, units, unknown } });
const choice = (options, key) => ({ choice: { options, key } });

// A copy of spec's vectors in a folder of its own, with edit applied to the parsed file named.
function copy(name, edit) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "paper-vectors-"));
  fs.mkdirSync(path.join(folder, FOLDER), { recursive: true });
  for (const file of files) {
    let text = fs.readFileSync(path.join(root, file), "utf8");
    if (path.basename(file) === name) {
      const value = JSON.parse(text);
      edit(value);
      text = JSON.stringify(value, null, 2);
    }
    fs.writeFileSync(path.join(folder, file), text);
  }
  return folder;
}
function checked(name, edit) {
  const folder = copy(name, edit);
  try {
    return checkVectors(folder, image, files).errors.map((error) => error.message);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("spec's own vectors pass", () => {
  const { errors, cases } = checkVectors(root, image, files);
  assert.deepEqual(errors, []);
  assert.ok(cases > 50);
});

test("the solver computes exactly, in rational numbers", () => {
  assert.deepEqual(solve("0.1+0.2"), { answer: { value: "3/10", units: [], unknown: "" } });
  assert.deepEqual(solve("3*x-5=16"), { answer: { value: "7", units: [], unknown: "x" } });
  assert.deepEqual(solve(" ( 1 + 2 ) * 3 "), { answer: { value: "9", units: [], unknown: "" } });
  assert.deepEqual(solve("-(-3)"), { answer: { value: "3", units: [], unknown: "" } });
  assert.deepEqual(solve("x/2+x/3=5"), { answer: { value: "6", units: [], unknown: "x" } });
});

test("the solver names the first reason that applies", () => {
  assert.equal(solve("3.").refused, "syntax");
  assert.equal(solve("2^-1").refused, "syntax");
  assert.equal(solve("2^1.5").refused, "syntax");
  assert.equal(solve("2^010").answer.value, "1024");
  assert.equal(solve("x*y=1").refused, "two_unknowns");
  assert.equal(solve("(x+1)^2=4").refused, "not_linear");
  assert.equal(solve("(x-x)^2+x=1").answer.value, "1");
  assert.equal(solve("x/(x-x)=1").refused, "division_by_zero");
  assert.equal(solve("x/(2*x)=1").refused, "not_linear");
  // The equation brought to a·x = b is on the way too, before its roots are counted.
  assert.equal(solve("x+5*100000000000^9=x-5*100000000000^9").refused, "too_large");
  assert.equal(solve("x+4*100000000000^9=x-4*100000000000^9").refused, "no_root");
  for (const reason of REASONS) assert.ok(typeof reason === "string");
});

test("a formula of the grammar parses, and nothing else does", () => {
  assert.ok(parse("1"));
  assert.equal(parse("1 +"), null);
  assert.equal(parse("+1"), null);
  assert.equal(parse("()"), null);
  assert.equal(parse(42), null);
  assert.equal(parse("1\t+1"), null);
});

test("an answer of AI breaks one rule at most, the first", () => {
  assert.equal(breachOf(number("7")), null);
  assert.equal(breachOf({}), "no_kind");
  assert.equal(breachOf(number("07")), "value");
  assert.equal(breachOf(number("1/0")), "value");
  assert.equal(breachOf(number("1 / 2")), null);
  assert.equal(breachOf(number("-0.125")), null);
  assert.equal(breachOf(number("12345678901234567")), "value");
  assert.equal(breachOf(choice(["A", " "], "A")), "options_same");
  for (const rule of RULES) assert.ok(typeof rule === "string");
});

test("a value read is brought to the key", () => {
  assert.deepEqual(verdictOf(number("4", [], "x"), "x=4").verdict, { verdict: "correct" });
  assert.deepEqual(verdictOf(number("4", [], "x"), "ｘ ＝ 4").verdict, { verdict: "correct" });
  assert.equal(verdictOf(number("4", [], "x"), "4").brought, null);
  assert.deepEqual(verdictOf(choice(["A", "B"], "B"), "( b )").verdict, { verdict: "correct" });
  assert.deepEqual(verdictOf(choice(["A", "B"], "B"), "(B").verdict, { verdict: "unreadable", reason: "notation" });
});

test("a vector that the implementation does not give is an error", () => {
  const solver = checked("solver.json", (value) => {
    value.cases[0].answer.value = "86";
  });
  assert.ok(solver.some((message) => message.includes("the solver gives")));
  const refused = checked("solver.json", (value) => {
    value.cases.at(-1).refused = "syntax";
  });
  assert.ok(refused.some((message) => message.includes("the vector refuses it syntax")));
  const answer = checked("answers.json", (value) => {
    value.cases[0].key = false;
  });
  assert.ok(answer.some((message) => message.includes("holds every rule")));
  const verdict = checked("verdicts.json", (value) => {
    value.cases[0].verdict = { verdict: "not_yet" };
  });
  assert.ok(verdict.some((message) => message.includes("the key gives")));
});

test("a vector written otherwise than its message, or of another form, is an error", () => {
  const unwritten = checked("answers.json", (value) => {
    delete value.cases[0].answer.number.units;
  });
  assert.ok(unwritten.some((message) => message.includes("with every field")));
  const unknown = checked("answers.json", (value) => {
    value.cases[0].answer.number.size = 1;
  });
  assert.ok(unknown.some((message) => message.includes("is no novatrail.paper.v1.Answer")));
  const form = checked("verdicts.json", (value) => {
    delete value.cases[0].value;
  });
  assert.ok(form.some((message) => message.includes("a case of a verdict has")));
  const key = checked("verdicts.json", (value) => {
    value.cases[0].key = {};
  });
  assert.ok(key.some((message) => message.includes("no key does")));
  const empty = checked("solver.json", (value) => {
    value.cases = [];
  });
  assert.ok(empty.some((message) => message.includes("a case or more")));
});

test("the vectors hold every rule of the solver of module-kit", () => {
  const reasons = checked("solver.json", (value) => {
    value.cases = value.cases.filter((one) => one.refused !== "every_root");
  });
  assert.ok(reasons.some((message) => message.includes("refuses a formula every_root")));
  const rules = checked("answers.json", (value) => {
    value.cases = value.cases.filter((one) => !one.description.startsWith("Two units"));
  });
  assert.ok(rules.some((message) => message.includes("the rule units_same")));
  const brought = checked("verdicts.json", (value) => {
    value.cases = value.cases.filter((one) => !one.value?.includes("=") || one.verdict.verdict === "unreadable");
  });
  assert.ok(brought.some((message) => message.includes("by its unknown")));
});

test("a file the section does not name, or one it names missing, is an error", () => {
  const folder = copy("solver.json", () => {});
  try {
    fs.rmSync(path.join(folder, FOLDER, "answers.json"));
    const extra = `${FOLDER}/more.json`;
    fs.writeFileSync(path.join(folder, extra), "{}");
    const { errors } = checkVectors(folder, image, [...files.filter((file) => !file.endsWith("answers.json")), extra]);
    assert.ok(errors.some((error) => error.file.endsWith("answers.json") && error.message.includes("missing")));
    assert.ok(errors.some((error) => error.file === extra));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("an image without the package checks nothing", () => {
  assert.ok(packageOf({ file: [] }).error);
  assert.equal(checkVectors(root, { file: [] }, files).errors.length, 1);
});
