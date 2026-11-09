import type { CSSProperties, ReactNode } from "react";

type RevealTone = "accent" | "danger";

const HEADER_TONE: Record<RevealTone, string> = {
  accent: "bg-accent",
  danger: "bg-danger",
};

const SHADOW_TONE: Record<RevealTone, string> = {
  accent: "shadow-[6px_6px_0_var(--accent)]",
  danger: "shadow-[6px_6px_0_var(--danger)]",
};

/**
 * The game's "big moment" card (a new case's briefing, the solution, the
 * final standings): a paperback-cover header strip in yellow (or red for
 * bad news) with the title in Anton, over a dark body so any regular
 * control inside keeps working as-is. Plays the redaction-lift reveal.
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
      className={`redact-reveal overflow-hidden rounded-[10px] border-[3px] border-text-primary bg-bg-secondary ${SHADOW_TONE[tone]} ${className}`}
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)", ...style }}
    >
      <div className={`px-6 py-5 text-ink sm:px-8 ${HEADER_TONE[tone]}`}>
        <p className="text-sm font-extrabold">{label}</p>
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
