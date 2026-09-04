import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserByUsername } from "@/lib/posts";
import { SettingsForm } from "@/components/SettingsForm";
import { AvatarUploadForm } from "@/components/AvatarUploadForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await getUserByUsername(session.user.username);
  if (!user) redirect("/login");

  return (
    /*
      Коробки вокруг всего нет — три блока подряд (фото, имя, о себе) в одной
      рамке и были той «панелью управления», от которой ушли дневник автора
      и форма записи. Заголовок лежит на бумаге, блоки разделяет волосяная
      линейка, а карточками остаются сами поля.
    */
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-ink">
          Настройки профиля
        </h1>
        <p className="text-sm text-muted">
          Каким тебя видят на страницах дневника.
        </p>
      </header>

      <AvatarUploadForm initialAvatarUrl={user.avatarUrl} />

      <div className="border-t border-line pt-6">
        <SettingsForm initialName={user.name} initialBio={user.bio ?? ""} />
      </div>
    </div>
  );
}
