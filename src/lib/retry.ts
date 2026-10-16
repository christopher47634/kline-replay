/**
 * Lazy chunks can fail on a flaky connection or right after a redeploy (the old chunk file is gone).
 * Retry the import a couple of times before giving up; webpack forgets a failed chunk, so a second
 * import() really downloads it again. A final failure is caught by ChunkGuard, which reloads the page once.
 */
export function retryImport<T>(load: () => Promise<T>, tries = 3, wait = 500): Promise<T> {
  return load().catch((err) => {
    if (tries <= 1) throw err;
    return new Promise<T>((resolve, reject) => setTimeout(() => retryImport(load, tries - 1, wait * 2).then(resolve, reject), wait));
  });
}

export const isChunkError = (e: unknown) => {
  const s = e instanceof Error ? `${e.name} ${e.message}` : String(e ?? "");
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i.test(s);
};

const KEY = "kline:chunk-reload";

/** Reload once to pick up the current deployment; never more than once a minute (no reload loops). */
export function reloadForChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
