"use client";

import { useTranslations } from "next-intl";

export function CorkboardButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("CorkboardButton");

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-md border-2 border-[#3a3a3a] px-2.5 py-0.5 text-[13px] font-extrabold text-[#cfc7b5] transition-colors hover:border-accent hover:text-accent"
    >
      {t("label")}
    </button>
  );
}
