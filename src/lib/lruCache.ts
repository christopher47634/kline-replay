/** 有容量上限的 TTL 缓存：满了就淘汰最久没用的（Map 的插入顺序即新旧顺序）。 */
export class LruCache<V> {
  private map = new Map<string, { v: V; at: number }>();
  constructor(
    private max: number,
    private ttlMs: number,
  ) {}

  get(key: string, now = Date.now()): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (now - hit.at >= this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, hit); // 刷新为最新
    return hit.v;
  }

  set(key: string, v: V, now = Date.now()) {
    this.map.delete(key);
    this.map.set(key, { v, at: now });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }

  get size() {
    return this.map.size;
  }
}
