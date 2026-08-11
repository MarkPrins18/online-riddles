import type { Room } from "@/types/room";
import type { Player } from "@/types/player";
import type { Puzzle } from "@/types/puzzle";
import type { Question } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { ChatMessage } from "@/types/chatMessage";
import type { Hint } from "@/types/hint";
import type { ChatMessageReaction } from "@/types/chatMessageReaction";
import type { CaseLogEntry } from "@/types/caseLog";
import type { RoundSecret } from "@/types/roundSecret";
import type { RoundAccusation } from "@/types/roundAccusation";

export type GameState = {
  room: Room | null;
  players: Player[];
  puzzle: Puzzle | null;
  questions: Question[];
  guesses: Guess[];
  // Narrator-authored, scoped to the current puzzle/round — replaced
  // wholesale on round change (HINTS_RELOADED), same as questions/guesses,
  // since there's no automatic/timer-driven hint left to derive this from.
  hints: Hint[];
  chatMessages: ChatMessage[];
  chatReactions: ChatMessageReaction[];
  caseLog: CaseLogEntry[];
  // Non-null only for the current player if they're this round's saboteur,
  // or for everyone once the accusation vote has closed (see
  // round_secrets' RLS policy) — reset to null whenever the round changes.
  roundSecret: RoundSecret | null;
  // Same "own vote, or everyone once revealed" visibility as roundSecret.
  roundAccusations: RoundAccusation[];
  // Player ids currently tracked as present on the room's realtime channel
  // (see lib/realtime/room-channel.ts) — reflects actual connection state,
  // not anything persisted in the database.
  onlinePlayerIds: Set<string>;
  error: string | null;
};

export const initialGameState: GameState = {
  room: null,
  players: [],
  puzzle: null,
  questions: [],
  guesses: [],
  hints: [],
  chatMessages: [],
  chatReactions: [],
  caseLog: [],
  roundSecret: null,
  roundAccusations: [],
  onlinePlayerIds: new Set(),
  error: null,
};

export type GameAction =
  | { type: "HYDRATE"; payload: Partial<GameState> }
  | { type: "ROOM_UPDATED"; payload: Room }
  | { type: "PUZZLE_LOADED"; payload: Puzzle }
  | { type: "QUESTIONS_RELOADED"; payload: Question[] }
  | { type: "GUESSES_RELOADED"; payload: Guess[] }
  | { type: "PLAYER_JOINED"; payload: Player }
  | { type: "PLAYER_UPDATED"; payload: Player }
  | { type: "PLAYER_LEFT"; payload: { playerId: string } }
  | { type: "QUESTION_ASKED"; payload: Question }
  | { type: "QUESTION_ANSWERED"; payload: Question }
  | { type: "GUESS_SUBMITTED"; payload: Guess }
  | { type: "GUESS_UPDATED"; payload: Guess }
  | { type: "HINTS_RELOADED"; payload: Hint[] }
  | { type: "HINT_SENT"; payload: Hint }
  | { type: "CHAT_MESSAGE_SENT"; payload: ChatMessage }
  | { type: "CHAT_REACTION_ADDED"; payload: ChatMessageReaction }
  | { type: "CHAT_REACTION_REMOVED"; payload: { reactionId: string } }
  | { type: "CASE_LOGGED"; payload: CaseLogEntry }
  | { type: "ROUND_SECRET_LOADED"; payload: RoundSecret | null }
  | { type: "ROUND_SECRET_RECEIVED"; payload: RoundSecret }
  | { type: "ROUND_ACCUSATIONS_RELOADED"; payload: RoundAccusation[] }
  | { type: "ROUND_ACCUSATION_RECEIVED"; payload: RoundAccusation }
  | { type: "PRESENCE_SYNCED"; payload: Set<string> }
  | { type: "ERROR"; payload: string };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };

    case "ROOM_UPDATED":
      return { ...state, room: action.payload };

    case "PUZZLE_LOADED":
      return { ...state, puzzle: action.payload };

    // Dispatched when the room moves to a new round (current_puzzle_id
    // changes) — replaces the accumulated list instead of appending, since
    // the realtime QUESTION_ASKED/GUESS_SUBMITTED actions otherwise only
    // ever add rows and never drop the previous round's now-irrelevant ones.
    case "QUESTIONS_RELOADED":
      return { ...state, questions: action.payload };

    case "GUESSES_RELOADED":
      return { ...state, guesses: action.payload };

    case "PLAYER_JOINED": {
      const exists = state.players.some((p) => p.id === action.payload.id);
      if (exists) return state;
      return { ...state, players: [...state.players, action.payload] };
    }

    case "PLAYER_UPDATED":
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case "PLAYER_LEFT":
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.payload.playerId),
      };

    case "QUESTION_ASKED":
      return { ...state, questions: [...state.questions, action.payload] };

    case "QUESTION_ANSWERED":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.id ? action.payload : q
        ),
      };

    case "GUESS_SUBMITTED":
      return { ...state, guesses: [...state.guesses, action.payload] };

    case "GUESS_UPDATED":
      return {
        ...state,
        guesses: state.guesses.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };

    case "HINTS_RELOADED":
      return { ...state, hints: action.payload };

    case "HINT_SENT": {
      const exists = state.hints.some((h) => h.id === action.payload.id);
      if (exists) return state;
      return { ...state, hints: [...state.hints, action.payload] };
    }

    case "CHAT_MESSAGE_SENT":
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };

    case "CHAT_REACTION_ADDED": {
      const exists = state.chatReactions.some((r) => r.id === action.payload.id);
      if (exists) return state;
      return { ...state, chatReactions: [...state.chatReactions, action.payload] };
    }

    case "CHAT_REACTION_REMOVED":
      return {
        ...state,
        chatReactions: state.chatReactions.filter((r) => r.id !== action.payload.reactionId),
      };

    case "CASE_LOGGED": {
      const exists = state.caseLog.some((entry) => entry.id === action.payload.id);
      if (exists) return state;
      return { ...state, caseLog: [...state.caseLog, action.payload] };
    }

    case "ROUND_SECRET_LOADED":
      return { ...state, roundSecret: action.payload };

    case "ROUND_SECRET_RECEIVED":
      return { ...state, roundSecret: action.payload };

    case "ROUND_ACCUSATIONS_RELOADED":
      return { ...state, roundAccusations: action.payload };

    case "ROUND_ACCUSATION_RECEIVED": {
      const exists = state.roundAccusations.some((a) => a.id === action.payload.id);
      return {
        ...state,
        roundAccusations: exists
          ? state.roundAccusations.map((a) => (a.id === action.payload.id ? action.payload : a))
          : [...state.roundAccusations, action.payload],
      };
    }

    case "PRESENCE_SYNCED":
      return { ...state, onlinePlayerIds: action.payload };

    case "ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
}
