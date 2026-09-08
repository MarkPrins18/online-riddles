import { describe, expect, it, vi } from "vitest";
import { ensureAnonymousSession } from "./authSession";

function fakeSupabase({
  sessions,
  signInResult,
}: {
  sessions: Array<{ user: { id: string } } | null>;
  signInResult?: { id: string } | Error;
}) {
  let call = 0;
  return {
    auth: {
      getSession: vi.fn().mockImplementation(() => {
        const session = sessions[Math.min(call, sessions.length - 1)];
        call += 1;
        return Promise.resolve({ data: { session } });
      }),
      signInAnonymously: vi.fn().mockImplementation(() => {
        if (signInResult instanceof Error) {
          return Promise.resolve({ data: { user: null }, error: signInResult });
        }
        return Promise.resolve({ data: { user: signInResult ?? null }, error: null });
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("ensureAnonymousSession", () => {
  it("returns the existing session's user id without signing in anonymously", async () => {
    const supabase = fakeSupabase({ sessions: [{ user: { id: "existing-user" } }] });

    await expect(ensureAnonymousSession(supabase)).resolves.toBe("existing-user");
    expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously when there is no session yet", async () => {
    const supabase = fakeSupabase({ sessions: [null], signInResult: { id: "new-anon-user" } });

    await expect(ensureAnonymousSession(supabase)).resolves.toBe("new-anon-user");
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent calls while no session exists yet", async () => {
    const supabase = fakeSupabase({ sessions: [null], signInResult: { id: "new-anon-user" } });

    const [a, b] = await Promise.all([
      ensureAnonymousSession(supabase),
      ensureAnonymousSession(supabase),
    ]);

    expect(a).toBe("new-anon-user");
    expect(b).toBe("new-anon-user");
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("picks up a session change instead of replaying a stale cached id", async () => {
    // Regression test: an anonymous session that later gets swapped for a
    // permanent account (e.g. verifying an email code) must be reflected on
    // the very next call — a stale id here sends writes whose `id` no
    // longer matches auth.uid(), failing RLS with a 403.
    const supabase = fakeSupabase({
      sessions: [{ user: { id: "anon-user" } }, { user: { id: "upgraded-account-user" } }],
    });

    await expect(ensureAnonymousSession(supabase)).resolves.toBe("anon-user");
    await expect(ensureAnonymousSession(supabase)).resolves.toBe("upgraded-account-user");
  });

  it("throws and allows a retry when signInAnonymously errors", async () => {
    const supabase = fakeSupabase({ sessions: [null], signInResult: new Error("network down") });

    await expect(ensureAnonymousSession(supabase)).rejects.toThrow("network down");
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);

    // A retry after the failure should attempt again, not replay the
    // rejected in-flight promise forever.
    await ensureAnonymousSession(supabase).catch(() => {});
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });
});
