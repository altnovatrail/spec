// The patterns of the module format's schemas — the value of `pattern`, and every key of
// `patternProperties` — in the subset that the format text, section 5, allows (R45 and its
// amendment of 2026-10-22): the tokens JSON Schema 2020-12 recommends ("individual Unicode
// characters", classes, the quantifiers and their lazy forms, ^ and $, grouping and alternation;
// json-schema-core 2020-12, 6.4), written so that Go and JavaScript read them alike. ajv compiles a
// pattern as a JavaScript RegExp in Unicode mode; module-kit's validator, by Go's regexp.
//
// Where the two differ even within those tokens, the subset takes the form both read the same way:
//
// - Go reads "[]a]" as a class of "]" and "a" — "] and - are okay as first char in class" — and
//   refuses "[^]", while JavaScript refuses "[]a]" and reads "[^]" as any character. So "[" and "]"
//   in a class are escaped, and a class is never empty.
// - Go reads "a{01}" as letters — "Disallow leading zeros" — and JavaScript as "a{1}". So a count
//   has no leading zero.
// - "Implementation restriction: The counting forms x{n,m}, x{n,}, and x{n} reject forms that
//   create a minimum or maximum repetition count above 1000", and the counts nested in one another
//   multiply (repeatIsValid). JavaScript has no such limit. So no count, and no product of nested
//   counts, is above 1000, counted as Go counts: {x,y} and {x} by their most, {x,} by x — and {0,}
//   as 1 — while {0} and {0,0} let anything inside pass.
// - Outside a class, a "{", "}" or "]" that is no quantifier is a letter to Go and an error to
//   JavaScript. So it is escaped.
//
// Go: src/regexp/syntax/doc.go and parse.go, master fb3c20e, read 2026-10-22. JavaScript: Node 24
// of the devcontainer, new RegExp(pattern, "u"), 2026-10-22.
//
// The parser reads by hand, one character after another: a regular expression that checked regular
// expressions would backtrack on just the patterns it has to refuse.

// The characters a pattern may escape, and none other: "\d" or "\-" is no token of the format.
const ESCAPABLE = new Set("^$\\.*+?()[]{}|");
const QUANTIFIERS = new Set("*+?{");
const MAX_COUNT = 1000;

class PatternProblem extends Error {}

// The first thing in the pattern outside the subset, as a sentence, or null when there is none.
export function patternProblem(pattern) {
  try {
    new PatternParser(pattern).parse();
    return null;
  } catch (error) {
    if (error instanceof PatternProblem) return error.message;
    throw error;
  }
}

class PatternParser {
  constructor(pattern) {
    // By code points, so that a character beyond the BMP is one character, as it is in Unicode mode.
    this.chars = Array.from(pattern);
    this.at = 0;
  }

  peek(ahead = 0) {
    return this.chars[this.at + ahead];
  }

  fail(message) {
    throw new PatternProblem(`${message}, at character ${this.at + 1}`);
  }

  parse() {
    this.alternation(0);
    if (this.at < this.chars.length) this.fail("a ) with no ( before it");
  }

  // Each of these returns the largest product of the counts nested in what it read: Go's limit
  // applies to every chain of counted repetitions, one inside another.
  alternation(depth) {
    let product = this.sequence(depth);
    while (this.peek() === "|") {
      this.at++;
      product = Math.max(product, this.sequence(depth));
    }
    return product;
  }

  sequence(depth) {
    let product = 1;
    while (this.at < this.chars.length && this.peek() !== "|" && !(this.peek() === ")" && depth > 0)) {
      if (this.peek() === "^" || this.peek() === "$") {
        this.at++;
        if (QUANTIFIERS.has(this.peek())) this.fail(`nothing to repeat before ${this.peek()}`);
        continue;
      }
      product = Math.max(product, this.quantified(this.atom(depth)));
    }
    return product;
  }

  atom(depth) {
    const char = this.peek();
    switch (char) {
      case "(": {
        this.at++;
        if (this.peek() === "?") this.fail("a group that begins with ? is no token of the format");
        const product = this.alternation(depth + 1);
        if (this.peek() !== ")") this.fail("a ( with no ) after it");
        this.at++;
        return product;
      }
      case ")":
        return this.fail("a ) with no ( before it");
      case "[":
        this.characterClass();
        return 1;
      case "\\":
        this.escape();
        return 1;
      case ".":
        return this.fail("a . that is no letter: write \\. for a dot, or a class");
      case "*":
      case "+":
      case "?":
        return this.fail(`nothing to repeat before ${char}`);
      case "{":
      case "}":
      case "]":
        return this.fail(`a ${char} outside a quantifier or a class: write \\${char}`);
      default:
        this.at++;
        return 1;
    }
  }

  // The quantifier after an atom, if any, and the product of counts it makes.
  quantified(inner) {
    const char = this.peek();
    if (char === "*" || char === "+" || char === "?") {
      this.at++;
      this.lazy();
      return inner;
    }
    if (char !== "{") return inner;
    const { min, max } = this.count();
    this.lazy();
    // Go counts the most a repetition allows, and the least when it allows any number; a count of 0
    // there divides nothing, and a repetition of at most 0 checks nothing inside it (repeatIsValid).
    const most = max ?? min;
    const product = max === 0 ? 0 : (most || 1) * inner;
    if (product > MAX_COUNT) this.fail(`repetitions counted in one another make ${product}, above ${MAX_COUNT}`);
    return product;
  }

  lazy() {
    if (this.peek() === "?") this.at++;
    if (QUANTIFIERS.has(this.peek())) this.fail("a second quantifier on one atom");
  }

  // {x}, {x,y} or {x,}: max undefined for {x,}.
  count() {
    this.at++;
    const min = this.number();
    let max = min;
    if (this.peek() === ",") {
      this.at++;
      max = this.peek() === "}" ? undefined : this.number();
    }
    if (min === null || max === null || this.peek() !== "}") this.fail("a { that is no quantifier: write \\{");
    this.at++;
    for (const n of [min, max]) if (n !== undefined && n > MAX_COUNT) this.fail(`the count ${n}, above ${MAX_COUNT}`);
    if (max !== undefined && min > max) this.fail(`{${min},${max}} counts downwards`);
    return { min, max };
  }

  // A count's digits as a number, or null when there are none.
  number() {
    let digits = "";
    while (this.peek() >= "0" && this.peek() <= "9") {
      digits += this.peek();
      this.at++;
    }
    if (digits === "") return null;
    if (digits.length > 1 && digits[0] === "0") this.fail(`the count ${digits} has a leading zero, which Go reads as letters`);
    return Number(digits);
  }

  escape() {
    this.at++;
    const char = this.peek();
    if (char === undefined) this.fail("a \\ at the end");
    if (!ESCAPABLE.has(char)) this.fail(`the escape \\${char} is no token of the format: write a class, such as [0-9]`);
    this.at++;
    return char;
  }

  // [...] or [^...]: a "-" stands first, last or between the ends of a range, and "[" and "]" are
  // escaped.
  characterClass() {
    this.at++;
    if (this.peek() === "^") this.at++;
    let items = 0;
    for (;;) {
      const char = this.peek();
      if (char === undefined) this.fail("a [ with no ] after it");
      if (char === "]") {
        if (items === 0) this.fail("an empty class: a ] in a class is written \\]");
        this.at++;
        return;
      }
      if (char === "-") {
        if (items > 0 && this.peek(1) !== "]") this.fail("a - in a class stands first, last or between the ends of a range");
        this.at++;
        items++;
        continue;
      }
      const low = this.classCharacter();
      items++;
      if (this.peek() === "-" && this.peek(1) !== "]" && this.peek(1) !== undefined) {
        this.at++;
        if (this.peek() === "-") this.fail("a - in a class stands first, last or between the ends of a range");
        const high = this.classCharacter();
        if (high.codePointAt(0) < low.codePointAt(0)) this.fail(`the range ${low}-${high} runs downwards`);
      }
    }
  }

  classCharacter() {
    const char = this.peek();
    if (char === "\\") return this.escape();
    if (char === "[") this.fail("a [ in a class is written \\[");
    this.at++;
    return char;
  }
}
