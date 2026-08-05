"use client";

import { useEffect } from "react";

/**
 * Registers the no-op service worker (public/sw.js) that PWA installability
 * needs — production only, since a service worker fighting with dev-mode
 * HMR is a headache nobody needs and buys nothing in dev anyway.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort — installability is a nice-to-have, not something
      // worth surfacing an error to the player over.
    });
  }, []);

  return null;
}
