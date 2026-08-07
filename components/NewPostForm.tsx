"use client";

import { useState, useTransition } from "react";
import { createPost } from "@/app/new/actions";
import { TrackPickerDialog } from "@/components/TrackPickerDialog";
import type { NormalizedTrack } from "@/lib/track-api";

const textareaClassName =
  "w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none transition-colors focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:border-white/40";

export function NewPostForm() {
  const [text, setText] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<NormalizedTrack[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedExternalIds = new Set(selectedTracks.map((t) => t.externalId));

  function handleSelectTrack(track: NormalizedTrack) {
    setSelectedTracks((prev) =>
      prev.some((t) => t.externalId === track.externalId) ? prev : [...prev, track],
    );
  }

  function handleRemoveTrack(externalId: string) {
    setSelectedTracks((prev) => prev.filter((t) => t.externalId !== externalId));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError("Текст поста не может быть пустым");
      return;
    }

    startTransition(async () => {
      const result = await createPost({ text, tracks: selectedTracks });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="text" className="text-sm font-medium text-black dark:text-zinc-50">
          Текст записи
        </label>
        <textarea
          id="text"
          rows={6}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="О чём этот трек, что он для тебя значит…"
          className={textareaClassName}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-black dark:text-zinc-50">
            Треки
          </span>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            Добавить трек
          </button>
        </div>

        {selectedTracks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Треки ещё не добавлены
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedTracks.map((track) => (
              <li
                key={track.externalId}
                className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {track.artist}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTrack(track.externalId)}
                  className="shrink-0 rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {isPending ? "Публикуем…" : "Опубликовать"}
      </button>

      <TrackPickerDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedExternalIds={selectedExternalIds}
        onSelectTrack={handleSelectTrack}
      />
    </form>
  );
}
