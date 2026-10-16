import { describe, expect, it } from "vitest";
import { cleanNickname } from "@/lib/board";

describe("cleanNickname", () => {
  it.each(["韭菜一号", "股神2024", "Isbell", "comet", "老王", "A股老兵", "wxy88"])("accepts %j", (name) => {
    expect(cleanNickname(name)).toBe(name);
  });

  it.each([
    "傻逼",
    "傻 逼",
    "傻.逼",
    "傻b",
    "煞笔",
    "ＦＵＣＫ",
    "f_u_c_k",
    "5h1t",
    "sb",
    "老sb",
    "sb123",
    "$b",
    "加vx看",
    "a.com",
    "nmsl!",
  ])("rejects %j", (name) => {
    expect(cleanNickname(name)).toBeNull();
  });

  it("rejects symbol-only, too long, zero-width and non-string input", () => {
    expect(cleanNickname("!!!")).toBeNull();
    expect(cleanNickname("一二三四五六七八九")).toBeNull();
    expect(cleanNickname("老\u200b王")).toBeNull();
    expect(cleanNickname(42)).toBeNull();
    expect(cleanNickname("   ")).toBeNull();
  });

  it("normalizes full-width input and collapses spaces", () => {
    expect(cleanNickname("  老  王  ")).toBe("老 王");
    expect(cleanNickname("ＡＢＣ")).toBe("ABC");
  });
});
