// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { NarratorGuessControls } from "./NarratorGuessControls";
import { reviewGuess } from "@/lib/supabase/guesses";
import { incrementScore } from "@/lib/supabase/players";
import { updateRoomStatus, decrementTeamLives } from "@/lib/supabase/rooms";
import { logCaseOutcome } from "@/lib/supabase/caseLog";
import {
  TEAM_SOLVE_BONUS,
  NARRATOR_BONUS_ON_SOLVE,
  BEST_QUESTION_BONUS,
  WRONG_GUESS_PENALTY,
  calculateGuessScore,
} from "@/lib/game/scoring";
import type { Player } from "@/types/player";
import type { Guess } from "@/types/guess";
import type { Puzzle } from "@/types/puzzle";
import type { Question } from "@/types/question";

vi.mock("@/lib/supabase/guesses", () => ({
  reviewGuess: vi.fn(),
}));
vi.mock("@/lib/supabase/players", () => ({
  incrementScore: vi.fn(),
}));
vi.mock("@/lib/supabase/rooms", () => ({
  updateRoomStatus: vi.fn(),
  decrementTeamLives: vi.fn(),
}));
vi.mock("@/lib/supabase/caseLog", () => ({
  logCaseOutcome: vi.fn(),
}));

const mockedReviewGuess = vi.mocked(reviewGuess);
const mockedIncrementScore = vi.mocked(incrementScore);
const mockedUpdateRoomStatus = vi.mocked(updateRoomStatus);
const mockedDecrementTeamLives = vi.mocked(decrementTeamLives);
const mockedLogCaseOutcome = vi.mocked(logCaseOutcome);

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "p1",
    room_id: "room1",
    user_id: null,
    name: "Player",
    is_narrator: false,
    score: 0,
    is_host: false,
    is_spectator: false,
    joined_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeGuess(overrides: Partial<Guess>): Guess {
  return {
    id: "g1",
    room_id: "room1",
    puzzle_id: "puzzle1",
    player_id: "solver",
    player_name: "Solver",
    text: "It's the butler",
    status: "pending",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const puzzle: Puzzle = {
  id: "puzzle1",
  pack_id: "pack1",
  title: "The Case",
  scenario: "...",
  solution: "The butler",
  category: null,
  category_id: null,
  difficulty: "easy",
  hint: null,
  created_at: "2026-01-01T00:00:00.000Z",
  created_by: null,
  is_community: false,
  locale: "en",
};

beforeEach(() => {
  mockedReviewGuess.mockReset().mockResolvedValue({} as Guess);
  mockedIncrementScore.mockReset().mockResolvedValue(undefined);
  mockedUpdateRoomStatus.mockReset().mockResolvedValue(undefined);
  mockedDecrementTeamLives.mockReset().mockResolvedValue(undefined);
  mockedLogCaseOutcome.mockReset().mockResolvedValue(undefined as never);
});

describe("NarratorGuessControls — correct-guess scoring", () => {
  it("pays the solver, narrator and best-question player, but never a spectator", async () => {
    const players: Player[] = [
      makePlayer({ id: "solver", name: "Solver" }),
      makePlayer({ id: "teammate", name: "Teammate" }),
      makePlayer({ id: "narrator", name: "Narrator", is_narrator: true }),
      makePlayer({ id: "spectator", name: "Spectator", is_spectator: true }),
    ];
    const questions: Question[] = [
      {
        id: "q1",
        room_id: "room1",
        puzzle_id: "puzzle1",
        player_id: "teammate",
        player_name: "Teammate",
        text: "Was it the butler?",
        answer: "yes",
        answered_at: "2026-01-01T00:00:00.000Z",
        custom_response: null,
        is_best_question: true,
        round: 1,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const guess = makeGuess({ player_id: "solver" });

    renderWithIntl(
      <NarratorGuessControls
        supabase={{} as never}
        roomId="room1"
        round={1}
        puzzle={puzzle}
        questions={questions}
        guesses={[guess]}
        players={players}
        narratorId="narrator"
        hardcoreMode={false}
        teamLivesRemaining={null}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Correct" }));

    await waitFor(() => {
      expect(mockedUpdateRoomStatus).toHaveBeenCalledWith({}, "room1", "revealed");
    });

    // Solver: team-solve bonus + difficulty/question-count guess score.
    expect(mockedIncrementScore).toHaveBeenCalledWith(
      {},
      "solver",
      TEAM_SOLVE_BONUS + calculateGuessScore("easy", 1),
      "room1"
    );
    // Teammate (non-narrator, non-spectator, not the solver): flat team bonus.
    expect(mockedIncrementScore).toHaveBeenCalledWith({}, "teammate", TEAM_SOLVE_BONUS, "room1");
    // Narrator: narrator bonus, never the team-solve bonus.
    expect(mockedIncrementScore).toHaveBeenCalledWith({}, "narrator", NARRATOR_BONUS_ON_SOLVE, "room1");
    // Best-question asker (the teammate here) also gets the best-question bonus, on top.
    expect(mockedIncrementScore).toHaveBeenCalledWith({}, "teammate", BEST_QUESTION_BONUS, "room1");

    // A spectator never plays and must never be paid the team-solve bonus.
    expect(mockedIncrementScore).not.toHaveBeenCalledWith(
      expect.anything(),
      "spectator",
      expect.anything(),
      expect.anything()
    );
    expect(mockedIncrementScore).toHaveBeenCalledTimes(4);
  });
});

describe("NarratorGuessControls — incorrect-guess scoring", () => {
  it("penalizes only the guesser", async () => {
    const players: Player[] = [
      makePlayer({ id: "solver", name: "Solver" }),
      makePlayer({ id: "narrator", name: "Narrator", is_narrator: true }),
    ];
    const guess = makeGuess({ player_id: "solver", status: "pending" });

    renderWithIntl(
      <NarratorGuessControls
        supabase={{} as never}
        roomId="room1"
        round={1}
        puzzle={puzzle}
        questions={[]}
        guesses={[guess]}
        players={players}
        narratorId="narrator"
        hardcoreMode={false}
        teamLivesRemaining={null}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Incorrect" }));

    await waitFor(() => {
      expect(mockedIncrementScore).toHaveBeenCalledWith({}, "solver", -WRONG_GUESS_PENALTY, "room1");
    });
    expect(mockedIncrementScore).toHaveBeenCalledTimes(1);
    expect(mockedUpdateRoomStatus).not.toHaveBeenCalled();
  });
});
