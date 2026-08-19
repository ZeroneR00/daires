import { formatMessageTime } from "@/lib/format-date";

interface MessageListMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
}

interface MessageListProps {
  messages: MessageListMessage[];
  currentUserId: string;
}

// Серверный презентационный компонент: интерактивности ноль, живость странице
// добавляют RefreshOnPing/MarkReadOnOpen. Аватар у пузырей не рисуем — в
// диалоге на двоих сторона определяется выравниванием, лишняя картинка на
// каждое сообщение только шумит.
export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/[.15] p-6 text-center dark:border-white/[.2]">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Здесь пока пусто. Напиши первым.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => {
        const mine = message.senderId === currentUserId;

        return (
          <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2 ${
                mine
                  ? "bg-foreground text-background"
                  : "border border-black/[.08] bg-white text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
              }`}
            >
              {/* whitespace-pre-wrap: переносы строк автор ставил осмысленно,
                  а break-words не даёт длинной ссылке распереть пузырь. */}
              <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              <span className={`text-xs ${mine ? "opacity-70" : "text-zinc-400 dark:text-zinc-500"}`}>
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
