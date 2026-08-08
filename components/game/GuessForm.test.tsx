// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuessForm } from "./GuessForm";
import { submitGuess } from "@/lib/supabase/guesses";

vi.mock("@/lib/supabase/guesses", () => ({
  submitGuess: vi.fn(),
}));

const mockedSubmitGuess = vi.mocked(submitGuess);

function renderForm() {
  return render(
    <GuessForm
      supabase={{} as never}
      roomId="room1"
      puzzleId="puzzle1"
      playerId="player1"
      playerName="Alice"
    />
  );
}

beforeEach(() => {
  mockedSubmitGuess.mockReset();
});

describe("GuessForm", () => {
  it("disables submit until there is non-whitespace text", async () => {
    renderForm();
    const submit = screen.getByRole("button", { name: "Oplossen" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Wat denk jij dat het antwoord is?"), "   ");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Wat denk jij dat het antwoord is?"), "Het was de butler");
    expect(submit).toBeEnabled();
  });

  it("submits the trimmed guess and clears the field on success", async () => {
    mockedSubmitGuess.mockResolvedValue({
      id: "g1",
      room_id: "room1",
      puzzle_id: "puzzle1",
      player_id: "player1",
      player_name: "Alice",
      text: "De butler",
      status: "pending",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    renderForm();

    const input = screen.getByPlaceholderText("Wat denk jij dat het antwoord is?");
    await userEvent.type(input, "  De butler  ");
    await userEvent.click(screen.getByRole("button", { name: "Oplossen" }));

    await waitFor(() => {
      expect(mockedSubmitGuess).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          roomId: "room1",
          puzzleId: "puzzle1",
          playerId: "player1",
          playerName: "Alice",
          text: "De butler",
        })
      );
    });
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("shows an error message and keeps the text when submission fails", async () => {
    mockedSubmitGuess.mockRejectedValue(new Error("network down"));
    renderForm();

    const input = screen.getByPlaceholderText("Wat denk jij dat het antwoord is?");
    await userEvent.type(input, "De butler");
    await userEvent.click(screen.getByRole("button", { name: "Oplossen" }));

    expect(await screen.findByText("network down")).toBeInTheDocument();
    expect(input).toHaveValue("De butler");
  });
});
