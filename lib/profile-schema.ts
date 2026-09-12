import { z } from "zod";

export const profileInputSchema = z.object({
  name: z.string().trim().min(1, "Имя не может быть пустым").max(100),
  bio: z
    .string()
    .trim()
    .max(280, "Био не длиннее 280 символов")
    .transform((value) => (value.length > 0 ? value : null)),
});

export type ProfileInput = z.input<typeof profileInputSchema>;

export const MAX_AVATAR_SIZE = 3 * 1024 * 1024; // 3 МБ
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const avatarFileSchema = z
  .instanceof(File, { message: "Файл не выбран" })
  .refine((file) => file.size > 0, "Файл не выбран")
  .refine((file) => file.size <= MAX_AVATAR_SIZE, "Файл больше 3 МБ")
  .refine(
    (file) => ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number]),
    "Разрешены только JPEG, PNG и WebP"
  );
