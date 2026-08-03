"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getProfile } from "@/lib/supabase/profiles";
import { listOwnPacks } from "@/lib/supabase/communityPacks";
import type { StoryPack, Puzzle } from "@/types/puzzle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SetNameForm } from "@/components/community/SetNameForm";
import { PackForm } from "@/components/community/PackForm";
import { RiddleForm } from "@/components/community/RiddleForm";

export function CommunityNewClient() {
  const [hasName, setHasName] = useState<boolean | null>(null);
  const [packs, setPacks] = useState<StoryPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [showNewPackForm, setShowNewPackForm] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  async function loadOwnPacks() {
    const supabase = createClient();
    const userId = await ensureAnonymousSession(supabase);
    const ownPacks = await listOwnPacks(supabase, userId);
    setPacks(ownPacks);
    if (ownPacks.length > 0) setSelectedPackId(ownPacks[0].id);
    else setShowNewPackForm(true);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const profile = await getProfile(supabase, userId);
      if (cancelled) return;
      setHasName(!!profile);
      if (profile) await loadOwnPacks();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (hasName === null) {
    return <p className="font-mono text-sm text-text-secondary">Even laden...</p>;
  }

  if (!hasName) {
    return (
      <SetNameForm
        onDone={async () => {
          setHasName(true);
          await loadOwnPacks();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl italic text-text-primary">Raadsel insturen</h1>

      <Card tone="chrome">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-secondary">
          Pack
        </p>
        {packs.length > 0 && !showNewPackForm && (
          <div className="flex items-center gap-3">
            <select
              value={selectedPackId ?? ""}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="flex-1 rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted"
            >
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name}
                </option>
              ))}
            </select>
            <Button type="button" variant="ghost" onClick={() => setShowNewPackForm(true)}>
              Nieuw pack
            </Button>
          </div>
        )}
        {showNewPackForm && (
          <div className="flex flex-col gap-3">
            <PackForm
              onCreated={(pack) => {
                setPacks((prev) => [pack, ...prev]);
                setSelectedPackId(pack.id);
                setShowNewPackForm(false);
              }}
            />
            {packs.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setShowNewPackForm(false)}>
                Annuleren
              </Button>
            )}
          </div>
        )}
      </Card>

      {selectedPackId && !showNewPackForm && (
        <Card tone="case">
          <RiddleForm
            packId={selectedPackId}
            onSaved={(puzzle: Puzzle) => setJustAdded(puzzle.title)}
          />
          {justAdded && (
            <p className="mt-3 font-mono text-xs text-accent">
              &ldquo;{justAdded}&rdquo; is toegevoegd. Vergeet niet je pack te publiceren via{" "}
              <Link href="/community/mijn" className="underline">
                Mijn packs
              </Link>
              .
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
