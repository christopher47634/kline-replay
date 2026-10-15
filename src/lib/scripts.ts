import s2007 from "../../content/scripts/2007.json";
import s2008 from "../../content/scripts/2008.json";
import s2015 from "../../content/scripts/2015.json";
import s2018 from "../../content/scripts/2018.json";
import s2020 from "../../content/scripts/2020.json";
import s2024 from "../../content/scripts/2024.json";
import { ASSET_IDS, type Script } from "@/game/types";

/**
 * JSON 与 Script 类型之间的运行时校验：结构不对就在模块加载时直接报错（测试和构建都会挂），
 * 不再靠 `as unknown as Script` 静默放行。只查引擎和界面真正依赖的字段。
 */
export function assertScript(raw: unknown, id: string): Script {
  const fail = (why: string): never => {
    throw new Error(`content/scripts/${id}.json 结构不对：${why}`);
  };
  if (typeof raw !== "object" || raw === null) fail("不是对象");
  const s = raw as Record<string, unknown>;
  if (s.id !== id) fail(`id 应为 ${id}`);
  if (typeof s.startCash !== "number" || !(s.startCash > 0)) fail("startCash 缺失");
  if (typeof s.params !== "object" || s.params === null) fail("params 缺失");
  if (!Array.isArray(s.months) || s.months.length !== 12) fail("months 必须是 12 个月");
  (s.months as unknown[]).forEach((m, i) => {
    const mo = m as Record<string, unknown> | null;
    if (!mo || mo.index !== i) fail(`第 ${i} 月 index 不符`);
    if (typeof mo!.marketReturn !== "number") fail(`第 ${i} 月 marketReturn 缺失`);
    const r = mo!.returns as Record<string, unknown> | undefined;
    if (!r || ASSET_IDS.some((a) => typeof r[a] !== "number" || !Number.isFinite(r[a] as number))) fail(`第 ${i} 月 returns 不全`);
    if (!Array.isArray(mo!.daily) || mo!.daily.length === 0) fail(`第 ${i} 月没有日线`);
  });
  return raw as Script;
}

// chronological; each file is built by scripts/build_script.py from real prices + reviewed headlines
const SCRIPTS: Record<string, Script> = {
  "2007": assertScript(s2007, "2007"),
  "2008": assertScript(s2008, "2008"),
  "2015": assertScript(s2015, "2015"),
  "2018": assertScript(s2018, "2018"),
  "2020": assertScript(s2020, "2020"),
  "2024": assertScript(s2024, "2024"),
};

export const SCRIPT_IDS = Object.keys(SCRIPTS);

export function getScript(id: string): Script | null {
  return Object.prototype.hasOwnProperty.call(SCRIPTS, id) ? SCRIPTS[id] : null;
}
