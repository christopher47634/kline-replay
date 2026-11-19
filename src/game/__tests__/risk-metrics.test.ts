import { describe, expect, it } from "vitest";
import { playAll } from "@/game/engine";
import { computeRiskMetrics, riskSummaryLine } from "@/game/stats";
import type { Allocation } from "@/game/types";
import { getScript } from "@/lib/scripts";

const script = getScript("2015")!;

describe("computeRiskMetrics 量化风险诊断指标", () => {
  it("全仓现金零回撤、零连亏且卡玛比为 null", () => {
    const allocs: Allocation[] = Array.from({ length: 12 }, () => ({
      sh50: 0,
      cyb: 0,
      bank: 0,
      baijiu: 0,
      cash: 100,
      margin: 0,
    }));
    const history = playAll(script, allocs);
    const metrics = computeRiskMetrics(script, history);
    expect(metrics.maxDrawdown).toBe(0);
    expect(metrics.maxLoseStreak).toBe(0);
    expect(metrics.maxWinStreak).toBe(12);
    expect(metrics.calmarRatio).toBeNull();
    expect(riskSummaryLine(metrics)).toContain("无回撤");
  });

  it("满仓创业板在 2015 剧烈波动行情下产出正回撤与波动率", () => {
    const allocs: Allocation[] = Array.from({ length: 12 }, () => ({
      sh50: 0,
      cyb: 100,
      bank: 0,
      baijiu: 0,
      cash: 0,
      margin: 0,
    }));
    const history = playAll(script, allocs);
    const metrics = computeRiskMetrics(script, history);
    expect(metrics.maxDrawdown).toBeGreaterThan(0.2);
    expect(metrics.monthlyVolatility).toBeGreaterThan(0.05);
    expect(metrics.returnToVolRatio).not.toBeNull();
    expect(metrics.calmarRatio).not.toBeNull();
    expect(riskSummaryLine(metrics)).toContain("最大回撤");
  });
});
