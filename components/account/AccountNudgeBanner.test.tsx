// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { AccountNudgeBanner } from "./AccountNudgeBanner";
import { getAccountStatus } from "@/lib/supabase/accountAuth";
import { createClient } from "@/lib/supabase/client";
import type { StoryPack, Puzzle } from "@/types/puzzle";

vi.mock("@/lib/supabase/accountAuth", () => ({
  getAccountStatus: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));
vi.mock("./AccountModal", () => ({
  AccountModal: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>close-modal-stub</button>
  ),
}));

const mockedGetAccountStatus = vi.mocked(getAccountStatus);
const mockedCreateClient = vi.mocked(createClient);
const somePack = {} as StoryPack;
const somePuzzle = {} as Puzzle;

beforeEach(() => {
  window.localStorage.clear();
  mockedGetAccountStatus.mockReset().mockResolvedValue(null);
  mockedCreateClient.mockReset().mockReturnValue({} as never);
});

describe("AccountNudgeBanner", () => {
  it("stays hidden when the session is already non-anonymous", async () => {
    mockedGetAccountStatus.mockResolvedValue({ id: "u1", email: "a@b.com", isAnonymous: false });
    renderWithIntl(<AccountNudgeBanner packs={[somePack]} puzzles={[]} />);

    await waitFor(() => expect(mockedGetAccountStatus).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Link account" })).not.toBeInTheDocument();
  });

  it("stays hidden when anonymous but there's nothing to lose yet", async () => {
    renderWithIntl(<AccountNudgeBanner packs={[]} puzzles={[]} />);

    await waitFor(() => expect(mockedGetAccountStatus).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Link account" })).not.toBeInTheDocument();
  });

  it("shows the nudge when anonymous with existing content, and dismiss hides it for future renders", async () => {
    const { unmount } = renderWithIntl(
      <AccountNudgeBanner packs={[somePack]} puzzles={[somePuzzle]} />
    );
    const dismissButton = await screen.findByRole("button", { name: "Dismiss" });
    expect(screen.getByRole("button", { name: "Link account" })).toBeInTheDocument();

    await userEvent.click(dismissButton);
    expect(screen.queryByRole("button", { name: "Link account" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("ors-account-nudge-dismissed")).toBe("1");

    unmount();
    renderWithIntl(<AccountNudgeBanner packs={[somePack]} puzzles={[somePuzzle]} />);
    await waitFor(() => expect(mockedGetAccountStatus).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: "Link account" })).not.toBeInTheDocument();
  });

  it("opens the account modal on CTA click", async () => {
    renderWithIntl(<AccountNudgeBanner packs={[somePack]} puzzles={[]} />);
    await userEvent.click(await screen.findByRole("button", { name: "Link account" }));
    expect(screen.getByText("close-modal-stub")).toBeInTheDocument();
  });
});
