import { describe, expect, it } from "vitest";
import { FIRST_LEVEL, SECOND_LEVEL } from "./LevelDefinition";
import { LevelRuntime } from "./LevelRuntime";

describe("LevelRuntime", () => {
  it("cycles through levels and resets phase", () => {
    const runtime = new LevelRuntime([FIRST_LEVEL, SECOND_LEVEL]);
    runtime.fail();
    expect(runtime.phase).toBe("failed");

    runtime.next();
    expect(runtime.level).toBe(SECOND_LEVEL);
    expect(runtime.phase).toBe("playing");
  });

  it("returns zero host offset for a static level", () => {
    const runtime = new LevelRuntime([FIRST_LEVEL]);
    expect(runtime.advance(1 / 60)).toEqual({ x: 0, y: 0 });
  });

  it("produces host motion for the moving level", () => {
    const runtime = new LevelRuntime([SECOND_LEVEL]);
    const offset = runtime.advance(0.05);
    expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0);
  });
});
