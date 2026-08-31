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

/*
  Свой пузырь — лёгкая заливка акцентом, а не залитая терракота: сообщений на
  экране десятки, и полный акцент превратил бы половину переписки в сплошную
  плашку. Сторону и без цвета задаёт выравнивание — цвет тут вторая подсказка,
  а не первая. Текст остаётся на Geist: антиква в проекте закреплена за тем,
  что читают как дневник.
*/
const bubbleBase = "flex max-w-[80%] flex-col gap-1 rounded-card px-4 py-2.5";
const bubbleMine = `${bubbleBase} border border-accent/25 bg-accent-wash text-ink`;
const bubbleTheirs = `${bubbleBase} border border-line bg-surface text-ink`;

// Серверный презентационный компонент: интерактивности ноль, живость странице
// добавляют RefreshOnPing/MarkReadOnOpen. Аватар у пузырей не рисуем — в
// диалоге на двоих сторона определяется выравниванием, лишняя картинка на
// каждое сообщение только шумит.
export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
        <p className="font-serif text-lg text-ink">Здесь пока пусто</p>
        <p className="text-sm text-muted">Напиши первым.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => {
        const mine = message.senderId === currentUserId;

        return (
          <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
            <div className={mine ? bubbleMine : bubbleTheirs}>
              {/* whitespace-pre-wrap: переносы строк автор ставил осмысленно,
                  а break-words не даёт длинной ссылке распереть пузырь. */}
              <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              <span className="text-xs text-muted">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
