import { z } from "zod";

export const commentInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Комментарий не может быть пустым")
    .max(1000, "Слишком длинный комментарий"),
});

export type CommentInput = z.input<typeof commentInputSchema>;
