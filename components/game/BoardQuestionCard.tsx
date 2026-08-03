import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardItem } from "@/types/boardItem";
import type { Question } from "@/types/question";
import { ConnectorDot, useCardHover } from "./ConnectorDot";

function rotationFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return (hash % 9) - 4;
}

const ANSWER_LABEL: Record<string, string> = {
  yes: "Ja",
  no: "Nee",
  irrelevant: "Niet relevant",
  custom: "Zie antwoord",
};

export function BoardQuestionCard({
  item,
  question,
  x,
  y,
  canDelete,
  onPointerDown,
  onConnectorPointerDown,
  onDelete,
}: {
  item: BoardItem;
  question: Question | undefined;
  x: number;
  y: number;
  canDelete: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onConnectorPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDelete: () => void;
}) {
  const rotate = rotationFor(item.id);
  const { hoverSide, handlePointerMove, handlePointerLeave } = useCardHover();

  return (
    <div
      data-item-id={item.id}
      className="absolute w-[200px] -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-sm bg-[#eae4d3] p-3 text-[#12141c] shadow-md shadow-black/40"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `rotate(${rotate}deg)` }}
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
          aria-label="Kaartje verwijderen"
        >
          ×
        </button>
      )}
      <p className="font-mono text-[11px] uppercase tracking-widest text-black/60">Vraag</p>
      {question ? (
        <>
          <p className="mt-1 font-serif text-sm font-medium leading-snug">{question.text}</p>
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-[#3d2609]">
            {question.answer ? ANSWER_LABEL[question.answer] : "..."}
          </p>
        </>
      ) : (
        <p className="mt-1 font-mono text-xs text-black/60">Vraag niet gevonden.</p>
      )}
      {hoverSide && <ConnectorDot side={hoverSide} onPointerDown={onConnectorPointerDown} />}
    </div>
  );
}
