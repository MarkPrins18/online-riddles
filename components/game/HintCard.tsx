import { useTranslations } from "next-intl";

export function HintCard({ hint }: { hint: string }) {
  const t = useTranslations("HintCard");

  return (
    <div
      className="w-full rounded-[10px] bg-accent p-4 text-ink"
      style={{ animation: "reveal-in 180ms ease-out" }}
    >
      <p className="font-display text-base uppercase tracking-wide text-ink">{t("label")}</p>
      <p className="mt-1.5 text-base font-medium leading-snug">{hint}</p>
    </div>
  );
}
