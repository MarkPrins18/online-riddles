import { useTranslations } from "next-intl";
import type { PuzzlePreview } from "@/types/puzzle";
import type { VoteValue } from "@/types/vote";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VoteButtons } from "@/components/community/VoteButtons";

export function RiddleCard({
  puzzle,
  score,
  myVote,
  authorName,
}: {
  puzzle: PuzzlePreview;
  score: number;
  myVote: VoteValue | null;
  authorName?: string;
}) {
  const t = useTranslations("RiddleCard");
  const tDifficulty = useTranslations("Difficulty");

  return (
    <Card tone="chrome" className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg italic text-text-primary">{puzzle.title}</h3>
          {authorName && (
            <p className="font-mono text-xs text-text-secondary">{t("by", { name: authorName })}</p>
          )}
        </div>
        <VoteButtons puzzleId={puzzle.id} score={score} myVote={myVote} />
      </div>
      <p className="font-mono text-sm text-text-secondary">{puzzle.scenario}</p>
      <div className="flex flex-wrap gap-2">
        <Badge>{tDifficulty(puzzle.difficulty)}</Badge>
        {puzzle.category && <Badge tone="accent">{puzzle.category}</Badge>}
      </div>
    </Card>
  );
}
