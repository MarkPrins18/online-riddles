"use client";

import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ChatMessage } from "@/types/chatMessage";
import { Drawer } from "@/components/ui/Drawer";
import { ChatPanel } from "./ChatPanel";

/**
 * Overleg on demand, below xl: from xl up it has its own permanent column,
 * but on narrower screens it's normally buried at the bottom of a tab strip
 * shared with Postvak/Verhoor/etc. This gives it a shortcut straight from
 * the "vast" column instead, without needing to hunt for the tab.
 */
export function ChatDrawer({
  supabase,
  roomId,
  playerId,
  playerName,
  chatMessages,
  narrating,
  narratorId,
  onClose,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  playerId: string;
  playerName: string;
  chatMessages: ChatMessage[];
  narrating: boolean;
  narratorId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("ChatDrawer");

  return (
    <Drawer title={t("title")} onClose={onClose} className="max-w-[480px]">
      <ChatPanel
        supabase={supabase}
        roomId={roomId}
        playerId={playerId}
        playerName={playerName}
        chatMessages={chatMessages}
        narrating={narrating}
        narratorId={narratorId}
        className="h-full"
      />
    </Drawer>
  );
}
