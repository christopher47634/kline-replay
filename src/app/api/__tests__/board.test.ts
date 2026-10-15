import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allCash, playAll, totalReturn } from "@/game/engine";
import { encodeGame } from "@/game/encode";
import { getScript } from "@/lib/scripts";

const inserted: unknown[] = [];
let insertError: { code?: string } | null = null;

// 假的 Supabase：insert 记录下来，select 链返回 count 0
vi.mock("@/lib/board", async (orig) => {
  const real = await orig<typeof import("@/lib/board")>();
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.gt = () => chain;
  chain.then = (res: (v: unknown) => void) => res({ count: 0, error: null });
  return {
    ...real,
    boardEnabled: () => true,
    supabaseWriter: () => ({
      from: () => ({
        ...chain,
        insert: async (row: unknown) => {
          inserted.push(row);
          return { error: insertError };
        },
      }),
    }),
  };
});

const script = getScript("2015")!;
const allocs = Array.from({ length: 12 }, () => allCash());
const encoded = encodeGame("2015", allocs);
const ret = totalReturn(script, playAll(script, allocs));

let n = 0;
async function post(body: unknown) {
  const { POST } = await import("../board/route");
  return POST(
    new Request("http://x/api/board", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++n}` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  inserted.length = 0;
  insertError = null;
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/board", () => {
  const good = { encoded, nickname: "老张", ret };
  const flip = encoded.slice(0, -1) + (encoded.endsWith("A") ? "B" : "A");

  it.each([
    ["body null", "null"],
    ["body array", "[]"],
    ["invalid json", "{"],
    ["empty object", {}],
    ["bad nickname", { ...good, nickname: "傻逼" }],
    ["nickname too long", { ...good, nickname: "一二三四五六七八九" }],
    ["nickname not string", { ...good, nickname: 5 }],
    ["tampered encoded", { ...good, encoded: flip }],
    ["encoded not string", { ...good, encoded: 1 }],
    ["ret off by 1e-5", { ...good, ret: ret + 1e-5 }],
    ["ret not number", { ...good, ret: "0" }],
    ["ret null", { ...good, ret: null }],
  ])("%s -> 400 and nothing is written", async (_n, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("writes a valid score with the canonical encoding", async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ script_id: "2015", nickname: "老张", encoded });
  });

  it("returns 409 for a duplicate result (unique constraint)", async () => {
    insertError = { code: "23505" };
    expect((await post(good)).status).toBe(409);
  });
});
