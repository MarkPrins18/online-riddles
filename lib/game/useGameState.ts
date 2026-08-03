import { useEffect, useReducer, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getRoomByCode } from "@/lib/supabase/rooms";
import { getPlayersInRoom } from "@/lib/supabase/players";
import { getRoomPuzzle } from "@/lib/supabase/puzzles";
import { getQuestionsForPuzzle } from "@/lib/supabase/questions";
import { getGuessesForPuzzle } from "@/lib/supabase/guesses";
import { getChatMessages } from "@/lib/supabase/chatMessages";
import { getCaseLogForRoom } from "@/lib/supabase/caseLog";
import { subscribeToRoom, unsubscribeFromRoom } from "@/lib/realtime/room-channel";
import { getErrorMessage } from "@/lib/errors";
import type { Room } from "@/types/room";
import { gameReducer, initialGameState } from "./reducer";

export function useGameState(roomCode: string) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [supabase] = useState(() => createClient());
  const currentPuzzleIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        await ensureAnonymousSession(supabase);
        const room = await getRoomByCode(supabase, roomCode);
        if (!room || cancelled) return;

        const players = await getPlayersInRoom(supabase, room.id);
        const puzzle = room.current_puzzle_id
          ? await getRoomPuzzle(supabase, room.id)
          : null;
        const questions = room.current_puzzle_id
          ? await getQuestionsForPuzzle(supabase, room.id, room.current_puzzle_id)
          : [];
        const guesses = room.current_puzzle_id
          ? await getGuessesForPuzzle(supabase, room.id, room.current_puzzle_id)
          : [];
        const chatMessages = await getChatMessages(supabase, room.id);
        const caseLog = await getCaseLogForRoom(supabase, room.id);

        if (cancelled) return;

        currentPuzzleIdRef.current = room.current_puzzle_id;

        dispatch({
          type: "HYDRATE",
          payload: {
            room,
            players,
            puzzle: puzzle ?? undefined,
            questions,
            guesses,
            chatMessages,
            caseLog,
          },
        });

        function handleRoomUpdate(updated: Room) {
          dispatch({ type: "ROOM_UPDATED", payload: updated });

          // A new round started (host/narrator advanced to a fresh
          // puzzle) — the puzzle, questions and guesses in state are all
          // still the previous round's, since realtime only appends new
          // rows and never re-fetches. Reload all three so the new
          // narrator's solution visibility and the clues board reflect
          // the current round instead of a stale, accumulated one.
          if (updated.current_puzzle_id && updated.current_puzzle_id !== currentPuzzleIdRef.current) {
            currentPuzzleIdRef.current = updated.current_puzzle_id;
            Promise.all([
              getRoomPuzzle(supabase, updated.id),
              getQuestionsForPuzzle(supabase, updated.id, updated.current_puzzle_id),
              getGuessesForPuzzle(supabase, updated.id, updated.current_puzzle_id),
            ])
              .then(([newPuzzle, newQuestions, newGuesses]) => {
                if (newPuzzle) dispatch({ type: "PUZZLE_LOADED", payload: newPuzzle });
                dispatch({ type: "QUESTIONS_RELOADED", payload: newQuestions });
                dispatch({ type: "GUESSES_RELOADED", payload: newGuesses });
              })
              .catch((error) => {
                dispatch({
                  type: "ERROR",
                  payload: getErrorMessage(error, "Kon de nieuwe zaak niet laden."),
                });
              });
          }
        }

        // Safety net: a realtime WebSocket connection can silently drop
        // (backgrounded tab, brief network blip) without an obvious
        // reconnect, leaving a client stuck on a stale room state — e.g.
        // the end-of-game screen — until they manually refresh. Re-fetch
        // the room whenever the tab regains focus/visibility, so a missed
        // update self-heals instead of requiring a reload.
        function handleVisibilityChange() {
          if (document.visibilityState !== "visible") return;
          getRoomByCode(supabase, roomCode)
            .then((freshRoom) => {
              if (freshRoom) handleRoomUpdate(freshRoom);
            })
            .catch(() => {
              // Best-effort — the realtime subscription remains the
              // primary source of truth, this is only a fallback.
            });
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange);

        const channel = subscribeToRoom(supabase, room.id, {
          onRoomUpdate: handleRoomUpdate,
          onPlayerJoin: (player) => dispatch({ type: "PLAYER_JOINED", payload: player }),
          onPlayerUpdate: (player) => dispatch({ type: "PLAYER_UPDATED", payload: player }),
          onPlayerLeave: (playerId) => dispatch({ type: "PLAYER_LEFT", payload: { playerId } }),
          onQuestionInsert: (question) => dispatch({ type: "QUESTION_ASKED", payload: question }),
          onQuestionUpdate: (question) => dispatch({ type: "QUESTION_ANSWERED", payload: question }),
          onGuessInsert: (guess) => dispatch({ type: "GUESS_SUBMITTED", payload: guess }),
          onGuessUpdate: (guess) => dispatch({ type: "GUESS_UPDATED", payload: guess }),
          onChatMessageInsert: (message) => dispatch({ type: "CHAT_MESSAGE_SENT", payload: message }),
          onCaseLogInsert: (entry) => dispatch({ type: "CASE_LOGGED", payload: entry }),
        });

        return { channel, handleVisibilityChange };
      } catch (error) {
        if (cancelled) return;
        const message = getErrorMessage(error, "Kon geen verbinding maken met de kamer.");
        dispatch({ type: "ERROR", payload: message });
        return undefined;
      }
    }

    const setupPromise = hydrate();

    return () => {
      cancelled = true;
      setupPromise.then((setup) => {
        if (!setup) return;
        unsubscribeFromRoom(setup.channel);
        document.removeEventListener("visibilitychange", setup.handleVisibilityChange);
        window.removeEventListener("focus", setup.handleVisibilityChange);
      });
    };
  }, [roomCode, supabase]);

  return { state, supabase };
}
