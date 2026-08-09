"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import type { BoardItemKind, BoardNoteColor } from "@/types/boardItem";
import { useBoardState } from "@/lib/game/useBoardState";
import {
  addNote,
  pinQuestion,
  moveBoardItem,
  deleteBoardItem,
  addConnection,
  deleteConnection,
} from "@/lib/supabase/board";
import { getErrorMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BoardNote } from "./BoardNote";
import { BoardQuestionCard } from "./BoardQuestionCard";
import { BoardCursorLayer } from "./BoardCursorLayer";

const NOTE_COLORS: BoardNoteColor[] = ["yellow", "pink", "blue", "green"];
const CURSOR_THROTTLE_MS = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Named lowercase (not a component/hook) so react-hooks/purity doesn't flag
// these impure calls even though they're only ever invoked from event handlers.
function now(): number {
  return performance.now();
}

function jitteredCenter(): { x: number; y: number } {
  return { x: 0.5 + (Math.random() - 0.5) * 0.2, y: 0.5 + (Math.random() - 0.5) * 0.2 };
}

// Approximate on-screen size of each card kind (BoardNote's w-[180px], an
// estimated rendered height, etc.) — used to find where a straight line
// toward the other endpoint would cross the card's edge, so connections
// exit from whichever side actually faces the other item: left/right for a
// mostly-horizontal connection, top/bottom for a mostly-vertical one, and a
// corner-ish point for anything in between (diagonal).
const CARD_SIZE_PX: Record<BoardItemKind, { width: number; height: number }> = {
  note: { width: 180, height: 90 },
  question: { width: 200, height: 110 },
};

function anchorPoint(
  kind: BoardItemKind,
  pos: { x: number; y: number },
  toward: { x: number; y: number },
  surfaceWidthPx: number,
  surfaceHeightPx: number
): { x: number; y: number } {
  const { width, height } = CARD_SIZE_PX[kind];
  const halfWidthFraction = width / 2 / surfaceWidthPx;
  const halfHeightFraction = height / 2 / surfaceHeightPx;
  const dx = toward.x - pos.x;
  const dy = toward.y - pos.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const distanceToEdge =
    1 / Math.max(Math.abs(ux) / halfWidthFraction, Math.abs(uy) / halfHeightFraction, 1e-6);
  return {
    x: clamp(pos.x + ux * distanceToEdge, 0, 1),
    y: clamp(pos.y + uy * distanceToEdge, 0, 1),
  };
}

export function CorkboardOverlay({
  supabase,
  roomId,
  playerId,
  playerName,
  questions,
  isHost,
  onClose,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  playerId: string;
  playerName: string;
  questions: Question[];
  isHost: boolean;
  onClose: () => void;
}) {
  const { state, broadcastCursor } = useBoardState(supabase, roomId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [connectDraft, setConnectDraft] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const [connectHoverTargetId, setConnectHoverTargetId] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteColor, setNoteColor] = useState<BoardNoteColor>("yellow");
  const [pickingQuestion, setPickingQuestion] = useState(false);
  const [surfaceWidthPx, setSurfaceWidthPx] = useState(800);
  const [surfaceHeightPx, setSurfaceHeightPx] = useState(600);

  const t = useTranslations("CorkboardOverlay");

  const surfaceRef = useRef<HTMLDivElement>(null);
  const draggingItemIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const connectDragFromRef = useRef<string | null>(null);
  const lastCursorSentRef = useRef(0);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      if (rect.width) setSurfaceWidthPx(rect.width);
      if (rect.height) setSurfaceHeightPx(rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function isAlreadyConnected(aId: string, bId: string): boolean {
    return state.connections.some(
      (c) =>
        (c.from_item_id === aId && c.to_item_id === bId) ||
        (c.from_item_id === bId && c.to_item_id === aId)
    );
  }

  function spawnPosition() {
    return jitteredCenter();
  }

  const pinnedQuestionIds = new Set(
    state.items.filter((i) => i.kind === "question").map((i) => i.question_id)
  );
  const unpinnedQuestions = questions.filter((q) => q.answer === "yes" && !pinnedQuestionIds.has(q.id));

  function positionFor(itemId: string, fallbackX: number, fallbackY: number) {
    return dragPositions[itemId] ?? { x: fallbackX, y: fallbackY };
  }

  function handleItemPointerDown(itemId: string, x: number, y: number, e: ReactPointerEvent) {
    if (!surfaceRef.current) return;
    surfaceRef.current.setPointerCapture(e.pointerId);
    const rect = surfaceRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left - x * rect.width,
      y: e.clientY - rect.top - y * rect.height,
    };
    draggingItemIdRef.current = itemId;
  }

  function handleConnectorPointerDown(itemId: string, e: ReactPointerEvent) {
    e.stopPropagation();
    if (!surfaceRef.current) return;
    surfaceRef.current.setPointerCapture(e.pointerId);
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    connectDragFromRef.current = itemId;
    setConnectDraft({ fromId: itemId, x, y });
  }

  function handleSurfacePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);

    const currentTime = now();
    if (currentTime - lastCursorSentRef.current > CURSOR_THROTTLE_MS) {
      lastCursorSentRef.current = currentTime;
      broadcastCursor({ player_id: playerId, name: playerName, x, y });
    }

    if (connectDragFromRef.current) {
      const hoverTarget = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("[data-item-id]")
        ?.getAttribute("data-item-id");
      setConnectHoverTargetId(
        hoverTarget && hoverTarget !== connectDragFromRef.current ? hoverTarget : null
      );
      setConnectDraft({ fromId: connectDragFromRef.current, x, y });
      return;
    }

    const draggingId = draggingItemIdRef.current;
    if (!draggingId) return;
    const itemX = clamp((e.clientX - rect.left - dragOffsetRef.current.x) / rect.width, 0, 1);
    const itemY = clamp((e.clientY - rect.top - dragOffsetRef.current.y) / rect.height, 0, 1);
    setDragPositions((prev) => ({ ...prev, [draggingId]: { x: itemX, y: itemY } }));
  }

  function handleSurfacePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (connectDragFromRef.current) {
      const fromId = connectDragFromRef.current;
      connectDragFromRef.current = null;
      setConnectDraft(null);
      setConnectHoverTargetId(null);
      surfaceRef.current?.releasePointerCapture(e.pointerId);

      const dropTarget = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("[data-item-id]")
        ?.getAttribute("data-item-id");
      if (dropTarget && dropTarget !== fromId && !isAlreadyConnected(fromId, dropTarget)) {
        addConnection(supabase, { roomId, playerId, fromItemId: fromId, toItemId: dropTarget }).catch(
          (err) => {
            const message = getErrorMessage(err, t("addConnectionError"));
            setActionError(
              message.includes("duplicate key") ? t("duplicateConnectionError") : message
            );
          }
        );
      }
      return;
    }

    const draggingId = draggingItemIdRef.current;
    if (!draggingId) return;
    draggingItemIdRef.current = null;
    surfaceRef.current?.releasePointerCapture(e.pointerId);
    const pos = dragPositions[draggingId];
    if (!pos) return;
    moveBoardItem(supabase, draggingId, pos.x, pos.y).catch((err) =>
      setActionError(getErrorMessage(err, t("moveItemError")))
    );
  }

  function handleDelete(itemId: string) {
    deleteBoardItem(supabase, itemId).catch((err) =>
      setActionError(getErrorMessage(err, t("deleteItemError")))
    );
  }

  function handleDeleteConnection(connectionId: string) {
    deleteConnection(supabase, connectionId).catch((err) =>
      setActionError(getErrorMessage(err, t("deleteConnectionError")))
    );
  }

  function handleAddNote() {
    if (!noteDraft.trim()) return;
    const { x, y } = spawnPosition();
    addNote(supabase, {
      roomId,
      playerId,
      text: noteDraft.trim(),
      color: noteColor,
      x,
      y,
    })
      .then(() => {
        setNoteDraft("");
        setAddingNote(false);
        setActionError(null);
      })
      .catch((err) => setActionError(getErrorMessage(err, t("addNoteError"))));
  }

  function handlePinQuestion(questionId: string) {
    const { x, y } = spawnPosition();
    pinQuestion(supabase, {
      roomId,
      playerId,
      questionId,
      x,
      y,
    })
      .then(() => {
        setPickingQuestion(false);
        setActionError(null);
      })
      .catch((err) => setActionError(getErrorMessage(err, t("pinQuestionError"))));
  }

  // While dragging a connection, snaps the line's loose end to the hovered
  // target's own edge-facing anchor (instead of the raw cursor position) so
  // the connection visibly goes dot-to-dot rather than dot-to-cursor.
  const connectPreview = (() => {
    if (!connectDraft) return null;
    const fromItem = state.items.find((i) => i.id === connectDraft.fromId);
    if (!fromItem) return null;
    const fromPos = positionFor(fromItem.id, fromItem.x, fromItem.y);
    const hoverTarget = connectHoverTargetId
      ? state.items.find((i) => i.id === connectHoverTargetId)
      : undefined;

    if (hoverTarget) {
      const targetPos = positionFor(hoverTarget.id, hoverTarget.x, hoverTarget.y);
      return {
        from: anchorPoint(fromItem.kind, fromPos, targetPos, surfaceWidthPx, surfaceHeightPx),
        to: anchorPoint(hoverTarget.kind, targetPos, fromPos, surfaceWidthPx, surfaceHeightPx),
        snapped: true,
      };
    }

    return {
      from: anchorPoint(fromItem.kind, fromPos, connectDraft, surfaceWidthPx, surfaceHeightPx),
      to: { x: connectDraft.x, y: connectDraft.y },
      snapped: false,
    };
  })();

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-white/5 p-4">
        <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">{t("title")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setAddingNote((v) => !v);
              setPickingQuestion(false);
            }}
          >
            {t("addNote")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPickingQuestion((v) => !v);
              setAddingNote(false);
            }}
            disabled={unpinnedQuestions.length === 0}
          >
            {t("pinQuestion")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>

      {addingNote && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 p-3">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddNote();
            }}
            placeholder={t("notePlaceholder")}
            maxLength={200}
            className="min-w-[200px] flex-1 rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
          />
          <div className="flex gap-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setNoteColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${noteColor === c ? "border-accent" : "border-transparent"}`}
                style={{
                  backgroundColor: { yellow: "#e8d477", pink: "#e0a8c0", blue: "#9ec4dd", green: "#a9cfa0" }[c],
                }}
              />
            ))}
          </div>
          <Button onClick={handleAddNote} disabled={!noteDraft.trim()}>
            {t("pin")}
          </Button>
        </div>
      )}

      {pickingQuestion && (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto border-b border-white/5 p-3">
          {unpinnedQuestions.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handlePinQuestion(q.id)}
              className="rounded-md border border-white/10 px-3 py-2 text-left font-serif text-sm text-text-primary hover:border-accent-muted"
            >
              {q.text}
            </button>
          ))}
        </div>
      )}

      <p className="border-b border-white/5 px-4 py-2 font-mono text-xs text-text-secondary">
        {t("instructions")}
      </p>

      {(actionError || state.error) && (
        <p className="border-b border-white/5 px-4 py-2 font-mono text-xs text-danger">
          {actionError ?? state.error}
        </p>
      )}

      <div
        ref={surfaceRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px]"
        onPointerMove={handleSurfacePointerMove}
        onPointerUp={handleSurfacePointerUp}
        onPointerCancel={handleSurfacePointerUp}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {state.connections.map((conn) => {
            const from = state.items.find((i) => i.id === conn.from_item_id);
            const to = state.items.find((i) => i.id === conn.to_item_id);
            if (!from || !to) return null;
            const fromPos = positionFor(from.id, from.x, from.y);
            const toPos = positionFor(to.id, to.x, to.y);
            const fromAnchor = anchorPoint(from.kind, fromPos, toPos, surfaceWidthPx, surfaceHeightPx);
            const toAnchor = anchorPoint(to.kind, toPos, fromPos, surfaceWidthPx, surfaceHeightPx);
            const canDeleteConnection = conn.created_by === playerId || isHost;
            return (
              <g key={conn.id}>
                <line
                  x1={fromAnchor.x * 100}
                  y1={fromAnchor.y * 100}
                  x2={toAnchor.x * 100}
                  y2={toAnchor.y * 100}
                  stroke="#c0392b"
                  strokeWidth={0.3}
                  vectorEffect="non-scaling-stroke"
                />
                {canDeleteConnection && (
                  <line
                    x1={fromAnchor.x * 100}
                    y1={fromAnchor.y * 100}
                    x2={toAnchor.x * 100}
                    y2={toAnchor.y * 100}
                    stroke="transparent"
                    strokeWidth={8}
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={() => handleDeleteConnection(conn.id)}
                  >
                    <title>{t("deleteConnectionTitle")}</title>
                  </line>
                )}
              </g>
            );
          })}
          {connectPreview && (
            <line
              x1={connectPreview.from.x * 100}
              y1={connectPreview.from.y * 100}
              x2={connectPreview.to.x * 100}
              y2={connectPreview.to.y * 100}
              stroke="#c0392b"
              strokeWidth={0.3}
              strokeDasharray="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {connectPreview?.snapped && (
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60 bg-[#c0392b]"
            style={{ left: `${connectPreview.to.x * 100}%`, top: `${connectPreview.to.y * 100}%` }}
          />
        )}

        {state.items.map((item) => {
          const pos = positionFor(item.id, item.x, item.y);
          const canDelete = item.created_by === playerId || isHost;

          if (item.kind === "note") {
            return (
              <BoardNote
                key={item.id}
                item={item}
                x={pos.x}
                y={pos.y}
                canDelete={canDelete}
                onPointerDown={(e) => handleItemPointerDown(item.id, pos.x, pos.y, e)}
                onConnectorPointerDown={(e) => handleConnectorPointerDown(item.id, e)}
                onDelete={() => handleDelete(item.id)}
              />
            );
          }

          return (
            <BoardQuestionCard
              key={item.id}
              item={item}
              question={questions.find((q) => q.id === item.question_id)}
              x={pos.x}
              y={pos.y}
              canDelete={canDelete}
              onPointerDown={(e) => handleItemPointerDown(item.id, pos.x, pos.y, e)}
              onConnectorPointerDown={(e) => handleConnectorPointerDown(item.id, e)}
              onDelete={() => handleDelete(item.id)}
            />
          );
        })}

        <BoardCursorLayer cursors={state.cursors} selfPlayerId={playerId} />
      </div>
    </Modal>
  );
}
