"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function BoardSubmit({ code, ret, scriptId }: { code: string; ret: number; scriptId: string }) {
  const [name, setName] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg?: string; rank?: number }>({ kind: "idle" });

  const submit = async () => {
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ encoded: code, nickname: name, ret }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "上榜失败");
      setState({ kind: "ok", rank: j.rank });
    } catch (e) {
      setState({ kind: "err", msg: e instanceof Error ? e.message : "上榜失败" });
    }
  };

  return (
    <section aria-label="上榜" className="mt-6 rounded-2xl bg-card border border-line p-5">
      <h2 className="font-bold">上排行榜</h2>
      {state.kind === "ok" ? (
        <p className="mt-2">
          上榜成功，当前排第 <span className="num text-gold font-bold">{state.rank}</span> 名。
          <Link href={`/board/${scriptId}`} className="ml-2 text-gold underline underline-offset-4">
            查看排行榜
          </Link>
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={name}
            maxLength={8}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称，最多 8 个字"
            aria-label="昵称"
            className="h-10 flex-1 min-w-40 rounded-lg bg-bg border border-line px-3 focus:outline-none focus:border-gold"
          />
          <Button onClick={submit} disabled={!name.trim() || state.kind === "busy"}>
            {state.kind === "busy" ? "提交中…" : "上榜"}
          </Button>
          {state.kind === "err" && (
            <p role="alert" className="basis-full text-sm text-up">
              {state.msg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
