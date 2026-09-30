"use client";

import { useEffect } from "react";
import { applyPerf, watchJank } from "@/lib/perf";

/** Applies the saved quality step and watches for sustained jank (lib/perf.ts). Renders nothing. */
export function PerfGuard() {
  useEffect(() => {
    applyPerf();
    return watchJank();
  }, []);
  return null;
}
