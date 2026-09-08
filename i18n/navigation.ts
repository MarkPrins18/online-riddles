import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/usePathname/useRouter/redirect/getPathname. Use these
// (not next/link or next/navigation) for anything that targets a page
// under app/[locale] — i.e. "/", "/community" and its sub-routes, and
// "/privacy". Anything targeting /room, /profile, /api, or /auth must keep
// using the plain next/link and next/navigation versions instead: those
// routes live outside the [locale] segment (see middleware.ts), so
// prefixing them with a locale would point at a URL that doesn't exist.
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
