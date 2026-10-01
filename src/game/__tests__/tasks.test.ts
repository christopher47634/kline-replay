import { describe, expect, it } from "vitest";
import { playAll } from "@/game/engine";
import { decodeNotes, encodeNotes } from "@/game/notes";
import { judgePersona, specialEvents, styleEvidence } from "@/game/persona";
import { TASK_IDS, taskOutcome, taskViolation } from "@/game/tasks";
import { resultHref } from "@/game/link";
import { decodeGame } from "@/game/encode";
import { TRADED_IDS, type Allocation, type MonthNote, type Script } from "@/game/types";
import { getScript, SCRIPT_IDS } from "@/lib/scripts";

const cash = (): Allocation => ({ sh50: 0, cyb: 0, bank: 0, baijiu: 0, cash: 100, margin: 0 });
const scripts = SCRIPT_IDS.map((id) => getScript(id)!) as Script[];

/** Hindsight-perfect play under each task's rules: proves every task can be completed in every year. */
function oracle(s: Script, task: "guard" | "beat"): Allocation[] {
  return s.months.map((m) => {
    const best = [...TRADED_IDS].sort((a, b) => m.returns[b] - m.returns[a])[0];
    const a = cash();
    if (task === "guard") {
      if (m.returns[best] > s.params.cashMonthly) a[best] = 100;
      else a[best] = 20;
      a.cash = 100 - a[best];
      return a;
    }
    a[best] = 100;
    a.cash = 0;
    return a;
  });
}

describe("任务卡", () => {
  it("every task is achievable in every year (checked with hindsight-perfect play inside the rules)", () => {
    for (const s of scripts)
      for (const t of TASK_IDS) {
        const allocs = oracle(s, t);
        allocs.forEach((a) => expect(taskViolation(t, a)).toBeNull());
        expect(taskOutcome(t, s, playAll(s, allocs)).done, `${s.id} ${t}`).toBe(true);
      }
  });

  it("is not trivially done by sitting in cash or by maxing leverage", () => {
    expect(taskViolation("guard", cash())).toMatch(/至少 20%/);
    expect(taskViolation("guard", { ...cash(), cash: 70, margin: 30 })).toMatch(/融资/);
    expect(taskViolation("beat", { ...cash(), cash: 70, margin: 30 })).toMatch(/最多 20%/);
    expect(taskViolation("beat", { ...cash(), cash: 80, margin: 20 })).toBeNull();
    expect(taskViolation(null, { ...cash(), cash: 0, margin: 100 })).toBeNull();
  });

  it("all-cash for a year fails 跑赢指数 in a bull year and a hand-edited illegal link never counts", () => {
    const s = getScript("2007")!;
    expect(taskOutcome("beat", s, playAll(s, Array(12).fill(cash()))).done).toBe(false);
    const illegal = Array(12).fill({ ...cash(), cash: 0, margin: 100 });
    expect(taskOutcome("beat", s, playAll(s, illegal)).legal).toBe(false);
  });
});

describe("理由与判断", () => {
  it("round-trips through the n= link parameter", () => {
    const notes: Record<number, MonthNote> = { 0: { rumor: "trust" }, 1: { moment: 2, reason: "fear", edited: true }, 6: { rumor: "doubt", moment: 0, reason: "gut" }, 11: { reason: "news" } };
    const s = encodeNotes(notes);
    expect(s).toHaveLength(24);
    expect(decodeNotes(s)).toEqual(notes);
    expect(encodeNotes({})).toBe("");
    expect(decodeNotes("garbage")).toEqual({});
    expect(decodeNotes("~".repeat(24))).toEqual({});
  });

  it("result links keep the old s= code (old links still decode) and add t= / n=", () => {
    const s = getScript("2015")!;
    const h = playAll(s, Array(12).fill({ ...cash(), cash: 80, sh50: 20 }));
    const url = new URL(resultHref("2015", h, { task: "guard", notes: { 3: { rumor: "doubt" } } }), "https://x");
    expect(decodeGame(url.searchParams.get("s")).ok).toBe(true);
    expect(url.searchParams.get("t")).toBe("guard");
    expect(decodeNotes(url.searchParams.get("n"))[3]).toEqual({ rumor: "doubt" });
    expect(resultHref("2015", h)).not.toMatch(/[?&](t|n)=/);
  });
});

describe("成绩、风格、事件分开", () => {
  it("staying in cash is a 场外观众, not a 钻石手", () => {
    const s = getScript("2015")!;
    expect(judgePersona(playAll(s, Array(12).fill(cash())), s)).toBe("bystander");
    expect(judgePersona(playAll(s, Array(12).fill({ ...cash(), cash: 0, baijiu: 100 })), s)).toBe("diamond_hands");
  });

  it("evidence counts concentration and effective leverage, not only 创业板 + 融资", () => {
    const s = getScript("2015")!;
    const h = playAll(s, Array(12).fill({ ...cash(), cash: 0, baijiu: 100 }));
    const ev = styleEvidence(h, s).join(" ");
    expect(ev).toMatch(/100% 押在白酒/);
    const lev = styleEvidence(playAll(s, Array(12).fill({ ...cash(), cash: 0, sh50: 50, margin: 50 })), s).join(" ");
    expect(lev).toMatch(/1\.50×/);
  });

  it("a liquidation is an event, listed by month", () => {
    const s = getScript("2008")!; // October 2008: 上证50 −26.7% liquidates 2× margin
    const allocs = Array(12).fill({ ...cash(), cash: 50, margin: 50 });
    const ev = specialEvents(playAll(s, allocs), s);
    expect(ev.find((e) => e.key === "liq")?.text).toMatch(/强平 \d 次（.*10 月/);
  });
});
