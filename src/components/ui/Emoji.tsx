/* eslint-disable @next/next/no-img-element */

/**
 * Microsoft Fluent Emoji (「Color」 style, MIT) copied into public/art/emoji by scripts/build_art.mjs.
 * Same drawing on every phone and computer, instead of whatever the system emoji font looks like.
 * Falls back to the Unicode character when no artwork is given.
 */
export function Emoji({ art, char, size, className = "" }: { art?: string; char: string; size: number; className?: string }) {
  if (!art) return <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden>{char}</span>;
  return <img src={`/art/emoji/${art}.svg`} alt="" aria-hidden width={size} height={size} className={className} style={{ width: size, height: size }} draggable={false} />;
}
