This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Puzzle content (story packs)

Puzzles live in Supabase, grouped into **story packs** by theme (`Crime`,
`Sci-Fi`, `Absurd`, ...). A pack is a draft until you flip `is_published`,
at which point its puzzles become eligible for `getRandomPuzzle` (see the
`published_puzzles` view in [`supabase/schema.sql`](supabase/schema.sql)).

Run `supabase/schema.sql` once in the Supabase SQL editor to create the
tables (`story_packs`, `puzzles`) and seed a starter pack.

Add puzzles either via the CLI script or the admin API — both share the
same validation and upsert logic (`lib/admin/importPuzzlePack.ts`), so
re-running the same file is safe: pack metadata is updated in place and
duplicate `(pack, title)` pairs are skipped.

**Script** (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):

```bash
npm run puzzles:import -- packs/example-pack.json
```

**API** (`POST /api/admin/puzzles`, needs `ADMIN_IMPORT_SECRET` in
`.env.local`):

```bash
curl -X POST http://localhost:3000/api/admin/puzzles \
  -H "x-admin-secret: $ADMIN_IMPORT_SECRET" \
  -H "Content-Type: application/json" \
  --data @packs/example-pack.json
```

See [`packs/example-pack.json`](packs/example-pack.json) for the JSON
shape. `GET /api/admin/puzzles` (same header) lists packs with their
puzzle counts and publish state.

## Monitoring & error tracking

Server and client errors are always logged as structured JSON (via Next's
`instrumentation.ts`/`instrumentation-client.ts` hooks), so any hosting
platform that captures stdout/stderr (Vercel, Fly, ...) already gives you
searchable error logs with no setup.

To also get alerting, stack traces, and a dashboard, add a
[Sentry](https://sentry.io) project and set:

```bash
SENTRY_DSN=...              # server-side
NEXT_PUBLIC_SENTRY_DSN=...  # client-side
```

Leave both empty and the app runs exactly as before — Sentry is a no-op
until a DSN is configured. See `.env.example` for the full list of env
vars, and `app/error.tsx`/`app/global-error.tsx` for the user-facing
fallback UI shown when a page crashes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
