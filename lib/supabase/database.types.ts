import type { Room, RoomStatus } from "@/types/room";
import type { Player } from "@/types/player";
import type { Puzzle, PuzzleDifficulty, PublishedPuzzle, StoryPack } from "@/types/puzzle";
import type { Question, QuestionAnswer } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { ChatMessage } from "@/types/chatMessage";
import type { CaseLogEntry } from "@/types/caseLog";
import type { BoardItem, BoardItemKind, BoardNoteColor } from "@/types/boardItem";
import type { BoardConnection } from "@/types/boardConnection";
import type { Profile } from "@/types/profile";
import type { PuzzleVote, PuzzleVoteTotals, VoteValue } from "@/types/vote";
import type { PackFavorite } from "@/types/packFavorite";

type TableShape<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ViewShape<Row> = {
  Row: Row;
  Relationships: [];
};

export type Database = {
  public: {
    Views: {
      published_puzzles: ViewShape<PublishedPuzzle>;
      puzzle_vote_totals: ViewShape<PuzzleVoteTotals>;
    };
    Functions: {
      increment_player_score: {
        Args: { player_id_input: string; amount_input: number; room_id_input: string };
        Returns: void;
      };
      set_narrator: {
        Args: { room_id_input: string; player_id_input: string };
        Returns: void;
      };
      set_host: {
        Args: { room_id_input: string; player_id_input: string };
        Returns: void;
      };
      claim_host: {
        Args: { room_id_input: string; claiming_player_id: string };
        Returns: void;
      };
      claim_narrator: {
        Args: { room_id_input: string; new_narrator_id: string };
        Returns: void;
      };
      get_room_puzzle: {
        Args: { room_id_input: string };
        Returns: Puzzle[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      rooms: TableShape<
        Room,
        Partial<Room> & { code: string; host_id: string },
        Partial<Room>
      >;
      players: TableShape<
        Player,
        Partial<Player> & { room_id: string; name: string },
        Partial<Player>
      >;
      story_packs: TableShape<
        StoryPack,
        Partial<StoryPack> & { slug: string; name: string; theme: string },
        Partial<StoryPack>
      >;
      puzzles: TableShape<
        Puzzle,
        Partial<Puzzle> & {
          pack_id: string;
          title: string;
          scenario: string;
          solution: string;
        },
        Partial<Puzzle>
      >;
      questions: TableShape<
        Question,
        Partial<Question> & {
          room_id: string;
          puzzle_id: string;
          player_id: string;
          player_name: string;
          text: string;
          round: number;
        },
        Partial<Question>
      >;
      guesses: TableShape<
        Guess,
        Partial<Guess> & {
          room_id: string;
          puzzle_id: string;
          player_id: string;
          player_name: string;
          text: string;
        },
        Partial<Guess>
      >;
      chat_messages: TableShape<
        ChatMessage,
        Partial<ChatMessage> & {
          room_id: string;
          player_id: string;
          player_name: string;
          text: string;
        },
        Partial<ChatMessage>
      >;
      case_log: TableShape<
        CaseLogEntry,
        Partial<CaseLogEntry> & {
          room_id: string;
          round: number;
          puzzle_title: string;
          difficulty: string;
          outcome: string;
        },
        Partial<CaseLogEntry>
      >;
      board_items: TableShape<
        BoardItem,
        Partial<BoardItem> & {
          room_id: string;
          kind: BoardItemKind;
          created_by: string;
        },
        Partial<BoardItem>
      >;
      board_connections: TableShape<
        BoardConnection,
        Partial<BoardConnection> & {
          room_id: string;
          from_item_id: string;
          to_item_id: string;
          created_by: string;
        },
        Partial<BoardConnection>
      >;
      profiles: TableShape<
        Profile,
        Partial<Profile> & { id: string; display_name: string },
        Partial<Profile>
      >;
      puzzle_votes: TableShape<
        PuzzleVote,
        Partial<PuzzleVote> & { puzzle_id: string; user_id: string; value: VoteValue },
        Partial<PuzzleVote>
      >;
      pack_favorites: TableShape<
        PackFavorite,
        Partial<PackFavorite> & { pack_id: string; user_id: string },
        Partial<PackFavorite>
      >;
    };
  };
};

export type { RoomStatus, PuzzleDifficulty, QuestionAnswer, BoardItemKind, BoardNoteColor };
