import type { NextRequest } from "next/server";

const MAX_FIELD_LENGTH = 2000;
// A handful of fields at MAX_FIELD_LENGTH each is well under this — real
// beacons never get close. Rejecting on Content-Length before request.json()
// runs means an oversized body never gets fully parsed into memory.
const MAX_BODY_BYTES = 16_000;

// Best-effort, in-memory, per-instance only — not distributed-consistent
// across serverless instances, and resets on redeploy/cold start. That's
// an accepted tradeoff for this risk level (see the route's own comment):
// a real cap on cost/log-volume abuse without adding infrastructure for an
// unauthenticated, log-only endpoint.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function truncate(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : undefined;
}

// Unauthenticated by necessity — this fires before any session exists
// (pre-hydration crashes). Fields are truncated and only logged, never
// interpreted, to keep an abusive caller from doing more than bloating logs.
export async function POST(request: NextRequest) {
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(clientKey)) {
    return new Response(null, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!body || typeof body !== "object") {
    return new Response(null, { status: 204 });
  }

  const { message, stack, url } = body as Record<string, unknown>;

  console.error(
    JSON.stringify({
      level: "error",
      source: "client",
      message: truncate(message) ?? "Unknown client error",
      stack: truncate(stack),
      url: truncate(url),
      // Always server time, never client-supplied — a caller-controlled
      // timestamp string in an otherwise-legitimate-looking structured log
      // line is a cheap log-forging vector for no real benefit (server
      // receipt time is what matters for correlating client errors anyway).
      timestamp: new Date().toISOString(),
    })
  );

  return new Response(null, { status: 204 });
}
