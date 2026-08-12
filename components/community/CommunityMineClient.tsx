"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { listOwnPacks, setOwnPackPublished } from "@/lib/supabase/communityPacks";
import { listOwnPuzzles, deleteOwnPuzzle } from "@/lib/supabase/communityPuzzles";
import { getVoteTotals } from "@/lib/supabase/votes";
import type { StoryPack, Puzzle } from "@/types/puzzle";
import type { PuzzleVoteTotals } from "@/types/vote";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RiddleForm } from "@/components/community/RiddleForm";
import { AccountNudgeBanner } from "@/components/account/AccountNudgeBanner";

export function CommunityMineClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [packs, setPacks] = useState<StoryPack[]>([]);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [totals, setTotals] = useState<Map<string, PuzzleVoteTotals>>(new Map());
  const [editingPuzzleId, setEditingPuzzleId] = useState<string | null>(null);
  const t = useTranslations("CommunityMineClient");
  const locale = useLocale();

  async function reload() {
    const supabase = createClient();
    const userId = await ensureAnonymousSession(supabase);
    const [ownPacks, ownPuzzles] = await Promise.all([
      listOwnPacks(supabase, userId, locale),
      listOwnPuzzles(supabase, userId, locale),
    ]);
    setPacks(ownPacks);
    setPuzzles(ownPuzzles);
    setTotals(await getVoteTotals(supabase, ownPuzzles.map((p) => p.id)));
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await reload();
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // reload() closes over `locale` directly and is redefined every render;
    // including it here would just make this effect re-run every render
    // for no behavioral difference beyond the locale actually changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function togglePublish(pack: StoryPack) {
    const supabase = createClient();
    await setOwnPackPublished(supabase, pack.id, !pack.is_published);
    setPacks((prev) =>
      prev.map((p) => (p.id === pack.id ? { ...p, is_published: !p.is_published } : p))
    );
  }

  async function removePuzzle(puzzleId: string) {
    const supabase = createClient();
    await deleteOwnPuzzle(supabase, puzzleId);
    setPuzzles((prev) => prev.filter((p) => p.id !== puzzleId));
  }

  if (isLoading) {
    return <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl italic text-text-primary">{t("heading")}</h1>
        <Link href="/community/nieuw">
          <Button>{t("submitButton")}</Button>
        </Link>
      </div>

      <AccountNudgeBanner packs={packs} puzzles={puzzles} />

      {packs.length === 0 ? (
        <p className="font-mono text-sm text-text-secondary">{t("noPacksYet")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {packs.map((pack) => {
            const packPuzzles = puzzles.filter((p) => p.pack_id === pack.id);
            return (
              <Card key={pack.id} tone="chrome" className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-xl italic text-text-primary">{pack.name}</h2>
                    <Badge tone="accent" className="mt-1">
                      {pack.theme}
                    </Badge>
                  </div>
                  <Button variant={pack.is_published ? "secondary" : "primary"} onClick={() => togglePublish(pack)}>
                    {pack.is_published ? t("unpublish") : t("publish")}
                  </Button>
                </div>

                {packPuzzles.length === 0 ? (
                  <p className="font-mono text-xs text-text-secondary">{t("noPuzzlesYet")}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {packPuzzles.map((puzzle) => (
                      <li key={puzzle.id} className="border-t border-white/5 pt-2">
                        {editingPuzzleId === puzzle.id ? (
                          <RiddleForm
                            packId={pack.id}
                            puzzle={puzzle}
                            onSaved={(updated) => {
                              setPuzzles((prev) =>
                                prev.map((p) => (p.id === updated.id ? updated : p))
                              );
                              setEditingPuzzleId(null);
                            }}
                            onCancel={() => setEditingPuzzleId(null)}
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-3 font-mono text-sm">
                            <span className="text-text-primary">{puzzle.title}</span>
                            <span className="flex items-center gap-3">
                              <span className="text-text-secondary">
                                {t("scoreLabel", { score: totals.get(puzzle.id)?.score ?? 0 })}
                              </span>
                              <Button variant="ghost" onClick={() => setEditingPuzzleId(puzzle.id)}>
                                {t("edit")}
                              </Button>
                              <Button variant="ghost" onClick={() => removePuzzle(puzzle.id)}>
                                {t("delete")}
                              </Button>
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
