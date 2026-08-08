"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileInputSchema, type ProfileInput } from "@/lib/profile-schema";

export async function updateProfile(
  input: ProfileInput,
): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы изменить профиль" };
  }

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const { name, bio } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, bio },
    });
  } catch {
    return { error: "Не удалось сохранить изменения, попробуй ещё раз" };
  }

  revalidatePath("/");
  revalidatePath(`/u/${session.user.username}`);

  return { success: true };
}
