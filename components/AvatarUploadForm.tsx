"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/Avatar";
import {
  removeAvatar,
  uploadAvatar,
  type AvatarActionState,
} from "@/app/settings/actions";
import { pillButton } from "@/lib/ui";

const initialActionState: AvatarActionState = {
  success: true,
  avatarUrl: null,
};

interface AvatarUploadFormProps {
  initialAvatarUrl: string | null;
}

export function AvatarUploadForm({ initialAvatarUrl }: AvatarUploadFormProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const [, uploadAction, isUploading] = useActionState(
    async (prevState: AvatarActionState, formData: FormData) => {
      const result = await uploadAvatar(prevState, formData);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setAvatarUrl(result.avatarUrl);
        setMessage({ type: "success", text: "Сохранено" });
      }
      return result;
    },
    initialActionState,
  );

  const [, removeAction, isRemoving] = useActionState(
    async (prevState: AvatarActionState, formData: FormData) => {
      const result = await removeAvatar(prevState, formData);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setAvatarUrl(result.avatarUrl);
        setMessage({ type: "success", text: "Фото удалено" });
      }
      return result;
    },
    initialActionState,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar url={avatarUrl} size={80} />

        <div className="flex flex-col gap-2">
          <form action={uploadAction} className="flex flex-col gap-2">
            <label
              htmlFor="avatar-file"
              /*
                Контурная «таблетка», не залитая: на экране настроек главное
                действие одно — «Сохранить» внизу, и залитых кнопок тоже должно
                быть ровно одна.
              */
              className={`w-fit cursor-pointer ${pillButton} ${
                isUploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {isUploading ? "Загружаем…" : "Выбрать фото"}
            </label>
            <input
              id="avatar-file"
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              disabled={isUploading}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="hidden"
            />
          </form>

          {avatarUrl && (
            <form action={removeAction}>
              <button
                type="submit"
                disabled={isRemoving}
                className="w-fit text-sm text-danger underline-offset-4 hover:underline disabled:opacity-50"
              >
                {isRemoving ? "Удаляем…" : "Удалить фото"}
              </button>
            </form>
          )}
        </div>
      </div>

      {message && (
        <p
          className={
            message.type === "error"
              ? "text-sm text-danger"
              : "text-sm text-accent"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
