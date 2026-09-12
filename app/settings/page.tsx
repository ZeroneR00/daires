import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ADMIN_ROLE } from "@/lib/admin";
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

      {/*
        Единственный вход в админку на весь сайт — тихая строка внизу «моих
        штук», а не пункт в шапке. Два довода, оба проверены на этом проекте:

        1. Шапка клиентская. Ветка `role === "admin"` вместе со строкой
           "/admin" уехала бы в бандл ВСЕМ посетителям. Роут и так отдал бы
           404 постороннему, но свойство «не палить существование закрытого
           раздела» (ради которого в `requireAdmin()` выбран `notFound()`,
           а не редирект) потерялось бы в devtools за десять секунд.
        2. Ширина шапки — уже дважды пойманная боль, порог `lg` появился
           именно из-за неё. Ещё один пункт туда не влезает.

        Здесь же страница серверная: не-админу эта разметка не рендерится
        вообще, в HTML её нет. Сравнение с `ADMIN_ROLE`, а не с голой
        строкой, — та же константа-белый-список, что в гарде.
      */}
      {session.user.role === ADMIN_ROLE && (
        <div className="border-t border-line pt-6">
          <Link
            href="/admin"
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            Администрирование
          </Link>
        </div>
      )}
    </div>
  );
}
