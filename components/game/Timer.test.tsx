// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/lib/i18n/testUtils";
import { Timer } from "./Timer";

describe("Timer", () => {
  it("counts up from the start time when there's no duration limit", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(startedAt).getTime() + 65_000;
    renderWithIntl(<Timer startedAt={startedAt} now={now} durationSeconds={null} />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("counts down the remaining time when a duration is set", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(startedAt).getTime() + 20_000;
    renderWithIntl(<Timer startedAt={startedAt} now={now} durationSeconds={90} />);
    expect(screen.getByText("01:10")).toBeInTheDocument();
  });

  it("shows \"Time's up\" once the duration has elapsed", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(startedAt).getTime() + 100_000;
    renderWithIntl(<Timer startedAt={startedAt} now={now} durationSeconds={90} />);
    expect(screen.getByText("Time's up")).toBeInTheDocument();
  });

  it("turns urgent once under the low-time threshold, with a non-color marker too", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(startedAt).getTime() + 40_000;
    renderWithIntl(<Timer startedAt={startedAt} now={now} durationSeconds={90} />);
    const timer = screen.getByText("⚠ 00:50");
    expect(timer).toHaveClass("text-danger");
    expect(timer).toHaveClass("font-bold");
  });

  it("stays in the neutral color while there's plenty of time left", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(startedAt).getTime();
    renderWithIntl(<Timer startedAt={startedAt} now={now} durationSeconds={600} />);
    expect(screen.getByText("10:00")).toHaveClass("text-text-secondary");
  });
});
