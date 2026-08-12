// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { AccountButton } from "./AccountButton";
import { getAccountStatus, signOut } from "@/lib/supabase/accountAuth";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/accountAuth", () => ({
  getAccountStatus: vi.fn(),
  signOut: vi.fn(),
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
const mockedSignOut = vi.mocked(signOut);
const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  mockedGetAccountStatus.mockReset().mockResolvedValue(null);
  mockedSignOut.mockReset().mockResolvedValue(undefined);
  mockedCreateClient.mockReset().mockReturnValue({} as never);
});

describe("AccountButton", () => {
  it("shows the Account trigger for an anonymous session and opens the modal on click", async () => {
    renderWithIntl(<AccountButton />);
    const trigger = await screen.findByRole("button", { name: "Account" });
    await userEvent.click(trigger);
    expect(screen.getByText("close-modal-stub")).toBeInTheDocument();
  });

  it("shows the email and a sign-out control for a non-anonymous session", async () => {
    mockedGetAccountStatus.mockResolvedValue({
      id: "u1",
      email: "you@example.com",
      isAnonymous: false,
    });
    renderWithIntl(<AccountButton />);
    expect(await screen.findByText("you@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Account" })).not.toBeInTheDocument();
  });

  it("signs out when the sign-out control is clicked", async () => {
    mockedGetAccountStatus.mockResolvedValue({
      id: "u1",
      email: "you@example.com",
      isAnonymous: false,
    });
    renderWithIntl(<AccountButton />);
    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    await userEvent.click(signOutButton);

    expect(mockedSignOut).toHaveBeenCalledWith({});
    expect(await screen.findByRole("button", { name: "Account" })).toBeInTheDocument();
  });
});
