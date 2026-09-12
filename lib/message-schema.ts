import { z } from "zod";

export const messageInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Сообщение не может быть пустым")
    .max(2000, "Слишком длинное сообщение"),
});

export type MessageInput = z.input<typeof messageInputSchema>;
