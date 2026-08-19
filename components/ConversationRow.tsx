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
    <Link
      href={`/messages/${otherUser.username}`}
      className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 transition-colors hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.06]"
    >
      <Avatar url={otherUser.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
          {otherUser.name}
        </p>
        {/* Обрезка — CSS-ом (truncate), а не slice по строке: ширина колонки
            зависит от вёрстки, а не от числа символов. */}
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {lastMessageText
            ? `${lastMessageFromMe ? "Вы: " : ""}${lastMessageText}`
            : "Нет сообщений"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatMessageTime(lastMessageAt)}
        </span>
        {/* Бейдж булевый, без числа: getConversationList считает "есть ли
            новое" из уже загруженных данных, точное количество на диалог
            стоило бы отдельного запроса на строку. */}
        {hasUnread && (
          <span className="h-2 w-2 rounded-full bg-black dark:bg-zinc-50" aria-label="Новое" />
        )}
      </div>
    </Link>
  );
}
