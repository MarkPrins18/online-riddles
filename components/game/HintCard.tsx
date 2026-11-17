import { useTranslations } from "next-intl";

export function HintCard({ hint }: { hint: string }) {
  const t = useTranslations("HintCard");

  return (
    <div
      className="w-full rounded-[10px] border-2 border-dashed border-text-primary/60 bg-bg-secondary p-4 text-text-primary"
      style={{ animation: "reveal-in 180ms ease-out" }}
    >
      <p className="font-display text-base uppercase tracking-wide text-text-secondary">{t("label")}</p>
      <p className="mt-1.5 text-base font-medium leading-snug">{hint}</p>
    </div>
  );
}
