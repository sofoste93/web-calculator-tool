import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, formatResult } from "../engine.js";

test("respects arithmetic precedence and right-associative powers", () => {
  assert.equal(evaluate("2 + 3 × 4"), 14);
  assert.equal(evaluate("2^3^2"), 512);
  assert.equal(evaluate("-2^2"), -4);
  assert.equal(evaluate("2^-2"), 0.25);
});

test("supports implicit multiplication, constants and grouped expressions", () => {
  assert.equal(evaluate("2(3 + 4)"), 14);
  assert.equal(formatResult(evaluate("2π"), 10), "6.283185307");
  assert.equal(evaluate("(2)(5)"), 10);
});

test("handles scientific functions in degrees and radians", () => {
  assert.equal(formatResult(evaluate("sin(30)", "DEG"), 10), "0.5");
  assert.equal(formatResult(evaluate("cos(pi)", "RAD"), 10), "-1");
  assert.equal(formatResult(evaluate("asin(0.5)", "DEG"), 10), "30");
  assert.equal(evaluate("sqrt(81) + log(100) + ln(e)"), 12);
});

test("supports percentages and factorials", () => {
  assert.equal(evaluate("200 × 10%"), 20);
  assert.equal(evaluate("5!"), 120);
  assert.equal(evaluate("3!!"), 720);
});

test("rejects invalid and unsafe operations", () => {
  assert.throws(() => evaluate("1 / 0"), /Division by zero/);
  assert.throws(() => evaluate("sqrt(-1)"), /non-negative/);
  assert.throws(() => evaluate("171!"), /too large/);
  assert.throws(() => evaluate("alert(1)"), /Unknown function/);
  assert.throws(() => evaluate("2 +"), /complete/);
});

test("formats ordinary, tiny and huge results", () => {
  assert.equal(formatResult(1 / 3, 8), "0.33333333");
  assert.match(formatResult(1.2e-10, 8), /^1\.2e-10$/);
  assert.match(formatResult(8e14, 8), /^8e\+14$/);
});
