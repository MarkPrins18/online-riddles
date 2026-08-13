import { useEffect, useReducer, useRef } from "react";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BoardItem } from "@/types/boardItem";
import type { BoardConnection } from "@/types/boardConnection";
import type { BoardCursor } from "@/types/boardCursor";
import { getBoardItems, getBoardConnections } from "@/lib/supabase/board";
import { subscribeToBoard, unsubscribeFromBoard, sendCursor } from "@/lib/realtime/board-channel";
import { getErrorMessage } from "@/lib/errors";

/**
 * The board's realtime `broadcast` channel accepts a cursor payload from
 * anyone holding the (public) anon key, room member or not — Postgres RLS
 * doesn't apply to broadcast messages the way it does to postgres_changes.
 * Rather than a spoofed cursor (any name/position, any player_id) actually
 * rendering for real participants, this rejects anything whose player_id
 * isn't a player this client already knows is in the room.
 */
export function isKnownBoardCursor(cursor: BoardCursor, knownPlayerIds: ReadonlySet<string>): boolean {
  return knownPlayerIds.has(cursor.player_id);
}

type BoardState = {
  items: BoardItem[];
  connections: BoardConnection[];
  cursors: Record<string, BoardCursor>;
  error: string | null;
  ready: boolean;
};

const initialState: BoardState = {
  items: [],
  connections: [],
  cursors: {},
  error: null,
  ready: false,
};

type BoardAction =
  | { type: "HYDRATE"; payload: { items: BoardItem[]; connections: BoardConnection[] } }
  | { type: "ITEM_UPSERT"; payload: BoardItem }
  | { type: "ITEM_DELETE"; payload: { id: string } }
  | { type: "CONNECTION_INSERT"; payload: BoardConnection }
  | { type: "CONNECTION_DELETE"; payload: { id: string } }
  | { type: "CURSOR"; payload: BoardCursor }
  | { type: "ERROR"; payload: string };

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, ready: true };
    case "ITEM_UPSERT": {
      const exists = state.items.some((i) => i.id === action.payload.id);
      return {
        ...state,
        items: exists
          ? state.items.map((i) => (i.id === action.payload.id ? action.payload : i))
          : [...state.items, action.payload],
      };
    }
    case "ITEM_DELETE":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload.id),
        connections: state.connections.filter(
          (c) => c.from_item_id !== action.payload.id && c.to_item_id !== action.payload.id
        ),
      };
    case "CONNECTION_INSERT": {
      const exists = state.connections.some((c) => c.id === action.payload.id);
      if (exists) return state;
      return { ...state, connections: [...state.connections, action.payload] };
    }
    case "CONNECTION_DELETE":
      return { ...state, connections: state.connections.filter((c) => c.id !== action.payload.id) };
    case "CURSOR":
      return { ...state, cursors: { ...state.cursors, [action.payload.player_id]: action.payload } };
    case "ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

/**
 * Scoped to the corkboard overlay's lifecycle — hydrates and subscribes on
 * mount, tears the board channel down on unmount. Deliberately separate
 * from the always-on lib/game/useGameState.ts so players who never open
 * the board never load board data or hold a board subscription open.
 */
export function useBoardState(
  supabase: SupabaseClient<Database>,
  roomId: string,
  knownPlayerIds: ReadonlySet<string>
) {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Kept fresh via its own effect (not a dependency of the subscription
  // effect below) so the subscription set up once always checks against
  // the current player list, not a stale snapshot from whenever the main
  // effect last ran — refs can't be written during render itself.
  const knownPlayerIdsRef = useRef(knownPlayerIds);
  useEffect(() => {
    knownPlayerIdsRef.current = knownPlayerIds;
  }, [knownPlayerIds]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [items, connections] = await Promise.all([
          getBoardItems(supabase, roomId),
          getBoardConnections(supabase, roomId),
        ]);
        if (cancelled) return;
        dispatch({ type: "HYDRATE", payload: { items, connections } });

        const channel = subscribeToBoard(supabase, roomId, {
          onItemInsert: (item) => dispatch({ type: "ITEM_UPSERT", payload: item }),
          onItemUpdate: (item) => dispatch({ type: "ITEM_UPSERT", payload: item }),
          onItemDelete: (id) => dispatch({ type: "ITEM_DELETE", payload: { id } }),
          onConnectionInsert: (c) => dispatch({ type: "CONNECTION_INSERT", payload: c }),
          onConnectionDelete: (id) => dispatch({ type: "CONNECTION_DELETE", payload: { id } }),
          onCursor: (cursor) => {
            if (!isKnownBoardCursor(cursor, knownPlayerIdsRef.current)) return;
            dispatch({ type: "CURSOR", payload: cursor });
          },
        });
        channelRef.current = channel;
      } catch (error) {
        if (cancelled) return;
        dispatch({ type: "ERROR", payload: getErrorMessage(error, "Kon het prikbord niet laden.") });
      }
    }

    hydrate();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        unsubscribeFromBoard(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, roomId]);

  function broadcastCursor(cursor: BoardCursor) {
    if (channelRef.current) sendCursor(channelRef.current, cursor);
  }

  return { state, broadcastCursor };
}
