"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { RoomSettingsInput } from "@/types/room";
import { getOfficialThemes } from "@/lib/supabase/storyPacks";
import { countPublishedCommunityPacks } from "@/lib/supabase/communityPacks";
import { listFavoritePackIds } from "@/lib/supabase/packFavorites";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { MIN_PLAYERS_FOR_SABOTEUR_MODE } from "@/lib/game/roles";

type CommunityMode = "off" | "all" | "favorites";

type DurationLabelKey = "duration5" | "duration10" | "duration15" | "duration20" | "durationNone";

const DURATION_OPTIONS: Array<{ labelKey: DurationLabelKey; value: number | null }> = [
  { labelKey: "duration5", value: 300 },
  { labelKey: "duration10", value: 600 },
  { labelKey: "duration15", value: 900 },
  { labelKey: "duration20", value: 1200 },
  { labelKey: "durationNone", value: null },
];

const ROUND_COUNT_OPTIONS = [3, 5, 7, 10];
const TEAM_LIVES_OPTIONS = [3, 5, 8];

export function RoomSettingsForm({
  supabase,
  value,
  onChange,
  narratorPreviewName,
  playerCount,
}: {
  supabase: SupabaseClient<Database>;
  value: RoomSettingsInput;
  onChange: (value: RoomSettingsInput) => void;
  narratorPreviewName?: string;
  playerCount?: number;
}) {
  const [officialThemes, setOfficialThemes] = useState<string[] | null>(null);
  const [communityPackCount, setCommunityPackCount] = useState<number | null>(null);
  const [favoritePackIds, setFavoritePackIds] = useState<Set<string> | null>(null);
  // Tracked separately from `value.communityPackIds` rather than derived from
  // it on every render — an empty favorites selection collapses to the same
  // `[]` as "off", so re-deriving the mode from `value` would be ambiguous.
  // This form is the only producer of a non-null, non-empty array, so the
  // one-time initial derivation below is safe.
  const [communityMode, setCommunityModeState] = useState<CommunityMode>(() =>
    value.communityPackIds === null ? "all" : value.communityPackIds.length === 0 ? "off" : "favorites"
  );
  const t = useTranslations("RoomSettingsForm");

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
    ensureAnonymousSession(supabase)
      .then((userId) => listFavoritePackIds(supabase, userId))
      .then((favIds) => {
        if (!cancelled) setFavoritePackIds(favIds);
      });
    return () => {
      cancelled = true;
    };
    // Only load once on mount — re-running on every `value`/`onChange`
    // identity change would refetch needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Reacts once the favorites finish loading — reads communityMode fresh at
  // that point, not a stale mount-time value, so it still applies correctly
  // even if the host picked "favorites" before this fetch resolved.
  useEffect(() => {
    if (favoritePackIds && communityMode === "favorites") {
      onChange({ ...value, communityPackIds: [...favoritePackIds] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritePackIds]);

  function toggleTheme(theme: string) {
    const isSelected = value.packThemeFilter.includes(theme);
    const next = isSelected
      ? value.packThemeFilter.filter((t) => t !== theme)
      : [...value.packThemeFilter, theme];
    onChange({ ...value, packThemeFilter: next });
  }

  function setCommunityMode(mode: CommunityMode) {
    setCommunityModeState(mode);
    if (mode === "off") {
      onChange({ ...value, communityPackIds: [] });
    } else if (mode === "all") {
      onChange({ ...value, communityPackIds: null });
    } else {
      onChange({ ...value, communityPackIds: [...(favoritePackIds ?? [])] });
    }
  }

  const groupLegendClass = "mb-3 font-mono text-xs uppercase tracking-widest text-text-primary";
  const fieldLegendClass = "mb-1 font-mono text-xs uppercase tracking-widest text-text-secondary";

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className={groupLegendClass}>{t("roundsLegend")}</legend>
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="round-duration"
              className="mb-1 block font-mono text-xs uppercase tracking-widest text-text-secondary"
            >
              {t("durationLabel")}
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
                <option key={option.labelKey} value={option.value === null ? "none" : option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="round-count"
              className="mb-1 block font-mono text-xs uppercase tracking-widest text-text-secondary"
            >
              {t("roundCountLabel")}
            </label>
            <select
              id="round-count"
              value={value.maxRounds}
              onChange={(e) => onChange({ ...value, maxRounds: Number(e.target.value) })}
              className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted"
            >
              {ROUND_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {t("roundCountOption", { count })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <div className="border-t border-white/5 pt-4">
        <fieldset>
          <legend className={groupLegendClass}>{t("puzzlesLegend")}</legend>

          <fieldset>
            <legend className={fieldLegendClass}>{t("themesLegend")}</legend>
            {officialThemes === null ? (
              <p className="font-mono text-xs text-text-secondary">{t("themesLoading")}</p>
            ) : officialThemes.length === 0 ? (
              <p className="font-mono text-xs text-text-secondary">{t("themesEmpty")}</p>
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

          <div className="mt-3 border-t border-white/5 pt-3">
            <fieldset>
              <legend className={fieldLegendClass}>{t("communityLegend")}</legend>
              {communityPackCount === null ? (
                <p className="font-mono text-xs text-text-secondary">{t("communityLoading")}</p>
              ) : communityPackCount === 0 ? (
                <p className="font-mono text-xs text-text-secondary">{t("communityEmpty")}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
                      <input
                        type="radio"
                        name="community-mode"
                        className="accent-accent"
                        checked={communityMode === "off"}
                        onChange={() => setCommunityMode("off")}
                      />
                      {t("communityOff")}
                    </label>
                    <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
                      <input
                        type="radio"
                        name="community-mode"
                        className="accent-accent"
                        checked={communityMode === "all"}
                        onChange={() => setCommunityMode("all")}
                      />
                      {t("communityToggle")}
                      <span className="font-mono text-xs text-text-secondary">({communityPackCount})</span>
                    </label>
                    <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
                      <input
                        type="radio"
                        name="community-mode"
                        className="accent-accent"
                        disabled={!favoritePackIds || favoritePackIds.size === 0}
                        checked={communityMode === "favorites"}
                        onChange={() => setCommunityMode("favorites")}
                      />
                      {t("communityFavorites")}
                      {favoritePackIds && (
                        <span className="font-mono text-xs text-text-secondary">
                          ({favoritePackIds.size})
                        </span>
                      )}
                    </label>
                  </div>
                  {favoritePackIds && favoritePackIds.size === 0 && (
                    <p className="mt-1 font-mono text-xs text-text-secondary">
                      {t("communityFavoritesEmpty")}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-xs text-text-secondary">{t("communityHint")}</p>
                </>
              )}
            </fieldset>
          </div>

          {officialThemes !== null &&
            communityPackCount !== null &&
            officialThemes.length + communityPackCount > 0 &&
            value.packThemeFilter.length === 0 &&
            (value.communityPackIds === null ? communityPackCount === 0 : value.communityPackIds.length === 0) && (
              <p className="mt-3 font-mono text-xs text-danger">{t("chooseThemeOrPack")}</p>
            )}
        </fieldset>
      </div>

      <div className="border-t border-white/5 pt-4">
        <fieldset>
          <legend className={groupLegendClass}>{t("modesLegend")}</legend>
          <div className="flex flex-col divide-y divide-white/5">
            <div className="pb-3">
              <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={value.hardcoreMode}
                  onChange={(e) => onChange({ ...value, hardcoreMode: e.target.checked })}
                />
                {t("hardcoreToggle")}
              </label>
              <p className="mt-1 font-mono text-xs text-text-secondary">{t("hardcoreHint")}</p>

              {value.hardcoreMode && (
                <div className="mt-3">
                  <label
                    htmlFor="team-lives"
                    className="mb-1 block font-mono text-xs uppercase tracking-widest text-text-secondary"
                  >
                    {narratorPreviewName
                      ? t("teamLivesLabelWithNarrator", { name: narratorPreviewName })
                      : t("teamLivesLabel")}
                  </label>
                  <select
                    id="team-lives"
                    value={value.teamLives}
                    onChange={(e) => onChange({ ...value, teamLives: Number(e.target.value) })}
                    className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted"
                  >
                    {TEAM_LIVES_OPTIONS.map((count) => (
                      <option key={count} value={count}>
                        {t("teamLivesOption", { count })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-3">
              <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={value.saboteurMode}
                  onChange={(e) => onChange({ ...value, saboteurMode: e.target.checked })}
                />
                {t("saboteurToggle")}
              </label>
              <p className="mt-1 font-mono text-xs text-text-secondary">{t("saboteurHint")}</p>
              {value.saboteurMode &&
                playerCount !== undefined &&
                playerCount < MIN_PLAYERS_FOR_SABOTEUR_MODE && (
                  <p className="mt-1 font-mono text-xs text-danger">
                    {t("saboteurNeedsMorePlayers", { count: MIN_PLAYERS_FOR_SABOTEUR_MODE })}
                  </p>
                )}
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
