"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { RoomSettingsInput } from "@/types/room";
import { getOfficialThemes } from "@/lib/supabase/storyPacks";
import { countPublishedCommunityPacks } from "@/lib/supabase/communityPacks";

const DURATION_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "5 minuten", value: 300 },
  { label: "10 minuten", value: 600 },
  { label: "15 minuten", value: 900 },
  { label: "20 minuten", value: 1200 },
  { label: "Geen limiet", value: null },
];

const ROUND_COUNT_OPTIONS = [3, 5, 7, 10];
const TEAM_LIVES_OPTIONS = [3, 5, 8];

export function RoomSettingsForm({
  supabase,
  value,
  onChange,
  narratorPreviewName,
}: {
  supabase: SupabaseClient<Database>;
  value: RoomSettingsInput;
  onChange: (value: RoomSettingsInput) => void;
  narratorPreviewName?: string;
}) {
  const [officialThemes, setOfficialThemes] = useState<string[] | null>(null);
  const [communityPackCount, setCommunityPackCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOfficialThemes(supabase).then((themes) => {
      if (cancelled) return;
      setOfficialThemes(themes);
      if (value.packThemeFilter.length === 0 && themes.length > 0) {
        onChange({ ...value, packThemeFilter: themes });
      }
    });
    countPublishedCommunityPacks(supabase).then((count) => {
      if (!cancelled) setCommunityPackCount(count);
    });
    return () => {
      cancelled = true;
    };
    // Only load once on mount — re-running on every `value`/`onChange`
    // identity change would refetch needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function toggleTheme(theme: string) {
    const isSelected = value.packThemeFilter.includes(theme);
    const next = isSelected
      ? value.packThemeFilter.filter((t) => t !== theme)
      : [...value.packThemeFilter, theme];
    onChange({ ...value, packThemeFilter: next });
  }

  function toggleCommunity(enabled: boolean) {
    onChange({ ...value, communityPackIds: enabled ? null : [] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="round-duration"
          className="mb-1 block font-mono text-xs uppercase tracking-widest text-text-secondary"
        >
          Tijd per ronde
        </label>
        <select
          id="round-duration"
          value={value.roundDurationSeconds === null ? "none" : value.roundDurationSeconds}
          onChange={(e) =>
            onChange({
              ...value,
              roundDurationSeconds: e.target.value === "none" ? null : Number(e.target.value),
            })
          }
          className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted"
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option.label} value={option.value === null ? "none" : option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="round-count"
          className="mb-1 block font-mono text-xs uppercase tracking-widest text-text-secondary"
        >
          Aantal rondes
        </label>
        <select
          id="round-count"
          value={value.maxRounds}
          onChange={(e) => onChange({ ...value, maxRounds: Number(e.target.value) })}
          className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted"
        >
          {ROUND_COUNT_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count} rondes
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-1 font-mono text-xs uppercase tracking-widest text-text-secondary">
          Thema&rsquo;s
        </legend>
        {officialThemes === null ? (
          <p className="font-mono text-xs text-text-secondary">Thema&rsquo;s laden...</p>
        ) : officialThemes.length === 0 ? (
          <p className="font-mono text-xs text-text-secondary">
            Nog geen gepubliceerde puzzels beschikbaar.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {officialThemes.map((theme) => (
              <label key={theme} className="flex items-center gap-2 font-mono text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={value.packThemeFilter.includes(theme)}
                  onChange={() => toggleTheme(theme)}
                />
                {theme}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="border-t border-white/5 pt-4">
        <legend className="mb-1 font-mono text-xs uppercase tracking-widest text-text-secondary">
          Community
        </legend>
        {communityPackCount === null ? (
          <p className="font-mono text-xs text-text-secondary">Community laden...</p>
        ) : communityPackCount === 0 ? (
          <p className="font-mono text-xs text-text-secondary">
            Nog geen gepubliceerde community-packs.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
              <input
                type="checkbox"
                className="accent-accent"
                checked={value.communityPackIds === null}
                onChange={(e) => toggleCommunity(e.target.checked)}
              />
              Community packs meespelen
              <span className="font-mono text-xs text-text-secondary">({communityPackCount})</span>
            </label>
            <p className="mt-1 font-mono text-xs text-text-secondary">
              Raadsels gemaakt door andere spelers, los van de officiële thema&rsquo;s hierboven.
            </p>
          </>
        )}
      </fieldset>

      {officialThemes !== null &&
        communityPackCount !== null &&
        officialThemes.length + communityPackCount > 0 &&
        value.packThemeFilter.length === 0 &&
        (value.communityPackIds === null ? communityPackCount === 0 : value.communityPackIds.length === 0) && (
          <p className="font-mono text-xs text-danger">
            Kies minstens één thema of community pack.
          </p>
        )}

      <div className="border-t border-white/5 pt-4">
        <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
          <input
            type="checkbox"
            className="accent-accent"
            checked={value.hardcoreMode}
            onChange={(e) => onChange({ ...value, hardcoreMode: e.target.checked })}
          />
          Hardcore modus — gedeelde team-levens
        </label>
        <p className="mt-1 font-mono text-xs text-text-secondary">
          Elke foute gok kost het hele team 1 leven. Op 0 levens is het game over voor de
          hele sessie.
        </p>

        {value.hardcoreMode && (
          <div className="mt-3">
            <label
              htmlFor="team-lives"
              className="mb-1 block font-mono text-xs uppercase tracking-widest text-text-secondary"
            >
              {narratorPreviewName
                ? `${narratorPreviewName} bepaalt: hoeveel levens krijgt het team?`
                : "Hoeveel levens krijgt het team?"}
            </label>
            <select
              id="team-lives"
              value={value.teamLives}
              onChange={(e) => onChange({ ...value, teamLives: Number(e.target.value) })}
              className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted"
            >
              {TEAM_LIVES_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} levens
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
