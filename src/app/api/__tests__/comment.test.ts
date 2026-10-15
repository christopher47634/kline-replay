import { beforeEach, describe, expect, it, vi } from "vitest";
import { LruCache } from "@/lib/lruCache";
import { createRateLimiter } from "@/lib/rateLimit";

const alloc = (sh50: number) => ({ sh50, cyb: 0, bank: 0, baijiu: 0, cash: 100 - sh50, margin: 0 });
const base = { scriptId: "2015", month: 3, allocBefore: null, allocAfter: alloc(50), pnl: 0.02, marketReturn: 0.01 };

let n = 0;
async function post(body: unknown, ip = `10.0.${Math.floor(++n / 250)}.${n % 250}`) {
  const { POST } = await import("../comment/route");
  return POST(
    new Request("http://x/api/comment", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DEEPSEEK_API_KEY", "");
});

describe("POST /api/comment validation", () => {
  it.each([
    ["body null", "null"],
    ["body string", '"x"'],
    ["body array", "[]"],
    ["invalid json", "{"],
    ["unknown script", { ...base, scriptId: "1999" }],
    ["script id from prototype", { ...base, scriptId: "constructor" }],
    ["month length", { ...base, month: "length" }],
    ["month map", { ...base, month: "map" }],
    ["month out of range", { ...base, month: 12 }],
    ["month negative", { ...base, month: -1 }],
    ["month fractional", { ...base, month: 1.5 }],
    ["allocAfter string", { ...base, allocAfter: "x" }],
    ["allocAfter wrong sum", { ...base, allocAfter: { ...alloc(50), cash: 10 } }],
    ["allocAfter missing key", { ...base, allocAfter: { sh50: 100 } }],
    ["allocBefore junk", { ...base, allocBefore: { a: 1 } }],
    ["pnl not number", { ...base, pnl: "1" }],
  ])("%s -> 400", async (_name, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
  });

  it("accepts a well-formed request with the template fallback", async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    expect((await res.json()).source).toBe("template");
  });

  it("rate limits one IP", async () => {
    let last = 0;
    for (let i = 0; i < 32; i++) last = (await post(base, "9.9.9.9")).status;
    expect(last).toBe(429);
  });

  it("caps the cache: the oldest entry is evicted after 500 distinct keys", async () => {
    expect((await (await post(base)).json()).cached).toBeUndefined();
    expect((await (await post(base)).json()).cached).toBe(true);
    // 501 条以上不同的 key（每个请求换一个 IP 躲开限流）
    let sent = 0;
    for (let a = 0; a <= 20; a++)
      for (let b = 0; b <= 20 - a; b++) {
        if (a === 10 && b === 0) continue; // 那是 base 本身
        const allocAfter = { sh50: a * 5, cyb: b * 5, bank: 0, baijiu: 0, cash: 100 - a * 5 - b * 5, margin: 0 };
        await post({ ...base, month: 5, allocAfter });
        await post({ ...base, month: 6, allocAfter });
        await post({ ...base, month: 7, allocAfter });
        sent += 3;
      }
    expect(sent).toBeGreaterThan(500);
    expect((await (await post(base)).json()).cached).toBeUndefined();
  });
});

describe("LruCache / rate limiter", () => {
  it("never grows past max and refreshes on read", () => {
    const c = new LruCache<number>(3, 1000);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    c.get("a");
    c.set("d", 4);
    expect(c.size).toBe(3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
  });
  it("expires by ttl", () => {
    const c = new LruCache<number>(3, 1000);
    c.set("a", 1, 0);
    expect(c.get("a", 999)).toBe(1);
    expect(c.get("a", 1000)).toBeUndefined();
  });
  it("limits per key per window", () => {
    const allow = createRateLimiter(2, 1000, 2);
    expect([allow("k", 0), allow("k", 1), allow("k", 2)]).toEqual([true, true, false]);
    expect(allow("k", 1001)).toBe(true);
    allow("x", 0);
    allow("y", 0); // 超过 maxKeys 也不会无限增长
  });
});
