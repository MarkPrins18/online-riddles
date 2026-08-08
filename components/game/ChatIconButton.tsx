"use client";

import { Button } from "@/components/ui/Button";

/** Opens the Overleg drawer — styled like the secondary buttons around it, with an unread count instead of a label since it sits in a tight row. */
export function ChatIconButton({
  onClick,
  unreadCount,
  className = "",
}: {
  onClick: () => void;
  unreadCount: number;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      iconOnly
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `Open overleg, ${unreadCount} ongelezen ${unreadCount === 1 ? "bericht" : "berichten"}`
          : "Open overleg"
      }
      className={`relative ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 4.5h14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H8l-3.5 3v-3H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-[1.15rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-[1.15rem] text-bg-primary">
          {unreadCount}
        </span>
      )}
    </Button>
  );
}
