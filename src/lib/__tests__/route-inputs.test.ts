import { describe, expect, it } from "vitest";
import { isTask } from "@/game/tasks";
import { getScript } from "@/lib/scripts";

describe("public route identifiers", () => {
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "missing"])("rejects %s as a task and a script", (id) => {
    expect(isTask(id)).toBe(false);
    expect(getScript(id)).toBeNull();
  });
  it("still resolves the published task cards and years", () => {
    expect(isTask("guard")).toBe(true);
    expect(isTask("beat")).toBe(true);
    expect(getScript("2015")?.id).toBe("2015");
  });
});
