// `node scripts/build_art.mjs`: ready-made artwork instead of hand-drawn SVG (see THIRD_PARTY_NOTICES.md).
//   public/art/laoge.svg, laoge-wow.svg  股吧老哥 — DiceBear「Open Peeps」(Pablo Stanley, CC0): the usual squint and the double take
//   public/art/emoji/*.svg                Microsoft Fluent Emoji「Color」(MIT) for the personas and a few UI accents
// Both packages are dev dependencies; only the generated files ship.
import { createAvatar } from "@dicebear/core";
import * as openPeeps from "@dicebear/open-peeps";
import { copyFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = "public/art";
mkdirSync(join(OUT, "emoji"), { recursive: true });

const laoge = (face) =>
  createAvatar(openPeeps, {
    seed: "gubalaoge",
    head: ["hatHip"],
    face: [face],
    facialHair: ["moustache3"],
    facialHairProbability: 100,
    accessories: ["glasses"],
    accessoriesProbability: 100,
    maskProbability: 0,
    skinColor: ["edb98a"],
    clothingColor: ["8fa7df"],
    headContrastColor: ["2c1b18"],
  }).toString();
writeFileSync(join(OUT, "laoge.svg"), laoge("suspicious"));
writeFileSync(join(OUT, "laoge-wow.svg"), laoge("awe"));

// persona id → Fluent emoji file (content/personas.json keeps the Unicode emoji for share text and screen readers)
const EMOJI = {
  "roller-coaster": "roller-coaster",
  parachute: "parachute",
  bullseye: "bullseye",
  surfer: "person-surfing-default",
  bird: "bird",
  gem: "gem-stone",
  wave: "water-wave",
  question: "white-question-mark",
  fire: "fire",
  headphone: "headphone",
  "chart-up": "chart-increasing",
};
const SRC = "node_modules/fluentui-emoji/icons/modern";
for (const [name, file] of Object.entries(EMOJI)) copyFileSync(join(SRC, `${file}.svg`), join(OUT, "emoji", `${name}.svg`));

for (const f of ["laoge.svg", "laoge-wow.svg", ...Object.keys(EMOJI).map((n) => `emoji/${n}.svg`)]) console.log(f, Math.round(statSync(join(OUT, f)).size / 1024), "KB");
