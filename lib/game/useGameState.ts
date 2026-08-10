import { useEffect, useReducer, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getRoomByCode } from "@/lib/supabase/rooms";
import { getPlayersInRoom } from "@/lib/supabase/players";
import { getRoomPuzzle } from "@/lib/supabase/puzzles";
import { getQuestionsForPuzzle } from "@/lib/supabase/questions";
import { getGuessesForPuzzle } from "@/lib/supabase/guesses";
import { getChatMessages } from "@/lib/supabase/chatMessages";
import { getChatMessageReactions } from "@/lib/supabase/chatMessageReactions";
import { getCaseLogForRoom } from "@/lib/supabase/caseLog";
import { getRoundSecret } from "@/lib/supabase/roundSecrets";
import { getRoundAccusations } from "@/lib/supabase/roundAccusations";
import { subscribeToRoom, unsubscribeFromRoom, trackPresence } from "@/lib/realtime/room-channel";
import { getErrorMessage } from "@/lib/errors";
import type { Room } from "@/types/room";
import type { RoundSecret } from "@/types/roundSecret";
import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from "@supabase/supabase-js";
import { gameReducer, initialGameState } from "./reducer";

export function useGameState(roomCode: string, playerId: string | null = null, locale: string = "nl") {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [supabase] = useState(() => createClient());
  const currentPuzzleIdRef = useRef<string | null>(null);
  const currentRoundRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const trackedPlayerIdRef = useRef<string | null>(null);
  // Set once the channel has reached SUBSCRIBED for the first time — after
  // that, seeing SUBSCRIBED again means the socket dropped and reconnected,
  // which is the resync signal (see handleStatusChange below).
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        await ensureAnonymousSession(supabase);
        const room = await getRoomByCode(supabase, roomCode);
        if (!room || cancelled) return;

        const players = await getPlayersInRoom(supabase, room.id);
        const puzzle = room.current_puzzle_id
          ? await getRoomPuzzle(supabase, room.id, locale)
          : null;
        const questions = room.current_puzzle_id
          ? await getQuestionsForPuzzle(supabase, room.id, room.current_puzzle_id)
          : [];
        const guesses = room.current_puzzle_id
          ? await getGuessesForPuzzle(supabase, room.id, room.current_puzzle_id)
          : [];
        const chatMessages = await getChatMessages(supabase, room.id);
        const chatReactions = await getChatMessageReactions(supabase, room.id);
        const caseLog = await getCaseLogForRoom(supabase, room.id);
        const roundSecret = room.current_puzzle_id
          ? await getRoundSecret(supabase, room.id, room.round)
          : null;
        const roundAccusations = room.current_puzzle_id
          ? await getRoundAccusations(supabase, room.id, room.round)
          : [];

        if (cancelled) return;

        currentPuzzleIdRef.current = room.current_puzzle_id;
        currentRoundRef.current = room.round;

        dispatch({
          type: "HYDRATE",
          payload: {
            room,
            players,
            puzzle: puzzle ?? undefined,
            questions,
            guesses,
            chatMessages,
            chatReactions,
            caseLog,
            roundSecret,
            roundAccusations,
          },
        });

        // Full resync for a room whose id we already know: re-fetches
        // everything realtime could have silently missed rows for while
        // disconnected (postgres_changes only pushes events while the
        // socket is actually open — a dropped connection never replays what
        // happened during the gap). Deliberately refetches players and chat
        // too, not just the current round's puzzle/questions/guesses,
        // because *any* table's insert/update could have been the one that
        // got lost, not only questions.
        function resyncRoom(freshRoom: Room) {
          currentPuzzleIdRef.current = freshRoom.current_puzzle_id;
          currentRoundRef.current = freshRoom.round;
          Promise.all([
            getPlayersInRoom(supabase, freshRoom.id),
            freshRoom.current_puzzle_id ? getRoomPuzzle(supabase, freshRoom.id, locale) : null,
            freshRoom.current_puzzle_id
              ? getQuestionsForPuzzle(supabase, freshRoom.id, freshRoom.current_puzzle_id)
              : [],
            freshRoom.current_puzzle_id
              ? getGuessesForPuzzle(supabase, freshRoom.id, freshRoom.current_puzzle_id)
              : [],
            getChatMessages(supabase, freshRoom.id),
            getChatMessageReactions(supabase, freshRoom.id),
            getCaseLogForRoom(supabase, freshRoom.id),
            freshRoom.current_puzzle_id
              ? getRoundSecret(supabase, freshRoom.id, freshRoom.round)
              : null,
            freshRoom.current_puzzle_id
              ? getRoundAccusations(supabase, freshRoom.id, freshRoom.round)
              : [],
          ])
            .then(
              ([
                freshPlayers,
                freshPuzzle,
                freshQuestions,
                freshGuesses,
                freshChatMessages,
                freshChatReactions,
                freshCaseLog,
                freshRoundSecret,
                freshRoundAccusations,
              ]) => {
                dispatch({
                  type: "HYDRATE",
                  payload: {
                    room: freshRoom,
                    players: freshPlayers,
                    puzzle: freshPuzzle ?? undefined,
                    questions: freshQuestions,
                    guesses: freshGuesses,
                    chatMessages: freshChatMessages,
                    chatReactions: freshChatReactions,
                    caseLog: freshCaseLog,
                    roundSecret: freshRoundSecret,
                    roundAccusations: freshRoundAccusations,
                  },
                });
              }
            )
            .catch((error) => {
              dispatch({
                type: "ERROR",
                payload: getErrorMessage(error, "Kon de kamer niet opnieuw synchroniseren."),
              });
            });
        }

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
            currentRoundRef.current = updated.round;
            Promise.all([
              getRoomPuzzle(supabase, updated.id, locale),
              getQuestionsForPuzzle(supabase, updated.id, updated.current_puzzle_id),
              getGuessesForPuzzle(supabase, updated.id, updated.current_puzzle_id),
              getRoundSecret(supabase, updated.id, updated.round),
              getRoundAccusations(supabase, updated.id, updated.round),
            ])
              .then(([newPuzzle, newQuestions, newGuesses, newRoundSecret, newRoundAccusations]) => {
                if (newPuzzle) dispatch({ type: "PUZZLE_LOADED", payload: newPuzzle });
                dispatch({ type: "QUESTIONS_RELOADED", payload: newQuestions });
                dispatch({ type: "GUESSES_RELOADED", payload: newGuesses });
                dispatch({ type: "ROUND_SECRET_LOADED", payload: newRoundSecret });
                dispatch({ type: "ROUND_ACCUSATIONS_RELOADED", payload: newRoundAccusations });
              })
              .catch((error) => {
                dispatch({
                  type: "ERROR",
                  payload: getErrorMessage(error, "Kon de nieuwe zaak niet laden."),
                });
              });
          }
        }

        // Once a round's accusation vote closes (revealed flips true, via
        // close_accusation_vote), every player's individual vote becomes
        // newly visible under RLS — but Realtime never retroactively
        // delivers rows that only just became visible, so this refetches
        // them explicitly instead of waiting for events that will never
        // come.
        function handleRoundSecretUpdate(secret: RoundSecret) {
          dispatch({ type: "ROUND_SECRET_RECEIVED", payload: secret });
          if (!secret.revealed) return;
          getRoundAccusations(supabase, secret.room_id, secret.round)
            .then((accusations) => {
              dispatch({ type: "ROUND_ACCUSATIONS_RELOADED", payload: accusations });
            })
            .catch((error) => {
              dispatch({
                type: "ERROR",
                payload: getErrorMessage(error, "Kon de stemmen niet laden."),
              });
            });
        }

        // Safety net #1: a realtime WebSocket connection can silently drop
        // (backgrounded tab, brief network blip) without an obvious
        // reconnect, leaving a client stuck on stale state until they
        // manually refresh. Full resync whenever the tab regains
        // focus/visibility, so a missed update self-heals instead of
        // requiring a reload.
        function handleVisibilityChange() {
          if (document.visibilityState !== "visible") return;
          getRoomByCode(supabase, roomCode)
            .then((freshRoom) => {
              if (freshRoom) resyncRoom(freshRoom);
            })
            .catch(() => {
              // Best-effort — the realtime subscription remains the
              // primary source of truth, this is only a fallback.
            });
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange);

        // Safety net #2: catches the same silent-drop case even when the
        // tab never lost focus (e.g. a brief Wi-Fi blip on a foregrounded
        // phone) — the channel itself reports SUBSCRIBED again once the
        // socket reconnects. The very first SUBSCRIBED is the initial
        // connect (hydrate() above already fetched everything), so only
        // treat the second-and-later ones as reconnects worth resyncing.
        function handleStatusChange(status: REALTIME_SUBSCRIBE_STATES) {
          if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return;
          if (!hasConnectedOnceRef.current) {
            hasConnectedOnceRef.current = true;
            return;
          }
          getRoomByCode(supabase, roomCode)
            .then((freshRoom) => {
              if (freshRoom) resyncRoom(freshRoom);
            })
            .catch(() => {
              // Best-effort — same fallback rationale as handleVisibilityChange.
            });
        }

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
          onChatReactionInsert: (reaction) =>
            dispatch({ type: "CHAT_REACTION_ADDED", payload: reaction }),
          onChatReactionDelete: (reactionId) =>
            dispatch({ type: "CHAT_REACTION_REMOVED", payload: { reactionId } }),
          onCaseLogInsert: (entry) => dispatch({ type: "CASE_LOGGED", payload: entry }),
          onRoundSecretInsert: (secret) =>
            dispatch({ type: "ROUND_SECRET_RECEIVED", payload: secret }),
          onRoundSecretUpdate: handleRoundSecretUpdate,
          onRoundAccusationInsert: (accusation) =>
            dispatch({ type: "ROUND_ACCUSATION_RECEIVED", payload: accusation }),
          onRoundAccusationUpdate: (accusation) =>
            dispatch({ type: "ROUND_ACCUSATION_RECEIVED", payload: accusation }),
          onPresenceSync: (players) =>
            dispatch({ type: "PRESENCE_SYNCED", payload: new Set(players.map((p) => p.player_id)) }),
          onStatusChange: handleStatusChange,
        });
        channelRef.current = channel;

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
      channelRef.current = null;
      trackedPlayerIdRef.current = null;
      hasConnectedOnceRef.current = false;
    };
  }, [roomCode, supabase, locale]);

  // Announces this client's presence once its own player row is known —
  // playerId can arrive after the channel does (e.g. joining a room from
  // its lobby), so this can't just live inside hydrate(). Guarded by a ref
  // (not state) so it tracks once per player id instead of re-tracking on
  // every unrelated players-list change.
  useEffect(() => {
    if (!playerId || trackedPlayerIdRef.current === playerId) return;
    const me = state.players.find((p) => p.id === playerId);
    if (!me || !channelRef.current) return;

    trackedPlayerIdRef.current = playerId;
    trackPresence(channelRef.current, {
      player_id: playerId,
      name: me.name,
      online_at: new Date().toISOString(),
    });
  }, [playerId, state.players]);

  return { state, supabase };
}
