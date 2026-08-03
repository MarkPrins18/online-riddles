"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { castVote, retractVote } from "@/lib/supabase/votes";
import { getErrorMessage } from "@/lib/errors";
import type { VoteValue } from "@/types/vote";
import { Button } from "@/components/ui/Button";

export function VoteButtons({
  puzzleId,
  score: initialScore,
  myVote: initialMyVote,
}: {
  puzzleId: string;
  score: number;
  myVote: VoteValue | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vote(value: VoteValue) {
    if (isVoting) return;
    setIsVoting(true);
    setError(null);
    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);

      if (myVote === value) {
        await retractVote(supabase, puzzleId, userId);
        setScore((s) => s - value);
        setMyVote(null);
      } else {
        const delta = myVote === null ? value : value * 2;
        await castVote(supabase, puzzleId, userId, value);
        setScore((s) => s + delta);
        setMyVote(value);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Stem is niet gelukt. Probeer het opnieuw."));
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 font-mono text-sm">
        <Button
          type="button"
          variant={myVote === 1 ? "primary" : "secondary"}
          iconOnly
          disabled={isVoting}
          onClick={() => vote(1)}
          aria-label="Stem voor"
        >
          ▲
        </Button>
        <span className="min-w-[2ch] text-center text-text-primary">{score}</span>
        <Button
          type="button"
          variant={myVote === -1 ? "danger" : "secondary"}
          iconOnly
          disabled={isVoting}
          onClick={() => vote(-1)}
          aria-label="Stem tegen"
        >
          ▼
        </Button>
      </div>
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
    </div>
  );
}
