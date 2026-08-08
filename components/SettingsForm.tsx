"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/settings/actions";

const inputClassName =
  "w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-black outline-none transition-colors focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:focus:border-white/40";

interface SettingsFormProps {
  initialName: string;
  initialBio: string;
}

export function SettingsForm({ initialName, initialBio }: SettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError("Имя не может быть пустым");
      return;
    }

    startTransition(async () => {
      const result = await updateProfile({ name, bio });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-black dark:text-zinc-50">
          Имя
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-black dark:text-zinc-50">
          О себе
        </label>
        <textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Пара слов о себе…"
          className={inputClassName}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">Сохранено</p>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {isPending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
