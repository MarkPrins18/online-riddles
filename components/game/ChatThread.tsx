import type { ChatMessage } from "@/types/chatMessage";
import { Badge } from "@/components/ui/Badge";

export function ChatThread({
  messages,
  narratorId,
}: {
  messages: ChatMessage[];
  narratorId: string | null;
}) {
  if (messages.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">
        Nog niemand heeft iets gezegd. Overleg gerust met je medespelers.
      </p>
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
                Verteller
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
