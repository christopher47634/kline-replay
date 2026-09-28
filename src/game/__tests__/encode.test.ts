import { describe, expect, it } from "vitest";
import { decodeGame, encodeGame } from "../encode";
import { APPENDIX_B } from "../fixtures";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

describe("encode / decode", () => {
  it("round-trips", () => {
    const code = encodeGame("2015", APPENDIX_B);
    expect(code.startsWith("2015.")).toBe(true);
    expect(code.length - 5).toBe(62);
    const d = decodeGame(code);
    expect(d.ok && d.allocs).toEqual(APPENDIX_B);
    expect(d.ok && d.scriptId).toBe("2015");
  });

  it("detects a single-character tamper at every position", () => {
    const code = encodeGame("2015", APPENDIX_B);
    for (let i = 5; i < code.length; i++) {
      const swapped = ALPHABET[(ALPHABET.indexOf(code[i]) + 1) % 64];
      const bad = code.slice(0, i) + swapped + code.slice(i + 1);
      expect(decodeGame(bad).ok, `tamper at ${i}`).toBe(false);
    }
  });

  it("rejects script id swap, wrong length and garbage", () => {
    const code = encodeGame("2015", APPENDIX_B);
    expect(decodeGame(code.replace("2015.", "2020.")).ok).toBe(false);
    expect(decodeGame(code.slice(0, -2)).ok).toBe(false);
    expect(decodeGame("hello").ok).toBe(false);
    expect(decodeGame(null).ok).toBe(false);
  });

  it("pads short (busted) games with cash months", () => {
    const d = decodeGame(encodeGame("2015", APPENDIX_B.slice(0, 5)));
    expect(d.ok && d.allocs[11].cash).toBe(100);
  });
});
