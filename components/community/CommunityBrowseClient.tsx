"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const data = await listCommunityPacks(supabase);
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
  }, []);

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
        <h1 className="font-serif text-3xl italic text-text-primary">Community-packs</h1>
        <p className="mt-1 font-mono text-sm text-text-secondary">
          Door spelers gemaakt, door spelers gestemd.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={sortMode === "new" ? "secondary" : "ghost"}
          onClick={() => setSortMode("new")}
        >
          Nieuwste
        </Button>
        <Button
          type="button"
          variant={sortMode === "top" ? "secondary" : "ghost"}
          onClick={() => setSortMode("top")}
        >
          Populairste
        </Button>
      </div>

      {sortedPacks === null ? (
        <p className="font-mono text-sm text-text-secondary">Packs laden...</p>
      ) : sortedPacks.length === 0 ? (
        <p className="font-mono text-sm text-text-secondary">
          Nog geen gepubliceerde community-packs — wees de eerste.
        </p>
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
