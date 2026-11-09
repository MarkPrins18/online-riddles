import { useTranslations } from "next-intl";

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60).toString().padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

const LOW_TIME_THRESHOLD_SECONDS = 60;

/**
 * Shared round clock, computed from the same server timestamp for every
 * player so it reads identically regardless of when they joined or last
 * refreshed. With `durationSeconds` it counts down and turns urgent near
 * zero; without one (no host-set limit) it just counts up.
 */
export function Timer({
  startedAt,
  now,
  durationSeconds,
}: {
  startedAt: string;
  now: number;
  durationSeconds?: number | null;
}) {
  const elapsedSeconds = (now - new Date(startedAt).getTime()) / 1000;
  const t = useTranslations("Timer");

  if (durationSeconds == null) {
    return (
      <span className="rounded bg-accent px-3.5 py-0.5 font-display text-[26px] tabular-nums text-ink">
        {formatDuration(elapsedSeconds)}
      </span>
    );
  }

  const remainingSeconds = durationSeconds - elapsedSeconds;
  const isUrgent = remainingSeconds <= LOW_TIME_THRESHOLD_SECONDS;
  const isUp = remainingSeconds <= 0;

  return (
    <span
      className={`rounded px-3.5 py-0.5 font-display text-[26px] tabular-nums text-ink ${
        isUrgent ? "bg-danger" : "bg-accent"
      }`}
    >
      {/* Urgency isn't color-only: this prefix carries the signal for users
          who can't perceive the yellow-to-red change. */}
      {isUrgent && !isUp && "⚠ "}
      {isUp ? t("timeUp") : formatDuration(remainingSeconds)}
    </span>
  );
}
