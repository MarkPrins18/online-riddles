import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import { QuestionCard } from "./QuestionCard";
import { HintCard } from "./HintCard";

/**
 * The Rader's "Verhoor" tab — the full transcript of every question asked
 * this round, ja/nee/n.v.t. included, not just the confirmed ones (those
 * live separately in CluesList/"Aanwijzingen"). Scrolling is the parent
 * Tabs pane's job now, not this component's.
 */
export function InterrogationLog({
  supabase,
  roomId,
  round,
  questions,
  narrating,
  hint,
  showHint,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  questions: Question[];
  narrating: boolean;
  hint?: string | null;
  showHint?: boolean;
}) {
  const revealedHint = showHint && hint ? hint : null;
  const t = useTranslations("InterrogationLog");

  if (questions.length === 0 && !revealedHint) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  const ordered = [...questions].reverse();

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((question) => (
        <QuestionCard
          key={question.id}
          supabase={supabase}
          roomId={roomId}
          round={round}
          question={question}
          narrating={narrating}
        />
      ))}
      {revealedHint && <HintCard hint={revealedHint} />}
    </div>
  );
}
