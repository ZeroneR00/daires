"use client";

import { useState, useTransition } from "react";
import { TrackPickerDialog } from "@/components/TrackPickerDialog";
import type { NormalizedTrack } from "@/lib/track-api";
import type { PostInput } from "@/lib/post-schema";

const textareaClassName =
  "w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none transition-colors focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:border-white/40";

const EMPTY_FORM_ERROR = "Добавь текст или хотя бы один трек";

interface PostFormProps {
  initialText?: string;
  initialTracks?: NormalizedTrack[];
  action: (input: PostInput) => Promise<{ error: string } | undefined>;
  submitLabel: string;
  pendingLabel: string;
}

export function PostForm({
  initialText = "",
  initialTracks = [],
  action,
  submitLabel,
  pendingLabel,
}: PostFormProps) {
  const [text, setText] = useState(initialText);
  const [selectedTracks, setSelectedTracks] = useState<NormalizedTrack[]>(initialTracks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedExternalIds = new Set(selectedTracks.map((t) => t.externalId));
  const isEmpty = !text.trim() && selectedTracks.length === 0;

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

    if (isEmpty) {
      setError(EMPTY_FORM_ERROR);
      return;
    }

    startTransition(async () => {
      const result = await action({ text, tracks: selectedTracks });
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
        disabled={isPending || isEmpty}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {isPending ? pendingLabel : submitLabel}
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
