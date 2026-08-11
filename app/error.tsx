"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("ErrorBoundary");

  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card tone="chrome" role="alert" className="max-w-md text-center">
        <h1 className="font-serif text-xl text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("description")}</p>
        <Button type="button" className="mt-5" onClick={() => unstable_retry()}>
          {t("retry")}
        </Button>
      </Card>
    </div>
  );
}
