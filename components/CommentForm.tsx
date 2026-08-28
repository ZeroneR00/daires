"use client";

import { useState, useTransition } from "react";

interface CommentFormProps {
  action: (text: string) => Promise<{ error: string } | { success: true }>;
}

export function CommentForm({ action }: CommentFormProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await action(text);
      if ("error" in result) {
        setError(result.error);
      } else {
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
        placeholder="Написать комментарий…"
        className="w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="flex h-9 w-fit items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}
