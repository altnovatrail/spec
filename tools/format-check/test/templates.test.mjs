// The templates of tasks (sections 23 and 24 of the format text), as templates.mjs counts their
// instances, picks the instance of a seed and replaces their placeholders, and knows where the
// results of a solver stand and what it gets. The pick rests on random.mjs, which
// its own tests hold to Go's golden outputs; what is pinned here is the order of the combinations,
// the names of the place and the substitution, which the vectors of templates then show.

import { test } from "node:test";
import assert from "node:assert/strict";
import { below, stateOf, streamOf } from "../random.mjs";
import { MAX_COMBINATIONS, holdsPlaceholder, instanceMaker, instanceOf, instanceShown, numbersShown, pickOf, piecesOf, resultsOf, solverInputsOf, templateOf, withoutResults } from "../templates.mjs";

const template = (parameters, extra = {}) => ({ id: "trial", template: { parameters, ...extra.template }, statement: [{ text: extra.text ?? "A trial." }], items: extra.items ?? [] });
const domain = (from, to) => ({ from, to });
const plain = (numbers) => Object.fromEntries([...numbers].map(([name, number]) => [name, Number(number)]));

test("the combinations come in the order of an odometer: names by code units, the first slowest", () => {
  const { breaches, instances } = templateOf(template({ b: domain(0, 1), a_1: domain(0, 1), a1: domain(5, 6), ab: domain(-1, -1) }));
  assert.equal(breaches.size, 0);
  assert.deepEqual(instances.map(plain).slice(0, 3), [
    { a1: 5, a_1: 0, ab: -1, b: 0 },
    { a1: 5, a_1: 0, ab: -1, b: 1 },
    { a1: 5, a_1: 1, ab: -1, b: 0 },
  ]);
  assert.equal(instances.length, 8);
  assert.deepEqual(plain(instances[7]), { a1: 6, a_1: 1, ab: -1, b: 1 });
});

test("the derived numbers come on every combination, then the constraint picks the instances", () => {
  const { instances } = templateOf(template({ chickens: domain(1, 9), rabbits: domain(1, 9) }, { template: { derived: { heads: "chickens + rabbits", legs: "2 * chickens + 4 * rabbits" }, constraint: "chickens != rabbits" } }));
  assert.equal(instances.length, 72);
  assert.deepEqual(plain(instances[0]), { chickens: 1, rabbits: 2, heads: 3, legs: 10 });
  assert.equal(templateOf(template({ a: domain(1, 3) })).instances.length, 3, "without a constraint, every combination");
});

test("a template counts its instances only within its limits, and names what breaks them", () => {
  const breachOf = (task) => Object.fromEntries(templateOf(task).breaches);
  assert.equal(templateOf(template({ a: domain(1, 100), b: domain(1, 100) })).instances.length, Number(MAX_COMBINATIONS), "10 000 combinations, the limit itself");
  assert.match(breachOf(template({ a: domain(1, 100), b: domain(0, 100) }))["task.template-instances"], /10100 combinations, more than 10000/);
  assert.match(breachOf(template({ a: domain(1, 2 ** 52) }))["task.template-instances"], /more than 10000/, "counted before any combination is");
  assert.match(breachOf(template({ a: domain(3, 2) }))["task.template-instances"], /a domain is empty: its to is below its from/);
  assert.match(breachOf(template({ a: domain(1, 2), b: domain(3, 2) }, { template: { constraint: "a > 0" } }))["task.template-instances"], /a domain is empty/, "not the constraint, when no combination is there to meet it");
  assert.match(breachOf(template({ a: domain(1, 3) }, { template: { constraint: "a > 3" } }))["task.template-instances"], /no combination/);
  assert.match(breachOf(template({ a: domain(0, 3) }, { template: { derived: { q: "12 // a" } } }))["task.template-instances"], /on a = 0: it divides by zero/);
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { derived: { big: "9007199254740991 + a" } } }))["task.template-instances"], /big is 9007199254740992, past/);
  assert.equal(templateOf(template({ a: domain(1, 1) }, { template: { derived: { big: "9007199254740990 + a" } } })).breaches.size, 0, "2^53 − 1 itself");
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { derived: { a: "1" } } }))["task.template-names"], /a is both a parameter and a derived number/);
  assert.equal(templateOf(template({ a: domain(1, 2) }, { template: { derived: { constructor: "a + 1", tostring: "a" } } })).breaches.size, 0, "a name is compared with the parameters' own, not with an object's");
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { derived: { b: "a + c" } } }))["task.template-expressions"], /the derived number b: c is no name/);
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { derived: { b: "a", c: "b + 1" } } }))["task.template-expressions"], /c: b is no name/, "a derived number names parameters only");
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { constraint: "a + 1" } }))["task.template-expressions"], /the constraint is an int expression, and it has to be a bool one/);
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { derived: { b: "a < 2" } } }))["task.template-expressions"], /b is a bool expression/);
  assert.match(breachOf(template({ a: domain(1, 2) }, { template: { constraint: "0 < a < 9" } }))["task.template-expressions"], /comparisons do not chain/);
});

test("placeholders name parameters and derived numbers, and a brace of the text is written twice", () => {
  assert.deepEqual(piecesOf("{first} × {second} = {{x}}").pieces, [{ name: "first" }, " × ", { name: "second" }, " = {x}"]);
  assert.deepEqual(piecesOf("{a}{b}").pieces, [{ name: "a" }, { name: "b" }]);
  assert.deepEqual(piecesOf("}}{{").pieces, ["}{"]);
  for (const text of ["{ a}", "{A}", "{1a}", "{}", "{a", "a}", "{{a}"]) assert.ok(piecesOf(text).problem, text);
  const breachOf = (text) => templateOf(template({ a: domain(1, 2) }, { text })).breaches.get("task.placeholders");
  assert.equal(breachOf("{a} and {{b}}"), undefined);
  assert.match(breachOf("{b} apples"), /#\/statement\/0\/text: \{b\} names no parameter/);
  assert.match(breachOf("a {set"), /opens no placeholder/);
  for (const text of ["{second}", "{a_1}", "{part}/{whole}", "3/{b}"]) assert.ok(holdsPlaceholder(text), text);
  for (const text of ["7", "3/4", "-2.5", undefined]) assert.equal(holdsPlaceholder(text), false, String(text));
});

test("an instance is the template with its numbers in place, in one pass, and without its template", () => {
  const task = {
    id: "trial",
    template: { parameters: { a: domain(-3, -3), b: domain(4, 4) }, derived: { sum: "a + b" } },
    statement: [{ text: "{a} + {b} = ? {{a}}" }, { picture: "p.png", alt: "{b} dots", width: 10, height: 10 }],
    items: [{ answer_slots: [{ binding: "choice", options: ["{sum}", "{b}"], check: { kind: "choice", key: "{sum}" } }] }],
    band: "trial",
  };
  const [numbers] = templateOf(task).instances;
  assert.deepEqual(instanceOf(task, numbers), {
    id: "trial",
    statement: [{ text: "-3 + 4 = ? {a}" }, { picture: "p.png", alt: "4 dots", width: 10, height: 10 }],
    items: [{ answer_slots: [{ binding: "choice", options: ["1", "4"], check: { kind: "choice", key: "1" } }] }],
    band: "trial",
  });
  assert.equal(instanceShown(task, numbers), "a = -3, b = 4", "an instance is shown by its parameters");
  assert.equal(numbersShown(numbers), "a = -3, b = 4, sum = 1", "and its numbers, all of them");
  const fraction = { id: "part", template: { parameters: { part: domain(1, 1), whole: domain(4, 4) } }, items: [{ line: [{ binding: "box", check: { kind: "fraction", key: "{part}/{whole}" } }] }] };
  assert.equal(instanceOf(fraction, templateOf(fraction).instances[0]).items[0].line[0].check.key, "1/4", "a fraction's numerator and denominator");
});

test("the seed picks below(count) of the place of the attempt's seed named template, the task's ID and instance", () => {
  for (const [seed, count] of [[0n, 72], [2n ** 64n - 1n, 72], [20261027n, 64], [7n, 1]]) {
    const { high, low } = stateOf(seed, ["template", "heads-and-legs-2", "instance"]);
    assert.equal(pickOf(seed, "heads-and-legs-2", count), Number(below(streamOf(high, low), BigInt(count))));
  }
  assert.equal(pickOf(12345n, "trial", 1), 0, "one instance is always the one");
  assert.notEqual(pickOf(0n, "a", 1000), pickOf(0n, "b", 1000), "the task's ID is a name of the place");
});

test("10 000 instances are counted in well under a second", () => {
  const started = performance.now();
  const { instances } = templateOf(template({ a: domain(1, 100), b: domain(1, 100) }, { template: { derived: { product: "a * b" }, constraint: "a % 7 != 0 or b % 7 != 0" } }));
  assert.equal(instances.length, 10_000 - 14 * 14);
  assert.ok(performance.now() - started < 1000);
});

// A template of the missing factor whose solver finds it: a and product stand in the line, and factor,
// the solver's result, in the key.
const solved = (extra = {}) => ({
  id: "trial",
  template: { parameters: { a: domain(2, 3), b: domain(4, 4) }, derived: { product: "a * b" }, solver: { program: "def solve(numbers): pass", results: ["factor"] } },
  items: [{ line: [{ text: "{a} ×" }, { binding: "box", check: { kind: "number", key: "{factor}", ...extra.check } }, { text: "= {product}" }] }],
  solution: [{ text: "{a} × {factor} = {product}" }],
  leak_phrases: ["factor {factor}", "{{factor}}"],
  ...extra.task,
});

test("a result of the solver is named as no parameter or derived number is, and stands only in closed fields", () => {
  const breachesOf = (task) => Object.fromEntries(templateOf(task).breaches);
  assert.deepEqual(breachesOf(solved()), {}, "the key, the solution and a leak phrase");
  assert.deepEqual(resultsOf(solved()), ["factor"]);
  assert.deepEqual(resultsOf({ id: "plain" }), [], "a task without a solver has no results");
  const line = [{ text: "{a} ×" }, { binding: "box", check: { kind: "number", key: "{b}" } }, { text: "= {product}" }];
  const named = (name) => solved({ task: { template: { ...solved().template, solver: { program: "", results: [name] } }, items: [{ line }], solution: [{ text: "{a} × {b} = {product}" }], leak_phrases: undefined } });
  assert.match(breachesOf(named("a"))["task.template-names"], /a is both a parameter and a result of the solver/);
  assert.match(breachesOf(named("product"))["task.template-names"], /product is both a derived number and a result of the solver/);
  assert.equal(breachesOf(named("product"))["task.placeholders"], undefined, "a name that is a derived number already is not read as a result's where it stands");
  assert.deepEqual(breachesOf(solved({ check: { trap_values: [{ value: "{factor}/2", trap: "t" }, { value: "{product}", trap: "u" }] } })), {}, "a trap value of a number");
  assert.match(breachesOf(solved({ check: { trap_values: [{ value: "{b}", trap: "t", text: "Not {factor}." }] } }))["task.placeholders"], /#\/items\/0\/line\/1\/check\/trap_values\/0\/text: \{factor\} is a result of the solver, which stands only in a key/);
  assert.match(breachesOf(solved({ task: { statement: [{ text: "Find {factor}." }] } }))["task.placeholders"], /#\/statement\/0\/text: \{factor\} is a result/);
  const choice = solved({ task: { items: [{ answer_slots: [{ binding: "anywhere", check: { kind: "choice", key: "{factor}", options: ["{a}", "{b}"] } }] }] } });
  assert.match(breachesOf(choice)["task.placeholders"], /#\/items\/0\/answer_slots\/0\/check\/key: \{factor\} is a result/, "not the key of a choice");
  assert.match(breachesOf(solved({ task: { leak_phrases: ["{factors}"] } }))["task.placeholders"], /\{factors\} names no parameter, derived number or result of the solver/);
});

test("an instance keeps the placeholders of the results that spec does not know, and the leak phrases that hold one are passed over", () => {
  const task = solved();
  const [numbers] = templateOf(task).instances;
  const instance = instanceMaker(task)(numbers);
  assert.equal(instance.items[0].line[1].check.key, "{factor}");
  assert.equal(instance.solution[0].text, "2 × {factor} = 8");
  assert.deepEqual(instance.leak_phrases, ["factor {factor}", "{factor}"], "a doubled brace is a brace of the text");
  assert.deepEqual(withoutResults(task)(instance).leak_phrases, ["{factor}"], "only the phrase that names the result is dropped");
  const alone = solved({ task: { leak_phrases: ["factor {factor}"] } });
  assert.equal(withoutResults(alone)(instanceMaker(alone)(numbers)).leak_phrases, undefined, "and with it, the list that holds no other");
  const plain = { id: "plain", template: { parameters: { a: domain(1, 1) } }, leak_phrases: ["{a}"] };
  assert.equal(withoutResults(plain)(instanceOf(plain, templateOf(plain).instances[0])).leak_phrases[0], "1", "a template without a solver keeps them all");
  const known = instanceMaker(task)(new Map([...numbers, ["factor", 4n]]));
  assert.equal(known.items[0].line[1].check.key, "4", "and a result that a vector gives takes its place");
});

test("the solver gets the parameters and the derived numbers that the open view of the template shows, in the order of their names", () => {
  const task = solved();
  const open = { id: "trial", statement: [{ text: "{product} and {b}, {{a}}" }], items: [{ line: [{ text: "{product} ÷" }, {}] }] };
  assert.deepEqual(solverInputsOf(task, open), ["b", "product"]);
  assert.deepEqual(solverInputsOf(task, { id: "trial", items: [{ line: [{ text: "{factor}" }] }] }), [], "never a result, nor a name of no number");
});
