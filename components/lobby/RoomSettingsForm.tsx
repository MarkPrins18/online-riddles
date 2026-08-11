"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { RoomSettingsInput } from "@/types/room";
import { getOfficialThemes } from "@/lib/supabase/storyPacks";
import { countPublishedCommunityPacks } from "@/lib/supabase/communityPacks";
import { MIN_PLAYERS_FOR_SABOTEUR_MODE } from "@/lib/game/roles";

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

  const groupLegendClass = "mb-3 font-mono text-sm font-semibold uppercase tracking-widest text-text-primary";

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

      <fieldset className="border-t border-white/5 pt-4">
        <legend className={groupLegendClass}>{t("puzzlesLegend")}</legend>

        <fieldset>
          <legend className="mb-1 font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("themesLegend")}
          </legend>
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

        <fieldset className="mt-3 border-t border-white/5 pt-3">
          <legend className="mb-1 font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("communityLegend")}
          </legend>
          {communityPackCount === null ? (
            <p className="font-mono text-xs text-text-secondary">{t("communityLoading")}</p>
          ) : communityPackCount === 0 ? (
            <p className="font-mono text-xs text-text-secondary">{t("communityEmpty")}</p>
          ) : (
            <>
              <label className="flex items-center gap-2 font-mono text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={value.communityPackIds === null}
                  onChange={(e) => toggleCommunity(e.target.checked)}
                />
                {t("communityToggle")}
                <span className="font-mono text-xs text-text-secondary">({communityPackCount})</span>
              </label>
              <p className="mt-1 font-mono text-xs text-text-secondary">{t("communityHint")}</p>
            </>
          )}
        </fieldset>

        {officialThemes !== null &&
          communityPackCount !== null &&
          officialThemes.length + communityPackCount > 0 &&
          value.packThemeFilter.length === 0 &&
          (value.communityPackIds === null ? communityPackCount === 0 : value.communityPackIds.length === 0) && (
            <p className="mt-3 font-mono text-xs text-danger">{t("chooseThemeOrPack")}</p>
          )}
      </fieldset>

      <fieldset className="border-t border-white/5 pt-4">
        <legend className={groupLegendClass}>{t("modesLegend")}</legend>
        <div className="flex flex-col divide-y divide-white/5 rounded-md border border-white/10">
          <div className="p-3">
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

          <div className="p-3">
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
  );
}
