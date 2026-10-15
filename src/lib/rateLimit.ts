/**
 * 进程内的简易限流（固定窗口）。Vercel 多实例下各算各的，只用来挡住单个来源的狂刷，不是严格配额。
 * Map 有上限，超出时先清过期桶，仍满就丢最旧的，内存不会无限涨。
 */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 2000) {
  const buckets = new Map<string, { n: number; reset: number }>();
  return function allow(key: string, now = Date.now()): boolean {
    const b = buckets.get(key);
    if (!b || now >= b.reset) {
      if (buckets.size >= maxKeys) {
        for (const [k, v] of buckets) if (now >= v.reset) buckets.delete(k);
        if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value as string);
      }
      buckets.set(key, { n: 1, reset: now + windowMs });
      return true;
    }
    b.n += 1;
    return b.n <= limit;
  };
}

/** 取请求来源 IP（Vercel 会设置 x-forwarded-for，取第一段）。 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
