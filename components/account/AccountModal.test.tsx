// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { AccountModal } from "./AccountModal";
import { getAccountStatus, signOut } from "@/lib/supabase/accountAuth";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/accountAuth", () => ({
  getAccountStatus: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/supabase/authSession", () => ({
  ensureAnonymousSession: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));
vi.mock("./MagicLinkTab", () => ({
  MagicLinkTab: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={() => onSuccess()}>magic-link-tab-stub</button>
  ),
}));

const mockedGetAccountStatus = vi.mocked(getAccountStatus);
const mockedSignOut = vi.mocked(signOut);
const mockedEnsureAnonymousSession = vi.mocked(ensureAnonymousSession);
const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  mockedGetAccountStatus.mockReset().mockResolvedValue(null);
  mockedSignOut.mockReset().mockResolvedValue(undefined);
  mockedEnsureAnonymousSession.mockReset().mockResolvedValue("user1");
  mockedCreateClient.mockReset().mockReturnValue({} as never);
});

describe("AccountModal", () => {
  it("shows the magic-link form once the anonymous session is confirmed", async () => {
    renderWithIntl(<AccountModal onClose={vi.fn()} />);
    expect(await screen.findByText("magic-link-tab-stub")).toBeInTheDocument();
  });

  it("shows the signed-in view with sign-out instead of the form when already non-anonymous", async () => {
    mockedGetAccountStatus.mockResolvedValue({
      id: "u1",
      email: "you@example.com",
      isAnonymous: false,
    });
    renderWithIntl(<AccountModal onClose={vi.fn()} />);
    expect(await screen.findByText("Signed in as you@example.com")).toBeInTheDocument();
    expect(screen.queryByText("magic-link-tab-stub")).not.toBeInTheDocument();
  });

  it("switches to the signed-in view after a successful magic-link verification", async () => {
    mockedGetAccountStatus
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "u1", email: "you@example.com", isAnonymous: false });
    renderWithIntl(<AccountModal onClose={vi.fn()} />);

    await userEvent.click(await screen.findByText("magic-link-tab-stub"));
    expect(await screen.findByText("Signed in as you@example.com")).toBeInTheDocument();
  });

  it("calls signOut and onClose when signing out", async () => {
    mockedGetAccountStatus.mockResolvedValue({
      id: "u1",
      email: "you@example.com",
      isAnonymous: false,
    });
    const onClose = vi.fn();
    renderWithIntl(<AccountModal onClose={onClose} />);

    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(mockedSignOut).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
