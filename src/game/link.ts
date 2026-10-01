import { encodeGame } from "./encode";
import { encodeNotes } from "./notes";
import type { MonthNote, RoundRecord, TaskId } from "./types";

/**
 * Result link. `s` (the 12 allocations) is all the score depends on, so old links keep working unchanged;
 * `t` names the task card the game was played under and `n` carries the optional reasons (game/notes.ts).
 */
export function resultHref(scriptId: string, history: RoundRecord[], opts: { task?: TaskId | null; notes?: Record<number, MonthNote>; blind?: boolean } = {}) {
  const q = new URLSearchParams({ s: encodeGame(scriptId, history.map((h) => h.alloc)) });
  if (opts.task) q.set("t", opts.task);
  const n = opts.notes ? encodeNotes(opts.notes) : "";
  if (n) q.set("n", n);
  if (opts.blind) q.set("blind", "1");
  return `/result?${q.toString()}`;
}

/** Same year, same task, fresh game: what a challenge link opens. */
export const challengeHref = (scriptId: string, task: TaskId | null) => `/play/${scriptId}${task ? `?t=${task}` : ""}`;
