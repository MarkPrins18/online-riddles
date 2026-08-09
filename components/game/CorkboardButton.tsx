"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export function CorkboardButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("CorkboardButton");

  return (
    <Button variant="tab" onClick={onClick}>
      {t("label")}
    </Button>
  );
}
