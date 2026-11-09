import { useTranslations } from "next-intl";

/** Shared, visible to every player — this is team-wide stakes, not a secret. */
export function TeamLivesDisplay({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const hearts = Array.from({ length: total }, (_, i) => i < remaining);
  const t = useTranslations("TeamLivesDisplay");

  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#cfc7b5]"
      aria-label={t("ariaLabel", { remaining, total })}
    >
      {hearts.map((filled, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-4 w-4 rotate-45 ${filled ? "bg-danger" : "border-2 border-[#5a5a5a]"}`}
        />
      ))}
      <span aria-hidden="true" className="ml-1.5">
        {t("label", { remaining, total })}
      </span>
    </span>
  );
}
