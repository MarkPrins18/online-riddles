"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { listCommunityPacks, type StoryPackWithScore } from "@/lib/supabase/communityPacks";
import { getProfiles } from "@/lib/supabase/profiles";
import { PackCard } from "@/components/community/PackCard";
import { Button } from "@/components/ui/Button";

type SortMode = "new" | "top";

export function CommunityBrowseClient() {
  const [packs, setPacks] = useState<StoryPackWithScore[] | null>(null);
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const t = useTranslations("CommunityBrowseClient");
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const data = await listCommunityPacks(supabase, locale);
      if (cancelled) return;
      setPacks(data);

      const authorIds = data.map((p) => p.created_by).filter((id): id is string => !!id);
      const profiles = await getProfiles(supabase, authorIds);
      if (!cancelled) {
        setAuthorNames(new Map([...profiles].map(([id, profile]) => [id, profile.display_name])));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const sortedPacks = useMemo(() => {
    if (!packs) return null;
    // listCommunityPacks already orders by created_at desc — "new" needs no
    // extra work, only "top" re-sorts.
    if (sortMode === "new") return packs;
    return [...packs].sort((a, b) => b.score - a.score);
  }, [packs, sortMode]);

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

      {sortedPacks === null ? (
        <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>
      ) : sortedPacks.length === 0 ? (
        <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedPacks.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              score={pack.score}
              authorName={pack.created_by ? authorNames.get(pack.created_by) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
