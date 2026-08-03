"use client";

import { useEffect, useState } from "react";
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
      const pack = await createOwnPack(supabase, userId, name.trim(), theme);
      onCreated(pack);
    } catch (err) {
      setError(getErrorMessage(err, "Kon geen pack aanmaken. Probeer het opnieuw."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="pack-name" className={labelClasses}>
        Naam van je pack
      </label>
      <input
        id="pack-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Mijn eerste zaken"
        maxLength={60}
        className={inputClasses}
      />
      <label htmlFor="pack-theme" className={labelClasses}>
        Thema
      </label>
      <select
        id="pack-theme"
        value={themeChoice}
        onChange={(e) => setThemeChoice(e.target.value)}
        className={inputClasses}
      >
        {availableThemes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value={NEW_THEME_VALUE}>+ Nieuw thema...</option>
      </select>
      {themeChoice === NEW_THEME_VALUE && (
        <input
          value={customTheme}
          onChange={(e) => setCustomTheme(e.target.value)}
          placeholder="Crime, Sci-Fi, Absurd..."
          maxLength={40}
          className={inputClasses}
        />
      )}
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button type="submit" variant="secondary" disabled={isSubmitting || !name.trim() || !theme}>
        {isSubmitting ? "Pack aanmaken..." : "Pack aanmaken"}
      </Button>
    </form>
  );
}
