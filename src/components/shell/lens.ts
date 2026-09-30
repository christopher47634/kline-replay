/*
 * Liquid-glass lens (after Apple's Liquid Glass): the rim of a glass control bends what is behind it like a convex
 * lens. Each .lg element gets its own displacement map, sized to it: inside a bezel along the edge every pixel
 * samples from further in (toward the centre), most at the very edge and fading to nothing at the bezel's inner
 * side. So the colour seen on the rim is the content's own colour, magnified and bent — no painted rainbow.
 * Red, green and blue shift by 100% / 94% / 88%: a faint dispersion that only shows where the background has edges.
 * SVG filters inside backdrop-filter are Chromium-only; elsewhere the glass is blur + highlight.
 */

const SVG = "http://www.w3.org/2000/svg";

/** RGBA map: R/G carry the x/y shift (128 = none). Exported for tests. */
export function lensMap(w: number, h: number, r: number, bezel: number): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  const hw = w / 2;
  const hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const out = Math.hypot(ox, oy);
      const depth = -(out + Math.min(Math.max(qx, qy), 0) - r); // distance in from the rounded edge
      let dx = 0;
      let dy = 0;
      if (depth > 0 && depth < bezel) {
        let nx = 0;
        let ny = 0;
        if (qx > 0 && qy > 0) {
          nx = ox / out;
          ny = oy / out;
        } else if (qx > qy) nx = 1;
        else ny = 1;
        const m = Math.pow(1 - depth / bezel, 2.2);
        dx = -Math.sign(px) * nx * m;
        dy = -Math.sign(py) * ny * m;
      }
      d[i] = Math.round(128 + dx * 127);
      d[i + 1] = Math.round(128 + dy * 127);
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  return d;
}

export const bezelFor = (w: number, h: number) => Math.max(5, Math.min(Math.min(w, h) * 0.3, 16));

export function lensFilter(id: string, w: number, h: number, r: number): SVGFilterElement {
  const bezel = bezelFor(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(lensMap(w, h, r, bezel) as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  const S = bezel * 1.25; // feDisplacementMap shifts by scale × (channel − 0.5)
  const set = (el: Element, a: Record<string, string | number>) => Object.entries(a).forEach(([k, v]) => el.setAttribute(k, String(v)));
  const f = document.createElementNS(SVG, "filter");
  set(f, { id, x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
  const add = (tag: string, a: Record<string, string | number>) => {
    const el = document.createElementNS(SVG, tag);
    set(el, a);
    f.appendChild(el);
  };
  add("feImage", { href: c.toDataURL(), x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "map" });
  const keep = ["1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"];
  [1, 0.94, 0.88].forEach((k, j) => {
    add("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: (S * k).toFixed(2), xChannelSelector: "R", yChannelSelector: "G", result: `d${j}` });
    add("feColorMatrix", { in: `d${j}`, type: "matrix", values: keep[j], result: `c${j}` });
  });
  add("feBlend", { in: "c0", in2: "c1", mode: "screen", result: "c01" });
  add("feBlend", { in: "c01", in2: "c2", mode: "screen" });
  return f;
}
