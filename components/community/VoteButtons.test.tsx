// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { VoteButtons } from "./VoteButtons";
import { castVote, retractVote } from "@/lib/supabase/votes";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/votes", () => ({
  castVote: vi.fn(),
  retractVote: vi.fn(),
}));
vi.mock("@/lib/supabase/authSession", () => ({
  ensureAnonymousSession: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const mockedCastVote = vi.mocked(castVote);
const mockedRetractVote = vi.mocked(retractVote);
const mockedEnsureAnonymousSession = vi.mocked(ensureAnonymousSession);
const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  mockedCastVote.mockReset().mockResolvedValue(undefined);
  mockedRetractVote.mockReset().mockResolvedValue(undefined);
  mockedEnsureAnonymousSession.mockReset().mockResolvedValue("user1");
  mockedCreateClient.mockReset().mockReturnValue({} as never);
});

describe("VoteButtons", () => {
  it("renders the initial score and highlights an existing vote", () => {
    renderWithIntl(<VoteButtons puzzleId="p1" score={5} myVote={1} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vote up" })).toHaveClass("bg-accent");
  });

  it("casts a fresh upvote and bumps the score by one", async () => {
    renderWithIntl(<VoteButtons puzzleId="p1" score={5} myVote={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Vote up" }));

    expect(mockedCastVote).toHaveBeenCalledWith({}, "p1", "user1", 1);
    expect(await screen.findByText("6")).toBeInTheDocument();
  });

  it("retracts the vote and reverses the score when clicking the same direction again", async () => {
    renderWithIntl(<VoteButtons puzzleId="p1" score={5} myVote={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Vote up" }));

    expect(mockedRetractVote).toHaveBeenCalledWith({}, "p1", "user1");
    expect(await screen.findByText("4")).toBeInTheDocument();
  });

  it("switches from downvote to upvote with a double-sized swing", async () => {
    renderWithIntl(<VoteButtons puzzleId="p1" score={5} myVote={-1} />);
    await userEvent.click(screen.getByRole("button", { name: "Vote up" }));

    expect(mockedCastVote).toHaveBeenCalledWith({}, "p1", "user1", 1);
    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  it("shows an error message when the vote fails", async () => {
    mockedCastVote.mockRejectedValue(new Error("kon niet stemmen"));
    renderWithIntl(<VoteButtons puzzleId="p1" score={5} myVote={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Vote up" }));

    expect(await screen.findByText("kon niet stemmen")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
