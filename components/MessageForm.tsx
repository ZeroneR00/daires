"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "@/lib/message-actions";
import { field, pillButtonPrimary } from "@/lib/ui";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        placeholder="Написать сообщение…"
        className={`${field} resize-y`}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Кнопка не во всю ширину (submitButton), а «таблеткой»: сообщение —
          действие повторяющееся и мелкое, у формы записи оно одно и главное. */}
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className={`${pillButtonPrimary} w-fit justify-center`}
      >
        {isPending ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}
