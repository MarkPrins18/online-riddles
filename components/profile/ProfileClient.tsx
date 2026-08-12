"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession, getCurrentUser, linkEmailToSession } from "@/lib/supabase/authSession";
import { getPlayerStats } from "@/lib/supabase/playerStats";
import type { PlayerStats } from "@/types/playerStats";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const EMPTY_STATS: Omit<PlayerStats, "user_id" | "updated_at"> = {
  games_played: 0,
  rounds_solved: 0,
  rounds_narrated: 0,
  lifetime_score: 0,
};

export function ProfileClient() {
  const t = useTranslations("Profile");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        await ensureAnonymousSession(supabase);
        const current = await getCurrentUser(supabase);
        if (cancelled) return;
        setUser(current);

        if (current && !current.is_anonymous) {
          const playerStats = await getPlayerStats(supabase, current.id);
          if (!cancelled) setStats(playerStats);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, t("loadError")));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      await linkEmailToSession(supabase, email.trim());
      setLinkSent(true);
    } catch (err) {
      setError(getErrorMessage(err, t("linkError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user === undefined) {
    return <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>;
  }

  const isRegistered = !!user && !user.is_anonymous;

  if (!isRegistered) {
    return (
      <Card tone="chrome" className="max-w-md">
        <h1 className="font-serif text-xl text-text-primary">{t("upgradeTitle")}</h1>
        <p className="mt-2 font-mono text-sm leading-relaxed text-text-secondary">
          {t("upgradeBody")}
        </p>

        {linkSent ? (
          <p role="status" className="mt-4 font-mono text-sm text-accent">
            {t("linkSent", { email: email.trim() })}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <label htmlFor="profile-email" className="font-mono text-xs uppercase tracking-widest text-text-secondary">
              {t("emailLabel")}
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
            />
            {error && (
              <p role="alert" className="font-mono text-xs text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="secondary" disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        )}
      </Card>
    );
  }

  const displayStats = stats ?? EMPTY_STATS;

  return (
    <Card tone="chrome" className="max-w-md">
      <h1 className="font-serif text-xl text-text-primary">{t("statsTitle")}</h1>
      <p className="mt-1 font-mono text-xs text-text-secondary">{user!.email}</p>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("gamesPlayed")}
          </dt>
          <dd className="font-serif text-2xl text-text-primary">{displayStats.games_played}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("roundsSolved")}
          </dt>
          <dd className="font-serif text-2xl text-text-primary">{displayStats.rounds_solved}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("roundsNarrated")}
          </dt>
          <dd className="font-serif text-2xl text-text-primary">{displayStats.rounds_narrated}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("lifetimeScore")}
          </dt>
          <dd className="font-serif text-2xl text-text-primary">{displayStats.lifetime_score}</dd>
        </div>
      </dl>

      {!stats && (
        <p className="mt-4 font-mono text-xs text-text-secondary">{t("noStatsYet")}</p>
      )}
    </Card>
  );
}
