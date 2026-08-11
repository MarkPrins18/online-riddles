// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { NarratorHintForm } from "./NarratorHintForm";
import { sendHint } from "@/lib/supabase/hints";

vi.mock("@/lib/supabase/hints", () => ({
  sendHint: vi.fn(),
}));

const mockedSendHint = vi.mocked(sendHint);

function renderForm() {
  return renderWithIntl(
    <NarratorHintForm
      supabase={{} as never}
      roomId="room1"
      puzzleId="puzzle1"
      round={1}
      playerId="player1"
      playerName="Alice"
    />
  );
}

beforeEach(() => {
  mockedSendHint.mockReset();
});

describe("NarratorHintForm", () => {
  it("starts empty — no default/prefilled hint text", () => {
    renderForm();
    expect(screen.getByPlaceholderText("Type a hint for the players...")).toHaveValue("");
  });

  it("disables submit until there is non-whitespace text", async () => {
    renderForm();
    const submit = screen.getByRole("button", { name: "Send hint" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Type a hint for the players..."), "   ");
    expect(submit).toBeDisabled();

    await userEvent.type(
      screen.getByPlaceholderText("Type a hint for the players..."),
      "You use it every morning"
    );
    expect(submit).toBeEnabled();
  });

  it("submits the trimmed hint and clears the field on success", async () => {
    mockedSendHint.mockResolvedValue({
      id: "h1",
      room_id: "room1",
      puzzle_id: "puzzle1",
      player_id: "player1",
      player_name: "Alice",
      text: "You use it every morning",
      round: 1,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    renderForm();

    const input = screen.getByPlaceholderText("Type a hint for the players...");
    await userEvent.type(input, "  You use it every morning  ");
    await userEvent.click(screen.getByRole("button", { name: "Send hint" }));

    await waitFor(() => {
      expect(mockedSendHint).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          roomId: "room1",
          puzzleId: "puzzle1",
          playerId: "player1",
          playerName: "Alice",
          text: "You use it every morning",
          round: 1,
        })
      );
    });
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("shows an error message and keeps the text when sending fails", async () => {
    mockedSendHint.mockRejectedValue(new Error("network down"));
    renderForm();

    const input = screen.getByPlaceholderText("Type a hint for the players...");
    await userEvent.type(input, "You use it every morning");
    await userEvent.click(screen.getByRole("button", { name: "Send hint" }));

    expect(await screen.findByText("network down")).toBeInTheDocument();
    expect(input).toHaveValue("You use it every morning");
  });
});
