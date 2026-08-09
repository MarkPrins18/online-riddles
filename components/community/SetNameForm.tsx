"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { upsertProfile } from "@/lib/supabase/profiles";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const inputClasses =
  "rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted";
const labelClasses = "font-mono text-xs uppercase tracking-widest text-text-secondary";

/**
 * Shown once, before someone's first pack/riddle, so submissions have an
 * author name to display instead of everything being anonymous. No email,
 * no account — just a name attached to the existing anonymous session.
 */
export function SetNameForm({ onDone }: { onDone: (displayName: string) => void }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("SetNameForm");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      await upsertProfile(supabase, userId, name.trim());
      onDone(name.trim());
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card tone="case">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">{t("heading")}</p>
      <p className="mb-4 font-mono text-sm text-text-secondary">{t("subtitle")}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="creator-name" className={labelClasses}>
          {t("nameLabel")}
        </label>
        <input
          id="creator-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={24}
          className={inputClasses}
        />
        {error && <p className="font-mono text-xs text-danger">{error}</p>}
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? t("saving") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
