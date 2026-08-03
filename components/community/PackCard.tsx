import Link from "next/link";
import type { StoryPack } from "@/types/puzzle";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function PackCard({
  pack,
  authorName,
  score,
}: {
  pack: StoryPack;
  authorName?: string;
  score?: number;
}) {
  return (
    <Link href={`/community/${pack.id}`}>
      <Card tone="case" className="flex flex-col gap-2 transition-colors hover:border-accent/40">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl italic text-text-primary">{pack.name}</h3>
          {typeof score === "number" && (
            <span className="font-mono text-xs text-text-secondary">score: {score}</span>
          )}
        </div>
        {authorName && <p className="font-mono text-xs text-text-secondary">door {authorName}</p>}
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{pack.theme}</Badge>
          {!pack.is_published && <Badge tone="danger">Nog niet gepubliceerd</Badge>}
        </div>
      </Card>
    </Link>
  );
}
