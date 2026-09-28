import s2015 from "../../content/scripts/2015.json";
import s2020 from "../../content/scripts/2020.json";
import type { Script } from "@/game/types";

const SCRIPTS: Record<string, Script> = {
  "2015": s2015 as unknown as Script,
  "2020": s2020 as unknown as Script,
};

export const SCRIPT_IDS = Object.keys(SCRIPTS);

export function getScript(id: string): Script | null {
  return SCRIPTS[id] ?? null;
}
