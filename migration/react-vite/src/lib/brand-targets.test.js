import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBrandTargets } from "./brand-targets.js";

test("keeps valid non-negative numeric targets and converts numeric strings", () => {
  assert.deepEqual(normalizeBrandTargets({ Alpha: 120000, Beta: "2500", Zero: 0 }), {
    Alpha: 120000, Beta: 2500, Zero: 0,
  });
});

test("rejects blank, null, boolean, negative, and non-finite target values", () => {
  assert.deepEqual(normalizeBrandTargets({
    blank: "", whitespace: "   ", missing: null, flag: true,
    negative: -1, negativeString: "-2", infinite: "Infinity", notNumber: "abc",
  }), {});
});

test("rejects non-object values and arrays", () => {
  assert.deepEqual(normalizeBrandTargets(null), {});
  assert.deepEqual(normalizeBrandTargets("100"), {});
  assert.deepEqual(normalizeBrandTargets([100, 200]), {});
});

test("ignores empty brand names without changing valid names", () => {
  assert.deepEqual(normalizeBrandTargets({ "": 5, "   ": 6, Gamma: "750" }), { Gamma: 750 });
});
