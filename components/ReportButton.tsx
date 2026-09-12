"use client";

import { useState, useTransition } from "react";
import { REPORT_REASON_MAX } from "@/lib/report-schema";

/*
  «Пожаловаться» — один компонент на запись и на комментарий: что именно
  жалуют, решает переданный экшен (родитель привязывает цель через `bind`),
  сам компонент про цель ничего не знает.

  Клиентский, а не zero-JS `<form action>`, по тому же доводу, что
  `CommentForm`: пользователю нужен ответ — «спасибо» или «ты уже жаловался», —
  а void-форма ответа не возвращает.

  Размер шрифта здесь не задан намеренно: компонент стоит в двух рядах разной
  величины (под записью `text-sm`, у комментария `text-xs`) и наследует размер
  родителя. Один класс-размер внутри заставил бы держать проп ради ничего.
*/

interface ReportButtonProps {
  action: (reason: string) => Promise<{ error: string } | { success: true }>;
}

export function ReportButton({ action }: ReportButtonProps) {
  // Три состояния одной кнопки: закрыта → форма → отправлено. Отдельного
  // булева `isOpen` + `isDone` не держим — они взаимоисключающие.
  const [stage, setStage] = useState<"idle" | "form" | "sent">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await action(reason);
      if ("error" in result) {
        setError(result.error);
      } else {
        // Форма больше не нужна: жаловаться второй раз на то же нельзя.
        setStage("sent");
        setReason("");
      }
    });
  }

  /*
    `ml-auto` и `w-full` живут здесь, а не на обёртке в родителе, и это
    единственное место, где компонент что-то знает о своём окружении.
    Довод: снаружи состояние неизвестно, а классы нужны разные — закрытая
    кнопка жмётся к правому краю строки, раскрытая форма занимает строку
    целиком (родительские ряды для этого объявлены `flex-wrap`). Обёртка
    сделать так не может: `w-full` внутри неё считался бы от неё же, и
    textarea выходила в половину ширины.
  */
  if (stage === "sent") {
    return <span className="ml-auto shrink-0 text-muted">Спасибо, посмотрим</span>;
  }

  if (stage === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStage("form")}
        className="ml-auto shrink-0 text-muted transition-colors hover:text-accent"
      >
        Пожаловаться
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={REPORT_REASON_MAX}
        rows={2}
        autoFocus
        placeholder="Что не так?"
        className="w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3 text-sm">
        <button
          type="submit"
          disabled={isPending || !reason.trim()}
          className="flex h-9 items-center rounded-full bg-accent px-4 font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Отправляем…" : "Отправить"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStage("idle");
            setError(null);
          }}
          className="text-muted transition-colors hover:text-accent"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
