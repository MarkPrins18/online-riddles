import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Side = "left" | "right" | "top" | "bottom";

const SIDE_CLASSES: Record<Side, string> = {
  left: "left-1 top-1/2 -translate-y-1/2",
  right: "right-1 top-1/2 -translate-y-1/2",
  top: "top-1 left-1/2 -translate-x-1/2",
  bottom: "bottom-1 left-1/2 -translate-x-1/2",
};

function nearestSide(e: ReactPointerEvent<HTMLDivElement>): Side {
  const rect = e.currentTarget.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top) / rect.height;
  const distances: [Side, number][] = [
    ["left", relX],
    ["right", 1 - relX],
    ["top", relY],
    ["bottom", 1 - relY],
  ];
  return distances.reduce((closest, current) => (current[1] < closest[1] ? current : closest))[0];
}

/**
 * Hidden by default; shows a single connector handle on whichever edge of
 * the card the pointer is nearest to, so a connection can be dragged
 * starting from any side — not just left/right — matching how the line
 * itself can exit toward a card above/below/diagonal, not only sideways.
 */
export function useCardHover() {
  const [hoverSide, setHoverSide] = useState<Side | null>(null);

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    setHoverSide(nearestSide(e));
  }

  function handlePointerLeave() {
    setHoverSide(null);
  }

  return { hoverSide, handlePointerMove, handlePointerLeave };
}

export function ConnectorDot({
  side,
  onPointerDown,
}: {
  side: Side;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      title="Sleep om te verbinden"
      className={`absolute h-4 w-4 cursor-crosshair rounded-full border-2 border-white/60 bg-[#c0392b] ${SIDE_CLASSES[side]}`}
    />
  );
}
