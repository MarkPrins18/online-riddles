import type { CSSProperties, ReactNode } from "react";

type RevealTone = "accent" | "danger";

const LABEL_TONE: Record<RevealTone, string> = {
  accent: "text-accent",
  danger: "text-danger",
};

const RULE_TONE: Record<RevealTone, string> = {
  accent: "border-t-accent",
  danger: "border-t-danger",
};

/**
 * The game's "big moment" card (a new case's briefing, the solution, the
 * final standings): a dark card with a thick colored top rule (yellow, or
 * red for bad news), a colored label and the title in Anton. Color stays an
 * accent rather than a whole surface, so it doesn't tire the eyes. Plays
 * the redaction-lift reveal.
 */
export function RevealCard({
  tone = "accent",
  label,
  title,
  subtitle,
  children,
  className = "",
  style,
}: {
  tone?: RevealTone;
  label: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`redact-reveal overflow-hidden rounded-[10px] border-2 border-t-[6px] border-border bg-bg-secondary ${RULE_TONE[tone]} ${className}`}
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)", ...style }}
    >
      <div className="border-b-2 border-dashed border-[#3a3a3a] px-6 py-5 text-text-primary sm:px-8">
        <p className={`text-sm font-extrabold ${LABEL_TONE[tone]}`}>{label}</p>
        <h2 className="mt-1 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">{title}</h2>
        {subtitle && <p className="mt-2 text-base font-bold">{subtitle}</p>}
      </div>
      {children && <div className="px-6 py-6 sm:px-8">{children}</div>}
    </div>
  );
}

/** Ranked standings row list shared by the end screens. */
export function StandingsList({
  players,
  tone = "accent",
}: {
  players: { id: string; name: string; score: number }[];
  tone?: RevealTone;
}) {
  return (
    <ol className="flex flex-col divide-y divide-dashed divide-[#3a3a3a]">
      {players.map((player, index) => (
        <li key={player.id} className="flex items-baseline gap-3 py-3 text-lg">
          <span
            className={`w-6 shrink-0 font-display ${
              index === 0 ? (tone === "accent" ? "text-accent" : "text-danger") : "text-[#8c8578]"
            }`}
          >
            {index + 1}
          </span>
          <span className={`min-w-0 flex-1 truncate ${index === 0 ? "font-extrabold" : ""}`}>{player.name}</span>
          <span className="font-extrabold tabular-nums">{player.score}</span>
        </li>
      ))}
    </ol>
  );
}
