"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getAccountStatus, type AccountStatus } from "@/lib/supabase/accountAuth";
import { getPlayerStats } from "@/lib/supabase/playerStats";
import type { PlayerStats } from "@/types/playerStats";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AccountModal } from "@/components/account/AccountModal";

const EMPTY_STATS: Omit<PlayerStats, "user_id" | "updated_at"> = {
  games_played: 0,
  rounds_solved: 0,
  rounds_narrated: 0,
  lifetime_score: 0,
};

// Account creation/sign-in itself is handled entirely by AccountModal (see
// components/account/) — that already covers magic-link, password, and
// cross-device sign-in, and is reused as-is here rather than duplicated.
// This component only adds the stats-specific explainer and the stats
// display once an account exists.
export function ProfileClient() {
  const t = useTranslations("Profile");
  const [status, setStatus] = useState<AccountStatus | null | undefined>(undefined);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  async function refresh(guard?: () => boolean) {
    try {
      const supabase = createClient();
      await ensureAnonymousSession(supabase);
      const current = await getAccountStatus(supabase);
      if (guard && !guard()) return;
      setStatus(current);

      if (current && !current.isAnonymous) {
        const playerStats = await getPlayerStats(supabase, current.id);
        if (!guard || guard()) setStats(playerStats);
      }
    } catch (err) {
      if (!guard || guard()) setError(getErrorMessage(err, t("loadError")));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh(() => !cancelled);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === undefined) {
    return <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>;
  }

  const isRegistered = !!status && !status.isAnonymous;

  return (
    <>
      <Card tone="chrome" className="max-w-md">
        {isRegistered ? (
          <>
            <h1 className="font-serif text-xl text-text-primary">{t("statsTitle")}</h1>
            <p className="mt-1 font-mono text-xs text-text-secondary">{status.email}</p>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
                  {t("gamesPlayed")}
                </dt>
                <dd className="font-serif text-2xl text-text-primary">
                  {(stats ?? EMPTY_STATS).games_played}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
                  {t("roundsSolved")}
                </dt>
                <dd className="font-serif text-2xl text-text-primary">
                  {(stats ?? EMPTY_STATS).rounds_solved}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
                  {t("roundsNarrated")}
                </dt>
                <dd className="font-serif text-2xl text-text-primary">
                  {(stats ?? EMPTY_STATS).rounds_narrated}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-text-secondary">
                  {t("lifetimeScore")}
                </dt>
                <dd className="font-serif text-2xl text-text-primary">
                  {(stats ?? EMPTY_STATS).lifetime_score}
                </dd>
              </div>
            </dl>

            {!stats && <p className="mt-4 font-mono text-xs text-text-secondary">{t("noStatsYet")}</p>}

            <Button variant="ghost" className="mt-5" onClick={() => setAccountModalOpen(true)}>
              {t("manageAccount")}
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-xl text-text-primary">{t("upgradeTitle")}</h1>
            <p className="mt-2 font-mono text-sm leading-relaxed text-text-secondary">
              {t("upgradeBody")}
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => setAccountModalOpen(true)}>
              {t("upgradeCta")}
            </Button>
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 font-mono text-xs text-danger">
            {error}
          </p>
        )}
      </Card>

      {accountModalOpen && (
        <AccountModal
          onClose={() => {
            setAccountModalOpen(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
