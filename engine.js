const FUNCTIONS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "ln", "log", "abs", "exp"
]);

function tokenize(source) {
  const normalized = String(source)
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll("π", "pi")
    .replace(/\s+/g, "");
  const tokens = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const rest = normalized.slice(cursor);
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      cursor += number[0].length;
      continue;
    }
    const identifier = rest.match(/^[a-z]+/i);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0].toLowerCase() });
      cursor += identifier[0].length;
      continue;
    }
    const character = normalized[cursor];
    if ("+-*/^()%!,".includes(character)) {
      tokens.push({ type: "symbol", value: character });
      cursor += 1;
      continue;
    }
    throw new Error(`Unknown symbol “${character}”`);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0) throw new Error("Factorial needs a positive integer");
  if (value > 170) throw new Error("Factorial is too large");
  let result = 1;
  for (let number = 2; number <= value; number += 1) result *= number;
  return result;
}

class Parser {
  constructor(tokens, angleMode) {
    this.tokens = tokens;
    this.position = 0;
    this.angleMode = angleMode;
  }

  current() { return this.tokens[this.position]; }
  match(value) {
    if (this.current().value !== value) return false;
    this.position += 1;
    return true;
  }
  expect(value) {
    if (!this.match(value)) throw new Error(`Expected “${value}”`);
  }

  parse() {
    const value = this.expression();
    if (this.current().type !== "eof") throw new Error("Expression is incomplete");
    if (!Number.isFinite(value)) throw new Error("Result is outside the numeric range");
    return value;
  }

  expression() {
    let value = this.term();
    while (true) {
      if (this.match("+")) value += this.term();
      else if (this.match("-")) value -= this.term();
      else return value;
    }
  }

  term() {
    let value = this.unary();
    while (true) {
      if (this.match("*")) value *= this.unary();
      else if (this.match("/")) {
        const divisor = this.unary();
        if (divisor === 0) throw new Error("Division by zero");
        value /= divisor;
      } else if (this.startsPrimary(this.current())) {
        value *= this.unary();
      } else return value;
    }
  }

  startsPrimary(token) {
    return token.type === "number" || token.type === "identifier" || token.value === "(";
  }

  unary() {
    if (this.match("+")) return this.unary();
    if (this.match("-")) return -this.unary();
    return this.power();
  }

  power() {
    const base = this.postfix();
    return this.match("^") ? base ** this.unary() : base;
  }

  postfix() {
    let value = this.primary();
    while (true) {
      if (this.match("!")) value = factorial(value);
      else if (this.match("%")) value /= 100;
      else return value;
    }
  }

  primary() {
    const token = this.current();
    if (token.type === "number") {
      this.position += 1;
      return token.value;
    }
    if (this.match("(")) {
      const value = this.expression();
      this.expect(")");
      return value;
    }
    if (token.type === "identifier") {
      this.position += 1;
      if (token.value === "pi") return Math.PI;
      if (token.value === "e") return Math.E;
      if (!FUNCTIONS.has(token.value)) throw new Error(`Unknown function “${token.value}”`);
      this.expect("(");
      const argument = this.expression();
      this.expect(")");
      return this.applyFunction(token.value, argument);
    }
    throw new Error(token.type === "eof" ? "Enter a complete expression" : `Unexpected “${token.value}”`);
  }

  applyFunction(name, argument) {
    const radians = this.angleMode === "DEG" ? argument * Math.PI / 180 : argument;
    const fromRadians = value => this.angleMode === "DEG" ? value * 180 / Math.PI : value;
    switch (name) {
      case "sin": return Math.sin(radians);
      case "cos": return Math.cos(radians);
      case "tan": return Math.tan(radians);
      case "asin": return fromRadians(Math.asin(argument));
      case "acos": return fromRadians(Math.acos(argument));
      case "atan": return fromRadians(Math.atan(argument));
      case "sqrt": {
        if (argument < 0) throw new Error("Square root needs a non-negative value");
        return Math.sqrt(argument);
      }
      case "ln": {
        if (argument <= 0) throw new Error("Logarithm needs a positive value");
        return Math.log(argument);
      }
      case "log": {
        if (argument <= 0) throw new Error("Logarithm needs a positive value");
        return Math.log10(argument);
      }
      case "abs": return Math.abs(argument);
      case "exp": return Math.exp(argument);
      default: throw new Error(`Unknown function “${name}”`);
    }
  }
}

export function evaluate(expression, angleMode = "DEG") {
  if (!String(expression).trim()) throw new Error("Enter an expression");
  return new Parser(tokenize(expression), angleMode).parse();
}

export function formatResult(value, precision = 10) {
  if (!Number.isFinite(value)) throw new Error("Result is outside the numeric range");
  const safeValue = Math.abs(value) < 1e-15 ? 0 : value;
  const magnitude = Math.abs(safeValue);
  if ((magnitude !== 0 && magnitude < 1e-7) || magnitude >= 1e12) {
    return safeValue.toExponential(Math.max(2, precision - 1)).replace(/\.0+e/, "e").replace(/(\.\d*?)0+e/, "$1e");
  }
  return Number(safeValue.toPrecision(precision)).toString();
}
