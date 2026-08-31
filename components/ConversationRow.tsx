import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatMessageTime } from "@/lib/format-date";

// Свой минимальный тип пропов, а не импорт ConversationSummary: компоненту
// нужны пять полей, откуда пришёл объект — не его дело (тот же приём, что в
// UserResultRow и TrackRow).
interface ConversationRowProps {
  otherUser: { username: string; name: string; avatarUrl: string | null };
  lastMessageText: string | null;
  lastMessageAt: Date;
  lastMessageFromMe: boolean;
  hasUnread: boolean;
}

export function ConversationRow({
  otherUser,
  lastMessageText,
  lastMessageAt,
  lastMessageFromMe,
  hasUnread,
}: ConversationRowProps) {
  return (
    // Форма и ховер — те же, что у UserResultRow: строк в списке много, и
    // мигающая заливка была бы шумом, теплеет только рамка.
    <Link
      href={`/messages/${otherUser.username}`}
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-accent/40"
    >
      <Avatar url={otherUser.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{otherUser.name}</p>
        {/* Обрезка — CSS-ом (truncate), а не slice по строке: ширина колонки
            зависит от вёрстки, а не от числа символов. */}
        <p className="truncate text-xs text-muted">
          {lastMessageText
            ? `${lastMessageFromMe ? "Вы: " : ""}${lastMessageText}`
            : "Нет сообщений"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs text-muted">{formatMessageTime(lastMessageAt)}</span>
        {/* Бейдж булевый, без числа: getConversationList считает "есть ли
            новое" из уже загруженных данных, точное количество на диалог
            стоило бы отдельного запроса на строку. Акцентом — это ровно то
            «активное состояние», ради которого терракота в палитре и есть. */}
        {hasUnread && (
          <span className="h-2 w-2 rounded-full bg-accent" aria-label="Новое" />
        )}
      </div>
    </Link>
  );
}
