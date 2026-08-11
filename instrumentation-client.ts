import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
} else if (typeof window !== "undefined") {
  // No Sentry configured: fall back to a lightweight beacon so crashes
  // outside React's error boundaries (event handlers, pre-hydration
  // failures) still reach server logs instead of only the player's console.
  const report = (message: string, stack?: string) => {
    try {
      const body = JSON.stringify({
        message,
        stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
      const sent = navigator.sendBeacon?.(
        "/api/monitoring/client-error",
        new Blob([body], { type: "application/json" })
      );
      if (!sent) {
        fetch("/api/monitoring/client-error", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }
    } catch {
      // Reporting must never itself throw.
    }
  };

  window.addEventListener("error", (event) => {
    report(event.message, event.error?.stack);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    report(
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : undefined
    );
  });
}
