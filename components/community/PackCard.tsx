import { useTranslations } from "next-intl";
import type { StoryPack } from "@/types/puzzle";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/community/FavoriteButton";
import { Link } from "@/i18n/navigation";

export function PackCard({
  pack,
  authorName,
  score,
  initialFavorited = false,
}: {
  pack: StoryPack;
  authorName?: string;
  score?: number;
  initialFavorited?: boolean;
}) {
  const t = useTranslations("PackCard");

  return (
    <Link href={`/community/${pack.id}`}>
      <Card tone="case" className="flex flex-col gap-2 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-accent">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl uppercase leading-tight text-text-primary">{pack.name}</h3>
          <div className="flex shrink-0 items-center gap-2">
            {typeof score === "number" && (
              <span className="text-sm font-extrabold text-text-primary">score: {score}</span>
            )}
            <FavoriteButton packId={pack.id} initialFavorited={initialFavorited} />
          </div>
        </div>
        {authorName && (
          <p className="text-sm text-text-secondary">{t("by", { name: authorName })}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{pack.theme}</Badge>
          {!pack.is_published && <Badge tone="danger">{t("unpublished")}</Badge>}
        </div>
      </Card>
    </Link>
  );
}
