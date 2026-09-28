"use client";

import { useEffect, useState } from "react";

export function BoardCount({ scriptId }: { scriptId: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    fetch(`/api/board?script=${scriptId}`)
      .then((r) => r.json())
      .then((j) => setN(typeof j.count === "number" ? j.count : null))
      .catch(() => {});
  }, [scriptId]);
  if (!n) return null;
  return (
    <span>
      已有 <span className="num text-ink">{n}</span> 人挑战
    </span>
  );
}
