import type { Room, RoomStatus } from "@/types/room";
import type { Player } from "@/types/player";
import type {
  Puzzle,
  PuzzleDifficulty,
  PublishedPuzzle,
  StoryPack,
  Category,
  PuzzleTranslation,
  CategoryTranslation,
  StoryPackTranslation,
  TranslationStatus,
} from "@/types/puzzle";
import type { Question, QuestionAnswer } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { ChatMessage } from "@/types/chatMessage";
import type { ChatMessageReaction } from "@/types/chatMessageReaction";
import type { CaseLogEntry } from "@/types/caseLog";
import type { RoundSecret } from "@/types/roundSecret";
import type { RoundAccusation } from "@/types/roundAccusation";
import type { BoardItem, BoardItemKind, BoardNoteColor } from "@/types/boardItem";
import type { BoardConnection } from "@/types/boardConnection";
import type { Profile } from "@/types/profile";
import type { PuzzleVote, PuzzleVoteTotals, VoteValue } from "@/types/vote";
import type { PackFavorite } from "@/types/packFavorite";
import type { Hint } from "@/types/hint";
import type { PlayerStats } from "@/types/playerStats";

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
      reclaim_player: {
        Args: { room_id_input: string; target_player_id: string; name_input: string };
        Returns: void;
      };
      close_accusation_vote: {
        Args: { room_id_input: string; round_input: number };
        Returns: void;
      };
      get_room_puzzle: {
        Args: { room_id_input: string; locale_input?: string };
        Returns: Puzzle[];
      };
      get_published_puzzles: {
        Args: { locale_input: string };
        Returns: PublishedPuzzle[];
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
      // `name` moved to `story_pack_translations` below — the Row shape
      // stays `StoryPack` (name included) since every read joins in the
      // requested locale, same story as `puzzles`/`categories` below.
      story_packs: TableShape<
        StoryPack,
        { slug: string; theme: string; is_published?: boolean; created_by?: string | null; is_community?: boolean },
        Partial<{ theme: string; is_published: boolean }>
      >;
      story_pack_translations: TableShape<
        StoryPackTranslation,
        { pack_id: string; locale: string; name: string; status?: TranslationStatus },
        Partial<Omit<StoryPackTranslation, "pack_id" | "locale">>
      >;
      // `puzzles` itself is now locale-agnostic (no title/scenario/solution/
      // hint) — those live in `puzzle_translations` below. The Row shape
      // stays `Puzzle` (title etc. included) because every read goes
      // through get_published_puzzles/get_room_puzzle, which already join
      // in the right locale — the client never selects the bare table.
      puzzles: TableShape<
        Puzzle,
        {
          pack_id: string;
          category_id?: string | null;
          difficulty: PuzzleDifficulty;
          created_by?: string | null;
          is_community?: boolean;
        },
        Partial<{ category_id: string | null; difficulty: PuzzleDifficulty; is_community: boolean }>
      >;
      puzzle_translations: TableShape<
        PuzzleTranslation,
        {
          puzzle_id: string;
          locale: string;
          title: string;
          scenario: string;
          solution: string;
          hint?: string | null;
          status?: TranslationStatus;
        },
        Partial<Omit<PuzzleTranslation, "puzzle_id" | "locale">>
      >;
      // Same story as `puzzles` above: `name` moved to
      // `category_translations`, the Row shape stays `Category` since every
      // read joins in the requested locale.
      categories: TableShape<Category, Record<string, never>, Record<string, never>>;
      category_translations: TableShape<
        CategoryTranslation,
        { category_id: string; locale: string; name: string; status?: TranslationStatus },
        Partial<Omit<CategoryTranslation, "category_id" | "locale">>
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
      hints: TableShape<
        Hint,
        Partial<Hint> & {
          room_id: string;
          puzzle_id: string;
          player_id: string;
          player_name: string;
          text: string;
          round: number;
        },
        Partial<Hint>
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
      chat_message_reactions: TableShape<
        ChatMessageReaction,
        Partial<ChatMessageReaction> & {
          room_id: string;
          message_id: string;
          player_id: string;
          emoji: string;
        },
        Partial<ChatMessageReaction>
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
      round_secrets: TableShape<
        RoundSecret,
        Partial<RoundSecret> & { room_id: string; round: number; saboteur_id: string },
        Partial<RoundSecret>
      >;
      round_accusations: TableShape<
        RoundAccusation,
        Partial<RoundAccusation> & {
          room_id: string;
          round: number;
          voter_id: string;
          target_id: string;
        },
        Partial<RoundAccusation>
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
      // Row-only — every write goes through security-definer functions
      // (see schema.sql), never a direct client insert/update, so there's
      // no Insert/Update shape worth typing here.
      player_stats: TableShape<PlayerStats, never, never>;
    };
  };
};

export type { RoomStatus, PuzzleDifficulty, QuestionAnswer, BoardItemKind, BoardNoteColor };
