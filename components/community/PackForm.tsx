"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createOwnPack } from "@/lib/supabase/communityPacks";
import { getAvailableThemes } from "@/lib/supabase/storyPacks";
import { getErrorMessage } from "@/lib/errors";
import type { StoryPack } from "@/types/puzzle";
import { Button } from "@/components/ui/Button";

const inputClasses =
  "rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted";
const labelClasses = "font-mono text-xs uppercase tracking-widest text-text-secondary";

// Sentinel for "type your own theme" in the <select> — a real theme name
// could never collide with it.
const NEW_THEME_VALUE = "__nieuw__";

export function PackForm({ onCreated }: { onCreated: (pack: StoryPack) => void }) {
  const [name, setName] = useState("");
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [themeChoice, setThemeChoice] = useState<string>(NEW_THEME_VALUE);
  const [customTheme, setCustomTheme] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("PackForm");
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getAvailableThemes(supabase).then((themes) => {
      if (!cancelled) setAvailableThemes(themes);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = themeChoice === NEW_THEME_VALUE ? customTheme.trim() : themeChoice;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !theme) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const pack = await createOwnPack(supabase, userId, name.trim(), theme, locale);
      onCreated(pack);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="pack-name" className={labelClasses}>
        {t("nameLabel")}
      </label>
      <input
        id="pack-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        maxLength={60}
        className={inputClasses}
      />
      <label htmlFor="pack-theme" className={labelClasses}>
        {t("themeLabel")}
      </label>
      <select
        id="pack-theme"
        value={themeChoice}
        onChange={(e) => setThemeChoice(e.target.value)}
        className={inputClasses}
      >
        {availableThemes.map((theme) => (
          <option key={theme} value={theme}>
            {theme}
          </option>
        ))}
        <option value={NEW_THEME_VALUE}>{t("newThemeOption")}</option>
      </select>
      {themeChoice === NEW_THEME_VALUE && (
        <input
          value={customTheme}
          onChange={(e) => setCustomTheme(e.target.value)}
          placeholder={t("customThemePlaceholder")}
          maxLength={40}
          className={inputClasses}
        />
      )}
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button type="submit" variant="secondary" disabled={isSubmitting || !name.trim() || !theme}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
