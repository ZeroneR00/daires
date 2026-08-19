"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "@/lib/message-actions";

interface MessageFormProps {
  targetUsername: string;
}

// Контролируемая textarea + useTransition, а не <form action={...}>: после
// успешной отправки поле надо программно очистить (ровно тот же довод, что в
// CommentForm). Экшен импортируется напрямую из lib/, как в FriendButton —
// прокидывать его пропом незачем, страница-владелец у него ровно одна.
export function MessageForm({ targetUsername }: MessageFormProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(targetUsername, text);
      if ("error" in result) {
        setError(result.error);
      } else {
        // Новое сообщение прилетит на страницу само: revalidatePath внутри
        // экшена перерисует этот маршрут.
        setText("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        placeholder="Написать сообщение…"
        className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none transition-colors focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:border-white/40"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="flex h-9 w-fit items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {isPending ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}
