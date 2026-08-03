import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardItem, BoardNoteColor } from "@/types/boardItem";
import { ConnectorDot, useCardHover } from "./ConnectorDot";

const NOTE_COLORS: Record<BoardNoteColor, string> = {
  yellow: "#e8d477",
  pink: "#e0a8c0",
  blue: "#9ec4dd",
  green: "#a9cfa0",
};

export function BoardNote({
  item,
  x,
  y,
  canDelete,
  onPointerDown,
  onConnectorPointerDown,
  onDelete,
}: {
  item: BoardItem;
  x: number;
  y: number;
  canDelete: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onConnectorPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDelete: () => void;
}) {
  const { hoverSide, handlePointerMove, handlePointerLeave } = useCardHover();

  return (
    <div
      data-item-id={item.id}
      className="absolute w-[180px] -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-sm p-3 text-[#12141c] shadow-md shadow-black/40"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, backgroundColor: NOTE_COLORS[item.color] }}
      onPointerDown={onPointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {canDelete && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 font-mono text-xs text-white/80 hover:bg-black"
          aria-label="Briefje verwijderen"
        >
          ×
        </button>
      )}
      <p className="font-serif text-sm leading-snug">{item.text}</p>
      {hoverSide && <ConnectorDot side={hoverSide} onPointerDown={onConnectorPointerDown} />}
    </div>
  );
}
