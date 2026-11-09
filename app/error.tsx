"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ErrorBoundary");

  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card tone="case" role="alert" className="max-w-lg text-center">
        <h1 className="font-display text-4xl uppercase leading-none text-accent">{t("title")}</h1>
        <p className="mt-3 text-base text-text-primary/90">{t("description")}</p>
        <Button type="button" className="mt-6" onClick={() => retry()}>
          {t("retry")}
        </Button>
      </Card>
    </div>
  );
}
