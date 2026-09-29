"use client";

type Router = { push: (href: string) => void };

/**
 * Navigate with the View Transitions API so an element with the same `view-transition-name` on both pages
 * "flies" from one to the other (card → page header). Browsers without the API, and reduced motion, just navigate.
 */
export function navigateWithTransition(router: Router, href: string, opts: { skip?: boolean } = {}) {
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void> | void) => unknown };
  if (opts.skip || !doc.startViewTransition) {
    router.push(href);
    return;
  }
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        router.push(href);
        const start = performance.now();
        // resolve once the new route has painted (or after a safety timeout)
        const check = () => {
          if (location.pathname === href.split("?")[0] || performance.now() - start > 900) requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          else setTimeout(check, 16);
        };
        check();
      }),
  );
}
