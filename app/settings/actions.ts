"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { avatarFileSchema, profileInputSchema, type ProfileInput } from "@/lib/profile-schema";

/*
  Пишем в базу напрямую, а не через authClient.updateUser(): bio не
  зарегистрирован у Better Auth как additionalField, и его апдейт через клиент
  просто не доедет. Редиректа в конце нет намеренно — форма показывает инлайн
  «Сохранено» и оставляет человека на месте.
*/
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

export type AvatarActionState = { error: string } | { success: true; avatarUrl: string | null };

export async function uploadAvatar(
  _prevState: AvatarActionState,
  formData: FormData,
): Promise<AvatarActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы изменить профиль" };
  }

  const parsed = avatarFileSchema.safeParse(formData.get("avatar"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректный файл" };
  }

  const file = parsed.data;
  const userId = session.user.id;

  /*
    Путь в bucket фиксированный — сам userId, без имени файла и без расширения.
    upsert перезаписывает прошлый аватар на месте, поэтому удалять старый
    отдельно не нужно и мусор не копится.
  */
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(userId, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: "Не удалось загрузить файл, попробуй ещё раз" };
  }

  /*
    Адрес постоянный, поэтому браузер и CDN отдали бы прошлое фото. ?v=<время>
    меняет URL при каждой загрузке и обходит кэш — иначе человек жмёт «сохранить»
    и видит старый аватар, то есть решает, что ничего не сработало.
  */
  const { data } = supabase.storage.from("avatars").getPublicUrl(userId);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  } catch {
    return { error: "Не удалось сохранить изменения, попробуй ещё раз" };
  }

  revalidatePath("/");
  revalidatePath(`/u/${session.user.username}`);

  return { success: true, avatarUrl };
}

export async function removeAvatar(
  _prevState: AvatarActionState,
  _formData: FormData,
): Promise<AvatarActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы изменить профиль" };
  }

  const userId = session.user.id;

  await supabase.storage.from("avatars").remove([userId]);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
  } catch {
    return { error: "Не удалось удалить фото, попробуй ещё раз" };
  }

  revalidatePath("/");
  revalidatePath(`/u/${session.user.username}`);

  return { success: true, avatarUrl: null };
}
