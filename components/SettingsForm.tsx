"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/settings/actions";
import { field, submitButton } from "@/lib/ui";

const labelClassName = "text-sm font-medium text-ink";

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
        <label htmlFor="name" className={labelClassName}>
          Имя
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className={labelClassName}>
          О себе
        </label>
        <textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Пара слов о себе…"
          className={field}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {/*
        Успех красится акцентом, а не зелёным: зелёного в палитре нет, и заводить
        токен ради одной строки значило бы завести второй акцент. Терракота на
        сайте и так означает «здесь что-то произошло».
      */}
      {success && <p className="text-sm text-accent">Сохранено</p>}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className={`mt-2 ${submitButton}`}
      >
        {isPending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
