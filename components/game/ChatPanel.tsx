"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ChatMessage } from "@/types/chatMessage";
import { Card } from "@/components/ui/Card";
import { ChatForm } from "./ChatForm";
import { ChatThread } from "./ChatThread";

/**
 * Team chat — this game is played online, so it's a primary coordination
 * channel, not an occasional side conversation. Fills whatever height its
 * container gives it (a full column on wide screens, a tab pane on
 * narrower ones) instead of capping itself, so it never gets squeezed out
 * by a long Verhoor/Postvak list sharing the same rail.
 */
export function ChatPanel({
  supabase,
  roomId,
  playerId,
  playerName,
  chatMessages,
  narrating,
  narratorId,
  className = "",
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  playerId: string;
  playerName: string;
  chatMessages: ChatMessage[];
  narrating: boolean;
  narratorId: string | null;
  className?: string;
}) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("ChatPanel");

  // Keep chat pinned to the newest message.
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [chatMessages.length]);

  return (
    <Card className={`flex h-full min-h-0 flex-col ${className}`}>
      <p className="mb-3 shrink-0 font-mono text-xs uppercase tracking-widest text-text-secondary">
        {t("heading")}
      </p>
      <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ChatThread messages={chatMessages} narratorId={narratorId} />
      </div>
      {narrating ? (
        <p className="mt-3 shrink-0 border-t border-white/5 pt-3 font-mono text-xs text-text-secondary">
          {t("narratorNotice")}
        </p>
      ) : (
        <div className="mt-3 shrink-0 border-t border-white/5 pt-3">
          <ChatForm supabase={supabase} roomId={roomId} playerId={playerId} playerName={playerName} />
        </div>
      )}
    </Card>
  );
}
