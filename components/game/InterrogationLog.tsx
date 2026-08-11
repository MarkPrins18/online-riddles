import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import type { Hint } from "@/types/hint";
import { QuestionCard } from "./QuestionCard";
import { HintCard } from "./HintCard";

type TimelineEntry =
  | { kind: "question"; createdAt: string; question: Question }
  | { kind: "hint"; createdAt: string; hint: Hint };

/**
 * The Rader's "Verhoor" tab — the full transcript of every question asked
 * this round, ja/nee/n.v.t. included (those live separately in
 * CluesList/"Aanwijzingen"), interleaved with any hints the Verteller chose
 * to send — in the actual order everything happened, newest first.
 * Scrolling is the parent Tabs pane's job now, not this component's.
 */
export function InterrogationLog({
  supabase,
  roomId,
  round,
  questions,
  hints,
  narrating,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  questions: Question[];
  hints: Hint[];
  narrating: boolean;
}) {
  const t = useTranslations("InterrogationLog");

  if (questions.length === 0 && hints.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  const timeline: TimelineEntry[] = [
    ...questions.map((question): TimelineEntry => ({
      kind: "question",
      createdAt: question.created_at,
      question,
    })),
    ...hints.map((hint): TimelineEntry => ({
      kind: "hint",
      createdAt: hint.created_at,
      hint,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-3">
      {timeline.map((entry) =>
        entry.kind === "question" ? (
          <QuestionCard
            key={entry.question.id}
            supabase={supabase}
            roomId={roomId}
            round={round}
            question={entry.question}
            narrating={narrating}
          />
        ) : (
          <HintCard key={entry.hint.id} hint={entry.hint.text} />
        )
      )}
    </div>
  );
}
