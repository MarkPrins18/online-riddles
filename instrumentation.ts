import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

function digestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    return String((error as { digest?: unknown }).digest);
  }
  return undefined;
}

// Runs on every uncaught server error (render, route handler, action).
// Always logs structured JSON so hosting-platform log capture (Vercel,
// Fly, ...) surfaces it even without Sentry configured; forwards to
// Sentry on top of that when SENTRY_DSN is set.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  console.error(
    JSON.stringify({
      level: "error",
      source: "onRequestError",
      message: error instanceof Error ? error.message : String(error),
      digest: digestOf(error),
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routerKind: context.routerKind,
      timestamp: new Date().toISOString(),
    })
  );

  if (process.env.SENTRY_DSN) {
    await Sentry.captureRequestError(error, request, context);
  }
};
