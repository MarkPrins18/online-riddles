import { useTranslations } from "next-intl";
import type { BoardItem } from "@/types/boardItem";
import type { BoardConnection } from "@/types/boardConnection";
import type { Question } from "@/types/question";

const NOTE_DOT_COLORS: Record<string, string> = {
  yellow: "#e8d477",
  pink: "#e0a8c0",
  blue: "#9ec4dd",
  green: "#a9cfa0",
};

function itemLabel(item: BoardItem, questions: Question[], notFound: string): string {
  if (item.kind === "note") return item.text ?? "";
  const question = questions.find((q) => q.id === item.question_id);
  return question ? question.text : notFound;
}

/**
 * A plain, tap-friendly list — the same board data as the freeform canvas,
 * but read/edited through selects and buttons instead of drag gestures.
 * Used below the canvas's xl breakpoint so phone players get a real (if
 * simpler) way to participate instead of the feature just disappearing.
 */
export function CorkboardListView({
  items,
  connections,
  questions,
  playerId,
  isHost,
  onDeleteItem,
  onDeleteConnection,
  onAddConnection,
}: {
  items: BoardItem[];
  connections: BoardConnection[];
  questions: Question[];
  playerId: string;
  isHost: boolean;
  onDeleteItem: (id: string) => void;
  onDeleteConnection: (id: string) => void;
  onAddConnection: (fromId: string, toId: string) => void;
}) {
  const t = useTranslations("CorkboardListView");
  const notFound = t("questionNotFound");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {items.length === 0 ? (
        <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const canDelete = item.created_by === playerId || isHost;
            const linked = connections
              .filter((c) => c.from_item_id === item.id || c.to_item_id === item.id)
              .map((c) => {
                const otherId = c.from_item_id === item.id ? c.to_item_id : c.from_item_id;
                const other = items.find((i) => i.id === otherId);
                return { connection: c, other };
              })
              .filter((entry) => entry.other);
            const linkedIds = new Set(
              linked.map((entry) => (entry.connection.from_item_id === item.id
                ? entry.connection.to_item_id
                : entry.connection.from_item_id))
            );
            const linkableItems = items.filter((i) => i.id !== item.id && !linkedIds.has(i.id));

            return (
              <li
                key={item.id}
                className="rounded-sm border border-white/10 bg-bg-secondary p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {item.kind === "note" ? (
                      <span
                        aria-hidden="true"
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: NOTE_DOT_COLORS[item.color] }}
                      />
                    ) : (
                      <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-widest text-accent">
                        {t("questionBadge")}
                      </span>
                    )}
                    <p className="font-serif text-sm leading-snug text-text-primary">
                      {itemLabel(item, questions, notFound)}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      aria-label={t("deleteItemAriaLabel")}
                      className="shrink-0 font-mono text-xs text-text-secondary hover:text-danger"
                    >
                      {t("remove")}
                    </button>
                  )}
                </div>

                {linked.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {linked.map(({ connection, other }) => {
                      const canDeleteConnection = connection.created_by === playerId || isHost;
                      return (
                        <li
                          key={connection.id}
                          className="flex items-center gap-1 rounded-full border border-white/10 bg-bg-primary px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                        >
                          <span>{other ? itemLabel(other, questions, notFound) : ""}</span>
                          {canDeleteConnection && (
                            <button
                              type="button"
                              onClick={() => onDeleteConnection(connection.id)}
                              aria-label={t("removeLinkAriaLabel")}
                              className="text-text-secondary hover:text-danger"
                            >
                              ×
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {linkableItems.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onAddConnection(item.id, e.target.value);
                    }}
                    aria-label={t("addLinkAriaLabel")}
                    className="mt-2 w-full rounded-md border border-white/10 bg-bg-primary px-2 py-1.5 font-mono text-xs text-text-secondary focus:border-accent-muted"
                  >
                    <option value="">{t("linkTo")}</option>
                    {linkableItems.map((other) => (
                      <option key={other.id} value={other.id}>
                        {itemLabel(other, questions, notFound)}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
