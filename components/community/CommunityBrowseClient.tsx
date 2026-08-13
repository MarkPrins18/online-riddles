"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import {
  listCommunityPacks,
  COMMUNITY_PACKS_PAGE_SIZE,
  type StoryPackWithScore,
  type CommunityPackSort,
} from "@/lib/supabase/communityPacks";
import { listFavoritePackIds } from "@/lib/supabase/packFavorites";
import { getProfiles } from "@/lib/supabase/profiles";
import { PackCard } from "@/components/community/PackCard";
import { Button } from "@/components/ui/Button";

export function CommunityBrowseClient() {
  const [packs, setPacks] = useState<StoryPackWithScore[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<CommunityPackSort>("new");
  const t = useTranslations("CommunityBrowseClient");
  const locale = useLocale();

  async function loadAuthorNames(newPacks: StoryPackWithScore[]) {
    const supabase = createClient();
    const authorIds = newPacks.map((p) => p.created_by).filter((id): id is string => !!id);
    if (authorIds.length === 0) return;
    const profiles = await getProfiles(supabase, authorIds);
    setAuthorNames((prev) => {
      const next = new Map(prev);
      for (const [id, profile] of profiles) next.set(id, profile.display_name);
      return next;
    });
  }

  // Switching sort mode starts over at the first page — the accumulated
  // list so far belongs to the old ordering, appending to it under a new
  // sort would interleave two different orderings.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPacks(null);
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const [{ packs: firstPage, hasMore: more }, favIds] = await Promise.all([
        listCommunityPacks(supabase, locale, sortMode),
        listFavoritePackIds(supabase, userId),
      ]);
      if (cancelled) return;
      setPacks(firstPage);
      setHasMore(more);
      setFavoriteIds(favIds);
      void loadAuthorNames(firstPage);
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, sortMode]);

  async function handleLoadMore() {
    if (!packs) return;
    setIsLoadingMore(true);
    try {
      const supabase = createClient();
      const { packs: nextPage, hasMore: more } = await listCommunityPacks(
        supabase,
        locale,
        sortMode,
        packs.length,
        COMMUNITY_PACKS_PAGE_SIZE
      );
      setPacks([...packs, ...nextPage]);
      setHasMore(more);
      void loadAuthorNames(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl italic text-text-primary">{t("heading")}</h1>
        <p className="mt-1 font-mono text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={sortMode === "new" ? "secondary" : "ghost"}
          onClick={() => setSortMode("new")}
        >
          {t("newest")}
        </Button>
        <Button
          type="button"
          variant={sortMode === "top" ? "secondary" : "ghost"}
          onClick={() => setSortMode("top")}
        >
          {t("top")}
        </Button>
      </div>

      {packs === null ? (
        <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>
      ) : packs.length === 0 ? (
        <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                score={pack.score}
                authorName={pack.created_by ? authorNames.get(pack.created_by) : undefined}
                initialFavorited={favoriteIds.has(pack.id)}
              />
            ))}
          </div>

          {hasMore && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="self-center"
            >
              {isLoadingMore ? t("loadingMore") : t("loadMore")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
