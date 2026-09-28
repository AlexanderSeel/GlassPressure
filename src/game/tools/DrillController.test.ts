import { describe, expect, it } from "vitest";
import { DrillController } from "./DrillController";

describe("DrillController", () => {
  it("approaches, contacts and starts drilling while held on target", () => {
    const drill = new DrillController();
    drill.press();

    for (let i = 0; i < 40; i += 1) drill.step(1 / 60, true);
    expect(["contact", "drilling"]).toContain(drill.state);

    for (let i = 0; i < 12; i += 1) drill.step(1 / 60, true);
    expect(drill.state).toBe("drilling");
  });

  it("retracts after release", () => {
    const drill = new DrillController();
    drill.press();
    for (let i = 0; i < 40; i += 1) drill.step(1 / 60, true);
    drill.release();
    for (let i = 0; i < 30; i += 1) drill.step(1 / 60, true);
    expect(drill.state).toBe("idle");
    expect(drill.extension).toBe(0);
  });
});
