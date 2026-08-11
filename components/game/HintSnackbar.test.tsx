// @vitest-environment jsdom
import type { ReactElement } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { HintSnackbar } from "./HintSnackbar";
import type { Hint } from "@/types/hint";

function withIntl(ui: ReactElement) {
  return <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>;
}

function makeHint(overrides: Partial<Hint> = {}): Hint {
  return {
    id: "hint-1",
    room_id: "room-1",
    puzzle_id: "puzzle-1",
    player_id: "player-1",
    player_name: "Alex",
    text: "Kijk naar de klok.",
    round: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("HintSnackbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismisses after the visible window", () => {
    const { rerender } = renderWithIntl(<HintSnackbar latestHint={makeHint()} />);
    expect(screen.getByText("Kijk naar de klok.")).toBeInTheDocument();

    vi.advanceTimersByTime(6000);
    rerender(withIntl(<HintSnackbar latestHint={makeHint()} />));
    expect(screen.queryByText("Kijk naar de klok.")).not.toBeInTheDocument();
  });

  it("still auto-dismisses when unrelated re-renders pass a new object with the same hint id", () => {
    const { rerender } = renderWithIntl(<HintSnackbar latestHint={makeHint()} />);
    expect(screen.getByText("Kijk naar de klok.")).toBeInTheDocument();

    // Simulate the realtime/reducer churn that recreates the hints array (and
    // therefore `latestHint`) on nearly every render — chat messages, presence,
    // timer ticks — even though the latest hint itself hasn't changed.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000);
      rerender(withIntl(<HintSnackbar latestHint={makeHint()} />));
    }

    // 5s elapsed so far, one more second crosses the 6s dismiss window.
    vi.advanceTimersByTime(1000);
    rerender(withIntl(<HintSnackbar latestHint={makeHint()} />));
    expect(screen.queryByText("Kijk naar de klok.")).not.toBeInTheDocument();
  });

  it("shows a new hint again once its id changes", () => {
    const { rerender } = renderWithIntl(<HintSnackbar latestHint={makeHint()} />);
    vi.advanceTimersByTime(6000);
    rerender(withIntl(<HintSnackbar latestHint={makeHint()} />));
    expect(screen.queryByText("Kijk naar de klok.")).not.toBeInTheDocument();

    rerender(withIntl(<HintSnackbar latestHint={makeHint({ id: "hint-2", text: "Tel de stoelen." })} />));
    expect(screen.getByText("Tel de stoelen.")).toBeInTheDocument();
  });
});
