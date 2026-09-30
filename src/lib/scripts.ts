import s2007 from "../../content/scripts/2007.json";
import s2008 from "../../content/scripts/2008.json";
import s2015 from "../../content/scripts/2015.json";
import s2018 from "../../content/scripts/2018.json";
import s2020 from "../../content/scripts/2020.json";
import s2024 from "../../content/scripts/2024.json";
import type { Script } from "@/game/types";

// chronological; each file is built by scripts/build_script.py from real prices + reviewed headlines
const SCRIPTS: Record<string, Script> = {
  "2007": s2007 as unknown as Script,
  "2008": s2008 as unknown as Script,
  "2015": s2015 as unknown as Script,
  "2018": s2018 as unknown as Script,
  "2020": s2020 as unknown as Script,
  "2024": s2024 as unknown as Script,
};

export const SCRIPT_IDS = Object.keys(SCRIPTS);

export function getScript(id: string): Script | null {
  return SCRIPTS[id] ?? null;
}
