import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/types/chatMessage";
import { Badge } from "@/components/ui/Badge";

export function ChatThread({
  messages,
  narratorId,
}: {
  messages: ChatMessage[];
  narratorId: string | null;
}) {
  const t = useTranslations("ChatThread");

  if (messages.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" role="log" aria-live="polite">
      {messages.map((message) => (
        <li key={message.id} className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-text-secondary">
            {message.player_name}
            {message.player_id === narratorId && (
              <Badge tone="accent" className="ml-1 align-middle">
                {t("narratorBadge")}
              </Badge>
            )}
            :
          </span>
          <span className="font-mono text-sm text-text-primary">{message.text}</span>
        </li>
      ))}
    </ul>
  );
}
