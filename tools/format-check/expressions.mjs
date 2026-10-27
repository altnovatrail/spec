// The expressions of templates, as section 23 of the format text gives them (format/README.md; R60):
// a narrow subset of Starlark — integers and names, + - * // %, comparisons, and, or and not — that
// spec's CI reads and evaluates itself, as module-kit evaluates it with go.starlark.net. Every int is
// a BigInt, so that it has no bound, as an int of Starlark has none.

// The tokens of two characters, then those of one, that the subset takes.
const SYMBOLS = ["==", "!=", "<=", ">=", "//", "<", ">", "+", "-", "*", "%", "(", ")"];
const COMPARISONS = new Set(["==", "!=", "<", "<=", ">", ">="]);
const WORDS = new Set(["and", "or", "not"]);

// What reading or typing an expression throws, with the problem to name: any other error is a fault
// of this code, and goes on.
class ExpressionProblem extends Error {}

const isWordCharacter = (char) => (char >= "a" && char <= "z") || (char >= "0" && char <= "9") || char === "_";
const isDigit = (char) => char >= "0" && char <= "9";

// A name of a parameter or a derived number, as tokens and placeholders read it: lowercase letters,
// digits and _, beginning with a letter.
export const isName = (text) => text.length > 0 && text[0] >= "a" && text[0] <= "z" && [...text].every(isWordCharacter);

// The tokens of a text: { tokens: [{ kind, text }] }, where kind is int, name or symbol, and the words
// and, or and not are symbols; or { problem }. A loop, with no regular expression to backtrack.
export function tokensOf(text) {
  const tokens = [];
  let at = 0;
  while (at < text.length) {
    const char = text[at];
    if (char === " ") {
      at++;
      continue;
    }
    if (isWordCharacter(char)) {
      let end = at;
      while (end < text.length && isWordCharacter(text[end])) end++;
      const word = text.slice(at, end);
      at = end;
      if (isDigit(word[0])) {
        if (![...word].every(isDigit)) return { problem: `${word} is neither an integer nor a name` };
        if (word.length > 1 && word[0] === "0") return { problem: `${word}: an integer has no leading zero` };
        tokens.push({ kind: "int", text: word });
      } else tokens.push({ kind: WORDS.has(word) ? "symbol" : "name", text: word });
      continue;
    }
    const symbol = SYMBOLS.find((candidate) => text.startsWith(candidate, at));
    if (!symbol) return { problem: `${JSON.stringify(char)} is no part of the expressions of templates` };
    tokens.push({ kind: "symbol", text: symbol });
    at += symbol.length;
  }
  return { tokens };
}

// The tree of an expression: { tree } or { problem }. A node is { int }, { name }, { op, operand } for
// not and unary -, or { op, left, right }.
export function parseExpression(text) {
  const { tokens, problem } = tokensOf(text);
  if (problem) return { problem };
  let at = 0;
  const peek = () => tokens[at]?.text;
  const fail = (message) => {
    throw new ExpressionProblem(message);
  };
  const next = () => tokens[at++];

  const expression = () => binary(conjunction, ["or"]);
  const conjunction = () => binary(negation, ["and"]);
  function negation() {
    if (peek() !== "not") return comparison();
    next();
    return { op: "not", operand: negation() };
  }
  function comparison() {
    const left = sum();
    if (!COMPARISONS.has(peek())) return left;
    const op = next().text;
    const node = { op, left, right: sum() };
    if (COMPARISONS.has(peek())) fail(`${op} and ${peek()}: comparisons do not chain`);
    return node;
  }
  const sum = () => binary(product, ["+", "-"]);
  const product = () => binary(unary, ["*", "//", "%"]);
  function unary() {
    if (peek() !== "-") return atom();
    next();
    return { op: "negate", operand: unary() };
  }
  function atom() {
    const token = next();
    if (!token) fail("it ends where an operand is due");
    if (token.kind === "int") return { int: BigInt(token.text) };
    if (token.kind === "name") return { name: token.text };
    if (token.text !== "(") fail(`${token.text} stands where an operand is due`);
    const inner = expression();
    if (peek() !== ")") fail("a ( is not closed");
    next();
    return inner;
  }
  function binary(operand, ops) {
    let left = operand();
    while (ops.includes(peek())) {
      const op = next().text;
      left = { op, left, right: operand() };
    }
    return left;
  }

  try {
    const tree = expression();
    if (at < tokens.length) fail(`${tokens[at].text} stands where the expression has ended`);
    return { tree };
  } catch (error) {
    if (error instanceof ExpressionProblem) return { problem: error.message };
    throw error;
  }
}

// The type of a tree, int or bool, when every name in it is one of names: { type } or { problem }.
export function typeOf(tree, names) {
  try {
    return { type: typed(tree, names) };
  } catch (error) {
    if (error instanceof ExpressionProblem) return { problem: error.message };
    throw error;
  }
}

function typed(node, names) {
  if ("int" in node) return "int";
  if ("name" in node) {
    if (!names.has(node.name)) throw new ExpressionProblem(`${node.name} is no name that it may name`);
    return "int";
  }
  const want = (child, type, of) => {
    if (typed(child, names) !== type) throw new ExpressionProblem(`${of} takes ${type === "int" ? "an int" : "a bool"}`);
  };
  if (node.op === "not") {
    want(node.operand, "bool", "not");
    return "bool";
  }
  if (node.op === "negate") {
    want(node.operand, "int", "unary -");
    return "int";
  }
  const operands = node.op === "and" || node.op === "or" ? "bool" : "int";
  want(node.left, operands, node.op);
  want(node.right, operands, node.op);
  return operands === "bool" || COMPARISONS.has(node.op) ? "bool" : "int";
}

// What evaluate throws when an expression divides by zero, which Starlark makes an error.
export class EvaluationError extends Error {}

// The value of a tree, a BigInt or a boolean, with numbers mapping each name to a BigInt. and and or
// evaluate their right operand only when the left one does not decide, as Starlark's do.
export function evaluate(node, numbers) {
  if ("int" in node) return node.int;
  if ("name" in node) return numbers.get(node.name);
  if (node.op === "not") return !evaluate(node.operand, numbers);
  if (node.op === "negate") return -evaluate(node.operand, numbers);
  if (node.op === "and") return evaluate(node.left, numbers) && evaluate(node.right, numbers);
  if (node.op === "or") return evaluate(node.left, numbers) || evaluate(node.right, numbers);
  const left = evaluate(node.left, numbers);
  const right = evaluate(node.right, numbers);
  return OPERATIONS[node.op](left, right);
}

function dividing(right) {
  if (right === 0n) throw new EvaluationError("it divides by zero");
}

// Floored division and the remainder of floored division: BigInt's / and % truncate, and the
// remainder of Starlark takes the sign of the divisor.
const OPERATIONS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "//": (a, b) => {
    dividing(b);
    const quotient = a / b;
    return a % b !== 0n && a < 0n !== b < 0n ? quotient - 1n : quotient;
  },
  "%": (a, b) => {
    dividing(b);
    const remainder = a % b;
    return remainder !== 0n && remainder < 0n !== b < 0n ? remainder + b : remainder;
  },
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
};
