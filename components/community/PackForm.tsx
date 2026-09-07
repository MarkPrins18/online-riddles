"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createOwnPack } from "@/lib/supabase/communityPacks";
import { listThemes } from "@/lib/supabase/themes";
import { getErrorMessage } from "@/lib/errors";
import type { StoryPack, Theme } from "@/types/puzzle";
import { Button } from "@/components/ui/Button";

const inputClasses =
  "rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted";
const labelClasses = "font-mono text-xs uppercase tracking-widest text-text-secondary";

export function PackForm({ onCreated }: { onCreated: (pack: StoryPack) => void }) {
  const [name, setName] = useState("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeId, setThemeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("PackForm");
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    listThemes(supabase, locale).then((list) => {
      if (cancelled) return;
      setThemes(list);
      setThemeId((current) => current || (list[0]?.id ?? ""));
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !themeId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const pack = await createOwnPack(supabase, userId, name.trim(), themeId, locale);
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
        value={themeId}
        onChange={(e) => setThemeId(e.target.value)}
        className={inputClasses}
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button type="submit" variant="secondary" disabled={isSubmitting || !name.trim() || !themeId}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
