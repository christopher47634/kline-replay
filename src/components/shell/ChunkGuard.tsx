"use client";

import { useEffect } from "react";
import { isChunkError, reloadForChunk } from "@/lib/retry";

/** A script chunk that still failed after retries: reload once instead of leaving a half-loaded page. */
export function ChunkGuard() {
  useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      if (isChunkError(e.error ?? e.message)) reloadForChunk();
    };
    const onRej = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) reloadForChunk();
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  return null;
}
