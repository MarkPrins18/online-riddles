import type { NextRequest } from "next/server";

const MAX_FIELD_LENGTH = 2000;

function truncate(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : undefined;
}

// Unauthenticated by necessity — this fires before any session exists
// (pre-hydration crashes). Fields are truncated and only logged, never
// interpreted, to keep an abusive caller from doing more than bloating logs.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!body || typeof body !== "object") {
    return new Response(null, { status: 204 });
  }

  const { message, stack, url, timestamp } = body as Record<string, unknown>;

  console.error(
    JSON.stringify({
      level: "error",
      source: "client",
      message: truncate(message) ?? "Unknown client error",
      stack: truncate(stack),
      url: truncate(url),
      timestamp: typeof timestamp === "string" ? timestamp.slice(0, 40) : new Date().toISOString(),
    })
  );

  return new Response(null, { status: 204 });
}
