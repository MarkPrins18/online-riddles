import type { Room } from "@/types/room";
import type { Player } from "@/types/player";
import type { Puzzle } from "@/types/puzzle";
import type { Question } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { ChatMessage } from "@/types/chatMessage";
import type { CaseLogEntry } from "@/types/caseLog";

export type GameState = {
  room: Room | null;
  players: Player[];
  puzzle: Puzzle | null;
  questions: Question[];
  guesses: Guess[];
  chatMessages: ChatMessage[];
  caseLog: CaseLogEntry[];
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
  chatMessages: [],
  caseLog: [],
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
  | { type: "CHAT_MESSAGE_SENT"; payload: ChatMessage }
  | { type: "CASE_LOGGED"; payload: CaseLogEntry }
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

    case "CHAT_MESSAGE_SENT":
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };

    case "CASE_LOGGED": {
      const exists = state.caseLog.some((entry) => entry.id === action.payload.id);
      if (exists) return state;
      return { ...state, caseLog: [...state.caseLog, action.payload] };
    }

    case "PRESENCE_SYNCED":
      return { ...state, onlinePlayerIds: action.payload };

    case "ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
}
