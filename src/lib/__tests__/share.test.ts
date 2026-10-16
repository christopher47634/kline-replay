import { describe, expect, it } from "vitest";
import { blocks, shareText } from "@/lib/share";
import type { RoundRecord, Script } from "@/game/types";

const round = (pnl: number, liquidated = false) => ({ pnl, liquidated }) as RoundRecord;

describe("share", () => {
  it("maps each month to a coloured block (red = gain in A-share colours, purple = liquidated)", () => {
    expect(blocks([round(1), round(-1), round(0), round(-5, true)])).toBe("🟥🟩🟥🟪");
    expect(blocks([])).toBe("");
  });

  it("builds the share card text with the challenge link", () => {
    const text = shareText({
      script: { id: "2015", title: "2015：杠杆牛" } as Script,
      history: [round(1), round(-1)],
      ret: 0.123,
      rankLabel: "前 10%",
      personaTitle: "趋势猎手",
      quote: "顺势而为",
      origin: "https://kline-replay.vercel.app",
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe("穿越 K 线 · 2015 杠杆牛");
    expect(lines[1]).toBe("🟥🟩");
    expect(lines[2]).toContain("前 10%");
    expect(lines.at(-1)).toBe("来挑战 → https://kline-replay.vercel.app/play/2015");
  });
});
