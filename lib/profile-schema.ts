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
