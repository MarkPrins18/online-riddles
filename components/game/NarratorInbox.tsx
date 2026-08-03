import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { Player } from "@/types/player";
import type { Puzzle } from "@/types/puzzle";
import { QuestionCard } from "./QuestionCard";
import { NarratorGuessControls } from "./NarratorGuessControls";

/**
 * The Verteller's default tab: everything that needs a decision right now
 * — unanswered questions and pending solutions — surfaced together instead
 * of buried among the already-answered history.
 */
export function NarratorInbox({
  supabase,
  roomId,
  round,
  puzzle,
  questions,
  guesses,
  players,
  narratorId,
  hardcoreMode,
  teamLivesRemaining,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  puzzle: Puzzle;
  questions: Question[];
  guesses: Guess[];
  players: Player[];
  narratorId: string | null;
  hardcoreMode: boolean;
  teamLivesRemaining: number | null;
}) {
  const unanswered = [...questions.filter((q) => q.answer === null)].reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-secondary">
          Openstaande oplossingen
        </p>
        <NarratorGuessControls
          supabase={supabase}
          roomId={roomId}
          round={round}
          puzzle={puzzle}
          questions={questions}
          guesses={guesses}
          players={players}
          narratorId={narratorId}
          hardcoreMode={hardcoreMode}
          teamLivesRemaining={teamLivesRemaining}
        />
      </div>

      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-secondary">
          Onbeantwoorde vragen ({unanswered.length})
        </p>
        {unanswered.length === 0 ? (
          <p className="font-mono text-sm text-text-secondary">Alles beantwoord — even bijkomen.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {unanswered.map((question) => (
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
        )}
      </div>
    </div>
  );
}
