import { describe, expect, it } from "vitest";
import { FixedStepRunner } from "./FixedStepRunner";

describe("FixedStepRunner", () => {
  it("produces the same simulated time for equivalent frame chunks", () => {
    const a = new FixedStepRunner(1 / 60);
    const b = new FixedStepRunner(1 / 60);
    let ta = 0;
    let tb = 0;

    for (let i = 0; i < 60; i += 1) a.advance(1 / 60, dt => { ta += dt; });
    for (let i = 0; i < 20; i += 1) b.advance(3 / 60, dt => { tb += dt; });

    expect(ta).toBeCloseTo(tb, 8);
    expect(ta).toBeCloseTo(1, 8);
  });

  it("caps catch-up work after a long frame", () => {
    const runner = new FixedStepRunner(1 / 60, 4);
    let calls = 0;
    runner.advance(2, () => { calls += 1; });
    expect(calls).toBe(4);
  });
});
