import type { Player } from "@/types/player";
import type { SessionRecap } from "./recap";
import { medalForRank } from "./ranking";

const WIDTH = 1080;
const MIN_HEIGHT = 1350;
const MAX_HEIGHT = 2200;
const PAD = 80;
const MAX_SCOREBOARD_ROWS = 8;

// Same palette as app/globals.css — canvas can't read CSS variables, so
// these are copied by hand. Keep in sync if the theme colors ever change.
const COLORS = {
  bgPrimary: "#15120e",
  bgCase: "#241a10",
  accent: "#d9a441",
  accentMuted: "#8a6b2e",
  accentSecondary: "#6f93ad",
  textPrimary: "#ede7d8",
  textSecondary: "#9c9080",
  danger: "#ab3f2f",
};

type HighlightLine = { label: string; text: string; color: string };

/**
 * Resolves the real Fraunces/Plex Mono family names next/font generated
 * (something like `'__Fraunces_36bd41', ...`) so the shared image actually
 * matches the app's look instead of a generic system font. Best-effort: any
 * failure (SSR, unusual browser, a font that never loads) just falls back
 * to the generic families, which still read fine.
 */
async function resolveFonts(): Promise<{ serif: string; mono: string }> {
  const fallback = { serif: "Georgia, serif", mono: "Consolas, monospace" };
  if (typeof document === "undefined" || !("fonts" in document)) return fallback;

  try {
    const styles = getComputedStyle(document.documentElement);
    const serifVar = styles.getPropertyValue("--font-serif").trim();
    const monoVar = styles.getPropertyValue("--font-mono").trim();
    const serif = serifVar ? `${serifVar}, ${fallback.serif}` : fallback.serif;
    const mono = monoVar ? `${monoVar}, ${fallback.mono}` : fallback.mono;

    await Promise.all([
      document.fonts.load(`italic 600 64px ${serif}`),
      document.fonts.load(`700 64px ${serif}`),
      document.fonts.load(`400 28px ${mono}`),
      document.fonts.load(`600 28px ${mono}`),
    ]).catch(() => undefined);
    await document.fonts.ready;

    return { serif, mono };
  } catch {
    return fallback;
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildHighlightLines(recap: SessionRecap | null): HighlightLine[] {
  const lines: HighlightLine[] = [];
  if (recap?.mvpNarrator) {
    lines.push({
      label: "MVP VERTELLER",
      text: `${recap.mvpNarrator.name} (${recap.mvpNarrator.solvedCount}x opgelost)`,
      color: COLORS.textPrimary,
    });
  }
  if (recap?.fastestSolve) {
    lines.push({
      label: "SNELSTE OPLOSSING",
      text: `${recap.fastestSolve.solverName} loste "${recap.fastestSolve.puzzleTitle}" op in ${recap.fastestSolve.questionsAsked} vragen`,
      color: COLORS.textPrimary,
    });
  }
  if (recap?.bestQuestions.length) {
    const q = recap.bestQuestions[0];
    lines.push({ label: "BESTE VRAAG", text: `"${q.text}" — ${q.playerName}`, color: COLORS.textPrimary });
  }
  if (recap?.mostWrongGuesses) {
    lines.push({
      label: "WALL OF SHAME",
      text: `${recap.mostWrongGuesses.playerName} gokte ${recap.mostWrongGuesses.count}x mis`,
      color: COLORS.danger,
    });
  }
  return lines;
}

/**
 * Draws a shareable "case closed" report card summarizing the session —
 * winner, full scoreboard, and the same highlights SessionRecapPanel shows
 * in-app. Pure canvas (no image assets, no extra dependency).
 *
 * Height is computed from the actual content (measured with a throwaway
 * canvas before anything is drawn for real) instead of a fixed constant —
 * a fixed height overflowed past the footer once a room had more than
 * ~6-7 players with all four highlight categories filled in, which is a
 * perfectly normal group size for this game, not a rare edge case.
 */
export async function generateRecapImage(
  players: Player[],
  recap: SessionRecap | null
): Promise<Blob | null> {
  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) return null;

  const { serif, mono } = await resolveFonts();
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const maxTextWidth = WIDTH - PAD * 2;
  const highlightLines = buildHighlightLines(recap);

  // --- Pass 1: measure, no drawing --------------------------------------
  let y = PAD + 280;
  if (winner) y += 56 + 44 + 64;
  y += 56; // divider before scoreboard

  const rowCount = Math.min(ranked.length, MAX_SCOREBOARD_ROWS);
  y += rowCount * 48;
  if (ranked.length > MAX_SCOREBOARD_ROWS) y += 48;
  y += 24;

  const wrappedHighlights: string[][] = [];
  if (highlightLines.length > 0) {
    y += 50; // divider before highlights
    mctx.font = `400 27px ${mono}`;
    for (const line of highlightLines) {
      const wrapped = wrapLines(mctx, line.text, maxTextWidth);
      wrappedHighlights.push(wrapped);
      y += 34 + wrapped.length * 36 + 20;
    }
  }

  const HEIGHT = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, y + 140));

  // --- Pass 2: draw for real, at the now-known height ---------------------
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const bg = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.3, 0, WIDTH / 2, HEIGHT * 0.3, HEIGHT);
  bg.addColorStop(0, COLORS.bgCase);
  bg.addColorStop(1, COLORS.bgPrimary);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `600 26px ${mono}`;
  ctx.save();
  ctx.letterSpacing = "6px";
  ctx.fillText("ONLINE RIDDLES", WIDTH / 2, PAD + 20);
  ctx.restore();

  // "Zaak gesloten" stamp — rotated rubber-stamp box, same phrase used
  // throughout the app (FinalScoreboard, SolutionReveal).
  ctx.save();
  ctx.translate(WIDTH / 2, PAD + 130);
  ctx.rotate(-0.045);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(-260, -40, 520, 80);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-248, -28, 496, 56);
  ctx.fillStyle = COLORS.accent;
  ctx.font = `italic 700 44px ${serif}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Zaak gesloten", 0, 2);
  ctx.restore();
  ctx.textBaseline = "alphabetic";

  y = PAD + 280;

  if (winner) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `600 24px ${mono}`;
    ctx.fillText("WINNAAR", WIDTH / 2, y);
    y += 56;
    ctx.fillStyle = COLORS.accent;
    ctx.font = `italic 600 58px ${serif}`;
    ctx.fillText(winner.name, WIDTH / 2, y);
    y += 44;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `400 26px ${mono}`;
    ctx.fillText(`${winner.score} punten`, WIDTH / 2, y);
    y += 64;
  }

  ctx.strokeStyle = "rgba(237,231,216,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(WIDTH - PAD, y);
  ctx.stroke();
  y += 56;

  ctx.textAlign = "left";
  ctx.font = `400 30px ${mono}`;
  for (const [index, player] of ranked.slice(0, MAX_SCOREBOARD_ROWS).entries()) {
    const label = medalForRank(index) ?? `${index + 1}.`;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(`${label}  ${player.name}`, PAD, y);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.accentSecondary;
    ctx.fillText(String(player.score), WIDTH - PAD, y);
    ctx.textAlign = "left";
    y += 48;
  }
  if (ranked.length > MAX_SCOREBOARD_ROWS) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `400 24px ${mono}`;
    ctx.fillText(`+ ${ranked.length - MAX_SCOREBOARD_ROWS} andere rechercheurs`, PAD, y);
    y += 48;
  }
  y += 24;

  if (highlightLines.length > 0) {
    ctx.strokeStyle = "rgba(237,231,216,0.12)";
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(WIDTH - PAD, y);
    ctx.stroke();
    y += 50;

    highlightLines.forEach((line, i) => {
      ctx.fillStyle = COLORS.accent;
      ctx.font = `600 20px ${mono}`;
      ctx.fillText(line.label, PAD, y);
      y += 34;

      ctx.fillStyle = line.color;
      ctx.font = `400 27px ${mono}`;
      for (const wrappedLine of wrappedHighlights[i]) {
        ctx.fillText(wrappedLine, PAD, y);
        y += 36;
      }
      y += 20;
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.accentMuted;
  ctx.font = `600 20px ${mono}`;
  ctx.fillText("EEN LATERAL THINKING VERHOOR VOOR GROEPEN", WIDTH / 2, HEIGHT - PAD);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
