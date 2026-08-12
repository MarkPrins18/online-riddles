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
vi.mock("./PasswordTab", () => ({
  PasswordTab: ({ onSuccess }: { onSuccess: (result: { pending: boolean }) => void }) => (
    <button onClick={() => onSuccess({ pending: true })}>password-tab-stub</button>
  ),
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
  it("shows the tab switcher, magic link first, once the anonymous session is confirmed", async () => {
    renderWithIntl(<AccountModal onClose={vi.fn()} />);
    expect(await screen.findByText("magic-link-tab-stub")).toBeInTheDocument();
    expect(screen.queryByText("password-tab-stub")).not.toBeInTheDocument();
  });

  it("switches to the password tab on click", async () => {
    renderWithIntl(<AccountModal onClose={vi.fn()} />);
    await screen.findByText("magic-link-tab-stub");
    await userEvent.click(screen.getByRole("button", { name: "Password" }));
    expect(screen.getByText("password-tab-stub")).toBeInTheDocument();
  });

  it("shows the signed-in view with sign-out instead of tabs when already non-anonymous", async () => {
    mockedGetAccountStatus.mockResolvedValue({
      id: "u1",
      email: "you@example.com",
      isAnonymous: false,
    });
    renderWithIntl(<AccountModal onClose={vi.fn()} />);
    expect(await screen.findByText("Signed in as you@example.com")).toBeInTheDocument();
    expect(screen.queryByText("magic-link-tab-stub")).not.toBeInTheDocument();
  });

  it("shows the pending-confirmation message after a password upgrade", async () => {
    renderWithIntl(<AccountModal onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Password" }));
    await userEvent.click(screen.getByText("password-tab-stub"));

    expect(
      await screen.findByText(
        "Almost there — check your email and click the confirmation link to activate your account."
      )
    ).toBeInTheDocument();
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
