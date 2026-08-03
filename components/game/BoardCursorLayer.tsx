import type { BoardCursor } from "@/types/boardCursor";

const CURSOR_PALETTE = ["#d9a441", "#7fb3d5", "#e07a7a", "#8fbf8f", "#c98fd9", "#e0b56b"];

function colorForPlayerId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % CURSOR_PALETTE.length;
  return CURSOR_PALETTE[hash];
}

export function BoardCursorLayer({
  cursors,
  selfPlayerId,
}: {
  cursors: Record<string, BoardCursor>;
  selfPlayerId: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Object.values(cursors)
        .filter((cursor) => cursor.player_id !== selfPlayerId)
        .map((cursor) => (
          <div
            key={cursor.player_id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75"
            style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
          >
            <div
              className="h-3 w-3 rounded-full shadow shadow-black/40"
              style={{ backgroundColor: colorForPlayerId(cursor.player_id) }}
            />
            <p
              className="mt-1 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/90"
              style={{ color: colorForPlayerId(cursor.player_id) }}
            >
              {cursor.name}
            </p>
          </div>
        ))}
    </div>
  );
}
