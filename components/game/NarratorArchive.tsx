import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import { QuestionCard } from "./QuestionCard";

/** Answered questions, out of the Verteller's way until they want to look back. */
export function NarratorArchive({
  supabase,
  roomId,
  round,
  questions,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  questions: Question[];
}) {
  const answered = [...questions.filter((q) => q.answer !== null)].reverse();

  if (answered.length === 0) {
    return <p className="font-mono text-sm text-text-secondary">Nog geen beantwoorde vragen.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {answered.map((question) => (
        <QuestionCard
          key={question.id}
          supabase={supabase}
          roomId={roomId}
          round={round}
          question={question}
          narrating
        />
      ))}
    </div>
  );
}
