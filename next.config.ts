import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking: without this, any origin could iframe this app
          // (including /auth/confirm and account/community pages with
          // real state-changing actions) and trick a click.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Room codes appear in the path (/room/ABC123) — this keeps them
          // out of the Referer header sent to third-party resources on
          // outbound navigation.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // No Content-Security-Policy yet: this app talks to a
          // Supabase project URL and (optionally) a Sentry ingest host
          // that are only known at deploy time via env vars, and Next's
          // own inline-script/style needs have to be mapped out against a
          // real running instance first — shipping an unverified CSP risks
          // silently breaking Realtime or error reporting. Ship as
          // Content-Security-Policy-Report-Only against a real deployment
          // first, confirm no violations across the actual game flow, then
          // promote to enforcing in a follow-up change.
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
